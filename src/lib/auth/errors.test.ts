import { describe, expect, it } from "vitest";
import {
  mapAuthError,
  PASSWORD_ACCOUNT_MESSAGE,
  unexpectedCallableMessage,
  UNEXPECTED_CALLABLE_MESSAGE,
} from "@/lib/auth/errors";

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

  it("hides a raw internal callable failure", () => {
    expect(unexpectedCallableMessage({ code: "functions/internal", message: "INTERNAL" })).toBe(
      UNEXPECTED_CALLABLE_MESSAGE,
    );
    expect(unexpectedCallableMessage(new Error("INTERNAL [500]"))).toBe(
      UNEXPECTED_CALLABLE_MESSAGE,
    );
    expect(unexpectedCallableMessage({ code: "functions/permission-denied" })).toBeNull();
  });

  it("explains a short password and a duplicate email", () => {
    expect(mapAuthError({ code: "auth/weak-password" })).toContain("8 characters");
    expect(mapAuthError({ code: "auth/email-already-in-use" })).toContain("Sign in");
  });
});
