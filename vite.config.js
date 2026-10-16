import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// jspdf is loaded lazily (only when a PDF is downloaded). Pre-bundling it at start-up stops the
// "Failed to fetch dynamically imported module .../.vite/deps/jspdf.js" error after a fresh npm install.
export default defineConfig({ plugins: [react()], optimizeDeps: { include: ['jspdf', 'jspdf-autotable'] } });
