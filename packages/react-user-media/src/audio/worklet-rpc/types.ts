/**
 * A summary emitted by an audio processor.
 *
 * This mirrors the public audio processing result shape so the RPC subpath can
 * remain independently consumable until the shared audio module is available.
 */
export type AudioProcessResult = {
  readonly rms: number;
  readonly peak: number;
  readonly timestamp: number;
};
