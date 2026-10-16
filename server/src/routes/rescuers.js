import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncH, badRequest } from '../errors.js';
import { text, oneOf, email } from '../validate.js';
import { UNITS } from '../domain.js';
import { addRescuer, removeRescuer } from '../services/rescuers.js';

const r = Router();
r.use(authenticate);

// Only a Disaster Officer can create rescuers (they join that officer's barangay)
r.post('/', requireRole('officer'), asyncH(async (req, res) => {
  const b = req.body || {};
  const password = String(b.password || '');
  if (password.length < 6 || password.length > 100) throw badRequest('Password must be 6–100 characters.');
  const x = await addRescuer(req.user, {
    name: text(b, 'name', { label: 'Name', max: 80 }),
    unit: oneOf(b, 'unit', UNITS, 'team'),
    phone: text(b, 'phone', { label: 'Phone', max: 30, optional: true }),
    email: email(b), password
  });
  res.status(201).json({ id: x.id });
}));
r.delete('/:id', requireRole('officer', 'admin'), asyncH(async (req, res) => { await removeRescuer(req.user, req.params.id); res.json({ ok: true }); }));

export default r;
