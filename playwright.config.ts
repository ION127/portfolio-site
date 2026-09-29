import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    // 설치된 Chrome을 쓴다. 브라우저를 따로 내려받지 않는다.
    channel: 'chrome',
  },
  projects: [
    { name: 'default', grepInvert: /@visual/ },
    { name: 'visual', grep: /@visual/ },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
