// Clean slate: deletes EVERY login except the admin, wipes the database, and leaves only the admin + 4 demo disaster reports.
//   cd server && npm run reset-minimal            (shows what will happen)
//   cd server && npm run reset-minimal -- --yes   (does it)
// Officers, rescuers, notifications, audit trail, live GPS and push tokens are removed. Photos in Storage are not touched.
import '../src/config.js';
import { auth, ref, clean } from '../src/firebase.js';

const { seed, ADMIN } = await import('../../src/data.js');
const KEEP = ['DR-2026-0101', 'DR-2026-0102', 'DR-2026-0103', 'DR-2026-0107'];   // Flood, Fire, Landslide, Storm

if (process.argv[2] !== '--yes') {
  console.log(`This will DELETE all logins except ${ADMIN.email} and ERASE the whole RescueNet database,\nthen add back only the admin and 4 new, unverified demo reports (${KEEP.join(', ')}).\n\nRun again with --yes to continue.`);
  process.exit(0);
}

// 1) Firebase Authentication: keep only the admin
let adminUid;
try { adminUid = (await auth.getUserByEmail(ADMIN.email)).uid; }
catch { adminUid = (await auth.createUser({ email: ADMIN.email, password: ADMIN.password, displayName: ADMIN.name })).uid; }
await auth.setCustomUserClaims(adminUid, { role: 'admin' });
let removed = 0, token;
do {
  const page = await auth.listUsers(1000, token);
  const uids = page.users.map(u => u.uid).filter(u => u !== adminUid);
  if (uids.length) { await auth.deleteUsers(uids); removed += uids.length; }
  token = page.pageToken;
} while (token);

// 2) Database: 4 brand-new reports (not verified, no priority, no officer, no team) + the admin record
const now = Date.now(), m = x => now - x * 60000;
const ago = { 'DR-2026-0101': 4, 'DR-2026-0102': 9, 'DR-2026-0103': 15, 'DR-2026-0107': 22 };   // minutes ago, so they look freshly submitted
const reports = seed().reports.filter(r => KEEP.includes(r.id)).map(r => ({
  id: r.id, type: r.type, reporter: r.reporter, phone: r.phone, address: r.address, lat: r.lat, lng: r.lng, people: r.people, desc: r.desc,
  source: 'mobile', createdAt: m(ago[r.id]), verification: 'pending', priority: null, status: 'Submitted', officerId: null,
  dispatches: [], backupAlert: null, backup: null, completion: null, forwarded: false, officerSummary: '', rejectReason: '', photos: [],
  timeline: [{ at: m(ago[r.id]), by: 'Resident (Mobile)', text: 'Report submitted with location' }]
}));
const notifs = Object.fromEntries(reports.map(r => { const id = 'n' + r.id.slice(-4); return [id, { id, to: 'admin', text: `${r.id} · New ${r.type} report from ${r.address}`, reportId: r.id, kind: 'info', at: r.createdAt, read: false }]; }));
const admins = { a1: { id: 'a1', uid: adminUid, name: ADMIN.name, title: ADMIN.title, email: ADMIN.email, createdAt: now } };
await ref().set(clean({ reports: Object.fromEntries(reports.map(r => [r.id, r])), notifs, admins, meta: { reportCounter: 103 } }));   // .set() replaces everything under rescuenet/

console.log(`Done. Removed ${removed} login(s). Left: admin (${ADMIN.email} / ${ADMIN.password}) and ${reports.length} new reports (pending verification).`);
process.exit(0);
