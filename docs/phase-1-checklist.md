# Phase 1 implementation checklist

**Product:** Magemai  
**Scope:** Foundation and identity only.  
**Status:** Not started. Every box below is open.

This checklist is workflow steps 4–12 from the product owner's instructions. Steps 1–3 (inspect the repository, write the architecture, write these docs) are the planning pass that produced [architecture.md](./architecture.md), [setup.md](./setup.md), and [magemai-blueprint.md](./magemai-blueprint.md).

Do not start step 4 until the owner has accepted [architecture.md](./architecture.md) or overridden items in its open-questions section. Implement the proposed defaults in that section. Do not start Phase 2 from this list. Do not seed or special-case the pilot business named in the blueprint.

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

- [ ] Initialize Vite, React, and TypeScript with `strict` and `noUncheckedIndexedAccess`.
- [ ] Pin Node.js 24 in `package.json` `engines`, in `functions` (`nodejs24`), and in the README/setup note if the required version changes.
- [ ] Add Tailwind CSS and initialize shadcn/ui. Theme it from `src/styles/tokens.css` using the token table in architecture section 5.2.
- [ ] Add Lucide.
- [ ] Add React Router and the Phase 1 route table from architecture section 5.3. Do not register marketplace, booking, finance, or collaboration routes.
- [ ] Add ESLint (`typescript-eslint`, React hooks) and Prettier. Treat `any` as an error.
- [ ] Add Vitest, React Testing Library, and jsdom. Wire `npm test`.
- [ ] Add the Firebase JS SDK and `src/lib/firebase` client initialization, including the emulator connection when `VITE_USE_FIREBASE_EMULATORS=true`.
- [ ] Production builds must refuse to start when the emulator flag is true.
- [ ] Add `firebase.json` emulator config (Auth, Firestore, Functions, Storage, Hosting, UI) and `.firebaserc` aliases without committing secret project data. Document `demo-magemai` for emulator-only runs.
- [ ] Add `.env.example` with the variable names from architecture section 19 and empty values.
- [ ] Confirm `.gitignore` excludes `.env.*` (except `.env.example`), service-account JSON, and Firebase debug logs.
- [ ] Add `shared/` and the Vite `@shared` alias. Functions consume the same folder.
- [ ] Add `src/config/brand.ts` with the product name, endorsement, and tagline. Document title template `{page} · Magemai`.

### Dependencies that stay out of Phase 1

- [ ] Do not install FullCalendar, Recharts, a payment SDK, an i18n framework, or `date-fns-tz`.
- [ ] Do install the libraries Phase 1 actually imports: React Hook Form, Zod, `@hookform/resolvers`, TanStack Query, TanStack Table, date-fns, Firebase.

### Design system

Build these as real components, themed only by tokens, and use them in later steps. Do not build every dashboard page in this step.

- [ ] Logo placeholder that reads the product name from `brand.ts`.
- [ ] Typography styles from the token font (self-hosted Inter).
- [ ] Button, input, select, dialog, dropdown, card, table.
- [ ] Sidebar and header, including the collapsed drawer below `lg`.
- [ ] Toast notifications.
- [ ] Loading state, empty state, and error state with a retry action.
- [ ] Coming soon presentation (disabled, labeled, not a link).
- [ ] Responsive behavior checked at mobile, tablet, and desktop widths for the shell primitives.
- [ ] Component tests for loading, empty, and error states (AC-15).

### App skeleton

- [ ] Providers: query client, auth (can be a stub until step 5), toasts.
- [ ] Layouts: auth layout, dashboard layout, super-admin layout.
- [ ] A route renders each layout without fake business data.
- [ ] `npm test` and the Vite production build succeed before step 5 starts.

## Step 5 — Authentication

Maps to AC-1, AC-2, AC-3, AC-4, AC-9, AC-14, AC-15.

- [ ] `shared/validation` schemas for registration, login, forgot password, and profile.
- [ ] `/register` creates an email/password account, collects display name, and sends verification.
- [ ] `/login` signs in with email and password.
- [ ] Google sign-in uses `signInWithRedirect`. The button is hidden when `VITE_GOOGLE_AUTH_ENABLED` is not `true`.
- [ ] A Google attempt for an email that already uses a password shows the original-method error and does not link accounts (OQ-7).
- [ ] `/forgot-password` sends the reset email.
- [ ] `/verify-email` explains the wait, resends, reloads the user, and signs out.
- [ ] Unverified users cannot open `/business/register`, `/admin`, or `/super-admin` (OQ-3).
- [ ] `AuthProvider` uses `onAuthStateChanged` and `onIdTokenChanged`.
- [ ] Guards show the loading state while auth is resolving, then redirect. They do not flash protected content.
- [ ] Sign-out clears the session and the `magemai.activeBusinessId` hint.
- [ ] Auth trigger `onAuthUserCreated` creates `users/{uid}` with `status: "active"` and no claim.
- [ ] Client create of `users/{uid}` is restricted to the shape in architecture section 8.2, so a delayed trigger cannot be used to add fields.
- [ ] `syncAuthProfile` copies `email` and `emailVerified` from the Auth record and sets `lastLoginAt`.
- [ ] Profile screen updates only display name, phone, and locale. Phone is optional E.164.
- [ ] Avatar upload goes to `users/{uid}/avatar` and is linked by `setUserAvatar`. The screen reads bytes with `getBlob`, not `getDownloadURL`.
- [ ] Form validation and error messages for bad email, short password, and bad phone (AC-14).
- [ ] Loading and error states on each auth form (AC-15).
- [ ] Component tests: login validation, unverified holding screen, anonymous user redirected away from the dashboard.
- [ ] Emulator test: registration leaves the ID token without `superAdmin` (XT-19).

