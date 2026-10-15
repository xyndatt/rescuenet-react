import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
export function ReportInfo({r, db}) {
  const meta = TYPES[r.type];
  return <>
    <div className="card"><div className="card-b">
      <div className="row-flex" style={{marginBottom:12}}><TypeIco type={r.type}/><div className="sp"><b style={{fontSize:17}}>{r.type} incident</b><div className="hint">Reported {ago(r.createdAt)} · {fmtTime(r.createdAt)}</div></div><PrioBadge p={r.priority}/></div>
      <div className="row-flex" style={{marginBottom:12}}><VerifyBadge v={r.verification}/><StatusBadge s={r.status}/></div>
      <FlowBar r={r}/>
    </div></div>
    <div className="card"><div className="card-h"><h4>Incident details</h4></div><div className="card-b">
      <p style={{marginBottom:12}}>“{r.desc}”</p>
      <dl className="kv"><dt>Location</dt><dd>{r.address}</dd><dt>GPS</dt><dd>{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</dd><dt>Reporter</dt><dd>{r.reporter}</dd><dt>Contact</dt><dd>{r.phone}</dd><dt>People affected</dt><dd>~{r.people}</dd><dt>Assigned officer</dt><dd>{r.officerId ? offName(db, r.officerId) : '—'}</dd>{r.backup && r.backup.status === 'assigned' && <><dt>Backup officer</dt><dd>{offName(db, r.backup.officerId)}</dd></>}</dl>
      <div className="mt photo"><div><b>{meta.icon}</b>Resident photo evidence (from mobile app)</div></div>
    </div></div>
  </>;
}
