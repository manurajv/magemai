# Phase 1 implementation checklist

**Product:** Magemai  
**Scope:** Foundation and identity only.  
**Status:** Not started. Every box below is open.

This checklist is workflow steps 4–12 from the product owner's instructions. Steps 1–3 (inspect the repository, write the architecture, write these docs) are the planning pass that produced [architecture.md](./architecture.md), [setup.md](./setup.md), and [magemai-blueprint.md](./magemai-blueprint.md).

The owner approved the architecture direction and locked four decisions: `asia-south1` for Firestore and Cloud Functions, integer minor units with ISO 4217 codes, platform root collections plus business subcollections for later operational data, and Firebase-assigned `web.app` / `firebaseapp.com` hostnames only. The default Storage bucket stays in `us-east1`. Only `stripDownloadTokens` is deployed there. Implement those unchanged. The only cloud project is `magemai` (number `122706427013`). On 2026-11-20 the app default changed from emulator-first to that live project. Rules tests and `npm run test:e2e` still use the Emulator Suite (`demo-magemai`). Do not create a dev or staging project. Do not start Phase 2 from this list. Do not seed or special-case the pilot business named in the blueprint. The earlier step 4 boxes that describe the old emulator default are the historical record of that step. Section 24 of the architecture is the current policy.

## How to check a box

- Check a box only after the behavior is in the repository and has been verified.
- Check a test box only after that test was executed and passed. If a credential or a cloud project was unavailable, leave the box open and write the reason in the step 12 report.
- Keep the application building at the end of each step.
- When a default in the architecture changes, update `docs/architecture.md` in the same change (step 11 covers the final pass; earlier corrections should not wait for it).

## Acceptance criteria tracker

The blueprint's Phase 1 acceptance criteria. The step column is where the work happens. The box is checked only when the criterion is true in a run, not when the step is merely coded.

- [ ] **AC-1.** A user can register and log in. (Steps 5, 10)
- [ ] **AC-2.** Google authentication works when it is configured. (Steps 5, 10. Emulator simulation and, separately, a real OAuth client.)
- [ ] **AC-3.** Email verification works. (Steps 5, 10)
- [ ] **AC-4.** Password reset works. (Steps 5, 10)
- [ ] **AC-5.** A user can create a business. (Steps 6, 10)
- [ ] **AC-6.** The creator is assigned the owner role. (Steps 6, 9, 10)
- [ ] **AC-7.** A user can belong to multiple businesses. (Steps 6, 7, 10)
- [ ] **AC-8.** The business switcher changes the active business context. (Steps 7, 10)
- [ ] **AC-9.** Unauthorized users cannot access protected dashboards. (Steps 5, 7, 10)
- [ ] **AC-10.** A user cannot access another business's private records. (Steps 9, 10. Tests XT-1, XT-2, XT-3, XT-4, XT-5.)
- [ ] **AC-11.** A normal user cannot promote themselves to super-admin. (Steps 8, 9, 10. Tests XT-9, XT-11, XT-19.)
- [ ] **AC-12.** Storage rules prevent unauthorized access to private files. (Steps 9, 10. Tests XT-4, XT-5, XT-17, XT-18.)
- [ ] **AC-13.** Super-admin actions generate audit logs. (Steps 8, 9, 10)
- [ ] **AC-14.** Forms validate correctly. (Steps 4, 5, 6, 10)
- [ ] **AC-15.** Loading, empty, and error states are implemented. (Steps 4, 5, 6, 7, 8)
- [ ] **AC-16.** The application works on mobile, tablet, and desktop. (Steps 4, 7, 10)
- [ ] **AC-17.** Tests pass in the local development environment. (Step 10)
- [ ] **AC-18.** Setup and deployment instructions are documented. (This planning pass starts them. Step 11 updates them so they match what was built.)

## Step 4 — Foundation

### Tooling

