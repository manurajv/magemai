import { describe, expect, it } from "vitest";
import { mapAuthError, PASSWORD_ACCOUNT_MESSAGE } from "@/lib/auth/errors";

describe("mapAuthError", () => {
  it("names the original password method and does not offer linking", () => {
    const message = mapAuthError({ code: "auth/account-exists-with-different-credential" });
    expect(message).toContain("password");
    expect(message.toLowerCase()).toContain("not linked");
  });

  it("uses one message for a bad email or password", () => {
    expect(mapAuthError({ code: "auth/invalid-credential" })).toBe(
      "Email or password is incorrect.",
    );
    expect(mapAuthError({ code: "auth/wrong-password" })).toBe("Email or password is incorrect.");
  });

  it("reads the blocking-function message when Firebase reports an internal error", () => {
    const message = mapAuthError(
      new Error(
        `Firebase: HTTP Cloud Function returned an error: ${PASSWORD_ACCOUNT_MESSAGE} (auth/internal-error).`,
      ),
    );
    expect(message).toContain("password");
    expect(message.toLowerCase()).toContain("not linked");
  });

  it("explains a short password and a duplicate email", () => {
    expect(mapAuthError({ code: "auth/weak-password" })).toContain("8 characters");
    expect(mapAuthError({ code: "auth/email-already-in-use" })).toContain("Sign in");
  });
});
