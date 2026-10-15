import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
import { MapView, MapLegend } from '../components/MapView';
import { Frame } from '../components/Frame';
import { ReportInfo } from '../components/ReportInfo';
export function AdminReportDrawer({id, onClose}) {
  const {db, A} = useApp(); const r = db.reports.find(x => x.id === id);
  const [reason, setReason] = useState(''); const [rejecting, setRejecting] = useState(false);
  if (!r) return null;
  const dups = dupesOf(db, r);
  const ranked = db.officers.map(o => ({...o, dist: km(o.lat, o.lng, r.lat, r.lng), load: activeTasksOf(db, o.id).length})).sort((a, b) => a.dist - b.dist);
  const locked = r.dispatches.length > 0;
  const s1 = r.verification === 'verified', s2 = !!r.priority, s3 = !!r.officerId;
  return <Drawer kicker={r.id} title={r.address} onClose={onClose}>
    <ReportInfo r={r} db={db}/>
    {dups.length > 0 && r.verification !== 'false' && <div className="banner warn"><Icon n="alert"/><div className="grow"><b>Possible duplicate report</b><p>Similar {r.type.toLowerCase()} report(s) within 1.5 km: {dups.map(d => d.id).join(', ')}. Review before dispatching.</p></div></div>}
    {r.verification === 'false' ? <div className="banner bad"><div className="grow"><b>This report was marked FALSE</b><p>{r.rejectReason}</p></div></div> :
    <div className="card"><div className="card-h"><h4>Admin actions</h4></div><div className="card-b steps">
      <div className={'step ' + (s1 ? 'done' : 'now')}><div className="no">{s1 ? '✓' : 1}</div><div className="body"><h5>Verify information</h5>
        {s1 ? <span className="hint">Confirmed as true information.</span> : rejecting ? <>
          <textarea className="input" placeholder="Reason why this report is false (required)" value={reason} onChange={e => setReason(e.target.value)}/>
          <div className="row-flex mt"><button className="btn btn-red btn-sm" disabled={!reason.trim()} onClick={() => { A.verify(r.id, false, reason.trim()); setRejecting(false); }}>Confirm FALSE</button><button className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>Cancel</button></div></> :
          <><p className="hint" style={{marginBottom:8}}>Cross-check the details, photo and location with the resident.</p>
          <div className="row-flex">{r.status === 'Submitted' && <button className="btn btn-ghost btn-sm" onClick={() => A.startReview(r.id)}><Icon n="clock"/>Start review</button>}
            <button className="btn btn-green btn-sm" onClick={() => A.verify(r.id, true)}>✔ TRUE information</button><button className="btn btn-red btn-sm" onClick={() => setRejecting(true)}>✖ FALSE information</button></div></>}</div></div>
      <div className={'step ' + (s2 ? 'done' : s1 ? 'now' : 'lock')}><div className="no">{s2 ? '✓' : 2}</div><div className="body"><h5>Set priority</h5>
        <div className="prio-pick">{Object.entries(PRIORITY).map(([k, v]) => <button key={k} disabled={!s1} className={r.priority === k ? 'on' : ''} style={r.priority === k ? {background:v.color} : {color:v.color, opacity:s1 ? 1 : .5}} onClick={() => A.setPriority(r.id, k)}>{v.label}</button>)}</div></div></div>
      <div className={'step ' + (s3 ? 'done' : s1 && s2 ? 'now' : 'lock')}><div className="no">{s3 ? '✓' : 3}</div><div className="body"><h5>Assign task to nearest officer</h5>
        {!(s1 && s2) ? <span className="hint">Verify the report and set priority first.</span> : <>
          <p className="hint">{locked ? 'A team has already been dispatched, so reassignment is locked.' : 'Officers are sorted by distance from the incident.'}</p>
          {ranked.map((o, i) => <div className="off-row" key={o.id} style={r.officerId === o.id ? {borderColor:'var(--green)',background:'#F1FAF5'} : {}}>
            <div className="avatar">{initials(o.name)}</div>
            <div className="t"><b>{o.name} {i === 0 && <Badge color="#FF5B14">NEAREST</Badge>}</b><span>{o.station} · {o.dist.toFixed(1)} km away · {o.load} active task{o.load === 1 ? '' : 's'}</span></div>
            {r.officerId === o.id ? <Badge color="#12A150">Assigned</Badge> : <button className="btn btn-primary btn-sm" disabled={locked} onClick={() => A.assign(r.id, o.id)}>{r.officerId ? 'Reassign' : 'Assign task'}</button>}</div>)}</>}
      </div></div>
    </div></div>}
    {r.status === 'Resolved' && <div className="banner ok"><Icon n="check"/><div className="grow"><b>Officer submitted a completion report</b><p>{r.completion ? r.completion.rescued + ' people rescued. ' : ''}{r.officerSummary}</p></div><button className="btn btn-green btn-sm" onClick={() => A.close(r.id)}>Close case</button></div>}
    <div className="card"><div className="card-h"><h4>Location</h4></div><div className="card-b"><MapView reports={[r]} officers={r.officerId ? db.officers.filter(o => o.id === r.officerId) : []} selectedId={r.id} height={220}/></div></div>
    <div className="card"><div className="card-h"><h4>Activity timeline</h4></div><div className="card-b"><Timeline items={r.timeline}/></div></div>
  </Drawer>;
}

