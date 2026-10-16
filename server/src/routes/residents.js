import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncH } from '../errors.js';
import { listResidents, reinstateResident } from '../services/residents.js';

const r = Router();
r.use(authenticate, requireRole('admin'));
r.get('/', asyncH(async (_req, res) => { res.json(await listResidents()); }));
r.post('/:key/reinstate', asyncH(async (req, res) => { await reinstateResident(String(req.params.key).slice(0, 140)); res.json({ ok: true }); }));
export default r;
