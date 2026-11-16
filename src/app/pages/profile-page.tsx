import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { profileSchema, type ProfileInput } from "@shared/validation/auth";
import { useAuth } from "@/app/providers/auth-context";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { mapProfileError } from "@/lib/auth/errors";
import {
  avatarRejection,
  readAvatar,
  saveAvatar,
  saveProfile,
  type UserProfile,
} from "@/lib/auth/profile";
import { bootstrapAuthUser } from "@/lib/auth/session";
import { getFirebase } from "@/lib/firebase/client";

function isProfile(value: unknown): value is UserProfile {
  if (typeof value !== "object" || value === null) return false;
  return "displayName" in value && "email" in value;
}

export function ProfilePage() {
  useDocumentTitle("Profile");
  const auth = useAuth();
  const queryClient = useQueryClient();
  const uid = auth.user?.uid ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const profileQuery = useQuery({
    queryKey: ["user", uid],
    enabled: uid.length > 0,
    queryFn: async () => {
      const snap = await getDoc(doc(getFirebase().db, "users", uid));
      if (!snap.exists()) return null;
      const data = snap.data();
      return isProfile(data) ? data : null;
    },
  });
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "", phoneNumber: "", locale: "en" },
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    form.reset({
      displayName: profile.displayName,
      phoneNumber: profile.phoneNumber ?? "",
      locale: "en",
    });
  }, [form, profileQuery.data]);

  useEffect(() => {
    const path = profileQuery.data?.photoPath;
    if (!path) {
      setPhotoUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl = "";
    void readAvatar(path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPhotoUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [profileQuery.data?.photoPath]);

  if (auth.status === "loading" || profileQuery.isLoading) {
    return <LoadingState label="Loading profile" />;
  }
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <ErrorState
        title="Profile unavailable"
        message="Your profile document is not ready yet."
        onRetry={() => {
          const current = getFirebase().auth.currentUser;
          if (!current) {
            void profileQuery.refetch();
            return;
          }
          void bootstrapAuthUser(current).finally(() => void profileQuery.refetch());
        }}
      />
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Your profile"
        description="This is your personal account. It is not a business membership and it cannot grant administration."
      />
      <p className="text-sm text-muted-foreground">{profile.email}</p>
      {photoUrl ? (
        <img src={photoUrl} alt="" className="size-16 rounded-full object-cover" />
      ) : (
        <div className="grid size-16 place-items-center rounded-full bg-muted text-sm font-medium">
          {profile.displayName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit(async (input) => {
          setSaving(true);
          setError(null);
          setMessage(null);
          try {
            await saveProfile(uid, input);
            await queryClient.invalidateQueries({ queryKey: ["user", uid] });
            setMessage("Profile saved.");
          } catch (caught) {
            setError(mapProfileError(caught));
          } finally {
            setSaving(false);
          }
        })}
      >
        <Input
          label="Display name"
          error={form.formState.errors.displayName?.message}
          {...form.register("displayName")}
        />
        <Input
          label="Phone"
          hint="Optional. Use international format, such as +94771234567."
          error={form.formState.errors.phoneNumber?.message}
          {...form.register("phoneNumber")}
        />
        <label className="flex flex-col gap-2 text-sm font-medium">
          Language
          <select
            className="h-11 rounded-md border border-input bg-card px-3 text-sm"
            {...form.register("locale")}
          >
            <option value="en">English</option>
          </select>
        </label>
        {error ? <p role="alert">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Profile photo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            const problem = avatarRejection(file);
            if (problem) {
              setError(problem);
              return;
            }
            setSaving(true);
            setError(null);
            void saveAvatar(uid, file)
              .then(async () => {
                await queryClient.invalidateQueries({ queryKey: ["user", uid] });
                setMessage("Profile photo saved.");
              })
              .catch((caught: unknown) => setError(mapProfileError(caught)))
              .finally(() => setSaving(false));
          }}
        />
        <span className="font-normal text-muted-foreground">JPEG, PNG, or WebP. Up to 2 MB.</span>
      </label>
      <Link
        to={auth.user?.emailVerified ? "/admin" : "/verify-email"}
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Back
      </Link>
    </div>
  );
}