export function AdminDashboard({openReport, setView}) {
  const {db} = useApp();
  const R = db.reports;
  const pending = R.filter(r => r.verification === 'pending').sort((a, b) => b.createdAt - a.createdAt);
  const active = R.filter(isActive);
  const types = Object.keys(TYPES).map(t => ({label:t, value:R.filter(r => r.type === t).length, color:TYPES[t].color}));
  const pipeline = FLOW.map(s => ({s, n:R.filter(r => r.status === s).length}));
  const max = Math.max(1, ...pipeline.map(p => p.n));
  return <>
    <PageHead title="Operations Overview" sub="Live picture of reports from residents and field operations."/>
    <div className="grid g4" style={{marginBottom:16}}>
      <StatCard label="Awaiting verification" value={pending.length} color="#D49A00" icon="clock" hint="Needs your decision"/>
      <StatCard label="Active missions" value={active.length} color="#FF5B14" icon="alert" hint={active.filter(r => r.priority === 'critical').length + ' critical'}/>
      <StatCard label="Backup requests" value={R.filter(r => r.backup && r.backup.status === 'requested').length} color="#D92D20" icon="backup" hint="Needs officer assignment"/>
      <StatCard label="Completion reports" value={R.filter(r => r.status === 'Resolved').length} color="#12A150" icon="check" hint="Ready to close"/>
    </div>
    <div className="grid g-main">
      <div className="card"><div className="card-h"><h4>Live incident map</h4><span className="sp"/><button className="btn btn-ghost btn-sm" onClick={() => setView('map')}>Full map</button></div>
        <div className="card-b"><MapView reports={R.filter(r => r.verification !== 'false' && r.status !== 'Closed')} officers={db.officers} onSelect={openReport} height={380}/><MapLegend/></div></div>
      <div className="card"><div className="card-h"><h4>Needs verification</h4><span className="sp"/><Badge color="#D49A00">{pending.length}</Badge></div>
        {pending.length === 0 ? <div className="empty"><b>All clear</b>No pending reports.</div> : pending.slice(0, 5).map(r => <div className="q-item" key={r.id} onClick={() => openReport(r.id)}><TypeIco type={r.type}/><div className="t"><b>{r.type} · {r.address}</b><span>{r.id} · {ago(r.createdAt)} · ~{r.people} people</span></div><button className="btn btn-primary btn-sm">Review</button></div>)}</div>
    </div>
    <div className="grid g2" style={{marginTop:16}}>
      <div className="card"><div className="card-h"><h4>Incidents by type</h4></div><div className="card-b row-flex" style={{gap:26}}><Donut data={types}/><div className="legend sp">{types.map(t => <div key={t.label}><i style={{background:t.color}}/>{t.label}<b>{t.value}</b></div>)}</div></div></div>
      <div className="card"><div className="card-h"><h4>Response pipeline</h4></div><div className="card-b bars">{pipeline.map(p => <div className="bar" key={p.s}><div className="lb"><span>{p.s}</span><span>{p.n}</span></div><div className="track"><div className="fill" style={{width:(p.n / max * 100) + '%', background:STATUS_COLOR[p.s]}}/></div></div>)}</div></div>
    </div>
  </>;
}

