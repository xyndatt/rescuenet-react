import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
export function Login({onLogin}) {
  const {db} = useApp();
  const [role, setRole] = useState('admin'); const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [show, setShow] = useState(false); const [err, setErr] = useState('');
  const submit = e => {
    e.preventDefault(); setErr('');
    if (!email.trim() || !pw) return setErr('Please enter your email and password.');
    if (role === 'admin') {
      if (email.trim().toLowerCase() === ADMIN.email && pw === ADMIN.password) return onLogin({role:'admin'});
      return setErr('Invalid administrator credentials.');
    }
    const o = db.officers.find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === pw);
    if (!o) return setErr('Invalid officer credentials. Accounts are created by the Administrator.');
    onLogin({role:'officer', id:o.id});
  };
  const fill = (r, e, p) => { setRole(r); setEmail(e); setPw(p); setErr(''); };
  return <div className="login">
    <section className="login-hero">
      <div className="brand"><Logo/><div><b>RescueNet</b><small>Disaster Rescue Reporting &amp; Monitoring</small></div></div>
      <div className="hero-copy">
        <h1>Report.<br/><em>Rescue.</em><br/>Save Lives.</h1>
        <p>Central command for verifying disaster reports, assigning the nearest officer, and deploying BFP, SRR and Ambulance teams in real time.</p>
        <div className="flow"><span><b>1</b>Resident reports</span><span><b>2</b>Admin verifies &amp; assigns</span><span><b>3</b>Officer dispatches team</span><span><b>4</b>Rescue &amp; report back</span></div>
      </div>
      <div><div className="hazard" style={{marginBottom:18,borderRadius:3}}/><div className="hotline"><div className="n">911</div><small>National emergency hotline. Submitting a report does not automatically guarantee immediate rescue — always call official lines in life-threatening situations.</small></div></div>
    </section>
    <section className="login-form-wrap">
      <form className="login-card" onSubmit={submit}>
        <h2>Command Login</h2><p className="sub">Authorized personnel only.</p>
        <div className="role-tabs">
          <button type="button" className={'role-tab ' + (role === 'admin' ? 'on' : '')} onClick={() => { setRole('admin'); setErr(''); }}><b>Admin</b><span>Verify · Prioritize · Assign</span></button>
          <button type="button" className={'role-tab ' + (role === 'officer' ? 'on' : '')} onClick={() => { setRole('officer'); setErr(''); }}><b>Disaster Officer</b><span>Dispatch rescue teams</span></button>
        </div>
        {err && <div className="err">{err}</div>}
        <div className="field"><label>Email address</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={role === 'admin' ? 'admin@rescue.ph' : 'officer@rescue.ph'}/></div>
        <div className="field"><label>Password</label><div className="pw"><input className="input" type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••"/><button type="button" onClick={() => setShow(!show)}>{show ? 'HIDE' : 'SHOW'}</button></div></div>
        <button className="btn btn-primary btn-block" style={{padding:13,fontSize:16}}>Log in as {role === 'admin' ? 'Administrator' : 'Disaster Officer'}</button>
        <div className="demo"><b>Demo accounts (click to fill)</b>
          <button type="button" onClick={() => fill('admin', ADMIN.email, ADMIN.password)}>🛡️ Admin — <code>admin@rescue.ph</code> / <code>admin123</code></button>
          <button type="button" onClick={() => fill('officer', 'ana@rescue.ph', 'officer123')}>👮 Officer — <code>ana@rescue.ph</code> / <code>officer123</code></button>
          <button type="button" onClick={() => fill('officer', 'pedro@rescue.ph', 'officer123')}>👮 Officer — <code>pedro@rescue.ph</code> / <code>officer123</code></button></div>
        <div className="disclaimer"><Icon n="alert"/><span>Front-end prototype. Data is stored only in this browser. Your session is protected by role-based access in the final system.</span></div>
      </form>
    </section>
  </div>;
}
