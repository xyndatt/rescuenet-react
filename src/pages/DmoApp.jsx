import React, { useState } from 'react';
import { useApp } from '../context';
import { Frame } from '../components/Frame';
import { MapView, MapLegend } from '../components/MapView';
import { PageHead } from '../components/ui';
import { AdminAudit } from './AdminApp';
import { Analytics } from './Analytics';

// Disaster Management Officer: read-only monitoring, trends and report generation (no personal contact details).
export function DmoApp({me, onLogout}) {
  const {db} = useApp(); const [view, setView] = useState('overview');
  const nav = [{key:'overview', label:'Overview & Trends', icon:'dashboard'}, {key:'map', label:'Incident Map', icon:'map'}, {key:'reports', label:'Reports & Statistics', icon:'reports'}, {key:'audit', label:'Audit Trail', icon:'log'}];
  return <Frame roleLabel="Disaster Management Officer" user={{name:me.name, title:'Read-only access'}} nav={nav} view={view} setView={setView} onOpenReport={() => {}} notifTo="none" onLogout={onLogout} title={nav.find(n => n.key === view).label} hideBell>
    {view === 'overview' && <Analytics overview/>}
    {view === 'map' && <><PageHead title="Incident Map" sub="All reported incidents and officer stations (read-only)."/><div className="card"><div className="card-b"><MapView reports={db.reports.filter(r => r.verification !== 'false' && r.status !== 'Closed')} officers={db.officers} height={560}/><MapLegend/></div></div></>}
    {view === 'reports' && <Analytics/>}
    {view === 'audit' && <AdminAudit/>}
  </Frame>;
}
