import { defineConfig } from "vitest/config";

// biome-ignore lint/correctness/noUnusedVariables: extends the `defineConfig` type with playwright types
type PlaywrightTypes = typeof import("@vitest/browser/providers/playwright");

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
			instances: [
				{
					browser: "chromium",
					headless: true,
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
