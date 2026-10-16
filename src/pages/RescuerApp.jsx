import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
import { Frame } from '../components/Frame';
import { ReportInfo } from '../components/ReportInfo';
import { PhotoGallery } from '../components/Photos';
import { MapView, MapLegend } from '../components/MapView';
import { useWatchPosition } from '../useGeo';

const myDispatch = (r, me) => r.dispatches.find(d => d.unit === me.unit);

function Row({r, me, onOpen}) {
  const d = myDispatch(r, me);
  return <div className="q-item" onClick={() => onOpen(r.id)}><TypeIco type={r.type}/><div className="t"><b>{r.type} · {r.address}</b><span>{r.id} · {ago(r.createdAt)} · ~{r.people} people</span></div>
    <PrioBadge p={r.priority}/><Badge color={d.status === 'Completed' ? '#12A150' : '#1D6FDB'}>{d.status}</Badge></div>;
}

function MissionDrawer({id, me, onClose}) {
  const {db, A} = useApp(); const r = db.reports.find(x => x.id === id);
  const [done, setDone] = useState(false); const [rescued, setRescued] = useState(''); const [notes, setNotes] = useState('');
  const [bo, setBo] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const d = r && myDispatch(r, me);
  if (!r || !d) return null;
  const finished = ['Resolved', 'Closed'].includes(r.status); const idx = UNIT_FLOW.indexOf(d.status);
  const complete = () => {
    const n = Number(rescued);
    if (rescued === '' || !Number.isInteger(n) || n < 0) return setErr('Enter how many people were rescued (0 or more).');
    A.fieldUpdate(r.id, 'complete', {rescued: n, notes: notes.trim()}); setDone(false); setErr('');
  };
  return <Drawer kicker={r.id} title={r.address} onClose={onClose}>
    <div className="card"><div className="card-h"><h4>{(UNITS[me.unit] || {}).icon} Your team: {me.unit}</h4><span className="sp"/><Badge color={d.status === 'Completed' ? '#12A150' : '#1D6FDB'}>{d.status}</Badge></div>
      <div className="card-b">
        <div className="progress" style={{marginBottom:12}}>{UNIT_FLOW.map((s, i) => <i key={s} className={i < idx ? 'c' : i === idx ? 'd' : ''}/>)}</div>
        {finished || d.status === 'Completed' ? <div className="banner ok"><Icon n="check"/><div className="grow"><b>{d.status === 'Completed' ? 'Your team completed this mission' : 'This mission is finished'}</b><p>{d.status === 'Completed' ? 'Your officer was notified. Thank you!' : 'No more updates are needed.'}</p></div></div> :
        <div className="row-flex" style={{flexWrap:'wrap'}}>
          {idx === 0 && <button className="btn btn-primary" onClick={() => A.fieldUpdate(r.id, 'advance')}>🚗 We are on our way</button>}
          {idx === 1 && <button className="btn btn-primary" onClick={() => A.fieldUpdate(r.id, 'advance')}>📍 We arrived on scene</button>}
          {idx === 2 && <button className="btn btn-green" onClick={() => setDone(true)}>✅ Mission completed</button>}
          <button className="btn btn-ghost" onClick={() => setBo(true)}>🆘 Request backup</button>
        </div>}
      </div></div>
    <ReportInfo r={r} db={db}/>
    <PhotoGallery r={r} canAdd={!finished}/>
    <div className="card"><div className="card-h"><h4>Resident location</h4><span className="sp"/><Badge color="#1D6FDB"><Icon n="pin"/> {r.lat.toFixed(5)}, {r.lng.toFixed(5)}</Badge></div><div className="card-b">
      <MapView reports={[r]} selectedId={r.id} height={260}/><MapLegend/>
      <p className="hint" style={{marginTop:8}}>{r.address}</p>
      <div className="row-flex mt"><a className="btn btn-primary btn-sm" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}>Get directions ↗</a>
        <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}`}>Open in OpenStreetMap ↗</a></div></div></div>
    {done && <Modal title="Mission completed" onClose={() => setDone(false)} footer={<><button className="btn btn-ghost" onClick={() => setDone(false)}>Cancel</button><button className="btn btn-green" onClick={complete}>Submit</button></>}>
      {err && <div className="err">{err}</div>}
      <div className="field"><label>People rescued</label><input className="input" type="number" min="0" value={rescued} onChange={e => setRescued(e.target.value)}/></div>
      <div className="field"><label>Notes (optional)</label><textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Area cleared, injuries, equipment used…"/></div></Modal>}
    {bo && <Modal title="Request backup" onClose={() => setBo(false)} footer={<><button className="btn btn-ghost" onClick={() => setBo(false)}>Cancel</button><button className="btn btn-red" onClick={() => { A.fieldUpdate(r.id, 'backup', {notes: msg.trim()}); setBo(false); setMsg(''); }}>Send to officer</button></>}>
      <div className="field"><label>What do you need? (optional)</label><textarea className="input" value={msg} onChange={e => setMsg(e.target.value)} placeholder="More personnel, boat, ambulance…"/></div></Modal>}
  </Drawer>;
}

export function RescuerApp({me, onLogout}) {
  const {db, A} = useApp(); const [view, setView] = useState('missions'); const [open, setOpen] = useState(null);
  // Rescuer GPS is always on while signed in: there is no way to switch it off, and it restarts itself after errors.
  const gps = useWatchPosition(true, pos => A.updateLocation(me.id, pos), {minMs: 10000, minMeters: 15, persistent: true});
  const off = db.officers.find(o => o.id === me.officerId);
  const mine = db.reports.filter(r => r.officerId === me.officerId && myDispatch(r, me)).sort(prioSort);
  const active = mine.filter(r => isActive(r) && myDispatch(r, me).status !== 'Completed'); const history = mine.filter(r => !active.includes(r));
  const nav = [{key:'missions', label:'My Missions', icon:'flag', badge:active.length}, {key:'history', label:'History', icon:'check'}];
  const list = view === 'missions' ? active : history;
  return <Frame roleLabel="Rescuer" user={{name:me.name, title:((UNITS[me.unit] || {}).full || me.unit)}} nav={nav} view={view} setView={setView} onOpenReport={id => id && setOpen(id)} notifTo={me.id} onLogout={onLogout} title={nav.find(n => n.key === view).label}
    topExtra={<span className={'btn btn-sm ' + (gps.status === 'live' ? 'btn-green' : 'btn-yellow')} style={{cursor:'default'}} title="Your live GPS position is always shared with your officer while you are signed in">{gps.status === 'live' ? '📡 GPS live' : gps.status === 'error' ? '⚠ ' + gps.error : '📡 Locating…'}</span>}>
    {gps.status === 'error' && <div className="banner warn" style={{marginBottom:12}}><div className="grow"><b>GPS is required for rescuers</b><p>{gps.error === 'Location permission denied' ? 'Allow location access for this site in your browser or phone settings. RescueNet keeps retrying automatically.' : 'Make sure Location/GPS is turned on. RescueNet keeps retrying automatically.'}</p></div></div>}
    <PageHead title={view === 'missions' ? 'Your active missions' : 'Mission history'} sub={'Reporting to ' + (off ? off.name : 'your officer') + (off && off.barangay ? ' · ' + off.barangay : '')}/>
    <div className="card">{list.length === 0 ? <div className="empty"><b>{view === 'missions' ? 'No active missions' : 'Nothing yet'}</b>{view === 'missions' ? 'You will be notified when your officer dispatches your team.' : 'Finished missions appear here.'}</div> : list.map(r => <Row key={r.id} r={r} me={me} onOpen={setOpen}/>)}</div>
    {open && <MissionDrawer id={open} me={me} onClose={() => setOpen(null)}/>}
  </Frame>;
}
