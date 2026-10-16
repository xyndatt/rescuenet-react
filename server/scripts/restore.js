// Restores a backup made with the Admin's "Download backup" button.
//   node scripts/restore.js path/to/rescuenet-backup-YYYY-MM-DD.json [--yes]
// Overwrites admins, officers, rescuers, reports, audit, notifs and meta in the database. Login accounts (Firebase Authentication) and photos are NOT part of the backup.
import '../src/config.js';
import { readFileSync } from 'node:fs';
import { ref } from '../src/firebase.js';

const [file, flag] = process.argv.slice(2);
if (!file) { console.error('Usage: node scripts/restore.js <backup.json> [--yes]'); process.exit(1); }
const b = JSON.parse(readFileSync(file, 'utf8'));
if (b.app !== 'rescuenet' || !b.data) { console.error('That file is not a RescueNet backup.'); process.exit(1); }
const counts = Object.entries(b.data).map(([k, v]) => `${k}: ${Object.keys(v).length}`).join(', ');
console.log('Backup from', new Date(b.createdAt).toLocaleString(), '\n ', counts);
if (flag !== '--yes') { console.log('\nThis will OVERWRITE the current database. Run again with --yes to continue.'); process.exit(0); }
await ref().update(b.data);
console.log('Restored.'); process.exit(0);
