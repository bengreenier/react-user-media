import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { AudioWorkletRpcSession } from "./session";

const { createSession } = vi.hoisted(() => ({
  createSession: vi.fn(),
}));

vi.mock("./session", () => ({
  createAudioWorkletRpcSession: createSession,
}));

import { useMediaAudioWorkletRpc } from "./hook";

test("does not recreate its session for equivalent inline options", async () => {
  const stream = {} as MediaStream;
  createSession.mockResolvedValue({
    api: {},
    dispose: vi.fn().mockResolvedValue(undefined),
  } satisfies AudioWorkletRpcSession);

  const { rerender } = renderHook(
    ({ workletModuleUrl }: { workletModuleUrl: string }) =>
      useMediaAudioWorkletRpc(stream, { workletModuleUrl }),
    { initialProps: { workletModuleUrl: "worklet.js" } },
  );

  await waitFor(() => {
    expect(createSession).toHaveBeenCalledTimes(1);
  });
  rerender({ workletModuleUrl: "worklet.js" });

  expect(createSession).toHaveBeenCalledTimes(1);
});
