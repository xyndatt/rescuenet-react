import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getPosition } from '../useGeo';

// Click the map or press "Use my GPS" to choose a location.
export function LocationPicker({value, onChange, height = 260}) {
  const el = useRef(null), map = useRef(null), mk = useRef(null), cb = useRef(onChange);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [acc, setAcc] = useState(null);
  cb.current = onChange;
  const place = (lat, lng, pan) => {
    if (!map.current) return;
    if (!mk.current) mk.current = L.marker([lat, lng], {draggable: true}).addTo(map.current).on('dragend', e => { const p = e.target.getLatLng(); cb.current({lat: p.lat, lng: p.lng}); });
    else mk.current.setLatLng([lat, lng]);
    if (pan) map.current.setView([lat, lng], 16);
  };
  useEffect(() => {
    map.current = L.map(el.current).setView([value?.lat ?? 14.80, value?.lng ?? 120.92], value ? 16 : 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap'}).addTo(map.current);
    map.current.on('click', e => { place(e.latlng.lat, e.latlng.lng); cb.current({lat: e.latlng.lat, lng: e.latlng.lng}); });
    if (value) place(value.lat, value.lng);
    setTimeout(() => map.current && map.current.invalidateSize(), 250);
    return () => { map.current.remove(); map.current = null; mk.current = null; };
  }, []);
  const gps = async () => {
    setBusy(true); setErr('');
    try { const p = await getPosition(); setAcc(Math.round(p.accuracy)); place(p.lat, p.lng, true); onChange({lat: p.lat, lng: p.lng}); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return <div>
    <div className="row-flex" style={{marginBottom:8}}>
      <button type="button" className="btn btn-primary btn-sm" onClick={gps} disabled={busy}>{busy ? 'Locating…' : '📍 Use my GPS'}</button>
      <span className="hint">{value ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}${acc ? ` (±${acc} m)` : ''}` : 'or tap the map / drag the pin'}</span>
    </div>
    {err && <div className="err" style={{marginBottom:8}}>{err}</div>}
    <div className="mapbox"><div ref={el} style={{height}}/></div>
  </div>;
}
