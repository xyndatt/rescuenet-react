import { auth } from '../firebase.js';
import { asyncH, unauthorized, forbidden } from '../errors.js';

// Verifies the Firebase ID token (also checks the account was not disabled/deleted).
export const authenticate = asyncH(async (req, _res, next) => {
  const m = (req.headers.authorization || '').match(/^Bearer (.+)$/i);
  if (!m) throw unauthorized();
  let d;
  try { d = await auth.verifyIdToken(m[1], true); } catch { throw unauthorized('Session expired. Please sign in again.'); }
  if (!['admin', 'officer', 'rescuer'].includes(d.role)) throw forbidden('This account has no RescueNet role.');
  req.user = { uid: d.uid, email: d.email, name: d.name || '', role: d.role, officerId: d.officerId || null, rescuerId: d.rescuerId || null, unit: d.unit || null };
  next();
});

export const requireRole = (...roles) => (req, _res, next) => (roles.includes(req.user?.role) ? next() : next(forbidden()));
