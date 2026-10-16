import { ref, pushId, clean, toArr } from '../firebase.js';
import { conflict, notFound, forbidden } from '../errors.js';
import { newFx, audit, flush } from './effects.js';
import { createLogin, deleteLogin, shortId, assertPhoneFree } from './accounts.js';

export const MAX_RESCUERS_PER_OFFICER = 30;
export const loadRescuers = async () => toArr((await ref('rescuers').get()).val());

// An officer creates a rescuer login that belongs to HIS barangay (taken from the officer record, never from the request).
export async function addRescuer(user, { name, phone, email, password, unit }) {
  const snap = await ref(`officers/${user.officerId}`).get();
  if (!snap.exists()) throw notFound('Officer record not found.');
  const off = snap.val();
  const mine = (await loadRescuers()).filter(r => r.officerId === off.id);
  if (mine.length >= MAX_RESCUERS_PER_OFFICER) throw conflict(`You can have at most ${MAX_RESCUERS_PER_OFFICER} rescuers.`);
  await assertPhoneFree(phone);
  const id = shortId('r', pushId());
  const login = await createLogin({ email, password, name, claims: { role: 'rescuer', rescuerId: id, officerId: off.id, unit } });
  try {
    const rescuer = { id, uid: login.uid, officerId: off.id, name, phone, email, unit, barangay: off.barangay || off.muni, muni: off.muni, createdAt: Date.now() };
    const fx = newFx(); audit(fx, off.name, `Added rescuer ${name} (${unit})`);
    await ref(`rescuers/${id}`).set(clean(rescuer));
    await flush(fx);
    return rescuer;
  } catch (e) { await deleteLogin(login.uid); throw e; }
}

// The owning officer (or an admin) can remove a rescuer; the login is deleted too.
export async function removeRescuer(user, id) {
  const snap = await ref(`rescuers/${id}`).get();
  if (!snap.exists()) throw notFound('Rescuer not found.');
  const r = snap.val();
  if (user.role === 'officer' && r.officerId !== user.officerId) throw forbidden('This rescuer belongs to another officer.');
  await deleteLogin(r.uid);
  const fx = newFx(); audit(fx, user.role === 'admin' ? 'Admin' : 'Officer', `Removed rescuer ${r.name}`);
  await ref().update({ [`rescuers/${id}`]: null, [`live/${id}`]: null });
  await flush(fx);
}
