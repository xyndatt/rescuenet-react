// Creates (or links) an Administrator: a Firebase Authentication login with role "admin" + a record under admins/ in the database,
// so the database shows admins, officers and rescuers side by side. It does NOT touch reports, officers or rescuers.
//   npm --prefix server run admin                                  -> sets up the demo admin (admin@rescue.ph / admin123)
//   npm --prefix server run admin -- you@email.com Pass123 "Your Name"
import '../src/config.js';
import { auth, ref, clean } from '../src/firebase.js';
import { shortId } from '../src/services/accounts.js';

const [email = 'admin@rescue.ph', password = 'admin123', name = 'Admin'] = process.argv.slice(2);
if (password.length < 6) { console.error('Password must be at least 6 characters.'); process.exit(1); }

let user, created = false;
try { user = await auth.getUserByEmail(email); }
catch { user = await auth.createUser({ email, password, displayName: name }); created = true; }
await auth.setCustomUserClaims(user.uid, { role: 'admin' });
if (!created && (process.argv[4] || user.displayName === 'Dir. Elena Marquez')) { await auth.updateUser(user.uid, { displayName: name }); user.displayName = name; }   // rename an existing admin

const id = shortId('a', user.uid);
await ref(`admins/${id}`).update(clean({ id, uid: user.uid, name: user.displayName || name, title: 'Operations Administrator', email, createdAt: Date.now() }));
await ref('dmos').remove();                                   // leftover node from the removed DRRM role

console.log(`${created ? 'Created' : 'Updated existing'} administrator ${email}${created ? ' (password: ' + password + ')' : ' (password unchanged)'}\nSaved to admins/${id}.`);
process.exit(0);
