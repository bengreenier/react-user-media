import * as Comlink from "comlink";
import { createVideoWorkerApi } from "./video-worker-api";

Comlink.expose(createVideoWorkerApi());
