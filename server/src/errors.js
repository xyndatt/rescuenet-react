import { config } from './config.js';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const badRequest = m => new HttpError(400, m);
export const unauthorized = m => new HttpError(401, m || 'Sign in required.');
export const forbidden = m => new HttpError(403, m || 'You are not allowed to do that.');
export const notFound = m => new HttpError(404, m || 'Not found.');
export const conflict = m => new HttpError(409, m);

export const asyncH = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const notFoundHandler = (_req, res) => res.status(404).json({ error: 'Route not found.' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `Each photo must be under ${Math.round(config.photoMaxBytes / 1024)} KB.` });
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'You can upload up to 4 photos at a time.' });
    return res.status(400).json({ error: 'Invalid upload.' });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ error: 'Server error.' });
}
