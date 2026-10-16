import { auth } from './firebase';

export const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const BASE = API_ORIGIN + '/api';

// Calls the RescueNet backend. Sends the Firebase ID token unless `token: false` (public endpoints).
export async function api(path, { method = 'POST', body, token = true } = {}) {
  const form = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = form ? {} : { 'Content-Type': 'application/json' };
  if (token) {
    const u = auth.currentUser;
    if (!u) throw new Error('Please sign in again.');
    headers.Authorization = 'Bearer ' + await u.getIdToken();
  }
  let res;
  try { res = await fetch(BASE + path, { method, headers, body: body ? (form ? body : JSON.stringify(body)) : undefined }); }
  catch { throw new Error('The RescueNet server is not running or not reachable (' + API_ORIGIN + ').'); }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
