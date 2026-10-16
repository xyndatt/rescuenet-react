import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
const missing = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_APP_ID'].filter(k => !String(import.meta.env[k] || '').trim());

if (missing.length) {
  // Show a readable message instead of a blank page
  root.render(<div style={{maxWidth:640,margin:'60px auto',padding:24,fontFamily:'system-ui,sans-serif',lineHeight:1.5}}>
    <h2 style={{color:'#D92D20'}}>Firebase is not configured yet</h2>
    <p>These values are missing in the <b>.env</b> file in the project's main folder (next to <code>package.json</code>):</p>
    <ul>{missing.map(k => <li key={k}><code>{k}</code></li>)}</ul>
    <p>Get them in the Firebase console: <b>Project settings → General → Your apps → Web app</b> (<code>apiKey</code> and <code>appId</code>).</p>
    <p>Then <b>stop the dev server (Ctrl+C) and start it again</b> — Vite only reads <code>.env</code> when it starts.</p>
  </div>);
} else {
  import('./App').then(m => root.render(<m.default />));
}
