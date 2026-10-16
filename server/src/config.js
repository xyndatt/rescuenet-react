import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 4000,
  isProd: process.env.NODE_ENV === 'production',
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://rescuenet-650cf-default-rtdb.firebaseio.com',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'rescuenet-650cf.firebasestorage.app',
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  credentialsJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean),
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  // 'rtdb' (free Spark plan: photos stored in Realtime Database) or 'storage' (Firebase Storage, needs Blaze plan)
  photoDriver: process.env.PHOTO_STORAGE === 'storage' ? 'storage' : 'rtdb',
  photoMaxBytes: process.env.PHOTO_STORAGE === 'storage' ? 5 * 1024 * 1024 : 800 * 1024,
  demoMode: process.env.DEMO_MODE === 'true',
  // A resident whose reports are marked FALSE this many times becomes invalid (cannot report). Use 1 for "first false report = invalid".
  falseReportLimit: Math.max(1, Number(process.env.FALSE_REPORT_LIMIT) || 2)
};
