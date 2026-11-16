export const DISPLAY_NAME_MIN = 1;
export const DISPLAY_NAME_MAX = 80;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PROFILE_LOCALE = "en" as const;
export const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export type AvatarContentType = (typeof AVATAR_CONTENT_TYPES)[number];

export function isAvatarContentType(value: string): value is AvatarContentType {
  return AVATAR_CONTENT_TYPES.some((type) => type === value);
}
