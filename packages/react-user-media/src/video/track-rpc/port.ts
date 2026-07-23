import { expose } from "comlink";
import type { VideoTrackRpcApi } from "./controller";

export function exposeTrackRpc(api: VideoTrackRpcApi, port: MessagePort): void {
  expose(api, port);
}
