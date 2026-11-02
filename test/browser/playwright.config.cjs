'use strict';
const {defineConfig} = require('@playwright/test');
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: '**/*.spec.cjs',
  timeout: 45000,
  expect: {timeout: 10000},
  fullyParallel: false,
  workers: 2,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  outputDir: 'test-results',
  reporter: [['list'], ['html', {outputFolder: 'playwright-report', open: 'never'}], ['json', {outputFile: 'browser-results.json'}]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: {width: 1440, height: 900},
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {name: 'chromium', use: {browserName: 'chromium'}},
    {name: 'webkit', use: {browserName: 'webkit'}}
  ],
  webServer: {
    command: 'node serve.cjs',
    url: 'http://127.0.0.1:4173/access/',
    reuseExistingServer: false,
    timeout: 10000
  }
});
