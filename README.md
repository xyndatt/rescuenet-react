
# RescueNet Command (Front End)

React + Vite. Login -> Admin Dashboard -> Disaster Officer Dashboard.

## Run
```
npm install
npm run dev
```
Open the link shown (usually http://localhost:5173).

## Demo accounts
- Admin: admin@rescue.ph / admin123
- Officers and rescuers are NOT pre-created. The Administrator adds officers; officers add their own rescuers.

## Structure
- src/data.js            constants, helpers, seed (demo) data
- src/context.js         shared app context
- src/App.jsx            state + all actions (verify, assign, dispatch, backup...)
- src/components/        ui.jsx, MapView, Bell, Frame (sidebar+topbar), ReportInfo
- src/pages/             Login, AdminApp, OfficerApp

## Firebase + GPS + Backend

Map = Leaflet + OpenStreetMap (no Google Maps key needed).

### Architecture
```
React app ──read-only listeners──▶ Firebase Realtime Database  ◀──writes (Admin SDK)── Express API ◀── React app (fetch + ID token)
        └── sign in ──▶ Firebase Auth (roles are custom claims: admin | officer)
```
- **Clients never write to the database.** Every action (verify, assign, dispatch, ...) is an API call that the server validates against the caller's role, the report's current state and who it is assigned to.
- Each report change is an atomic per-record **transaction**, so two people acting at once can no longer overwrite each other.
- Officer passwords live only in Firebase Auth (no more plain text in the database).
- Database rules (`database.rules.json`) allow read-only access by role; notifications are only readable by their recipient.

### Quick setup (one step)
Windows: double-click **`setup.bat`**. Mac/Linux: `./setup.sh` (or `node scripts/setup.mjs` anywhere).
It installs the front end **and** the server, creates both `.env` files and tells you what is still missing. Then:
`npm run seed` (once) and `npm run dev:all` (starts the API and the website together).

### Roles
| Role | Created by | Can do |
|---|---|---|
| Admin | seed script | verify, prioritise, assign officers, add/remove officers (each with a **barangay**) |
| Officer | Admin | dispatch teams, request backup, forward completion, **create / remove rescuers in his own barangay**, and **download CSV / PDF disaster management reports** for the incidents assigned to him (no reporter names or phone numbers) |
| Resident | no web account | reports and tracks through the **mobile app** (in development); the API endpoints below are ready for it |
| Rescuer | their Officer | sees missions of his officer where his team (BFP / SRR / Ambulance) is dispatched; marks *on our way*, *on scene*, *mission completed* (people rescued), requests backup, adds photos |

Rescuer accounts are always placed in the creating officer's barangay (taken from the server, never from the request) and can only see that officer's reports. Removing an officer also removes his rescuers.

### Setup (manual steps)
1. Firebase console: enable **Authentication > Email/Password**; paste `database.rules.json` into the Realtime Database **Rules** tab (it changed when the DRRM role was removed, so re-publish it).
2. Front end: `npm install`, `cp .env.example .env`, fill `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_APP_ID` (Project settings > Your apps > Web).
3. Back end:
   ```
   cd server && npm install && cp .env.example .env
   # put serviceAccountKey.json in server/ (Project settings > Service accounts > Generate new private key)
   npm run seed     # creates the admin login (admin@rescue.ph / admin123) + 4 starter reports only
   npm run dev
   ```
4. Front end: `npm run dev`.

### Photos
Two modes, chosen by `PHOTO_STORAGE` in `server/.env`:
- **`rtdb` (default, free Spark plan):** photos are stored in the Realtime Database under `/rescuenet/photoData/<reportId>/<photoId>` (separate from the reports, so lists stay fast; a photo is downloaded only when you open the report). Max about 800 KB per photo, which is plenty after the automatic resize.
- **`storage` (needs the Blaze plan):** photos go to Firebase Storage using `storage.rules` and the bucket name in both `.env` files.

In both modes photos are resized in the browser (max 1280 px, JPEG), which also strips the phone's EXIF/GPS tags. The server re-checks the real file type from its bytes (JPEG / PNG / WebP only, 4 per upload, 12 per report). Residents attach photos when submitting (`multipart/form-data`, field `photos`); admins and the assigned / backup officer can add more from the report drawer; only admins can remove a photo. Only signed-in admins/officers can read photos.

### API (all under `/api`, `Authorization: Bearer <Firebase ID token>`)
| Method | Path | Who |
|---|---|---|
| POST | `/reports` | public (rate limited: 10 / 10 min / IP); JSON or multipart with `photos` |
| GET | `/reports/track/:id?phone=` | public (rate limited: 30 / 10 min / IP). Returns status only; ID and phone must match |
| POST | `/reports/:id/photos` | admin or assigned officer (multipart) |
| DELETE | `/reports/:id/photos/:photoId` | admin |
| POST | `/reports/:id/review` `verify` `priority` `assign` `backup/assign` `duplicate` `cancel` `close` | admin |
| POST | `/push/register` `/push/unregister` | any signed-in user (browser push token) |
| GET | `/admin/backup` | admin: full JSON backup |
| POST | `/reports/:id/dispatch` `backup/request` `complete` | assigned officer |
| POST | `/reports/:id/team-update` | officer, `DEMO_MODE` only |
| POST / DELETE | `/officers`, `/officers/:id` | admin (creates / removes the Auth login too; barangay required) |
| POST | `/rescuers` | officer (creates a rescuer in his barangay) |
| DELETE | `/rescuers/:id` | the owning officer, or admin |
| POST | `/reports/:id/field` | rescuer: `advance`, `complete` (+`rescued`), `backup` |
| POST | `/location` | officer live GPS (12 / min) |
| POST | `/notifications/read` | any signed-in user |
| POST | `/admin/reset` | admin, `DEMO_MODE` only |
| GET | `/me`, `/health`, `/ready` | signed-in / public |

Before production: set `DEMO_MODE=false`, `NODE_ENV=production`, `CORS_ORIGIN` to your site, `TRUST_PROXY=1` behind a proxy, and deploy the server with `FIREBASE_SERVICE_ACCOUNT_JSON` instead of a key file.
Note: `npm run seed` imports the demo data from `../src/data.js`, so run it from the full project.

### Push alerts (optional, Firebase Cloud Messaging)
Alerts also arrive when the tab is in the background. In the Firebase console open **Project settings > Cloud Messaging**, copy the **Sender ID**, and under *Web Push certificates* generate a key pair. Put them in `.env` as `VITE_FIREBASE_MESSAGING_SENDER_ID` and `VITE_FIREBASE_VAPID_KEY`, restart `npm run dev`, then click **Enable alerts** in the top bar (it only appears when both are set). Push needs HTTPS in production (localhost is fine for testing).

### Reports, PDF and CSV
Admins and Disaster Officers: **Reports & Statistics** has date / type / status / priority filters, **Download CSV** and **Download PDF** (a real PDF file made in the browser with jsPDF). Run `npm install` again after updating, since two packages were added (`jspdf`, `jspdf-autotable`).

### Duplicate and Cancelled reports
In a report's drawer the Admin can **Mark as duplicate** (pick the original) or **Cancel report** (with a reason) until a team is dispatched. Both leave the pending / active lists and keep their own status for statistics and the audit trail.

### Backups and disaster recovery
Admin: **Reports & Statistics > Backup data** downloads one JSON file (officers, rescuers, reports, audit, notifications, counters). Restore after data loss with `cd server && npm run restore -- ../rescuenet-backup-DATE.json` (add `--yes` to actually write). Photos and Firebase Authentication logins are not in that file: enable Realtime Database automatic backups / export in the Firebase console for those, and keep `server/serviceAccountKey.json` safe. Test a restore on a copy of the project before you rely on it.

### Web feature checklist (IT 305 spec)
Admin verifies, prioritises, assigns, marks duplicates / cancellations, generates reports and backs up data; Officer dispatches, reviews trends, the all-incidents map and the audit trail, and exports reports; Rescuer updates status and records outcomes. In-app and push notifications, audit trail, duplicate flagging, verified vs pending reports, live map and the 911 / no-guarantee warning are on the website. Residents use the **mobile app** (in development); the report and tracking API endpoints are ready for it.


## False reports and invalid residents
When the Admin marks a report as **False information**, it counts against the resident who sent it. The resident is identified by their signed-in app account (Firebase ID token sent with the report) or, if there is none, by the phone number on the report. After `FALSE_REPORT_LIMIT` false reports (default 2; set 1 for the first false report) the resident becomes **invalid**: new reports are refused, and an app account's Firebase login is disabled. Admin > **Invalid Residents** lists them and has a **Reinstate** button. Duplicate and cancelled reports do not count.
