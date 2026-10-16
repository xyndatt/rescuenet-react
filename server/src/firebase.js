import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'node:fs';
import { config } from './config.js';

function credential() {
  if (config.credentialsJson) return admin.credential.cert(JSON.parse(config.credentialsJson));
  if (config.credentialsPath) return admin.credential.cert(JSON.parse(readFileSync(config.credentialsPath, 'utf8')));
  return admin.credential.applicationDefault();
}

admin.initializeApp({ credential: credential(), databaseURL: config.databaseURL, storageBucket: config.storageBucket });

export const db = admin.database();
export const auth = admin.auth();
export const ROOT = 'rescuenet';
export const ref = (path = '') => db.ref(path ? `${ROOT}/${path}` : ROOT);
export const pushId = () => db.ref().push().key;
// RTDB rejects `undefined`; a JSON round-trip strips it.
export const clean = o => JSON.parse(JSON.stringify(o));
export const toArr = v => (v ? (Array.isArray(v) ? v.filter(Boolean) : Object.values(v)) : []);
export const bucket = () => getStorage().bucket();
