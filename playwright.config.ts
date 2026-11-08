import { defineConfig } from '@playwright/test';

const api = 'http://127.0.0.1:3101';
const web = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './tests/browser',
  use: {
    baseURL: web,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 390, height: 844 },
  },
  webServer: [
    {
      command: 'npm run dev:api',
      env: { PORT: '3101', WEB_ORIGIN: web },
      url: `${api}/api/health`,
      timeout: 120_000,
    },
    {
      command: 'npm --workspace apps/web run dev -- --port 3100',
      env: { API_SERVER_URL: api },
      url: web,
      timeout: 120_000,
    },
  ],
});
