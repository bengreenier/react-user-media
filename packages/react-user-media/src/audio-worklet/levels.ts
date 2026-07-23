/**
 * Calculates a mixed RMS and peak value for the input channels in a render
 * quantum. Keeping this pure also makes synthetic frame testing possible.
 */
export function calculateAudioLevels(inputs: readonly Float32Array[][]): {
  rms: number;
  peak: number;
} {
  let sampleCount = 0;
  let sumOfSquares = 0;
  let peak = 0;

  for (const input of inputs) {
    for (const channel of input) {
      for (const sample of channel) {
        const magnitude = Math.abs(sample);
        sumOfSquares += sample * sample;
        peak = Math.max(peak, magnitude);
        sampleCount += 1;
      }
    }
  }

  return {
    rms: sampleCount === 0 ? 0 : Math.sqrt(sumOfSquares / sampleCount),
    peak,
  };
}
