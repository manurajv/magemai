import { applicationDefault, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { platformDefaults } from "../shared/platform/defaults.ts";

const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId = emulator
  ? (process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "demo-magemai")
  : "magemai";

if (emulator && projectId === "magemai") {
  console.error("Refusing to seed platform settings into an emulator pointed at magemai.");
  process.exit(1);
}

if (emulator) process.env.METADATA_SERVER_DETECTION = "none";
const app = emulator
  ? initializeApp({ projectId })
  : initializeApp({ credential: applicationDefault(), projectId: "magemai" });

const db = getFirestore(app);
await db.doc("platformSettings/global").set(
  {
    ...platformDefaults,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: "system",
  },
  { merge: true },
);
await db.doc("auditLogs/seed-platform-settings").set({
  id: "seed-platform-settings",
  scope: "platform",
  businessId: null,
  actorId: "system",
  actorType: "system",
  action: "platform_settings.seed",
  targetType: "platformSettings",
  targetId: "global",
  summary: emulator
    ? "Seeded platform settings in the emulator."
    : "Seeded platform settings on the live project.",
  metadata: {},
  createdAt: FieldValue.serverTimestamp(),
});
console.log(`Seeded platformSettings/global on ${projectId}.`);
