import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useFirebase } from "@/app/providers/firebase-context";
import { NotImplementedNotice } from "@/components/shared/not-implemented";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { EMULATOR_PORTS } from "@/lib/firebase/env";

type Reachability = "checking" | "reachable" | "unreachable";

function useEmulatorReachability(enabled: boolean, host: string): Reachability {
  const [state, setState] = useState<Reachability>(enabled ? "checking" : "unreachable");

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    fetch(`http://${host}:${EMULATOR_PORTS.auth}/`, {
      mode: "no-cors",
      signal: controller.signal,
      cache: "no-store",
    })
      .then(() => setState("reachable"))
      .catch(() => setState("unreachable"))
      .finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [enabled, host]);

  return state;
}

export function HomePage() {
  useDocumentTitle("Home");
  const firebase = useFirebase();
  const reachability = useEmulatorReachability(
    firebase.mode === "emulator",
    firebase.emulatorHost ?? "127.0.0.1",
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-lg bg-primary px-6 py-10 text-primary-foreground shadow-lg md:px-10">
        <p className="text-sm text-primary-foreground/80">{brand.endorsement}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="mt-3 max-w-xl text-lg text-primary-foreground/80">{brand.tagline}</p>
      </section>
      <NotImplementedNotice what="Accounts and onboarding" />
      <Card>
        <CardHeader>
          <CardTitle>Local Firebase</CardTitle>
          <CardDescription>
            Development connects to the emulator suite unless live access is explicitly opted in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {firebase.mode === "emulator" ? (
            <>
              <p>
                Connected to Firebase emulators at {firebase.emulatorHost}. Project{" "}
                {firebase.projectId}. Auth {EMULATOR_PORTS.auth}, Firestore{" "}
                {EMULATOR_PORTS.firestore}, Storage {EMULATOR_PORTS.storage}, Functions{" "}
                {EMULATOR_PORTS.functions}.
              </p>
              <p>
                {reachability === "checking"
                  ? "Checking the Auth emulator."
                  : reachability === "reachable"
                    ? `Auth emulator is reachable at ${firebase.emulatorHost}:${EMULATOR_PORTS.auth}.`
                    : `Auth emulator is not reachable at ${firebase.emulatorHost}:${EMULATOR_PORTS.auth}. Start it with npm run emulators:start.`}
              </p>
            </>
          ) : (
            <p>Connected to live Firebase project {firebase.projectId}.</p>
          )}
        </CardContent>
      </Card>
      {import.meta.env.DEV ? (
        <div>
          <Button asChild variant="outline">
            <Link to="/design-system">Design system preview</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
