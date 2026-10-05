import { defineConfig } from "../../node_modules/@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: "http://localhost:8091",
    channel: "chrome",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node node_modules/expo/bin/cli start --web --port 8091",
    cwd: __dirname,
    env: {
      EXPO_NO_TELEMETRY: "1",
      __UNSAFE_EXPO_HOME_DIRECTORY: process.env.TEMP + "/uangkita-expo-home",
      CI: "1",
    },
    url: "http://localhost:8091",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
