import { auth, ref, toArr } from '../firebase.js';
import { conflict, badRequest } from '../errors.js';

// Creates a Firebase Auth login and attaches its role claims. Rolls back if the claims can't be set.
export async function createLogin({ email, password, name, claims }) {
  let user;
  try { user = await auth.createUser({ email, password, displayName: name }); }
  catch (e) {
    if (e.code === 'auth/email-already-exists') throw conflict('That email is already in use.');
    if (e.code === 'auth/invalid-password') throw badRequest('Password must be at least 6 characters.');
    throw e;
  }
  try { await auth.setCustomUserClaims(user.uid, claims); }
  catch (e) { await auth.deleteUser(user.uid).catch(() => {}); throw e; }
  return user;
}
export const deleteLogin = uid => (uid ? auth.deleteUser(uid).catch(e => { if (e.code !== 'auth/user-not-found') throw e; }) : Promise.resolve());
export const shortId = (prefix, key) => prefix + key.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, 'x');

// Phone numbers compare by their last 10 digits, so 0917 123 4567, +63 917 123 4567 and 09171234567 count as the same number.
export const phoneKey = v => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-10) : ''; };

// Throws 409 if another officer, rescuer or resident already uses this number. A blank number is allowed (the field is optional).
export async function assertPhoneFree(phone) {
  const k = phoneKey(phone);
  if (!k) return;
  const [officers, rescuers, residents] = await Promise.all(['officers', 'rescuers', 'residents'].map(async n => toArr((await ref(n).get()).val())));
  if ([...officers, ...rescuers, ...residents].some(x => phoneKey(x.phone) === k)) throw conflict('That mobile number is already registered to another account.');
}
