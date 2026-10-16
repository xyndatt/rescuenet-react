import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncH, badRequest } from '../errors.js';
import { text, oneOf, email } from '../validate.js';
import { MUNI, RANKS } from '../domain.js';
import { addOfficer, removeOfficer } from '../services/officers.js';

const r = Router();
r.use(authenticate, requireRole('admin'));

r.post('/', asyncH(async (req, res) => {
  const b = req.body || {};
  const password = String(b.password || '');
  if (password.length < 6 || password.length > 100) throw badRequest('Password must be 6–100 characters.');
  const o = await addOfficer({
    name: text(b, 'name', { label: 'Name', max: 80 }),
    rank: oneOf(b, 'rank', RANKS, 'rank'),
    muni: oneOf(b, 'muni', Object.keys(MUNI), 'municipality'),
    barangay: text(b, 'barangay', { label: 'Barangay', max: 80 }),
    phone: text(b, 'phone', { label: 'Phone', max: 30, optional: true }),
    email: email(b), password
  });
  res.status(201).json({ id: o.id });
}));
r.delete('/:id', asyncH(async (req, res) => { await removeOfficer(req.params.id); res.json({ ok: true }); }));

export default r;
