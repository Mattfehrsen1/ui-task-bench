import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const taskDir = process.env.GRADE_TASK_DIR;
const baseURL = process.env.GRADE_BASE_URL;
if (!taskDir || !baseURL) {
  throw new Error('Run the graders through `npm run grade -- <task> <dir>`.');
}

export default defineConfig({
  testDir: path.join(taskDir, 'tests'),
  // toHaveScreenshot('reference.png') compares against tasks/<task>/reference.png.
  snapshotPathTemplate: '{testDir}/../{arg}{ext}',
  outputDir: process.env.GRADE_OUTPUT_DIR,
  fullyParallel: true,
  workers: 4,
  retries: 0,
  timeout: 15_000,
  updateSnapshots: 'none',
  reporter: [['json']],
  expect: {
    timeout: 2_000,
    toHaveScreenshot: {
      threshold: 0.1,
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    actionTimeout: 2_000,
  },
});
