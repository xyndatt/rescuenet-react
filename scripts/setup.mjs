// One-step setup:  node scripts/setup.mjs      (or double-click setup.bat on Windows)
// Installs both the front end and the server, creates the .env files, and lists what is still missing.
import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skipInstall = process.argv.includes('--no-install');
const ok = m => console.log('  ✔ ' + m), todo = m => console.log('  ✖ ' + m);
const read = f => (existsSync(f) ? readFileSync(f, 'utf8') : '');
const val = (txt, key) => (txt.match(new RegExp('^' + key + '=(.*)$', 'm')) || [, ''])[1].split('#')[0].trim();

console.log('\nRescueNet setup\n');
const major = Number(process.versions.node.split('.')[0]);
if (major < 18) { console.error(`Node.js 18 or newer is required (you have ${process.versions.node}). Install it from https://nodejs.org and run this again.`); process.exit(1); }
ok('Node.js ' + process.versions.node);

// 1. .env files
for (const [dir, label] of [['', 'front end'], ['server', 'server']]) {
  const env = join(root, dir, '.env'), ex = join(root, dir, '.env.example');
  if (existsSync(env)) ok(`${label} .env already exists`);
  else if (existsSync(ex)) { copyFileSync(ex, env); ok(`created ${join(dir, '.env')} from the example`); }
}

// 2. install (root install also installs ./server through the "postinstall" script)
if (skipInstall) console.log('  - skipped npm install (--no-install)');
else {
  console.log('\nInstalling packages (this can take a few minutes)…\n');
  const r = spawnSync('npm', ['install'], { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) { console.error('\nnpm install failed. Check your internet connection and read the error above.'); process.exit(r.status || 1); }
  ok('packages installed (front end + server)');
}

// 3. what is still missing
console.log('\nStill to do by hand:');
const web = read(join(root, '.env')), srv = read(join(root, 'server', '.env')); let missing = 0;
const need = (cond, msg) => { if (!cond) { todo(msg); missing++; } };
need(val(web, 'VITE_FIREBASE_API_KEY'), 'Put VITE_FIREBASE_API_KEY in .env (Firebase console > Project settings > Your apps)');
need(val(web, 'VITE_FIREBASE_APP_ID'), 'Put VITE_FIREBASE_APP_ID in .env');
need(existsSync(join(root, 'server', 'serviceAccountKey.json')) || val(srv, 'FIREBASE_SERVICE_ACCOUNT_JSON'), 'Save your service-account key as server/serviceAccountKey.json (Project settings > Service accounts)');
if (!missing) ok('everything is configured');

console.log(`
Next steps:
  1. In the Firebase console: enable Authentication > Email/Password, and publish database.rules.json in Realtime Database > Rules.
  2. npm run seed       (creates the demo accounts + data; run it once)
  3. npm run dev:all    (starts the server AND the website)
  Open http://localhost:5173
`);
