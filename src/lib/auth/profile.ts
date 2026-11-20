import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getBlob, ref, uploadBytes } from "firebase/storage";
import { AVATAR_MAX_BYTES, isAvatarContentType } from "@shared/profile/limits";
import type { ProfileInput } from "@shared/validation/auth";
import { getFirebase } from "@/lib/firebase/client";

export type UserProfile = {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  phoneNumber: string | null;
  photoPath: string | null;
  locale: "en";
  status: "active" | "disabled";
};

export function avatarRejection(file: File): string | null {
  if (!isAvatarContentType(file.type)) {
    return "Choose a JPEG, PNG, or WebP image.";
  }
  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    return "Choose an image up to 2 MB.";
  }
  return null;
}

export async function saveProfile(uid: string, input: ProfileInput): Promise<void> {
  const { db } = getFirebase();
  await updateDoc(doc(db, "users", uid), {
    displayName: input.displayName,
    phoneNumber: input.phoneNumber === "" ? null : input.phoneNumber,
    locale: input.locale,
    updatedAt: serverTimestamp(),
  });
}

export async function saveAvatar(uid: string, file: File): Promise<void> {
  const problem = avatarRejection(file);
  if (problem) throw new Error(problem);
  const { storage, functions } = getFirebase();
  const path = `users/${uid}/avatar`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  const link = httpsCallable(functions, "setUserAvatar");
  await link();
}

export async function readAvatar(path: string): Promise<Blob> {
  const { storage } = getFirebase();
  return getBlob(ref(storage, path));
}
