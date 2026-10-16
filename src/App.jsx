import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from './data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from './components/ui';
import { Ctx, useApp } from './context';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, dbRef, connectedRef, onValue, query, orderByChild, equalTo, limitToLast, toArr, normReport } from './firebase';
import { api, API_ORIGIN } from './api';
import { disablePush } from './push';
import { Login } from './pages/Login';
import { RescuerApp } from './pages/RescuerApp';
import { AdminApp } from './pages/AdminApp';
import { OfficerApp } from './pages/OfficerApp';
const ROLE_NAME = {admin:'administrator', officer:'officer', rescuer:'rescuer'};
export default function App() {
  const EMPTY = {officers:[], rescuers:[], reports:[], notifs:[], audit:[]};
  const [db, setDb] = useState(EMPTY); const [live, setLive] = useState({}); const [online, setOnline] = useState(true);
  const [session, setSession] = useState(null); const [authReady, setAuthReady] = useState(false); const [toasts, setToasts] = useState([]); const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);

  // ---- session comes from Firebase Auth (role is a custom claim set by the backend) ----
  useEffect(() => onAuthStateChanged(auth, async u => {
    if (!u) { setSession(null); setAuthReady(true); return; }
    const c = (await u.getIdTokenResult()).claims;
    if (c.role === 'admin') setSession({role:'admin'});
    else if (c.role === 'officer' && c.officerId) setSession({role:'officer', id:c.officerId});
    else if (c.role === 'rescuer' && c.rescuerId) setSession({role:'rescuer', id:c.rescuerId, officerId:c.officerId, unit:c.unit, name:u.displayName || 'Rescuer'});
    else { await signOut(auth); setSession(null); }
    setAuthReady(true);
  }), []);

  // ---- live data from Realtime Database (read-only; every change goes through the API) ----
  useEffect(() => {
    if (!session) { setDb(EMPTY); setLive({}); return; }
    const key = session.id || 'admin', off = [];                       // notification recipient: 'admin' | officerId | rescuerId
    const sub = (q, apply) => off.push(onValue(q, s => apply(s.val()), e => console.error('DB read failed:', e.message)));
    sub(dbRef('officers'), v => setDb(d => ({...d, officers: toArr(v)})));
    sub(session.role === 'rescuer' ? query(dbRef('reports'), orderByChild('officerId'), equalTo(session.officerId)) : dbRef('reports'), v => setDb(d => ({...d, reports: toArr(v).map(normReport)})));
    sub(query(dbRef('notifs'), orderByChild('to'), equalTo(session.role === 'admin' ? 'admin' : key), limitToLast(100)), v => setDb(d => ({...d, notifs: toArr(v).sort((a, b) => b.at - a.at)})));
    if (session.role === 'admin') {
      sub(dbRef('rescuers'), v => setDb(d => ({...d, rescuers: toArr(v)})));
      sub(query(dbRef('audit'), orderByChild('at'), limitToLast(100)), v => setDb(d => ({...d, audit: toArr(v).sort((a, b) => b.at - a.at)})));
    }
    if (session.role === 'officer') sub(query(dbRef('rescuers'), orderByChild('officerId'), equalTo(session.id)), v => setDb(d => ({...d, rescuers: toArr(v)})));
    if (session.role === 'admin' || session.role === 'officer') sub(dbRef('live'), v => setLive(v || {}));
    sub(connectedRef(), v => setOnline(!!v));
    return () => off.forEach(f => f());
  }, [session && session.role, session && session.id]);


  // is the backend API reachable? (checked every 10 s)
  const [apiUp, setApiUp] = useState(true);
  useEffect(() => {
    let on = true;
    const ping = () => fetch(API_ORIGIN + '/api/health').then(r => on && setApiUp(r.ok)).catch(() => on && setApiUp(false));
    ping(); const t = setInterval(ping, 10000); return () => { on = false; clearInterval(t); };
  }, []);

  const toast = (msg, type = 'ok') => { const id = uid(); setToasts(t => t.some(x => x.msg === msg) ? t : [...t, {id, msg, type}]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200); };
  const run = async (fn, okMsg, type = 'ok') => { try { await fn(); if (okMsg) toast(okMsg, type); } catch (e) { toast(e.message, 'err'); } };
  const P = (id, p, body, method) => api('/reports/' + id + p, {body, method});

  const login = async (role, email, pw) => {
    let cred;
    try { cred = await signInWithEmailAndPassword(auth, email, pw); }
    catch (e) { throw new Error(e.code === 'auth/too-many-requests' ? 'Too many attempts. Try again later.' : 'Invalid ' + ROLE_NAME[role] + ' credentials.'); }
    const c = (await cred.user.getIdTokenResult(true)).claims;
    if (c.role !== role) { await signOut(auth); throw new Error('This is not a ' + ROLE_NAME[role] + ' account. Choose the correct tab above.'); }
  };
  const logout = async () => { await disablePush(); signOut(auth); };

  const A = {
    startReview: id => run(() => P(id, '/review')),
    verify: (id, ok, reason) => run(() => P(id, '/verify', {ok, reason}), ok ? 'Report verified as TRUE' : 'Report rejected as FALSE', ok ? 'ok' : 'err'),
    setPriority: (id, priority) => run(() => P(id, '/priority', {priority})),
    assign: (id, officerId) => run(() => P(id, '/assign', {officerId}), 'Task sent to officer'),
    addOfficer: f => run(() => api('/officers', {body: f}), 'Officer account created'),
    removeOfficer: id => run(() => api('/officers/' + id, {method: 'DELETE'}), 'Officer removed'),
    assignBackup: (id, officerId) => run(() => P(id, '/backup/assign', {officerId}), 'Backup officer assigned'),
    markDuplicate: (id, of) => run(() => P(id, '/duplicate', {of}), 'Report marked as duplicate'),
    cancelReport: (id, reason) => run(() => P(id, '/cancel', {reason}), 'Report cancelled'),
    close: id => run(() => P(id, '/close'), 'Case closed'),
    dispatch: (id, units, text) => run(() => P(id, '/dispatch', {units, text}), 'Team dispatched: ' + units.join(', ')),
    requestBackup: (id, reason) => run(() => P(id, '/backup/request', {reason}), 'Backup request sent to Admin'),
    forwardCompletion: (id, summary) => run(() => P(id, '/complete', {summary}), 'Completion report sent to Admin'),
    // demo stand-ins for the rescue-team mobile app (server needs DEMO_MODE=true)
    advanceUnit: id => run(() => P(id, '/team-update', {action: 'advance'})),
    simBackup: id => run(() => P(id, '/team-update', {action: 'backup'}), 'Backup call received from team', 'err'),
    simComplete: id => run(() => P(id, '/team-update', {action: 'complete'}), 'Rescue team marked mission as completed'),
    simulateReport: () => {
      const T = [
        ['Flood','Brgy. Libtong, Meycauayan',14.7490,120.9680,'Street flooding rising fast. Residents asking for rescue boat.'],
        ['Fire','Brgy. Wakas, Bocaue',14.8040,120.9220,'House fire near a gas station. Neighbors evacuating.'],
        ['Landslide','Brgy. Muzon, San Jose del Monte',14.8100,121.0300,'Soil slide blocking the road, two vehicles buried.'],
        ['Storm','Brgy. Tabang, Guiguinto',14.8380,120.8760,'Strong winds tore off roofs. Several injured.'],
        ['Flood','Brgy. Santa Rita, Obando',14.7120,120.9400,'River overflow. Families moving to rooftops.']];
      const t = T[Math.floor(Math.random() * T.length)], names = ['Rina Garcia', 'Paolo Cruz', 'Ben Alonzo', 'Cathy Ramos'];
      return run(() => api('/reports', {token: false, body: {type:t[0], reporter:names[Math.floor(Math.random() * 4)], phone:'09' + Math.floor(100000000 + Math.random() * 899999999), address:t[1], lat:t[2], lng:t[3], people:3 + Math.floor(Math.random() * 25), desc:t[4]}}), 'New resident report received');
    },
    createReport: async (f, files = []) => {
      let body = f;
      if (files.length) { body = new FormData(); Object.entries(f).forEach(([k, v]) => body.append(k, v)); files.forEach(x => body.append('photos', x, x.name || 'photo.jpg')); }
      const r = await api('/reports', {token: false, body}); toast('Report ' + r.id + ' submitted'); return r.id;
    },
    addPhotos: (id, files) => run(() => { const fd = new FormData(); files.forEach(x => fd.append('photos', x, x.name || 'photo.jpg')); return P(id, '/photos', fd); }, files.length > 1 ? 'Photos uploaded' : 'Photo uploaded'),
    deletePhoto: (id, photoId) => run(() => P(id, '/photos/' + photoId, undefined, 'DELETE'), 'Photo removed'),
    updateLocation: (oid, pos) => api('/location', {body: {lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy}}).catch(() => {}),
    addRescuer: f => run(() => api('/rescuers', {body: f}), 'Rescuer account created'),
    removeRescuer: id => run(() => api('/rescuers/' + id, {method: 'DELETE'}), 'Rescuer removed'),
    fieldUpdate: (id, action, extra = {}) => run(() => P(id, '/field', {action, ...extra}), action === 'complete' ? 'Mission completed. Your officer was notified.' : action === 'backup' ? 'Backup request sent to your officer' : 'Status updated'),
    markRead: () => api('/notifications/read').catch(() => {}),
    reset: () => run(() => api('/admin/reset'), 'Incidents reset to 4 default reports')
  };

  // officers with their live GPS position merged in
  const dbv = useMemo(() => ({...db,
    officers: db.officers.map(o => live[o.id] ? {...o, lat:live[o.id].lat, lng:live[o.id].lng, live:true, liveAt:live[o.id].at} : o),
    rescuers: (db.rescuers || []).map(x => live[x.id] ? {...x, lat:live[x.id].lat, lng:live[x.id].lng, live:true, liveAt:live[x.id].at} : x)}), [db, live]);
  const me = session && session.role === 'officer' ? dbv.officers.find(o => o.id === session.id) : null;

  return <Ctx.Provider value={{db:dbv, A, toast, online}}>
    {!authReady ? <div style={{display:'grid',placeItems:'center',height:'100vh',color:'#5B6B82'}}>Loading…</div>
      : !session ? <Login onLogin={login}/> : session.role === 'admin' ? <AdminApp onLogout={logout}/> : session.role === 'rescuer' ? <RescuerApp me={session} onLogout={logout}/> : me ? <OfficerApp me={me} onLogout={logout}/> : <div style={{display:'grid',placeItems:'center',height:'100vh',color:'#5B6B82'}}>Loading your station…</div>}
    <div className="toasts">{toasts.map(t => <div key={t.id} className={'toast ' + t.type}>{t.msg}</div>)}</div>
    {!apiUp && <div style={{position:'fixed',top:0,left:0,right:0,background:'#B54708',color:'#fff',textAlign:'center',fontSize:13,padding:'6px 10px',zIndex:101}}>The RescueNet server is not running — buttons that save changes will fail. Start it with <b>npm run dev:all</b> (or <b>npm run api</b>), then this message disappears.</div>}
    {!online && <div style={{position:'fixed',top:0,left:0,right:0,background:'#D92D20',color:'#fff',textAlign:'center',fontSize:13,padding:4,zIndex:100}}>Connection lost — reconnecting…</div>}
    {session && session.role === 'admin' && <button onClick={A.reset} title="Resets incidents only (DEMO_MODE only)" style={{position:'fixed',left:8,bottom:6,fontSize:11,color:'#8FA3C2',zIndex:40,textDecoration:'underline'}}>Reset incidents</button>}
  </Ctx.Provider>;
}
