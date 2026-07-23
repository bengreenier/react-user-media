import { expect, test } from "vitest";
import { summarizeVideoFrame } from "./summary";

function fakeFrame(
  partial: Partial<VideoFrame> & {
    displayWidth: number;
    displayHeight: number;
    timestamp: number;
  },
): VideoFrame {
  return {
    format: "RGBA",
    codedWidth: partial.displayWidth,
    codedHeight: partial.displayHeight,
    ...partial,
    close() {},
  } as VideoFrame;
}

test("summarizeVideoFrame returns width height timestamp and format", () => {
  const result = summarizeVideoFrame(
    fakeFrame({
      displayWidth: 640,
      displayHeight: 360,
      timestamp: 1234,
      format: "RGBA",
    }),
  );

  expect(result).toMatchObject({
    width: 640,
    height: 360,
    timestamp: 1234,
    format: "RGBA",
  });
});
