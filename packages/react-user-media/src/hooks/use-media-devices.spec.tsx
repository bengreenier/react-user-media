import "@testing-library/jest-dom";
import { userEvent } from "@vitest/browser/context";
import { render, screen, act } from "@testing-library/react";
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

test("enumerates media devices", async () => {
  render(<AllDevicesTestComponent />);

  await userEvent.click(await screen.findByText("Begin Test"));

  const list = await screen.findByTestId<HTMLUListElement>("device-list");

  expect(list.children.length).toBeGreaterThan(0);
});
