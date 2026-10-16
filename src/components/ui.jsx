import React, { useState } from 'react';
import { TYPES, PRIORITY, STATUS_COLOR, FLOW, fmtTime } from '../data';
export const ICONS = {
  dashboard:'M3 3h8v8H3z M13 3h8v5h-8z M13 12h8v9h-8z M3 15h8v6H3z',
  reports:'M6 2h9l5 5v15H6z M14 2v6h6 M9 13h8 M9 17h8',
  map:'M9 3 3 5v16l6-2 6 2 6-2V3l-6 2z M9 3v16 M15 5v16',
  users:'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 20v-2a4 4 0 0 0-3-3.9 M16 2.1a4 4 0 0 1 0 7.8',
  backup:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.9 4.9l4.3 4.3 M14.8 14.8l4.3 4.3 M14.8 9.2l4.3-4.3 M4.9 19.1l4.3-4.3',
  check:'M20 6 9 17l-5-5', log:'M4 4h16v16H4z M8 9h8 M8 13h8 M8 17h5',
  bell:'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
  logout:'M9 21H5V3h4 M16 17l5-5-5-5 M21 12H9', plus:'M12 5v14 M5 12h14',
  trash:'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6 M10 11v6 M14 11v6', close:'M18 6 6 18 M6 6l12 12',
  pin:'M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  search:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3', menu:'M3 6h18 M3 12h18 M3 18h18',
  alert:'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z M12 9v4 M12 17h.01',
  send:'M22 2 11 13 M22 2l-7 20-4-9-9-4z', clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  flag:'M4 22V4 M4 4h13l-2 4 2 4H4'
};
export const Icon = ({n}) => <svg className="icon" viewBox="0 0 24 24"><path d={ICONS[n]}/></svg>;
export const Logo = () => <svg viewBox="0 0 48 48"><path d="M24 3 42 10v13c0 11-7.5 19-18 22C13.500 42 6 34 6 23V10z" fill="#FF5B14"/><path d="M24 3 42 10v13c0 11-7.5 19-18 22" fill="none" stroke="#FFC21A" strokeWidth="2.5"/><path d="M21 14h6v7h7v6h-7v7h-6v-7h-7v-6h7z" fill="#fff"/></svg>;
export const Badge = ({color, children, solid}) => <span className="badge" style={solid ? {background:color, color:'#fff'} : {background:color + '1F', color}}>{children}</span>;
export const StatusBadge = ({s}) => <Badge color={STATUS_COLOR[s] || '#5B6B82'}><i className="dot"/>{s}</Badge>;
export const PrioBadge = ({p}) => p ? <Badge solid color={PRIORITY[p].color}>{PRIORITY[p].label.toUpperCase()}</Badge> : <Badge color="#8A94A6">Not set</Badge>;
export const VerifyBadge = ({v}) => v === 'verified' ? <Badge color="#12A150">✔ TRUE · Verified</Badge> : v === 'false' ? <Badge color="#D92D20">✖ FALSE report</Badge> : <Badge color="#D49A00">⏳ Unverified</Badge>;
export const TypeIco = ({type}) => <div className="tyico" style={{background:TYPES[type].color + '1A'}}>{TYPES[type].icon}</div>;

export function Donut({data}) {
  const total = data.reduce((a, b) => a + b.value, 0), R = 54, C = 2 * Math.PI * R; let off = 0;
  return <svg viewBox="0 0 140 140" width="150" height="150">
    <circle cx="70" cy="70" r={R} fill="none" stroke="#E8ECF2" strokeWidth="18"/>
    {data.filter(d => d.value > 0).map(d => { const len = d.value / (total || 1) * C; const el = <circle key={d.label} cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 70 70)"/>; off += len; return el; })}
    <text x="70" y="70" textAnchor="middle" className="donut-n">{total}</text>
    <text x="70" y="86" textAnchor="middle" className="donut-l">REPORTS</text>
  </svg>;
}

export function StatCard({label, value, color, icon, hint}) {
  return <div className="card stat" style={{'--c':color}}><div className="ic"><Icon n={icon}/></div><div><div className="v">{value}</div><div className="l">{label}</div>{hint && <div className="h">{hint}</div>}</div></div>;
}
export const PageHead = ({title, sub, children}) => <div className="page-head"><div><h3>{title}</h3>{sub && <p>{sub}</p>}</div><div className="sp"/>{children}</div>;

export function Drawer({title, kicker, onClose, children}) {
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="drawer"><div className="drawer-h"><div><small>{kicker}</small><h3>{title}</h3></div><div className="sp"/><button className="x" onClick={onClose}><Icon n="close"/></button></div>
    <div className="drawer-b">{children}</div></div></div>;
}
export function Modal({title, onClose, children, footer}) {
  return <div className="overlay center" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="modal"><div className="modal-h"><h3>{title}</h3><button onClick={onClose}><Icon n="close"/></button></div><div className="modal-b">{children}</div>{footer && <div className="modal-f">{footer}</div>}</div></div>;
}
export function Confirm({title, body, label, danger, onYes, onNo}) {
  return <Modal title={title} onClose={onNo} footer={<><button className="btn btn-ghost" onClick={onNo}>Cancel</button><button className={'btn ' + (danger ? 'btn-red' : 'btn-primary')} onClick={onYes}>{label}</button></>}><p>{body}</p></Modal>;
}
export function Timeline({items}) {
  return <div className="timeline">{[...items].reverse().map((t, i) => <div className="tl" key={i}><i/><div><div className="t">{t.text}</div><small>{t.by} · {fmtTime(t.at)}</small></div></div>)}</div>;
}
export function FlowBar({r}) {
  if (['Rejected','Duplicate','Cancelled'].includes(r.status)) return <div className="banner bad"><Icon n="alert"/><div className="grow"><b>{r.status === 'Rejected' ? 'Rejected — FALSE information' : r.status === 'Duplicate' ? 'Marked as duplicate' : 'Report cancelled'}</b><p>{r.rejectReason}</p></div></div>;
  const idx = FLOW.indexOf(r.status);
  return <div><div className="progress">{FLOW.map((s, i) => <i key={s} className={i < idx ? 'c' : i === idx ? 'd' : ''}/>)}</div>
    <div className="progress-l"><span>Submitted</span><b style={{color:'var(--orange-d)'}}>{r.status}</b><span>Closed</span></div></div>;
}
