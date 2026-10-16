import React, { useState, useMemo } from 'react';
import { TYPES, PRIORITY, FLOW, EXTRA_STATUS, STATUS_COLOR, fmtTime, offName } from '../data';
import { Icon, Donut, StatCard, PageHead, Badge } from '../components/ui';
import { useApp } from '../context';
import { api } from '../api';

const DAY = 864e5;
const dkey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const mins = ms => ms == null ? '—' : ms < 6e4 ? '<1 min' : ms < 36e5 ? Math.round(ms / 6e4) + ' min' : (ms / 36e5).toFixed(1) + ' hr';
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const cell = v => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };   // also blocks spreadsheet formula injection

// Incident summaries, trends and downloadable reports (FR-12). Used by the Administrator and the Disaster Officer.
export function Analytics({overview = false, personal = false, exportOnly = false, reports = null}) {
  const {db: appDb, toast} = useApp(); const db = reports ? {...appDb, reports} : appDb;   // `reports`: limit to what this user is permitted to export
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [type, setType] = useState('all'); const [status, setStatus] = useState('all'); const [prio, setPrio] = useState('all');
  const rows = useMemo(() => db.reports.filter(r => {
    if (from && r.createdAt < new Date(from + 'T00:00:00').getTime()) return false;
    if (to && r.createdAt > new Date(to + 'T23:59:59').getTime()) return false;
    return (type === 'all' || r.type === type) && (status === 'all' || r.status === status) && (prio === 'all' || r.priority === prio);
  }).sort((a, b) => b.createdAt - a.createdAt), [db.reports, from, to, type, status, prio]);

  const st = useMemo(() => {
    const verified = rows.filter(r => r.verification === 'verified'), falseR = rows.filter(r => r.verification === 'false');
    const done = rows.filter(r => ['Resolved', 'Closed'].includes(r.status));
    const rescued = rows.reduce((n, r) => n + (r.completion ? r.completion.rescued : 0), 0);
    const toDispatch = rows.filter(r => r.dispatches.length).map(r => r.dispatches[0].at - r.createdAt).filter(x => x >= 0);
    const toResolve = rows.filter(r => r.completion && r.completion.at).map(r => r.completion.at - r.createdAt).filter(x => x >= 0);
    const days = {}; rows.forEach(r => { const k = dkey(r.createdAt); days[k] = (days[k] || 0) + 1; });
    const keys = Object.keys(days).sort(); const trend = [];
    if (keys.length) { const e = new Date(keys[keys.length - 1] + 'T00:00:00').getTime(); for (let i = 29; i >= 0; i--) { const k = dkey(e - i * DAY); trend.push({k, n: days[k] || 0}); } }   // always 30 days so a single day never becomes one giant bar
    return {verified, falseR, done, rescued, dispatch: avg(toDispatch), resolve: avg(toResolve), trend, backup: rows.filter(r => r.backup).length,
      byType: Object.keys(TYPES).map(t => ({label: t, value: rows.filter(r => r.type === t).length, color: TYPES[t].color})),
      byStatus: [...FLOW, ...EXTRA_STATUS].map(s => ({s, n: rows.filter(r => r.status === s).length})).filter(x => x.n),
      byPrio: Object.entries(PRIORITY).map(([k, v]) => ({k, label: v.label, color: v.color, n: rows.filter(r => r.priority === k).length}))};
  }, [rows]);
  const maxT = Math.max(1, ...st.trend.map(t => t.n)), maxS = Math.max(1, ...st.byStatus.map(x => x.n)), maxP = Math.max(1, ...st.byPrio.map(x => x.n));

  const csv = () => {
    const head = ['Report ID', 'Type', 'Reported at', 'Location', 'Latitude', 'Longitude', 'Verification', 'Priority', 'Status', 'Assigned officer', 'Teams dispatched', 'People affected', 'People rescued', 'Time to dispatch (min)', 'Source', ...(personal ? ['Reporter', 'Contact'] : [])];
    const lines = rows.map(r => [r.id, r.type, new Date(r.createdAt).toISOString(), r.address, r.lat, r.lng, r.verification === 'verified' ? 'Verified' : r.verification === 'false' ? 'False' : 'Pending', r.priority || '', r.status, r.officerId ? offName(db, r.officerId) : '', r.dispatches.map(d => d.unit).join(' + '), r.people, r.completion ? r.completion.rescued : '', r.dispatches.length ? Math.round((r.dispatches[0].at - r.createdAt) / 6e4) : '', r.source || '', ...(personal ? [r.reporter, r.phone] : [])]);
    const blob = new Blob(['\ufeff' + [head, ...lines].map(l => l.map(cell).join(',')).join('\r\n')], {type: 'text/csv;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rescuenet-incidents-' + dkey(Date.now()) + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const pdf = async () => {
    try {
      const [{jsPDF}, {default: autoTable}] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const doc = new jsPDF({orientation: 'landscape', unit: 'pt', format: 'a4'});
      doc.setFontSize(16); doc.text('RescueNet - Incident Summary Report', 40, 40);
      doc.setFontSize(9); doc.text(`Generated ${fmtTime(Date.now())}  |  Period: ${range}  |  Type: ${type}  |  Status: ${status}  |  Priority: ${prio}  |  ${rows.length} report(s)`, 40, 56);
      autoTable(doc, {startY: 70, head: [['Total', 'Verified', 'False / closed out', 'Finished missions', 'People rescued', 'Avg. time to dispatch', 'Avg. time to complete', 'Needed backup']],
        body: [[rows.length, st.verified.length, st.falseR.length, st.done.length, st.rescued, mins(st.dispatch), mins(st.resolve), st.backup]], styles: {fontSize: 9}, headStyles: {fillColor: [11, 27, 51]}});
      autoTable(doc, {startY: doc.lastAutoTable.finalY + 12, head: [['Type', 'Count', 'Priority', 'Count', 'Status', 'Count']],
        body: Array.from({length: Math.max(st.byType.length, st.byPrio.length, st.byStatus.length)}, (_, i) => [st.byType[i]?.label || '', st.byType[i]?.value ?? '', st.byPrio[i]?.label || '', st.byPrio[i]?.n ?? '', st.byStatus[i]?.s || '', st.byStatus[i]?.n ?? '']),
        styles: {fontSize: 9}, headStyles: {fillColor: [255, 91, 20]}});
      autoTable(doc, {startY: doc.lastAutoTable.finalY + 12, head: [['Report', 'Type', 'Location', 'Reported', 'Verification', 'Priority', 'Status', 'Rescued']],
        body: rows.map(r => [r.id, r.type, r.address, fmtTime(r.createdAt), r.verification === 'verified' ? 'Verified' : r.verification === 'false' ? 'False' : 'Pending', r.priority ? PRIORITY[r.priority].label : '-', r.status, r.completion ? r.completion.rescued : '-']),
        styles: {fontSize: 8}, headStyles: {fillColor: [11, 27, 51]}});
      doc.save('rescuenet-report-' + dkey(Date.now()) + '.pdf');
    } catch (e) { toast('Could not create the PDF: ' + e.message, 'err'); }
  };
  const backup = async () => {
    try {
      const b = await api('/admin/backup', {method: 'GET'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(b)], {type: 'application/json'})); a.download = 'rescuenet-backup-' + dkey(Date.now()) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Backup downloaded');
    } catch (e) { toast(e.message, 'err'); }
  };
  const range = (from || to) ? (from || 'start') + ' to ' + (to || 'today') : 'All dates';
  const buttons = <div className="row-flex no-print"><button className="btn btn-ghost" onClick={csv}><Icon n="reports"/>Download CSV</button><button className="btn btn-primary" onClick={pdf}><Icon n="reports"/>Download PDF</button></div>;
  if (exportOnly) return buttons;                                   // just the two download buttons (used on the Officer dashboard)
  return <div className="print-area">
    <div className="print-head"><h2>RescueNet — Incident Summary Report</h2><p>Generated {fmtTime(Date.now())} · Period: {range} · Type: {type} · Status: {status} · Priority: {prio} · {rows.length} report(s)</p></div>
    <PageHead title={overview ? 'Overview & Trends' : 'Reports & Statistics'} sub={overview ? 'Review incident trends and monitor overall operations across all areas.' : personal ? 'Filter incidents, review statistics, and download a CSV or PDF report.' : 'Generate disaster management reports (CSV or PDF) according to your assigned permissions. Reporter names and phone numbers are not included.'}>
      <div className="row-flex no-print"><button className="btn btn-ghost" onClick={csv}><Icon n="reports"/>Download CSV</button><button className="btn btn-primary" onClick={pdf}><Icon n="reports"/>Download PDF</button>{personal && <button className="btn btn-ghost" onClick={backup} title="Full data backup (JSON) for disaster recovery"><Icon n="log"/>Backup data</button>}</div></PageHead>
    <div className="toolbar no-print">
      <label className="hint">From</label><input type="date" className="input" style={{maxWidth:160}} value={from} onChange={e => setFrom(e.target.value)}/>
      <label className="hint">To</label><input type="date" className="input" style={{maxWidth:160}} value={to} onChange={e => setTo(e.target.value)}/>
      <select className="input" style={{maxWidth:150}} value={type} onChange={e => setType(e.target.value)}><option value="all">All types</option>{Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}</select>
      <select className="input" style={{maxWidth:190}} value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{[...FLOW, ...EXTRA_STATUS].map(s => <option key={s}>{s}</option>)}</select>
      <select className="input" style={{maxWidth:150}} value={prio} onChange={e => setPrio(e.target.value)}><option value="all">All priorities</option>{Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
      {(from || to || type !== 'all' || status !== 'all' || prio !== 'all') && <button className="btn btn-ghost btn-sm" onClick={() => { setFrom(''); setTo(''); setType('all'); setStatus('all'); setPrio('all'); }}>Clear</button>}</div>
    <div className="grid g4" style={{marginBottom:16}}>
      <StatCard label="Total reports" value={rows.length} color="#1D6FDB" icon="reports" hint={st.verified.length + ' verified · ' + st.falseR.length + ' false'}/>
      <StatCard label="People rescued" value={st.rescued} color="#12A150" icon="users" hint={st.done.length + ' missions finished'}/>
      <StatCard label="Avg. time to dispatch" value={mins(st.dispatch)} color="#FF5B14" icon="clock" hint="Report → first team"/>
      <StatCard label="Avg. time to complete" value={mins(st.resolve)} color="#6B4FD3" icon="check" hint={st.backup + ' needed backup'}/>
    </div>
    <div className="grid g2">
      <div className="card"><div className="card-h"><h4>Incidents by type</h4></div><div className="card-b row-flex" style={{gap:26}}><Donut data={st.byType}/><div className="legend sp">{st.byType.map(t => <div key={t.label}><i style={{background:t.color}}/>{t.label}<b>{t.value}</b></div>)}</div></div></div>
      <div className="card"><div className="card-h"><h4>By priority</h4></div><div className="card-b bars">{st.byPrio.map(p => <div className="bar" key={p.k}><div className="lb"><span>{p.label}</span><span>{p.n}</span></div><div className="track"><div className="fill" style={{width:(p.n / maxP * 100) + '%', background:p.color}}/></div></div>)}</div></div>
    </div>
    <div className="grid g2" style={{marginTop:16}}>
      <div className="card"><div className="card-h"><h4>Reports per day {st.trend.length ? '(last 30 days in range)' : ''}</h4></div><div className="card-b">{st.trend.length === 0 ? <div className="empty">No data for this filter.</div> : <div><div className="spark">{st.trend.map(t => <div key={t.k} title={t.k + ': ' + t.n}>{t.n > 0 && <b>{t.n}</b>}<i style={{height:t.n ? Math.max(6, t.n / maxT * 100) + '%' : '2px', opacity:t.n ? 1 : .25}}/></div>)}</div><div className="spark-ax"><span>{st.trend[0].k}</span><span>{st.trend[st.trend.length - 1].k}</span></div></div>}</div></div>
      <div className="card"><div className="card-h"><h4>By status</h4></div><div className="card-b bars">{st.byStatus.length === 0 ? <div className="empty">No data for this filter.</div> : st.byStatus.map(p => <div className="bar" key={p.s}><div className="lb"><span>{p.s}</span><span>{p.n}</span></div><div className="track"><div className="fill" style={{width:(p.n / maxS * 100) + '%', background:STATUS_COLOR[p.s]}}/></div></div>)}</div></div>
    </div>
    {!overview && <div className="card tbl-wrap" style={{marginTop:16}}><table><thead><tr><th>Report</th><th>Location</th><th>Reported</th><th>Verification</th><th>Priority</th><th>Status</th><th>Rescued</th></tr></thead><tbody>
      {rows.map(r => <tr key={r.id}><td><div className="id">{r.id}</div><div className="sm">{r.type}</div></td><td>{r.address}{personal && <div className="sm">by {r.reporter}</div>}</td><td>{fmtTime(r.createdAt)}</td><td>{r.verification === 'verified' ? 'Verified' : r.verification === 'false' ? 'False' : 'Pending'}</td><td>{r.priority ? PRIORITY[r.priority].label : '—'}</td><td>{r.status}</td><td>{r.completion ? r.completion.rescued : '—'}</td></tr>)}
    </tbody></table>{rows.length === 0 && <div className="empty"><b>No reports match</b>Change the filters above.</div>}</div>}
  </div>;
}

// Download CSV / PDF disaster management reports. For an Officer, `reports` = only the incidents assigned to them (no reporter names or phones).
export const ReportDownloads = ({reports}) => <Analytics exportOnly reports={reports}/>;
