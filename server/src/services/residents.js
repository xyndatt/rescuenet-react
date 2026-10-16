import { auth, ref, clean, toArr } from '../firebase.js';
import { config } from '../config.js';
import { notFound, forbidden } from '../errors.js';
import { newFx, note, audit, flush } from './effects.js';

// A resident is identified by their login (Firebase uid, when the mobile app sends a signed-in user's token) or, otherwise, by the phone number on the report.
const digits = v => String(v || '').replace(/\D/g, '');
export const residentKey = ({ uid, phone }) => (uid ? 'u' + uid : digits(phone).length >= 7 ? 'p' + digits(phone) : null);

export async function assertResidentValid(key) {
  if (!key) return;
  const s = await ref(`residents/${key}`).get();
  if (s.exists() && s.val().status === 'invalid') {
    throw forbidden('Your account has been marked INVALID because of false reports. You can no longer submit reports. Contact the disaster office if this is a mistake.');
  }
}

// Called after the admin marks a report as FALSE information.
export async function recordFalseReport(report) {
  const key = residentKey({ uid: report.reporterUid, phone: report.phone });
  if (!key) return null;
  const snap = await ref(`residents/${key}`).get();
  const cur = snap.val() || { key, uid: report.reporterUid || null, phone: report.phone || '', name: report.reporter || '', status: 'active', falseReports: [] };
  const list = [...new Set([...toArr(cur.falseReports), report.id])];
  const invalid = list.length >= config.falseReportLimit;
  const next = { ...cur, name: report.reporter || cur.name, falseReports: list, status: invalid ? 'invalid' : 'active', ...(invalid && cur.status !== 'invalid' ? { invalidAt: Date.now() } : {}) };
  await ref(`residents/${key}`).set(clean(next));
  if (invalid && cur.status !== 'invalid') {
    if (next.uid) await auth.updateUser(next.uid, { disabled: true }).catch(e => console.error('Could not disable login:', e.message));
    const fx = newFx();
    audit(fx, 'System', `Resident ${next.name || key} marked INVALID after ${list.length} false report(s)`, report.id);
    note(fx, 'admin', `Resident ${next.name || key} is now INVALID (${list.length} false report${list.length > 1 ? 's' : ''}).`, report.id, 'alert');
    await flush(fx);
  }
  return next;
}

export const listResidents = async () => toArr((await ref('residents').get()).val()).sort((a, b) => (b.invalidAt || 0) - (a.invalidAt || 0));

export async function reinstateResident(key) {
  const snap = await ref(`residents/${key}`).get();
  if (!snap.exists()) throw notFound('Resident not found.');
  const r = snap.val();
  await ref(`residents/${key}`).update({ status: 'active', falseReports: [], invalidAt: null });
  if (r.uid) await auth.updateUser(r.uid, { disabled: false }).catch(() => {});
  const fx = newFx(); audit(fx, 'Admin', `Reinstated resident ${r.name || key}`, null); await flush(fx);
}