- [x] Initialize Vite, React, and TypeScript with `strict` and `noUncheckedIndexedAccess`.
- [x] Accept Node.js `>=24` in the root `package.json` `engines`, keep `engine-strict` off, and leave `.nvmrc` on 24. Functions stay `nodejs24` in `firebase.json` and `functions/package.json`. README and `docs/setup.md` say Node 24 LTS is recommended and Node 26 is supported for local development. Verified on Node.js 26.13.1.
- [x] Add Tailwind CSS and initialize shadcn/ui. Theme it from `src/styles/tokens.css` using the token table in architecture section 5.2.
- [x] Add Lucide.
- [ ] Add React Router and the Phase 1 route table from architecture section 5.3. Do not register marketplace, booking, finance, or collaboration routes. Step 4 registers `/`, `/login`, `/register`, `/admin`, `/super-admin`, and a development-only `/design-system`. `/forgot-password`, `/verify-email`, `/business/register`, `/admin/profile`, `/admin/settings`, and the super-admin list routes stay for steps 5–8.
- [x] Add ESLint (`typescript-eslint`, React hooks) and Prettier. Treat `any` as an error.
- [x] Add Vitest, React Testing Library, and jsdom. Wire `npm test`.
- [x] Add the Firebase JS SDK and `src/lib/firebase/client.ts` as the only initializer (`getFirebase`). Connect Auth, Firestore, Storage, and Functions emulators on `127.0.0.1` at the ports in architecture section 24.1. Construct Functions for region `asia-south1`.
- [x] Connect emulators once. Reuse `getApps()`, and guard with `globalThis.__magemaiEmulatorsConnected` so a Vite HMR reload does not call `connectAuthEmulator` twice.
- [x] Development mode (`import.meta.env.DEV`) uses emulators when `VITE_ALLOW_LIVE_FIREBASE` is not `true`, including when `VITE_USE_FIREBASE_EMULATORS` is unset.
- [x] Production builds cannot connect to localhost. `vite.config.ts` throws during `vite build` when mode is `production` and `VITE_USE_FIREBASE_EMULATORS` is `true`. `getFirebase()` also throws if a production bundle still tries to use emulators.
- [x] Live Firebase during `npm run dev` requires both `VITE_USE_FIREBASE_EMULATORS=false` and `VITE_ALLOW_LIVE_FIREBASE=true` in gitignored `.env.development.local`, with `VITE_FIREBASE_PROJECT_ID=magemai`. Any other combination stays on emulators or throws, per the table in architecture section 24.6. The live path shows a non-dismissible banner reading `LIVE FIREBASE — project magemai. This is not the emulator. Writes affect the real project.` and the same sentence once via `console.warn`.
- [x] Add `firebase.json` with Auth 9099, Firestore 8080, Storage 9199, Functions 5001, Hosting 5000, and Emulator UI 4000, each host `127.0.0.1`, `ui.enabled` true, and `singleProjectMode` true. `.firebaserc` sets `default` to `demo-magemai`. The live project is only the explicit alias `live` (`magemai`). Do not add dev, staging, or prod project aliases. `npx firebase use` prints `demo-magemai`.
- [x] Add `.env.example` with the variable names from architecture section 19, including `VITE_ALLOW_LIVE_FIREBASE`, and empty values. `.env.development` sets `VITE_USE_FIREBASE_EMULATORS=true` and `VITE_FIREBASE_PROJECT_ID=demo-magemai`. That file is gitignored, so it is created on the developer machine and is not committed. Development mode uses the emulator defaults even when the file is absent. `.env.production` is gitignored and, when created for a real build, targets `magemai` with the emulator flag off.
- [x] Add `scripts/emulators.mjs` and `scripts/seed-emulators.mjs`. The wrapper hardcodes `--project demo-magemai` and exits 1 if that id would be `magemai`, if `VITE_ALLOW_LIVE_FIREBASE` is `true`, or if `GOOGLE_APPLICATION_CREDENTIALS` is still set in an emulator child process.
- [x] `emulators:start` runs `firebase emulators:start --project demo-magemai` with `--export-on-exit ./emulator-data`, and `--import ./emulator-data` only when `emulator-data/firebase-export-metadata.json` exists.
- [x] `emulators:export` runs `firebase emulators:export ./emulator-data --project demo-magemai --force` against the already running suite.
- [x] `emulators:reset` deletes only the local `emulator-data` directory after checking the resolved path ends in `emulator-data`. It does not call the Firebase CLI.
- [x] `emulators:seed` runs inside `firebase emulators:exec --project demo-magemai` and writes only the synthetic users, businesses, and platform admin in architecture section 24.9, plus `platformSettings/global` and one idempotent audit row. It refuses any other project id. It does not create the pilot business.
- [x] Keep `emulator-data/` gitignored. Do not commit an export.
- [x] `test:rules` and `test:e2e` run through `node scripts/emulators.mjs exec`, which spawns `firebase emulators:exec --project demo-magemai --only auth,firestore,functions,storage`. The exec exits 1 when `FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`, or `FIREBASE_STORAGE_EMULATOR_HOST` is missing or is not `127.0.0.1` or `localhost`. Step 4's rules test is the host guard. The rule cases in architecture section 20.4 arrive in step 9. The Playwright run is a shell smoke, not the step 10 flows.
- [x] `npm test` does not construct a cloud app. If a unit test imports `getFirebase`, Vitest setup forces the emulator branch and the `demo-magemai` guard.
- [x] Wire the script names from architecture section 24.11 with cross-platform `node` / `tsc` / `eslint` / `prettier` bodies (no bash `rm`, assignment, or `source`): `dev`, `emulators:start`, `emulators:export`, `emulators:reset`, `emulators:seed`, `test`, `test:rules`, `test:e2e`, `typecheck`, `lint`, `format`. `preview` is also present for `vite preview`.
- [x] No npm script deploys or targets `magemai`. There is no `deploy` script in that list. A later deploy helper prints project id `magemai` and project number `122706427013` and continues only after the operator types both, and only after the owner has approved that deploy.
- [x] No script deletes or overwrites collections on `magemai`. A later maintenance script of that kind must refuse that project id.
- [x] Add `.gitattributes` so `*.ts`, `*.tsx`, `*.json`, `*.mjs`, `*.rules`, and `*.md` use LF.
- [x] Document the budget alerts and Cloud Run spend cap for `magemai` in `docs/setup.md`, and do not deploy functions before they exist. Step 4 did not deploy functions.
- [x] Confirm `.gitignore` excludes `.env.*` (except `.env.example`), service-account JSON, Firebase debug logs, and `emulator-data/`.
- [x] Add `shared/` and the Vite `@shared` alias. Functions consume the same folder.
- [x] Add `src/config/brand.ts` with the product name, endorsement, and tagline. Document title template `{page} · Magemai`.

