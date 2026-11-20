# Phase 1 completion report

Phase 1 is the foundation: accounts, business onboarding, the business dashboard, and platform administration. This report records what is in the repository after the security review, the booking-link wording, and the super-admin token refresh. It does not start Phase 2.

## Acceptance criteria

Passed, and checked in [phase-1-checklist.md](./phase-1-checklist.md):

- **AC-1.** Register and sign in with email and password.
- **AC-3.** Email verification through the Auth emulator out-of-band code.
- **AC-4.** Password reset through the Auth emulator out-of-band code.
- **AC-5.** A verified person can create a business.
- **AC-6.** The creator's membership role is owner.
- **AC-7.** One person can belong to more than one business.
- **AC-8.** The switcher changes the active business, and the previous business name leaves the dashboard.
- **AC-9.** Signed-out and unverified sessions do not reach the dashboard. A normal member who opens `/super-admin` sees platform access denied.
- **AC-10.** Cross-tenant reads of the other business, its membership, its audit logs, and its logo are denied (XT-1 through XT-5).
- **AC-11.** A client cannot write privileged user fields, call `setBusinessStatus`, or receive `superAdmin` from registration (XT-9, XT-11, XT-19).
- **AC-12.** Storage denies another tenant's logo, SVG, HEIC, oversize uploads, and the `private/**` prefix (XT-4, XT-5, XT-17, XT-18).
- **AC-13.** Suspending a business writes an audit row, and the audit list shows it.
- **AC-14.** Shared Zod schemas and the onboarding wizard reject invalid names, slugs, and websites. The server uses the same business schema.
- **AC-15.** Loading, empty, and error states exist and are covered by component tests. Auth, dashboard, and platform screens use them.
- **AC-16.** Playwright ran the shell at 1280×800, 768×1024, and 390×844.
- **AC-17.** `npm test`, `npm run test:rules`, `npm run test:e2e`, and the production build passed locally. Counts are below.
- **AC-18.** Setup and deploy steps are in [setup.md](./setup.md). This report and the checklist match that file.

Open:

- **AC-2.** Google sign-in through the Auth emulator passed (the emulator shows an account list, then "Add new account", then the email field). Sign-in against the live Google provider on project `magemai` was not run. The criterion stays open.

## What was built

- Email and password registration, sign-in, email verification, password reset, and a profile with an avatar.
- Google sign-in with `signInWithRedirect` when `VITE_GOOGLE_AUTH_ENABLED` is true.
- Business onboarding. The first field is the Magemai booking link. It is generated from the business name until the person edits it, and the page shows `https://magemai.web.app/business/<slug>`. That path is the public booking URL from the blueprint. The route is not registered in Phase 1, so the preview is the address the later phase will serve. "Your own website" stays optional and must be `https://` when it is filled in.
- A dashboard with a business switcher, profile, and settings. Suspended businesses stay visible and cannot be edited.
- Platform administration. The claim `superAdmin: true` and an active `platformAdmins/{uid}` document are both required. The registry is the source of truth. `useSuperAdminClaim` reads the cached token and, when the claim is missing, calls `getIdTokenResult(true)` once. The denied screen has a Check again button that forces another refresh, and it tells the person they can sign out and sign back in.
- Firestore and Storage rules are default deny. The review is in [security-review.md](./security-review.md).

## Folder structure

Phase 1 code lives in these directories. Empty feature folders for later phases were not created. Screens are under `src/app/pages` rather than the `src/features` tree drawn in architecture section 4.

```text
magemai/
├── public/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   ├── layouts/
│   │   ├── navigation/
│   │   ├── pages/
│   │   ├── platform/
│   │   ├── providers/
│   │   └── router/
│   ├── components/
│   │   ├── business/
│   │   ├── shared/
│   │   └── ui/
│   ├── config/
│   ├── hooks/
│   ├── lib/
│   │   ├── auth/
│   │   ├── business/
│   │   ├── firebase/
│   │   ├── platform/
│   │   └── utilities/
│   ├── styles/
│   ├── test/
│   └── types/
├── shared/
│   ├── auth/
│   ├── business/
│   ├── data/
│   ├── firebase/
│   ├── permissions/
│   ├── platform/
│   ├── profile/
│   └── validation/
├── functions/src/
├── scripts/
├── tests/
│   ├── e2e/
│   └── rules/
├── .github/workflows/tests.yml
├── docs/
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
└── .firebaserc
```

## Architecture changes recorded during implementation

