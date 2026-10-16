import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncH, badRequest, forbidden } from '../errors.js';
import { text, oneOf, number, coords } from '../validate.js';
import { TYPES, PRIORITIES, UNITS, PHOTOS_PER_UPLOAD } from '../domain.js';
import { config } from '../config.js';
import * as S from '../services/reports.js';
import { auth } from '../firebase.js';

const r = Router();
const admin = requireRole('admin'), officer = requireRole('officer');
// photos arrive as multipart/form-data (field name "photos"); JSON requests still work and just have no photos
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.photoMaxBytes, files: PHOTOS_PER_UPLOAD, fields: 20, fieldSize: 20 * 1024 } }).array('photos', PHOTOS_PER_UPLOAD);

// Public: residents / the mobile app. Strictly validated + rate limited.
const residentLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many reports. Please wait a few minutes.' } });
r.post('/', residentLimiter, upload, asyncH(async (req, res) => {
  const b = req.body || {};
  // Optional: a signed-in resident (mobile app sends the Firebase ID token). Disabled (invalid) accounts are refused here.
  let reporterUid = null;
  const tok = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
  if (tok) {
    try { reporterUid = (await auth.verifyIdToken(tok[1], true)).uid; }
    catch (e) { if (e.code === 'auth/user-disabled') throw forbidden('Your account has been marked INVALID because of false reports. You can no longer submit reports.'); }
  }
  const f = {
    type: oneOf(b, 'type', TYPES, 'disaster type'),
    reporter: text(b, 'reporter', { label: 'Name', max: 80 }),
    phone: text(b, 'phone', { label: 'Phone', max: 30, optional: true }),
    address: text(b, 'address', { label: 'Address', max: 160 }),
    desc: text(b, 'desc', { label: 'Description', max: 1000 }),
    people: number(b, 'people', { label: 'People affected', min: 1, max: 10000, int: true, def: 1 }),
    source: b.source === 'web' ? 'web' : 'mobile',
    ...coords(b)
  };
  res.status(201).json({ id: await S.createReport(f, req.files || [], reporterUid) });
}));

// Public: a reporter checks the status of their own report (ID + phone number must match)
const trackLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many lookups. Please wait a few minutes.' } });
r.get('/track/:id', trackLimiter, asyncH(async (req, res) => {
  res.json(await S.trackReport(String(req.params.id).slice(0, 30), String(req.query.phone || '').slice(0, 30)));
}));

// Everything below needs a signed-in admin / officer
r.use(authenticate);

r.post('/:id/photos', upload, asyncH(async (req, res) => { await S.addPhotos(req.params.id, req.user, req.files || []); res.status(201).json({ ok: true }); }));
r.delete('/:id/photos/:photoId', admin, asyncH(async (req, res) => { await S.deletePhoto(req.params.id, req.params.photoId); res.json({ ok: true }); }));

r.post('/:id/review', admin, asyncH(async (req, res) => { await S.startReview(req.params.id); res.json({ ok: true }); }));
r.post('/:id/verify', admin, asyncH(async (req, res) => {
  const ok = req.body?.ok === true;
  const reason = ok ? '' : text(req.body, 'reason', { label: 'Reason', min: 3, max: 300 });
  await S.verify(req.params.id, ok, reason); res.json({ ok: true });
}));
r.post('/:id/priority', admin, asyncH(async (req, res) => { await S.setPriority(req.params.id, oneOf(req.body, 'priority', PRIORITIES)); res.json({ ok: true }); }));
r.post('/:id/assign', admin, asyncH(async (req, res) => { await S.assign(req.params.id, text(req.body, 'officerId')); res.json({ ok: true }); }));
r.post('/:id/backup/assign', admin, asyncH(async (req, res) => { await S.assignBackup(req.params.id, text(req.body, 'officerId')); res.json({ ok: true }); }));
r.post('/:id/duplicate', admin, asyncH(async (req, res) => { await S.markDuplicate(req.params.id, text(req.body, 'of', { label: 'Original report', max: 30 })); res.json({ ok: true }); }));
r.post('/:id/cancel', admin, asyncH(async (req, res) => { await S.cancelReport(req.params.id, text(req.body, 'reason', { label: 'Reason', min: 3, max: 300 })); res.json({ ok: true }); }));
r.post('/:id/close', admin, asyncH(async (req, res) => { await S.close(req.params.id); res.json({ ok: true }); }));

r.post('/:id/dispatch', officer, asyncH(async (req, res) => {
  const units = Array.isArray(req.body?.units) ? [...new Set(req.body.units)] : [];
  if (!units.length || units.some(u => !UNITS.includes(u))) throw badRequest('Choose at least one valid team.');
  const note = text(req.body, 'text', { label: 'Instructions', max: 300, optional: true });
  await S.dispatch(req.params.id, req.user.officerId, units, note); res.json({ ok: true });
}));
r.post('/:id/backup/request', officer, asyncH(async (req, res) => {
  await S.requestBackup(req.params.id, req.user.officerId, text(req.body, 'reason', { label: 'Reason', max: 400 })); res.json({ ok: true });
}));
r.post('/:id/field', requireRole('rescuer'), asyncH(async (req, res) => {
  const action = oneOf(req.body, 'action', ['advance', 'complete', 'backup']);
  const rescued = action === 'complete' ? number(req.body, 'rescued', { label: 'People rescued', min: 0, max: 100000, int: true }) : 0;
  const notes = text(req.body, 'notes', { label: 'Notes', max: 300, optional: true });
  await S.fieldUpdate(req.params.id, req.user, action, { rescued, notes }); res.json({ ok: true });
}));
r.post('/:id/complete', officer, asyncH(async (req, res) => {
  await S.forwardCompletion(req.params.id, req.user.officerId, text(req.body, 'summary', { label: 'Summary', max: 1500 })); res.json({ ok: true });
}));

// DEMO ONLY: simulate the rescue-team mobile app
r.post('/:id/team-update', officer, asyncH(async (req, res) => {
  if (!config.demoMode) throw forbidden('Demo endpoints are disabled.');
  await S.teamUpdate(req.params.id, req.user.officerId, oneOf(req.body, 'action', ['advance', 'backup', 'complete'])); res.json({ ok: true });
}));

export default r;