export function AdminReports({openReport}) {
  const {db} = useApp(); const [f, setF] = useState('all'); const [type, setType] = useState('all'); const [q, setQ] = useState('');
  const counts = {all:db.reports.length, pending:db.reports.filter(r => r.verification === 'pending').length, verified:db.reports.filter(r => r.verification === 'verified').length, false:db.reports.filter(r => r.verification === 'false').length};
  const rows = db.reports.filter(r => (f === 'all' || r.verification === f) && (type === 'all' || r.type === type) && (!q || (r.id + r.address + r.reporter + r.desc).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.createdAt - a.createdAt);
  return <>
    <PageHead title="Disaster Reports" sub="Review each resident report, decide if it is true or false, set priority and assign an officer."/>
    <div className="toolbar"><div className="chips">{[['all','All'],['pending','Unverified'],['verified','True'],['false','False']].map(([k, l]) => <button key={k} className={'chip ' + (f === k ? 'on' : '')} onClick={() => setF(k)}>{l}<span className="n">{counts[k]}</span></button>)}</div>
      <div className="sp"/><select className="input" style={{maxWidth:160}} value={type} onChange={e => setType(e.target.value)}><option value="all">All types</option>{Object.keys(TYPES).map(t => <option key={t}>{t}</option>)}</select>
      <input className="input" placeholder="Search ID, place, reporter…" value={q} onChange={e => setQ(e.target.value)}/></div>
    <div className="card tbl-wrap"><table><thead><tr><th>Report</th><th>Location</th><th>Reported</th><th>Verification</th><th>Priority</th><th>Status</th><th>Officer</th></tr></thead><tbody>
      {rows.map(r => <tr className="row" key={r.id} onClick={() => openReport(r.id)}>
        <td><div className="row-flex" style={{gap:10,flexWrap:'nowrap'}}><TypeIco type={r.type}/><div><div className="id">{r.id}</div><div className="sm">{r.type}</div></div></div></td>
        <td>{r.address}<div className="sm">by {r.reporter}</div></td><td>{ago(r.createdAt)}</td><td><VerifyBadge v={r.verification}/></td><td><PrioBadge p={r.priority}/></td><td><StatusBadge s={r.status}/></td><td>{r.officerId ? offName(db, r.officerId) : <span className="sm">Unassigned</span>}</td></tr>)}
    </tbody></table>{rows.length === 0 && <div className="empty"><b>No reports found</b>Try a different filter.</div>}</div>
  </>;
}

export function AdminMap({openReport, selected}) {
  const {db} = useApp(); const [show, setShow] = useState('active');
  const list = db.reports.filter(r => show === 'all' ? r.status !== 'Closed' : show === 'pending' ? r.verification === 'pending' : isActive(r));
  return <>
    <PageHead title="Live Incident Map" sub="Click a pin to open the report. Dashed pins are not yet verified."/>
    <div className="chips" style={{marginBottom:12}}>{[['active','Active missions'],['pending','Unverified'],['all','All open']].map(([k, l]) => <button key={k} className={'chip ' + (show === k ? 'on' : '')} onClick={() => setShow(k)}>{l}</button>)}</div>
    <div className="card"><div className="card-b"><MapView reports={list} officers={db.officers} selectedId={selected} onSelect={openReport} height={560}/><MapLegend/></div></div>
  </>;
}

export function AdminOfficers() {
  const {db, A, toast} = useApp(); const [adding, setAdding] = useState(false); const [del, setDel] = useState(null);
  const [form, setForm] = useState({name:'', rank:'Operations Officer', muni:'Meycauayan', phone:'', email:'', password:''}); const [err, setErr] = useState('');
  const set = (k, v) => setForm({...form, [k]: v});
  const save = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) return setErr('Name, email and password are required.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErr('Enter a valid email address.');
    if (form.password.length < 6) return setErr('Password must be at least 6 characters.');
    if (db.officers.some(o => o.email.toLowerCase() === form.email.trim().toLowerCase())) return setErr('That email is already registered.');
    A.addOfficer(form); setAdding(false); setErr(''); setForm({name:'', rank:'Operations Officer', muni:'Meycauayan', phone:'', email:'', password:''});
  };
  const tryDelete = o => activeTasksOf(db, o.id).length ? toast('Reassign ' + o.name.split(' ')[0] + "'s active tasks before removing this officer.", 'err') : setDel(o);
  return <>
    <PageHead title="Disaster Officers" sub="Add or remove officers who manage rescue teams in each area."><button className="btn btn-primary" onClick={() => setAdding(true)}><Icon n="plus"/>Add officer</button></PageHead>
    <div className="grid g3">{db.officers.map(o => { const n = activeTasksOf(db, o.id).length; return <div className="card off-card" key={o.id}>
      <div className="top-r"><div className="avatar">{initials(o.name)}</div><div className="sp"><b style={{fontSize:16}}>{o.name}</b><div className="hint">{o.rank}</div></div><Badge color={n ? '#FF5B14' : '#12A150'}>{n ? 'On mission' : 'Available'}</Badge></div>
      <dl><dt>Station</dt><dd>{o.station}</dd><dt>Area</dt><dd>{o.muni}</dd><dt>Phone</dt><dd>{o.phone || '—'}</dd><dt>Email</dt><dd>{o.email}</dd><dt>Active</dt><dd>{n} task{n === 1 ? '' : 's'}</dd></dl>
      <div className="foot"><span className="sp"/><button className="btn btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={() => tryDelete(o)}><Icon n="trash"/>Remove</button></div></div>; })}</div>
    {adding && <Modal title="Add Disaster Officer" onClose={() => setAdding(false)} footer={<><button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Create account</button></>}>
      {err && <div className="err">{err}</div>}
      <div className="field"><label>Full name (with rank)</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Lt. Juan Dela Cruz"/></div>
      <div className="grid g2"><div className="field"><label>Position</label><select className="input" value={form.rank} onChange={e => set('rank', e.target.value)}><option>Station Commander</option><option>Operations Officer</option><option>Field Commander</option></select></div>
        <div className="field"><label>Assigned area</label><select className="input" value={form.muni} onChange={e => set('muni', e.target.value)}>{Object.keys(MUNI).map(m => <option key={m}>{m}</option>)}</select></div></div>
      <div className="field"><label>Mobile number</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="09XX XXX XXXX"/></div>
      <div className="grid g2"><div className="field"><label>Email (login)</label><input className="input" value={form.email} onChange={e => set('email', e.target.value)}/></div><div className="field"><label>Temporary password</label><input className="input" type="text" value={form.password} onChange={e => set('password', e.target.value)}/></div></div>
      <p className="hint">The officer's map location is set from the station of the chosen area.</p></Modal>}
    {del && <Confirm danger title="Remove officer?" body={`${del.name} will lose access immediately. This cannot be undone.`} label="Remove officer" onNo={() => setDel(null)} onYes={() => { A.removeOfficer(del.id); setDel(null); }}/>}
  </>;
}

export function AdminBackup({openReport}) {
  const {db, A} = useApp();
  const list = db.reports.filter(r => r.backup).sort((a, b) => (a.backup.status === 'requested' ? 0 : 1) - (b.backup.status === 'requested' ? 0 : 1) || b.backup.requestedAt - a.backup.requestedAt);
  return <>
    <PageHead title="Backup Requests" sub="Officers request reinforcements through you. Choose which officer will back up the rescue team."/>
    {list.length === 0 && <div className="card empty"><b>No backup requests</b>You'll be notified when an officer asks for reinforcements.</div>}
    <div className="grid" style={{gap:14}}>{list.map(r => {
      const cands = db.officers.filter(o => o.id !== r.officerId).map(o => ({...o, dist:km(o.lat, o.lng, r.lat, r.lng), load:activeTasksOf(db, o.id).length})).sort((a, b) => a.dist - b.dist);
      const req = r.backup.status === 'requested';
      return <div className="card" key={r.id}><div className="card-h"><TypeIco type={r.type}/><div className="sp"><h4>{r.id} · {r.address}</h4><span className="hint">Requested by {offName(db, r.backup.requestedBy)} · {ago(r.backup.requestedAt)}</span></div><PrioBadge p={r.priority}/>{req ? <Badge color="#D92D20">NEEDS ASSIGNMENT</Badge> : <Badge color="#12A150">Backup assigned</Badge>}<button className="btn btn-ghost btn-sm" onClick={() => openReport(r.id)}>Open report</button></div>
        <div className="card-b"><div className="banner warn" style={{marginBottom:10}}><Icon n="alert"/><div className="grow"><b>Reason from officer</b><p>{r.backup.reason}</p></div></div>
          {req ? <><b>Assign backup officer (nearest first)</b>{cands.map((o, i) => <div className="off-row" key={o.id}><div className="avatar">{initials(o.name)}</div><div className="t"><b>{o.name} {i === 0 && <Badge color="#FF5B14">NEAREST</Badge>}</b><span>{o.station} · {o.dist.toFixed(1)} km · {o.load} active</span></div><button className="btn btn-primary btn-sm" onClick={() => A.assignBackup(r.id, o.id)}>Assign backup</button></div>)}</> :
          <div className="off-row" style={{borderColor:'var(--green)',background:'#F1FAF5'}}><div className="avatar">{initials(offName(db, r.backup.officerId))}</div><div className="t"><b>{offName(db, r.backup.officerId)}</b><span>Assigned as backup officer</span></div></div>}
        </div></div>; })}</div>
  </>;
}

export function AdminMissions({openReport}) {
  const {db, A} = useApp();
  const done = db.reports.filter(r => r.status === 'Resolved'), closed = db.reports.filter(r => r.status === 'Closed');
  return <>
    <PageHead title="Mission Reports" sub="Completion reports forwarded by Disaster Officers. Review and close each case."/>
    <div className="card"><div className="card-h"><h4>Awaiting closure</h4><span className="sp"/><Badge color="#12A150">{done.length}</Badge></div>
      {done.length === 0 ? <div className="empty"><b>Nothing to close</b>Completed missions will appear here.</div> : done.map(r => <div className="q-item" key={r.id} onClick={() => openReport(r.id)}><TypeIco type={r.type}/><div className="t"><b>{r.id} · {r.address}</b><span>By {offName(db, r.officerId)} · {r.completion ? r.completion.rescued + ' rescued · ' : ''}{r.officerSummary}</span></div><button className="btn btn-green btn-sm" onClick={e => { e.stopPropagation(); A.close(r.id); }}>Close case</button></div>)}</div>
    <div className="card" style={{marginTop:16}}><div className="card-h"><h4>Closed cases</h4></div>
      {closed.length === 0 ? <div className="empty">No closed cases yet.</div> : closed.map(r => <div className="q-item" key={r.id} onClick={() => openReport(r.id)}><TypeIco type={r.type}/><div className="t"><b>{r.id} · {r.address}</b><span>{r.completion ? r.completion.rescued + ' rescued' : ''}</span></div><StatusBadge s="Closed"/></div>)}</div>
  </>;
}

export function AdminAudit() {
  const {db} = useApp();
  return <><PageHead title="Audit Trail" sub="Important actions, status changes and admin activity."/>
    <div className="card tbl-wrap"><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Report</th></tr></thead><tbody>{db.audit.slice(0, 60).map(a => <tr key={a.id}><td>{fmtTime(a.at)}</td><td><b>{a.actor}</b></td><td>{a.action}</td><td>{a.reportId || '—'}</td></tr>)}</tbody></table></div></>;
}

export function AdminApp({onLogout}) {
  const {db, A} = useApp(); const [view, setView] = useState('dashboard'); const [open, setOpen] = useState(null);
  const nav = [
    {key:'dashboard', label:'Dashboard', icon:'dashboard'},
    {key:'reports', label:'Reports', icon:'reports', badge:db.reports.filter(r => r.verification === 'pending').length},
    {key:'map', label:'Live Map', icon:'map'},
    {key:'officers', label:'Officers', icon:'users'},
    {key:'backup', label:'Backup Requests', icon:'backup', badge:db.reports.filter(r => r.backup && r.backup.status === 'requested').length},
    {key:'missions', label:'Mission Reports', icon:'check', badge:db.reports.filter(r => r.status === 'Resolved').length},
    {key:'audit', label:'Audit Trail', icon:'log'}
  ];
  return <Frame roleLabel="Administrator" user={{name:ADMIN.name, title:ADMIN.title}} nav={nav} view={view} setView={setView} onOpenReport={id => id && setOpen(id)} notifTo="admin" onLogout={onLogout} title={nav.find(n => n.key === view).label}
    topExtra={<button className="btn btn-yellow btn-sm" onClick={A.simulateReport} title="Demo: pretend a resident just sent a report from the mobile app"><Icon n="send"/><span>Simulate resident report</span></button>}>
    {view === 'dashboard' && <AdminDashboard openReport={setOpen} setView={setView}/>}
    {view === 'reports' && <AdminReports openReport={setOpen}/>}
    {view === 'map' && <AdminMap openReport={setOpen} selected={open}/>}
    {view === 'officers' && <AdminOfficers/>}
    {view === 'backup' && <AdminBackup openReport={setOpen}/>}
    {view === 'missions' && <AdminMissions openReport={setOpen}/>}
    {view === 'audit' && <AdminAudit/>}
    {open && <AdminReportDrawer id={open} onClose={() => setOpen(null)}/>}
  </Frame>;
}
