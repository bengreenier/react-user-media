import { expose } from "comlink";
import type { AudioWorkletRpcApi } from "./controller";

/**
 * Attaches the control plane to an AudioWorkletNode MessagePort.
 *
 * `process()` does not participate in Comlink RPC: it remains a synchronous
 * call on the audio rendering thread.
 */
export function exposeWorkletRpc(
  api: AudioWorkletRpcApi,
  port: MessagePort,
): void {
  expose(api, port);
}
