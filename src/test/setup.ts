import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// Unit tests do not open a live project. Vitest injects the emulator flag
// so the client tests stay offline. A project id of `magemai` is not a
// failure by itself; rules tests and Playwright still refuse non-local hosts.
