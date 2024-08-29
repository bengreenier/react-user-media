import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    browser: {
      provider: "playwright",
      enabled: true,
      name: "chromium",
      headless: true,
      providerOptions: {
        args: [
          "--auto-accept-camera-and-microphone-capture",
          "--use-fake-ui-for-media-stream",
          "--use-fake-device-for-media-stream",
        ],
      },
    },
  },
});
