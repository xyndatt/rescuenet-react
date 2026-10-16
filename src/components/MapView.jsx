import React, { useState, useEffect, useRef, useMemo } from 'react';
import { KEY, ADMIN, TYPES, PRIORITY, UNITS, RECOMMENDED, UNIT_FLOW, FLOW, STATUS_COLOR, MUNI, uid, esc, km, fmtTime, ago, initials, getR, offName, isActive, prioSort, activeTasksOf, dupesOf, seed, loadDb, loadSession } from '../data';
import { ICONS, Icon, Logo, Badge, StatusBadge, PrioBadge, VerifyBadge, TypeIco, Donut, StatCard, PageHead, Drawer, Modal, Confirm, Timeline, FlowBar } from '../components/ui';
import { Ctx, useApp } from '../context';
import L from 'leaflet';
import { getPosition } from '../useGeo';
export function MapView({reports = [], officers = [], rescuers = [], selectedId, onSelect, height = 380, line}) {
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
      L.marker([o.lat, o.lng], {icon}).addTo(layer.current).bindTooltip(esc(o.name) + '<br>' + esc(o.station) + (o.live ? '<br>📡 live GPS · ' + ago(o.liveAt) : '')); pts.push([o.lat, o.lng]);
    });
    rescuers.filter(x => x.lat != null && x.live).forEach(x => {
      const icon = L.divIcon({className:'', html:'<div class="pin officer" style="--c:#1D6FDB;background:#1D6FDB"><span>' + ((UNITS[x.unit] || {}).icon || '🚑') + '</span></div>', iconSize:[38,38], iconAnchor:[19,19]});
      L.marker([x.lat, x.lng], {icon}).addTo(layer.current).bindTooltip(esc(x.name) + '<br>' + esc(x.unit) + ' team<br>📡 live GPS · ' + ago(x.liveAt)); pts.push([x.lat, x.lng]);
    });
    if (line) L.polyline(line, {color:'#FF5B14', weight:3, dashArray:'8 8'}).addTo(layer.current);
    const k = pts.map(p => p.join(',')).join('|');
    if (pts.length && k !== fitKey.current) { fitKey.current = k; map.current.fitBounds(pts, {padding:[40,40], maxZoom:14}); }
  }, [JSON.stringify(reports.map(r => [r.id, r.lat, r.lng, r.priority, r.verification])), JSON.stringify(officers.map(o => [o.id, o.lat, o.lng])), JSON.stringify(rescuers.map(x => [x.id, x.lat, x.lng, x.live])), selectedId, JSON.stringify(line || null)]);
  const me = useRef(null);
  const locate = async () => { try { const p = await getPosition(); if (!map.current) return; if (me.current) me.current.remove(); me.current = L.circleMarker([p.lat, p.lng], {radius:8, color:'#fff', weight:3, fillColor:'#1D6FDB', fillOpacity:1}).addTo(map.current).bindTooltip('You are here (±' + Math.round(p.accuracy) + ' m)'); map.current.setView([p.lat, p.lng], 15); } catch (e) { alert(e.message); } };
  return <div><div className="mapbox"><div ref={el} style={{height}}/><button type="button" onClick={locate} title="Show my location" style={{position:'absolute',right:10,top:10,zIndex:500,background:'#fff',border:'1px solid #ccd',borderRadius:6,padding:'6px 9px',fontSize:16,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.25)'}}>📍</button></div></div>;
}
export const MapLegend = () => <div className="map-legend">
  <span><i style={{background:'#D92D20'}}/>Critical</span><span><i style={{background:'#FF5B14'}}/>High</span><span><i style={{background:'#D49A00'}}/>Medium</span><span><i style={{background:'#2E8B57'}}/>Low</span>
  <span><i style={{background:'#fff',border:'2px dashed #D49A00'}}/>Unverified</span><span>🛡️ Officer station</span><span>🚑 Rescuer (live GPS)</span></div>;