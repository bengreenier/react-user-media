import { proxy, releaseProxy, wrap } from "comlink";
import type { AudioProcessResult, AudioWorkletRpcApi } from "./controller";

export type {
  AudioProcessResult,
  AudioWorkletRpcApi,
  AudioWorkletRpcOptions,
} from "./controller";

export type AudioWorkletRpcSessionOptions = {
  audioContext?: AudioContext;
  createAudioContext?: () => AudioContext;
  createWorkletNode?: (
    context: AudioContext,
    processorName: string,
  ) => AudioWorkletNode;
  onResult?: (result: AudioProcessResult) => void;
  processorName?: string;
  workletModuleUrl?: URL | string;
};

export type AudioWorkletRpcSession = {
  api: AudioWorkletRpcApi;
  dispose(): Promise<void>;
};

const defaultProcessorName = "react-user-media-worklet-rpc";

export async function createAudioWorkletRpcSession(
  stream: MediaStream,
  options: AudioWorkletRpcSessionOptions = {},
): Promise<AudioWorkletRpcSession> {
  const ownsContext = !options.audioContext;
  const context =
    options.audioContext ??
    options.createAudioContext?.() ??
    new AudioContext();
  const processorName = options.processorName ?? defaultProcessorName;
  const moduleUrl =
    options.workletModuleUrl ?? new URL("./processor.js", import.meta.url);

  await context.audioWorklet.addModule(moduleUrl);
  const source = context.createMediaStreamSource(stream);
  const node =
    options.createWorkletNode?.(context, processorName) ??
    new AudioWorkletNode(context, processorName);
  const silentGain = context.createGain();
  silentGain.gain.value = 0;
  source.connect(node);
  node.connect(silentGain);
  silentGain.connect(context.destination);

  const api = wrap<AudioWorkletRpcApi>(node.port);
  if (options.onResult) {
    await api.subscribe(proxy(options.onResult));
  }

  let disposed = false;
  return {
    api,
    async dispose(): Promise<void> {
      if (disposed) {
        return;
      }
      disposed = true;
      try {
        await api.dispose();
      } finally {
        api[releaseProxy]();
        source.disconnect();
        node.disconnect();
        silentGain.disconnect();
        node.port.close();
        if (ownsContext) {
          await context.close();
        }
      }
    },
  };
}

export type { AudioWorkletRpcState } from "./hook";
export { useMediaAudioWorkletRpc } from "./hook";
