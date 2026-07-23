import "@testing-library/jest-dom";
import { userEvent } from "@vitest/browser/context";
import { render, screen, act, waitFor } from "@testing-library/react";
import {
  useMediaAudioDevices,
  useMediaAudioInputDevices,
  useMediaAudioOutputDevices,
  useMediaDevices,
  useMediaVideoDevices,
} from "../";

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

function DefaultOptionsDevicesTestComponent() {
  const { isLoading, isError, isReady, error, devices } = useMediaDevices();

  return (
    <pre data-testid="media-devices-status">
      {JSON.stringify({
        isLoading,
        isError,
        isReady,
        error: error?.message ?? null,
        deviceCount: devices?.length ?? null,
      } satisfies MediaDevicesStatus)}
    </pre>
  );
}

test("does not throw when mediaDevices is unavailable with default options", () => {
  const restoreMediaDevices = replaceMediaDevices(undefined);

  try {
    expect(() => render(<DefaultOptionsDevicesTestComponent />)).not.toThrow();

    expect(readStatus()).toEqual({
      isLoading: false,
      isError: false,
      isReady: false,
      error: null,
      deviceCount: null,
    });
  } finally {
    restoreMediaDevices();
  }
});

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

test("ignores stale enumerateDevices results after a newer request", async () => {
  const staleRequest = createDeferred<MediaDeviceInfo[]>();
  const latestRequest = createDeferred<MediaDeviceInfo[]>();
  const enumerateDevices = vi
    .fn()
    .mockReturnValueOnce(staleRequest.promise)
    .mockReturnValueOnce(latestRequest.promise);
  const restoreEnumerateDevices = replaceEnumerateDevices(enumerateDevices);

  try {
    render(<StatusDevicesTestComponent />);

    await userEvent.click(await screen.findByText("Begin Test"));
    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      latestRequest.resolve([
        {
          ...createMediaDeviceInfo(),
          deviceId: "latest",
          label: "Latest Camera",
        },
      ]);
      await latestRequest.promise;
    });

    expect(readStatus()).toEqual({
      isLoading: false,
      isError: false,
      isReady: true,
      error: null,
      deviceCount: 1,
    });
    expect(screen.getByTestId("media-devices-status")).toBeTruthy();

    await act(async () => {
      staleRequest.resolve([
        {
          ...createMediaDeviceInfo(),
          deviceId: "stale",
          label: "Stale Camera",
        },
        createMediaDeviceInfo(),
      ]);
      await staleRequest.promise;
    });

    expect(readStatus()).toEqual({
      isLoading: false,
      isError: false,
      isReady: true,
      error: null,
      deviceCount: 1,
    });
  } finally {
    restoreEnumerateDevices();
  }
});

test("re-requests devices when devicechange fires", async () => {
  const first = createDeferred<MediaDeviceInfo[]>();
  const second = createDeferred<MediaDeviceInfo[]>();
  const enumerateDevices = vi
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const restoreEnumerateDevices = replaceEnumerateDevices(enumerateDevices);

  try {
    function DeviceChangeComponent() {
      const { isReady, devices, request } = useMediaDevices({
        deviceChangedEvent: true,
      });

      return (
        <>
          <button onClick={() => act(() => request())}>Begin Test</button>
          <p data-testid="device-count">{devices?.length ?? "none"}</p>
          <p data-testid="ready">{String(isReady)}</p>
        </>
      );
    }

    render(<DeviceChangeComponent />);

    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      first.resolve([createMediaDeviceInfo()]);
      await first.promise;
    });

    expect(await screen.findByTestId("device-count")).toHaveTextContent("1");

    await act(async () => {
      navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
      second.resolve([createMediaDeviceInfo(), createMediaDeviceInfo()]);
      await second.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("device-count")).toHaveTextContent("2");
    });
    expect(enumerateDevices).toHaveBeenCalledTimes(2);
  } finally {
    restoreEnumerateDevices();
  }
});

function createDevice(kind: MediaDeviceInfo["kind"], label: string) {
  return {
    ...createMediaDeviceInfo(),
    deviceId: `${kind}-${label}`,
    kind,
    label,
  } as MediaDeviceInfo;
}

test("useMediaAudioDevices and useMediaVideoDevices filter by kind", async () => {
  const devicesRequest = createDeferred<MediaDeviceInfo[]>();
  const restoreEnumerateDevices = replaceEnumerateDevices(
    vi.fn(() => devicesRequest.promise),
  );

  try {
    function FilteredDevicesComponent() {
      const audio = useMediaAudioDevices({ deviceChangedEvent: false });
      const video = useMediaVideoDevices({ deviceChangedEvent: false });

      return (
        <>
          <button
            onClick={() =>
              act(() => {
                audio.request();
                video.request();
              })
            }
          >
            Begin Test
          </button>
          <p data-testid="audio-count">{audio.devices?.length ?? "none"}</p>
          <p data-testid="video-count">{video.devices?.length ?? "none"}</p>
        </>
      );
    }

    render(<FilteredDevicesComponent />);
    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      devicesRequest.resolve([
        createDevice("audioinput", "Mic"),
        createDevice("audiooutput", "Speakers"),
        createDevice("videoinput", "Camera"),
      ]);
      await devicesRequest.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("audio-count")).toHaveTextContent("2");
      expect(screen.getByTestId("video-count")).toHaveTextContent("1");
    });
  } finally {
    restoreEnumerateDevices();
  }
});

