import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, onValue, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://rescuenet-650cf-default-rtdb.firebaseio.com',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rescuenet-650cf',
  appId: import.meta.env.VITE_FIREBASE_APP_ID
});

export { app };
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
const urlCache = new Map();
// Returns a displayable URL for a stored photo (cached). Needs a signed-in admin/officer per the rules.
//  "rtdb:<reportId>/<photoId>" -> read from the Realtime Database as a data: URL (free plan)
//  anything else               -> Firebase Storage download URL (Blaze plan, loaded only when needed)
export const photoUrl = path => {
  if (!urlCache.has(path)) {
    const p = path.startsWith('rtdb:')
      ? get(dbRef('photoData/' + path.slice(5))).then(s => { const v = s.val(); if (!v) throw new Error('missing'); return `data:${v.mime};base64,${v.data}`; })
      : import('firebase/storage').then(m => m.getDownloadURL(m.ref(m.getStorage(app), path)));
    urlCache.set(path, p.catch(e => { urlCache.delete(path); throw e; }));
  }
  return urlCache.get(path);
};

export const ROOT = 'rescuenet';
export const dbRef = p => ref(rtdb, p ? ROOT + '/' + p : ROOT);
export const connectedRef = () => ref(rtdb, '.info/connected');
export { get, onValue, query, orderByChild, equalTo, limitToLast };

// RTDB drops empty arrays and may hand arrays back as objects. Normalise.
export const toArr = v => (v ? (Array.isArray(v) ? v.filter(Boolean) : Object.values(v)) : []);
export const normReport = r => ({
  priority: null, officerId: null, backupAlert: null, backup: null, completion: null,
  forwarded: false, officerSummary: '', rejectReason: '', ...r, dispatches: toArr(r.dispatches), timeline: toArr(r.timeline), photos: toArr(r.photos)
});
