import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
export function Bell({to, onOpen}) {
  const {db, A} = useApp(); const [open, setOpen] = useState(false);
  const list = db.notifs.filter(n => n.to === to).sort((a, b) => b.at - a.at);
  const unread = list.filter(n => !n.read).length;
  return <div style={{position:'relative'}}>
    <button className="iconbtn" onClick={() => { setOpen(!open); if (!open) setTimeout(() => A.markRead(to), 1500); }}><Icon n="bell"/>{unread > 0 && <span className="pip">{unread}</span>}</button>
    {open && <div className="notif-pop"><header>Notifications<span className="sp"/><button onClick={() => setOpen(false)}><Icon n="close"/></button></header>
      <div className="list">{list.length === 0 && <div className="empty">No notifications yet</div>}
        {list.slice(0, 20).map(n => <div key={n.id} className={'n-item ' + (n.read ? '' : 'un ') + n.kind} onClick={() => { setOpen(false); onOpen(n.reportId); }}><i className="nd"/><div>{n.text}<small>{ago(n.at)}</small></div></div>)}</div></div>}
  </div>;
}
