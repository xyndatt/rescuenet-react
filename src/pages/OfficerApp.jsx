import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
import { MapView, MapLegend } from '../components/MapView';
import { Frame } from '../components/Frame';
import { PhotoGallery } from '../components/Photos';
import { useWatchPosition } from '../useGeo';
import { ReportInfo } from '../components/ReportInfo';
import { ReportDownloads } from './Analytics';
const phoneKey = v => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-10) : ''; };
export function OfficerMissionDrawer({id, me, onClose}) {
  const {db, A} = useApp(); const r = db.reports.find(x => x.id === id);
  const [picked, setPicked] = useState([]); const [dnote, setDnote] = useState(''); const [boReason, setBoReason] = useState(''); const [boOpen, setBoOpen] = useState(false); const [sum, setSum] = useState('');
  useEffect(() => { if (r && r.completion && !sum) setSum(`Mission completed. ${r.completion.rescued} people rescued. ${r.completion.notes}`); }, [r && r.completion]);
  if (!r) return null;
  const isBackup = r.officerId !== me.id;
  const used = r.dispatches.map(d => d.unit); const rec = RECOMMENDED[r.type] || [];
  const dist = km(me.lat, me.lng, r.lat, r.lng);
  const toggle = u => !used.includes(u) && setPicked(p => p.includes(u) ? p.filter(x => x !== u) : [...p, u]);
  const finished = ['Resolved', 'Closed'].includes(r.status);
  return <Drawer kicker={r.id + (isBackup ? ' · BACKUP ASSIGNMENT' : '')} title={r.address} onClose={onClose}>
    {isBackup && <div className="banner info"><Icon n="users"/><div className="grow"><b>You are the backup officer</b><p>The Admin assigned you to reinforce {offName(db, r.officerId)}'s operation. You can dispatch additional teams.</p></div></div>}
    {r.backupAlert && !r.backupAlert.handled && !r.backup && !finished && <div className="banner warn"><Icon n="alert"/><div className="grow"><b>🚨 Backup call from {r.backupAlert.unit} team</b><p>“{r.backupAlert.message}” · {ago(r.backupAlert.at)}</p></div></div>}
    {r.backup && <div className={'banner ' + (r.backup.status === 'assigned' ? 'ok' : 'info')}><Icon n="backup"/><div className="grow"><b>{r.backup.status === 'assigned' ? 'Backup approved by Admin' : 'Backup requested — waiting for Admin'}</b><p>{r.backup.status === 'assigned' ? offName(db, r.backup.officerId) + ' has been tasked to reinforce this mission.' : 'The Admin will assign a backup officer.'}</p></div></div>}
    {r.completion && r.status !== 'Resolved' && r.status !== 'Closed' && <div className="banner ok"><Icon n="check"/><div className="grow"><b>✅ Rescue team reports MISSION COMPLETED</b><p>{r.completion.rescued} people rescued. {r.completion.notes}</p></div></div>}
    <ReportInfo r={r} db={db}/>
    <PhotoGallery r={r} canAdd={!['Closed', 'Rejected', 'Duplicate', 'Cancelled'].includes(r.status)}/>
    <div className="card"><div className="card-h"><h4>Incident location</h4><span className="sp"/><Badge color="#1D6FDB"><Icon n="pin"/> {dist.toFixed(1)} km from your station</Badge></div><div className="card-b"><MapView reports={[r]} officers={[me]} selectedId={r.id} height={240} line={[[me.lat, me.lng], [r.lat, r.lng]]}/>
      <div className="row-flex mt"><a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=16/${r.lat}/${r.lng}`}>Open in OpenStreetMap ↗</a></div></div></div>

    {!finished && <div className="card"><div className="card-h"><h4>Deploy rescue teams</h4></div><div className="card-b">
      <p className="hint" style={{marginBottom:12}}>Select which team(s) to send. Teams receive the assignment on their mobile app.</p>
      <div className="unit-grid">{Object.entries(UNITS).map(([k, u]) => <button key={k} className={'unit ' + (picked.includes(k) ? 'on ' : '') + (used.includes(k) ? 'used' : '')} onClick={() => toggle(k)}>{rec.includes(k) && !used.includes(k) && <span className="rec">RECOMMENDED</span>}<div className="e">{u.icon}</div><b>{k}</b><small>{used.includes(k) ? 'Already deployed' : u.full}</small></button>)}</div>
      <textarea className="input mt" placeholder="Instructions for the team (optional) — e.g. bring rubber boats, expect 3 elderly" value={dnote} onChange={e => setDnote(e.target.value)}/>
      <button className="btn btn-primary mt" disabled={!picked.length} onClick={() => { A.dispatch(r.id, picked, dnote, me.id); setPicked([]); setDnote(''); }}><Icon n="send"/>Dispatch {picked.length ? picked.join(' + ') : 'team'}</button>
    </div></div>}

    {r.dispatches.length > 0 && <div className="card"><div className="card-h"><h4>Team tracker</h4></div><div className="card-b">{r.dispatches.map(d => <div className="track-u" key={d.unit}><div className="e">{UNITS[d.unit].icon}</div><div className="t"><b>{d.unit}</b><div className="hint">{UNITS[d.unit].full}</div></div>
      <div style={{textAlign:'right'}}><Badge color={d.status === 'Completed' ? '#12A150' : d.status === 'On Scene' ? '#D92D20' : '#1D6FDB'}>{d.status}</Badge><div className="progress mt" style={{width:120}}>{UNIT_FLOW.map((s, i) => <i key={s} className={i <= UNIT_FLOW.indexOf(d.status) ? 'd' : ''}/>)}</div></div></div>)}</div></div>}

    {!finished && r.backupAlert && !r.backupAlert.handled && !r.backup && <div className="card"><div className="card-h"><h4>Request backup via Admin</h4></div><div className="card-b">
      {!boOpen ? <button className="btn btn-red" onClick={() => { setBoOpen(true); setBoReason(r.backupAlert.message); }}><Icon n="backup"/>Request backup from Admin</button> : <>
        <textarea className="input" value={boReason} onChange={e => setBoReason(e.target.value)} placeholder="What does the team need?"/>
        <div className="row-flex mt"><button className="btn btn-red" disabled={!boReason.trim()} onClick={() => { A.requestBackup(r.id, boReason.trim(), me.id); setBoOpen(false); }}>Send request to Admin</button><button className="btn btn-ghost" onClick={() => setBoOpen(false)}>Cancel</button></div></>}</div></div>}

    {r.completion && r.status !== 'Resolved' && r.status !== 'Closed' && !isBackup && <div className="card"><div className="card-h"><h4>Report to Admin</h4></div><div className="card-b">
      <p className="hint" style={{marginBottom:8}}>Review and forward the mission result to the Admin.</p><textarea className="input" style={{minHeight:100}} value={sum} onChange={e => setSum(e.target.value)}/>
      <button className="btn btn-green mt" disabled={!sum.trim()} onClick={() => { A.forwardCompletion(r.id, sum.trim(), me.id); onClose(); }}><Icon n="send"/>Send completion report to Admin</button></div></div>}
    {r.status === 'Resolved' && <div className="banner ok"><Icon n="check"/><div className="grow"><b>Report sent to Admin</b><p>{r.officerSummary} — awaiting case closure.</p></div></div>}

    {!finished && r.dispatches.length > 0 && <div className="demo-box"><h5>🧪 Demo: simulate the Rescue Team mobile app</h5><p className="hint" style={{marginBottom:8}}>The rescue team app is a separate mobile build. Use these buttons to preview what the officer receives.</p>
      <div className="row"><button className="btn btn-ghost btn-sm" onClick={() => A.advanceUnit(r.id)}>Advance team status</button><button className="btn btn-ghost btn-sm" disabled={!!r.backup && r.backup.status === 'requested'} onClick={() => A.simBackup(r.id)}>Team calls for backup</button><button className="btn btn-ghost btn-sm" disabled={!!r.completion} onClick={() => A.simComplete(r.id)}>Team completes mission</button></div></div>}
    <div className="card"><div className="card-h"><h4>Activity timeline</h4></div><div className="card-b"><Timeline items={r.timeline}/></div></div>
  </Drawer>;
}

export function MissionRow({r, onOpen, me}) {
  const alertOn = r.backupAlert && !r.backupAlert.handled && !r.backup;
  return <div className="q-item" onClick={() => onOpen(r.id)}><TypeIco type={r.type}/><div className="t"><b>{r.type} · {r.address}</b><span>{r.id} · {ago(r.createdAt)} · ~{r.people} people{r.officerId !== me.id ? ' · BACKUP' : ''}</span></div>
    {alertOn && <Badge solid color="#D92D20">BACKUP CALL</Badge>}{r.completion && r.status === 'Rescue in Progress' && <Badge solid color="#12A150">COMPLETED</Badge>}<PrioBadge p={r.priority}/><StatusBadge s={r.status}/></div>;
}

export function OfficerDashboard({me, openReport, setView}) {
  const {db} = useApp();
  const mine = activeTasksOf(db, me.id).sort(prioSort);
  const awaiting = mine.filter(r => r.dispatches.length === 0);
  const field = mine.filter(r => r.dispatches.length > 0);
  const done = db.reports.filter(r => r.officerId === me.id && ['Resolved', 'Closed'].includes(r.status));
  const alerts = mine.filter(r => (r.backupAlert && !r.backupAlert.handled && !r.backup) || (r.completion && r.officerId === me.id));
  return <>
    <PageHead title={'Good day, ' + me.name.split(' ')[0] + ' ' + me.name.split(' ')[1]} sub={me.station + ' · Area: ' + (me.barangay ? me.barangay + ', ' : '') + me.muni}><ReportDownloads reports={db.reports.filter(r => r.officerId === me.id || (r.backup && r.backup.officerId === me.id))}/></PageHead>
    <div className="grid g4" style={{marginBottom:16}}>
      <StatCard label="New tasks from Admin" value={awaiting.length} color="#FF5B14" icon="alert" hint="Dispatch a team"/>
      <StatCard label="Teams in the field" value={field.length} color="#1D6FDB" icon="users" hint="Ongoing rescues"/>
      <StatCard label="Needs your attention" value={alerts.length} color="#D92D20" icon="bell" hint="Backup calls / completions"/>
      <StatCard label="Completed missions" value={done.length} color="#12A150" icon="check" hint="Reported to Admin"/>
    </div>
    <div className="grid g-main">
      <div className="card"><div className="card-h"><h4>Tasks assigned to you</h4><span className="sp"/><button className="btn btn-ghost btn-sm" onClick={() => setView('missions')}>View all</button></div>
        {mine.length === 0 ? <div className="empty"><b>No active tasks</b>You'll be notified when the Admin assigns you a verified incident.</div> : mine.slice(0, 6).map(r => <MissionRow key={r.id} r={r} me={me} onOpen={openReport}/>)}</div>
      <div className="card"><div className="card-h"><h4>Incident map</h4></div><div className="card-b"><MapView reports={mine} officers={[me]} rescuers={db.rescuers} onSelect={openReport} height={330}/><MapLegend/></div></div>
    </div>
  </>;
}

export function OfficerMissions({me, openReport}) {
  const {db} = useApp(); const [f, setF] = useState('active');
  const all = db.reports.filter(r => r.officerId === me.id || (r.backup && r.backup.officerId === me.id && r.backup.status === 'assigned'));
  const rows = (f === 'active' ? all.filter(isActive) : all.filter(r => ['Resolved', 'Closed'].includes(r.status))).sort(prioSort);
  return <>
    <PageHead title="My Missions" sub="Incidents assigned to you by the Admin, including backup assignments."/>
    <div className="chips" style={{marginBottom:12}}><button className={'chip ' + (f === 'active' ? 'on' : '')} onClick={() => setF('active')}>Active</button><button className={'chip ' + (f === 'done' ? 'on' : '')} onClick={() => setF('done')}>History</button></div>
    <div className="card">{rows.length === 0 ? <div className="empty"><b>Nothing here</b>No missions in this list.</div> : rows.map(r => <MissionRow key={r.id} r={r} me={me} onOpen={openReport}/>)}</div>
  </>;
}

export function OfficerRescuers({me}) {
  const {db, A} = useApp(); const blank = {name:'', unit:'BFP', phone:'', email:'', password:''};
  const [adding, setAdding] = useState(false); const [del, setDel] = useState(null); const [form, setForm] = useState(blank); const [err, setErr] = useState('');
  const area = me.barangay || me.muni; const set = (k, v) => setForm({...form, [k]: v});
  const save = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) return setErr('Name, email and password are required.');
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErr('Enter a valid email address.');
    if (form.password.length < 6) return setErr('Password must be at least 6 characters.');
    if (db.rescuers.some(x => x.email.toLowerCase() === form.email.trim().toLowerCase())) return setErr('That email is already registered.');
    if (phoneKey(form.phone) && [...(db.officers || []), ...(db.rescuers || [])].some(x => phoneKey(x.phone) === phoneKey(form.phone))) return setErr('That mobile number is already registered to another account.');
    A.addRescuer(form); setAdding(false); setErr(''); setForm(blank);
  };
  return <>
    <PageHead title="My Rescuers" sub={'Rescuers you create belong to your area: ' + area + '. They sign in on the Rescuer tab to receive missions and report progress.'}><button className="btn btn-primary" onClick={() => setAdding(true)}><Icon n="plus"/>Add rescuer</button></PageHead>
    {db.rescuers.length === 0 ? <div className="card empty"><b>No rescuers yet</b>Add the BFP, SRR and Ambulance team members who work under you.</div> :
    <div className="grid g3">{db.rescuers.map(x => <div className="card off-card" key={x.id}>
      <div className="top-r"><div className="avatar">{initials(x.name)}</div><div className="sp"><b style={{fontSize:16}}>{x.name}</b><div className="hint">{(UNITS[x.unit] || {}).icon} {x.unit} team</div></div></div>
      <dl><dt>GPS</dt><dd>{x.live ? '📡 live · ' + ago(x.liveAt) : 'Offline'}</dd><dt>Barangay</dt><dd>{x.barangay}</dd><dt>Phone</dt><dd>{x.phone || '—'}</dd><dt>Email</dt><dd>{x.email}</dd></dl>
      <div className="foot"><span className="sp"/><button className="btn btn-ghost btn-sm" style={{color:'var(--red)'}} onClick={() => setDel(x)}><Icon n="trash"/>Remove</button></div></div>)}</div>}
    {adding && <Modal title="Add Rescuer" onClose={() => setAdding(false)} footer={<><button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" onClick={save}>Create account</button></>}>
      {err && <div className="err">{err}</div>}
      <div className="field"><label>Full name</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)}/></div>
      <div className="grid g2"><div className="field"><label>Team</label><select className="input" value={form.unit} onChange={e => set('unit', e.target.value)}>{Object.keys(UNITS).map(u => <option key={u} value={u}>{UNITS[u].icon} {u} — {UNITS[u].full}</option>)}</select></div>
        <div className="field"><label>Barangay</label><input className="input" value={area} disabled/></div></div>
      <div className="field"><label>Mobile number</label><input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="09XX XXX XXXX"/></div>
      <div className="grid g2"><div className="field"><label>Email (login)</label><input className="input" value={form.email} onChange={e => set('email', e.target.value)}/></div><div className="field"><label>Temporary password</label><input className="input" type="text" value={form.password} onChange={e => set('password', e.target.value)}/></div></div>
      <p className="hint">The rescuer is placed in your barangay automatically and can only see missions assigned to you.</p></Modal>}
    {del && <Confirm danger title="Remove rescuer?" body={del.name + ' will lose access immediately.'} label="Remove rescuer" onNo={() => setDel(null)} onYes={() => { A.removeRescuer(del.id); setDel(null); }}/>}
  </>;
}

export function OfficerApp({me, onLogout}) {
  const {db, A} = useApp(); const [view, setView] = useState('dashboard'); const [open, setOpen] = useState(null); const [share, setShare] = useState(false);
  const gps = useWatchPosition(share, pos => A.updateLocation(me.id, pos));
  const mine = activeTasksOf(db, me.id);
  const nav = [
    {key:'dashboard', label:'Dashboard', icon:'dashboard'},
    {key:'missions', label:'My Missions', icon:'flag', badge:mine.filter(r => r.dispatches.length === 0).length},
    {key:'rescuers', label:'My Rescuers', icon:'users'},
    {key:'map', label:'Incident Map', icon:'map'}
  ];
  return <Frame roleLabel="Disaster Officer" user={{name:me.name, title:me.rank}} nav={nav} view={view} setView={setView} onOpenReport={id => id && setOpen(id)} notifTo={me.id} onLogout={onLogout} title={nav.find(n => n.key === view).label}
    topExtra={<button className={'btn btn-sm ' + (share ? 'btn-green' : 'btn-yellow')} onClick={() => setShare(!share)} title="Share your live GPS position with the Admin"><span>{share ? (gps.status === 'live' ? '📡 GPS live — tap to stop' : gps.status === 'error' ? '⚠ ' + gps.error : '📡 Locating…') : '📍 Share my GPS'}</span></button>}>
    {view === 'dashboard' && <OfficerDashboard me={me} openReport={setOpen} setView={setView}/>}
    {view === 'missions' && <OfficerMissions me={me} openReport={setOpen}/>}
    {view === 'rescuers' && <OfficerRescuers me={me}/>}
    {view === 'map' && <><PageHead title="Incident Map" sub="Your station and the incidents assigned to you."/><div className="card"><div className="card-b"><MapView reports={mine} officers={[me]} rescuers={db.rescuers} selectedId={open} onSelect={setOpen} height={560}/><MapLegend/></div></div></>}
    {open && <OfficerMissionDrawer id={open} me={me} onClose={() => setOpen(null)}/>}
  </Frame>;
}
