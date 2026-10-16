import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
import { Bell } from './Bell';
import { pushConfigured, pushEnabled, enablePush } from '../push';
/* Shell split: Header is rendered by ShellFrame below so pages can be injected */
export function Frame({roleLabel, user, nav, view, setView, onOpenReport, notifTo, onLogout, title, topExtra, hideBell, children}) {
  const [side, setSide] = useState(false); const {toast} = useApp(); const [pushOn, setPushOn] = useState(pushEnabled());
  return <div className="shell">
    <div className={'scrim ' + (side ? 'open' : '')} onClick={() => setSide(false)}/>
    <aside className={'side ' + (side ? 'open' : '')}>
      <div className="brand"><Logo/><div><b>RescueNet</b><small>Command Center</small></div></div>
      <div className="side-role"><small>Signed in as</small><b>{roleLabel}</b></div>
      <nav className="nav">{nav.map(n => <button key={n.key} className={view === n.key ? 'on' : ''} onClick={() => { setView(n.key); setSide(false); }}><Icon n={n.icon}/>{n.label}{n.badge > 0 && <span className="cnt">{n.badge}</span>}</button>)}</nav>
      <div className="side-foot"><div className="hazard"/><button className="btn btn-block" style={{color:'#fff',border:'1.5px solid rgba(255,255,255,.25)'}} onClick={onLogout}><Icon n="logout"/>Log out</button></div>
    </aside>
    <div className="main">
      <header className="top">
        <button className="iconbtn menu" onClick={() => setSide(true)}><Icon n="menu"/></button>
        <div><h2>{title}</h2><div className="date">{new Date().toLocaleDateString('en-PH', {weekday:'long', month:'long', day:'numeric', year:'numeric'})}</div></div>
        <div className="sp"/>{topExtra}
        {!hideBell && pushConfigured() && !pushOn && <button className="btn btn-ghost btn-sm" title="Get alerts even when this tab is in the background" onClick={() => enablePush().then(() => { setPushOn(true); toast('Push alerts enabled on this browser'); }).catch(e => toast(e.message, 'err'))}><Icon n="bell"/><span>Enable alerts</span></button>}
        {!hideBell && <Bell to={notifTo} onOpen={onOpenReport}/>}
        <div className="user-chip"><div className="avatar">{initials(user.name)}</div><div><b>{user.name}</b><small>{user.title}</small></div></div>
      </header>
      <div className="content">{children}</div>
    </div>
  </div>;
}
