import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { db } from './firebase.js';
import { errorHandler, notFoundHandler } from './errors.js';
import reports from './routes/reports.js';
import officers from './routes/officers.js';
import rescuers from './routes/rescuers.js';
import residents from './routes/residents.js';
import me from './routes/me.js';

const app = express();
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.corsOrigins, methods: ['GET', 'POST', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'], maxAge: 600 }));
app.use(express.json({ limit: '20kb' }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

// tiny request log
app.use((req, res, next) => {
  const t = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t}ms`));
  next();
});

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: Math.round(process.uptime()) }));
app.get('/api/ready', async (_req, res) => {
  try { await db.ref('.info/serverTimeOffset').get(); res.json({ ready: true }); } catch { res.status(503).json({ ready: false }); }
});
app.use('/api/reports', reports);
app.use('/api/officers', officers);
app.use('/api/rescuers', rescuers);
app.use('/api/residents', residents);
app.use('/api', me);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => console.log(`RescueNet API on :${config.port} (${config.isProd ? 'production' : 'development'}${config.demoMode ? ', demo mode' : ''})`));
const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop); process.on('SIGINT', stop);
process.on('unhandledRejection', e => console.error('Unhandled rejection:', e));
