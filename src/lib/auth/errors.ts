import { PASSWORD_ACCOUNT_MESSAGE } from "@shared/auth/messages";

export { PASSWORD_ACCOUNT_MESSAGE };

export function firebaseErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return "";
}

export function mapAuthError(error: unknown): string {
  const code = firebaseErrorCode(error);
  const message = error instanceof Error ? error.message : "";
  if (
    code === "auth/account-exists-with-different-credential" ||
    message.includes("already uses a password")
  ) {
    return PASSWORD_ACCOUNT_MESSAGE;
  }
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account already exists for that email. Sign in instead.";
    case "auth/weak-password":
      return "Use at least 8 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/user-disabled":
      return "This account is disabled.";
    case "auth/network-request-failed":
      return "The network request failed. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "That sign-in method is not enabled.";
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
      return "This link is invalid or has expired. Request a new one.";
    default:
      return "Something went wrong. Try again.";
  }
}

export function mapProfileError(error: unknown): string {
  const code = firebaseErrorCode(error);
  if (code === "permission-denied" || code === "storage/unauthorized") {
    return "You cannot change that profile.";
  }
  if (code === "functions/invalid-argument") {
    return "Choose a JPEG, PNG, or WebP image up to 2 MB.";
  }
  if (code === "functions/unauthenticated") {
    return "Sign in before saving your profile.";
  }
  return "Your profile could not be saved. Try again.";
}
