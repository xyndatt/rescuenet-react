import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncH, badRequest } from '../errors.js';
import { text, email } from '../validate.js';
import { addDmo, removeDmo } from '../services/dmos.js';

const r = Router();
r.use(authenticate, requireRole('admin'));

r.post('/', asyncH(async (req, res) => {
  const b = req.body || {};
  const password = String(b.password || '');
  if (password.length < 6 || password.length > 100) throw badRequest('Password must be 6–100 characters.');
  const d = await addDmo({
    name: text(b, 'name', { label: 'Name', max: 80 }),
    title: text(b, 'title', { label: 'Position', max: 80, optional: true }),
    phone: text(b, 'phone', { label: 'Phone', max: 30, optional: true }),
    email: email(b), password
  });
  res.status(201).json({ id: d.id });
}));
r.delete('/:id', asyncH(async (req, res) => { await removeDmo(req.params.id); res.json({ ok: true }); }));

export default r;