### Dependencies that stay out of Phase 1

- [x] Do not install FullCalendar, Recharts, a payment SDK, an i18n framework, or `date-fns-tz`.
- [ ] Do install the libraries Phase 1 actually imports: React Hook Form, Zod, `@hookform/resolvers`, TanStack Query, TanStack Table, date-fns, Firebase. Step 4 installed Firebase and TanStack Query. Step 5 installed React Hook Form, Zod, and `@hookform/resolvers` because the auth and profile forms import them. TanStack Table and date-fns stay out until a step imports them. The step 4 table is a plain HTML table.

### Design system

Build these as real components, themed only by tokens, and use them in later steps. Do not build every dashboard page in this step.

- [x] Logo placeholder that reads the product name from `brand.ts`.
- [x] Typography styles from the token font (self-hosted Inter).
- [x] Button, input, select, dialog, dropdown, card, table.
- [x] Sidebar and header, including the collapsed drawer below `lg`.
- [x] Toast notifications.
- [x] Loading state, empty state, and error state with a retry action.
- [x] Coming soon presentation (disabled, labeled, not a link).
- [x] Responsive behavior checked at mobile, tablet, and desktop widths for the shell primitives.
- [x] Component tests for loading, empty, and error states (AC-15). The AC-15 tracker stays open until the later steps use those states on real forms and dashboards.

### App skeleton

- [x] Providers: query client, auth (can be a stub until step 5), toasts.
- [x] Layouts: auth layout, dashboard layout, super-admin layout.
- [x] A route renders each layout without fake business data.
- [x] `npm test` and the Vite production build succeed before step 5 starts.

## Step 5 — Authentication

Maps to AC-1, AC-2, AC-3, AC-4, AC-9, AC-14, AC-15.

