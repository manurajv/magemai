import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    fileParallelism: false,
    // The first callable on CI waits for a cold Functions emulator and can
    // pass Vitest's 5 second default. Later calls in the same run are fast.
    testTimeout: 20_000,
  },
});
