import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncH, forbidden } from '../errors.js';
import { coords, number } from '../validate.js';
import { ref } from '../firebase.js';
import { config } from '../config.js';
import { resetIncidents } from '../services/seed.js';
import { registerToken, unregisterToken } from '../services/push.js';
import { text } from '../validate.js';

const r = Router();
r.use(authenticate);

r.get('/me', (req, res) => res.json(req.user));

// Live GPS position of an officer or a rescuer (validated server-side, throttled per account)
const gpsLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, keyGenerator: req => req.user.uid, standardHeaders: true, legacyHeaders: false });
r.post('/location', requireRole('officer', 'rescuer'), gpsLimiter, asyncH(async (req, res) => {
  const { lat, lng } = coords(req.body);
  const accuracy = number(req.body, 'accuracy', { min: 0, max: 100000, def: 0 });
  const id = req.user.role === 'rescuer' ? req.user.rescuerId : req.user.officerId;
  await ref(`live/${id}`).set({ lat, lng, accuracy: Math.round(accuracy), at: Date.now(), role: req.user.role });
  res.json({ ok: true });
}));

// Browser push (FCM): register / remove this browser's token for the signed-in user
const pushKey = u => (u.role === 'admin' ? 'admin' : u.role === 'officer' ? u.officerId : u.role === 'rescuer' ? u.rescuerId : null);
r.post('/push/register', asyncH(async (req, res) => { const to = pushKey(req.user); if (to) await registerToken(to, text(req.body, 'token', { label: 'Token', min: 20, max: 4096 })); res.json({ ok: true }); }));
r.post('/push/unregister', asyncH(async (req, res) => { const to = pushKey(req.user); if (to) await unregisterToken(to, text(req.body, 'token', { label: 'Token', min: 20, max: 4096 })); res.json({ ok: true }); }));

// Admin: full data backup as JSON (photos and login accounts are not included; see README > Backups)
r.get('/admin/backup', requireRole('admin'), asyncH(async (_req, res) => {
  const data = {};
  for (const k of ['admins', 'officers', 'rescuers', 'reports', 'audit', 'notifs', 'meta']) data[k] = (await ref(k).get()).val() || {};
  res.setHeader('Content-Disposition', `attachment; filename="rescuenet-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ app: 'rescuenet', version: 1, createdAt: Date.now(), data });
}));

// Mark my notifications as read
r.post('/notifications/read', asyncH(async (req, res) => {
  const to = req.user.role === 'admin' ? 'admin' : req.user.role === 'officer' ? req.user.officerId : req.user.rescuerId;
  const snap = await ref('notifs').orderByChild('to').equalTo(to).get();
  const u = {}; snap.forEach(c => { if (!c.val().read) u[`notifs/${c.key}/read`] = true; });
  if (Object.keys(u).length) await ref().update(u);
  res.json({ updated: Object.keys(u).length });
}));

// DEMO ONLY: reset the incidents only (back to 4 default reports)
r.post('/admin/reset', requireRole('admin'), asyncH(async (_req, res) => {
  if (!config.demoMode) throw forbidden('Demo endpoints are disabled.');
  res.json(await resetIncidents());
}));

export default r;