- [x] `shared/validation` schemas for registration, login, forgot password, and profile.
- [x] `/register` creates an email/password account, collects display name, and sends verification.
- [x] `/login` signs in with email and password.
- [x] Google sign-in uses `signInWithRedirect`. The button is hidden when `VITE_GOOGLE_AUTH_ENABLED` is not `true`.
- [x] A Google attempt for an email that already uses a password shows the original-method error and does not link accounts (OQ-7).
- [x] `/forgot-password` sends the reset email.
- [x] `/verify-email` explains the wait, resends, reloads the user, and signs out.
- [x] Unverified users cannot open `/business/register`, `/admin`, or `/super-admin` (OQ-3).
- [x] `AuthProvider` uses `onAuthStateChanged` and `onIdTokenChanged`.
- [x] Guards show the loading state while auth is resolving, then redirect. They do not flash protected content.
- [x] Sign-out clears the session and the `magemai.activeBusinessId` hint.
- [x] Auth trigger `onAuthUserCreated` creates `users/{uid}` with `status: "active"` and no claim.
- [x] Client create of `users/{uid}` is restricted to the shape in architecture section 8.2, so a delayed trigger cannot be used to add fields.
- [x] `syncAuthProfile` copies `email` and `emailVerified` from the Auth record and sets `lastLoginAt`.
- [x] Profile screen updates only display name, phone, and locale. Phone is optional E.164.
- [x] Avatar upload goes to `users/{uid}/avatar` and is linked by `setUserAvatar`. The screen reads bytes with `getBlob`, not `getDownloadURL`.
- [x] Form validation and error messages for bad email, short password, and bad phone (AC-14).
- [x] Loading and error states on each auth form (AC-15).
- [x] Component tests: login validation, unverified holding screen, anonymous user redirected away from the dashboard.
- [x] Emulator test: registration leaves the ID token without `superAdmin` (XT-19).

The AC-1 through AC-18 tracker stays open. Those boxes also depend on later steps.

## Step 6 — Onboarding and membership

Maps to AC-5, AC-6, AC-7, AC-14, AC-15.

- [x] Seed script `scripts/seed-platform-settings.mjs`, wired as `npm run seed:platform-settings`, writes `platformSettings/global` from `shared/platform/defaults.ts` and an audit row `platform_settings.seed`. The emulator path was run. The live path was not run from this environment.
- [x] Defaults match the architecture: country `LK`, currency `LKR`, language `en`, timezone `Asia/Colombo`, the category ids, the currency list, and the reserved slugs.
- [x] No seed, fixture, or reserved slug names the pilot business.
- [x] Zod schemas for all seven wizard steps, shared with the function.
- [x] `/business/register` wizard: identity, description, contact, location, locale, optional images, review.
- [x] Slug suggestion from ASCII letters in the name. Unicode names remain valid. Empty suggestion when the name has no ASCII letters (OQ-14).
- [x] `checkSlugAvailability` used on blur and before leaving the identity step.
- [x] Contact email required. Phone and website optional (OQ-12).
- [x] Country, currency, language, and timezone pre-selected from platform settings and editable.
- [x] `shared/data/countries.ts` is the ISO 3166-1 alpha-2 list the country control and the Zod schema both use. `supportedCountries` only pins entries to the top.
- [x] Server rejects a timezone `Intl` does not know, a currency outside the settings list, and a country code outside `shared/data/countries.ts`.
- [x] Display name, when missing, is collected and saved on the user document before submit (OQ-18). The placeholder name `Member` counts as missing.
- [x] `createBusiness` transaction: slug reservation, business document, owner membership id `{businessId}_{uid}`, audit `business.create`.
- [x] Payload role, status, owner id, and verification are ignored (XT-20).
- [x] Stored result: role `owner`, `status: "active"`, `verificationStatus: "unverified"`, `bookingApprovalMode: "manual"`, `publicProfileEnabled: false` (OQ-4, AC-6).
- [x] Idempotent retry for the same user and the same slug. Second user gets `already-exists`.
- [x] Caps: 10 creations per rolling 24 hours and 25 owner memberships (OQ-13).
- [x] Logo and cover are skippable (OQ-6). When present, they upload to the fixed brand paths and `setBusinessImage` links them. The emulator onboarding run skipped both images. Rules tests cover the owner upload and the staff denial.
- [x] After success, `magemai.activeBusinessId` is set to the new business and the app opens `/admin`. Loading memberships and the switcher stay in step 7.
- [x] A second run of the wizard creates a second owner membership (AC-7).
- [x] Direct client writes to `businesses`, `businessMembers`, and `businessSlugs` remain denied.
- [x] Component tests for the wizard validation and the review step.
- [x] Emulator test XT-20.

