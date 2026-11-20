import { describe, expect, it, vi } from "vitest";
import {
  EMAIL_VERIFIED_MESSAGE,
  emailVerificationSettings,
  finishEmailVerification,
} from "@/lib/auth/email-link";

function user(verified: boolean) {
  const record = {
    emailVerified: verified,
    reload: vi.fn(async () => undefined),
    getIdToken: vi.fn(async () => "token"),
  };
  return record;
}

describe("email verification link", () => {
  it("continues to this app after Firebase's hosted handler", () => {
    expect(emailVerificationSettings("https://magemai.web.app")).toEqual({
      url: "https://magemai.web.app/auth/action?flow=verifyEmail",
      handleCodeInApp: false,
    });
  });

  it("applies the code, refreshes the token, and enters the app when signed in", async () => {
    const current = user(false);
    current.reload.mockImplementation(async () => {
      current.emailVerified = true;
    });
    const applyCode = vi.fn(async () => undefined);
    const outcome = await finishEmailVerification({
      mode: "verifyEmail",
      code: "oob",
      flow: null,
      applyCode,
      currentUser: () => current,
    });
    expect(outcome).toBe("app");
    expect(applyCode).toHaveBeenCalledWith("oob");
    expect(current.getIdToken).toHaveBeenCalledWith(true);
    expect(EMAIL_VERIFIED_MESSAGE).toBe("Email verified");
  });

  it("sends a signed-out person to sign in after the code is applied", async () => {
    const applyCode = vi.fn(async () => undefined);
    const outcome = await finishEmailVerification({
      mode: "verifyEmail",
      code: "oob",
      flow: null,
      applyCode,
      currentUser: () => null,
    });
    expect(outcome).toBe("sign-in");
    expect(applyCode).toHaveBeenCalledOnce();
  });

  it("reloads a signed-in person when the hosted handler already consumed the code", async () => {
    const current = user(true);
    const applyCode = vi.fn();
    const outcome = await finishEmailVerification({
      mode: null,
      code: null,
      flow: "verifyEmail",
      applyCode,
      currentUser: () => current,
    });
    expect(outcome).toBe("app");
    expect(applyCode).not.toHaveBeenCalled();
    expect(current.reload).toHaveBeenCalledOnce();
    expect(current.getIdToken).toHaveBeenCalledWith(true);
  });

  it("leaves an unrelated visit incomplete", async () => {
    const outcome = await finishEmailVerification({
      mode: null,
      code: null,
      flow: null,
      applyCode: vi.fn(),
      currentUser: () => null,
    });
    expect(outcome).toBe("incomplete");
  });

  it("reports a signed-in person who is still unverified", async () => {
    const current = user(false);
    const outcome = await finishEmailVerification({
      mode: null,
      code: null,
      flow: "verifyEmail",
      applyCode: vi.fn(),
      currentUser: () => current,
    });
    expect(outcome).toBe("still-unverified");
  });
});
