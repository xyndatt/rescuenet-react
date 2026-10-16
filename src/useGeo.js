import { useEffect, useRef, useState } from 'react';

// One-shot GPS fix (for "Use my location")
export function getPosition(opts = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS is not supported on this device.'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy}),
      e => reject(new Error(e.code === 1 ? 'Location permission denied. Allow it in your browser settings.' : e.code === 3 ? 'GPS timed out. Try again.' : 'Could not get your location.')),
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 5000, ...opts});
  });
}

// Continuous GPS tracking. onFix is throttled (default 15 s, or when moved > 30 m).
// With {persistent: true} the watcher heals itself: it restarts after GPS errors, when the tab becomes visible again,
// when the connection returns, and it asks the browser to keep the screen awake so the phone does not suspend GPS.
export function useWatchPosition(enabled, onFix, {minMs = 15000, minMeters = 30, persistent = false} = {}) {
  const [state, setState] = useState({status: 'idle', pos: null, error: ''});
  const last = useRef({t: 0, lat: 0, lng: 0}), cb = useRef(onFix); cb.current = onFix;
  useEffect(() => {
    if (!enabled) { setState(s => ({...s, status: 'idle'})); return; }
    if (!navigator.geolocation) { setState({status: 'error', pos: null, error: 'GPS not supported'}); return; }
    let id = null, retry = null, wake = null, dead = false;
    const stop = () => { if (id !== null) { navigator.geolocation.clearWatch(id); id = null; } clearTimeout(retry); };
    const start = () => {
      stop(); if (dead) return;
      setState(s => ({...s, status: s.pos ? s.status : 'searching', error: ''}));
      id = navigator.geolocation.watchPosition(p => {
        const pos = {lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy};
        setState({status: 'live', pos, error: ''});
        const now = Date.now(), l = last.current;
        const moved = Math.hypot((pos.lat - l.lat) * 111320, (pos.lng - l.lng) * 111320 * Math.cos(pos.lat * Math.PI / 180));
        if (now - l.t > minMs || moved > minMeters) { last.current = {t: now, lat: pos.lat, lng: pos.lng}; cb.current && cb.current(pos); }
      }, e => {
        setState(s => ({status: 'error', pos: s.pos, error: e.code === 1 ? 'Location permission denied' : 'GPS unavailable'}));
        if (persistent) { stop(); retry = setTimeout(start, e.code === 1 ? 10000 : 3000); }   // keep trying; permission may be granted later
      }, {enableHighAccuracy: true, maximumAge: persistent ? 0 : 5000, timeout: 20000});
    };
    const holdAwake = async () => { try { if (persistent && 'wakeLock' in navigator && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch { /* not allowed: ignore */ } };
    const onVis = () => { if (document.visibilityState === 'visible') { start(); holdAwake(); } };
    start();
    if (persistent) { holdAwake(); document.addEventListener('visibilitychange', onVis); window.addEventListener('online', start); }
    return () => { dead = true; stop(); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', start); if (wake) wake.release().catch(() => {}); };
  }, [enabled]);
  return state;
}
