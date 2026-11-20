import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error("This cleanup is for the live project. Unset the emulator hosts first.");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: "magemai" });
const auth = getAuth();
const db = getFirestore();

let pageToken;
let removed = 0;
do {
  const listed = await auth.listUsers(1000, pageToken);
  for (const user of listed.users) {
    const email = user.email ?? "";
    if (!email.startsWith("e2e+")) continue;
    const members = await db.collection("businessMembers").where("userId", "==", user.uid).get();
    for (const member of members.docs) {
      const businessId = String(member.get("businessId") ?? "");
      const business = await db.doc(`businesses/${businessId}`).get();
      const name = String(business.get("name") ?? "");
      if (business.exists && name.startsWith("E2E ")) {
        const slug = business.get("slug");
        if (typeof slug === "string" && slug.length > 0) {
          await db.doc(`businessSlugs/${slug}`).delete();
        }
        await business.ref.delete();
      }
      await member.ref.delete();
    }
    await db.doc(`users/${user.uid}`).delete();
    await auth.deleteUser(user.uid);
    removed += 1;
    console.log(`Removed ${email}`);
  }
  pageToken = listed.pageToken;
} while (pageToken);

console.log(`Removed ${removed} live e2e users. Audit log rows are left in place.`);
