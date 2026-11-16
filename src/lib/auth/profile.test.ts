import { describe, expect, it } from "vitest";
import { avatarRejection } from "@/lib/auth/profile";

describe("avatarRejection", () => {
  it("accepts a small PNG and rejects the wrong type or an oversized file", () => {
    expect(avatarRejection(new File([new Uint8Array([1])], "a.png", { type: "image/png" }))).toBe(
      null,
    );
    expect(avatarRejection(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(/JPEG/);
    expect(
      avatarRejection(
        new File([new Uint8Array(2 * 1024 * 1024 + 1)], "a.png", { type: "image/png" }),
      ),
    ).toMatch(/2 MB/);
  });
});
