import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import type { Page } from "@/lib/platform/admin";

export function useCursorPage<T>(
  key: readonly unknown[],
  load: (cursor: QueryDocumentSnapshot | null) => Promise<Page<T>>,
) {
  const [stack, setStack] = useState<Array<QueryDocumentSnapshot | null>>([null]);
  const keyText = JSON.stringify(key);
  useEffect(() => {
    setStack([null]);
  }, [keyText]);
  const cursor = stack[stack.length - 1] ?? null;
  const query = useQuery({
    queryKey: [...key, stack.length, cursor?.id ?? "start"],
    queryFn: () => load(cursor),
  });
  return {
    query,
    page: stack.length - 1,
    previous: () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current)),
    next: () => {
      const nextCursor = query.data?.cursor;
      if (!query.data?.hasMore || !nextCursor) return;
      setStack((current) => [...current, nextCursor]);
    },
  };
}
