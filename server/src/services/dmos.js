import { ref, pushId, clean } from '../firebase.js';
import { notFound } from '../errors.js';
import { newFx, audit, flush } from './effects.js';
import { createLogin, deleteLogin, shortId } from './accounts.js';

// Disaster Management Officers: read-only analytics/report accounts, created by the Admin.
export async function addDmo({ name, title, phone, email, password }) {
  const id = shortId('d', pushId());
  const user = await createLogin({ email, password, name, claims: { role: 'dmo' } });
  try {
    const dmo = { id, uid: user.uid, name, title, phone, email, createdAt: Date.now() };
    const fx = newFx(); audit(fx, 'Admin', 'Added Disaster Management Officer ' + name);
    await ref(`dmos/${id}`).set(clean(dmo));
    await flush(fx);
    return dmo;
  } catch (e) { await deleteLogin(user.uid); throw e; }
}

export async function removeDmo(id) {
  const snap = await ref(`dmos/${id}`).get();
  if (!snap.exists()) throw notFound('Account not found.');
  const d = snap.val();
  await deleteLogin(d.uid);
  const fx = newFx(); audit(fx, 'Admin', 'Removed Disaster Management Officer ' + d.name);
  await ref(`dmos/${id}`).remove();
  await flush(fx);
}
