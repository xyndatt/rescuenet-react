import { ref, pushId, clean } from '../firebase.js';
import { sendPush } from './push.js';

// Side effects (notifications + audit rows) collected while a report transaction runs,
// then written in ONE multi-path update after the transaction commits.
export const newFx = () => ({ notifs: [], audits: [] });
export const resetFx = fx => { fx.notifs.length = 0; fx.audits.length = 0; };
export function note(fx, to, text, reportId, kind = 'info') {
  fx.notifs.push({ id: pushId(), to, text, reportId, kind, at: Date.now(), read: false });
}
export function audit(fx, actor, action, reportId) {
  fx.audits.push({ id: pushId(), actor, action, reportId: reportId || null, at: Date.now() });
}
export async function flush(fx) {
  const u = {};
  fx.notifs.forEach(n => { u[`notifs/${n.id}`] = clean(n); });
  fx.audits.forEach(a => { u[`audit/${a.id}`] = clean(a); });
  if (Object.keys(u).length) await ref().update(u);
  if (fx.notifs.length) sendPush(fx.notifs).catch(e => console.error('Push failed:', e.message));   // not awaited on purpose
}
