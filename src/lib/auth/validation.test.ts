import { describe, expect, it } from "vitest";
import { loginSchema, profileSchema, registerSchema } from "@shared/validation/auth";

describe("auth schemas", () => {
  it("rejects a bad email, a short password, and a bad phone", () => {
    const registration = registerSchema.safeParse({
      displayName: "A",
      email: "not-an-email",
      password: "short",
    });
    expect(registration.success).toBe(false);
    if (!registration.success) {
      const fields = registration.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain("email");
      expect(fields).toContain("password");
    }

    const login = loginSchema.safeParse({ email: "person@example.test", password: "short" });
    expect(login.success).toBe(false);

    const profile = profileSchema.safeParse({
      displayName: "A",
      phoneNumber: "0771234567",
      locale: "en",
    });
    expect(profile.success).toBe(false);
  });

  it("accepts a profile with an empty phone or an E.164 phone", () => {
    expect(
      profileSchema.safeParse({ displayName: "Ada", phoneNumber: "", locale: "en" }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({ displayName: "Ada", phoneNumber: "+94771234567", locale: "en" })
        .success,
    ).toBe(true);
  });
});
