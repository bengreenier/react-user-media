import * as Comlink from "comlink";
import { createAudioWorkerApi } from "./audio-worker-api";

Comlink.expose(createAudioWorkerApi());
