import "@testing-library/jest-dom";
import { closeMedia, getSupportedConstraints } from "../";

test("closeMedia stops every track on the stream", () => {
  const stopA = vi.fn();
  const stopB = vi.fn();
  const media = {
    getTracks: () => [{ stop: stopA }, { stop: stopB }],
  } as unknown as MediaStream;

  closeMedia(media);

  expect(stopA).toHaveBeenCalledTimes(1);
  expect(stopB).toHaveBeenCalledTimes(1);
});

test("closeMedia accepts undefined without throwing", () => {
  expect(() => closeMedia(undefined)).not.toThrow();
});

test("getSupportedConstraints returns an object when mediaDevices is missing", () => {
  const prototype = Object.getPrototypeOf(navigator);
  const ownDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    "mediaDevices",
  );
  const prototypeDescriptor = Object.getOwnPropertyDescriptor(
    prototype,
    "mediaDevices",
  );
  const target = ownDescriptor ? navigator : prototype;
  const existingDescriptor = ownDescriptor ?? prototypeDescriptor;

  Object.defineProperty(target, "mediaDevices", {
    configurable: true,
    get() {
      return undefined;
    },
  });

  try {
    expect(getSupportedConstraints()).toEqual({});
  } finally {
    if (existingDescriptor) {
      Object.defineProperty(target, "mediaDevices", existingDescriptor);
    } else {
      Reflect.deleteProperty(target, "mediaDevices");
    }
  }
});

test("getSupportedConstraints returns an object when navigator is unavailable", () => {
  const existingNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: undefined,
  });

  try {
    expect(getSupportedConstraints()).toEqual({});
  } finally {
    if (existingNavigator) {
      Object.defineProperty(globalThis, "navigator", existingNavigator);
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
  }
});