## Step 6 — Onboarding and membership

Maps to AC-5, AC-6, AC-7, AC-14, AC-15.

- [ ] Seed script `scripts/seed-platform-settings.ts`, wired as `npm run seed:platform-settings`, writes `platformSettings/global` from `shared/platform/defaults.ts` and an audit row `platform_settings.seed`.
- [ ] Defaults match the architecture: country `LK`, currency `LKR`, language `en`, timezone `Asia/Colombo`, the category ids, the currency list, and the reserved slugs.
- [ ] No seed, fixture, or reserved slug names the pilot business.
- [ ] Zod schemas for all seven wizard steps, shared with the function.
- [ ] `/business/register` wizard: identity, description, contact, location, locale, optional images, review.
- [ ] Slug suggestion from ASCII letters in the name. Unicode names remain valid. Empty suggestion when the name has no ASCII letters (OQ-14).
- [ ] `checkSlugAvailability` used on blur and before leaving the identity step.
- [ ] Contact email required. Phone and website optional (OQ-12).
- [ ] Country, currency, language, and timezone pre-selected from platform settings and editable.
- [ ] `shared/data/countries.ts` is the ISO 3166-1 alpha-2 list the country control and the Zod schema both use. `supportedCountries` only pins entries to the top.
- [ ] Server rejects a timezone `Intl` does not know, a currency outside the settings list, and a country code outside `shared/data/countries.ts`.
- [ ] Display name, when missing, is collected and saved on the user document before submit (OQ-18).
- [ ] `createBusiness` transaction: slug reservation, business document, owner membership id `{businessId}_{uid}`, audit `business.create`.
- [ ] Payload role, status, owner id, and verification are ignored (XT-20).
- [ ] Stored result: role `owner`, `status: "active"`, `verificationStatus: "unverified"`, `bookingApprovalMode: "manual"`, `publicProfileEnabled: false` (OQ-4, AC-6).
- [ ] Idempotent retry for the same user and the same slug. Second user gets `already-exists`.
- [ ] Caps: 10 creations per rolling 24 hours and 25 owner memberships (OQ-13).
- [ ] Logo and cover are skippable (OQ-6). When present, they upload to the fixed brand paths and `setBusinessImage` links them.
- [ ] After success, the new membership becomes the active business and the app opens `/admin`.
- [ ] A second run of the wizard creates a second owner membership (AC-7).
- [ ] Direct client writes to `businesses`, `businessMembers`, and `businessSlugs` remain denied.
- [ ] Component tests for the wizard validation and the review step.
- [ ] Emulator test XT-20.

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

- [ ] Implement `scripts/provision-super-admin.ts` exactly to the contract in architecture section 17.3, including `--revoke`, the confirmation prompt, claim merge, user-document bootstrap, and audit rows `super_admin.provision` and `super_admin.revoke`.
- [ ] Wire `npm run provision:super-admin`. The script reads `GOOGLE_APPLICATION_CREDENTIALS` and has no claim-setting callable beside it.
- [ ] Document the command and the service-account requirements in `docs/setup.md` if the implemented flags differ from the plan.
- [ ] `/super-admin` guard: loading state, then login redirect, then verification redirect, then a 403 state when the claim is absent. The business dashboard is not used as the denial screen.
- [ ] Navigation for super-admin is shown from the ID token claim. Functions do not trust that check.
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
- [ ] Rules helpers `exists()` before `get()` on the membership path.
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
- [ ] XT-14 Super-admin can read both businesses, users, and platform audit logs.
- [ ] XT-15 Super-admin client SDK cannot write audit logs, businesses, or memberships.
- [ ] XT-16 Signed-out clients cannot read protected documents or brand objects.
- [ ] XT-17 SVG, HEIC, and oversize uploads are denied.
- [ ] XT-18 The private prefix is denied for read and write.
- [ ] XT-19 Registration does not set `superAdmin`.
- [ ] XT-20 `createBusiness` ignores client-supplied role, status, and verification.
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
- [ ] E2E: provisioned super-admin sees both lists, suspends a business, and the owner sees the banner and a disabled profile form.
- [ ] E2E: the audit list shows the suspension.
- [ ] E2E: Google sign-in through the Auth emulator's simulated provider.
- [ ] Manual, only if a cloud project with a Google OAuth client is available: Google sign-in on the development project. If it was not run, leave AC-2's real-provider half documented as not run. Do not mark it passed.
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
- [ ] Confirm no service account, `.env` file, or filled production hostname was committed.
- [ ] Confirm a repository search finds no special case for the pilot business.

## Step 12 — Completion report

Write the report only after step 10 has been run. Include:

- [ ] Implemented features, mapped against AC-1 through AC-18. Any open criterion stays open and is explained.
- [ ] The folder structure that was actually created.
- [ ] Architecture decisions that changed during implementation.
- [ ] Firebase configuration status: which projects exist, whether Blaze is enabled, whether anything was deployed. Deployment still requires an explicit owner decision.
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
