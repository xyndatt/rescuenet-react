import { ref, pushId, clean, toArr } from '../firebase.js';
import { MUNI, isActive } from '../domain.js';
import { conflict, notFound } from '../errors.js';
import { newFx, audit, flush } from './effects.js';
import { normalizeReport } from './reports.js';
import { createLogin, deleteLogin, shortId, assertPhoneFree } from './accounts.js';
import { loadRescuers } from './rescuers.js';

export async function addOfficer({ name, rank, muni, barangay, phone, email, password }) {
  await assertPhoneFree(phone);
  const id = shortId('o', pushId());
  const user = await createLogin({ email, password, name, claims: { role: 'officer', officerId: id } });
  try {
    const [lat, lng] = MUNI[muni];
    const officer = { id, uid: user.uid, name, rank, station: muni + ' Rescue Station', muni, barangay, lat, lng, phone, email };
    const fx = newFx(); audit(fx, 'Admin', 'Added officer ' + name);
    await ref(`officers/${id}`).set(clean(officer));
    await flush(fx);
    return officer;
  } catch (e) { await deleteLogin(user.uid); throw e; } // don't leave an orphan login
}

export async function removeOfficer(id) {
  const snap = await ref(`officers/${id}`).get();
  if (!snap.exists()) throw notFound('Officer not found.');
  const o = snap.val();
  const reports = toArr((await ref('reports').get()).val()).map(normalizeReport);
  const busy = reports.filter(r => isActive(r) && (r.officerId === id || (r.backup?.status === 'assigned' && r.backup.officerId === id)));
  if (busy.length) throw conflict(`${o.name} still has ${busy.length} active task(s). Reassign them first.`);
  const rescuers = (await loadRescuers()).filter(r => r.officerId === id);   // their rescuers go with them
  await Promise.all([deleteLogin(o.uid), ...rescuers.map(r => deleteLogin(r.uid))]);
  const fx = newFx(); audit(fx, 'Admin', 'Removed officer ' + o.name);
  const u = { [`officers/${id}`]: null, [`live/${id}`]: null };
  rescuers.forEach(r => { u[`rescuers/${r.id}`] = null; u[`live/${r.id}`] = null; });
  await ref().update(u);
  await flush(fx);
}
