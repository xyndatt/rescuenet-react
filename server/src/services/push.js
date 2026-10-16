import { createHash } from 'node:crypto';
import { getMessaging } from 'firebase-admin/messaging';
import { ref } from '../firebase.js';

// Web push (Firebase Cloud Messaging). Tokens live under push/<recipient>/<hash>, recipient = 'admin' | officerId | rescuerId.
const key = token => createHash('sha1').update(token).digest('hex');
export const registerToken = (to, token) => ref(`push/${to}/${key(token)}`).set(token);
export const unregisterToken = (to, token) => ref(`push/${to}/${key(token)}`).remove();

const DEAD = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];

// Best effort: a failed push must never break the action that caused it.
export async function sendPush(notifs) {
  const byTo = {}; notifs.forEach(n => { (byTo[n.to] = byTo[n.to] || []).push(n); });
  for (const [to, list] of Object.entries(byTo)) {
    const snap = await ref(`push/${to}`).get(); const toks = snap.val();
    if (!toks) continue;
    const entries = Object.entries(toks);
    for (const n of list) {
      const res = await getMessaging().sendEachForMulticast({
        tokens: entries.map(e => e[1]),
        notification: { title: n.kind === 'alert' ? '🚨 RescueNet alert' : 'RescueNet', body: n.text.slice(0, 200) },
        data: { reportId: n.reportId || '' }
      });
      const dead = {}; res.responses.forEach((r, i) => { if (!r.success && DEAD.includes(r.error?.code)) dead[`push/${to}/${entries[i][0]}`] = null; });
      if (Object.keys(dead).length) await ref().update(dead);
    }
  }
}