## Step 7 — Dashboard and switching

Maps to AC-7, AC-8, AC-9, AC-15, AC-16.

- [ ] `ActiveBusinessProvider` restores `magemai.activeBusinessId` only when that id is an active membership. Otherwise it selects the newest active membership, or sends the user to onboarding.
- [ ] Query keys include `businessId`. Switching does not leave the previous business's name or fields on screen.
- [ ] Switcher shows each membership's business name and role.
- [ ] Sidebar, header, switcher, and user menu match architecture section 5.5, including the drawer below `lg`.
- [ ] `/admin` overview shows real fields only: name, role, status, verification. The activity area is an empty state that names later phases. No fabricated counts.
- [ ] `/admin/profile` reads the business and saves through `updateBusinessProfile` for owner, admin, and manager.
- [ ] `/admin/settings` saves timezone, currency, and language through `updateBusinessSettings` for owner and admin.
- [ ] Staff can open the shell and read the profile. Staff cannot edit settings or read audit (OQ-28). Rules tests cover this principal, using an Admin SDK membership because invites are Phase 2.
- [ ] Suspended business: shell opens, banner shows, edits disabled.
- [ ] Coming soon, disabled, in the business nav: Services, Packages, Bookings, Calendar, Customers, Team, Finances, Invoices, Collaboration, Projects, Reports. No routes and no mock records.
- [ ] Anonymous and unverified users do not see dashboard data (AC-9).
- [ ] Component test: switcher with two memberships.
- [ ] Layout checked at mobile, tablet, and desktop widths (AC-16).

## Step 8 — Super-admin

Maps to AC-11, AC-13, AC-15.

- [ ] Implement `scripts/provision-super-admin.ts` to the contract in architecture section 17.3.
- [ ] Grant writes `platformAdmins/{uid}` to `status: "active"` (with `grantedBy` and `grantedAt`) before it merges the `superAdmin` claim, then writes `super_admin.provision`.
- [ ] `--revoke` requires `--reason`. It sets `status: "revoked"` with `revokedBy`, `revokedAt`, and `reason` first, then calls `revokeRefreshTokens`, then removes the claim, then writes `super_admin.revoke`. It does not delete the Auth user or the registry document.
- [ ] Re-running grant or revoke is idempotent, as in the architecture table: no duplicate audit row when the desired state is already stored, and a re-grant clears the revocation fields and writes one new audit row.
- [ ] A failed run exits non-zero, prints the last successful step, and is safe to re-run. A partial grant does not authorize platform reads. A partial revoke does not leave them authorized.
- [ ] Wire `npm run provision:super-admin`. The script reads `GOOGLE_APPLICATION_CREDENTIALS` and has no claim-setting or registry-writing callable beside it.
- [ ] `assertActivePlatformAdmin` runs on every `setBusinessStatus` and `setBusinessVerification` call and requires both the claim and `platformAdmins/{uid}.status == "active"`.
- [ ] Document the command and the service-account requirements in `docs/setup.md` if the implemented flags differ from the plan.
- [ ] `/super-admin` guard: loading state, then login redirect, then verification redirect, then a 403 state when the claim is absent or the caller's registry document is missing or `revoked`. The business dashboard is not used as the denial screen.
- [ ] Navigation for super-admin is shown from the ID token claim only. A stale claim plus a revoked registry still ends on the 403 state once the registry read returns. Functions do not trust the claim alone.
- [ ] Overview uses `getCountFromServer` for users and businesses.
- [ ] `/super-admin/users` lists email, display name, status, email verified, and created time. Paginated by 25. Read-only (OQ-10).
- [ ] `/super-admin/businesses` lists name, slug, owner, status, verification, and created time. Paginated by 25.
- [ ] Suspend, reactivate, and verification changes call `setBusinessStatus` and `setBusinessVerification`, ask for confirmation, and then show the new audit row.
- [ ] `/super-admin/verifications` is the business table filtered to businesses that are not `verified` (OQ-9).
- [ ] `/super-admin/audit-logs` lists newest first, paginated, with scope and optional business filter.
- [ ] Coming soon: categories, subscriptions, reports, platform settings (OQ-27).
- [ ] A normal owner who opens `/super-admin` sees 403 (AC-11).
- [ ] Each status and verification change has a matching audit document. A no-op does not write a duplicate (AC-13).
- [ ] Loading, empty, and error states on each super-admin list (AC-15).