test("useMediaAudioInputDevices and useMediaAudioOutputDevices filter by kind", async () => {
  const devicesRequest = createDeferred<MediaDeviceInfo[]>();
  const restoreEnumerateDevices = replaceEnumerateDevices(
    vi.fn(() => devicesRequest.promise),
  );

  try {
    function FilteredIODevicesComponent() {
      const inputs = useMediaAudioInputDevices({ deviceChangedEvent: false });
      const outputs = useMediaAudioOutputDevices({
        deviceChangedEvent: false,
      });

      return (
        <>
          <button
            onClick={() =>
              act(() => {
                inputs.request();
                outputs.request();
              })
            }
          >
            Begin Test
          </button>
          <p data-testid="input-count">{inputs.devices?.length ?? "none"}</p>
          <p data-testid="output-count">{outputs.devices?.length ?? "none"}</p>
        </>
      );
    }

    render(<FilteredIODevicesComponent />);
    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      devicesRequest.resolve([
        createDevice("audioinput", "Mic"),
        createDevice("audiooutput", "Speakers"),
        createDevice("videoinput", "Camera"),
      ]);
      await devicesRequest.promise;
    });

    await waitFor(() => {
      expect(screen.getByTestId("input-count")).toHaveTextContent("1");
      expect(screen.getByTestId("output-count")).toHaveTextContent("1");
    });
  } finally {
    restoreEnumerateDevices();
  }
});

test("surfaces filter exceptions instead of staying loading", async () => {
  const devicesRequest = createDeferred<MediaDeviceInfo[]>();
  const restoreEnumerateDevices = replaceEnumerateDevices(
    vi.fn(() => devicesRequest.promise),
  );

  try {
    function ThrowingFilterComponent() {
      const { isLoading, isError, error, request } = useMediaDevices({
        deviceChangedEvent: false,
        filter() {
          throw new Error("filter failed");
        },
      });

      return (
        <>
          <button onClick={() => act(() => request())}>Begin Test</button>
          <pre data-testid="media-devices-status">
            {JSON.stringify({
              isLoading,
              isError,
              isReady: false,
              error: error?.message ?? null,
              deviceCount: null,
            } satisfies MediaDevicesStatus)}
          </pre>
        </>
      );
    }

    render(<ThrowingFilterComponent />);
    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      devicesRequest.resolve([createMediaDeviceInfo()]);
      await devicesRequest.promise;
    });

    await waitFor(() => {
      expect(readStatus()).toEqual({
        isLoading: false,
        isError: true,
        isReady: false,
        error: "filter failed",
        deviceCount: null,
      });
    });
  } finally {
    restoreEnumerateDevices();
  }
});

test("ignores stale enumerateDevices rejections after a newer request", async () => {
  const staleRequest = createDeferred<MediaDeviceInfo[]>();
  const latestRequest = createDeferred<MediaDeviceInfo[]>();
  const enumerateDevices = vi
    .fn()
    .mockReturnValueOnce(staleRequest.promise)
    .mockReturnValueOnce(latestRequest.promise);
  const restoreEnumerateDevices = replaceEnumerateDevices(enumerateDevices);

  try {
    render(<StatusDevicesTestComponent />);

    await userEvent.click(await screen.findByText("Begin Test"));
    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      latestRequest.resolve([createMediaDeviceInfo()]);
      await latestRequest.promise;
    });

    expect(readStatus()).toMatchObject({
      isLoading: false,
      isError: false,
      isReady: true,
      deviceCount: 1,
    });

    await act(async () => {
      staleRequest.reject(new Error("stale failure"));
      await staleRequest.promise.catch(() => undefined);
    });

    expect(readStatus()).toMatchObject({
      isLoading: false,
      isError: false,
      isReady: true,
      deviceCount: 1,
    });
  } finally {
    restoreEnumerateDevices();
  }
});

test("does not re-request when deviceChangedEvent is false", async () => {
  const first = createDeferred<MediaDeviceInfo[]>();
  const enumerateDevices = vi.fn(() => first.promise);
  const restoreEnumerateDevices = replaceEnumerateDevices(enumerateDevices);

  try {
    render(<StatusDevicesTestComponent />);

    await userEvent.click(await screen.findByText("Begin Test"));

    await act(async () => {
      first.resolve([createMediaDeviceInfo()]);
      await first.promise;
    });

    await act(async () => {
      navigator.mediaDevices.dispatchEvent(new Event("devicechange"));
    });

    expect(enumerateDevices).toHaveBeenCalledTimes(1);
  } finally {
    restoreEnumerateDevices();
  }
});

test("ignores enumerateDevices results after unmount", async () => {
  const devicesRequest = createDeferred<MediaDeviceInfo[]>();
  const restoreEnumerateDevices = replaceEnumerateDevices(
    vi.fn(() => devicesRequest.promise),
  );

  try {
    const { unmount } = render(<StatusDevicesTestComponent />);

    await userEvent.click(await screen.findByText("Begin Test"));
    unmount();

    await act(async () => {
      devicesRequest.resolve([createMediaDeviceInfo()]);
      await devicesRequest.promise;
    });
  } finally {
    restoreEnumerateDevices();
  }
});
