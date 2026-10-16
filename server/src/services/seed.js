import { auth, ref, clean } from '../firebase.js';

// Sets up ONLY the administrator login + the 4 starter incident reports. No demo officers or rescuers are created.
export async function seedDatabase() {
  const { seed, ADMIN } = await import('../../../src/data.js');
  const s = seed();
  let u;
  try { u = await auth.getUserByEmail(ADMIN.email); }
  catch { u = await auth.createUser({ email: ADMIN.email, password: ADMIN.password, displayName: ADMIN.name }); }
  await auth.setCustomUserClaims(u.uid, { role: 'admin' });
  const admins = { a1: { id: 'a1', uid: u.uid, name: ADMIN.name, title: ADMIN.title, email: ADMIN.email, createdAt: Date.now() } };
  const byId = a => Object.fromEntries(a.map(x => [x.id, x]));
  await ref().update({
    officers: null, rescuers: null, dmos: null, audit: null, live: null,
    reports: clean(byId(s.reports)), notifs: clean(byId(s.notifs)), admins: clean(admins), 'meta/reportCounter': 103
  });
  return { officers: 0, reports: s.reports.length };
}

// DEMO ONLY: reset ONLY the incidents. Officers, rescuers, residents, admin and all logins are left untouched.
// Leaves 4 fresh, unverified reports (Flood, Fire, Landslide, Storm) and clears the notifications that pointed at the old incidents.
const KEEP = ['DR-2026-0101', 'DR-2026-0102', 'DR-2026-0103', 'DR-2026-0107'];
const AGO = { 'DR-2026-0101': 4, 'DR-2026-0102': 9, 'DR-2026-0103': 15, 'DR-2026-0107': 22 };   // minutes ago
export async function resetIncidents() {
  const { seed } = await import('../../../src/data.js');
  const now = Date.now(), m = x => now - x * 60000;
  const reports = seed().reports.filter(r => KEEP.includes(r.id)).map(r => ({
    id: r.id, type: r.type, reporter: r.reporter, phone: r.phone, address: r.address, lat: r.lat, lng: r.lng, people: r.people, desc: r.desc,
    source: 'mobile', createdAt: m(AGO[r.id]), verification: 'pending', priority: null, status: 'Submitted', officerId: null,
    dispatches: [], backupAlert: null, backup: null, completion: null, forwarded: false, officerSummary: '', rejectReason: '', photos: [],
    timeline: [{ at: m(AGO[r.id]), by: 'Resident (Mobile)', text: 'Report submitted with location' }]
  }));
  const notifs = Object.fromEntries(reports.map(r => { const id = 'n' + r.id.slice(-4); return [id, { id, to: 'admin', text: `${r.id} · New ${r.type} report from ${r.address}`, reportId: r.id, kind: 'info', at: r.createdAt, read: false }]; }));
  await ref().update({ reports: clean(Object.fromEntries(reports.map(r => [r.id, r]))), notifs: clean(notifs), 'meta/reportCounter': 103 });
  return { reports: reports.length };
}
