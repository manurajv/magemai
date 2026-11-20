import { renderHook, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSuperAdminClaim, useSuperAdminClaim } from "@/app/platform/use-super-admin-claim";

const getIdTokenResult = vi.hoisted(() => vi.fn());
const session = vi.hoisted(() => ({ uid: "user-1" as string | null }));

vi.mock("@/lib/firebase/client", () => ({
  getFirebase: () => ({
    auth: {
      get currentUser() {
        if (!session.uid) return null;
        return { uid: session.uid, getIdTokenResult };
      },
    },
  }),
}));

function token(superAdmin?: boolean) {
  return { claims: superAdmin ? { superAdmin: true } : {} };
}

describe("readSuperAdminClaim", () => {
  beforeEach(() => {
    getIdTokenResult.mockReset();
    session.uid = "user-1";
  });

  it("keeps a cached superAdmin claim without forcing a refresh", async () => {
    getIdTokenResult.mockResolvedValueOnce(token(true));
    const user = { getIdTokenResult } as unknown as User;
    await expect(readSuperAdminClaim(user)).resolves.toBe(true);
    expect(getIdTokenResult).toHaveBeenCalledTimes(1);
    expect(getIdTokenResult).toHaveBeenCalledWith();
  });

  it("refreshes once when the cached token has no superAdmin claim", async () => {
    getIdTokenResult.mockResolvedValueOnce(token()).mockResolvedValueOnce(token(true));
    const user = { getIdTokenResult } as unknown as User;
    await expect(readSuperAdminClaim(user)).resolves.toBe(true);
    expect(getIdTokenResult).toHaveBeenNthCalledWith(1);
    expect(getIdTokenResult).toHaveBeenNthCalledWith(2, true);
  });

  it("stays denied when a forced refresh still has no claim", async () => {
    getIdTokenResult.mockResolvedValue(token());
    const user = { getIdTokenResult } as unknown as User;
    await expect(readSuperAdminClaim(user, true)).resolves.toBe(false);
    expect(getIdTokenResult).toHaveBeenCalledTimes(1);
    expect(getIdTokenResult).toHaveBeenCalledWith(true);
  });
});

describe("useSuperAdminClaim", () => {
  beforeEach(() => {
    getIdTokenResult.mockReset();
    session.uid = "user-1";
  });

  it("checks again with a forced refresh after a stale session was denied", async () => {
    getIdTokenResult
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(token())
      .mockResolvedValueOnce(token(true));
    const hook = renderHook(() => useSuperAdminClaim("user-1"));
    await waitFor(() => expect(hook.result.current.claim).toBe("no"));
    expect(getIdTokenResult).toHaveBeenNthCalledWith(2, true);
    hook.result.current.recheck();
    await waitFor(() => expect(hook.result.current.claim).toBe("yes"));
    expect(getIdTokenResult).toHaveBeenLastCalledWith(true);
  });
});
