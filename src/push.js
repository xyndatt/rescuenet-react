import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from './firebase';
import { api } from './api';

const VAPID = import.meta.env.VITE_FIREBASE_VAPID_KEY, SENDER = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const KEY = 'rn-push-token';

// Browser push is optional: it needs a VAPID key + sender id in .env (see README). Returns false when not configured / unsupported.
export const pushConfigured = () => !!(VAPID && SENDER && 'serviceWorker' in navigator && 'Notification' in window);

export async function enablePush() {
  if (!pushConfigured() || !(await isSupported())) throw new Error('Push alerts are not available in this browser or not configured.');
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications were blocked. Allow them in your browser settings.');
  const qs = new URLSearchParams({ apiKey: import.meta.env.VITE_FIREBASE_API_KEY, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rescuenet-650cf', senderId: SENDER, appId: import.meta.env.VITE_FIREBASE_APP_ID });
  const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js?' + qs);
  const token = await getToken(getMessaging(app), { vapidKey: VAPID, serviceWorkerRegistration: sw });
  if (!token) throw new Error('Could not get a push token.');
  await api('/push/register', { body: { token } }); localStorage.setItem(KEY, token);
}
// Called on logout so the next person on this browser does not receive this user's alerts
export async function disablePush() {
  const token = localStorage.getItem(KEY); if (!token) return;
  localStorage.removeItem(KEY); await api('/push/unregister', { body: { token } }).catch(() => {});
}
export const pushEnabled = () => !!localStorage.getItem(KEY) && typeof Notification !== 'undefined' && Notification.permission === 'granted';
