import { expect, test } from "vitest";
import { calculateAudioLevels } from "./levels";

test("calculates mixed RMS and peak from input channels", () => {
  const result = calculateAudioLevels([
    [new Float32Array([0, 1, -0.5])],
    [new Float32Array([0.5, -1])],
  ]);

  expect(result.rms).toBeCloseTo(Math.sqrt(2.5 / 5));
  expect(result.peak).toBe(1);
});

test("reports silent levels when the worklet has no input frames", () => {
  expect(calculateAudioLevels([])).toEqual({ rms: 0, peak: 0 });
});
