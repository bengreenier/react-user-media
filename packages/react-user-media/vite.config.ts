import { defineConfig } from "vitest/config";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type PlaywrightTypes = typeof import("@vitest/browser/providers/playwright");
// only exists due to the playwright import above
type ProviderOptions = import("vitest/node").BrowserProviderOptions;

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
      name: "chromium",
      headless: true,
      providerOptions: {
        launch: {
          args: [
            "--auto-accept-camera-and-microphone-capture",
            "--use-fake-device-for-media-stream",
            "--no-user-gesture-required",
          ],
        },
      } satisfies ProviderOptions,
    },
  },
});
