import "@testing-library/jest-dom";
import { userEvent } from "@vitest/browser/context";
import { render, screen, act, waitFor } from "@testing-library/react";
import { useMediaDevices } from "../";

function AllDevicesTestComponent() {
  const { isReady, devices, request } = useMediaDevices({
    deviceChangedEvent: false,
  });

  return (
    <>
      <button onClick={() => act(() => request())}>Begin Test</button>
      {isReady && (
        <ul data-testid="device-list">
          {devices.map((device) => (
            <li key={`${device.deviceId}-${device.label}-${device.kind}`}>
              {device.label} {device.kind}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

interface MediaDevicesStatus {
  isLoading: boolean;
  isError: boolean;
  isReady: boolean;
  error: string | null;
  deviceCount: number | null;
}

function StatusDevicesTestComponent() {
  const { isLoading, isError, isReady, error, devices, request } =
    useMediaDevices({
      deviceChangedEvent: false,
    });

  return (
    <>
      <button onClick={() => act(() => request())}>Begin Test</button>
      <pre data-testid="media-devices-status">
        {JSON.stringify({
          isLoading,
          isError,
          isReady,
          error: error?.message ?? null,
          deviceCount: devices?.length ?? null,
        } satisfies MediaDevicesStatus)}
      </pre>
    </>
  );
}

function readStatus() {
  return JSON.parse(
    screen.getByTestId("media-devices-status").textContent ?? "{}",
  ) as MediaDevicesStatus;
}

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

function createMediaDeviceInfo(): MediaDeviceInfo {
  return {
    deviceId: "device-id",
    groupId: "group-id",
    kind: "videoinput",
    label: "Camera",
    toJSON() {
      return this;
    },
  } as MediaDeviceInfo;
}

function replaceEnumerateDevices(
  enumerateDevices: MediaDevices["enumerateDevices"],
) {
  const existingDescriptor = Object.getOwnPropertyDescriptor(
    navigator.mediaDevices,
    "enumerateDevices",
  );

  Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
    configurable: true,
    value: enumerateDevices,
  });

  return function restoreEnumerateDevices() {
    if (existingDescriptor) {
      Object.defineProperty(
        navigator.mediaDevices,
        "enumerateDevices",
        existingDescriptor,
      );
    } else {
      Reflect.deleteProperty(navigator.mediaDevices, "enumerateDevices");
    }
  };
}

function replaceMediaDevices(mediaDevices: MediaDevices | undefined) {
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
      return mediaDevices;
    },
  });

  return function restoreMediaDevices() {
    if (existingDescriptor) {
      Object.defineProperty(target, "mediaDevices", existingDescriptor);
    } else {
      Reflect.deleteProperty(target, "mediaDevices");
    }
  };
}

test("surfaces an error when mediaDevices is unavailable", async () => {
  const restoreMediaDevices = replaceMediaDevices(undefined);

  try {
    render(<StatusDevicesTestComponent />);

    await userEvent.click(await screen.findByText("Begin Test"));

    await waitFor(() => {
      expect(readStatus()).toEqual({
        isLoading: false,
        isError: true,
        isReady: false,
        error: "enumerateDevices is not available. Are you in a secure context?",
        deviceCount: null,
      });
    });
  } finally {
    restoreMediaDevices();
  }
});

test("enumerates media devices", async () => {
  const devicesRequest = createDeferred<MediaDeviceInfo[]>();
  const restoreEnumerateDevices = replaceEnumerateDevices(
    vi.fn(() => devicesRequest.promise),
  );

  try {
    render(<AllDevicesTestComponent />);

    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      devicesRequest.resolve([createMediaDeviceInfo()]);
      await devicesRequest.promise;
    });

    const list = await screen.findByTestId<HTMLUListElement>("device-list");

    expect(list.children.length).toBe(1);
    expect(list).toHaveTextContent("Camera videoinput");
  } finally {
    restoreEnumerateDevices();
  }
});

test("starts idle before requesting media devices", () => {
  render(<StatusDevicesTestComponent />);

  expect(readStatus()).toEqual({
    isLoading: false,
    isError: false,
    isReady: false,
    error: null,
    deviceCount: null,
  });
});

test("clears loading when media devices are ready", async () => {
  const devicesRequest = createDeferred<MediaDeviceInfo[]>();
  const restoreEnumerateDevices = replaceEnumerateDevices(
    vi.fn(() => devicesRequest.promise),
  );

  try {
    render(<StatusDevicesTestComponent />);

    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      devicesRequest.resolve([createMediaDeviceInfo()]);
      await devicesRequest.promise;
    });

    expect(readStatus()).toEqual({
      isLoading: false,
      isError: false,
      isReady: true,
      error: null,
      deviceCount: expect.any(Number),
    });
  } finally {
    restoreEnumerateDevices();
  }
});

test("clears loading when requesting media devices fails", async () => {
  const requestError = new Error("enumerate failed");
  const devicesRequest = createDeferred<MediaDeviceInfo[]>();
  const restoreEnumerateDevices = replaceEnumerateDevices(
    vi.fn(() => devicesRequest.promise),
  );

  try {
    render(<StatusDevicesTestComponent />);

    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      devicesRequest.reject(requestError);
      await devicesRequest.promise.catch(() => undefined);
    });

    expect(readStatus()).toEqual({
      isLoading: false,
      isError: true,
      isReady: false,
      error: requestError.message,
      deviceCount: null,
    });
  } finally {
    restoreEnumerateDevices();
  }
});
