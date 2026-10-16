import '../src/config.js';
import { seedDatabase } from '../src/services/seed.js';

seedDatabase()
  .then(r => { console.log(`Done. Administrator + ${r.reports} starter reports. Login: admin@rescue.ph / admin123`); process.exit(0); })
  .catch(e => { console.error('Seed failed:', e); process.exit(1); });
