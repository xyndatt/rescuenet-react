import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
export function Login({onLogin}) {
  const [role, setRole] = useState('admin'); const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [show, setShow] = useState(false); const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (!email.trim() || !pw) return setErr('Please enter your email and password.');
    setBusy(true);
    try { await onLogin(role, email.trim(), pw); } catch (x) { setErr(x.message); } finally { setBusy(false); }
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
          <button type="button" className={'role-tab ' + (role === 'admin' ? 'on' : '')} onClick={() => { setRole('admin'); setErr(''); }}><b>Admin</b><span>Verify · Assign</span></button>
          <button type="button" className={'role-tab ' + (role === 'officer' ? 'on' : '')} onClick={() => { setRole('officer'); setErr(''); }}><b>Officer</b><span>Dispatch teams</span></button>
          <button type="button" className={'role-tab ' + (role === 'rescuer' ? 'on' : '')} onClick={() => { setRole('rescuer'); setErr(''); }}><b>Rescuer</b><span>Field team</span></button>
        </div>
        {err && <div className="err">{err}</div>}
        <div className="field"><label>Email address</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={role + '@rescue.ph'}/></div>
        <div className="field"><label>Password</label><div className="pw"><input className="input" type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••"/><button type="button" onClick={() => setShow(!show)}>{show ? 'HIDE' : 'SHOW'}</button></div></div>
        <button className="btn btn-primary btn-block" style={{padding:13,fontSize:16}} disabled={busy}>{busy ? 'Signing in…' : 'Log in as ' + {admin:'Administrator', officer:'Disaster Officer', rescuer:'Rescuer'}[role]}</button>
        <div className="demo"><b>Demo accounts (click to fill)</b>
          <button type="button" onClick={() => fill('admin', ADMIN.email, ADMIN.password)}>🛡️ Admin — <code>admin@rescue.ph</code> / <code>admin123</code></button>
</div>
        <div className="disclaimer"><Icon n="alert"/><span>Sign-in is handled by Firebase Authentication. Roles are enforced on the server.</span></div>
      </form>
    </section>
  </div>;
}
