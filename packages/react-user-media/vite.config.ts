/// <reference types="@vitest/browser/providers/playwright" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
      clean: true,
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    },
    globals: true,
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    browser: {
      provider: "playwright",
      enabled: true,
      headless: true,
      instances: [
        {
          browser: "chromium",
          launch: {
            args: [
              "--auto-accept-camera-and-microphone-capture",
              "--use-fake-device-for-media-stream",
              "--no-user-gesture-required",
            ],
          },
        },
      ],
    },
  },
});
