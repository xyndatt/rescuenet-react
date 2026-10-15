import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from './data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from './components/ui';
import { Ctx, useApp } from './context';
import { Login } from './pages/Login';
import { AdminApp } from './pages/AdminApp';
import { OfficerApp } from './pages/OfficerApp';
export default function App() {
  const [db, setDb] = useState(loadDb); const [session, setSession] = useState(loadSession); const [toasts, setToasts] = useState([]); const [, tick] = useState(0);
  useEffect(() => { try { localStorage.setItem(KEY + '-db', JSON.stringify(db)); } catch (e) {} }, [db]);
  useEffect(() => { try { session ? localStorage.setItem(KEY + '-session', JSON.stringify(session)) : localStorage.removeItem(KEY + '-session'); } catch (e) {} }, [session]);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);

  const toast = (msg, type = 'ok') => { const id = uid(); setToasts(t => [...t, {id, msg, type}]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200); };
  const mutate = fn => setDb(prev => { const d = structuredClone(prev); fn(d); return d; });
  const note = (d, to, text, reportId, kind = 'info') => d.notifs.unshift({id:uid(), to, text, reportId, kind, at:Date.now(), read:false});
  const audit = (d, actor, action, reportId) => d.audit.unshift({id:uid(), actor, action, reportId, at:Date.now()});
  const tl = (r, by, text) => r.timeline.push({at:Date.now(), by, text});
  const on = (d, id) => (d.officers.find(o => o.id === id) || {name:'Officer'}).name;

  const A = {
    startReview: id => { mutate(d => { const r = getR(d, id); r.status = 'Under Verification'; tl(r, 'Admin', 'Report is under verification'); }); },
    verify: (id, ok, reason) => {
      mutate(d => { const r = getR(d, id);
        if (ok) { r.verification = 'verified'; if (['Submitted', 'Under Verification'].includes(r.status)) r.status = 'Verified'; tl(r, 'Admin', 'Report verified as TRUE information'); audit(d, 'Admin', 'Verified report as true information', id); }
        else { r.verification = 'false'; r.status = 'Rejected'; r.rejectReason = reason; tl(r, 'Admin', 'Report marked as FALSE: ' + reason); audit(d, 'Admin', 'Marked report as FALSE information', id); } });
      toast(ok ? 'Report verified as TRUE' : 'Report rejected as FALSE', ok ? 'ok' : 'err');
    },
    setPriority: (id, p) => { mutate(d => { const r = getR(d, id); r.priority = p; tl(r, 'Admin', 'Priority set to ' + p.toUpperCase()); audit(d, 'Admin', 'Set priority to ' + p.toUpperCase(), id); }); },
    assign: (id, oid) => {
      mutate(d => { const r = getR(d, id); r.officerId = oid; r.status = 'Awaiting Assignment'; tl(r, 'Admin', 'Task assigned to ' + on(d, oid)); audit(d, 'Admin', 'Assigned task to ' + on(d, oid), id);
        note(d, oid, `NEW TASK · ${PRIORITY[r.priority].label} ${r.type} at ${r.address}. Dispatch a rescue team.`, id, 'alert'); });
      toast('Task sent to officer');
    },
    addOfficer: f => {
      mutate(d => { const c = MUNI[f.muni]; const o = {id:'o' + uid(), name:f.name.trim(), rank:f.rank, station:f.muni + ' Rescue Station', muni:f.muni, lat:c[0], lng:c[1], phone:f.phone, email:f.email.trim(), password:f.password}; d.officers.push(o); audit(d, 'Admin', 'Added officer ' + o.name); });
      toast('Officer account created');
    },
    removeOfficer: id => { mutate(d => { const n = on(d, id); d.officers = d.officers.filter(o => o.id !== id); audit(d, 'Admin', 'Removed officer ' + n); }); toast('Officer removed'); },
    assignBackup: (id, bid) => {
      mutate(d => { const r = getR(d, id); r.backup.status = 'assigned'; r.backup.officerId = bid; tl(r, 'Admin', 'Backup assigned: ' + on(d, bid)); audit(d, 'Admin', 'Assigned backup officer ' + on(d, bid), id);
        note(d, bid, `BACKUP TASK · Reinforce ${on(d, r.officerId)} at ${r.address}`, id, 'alert'); note(d, r.officerId, `Backup approved: ${on(d, bid)} will reinforce ${r.id}`, id); });
      toast('Backup officer assigned');
    },
    close: id => { mutate(d => { const r = getR(d, id); r.status = 'Closed'; tl(r, 'Admin', 'Case closed'); audit(d, 'Admin', 'Closed case', id); if (r.officerId) note(d, r.officerId, `${r.id} was closed by the Admin. Good work!`, id); }); toast('Case closed'); },
    dispatch: (id, units, text, oid) => {
      mutate(d => { const r = getR(d, id); units.forEach(u => r.dispatches.push({unit:u, status:'Dispatched', at:Date.now()}));
        if (['Verified', 'Awaiting Assignment'].includes(r.status)) r.status = 'Team Assigned';
        tl(r, on(d, oid), 'Dispatched ' + units.join(', ') + (text ? ' — "' + text + '"' : '')); audit(d, on(d, oid), 'Dispatched ' + units.join(', '), id);
        note(d, 'admin', `${on(d, oid)} dispatched ${units.join(', ')} to ${r.id}`, id); });
      toast('Team dispatched: ' + units.join(', '));
    },
    advanceUnit: id => {
      mutate(d => { const r = getR(d, id); r.dispatches.forEach(x => { const i = UNIT_FLOW.indexOf(x.status); if (i < 2) x.status = UNIT_FLOW[i + 1]; });
        r.status = 'Rescue in Progress'; tl(r, 'Rescue Team (Mobile)', 'Status update: ' + r.dispatches.map(x => x.unit + ' ' + x.status).join(', ')); note(d, r.officerId, `Team update on ${r.id}: ${r.dispatches.map(x => x.unit + ' ' + x.status).join(', ')}`, id); });
    },
    simBackup: id => {
      mutate(d => { const r = getR(d, id); const u = r.dispatches.find(x => x.status !== 'Completed') || r.dispatches[0];
        r.backupAlert = {unit:u.unit, message:'Situation is getting worse. Requesting additional personnel and equipment.', at:Date.now(), handled:false}; tl(r, 'Rescue Team (' + u.unit + ')', 'Requested backup from the field');
        note(d, r.officerId, `BACKUP ALERT · ${u.unit} team on ${r.id} is requesting backup`, id, 'alert'); });
      toast('Backup call received from team', 'err');
    },
    requestBackup: (id, reason, oid) => {
      mutate(d => { const r = getR(d, id); r.backup = {reason, requestedBy:oid, requestedAt:Date.now(), status:'requested', officerId:null}; if (r.backupAlert) r.backupAlert.handled = true;
        tl(r, on(d, oid), 'Backup requested via Admin'); audit(d, on(d, oid), 'Requested backup via Admin', id); note(d, 'admin', `BACKUP REQUEST · ${on(d, oid)} needs backup for ${r.id}`, id, 'alert'); });
      toast('Backup request sent to Admin');
    },
    simComplete: id => {
      mutate(d => { const r = getR(d, id); r.dispatches.forEach(x => x.status = 'Completed'); const n = 4 + Math.floor(Math.random() * 12);
        r.completion = {rescued:n, notes:'Area cleared. All affected residents accounted for.', at:Date.now()}; tl(r, 'Rescue Team (Mobile)', `Mission completed: ${n} people rescued`);
        note(d, r.officerId, `MISSION COMPLETED · ${r.id}: ${n} people rescued. Forward the report to Admin.`, id, 'alert'); });
      toast('Rescue team marked mission as completed');
    },
    forwardCompletion: (id, summary, oid) => {
      mutate(d => { const r = getR(d, id); r.forwarded = true; r.officerSummary = summary; r.status = 'Resolved'; tl(r, on(d, oid), 'Completion report forwarded to Admin'); audit(d, on(d, oid), 'Forwarded completion report', id);
        note(d, 'admin', `${r.id} · Completion report forwarded by ${on(d, oid)}`, id); });
      toast('Completion report sent to Admin');
    },
    simulateReport: () => {
      const T = [
        ['Flood','Brgy. Libtong, Meycauayan',14.7490,120.9680,'Street flooding rising fast. Residents asking for rescue boat.'],
        ['Fire','Brgy. Wakas, Bocaue',14.8040,120.9220,'House fire near a gas station. Neighbors evacuating.'],
        ['Landslide','Brgy. Muzon, San Jose del Monte',14.8100,121.0300,'Soil slide blocking the road, two vehicles buried.'],
        ['Storm','Brgy. Tabang, Guiguinto',14.8380,120.8760,'Strong winds tore off roofs. Several injured.'],
        ['Flood','Brgy. Santa Rita, Obando',14.7120,120.9400,'River overflow. Families moving to rooftops.']];
      const t = T[Math.floor(Math.random() * T.length)], names = ['Rina Garcia', 'Paolo Cruz', 'Ben Alonzo', 'Cathy Ramos'];
      mutate(d => { const n = Math.max(...d.reports.map(r => parseInt(r.id.slice(-4)))) + 1; const id = 'DR-2026-' + String(n).padStart(4, '0');
        d.reports.push({id, type:t[0], reporter:names[Math.floor(Math.random() * 4)], phone:'09' + Math.floor(100000000 + Math.random() * 899999999), address:t[1], lat:t[2], lng:t[3], people:3 + Math.floor(Math.random() * 25), createdAt:Date.now(), desc:t[4],
          verification:'pending', priority:null, status:'Submitted', officerId:null, dispatches:[], backupAlert:null, backup:null, completion:null, forwarded:false, officerSummary:'', rejectReason:'', timeline:[{at:Date.now(), by:'Resident (Mobile)', text:'Report submitted with GPS location and photo'}]});
        note(d, 'admin', `${id} · New ${t[0]} report from ${t[1]}`, id); });
      toast('New resident report received');
    },
    markRead: to => setDb(prev => ({...prev, notifs:prev.notifs.map(n => n.to === to ? {...n, read:true} : n)})),
    reset: () => { setDb(seed()); toast('Demo data reset'); }
  };

  const me = session && session.role === 'officer' ? db.officers.find(o => o.id === session.id) : null;
  useEffect(() => { if (session && session.role === 'officer' && !me) setSession(null); }, [session, me]);
  const logout = () => setSession(null);

  return <Ctx.Provider value={{db, A, toast}}>
    {!session ? <Login onLogin={s => setSession(s)}/> : session.role === 'admin' ? <AdminApp onLogout={logout}/> : me ? <OfficerApp me={me} onLogout={logout}/> : null}
    <div className="toasts">{toasts.map(t => <div key={t.id} className={'toast ' + t.type}>{t.msg}</div>)}</div>
    {session && <button onClick={A.reset} title="Reset demo data" style={{position:'fixed',left:8,bottom:6,fontSize:11,color:'#8FA3C2',zIndex:40,textDecoration:'underline'}}>Reset demo data</button>}
  </Ctx.Provider>;
}