- A suspended business stays readable. `updateBusinessProfile`, `updateBusinessSettings`, and `setBusinessImage` reject it. Storage rules reject a new logo or cover while `businesses/{id}.status` is not `active`.
- A manager may list `businessMembers` only when the query pins `businessId` to their business. The emulator accepts that shape, so no `listBusinessMembers` callable was added.
- `clearDownloadToken` sets `firebaseStorageDownloadTokens` to null and stores `magemaiDownloadTokenStripped` as `"true"`. On the Storage emulator, null does not replace a token that is already stored. Production is expected to drop the key. The rules test locks the emulator behavior. Details are in architecture section 16.3 and [setup.md](./setup.md).
- `firestore.indexes.json` already had the architecture section 15 composites plus the `createdBy` + `createdAt` index the daily creation cap uses. It was not changed. `users.createdAt` descending stays an automatic single-field index.
- The booking-link label is product copy. Server slug validation is unchanged.

## Firebase

- The only cloud project is `magemai`, number `122706427013`.
- Tests and Playwright used the Emulator Suite as `demo-magemai`. Nothing in this change deployed rules, functions, hosting, or indexes.
- The owner already deployed the previous super-admin foundation. This change is not live until the owner runs the deploy commands below.
- Blaze and budget alerts are the owner's console settings, documented in architecture section 22 and setup section 8. This machine did not open the billing console, so those settings were not re-checked here.
- `.env.example` lists names only. No service account, filled env file, or web API key was committed.

Deploy, from the owner's PC, after the usual project confirmation:

```powershell
npm run deploy:rules
npm run deploy:functions
npm run deploy:hosting
```

`deploy:rules` publishes Firestore rules, indexes, and Storage rules. Indexes did not change; Storage rules did. `deploy:functions` publishes `setBusinessImage` (suspended businesses) and `clearDownloadToken`. `deploy:hosting` publishes the booking-link wizard and the Check again button. `stripDownloadTokens` stays in `us-east1`. The other functions stay in `asia-south1`.

## Security

The rule-by-rule table, the XT mapping, and the token finding are in [security-review.md](./security-review.md).

- Default deny, including a catch-all for unknown paths.
- No client write of businesses, memberships, audit logs, slug locks, platform admins, roles, status, or verification.
- `isActivePlatformAdmin()` requires the claim and `exists()` before `get()` on `platformAdmins/{uid}` with `status == "active"`. A revoked registry denies access even when the token still has the claim (XT-24).
- Application code does not call `getDownloadURL`.
- Super-admin provisioning stays the operator script in [setup.md](./setup.md). The client cannot grant the claim.

## Tests

Commands run on this machine:

| Command | Result |
| --- | --- |
| `npm run lint` | Passed. |
| `npm test` | 24 files, 99 tests passed. |
| `npm run typecheck` | Passed for the app and for `functions`. |
| `npm run test:rules` | 8 files, 48 tests passed, on `demo-magemai`. |
| `npm run test:e2e` | 29 passed, 16 skipped, on `demo-magemai`. |
| `npm run build` | Passed when `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID` were set in the environment and the emulator flag was not `true`. The same command fails when those names are missing. That failure is the production guard. No env file was written. |

The first full Playwright run reported 27 passed, 2 failed, and 16 skipped. The failures were the Google emulator account list (the email field is hidden until "Add new account") and a strict-mode locator that matched "Owner" in both the switcher and the dashboard. Both were test fixes. The confirming `npm run test:e2e` then reported 29 passed and 16 skipped.

Not run:

- `npm run test:e2e:live` and `npm run test:cleanup:live`. They talk to project `magemai`.
- `npm run test:all` as a single command. Unit tests, rules tests, and Playwright were run separately. The CI workflow [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) calls `npm run test:all` and does not receive service-account credentials. GitHub Actions was not executed from this machine.
- Live Google sign-in on `magemai`.

The Functions emulator warned that the host Node is 26 while the runtime is 24. That warning is expected and was not a failure.

## Setup

Install, emulators, env names, provisioning, and deploy are in [setup.md](./setup.md). Node.js 24 LTS is recommended. Node.js 26 is supported locally. JDK 21 is required for the emulators.

## Known limitations

- The public page `/business/:slug` is not a route yet. The wizard only previews that URL.
- Invitations and creating a non-owner membership are not in the product UI. The membership model and rules already allow those documents when they are written by a trusted function later.
- A session that received `superAdmin` after sign-in must use Check again, or sign out and back in, before the platform area reads the new claim. Data access still requires the active registry document.
- The Storage emulator keeps `firebaseStorageDownloadTokens` when the helper sets it to null. The live bucket is expected to drop it. That live check has not been done, so the checklist box for removing the token stays open.
- Phase 2 through Phase 6 are not started.

## Remaining work

- The owner deploys rules, functions, and hosting.
- Close AC-2 with a non-destructive Google sign-in on `magemai` when the owner wants that check.
- Confirm on a live object that the download token is gone after finalize.
- Let GitHub Actions run `npm run test:all` on the pull request.
- Continue with Phase 2 only when the owner asks for it.
