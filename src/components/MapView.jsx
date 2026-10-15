import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
import L from 'leaflet';
export function MapView({reports = [], officers = [], selectedId, onSelect, height = 380, line}) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), cb = useRef(onSelect), fitKey = useRef('');
  cb.current = onSelect;
  useEffect(() => {
    if (!el.current) return;
    map.current = L.map(el.current, {scrollWheelZoom:false}).setView([14.80, 120.92], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:18, attribution:'© OpenStreetMap'}).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    setTimeout(() => map.current && map.current.invalidateSize(), 250);
    const ro = new ResizeObserver(() => map.current && map.current.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); map.current.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    layer.current.clearLayers(); const pts = [];
    reports.forEach(r => {
      const color = r.verification === 'false' ? '#8A94A6' : r.priority ? PRIORITY[r.priority].color : '#D49A00';
      const cls = 'pin' + (r.verification === 'pending' ? ' pending' : '') + (r.id === selectedId ? ' sel' : '');
      const icon = L.divIcon({className:'', html:`<div class="${cls}" style="--c:${color}"><span>${TYPES[r.type].icon}</span></div>`, iconSize:[38,38], iconAnchor:[19,46]});
      const mk = L.marker([r.lat, r.lng], {icon}).addTo(layer.current).bindTooltip(esc(r.id) + ' · ' + esc(r.type) + '<br>' + esc(r.address));
      mk.on('click', () => cb.current && cb.current(r.id)); pts.push([r.lat, r.lng]);
    });
    officers.forEach(o => {
      const icon = L.divIcon({className:'', html:'<div class="pin officer" style="--c:#0B1B33"><span>🛡️</span></div>', iconSize:[38,38], iconAnchor:[19,19]});
      L.marker([o.lat, o.lng], {icon}).addTo(layer.current).bindTooltip(esc(o.name) + '<br>' + esc(o.station)); pts.push([o.lat, o.lng]);
    });
    if (line) L.polyline(line, {color:'#FF5B14', weight:3, dashArray:'8 8'}).addTo(layer.current);
    const k = pts.map(p => p.join(',')).join('|');
    if (pts.length && k !== fitKey.current) { fitKey.current = k; map.current.fitBounds(pts, {padding:[40,40], maxZoom:14}); }
  }, [JSON.stringify(reports.map(r => [r.id, r.lat, r.lng, r.priority, r.verification])), JSON.stringify(officers.map(o => [o.id, o.lat, o.lng])), selectedId, JSON.stringify(line || null)]);
  return <div><div className="mapbox"><div ref={el} style={{height}}/></div></div>;
}
export const MapLegend = () => <div className="map-legend">
  <span><i style={{background:'#D92D20'}}/>Critical</span><span><i style={{background:'#FF5B14'}}/>High</span><span><i style={{background:'#D49A00'}}/>Medium</span><span><i style={{background:'#2E8B57'}}/>Low</span>
  <span><i style={{background:'#fff',border:'2px dashed #D49A00'}}/>Unverified</span><span>🛡️ Officer station</span></div>;