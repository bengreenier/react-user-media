export function getHostRefCallback<T extends HTMLElement>(
  element: T,
): (el: T | null) => void {
  const fiberKey = Object.keys(element).find((key) =>
    key.startsWith("__reactFiber"),
  );
  if (!fiberKey) {
    throw new Error("React fiber not found on element");
  }

  const fiber = (element as unknown as Record<string, unknown>)[fiberKey] as {
    ref?: (el: T | null) => void;
  };

  if (typeof fiber.ref !== "function") {
    throw new Error("Host ref callback not found on React fiber");
  }

  return fiber.ref;
}
