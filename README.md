
# RescueNet Command (Front End)

React + Vite. Login -> Admin Dashboard -> Disaster Officer Dashboard.

## Run
```
npm install
npm run dev:all
```
Open the link shown (usually http://localhost:5173).

## Demo accounts
- Admin: admin@rescue.ph / admin123

## Structure
- src/data.js            constants, helpers, seed (demo) data
- src/context.js         shared app context
- src/App.jsx            state + all actions (verify, assign, dispatch, backup...)
- src/components/        ui.jsx, MapView, Bell, Frame (sidebar+topbar), ReportInfo
- src/pages/             Login, AdminApp, OfficerApp
