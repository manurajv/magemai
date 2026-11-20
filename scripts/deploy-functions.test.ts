import { describe, expect, it } from "vitest";
import { withDiscoveryTimeout } from "./deploy-functions.ts";

describe("functions deploy timeout", () => {
  it("sets FUNCTIONS_DISCOVERY_TIMEOUT to 60 seconds", () => {
    expect(withDiscoveryTimeout({}).FUNCTIONS_DISCOVERY_TIMEOUT).toBe("60");
    expect(
      withDiscoveryTimeout({ FUNCTIONS_DISCOVERY_TIMEOUT: "10" }).FUNCTIONS_DISCOVERY_TIMEOUT,
    ).toBe("60");
  });

  it("keeps a longer timeout already set in the environment", () => {
    expect(
      withDiscoveryTimeout({ FUNCTIONS_DISCOVERY_TIMEOUT: "120" }).FUNCTIONS_DISCOVERY_TIMEOUT,
    ).toBe("120");
  });
});
