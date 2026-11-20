import { z } from "zod";
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PHONE_PATTERN,
  PROFILE_LOCALE,
} from "../profile/limits.js";

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

const displayName = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN, "Enter your name.")
  .max(DISPLAY_NAME_MAX, "Use 80 characters or fewer.")
  .refine((value) => !hasControlCharacter(value), "Name cannot include control characters.");

const email = z.email("Enter a valid email address.");

const password = z
  .string()
  .min(PASSWORD_MIN, "Use at least 8 characters.")
  .max(PASSWORD_MAX, "Use 128 characters or fewer.");

export const registerSchema = z.object({
  displayName,
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password,
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  password,
});

export const profileSchema = z.object({
  displayName,
  phoneNumber: z
    .string()
    .trim()
    .refine((value) => value === "" || PHONE_PATTERN.test(value), {
      message: "Enter a phone number in international format, such as +94771234567.",
    }),
  locale: z.literal(PROFILE_LOCALE, { error: "English is the only language in this version." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