## Step 9 — Security rules and tests

Maps to AC-6, AC-10, AC-11, AC-12, AC-13.

- [ ] `firestore.rules` implement architecture section 15, default deny.
- [ ] `storage.rules` implement architecture section 16, including the denied `private/**` prefix.
- [ ] `firestore.indexes.json` contains the composite indexes from architecture section 15.
- [ ] `stripDownloadTokens` removes download-token metadata on finalize. `setBusinessImage` and `setUserAvatar` strip it as well.
- [ ] Application code does not call `getDownloadURL`. Search the repo and record the result.
- [ ] Rules helper `isActivePlatformAdmin()` matches architecture section 15: signed in, `request.auth.token.superAdmin == true`, `exists` on `platformAdmins/{request.auth.uid}`, then `get` and `status == "active"`. No allow rule treats the claim as sufficient.
- [ ] Client create, update, and delete of `platformAdmins` are denied for every caller.
- [ ] Rules helpers `exists()` before `get()` on the membership path and on the platform-admin path.
- [ ] Wire `npm run test:rules` with `@firebase/rules-unit-testing` and the emulators.
- [ ] XT-1 Member of A cannot read business B.
- [ ] XT-2 Member of A cannot read B's membership.
- [ ] XT-3 Member of A cannot list B's audit logs.
- [ ] XT-4 Member of A cannot read B's logo.
- [ ] XT-5 Member of A cannot write B's logo.
- [ ] XT-6 Client cannot write a business document.
- [ ] XT-7 Client cannot write a membership document.
- [ ] XT-8 Client cannot write an audit document.
- [ ] XT-9 User cannot change `status` or add an unknown admin field on their user document.
- [ ] XT-10 A user with no claim cannot read another user or list users.
- [ ] XT-11 A non-admin callable `setBusinessStatus` returns `permission-denied`.
- [ ] XT-12 Staff cannot read their business's audit logs.
- [ ] XT-13 Owner can read their business audit logs and cannot read platform audit logs.
- [ ] XT-14 Active platform admin (claim and registry `active`) can read both businesses, users, and platform audit logs.
- [ ] XT-15 That admin's client SDK cannot write audit logs, businesses, memberships, or `platformAdmins`.
- [ ] XT-16 Signed-out clients cannot read protected documents or brand objects.
- [ ] XT-17 SVG, HEIC, and oversize uploads are denied.
- [ ] XT-18 The private prefix is denied for read and write.
- [ ] XT-19 Registration does not set `superAdmin`.
- [ ] XT-20 `createBusiness` ignores client-supplied role, status, and verification.
- [ ] XT-21 Active super-admin (claim true and `platformAdmins` status `active`) can read users, businesses, and platform audit logs, and `setBusinessStatus` is authorized.
- [ ] XT-22 Normal user, with no claim and no registry document, is denied those platform reads.
- [ ] XT-23 Revoked super-admin (registry `revoked`, claim absent) is denied those platform reads and `setBusinessStatus`.
- [ ] XT-24 Revoked admin whose test token still has `superAdmin: true` is denied those platform reads and `setBusinessStatus`.
- [ ] XT-25 Normal user cannot create or update a `platformAdmins` record. The same test denies that write from an active super-admin's client SDK.
- [ ] Positive cases from architecture section 20.4: owner reads their business, owner uploads a small PNG, staff cannot update settings, super-admin suspension writes an audit row.
- [ ] If the member-list query shape is rejected by rules, add `listBusinessMembers` and test it. Do not open the collection.
- [ ] Confirm the Admin SDK call that clears download tokens against the emulator, and note any difference in `docs/setup.md`.
- [ ] Permission-map unit tests match the matrix in architecture section 10, including denied cells.

