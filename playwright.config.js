import { defineConfig } from '@playwright/test';
const production = process.env.TEST_PRODUCTION === '1';
const baseURL = process.env.TEST_BASE_URL || (production ? 'http://127.0.0.1:4184' : 'http://127.0.0.1:5184');
export default defineConfig({
 testDir:'./tests', timeout:60000, workers:1,
 testIgnore: production ? '**/label-camera.spec.js' : undefined,
 use:{baseURL,headless:true},
 webServer:process.env.TEST_BASE_URL ? undefined : {
  command:production ? 'npm run preview -- --port 4184 --strictPort' : 'npm run dev -- --port 5184 --strictPort',
  url:baseURL,reuseExistingServer:!process.env.CI,
 },
});
