import { badRequest } from './errors.js';

export function text(body, key, { label = key, min = 1, max = 200, optional = false } = {}) {
  const v = body?.[key];
  if (v === undefined || v === null || v === '') { if (optional) return ''; throw badRequest(`${label} is required.`); }
  const s = String(v).trim();
  if (s.length < min) throw badRequest(`${label} must be at least ${min} characters.`);
  if (s.length > max) throw badRequest(`${label} must be at most ${max} characters.`);
  return s;
}
export function oneOf(body, key, list, label = key) {
  const v = body?.[key];
  if (!list.includes(v)) throw badRequest(`Invalid ${label}.`);
  return v;
}
export function number(body, key, { label = key, min = -Infinity, max = Infinity, int = false, def } = {}) {
  let v = body?.[key];
  if ((v === undefined || v === null || v === '') && def !== undefined) return def;
  v = Number(v);
  if (!Number.isFinite(v) || v < min || v > max || (int && !Number.isInteger(v))) throw badRequest(`${label} is invalid.`);
  return v;
}
export function email(body, key = 'email') {
  const s = text(body, key, { label: 'Email', max: 120 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw badRequest('Email address is invalid.');
  return s;
}
export function coords(body) {
  return { lat: number(body, 'lat', { label: 'Latitude', min: -90, max: 90 }), lng: number(body, 'lng', { label: 'Longitude', min: -180, max: 180 }) };
}