## Step 10 — Run all tests and fix

Maps to AC-16 and AC-17. Also re-runs the flows behind AC-1 through AC-15.

- [ ] Add Playwright with desktop (1280×800), tablet (768×1024), and mobile (390×844) projects.
- [ ] Wire `npm run test:e2e` against the Emulator Suite.
- [ ] E2E: register, verify through the Auth emulator, sign in.
- [ ] E2E: complete onboarding and see the owner role.
- [ ] E2E: create a second business, switch, and see only the selected business.
- [ ] E2E: sign out and confirm `/admin` returns to `/login`.
- [ ] E2E: password reset through the emulator out-of-band code.
- [ ] E2E: normal user opening `/super-admin` sees 403.
- [ ] E2E, on the emulator project `demo-magemai` only: provisioned super-admin (claim and active registry) sees both lists, suspends a business, and the owner sees the banner and a disabled profile form.
- [ ] E2E: after the registry is set to `revoked` while the test session token still has `superAdmin: true`, the user list does not load and the screen is the 403 or authorization error state.
- [ ] Do not point Playwright, the rules suite, or a data wipe at the live project `magemai`.
- [ ] E2E: the audit list shows the suspension.
- [ ] E2E: Google sign-in through the Auth emulator's simulated provider.
- [ ] Manual, only if Google sign-in is enabled on `magemai` and the owner agrees to a non-destructive sign-in check: Google sign-in against that project. If it was not run, leave AC-2's real-provider half documented as not run. Do not mark it passed. Do not create or delete businesses on `magemai` as part of the test run.
- [ ] Add the CI entry point `npm run test:all` that runs unit tests, rules tests, and Playwright under the emulators.
- [ ] Add a CI workflow that runs `npm run test:all` without service-account credentials.
- [ ] Fix failures. Do not bypass a rule to make a test pass.
- [ ] `npm test`, `npm run test:rules`, `npm run test:e2e`, and the production build are green locally (AC-17).
- [ ] Re-check the shell at the three viewports after fixes (AC-16).

## Step 11 — Update the docs and this checklist

Maps to AC-18.

- [ ] Update `docs/setup.md` with any command, port, Node, or emulator difference found during implementation.
- [ ] Update `docs/architecture.md` where a default was overridden or a function contract changed. Record the reason.
- [ ] Check the boxes in this file that are truly done. Leave the others open.
- [ ] Update the README status from planning to the actual Phase 1 state.
- [ ] Confirm `.env.example` still lists names only.
- [ ] Confirm no service account, filled `.env` file, web API key, or custom domain was committed. The assigned hostnames `magemai.web.app` and `magemai.firebaseapp.com` are documented on purpose.
- [ ] Confirm a repository search finds no special case for the pilot business.

## Step 12 — Completion report

Write the report only after step 10 has been run. Include:

- [ ] Implemented features, mapped against AC-1 through AC-18. Any open criterion stays open and is explained.
- [ ] The folder structure that was actually created.
- [ ] Architecture decisions that changed during implementation.
- [ ] Firebase configuration status: the single cloud project `magemai`, whether Blaze and budget alerts are in place, and whether anything was deployed. A deploy still requires an explicit owner decision and the typed project-id and project-number confirmation. Tests ran on `demo-magemai` only.
- [ ] Security summary: rules, storage token stripping, provisioning path, and the XT results.
- [ ] Test results: commands, pass or fail, and tests that were not run because credentials or a cloud project were missing.
- [ ] Setup instructions, pointing at `docs/setup.md`.
- [ ] Known limitations, including Phase 2 work that the data model allows and the UI does not (invitations, non-owner membership creation in the product).
- [ ] Remaining tasks.
- [ ] A direct statement of which acceptance criteria passed. No criterion is described as passed unless its box above is checked.

## Out of scope reminders

- [ ] No services, packages, bookings, calendar, customers, or team-invite UI.
- [ ] No payments, invoices, expenses, or reports with numbers.
- [ ] No collaboration groups, shared projects, or marketplace pages.
- [ ] No subscription billing and no payment gateway.
- [ ] No custom domain in config.
- [ ] No pilot-business seed.
