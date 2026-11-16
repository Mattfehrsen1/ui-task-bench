import path from 'node:path';
import { defineConfig } from 'vite';

// Dev server for browsing a submission: `npm run dev -- tasks/01-pricing-cards/reference`.
export default defineConfig({
  publicDir: path.join(import.meta.dirname, 'fonts'),
  server: { port: 5173 },
});
