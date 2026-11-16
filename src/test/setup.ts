import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

if (import.meta.env.VITE_ALLOW_LIVE_FIREBASE === "true") {
  throw new Error("Unit tests must not set VITE_ALLOW_LIVE_FIREBASE=true.");
}
if (import.meta.env.VITE_FIREBASE_PROJECT_ID === "magemai") {
  throw new Error("Unit tests must not use project id magemai.");
}
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS !== "true") {
  throw new Error("Unit tests must use the emulator branch.");
}
if (import.meta.env.VITE_FIREBASE_PROJECT_ID !== "demo-magemai") {
  throw new Error("Unit tests must use project id demo-magemai.");
}

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub;
}

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {};
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {};
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}
