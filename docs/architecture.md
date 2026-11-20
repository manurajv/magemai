# Magemai architecture

**Product:** Magemai  
**Endorsement:** A Mavixas product  
**Tagline:** Your business. Your own space.  
**Status:** Phase 1 step 4 (foundation and design system) is in the repository. Authentication, onboarding, dashboard data, and super-admin behavior are not.  
**Date:** 2026-11-16  
**Revision:** Owner review of PR #1 approved the direction and locked the four decisions in section 3. Later the same review added the `platformAdmins` registry and named `magemai` as the only cloud project. On 2026-11-20 the app default changed to that live project ([section 24](#24-live-firebase-by-default)). The same day the default Storage bucket was left in `us-east1` (section 16). Rules tests still use the Emulator Suite.  
**Sources:** [Product blueprint](./magemai-blueprint.md) and the product owner's development instructions.

This document is the architecture contract for Phase 1. Workflow steps 4–12 in [phase-1-checklist.md](./phase-1-checklist.md) implement this contract. [setup.md](./setup.md) is the environment guide.

Phase 1 follows every remaining proposed default in [Open questions and proposed decisions](#23-open-questions-and-proposed-decisions). OQ-1, OQ-2, OQ-20, and OQ-23 are closed. Override any other item there before step 4, and update this document in the same change. Do not leave the code and this document in disagreement.

## 1. What the repository contains today

Inspection of `main` (commit `9cb897b`, "Initial commit") found a single file, `README.md`, containing the heading `# magemai`.

There is no application source, package manifest, Firebase configuration, environment template, security rules, test suite, CI workflow, or `.gitignore`. There is no working behavior to preserve and nothing to migrate. Phase 1 will initialize the project from this plan.

## 2. How to read the scope

Phase 1 delivers a secure foundation: identity, business onboarding, membership, a real dashboard shell, a real super-admin foundation, and tested tenant isolation.

The following stay out of the codebase until their own phase is accepted. Navigation may name them only as **Coming soon**, with no route that pretends to work and no sample records presented as live data:

- Public marketplace, search, and public business pages (Phase 3)
- Services, packages, availability, calendar, bookings (Phase 2)
- Customers, team invitations, staff assignment (Phase 2)
- Payments, invoices, expenses, financial reports (Phase 4)
- Collaboration groups, shared projects, availability sharing (Phase 5)
- Reviews, notification delivery, portfolio galleries (Phase 6)
- Subscriptions, commissions, payment gateways, custom domains (Phase 7)

The pilot business named in the blueprint is an ordinary tenant. It is created later through the same onboarding wizard as any other business. No seed, slug reservation, fixture, constant, or test may name it or special-case it.

## 3. Decision log

| ID | Decision |
| --- | --- |
| D1 | One React web application and one Cloud Functions codebase. Feature folders own UI, schemas, and data access. Pages do not call Firestore directly. |
| D2 | Node.js 24 LTS is recommended for the app, tests, and CI. Node.js 26 is supported for local development. `package.json` `engines` is `>=24`, `engine-strict` is off, and `.nvmrc` stays on 24. Cloud Functions stay on the `nodejs24` runtime. Functions are 2nd generation only. The package manager is npm. |
| D3 | **Owner-approved.** Phase 1 platform data lives in root collections. Every tenant-owned document carries `businessId`. Future operational records live under `businesses/{businessId}/…` so the path is the tenant. |
| D4 | A membership document id is `{businessId}_{userId}`. Rules and functions load it with one `get()`. Business role is never copied into a custom claim. |
| D5 | Platform administration requires both the custom claim `superAdmin: true` and an active `platformAdmins/{uid}` document. Only an operator script using the Admin SDK may write that document. The claim alone never authorizes a sensitive read. Registration cannot grant either. |
| D6 | Client SDK reads are authorized by security rules. Privileged writes go through callable functions and the Admin SDK, then rules deny the same writes from the client. |
| D7 | The signed-in user may update only `displayName`, `phoneNumber`, `locale`, and `updatedAt` on their own user document. Media paths are set by a function after Storage validation. |
| D8 | The active business id in the browser is a display hint. Rules authorize the document being read. Functions load the caller's membership for the `businessId` argument and ignore any client-supplied role. |
| D9 | Slug uniqueness is a `businessSlugs/{slug}` document created in the same transaction as the business. |
| D10 | **Owner-approved.** Instants are Firestore timestamps (UTC). Each business stores an IANA timezone. Money, when it exists, is an integer minor-unit amount plus an ISO 4217 code. Phase 1 stores the currency code and no amounts. |
| D11 | Deployed environments that run Functions are on the Blaze plan, with a budget alert before the first deploy. Local development uses the Emulator Suite and does not need Blaze. |
| D12 | **Owner-approved.** No custom domain is configured. Hosting uses only the `web.app` and `firebaseapp.com` hostnames Firebase assigns to the project. |
| D13 | **Owner-approved.** Firestore and Cloud Functions are located in `asia-south1` (Mumbai). The default Storage bucket is the later exception in section 16: it stays in `us-east1`, and only `stripDownloadTokens` follows it. |
| D14 | One cloud Firebase project, `magemai` (number `122706427013`). From 2026-11-20 the app uses that live project unless `VITE_USE_FIREBASE_EMULATORS` is exactly `true`. Rules tests and CI Playwright stay on the Emulator Suite with project id `demo-magemai` (section 24). There is no dev, staging, or production project split. |

The owner locked D3, D10, D12, and D13 in the review of PR #1. Later revisions do not reopen them. `platformAdmins` is another platform root collection under D3, not a new layout. D14 is the owner's later instruction about environments. During step 4 the owner kept Node.js 26.13.1 on the Windows development PC, so D2 now recommends Node 24 LTS and also accepts Node 26 for local app tooling. The deployed Functions runtime remains `nodejs24`. The trade-offs behind D3–D10 are in the sections below.

## 4. Target folder structure

The blueprint's tree is the destination. Phase 1 creates only the directories that Phase 1 code imports. Empty feature folders for later phases are not created, so the tree does not imply those modules exist.

```text
magemai/
├── public/
├── src/
│   ├── app/
│   │   ├── router/                 # route table, guards
│   │   ├── providers/              # auth, query client, active business, toasts
│   │   └── layouts/                # auth, dashboard, super-admin
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives, themed only by tokens
│   │   └── shared/                 # loading, empty, error, coming soon, page header
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── businesses/             # profile, settings, switcher
│   │   ├── dashboard/
│   │   └── super-admin/
│   ├── hooks/
│   ├── lib/
│   │   ├── firebase/               # client init, emulators, callable wrappers
│   │   └── utilities/
│   ├── config/
│   │   └── brand.ts                # product name, endorsement, tagline
│   └── styles/
│       └── tokens.css
├── shared/                         # imported by the web app and by Functions
│   ├── permissions/
│   ├── validation/
│   ├── data/countries.ts           # ISO 3166-1 alpha-2 codes and English names
│   └── platform/defaults.ts        # seed values for platformSettings/global
├── functions/
│   └── src/
│       ├── auth/
│       ├── business/
│       ├── admin/
│       └── storage/
├── scripts/
│   ├── emulators.mjs              # optional emulator lifecycle; project id demo-magemai only
│   ├── seed-emulators.mjs         # synthetic users and businesses
│   ├── provision-super-admin.ts
│   └── seed-platform-settings.ts
├── emulator-data/                  # gitignored local export; not a source of truth
├── tests/
│   ├── rules/                      # Firestore and Storage emulator tests
│   └── e2e/                        # Playwright
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
├── .firebaserc                     # default magemai; demo alias is demo-magemai for the emulator suite
├── docs/
└── README.md
```

Each feature folder separates:

- `components/` and route screens
- `api.ts` for Firestore reads and callable wrappers
- schemas re-exported from `shared/validation`
- pure helpers

`shared/` is compiled into the Functions bundle and aliased as `@shared` in Vite. Zod schemas and the permission map have one source. Firestore rules cannot import TypeScript; the rules repeat the role checks, and the emulator tests in section 20 assert that the two stay aligned.

Later phases add `src/features/services`, `bookings`, `customers`, `team`, `finance`, `invoices`, `collaboration`, `projects`, `portfolio`, `notifications`, `reports`, and `marketplace` when those phases start.

## 5. Frontend architecture

### 5.1 Stack used in Phase 1

React, TypeScript (`strict`, `noUncheckedIndexedAccess`), Vite, Tailwind CSS, shadcn/ui, Lucide, React Router, TanStack Query, React Hook Form, Zod, TanStack Table (super-admin lists), date-fns, and the Firebase JS SDK.

FullCalendar and Recharts are installed in the phase that draws a calendar or a chart. Phase 1 does not install them and does not draw placeholder charts. Timezone display uses `Intl.DateTimeFormat` with the business IANA zone. `date-fns-tz` waits until scheduling in Phase 2.

### 5.2 Brand and tokens

`src/config/brand.ts` is the only place the product name, the endorsement "A Mavixas product", and the tagline are spelled out. Layouts, the document title template (`{page} · Magemai`), and auth screens read that module.

Color, radius, and type come from CSS variables in `src/styles/tokens.css`. Components use semantic Tailwind utilities (`bg-background`, `bg-primary`, `text-muted-foreground`). A component does not contain a hex color, a font stack, or a marketing string.

Proposed token values, changeable before step 4 by editing the token file's plan here:

| Token | Role | Proposed value |
| --- | --- | --- |
| `--background` | Page | warm off-white `hsl(40 33% 98%)` |
| `--foreground` | Text | charcoal `hsl(222 28% 12%)` |
| `--primary` | Navy accent, primary buttons | `hsl(215 52% 18%)` |
| `--accent` | Secondary accent | deep teal `hsl(174 72% 24%)` |
| `--muted` | Quiet surfaces | `hsl(220 16% 94%)` |
| `--destructive` | Errors and suspend actions | `hsl(0 72% 42%)` |
| `--radius` | Controls and cards | `0.75rem` |
| font | UI text | Inter, self-hosted via `@fontsource/inter` |

Inter is self-hosted so the UI does not depend on a third-party font CDN. The light shell, navy primary, charcoal text, teal accent, and rounded controls are the premium SaaS direction from the blueprint. The owner can replace the hue values before implementation; the constraint is that they stay in the token file.

### 5.3 Routing

Phase 1 registers the routes it actually implements.

| Path | Who | Purpose |
| --- | --- | --- |
| `/login` | public | Email/password and Google |
| `/register` | public | Create a user account |
| `/forgot-password` | public | Send a reset email |
| `/verify-email` | signed-in, unverified | Holding screen and resend |
| `/auth/action` | public | Applies an email-verification or password-reset code |
| `/profile` | signed-in | Personal profile. Not a business membership |
| `/business/register` | verified user | Onboarding wizard. Step 5 keeps a placeholder on this path |
| `/admin` | member | Overview |
| `/admin/profile` | member | Business profile |
| `/admin/settings` | member | Timezone, currency, language |
| `/super-admin` | Claim shows the nav. Data requires an active `platformAdmins` record. | Overview with real counts |
| `/super-admin/users` | Same | Read-only user list |
| `/super-admin/businesses` | Same | Status and verification actions |
| `/super-admin/verifications` | Same | Same table, verification filter |
| `/super-admin/audit-logs` | Same | Audit list |
| `/super-admin/categories` | Same | Coming soon |
| `/super-admin/subscriptions` | Same | Coming soon |
| `/super-admin/reports` | Same | Coming soon |
| `/super-admin/settings` | Same | Coming soon |

`/register` creates a platform user. It does not create a customer record or a business. Customer account routes (`/account/…`) and public marketplace routes are added in Phase 3. `/business/register` must be declared as a static route so a later `/business/:slug` route cannot capture the word `register`.

Guards are a loading state, then a redirect. They exist so people land in the right place. They are not the authorization boundary. A guard that has not finished loading renders the shared loading state, not a flash of the protected screen.

Coming soon entries are visible in the sidebar, disabled, and labeled. They are not links.

### 5.4 State

| Kind of state | Home |
| --- | --- |
| Signed-in user and ID token | `AuthProvider` via `onAuthStateChanged` and `onIdTokenChanged` |
| Server documents | TanStack Query |
| Active business id | `ActiveBusinessProvider`, mirrored to `localStorage` key `magemai.activeBusinessId` |
| Form state | React Hook Form |

Query keys include the tenant: `['business', businessId]`, `['memberships', uid]`, `['audit', businessId]`. When the switcher changes business, components subscribe to the new key. The previous business's documents are not shown under the new selection.

The stored active business id is used only after the membership query returns and the id is one of the caller's active memberships. Otherwise the provider selects the newest active membership, or sends the user to onboarding when they have none.

Permissions for hiding a button come from the membership document through the shared permission map. The button's absence is a convenience. The callable and the rules still run.

### 5.5 Dashboard shell

- Below the `lg` breakpoint (1024px) the sidebar is a drawer. At `lg` and above it is persistent.
- The header contains the business switcher and the user menu (profile, theme-independent account actions, sign out).
- Super-admin tables paginate 25 rows and scroll horizontally on narrow viewports.
- Overview shows the business name, the caller's role, business status, and verification status, plus an explicit empty activity area. It does not invent booking or revenue figures.
- Profile and settings forms use the shared field, error, and disabled states.
- A suspended business still opens the shell. A banner explains the suspension. Edit actions stay disabled. The switcher still lists the business.

### 5.6 Forms

Zod schemas in `shared/validation` are the write contract. The web forms use them through React Hook Form, and the callable functions parse the same schemas. A schema failure returns `invalid-argument` with field messages. Functions do not trust a payload the UI already checked.

Async work surfaces a loading state on the submitting control, an inline field error, or the shared error state. Errors are logged for the developer and shown as a short message to the person using the app. They are not swallowed.

## 6. Firebase architecture

There is one cloud project, `magemai` (section 19). The app uses it unless the emulator flag is exactly `true`. Rules tests and the default Playwright suite still use the Emulator Suite and the project id `demo-magemai`. Section 19 lists the configuration keys. The keys are environment variables, so a different project id can be supplied later without changing application code.

| Product | Phase 1 use |
| --- | --- |
| Authentication | Email/password, Google, verification, reset |
| Cloud Firestore | The collections in section 8 |
| Storage | Avatar, logo, cover, and a denied private prefix |
| Cloud Functions (2nd gen) | Trusted writes, auth user bootstrap, storage token stripping |
| Hosting | The Vite single-page app |
| App Check | Enforced in production with reCAPTCHA Enterprise |
| Emulator Suite | Auth, Firestore, Functions, Storage, Hosting |

The Functions region and the Firestore location are the same region, so callables do not pay cross-region reads. That region is `asia-south1` (Mumbai). The owner approved it (D13, [OQ-1](#oq-1-cloud-region)). A Firestore location cannot be changed later. When Firestore is enabled on `magemai`, the location must be `asia-south1`. If the database is already in another region, stop and tell the owner before writing data.

The default Storage bucket is the exception. It is `magemai.firebasestorage.app` in `us-east1`, kept there for the no-cost Storage tier. Avatar, logo, and cover bytes live in that bucket. `stripDownloadTokens` is the only function deployed to `us-east1`, because a Storage trigger has to share the bucket's region. `setUserAvatar`, `setBusinessImage`, and every other callable stay in `asia-south1` and reach the object through the Admin SDK.

Callable defaults: 256 MiB, 30 second timeout, minimum instances 0. Cold starts are acceptable in Phase 1. Raising minimum instances would bill continuously.

### 6.1 Function catalog

All callables require an authenticated user. Production deployments also require a valid App Check token. The emulator does not enforce App Check.

| Function | Caller | Effect |
| --- | --- | --- |
| `guardProviderSignIn` | Auth blocking | Rejects a Google sign-in when that email already has a password provider. Does not link the accounts (OQ-7). Timeout is 7 seconds because Identity Platform caps blocking functions there. |
| `syncAuthProfile` | That user | Creates `users/{uid}` when it is missing and copies `email` and `emailVerified` from the Auth record. Sets `lastLoginAt`. Idempotent. Grants no claim. |
| `checkSlugAvailability` | Verified user | Returns `{ available: boolean }`. |
| `createBusiness` | Verified user | Transaction: slug reservation, business, owner membership, audit. |
| `updateBusinessProfile` | Owner, admin, manager | Profile field allow-list, audit. |
| `updateBusinessSettings` | Owner, admin | Timezone, currency, language, audit. |
| `setBusinessImage` | Owner, admin, manager | Checks the Storage object, strips its download token, stores the path, audit. |
| `setUserAvatar` | That user | Same pattern for `users/{uid}/avatar`. |
| `setBusinessStatus` | Active platform admin | `active` or `suspended`, audit with before and after. The function checks the claim and `platformAdmins/{uid}.status` on every call. |
| `setBusinessVerification` | Active platform admin | Verification enum, audit with before and after. Same claim and registry check on every call. |
| `stripDownloadTokens` | Storage trigger in `us-east1` | Removes `firebaseStorageDownloadTokens` from every uploaded object. Its region is `STORAGE_REGION`, not the `asia-south1` default. |

There is no callable that sets custom claims. Adding one would create a path the provisioning design exists to avoid.

`syncAuthProfile` is the only profile-creation path. A 1st gen `onAuthUserCreated` trigger cannot use the `nodejs24` runtime (`Runtime "nodejs24" is not supported on GCF Gen1`). `beforeUserCreated` is not used, because a blocking Auth function needs Identity Platform. The client calls `syncAuthProfile` after sign-up and sign-in, and on app load when `users/{uid}` is missing. The callable writes with the Admin SDK inside a transaction. The client never writes `email`, `emailVerified`, `status`, `photoPath`, `createdAt`, or `lastLoginAt`.

Error codes are Firebase `HttpsError` values: `unauthenticated`, `permission-denied`, `invalid-argument`, `already-exists`, `failed-precondition`, `resource-exhausted`, `internal`. The client shows a short message. Internal details stay in Functions logs.

### 6.2 Why writes are functions

A business creation touches three documents and an audit row, and it must be atomic. Status changes must always write an audit row. The Admin SDK is the code path that can do both, and the client cannot bypass it if rules reject direct writes.

The cost of this split is operational: a deployed environment needs Blaze, and callables have cold starts. The local emulator runs the same functions without Blaze, so day-to-day development does not need a paid project.

Reads stay on the client SDK. Listing a user's memberships or opening a business document does not need a function round-trip, and rules are the authorization.

### 6.3 Layers

```text
UI visibility          convenience only
callable functions     authorization for privileged writes, Zod, transactions, audit
security rules         authorization for reads, and a backstop that denies privileged client writes
App Check              rejects unmodified clients that are not the Magemai app, in production
```

A modified client, a pasted Firestore query, and a guessed document id are in scope for the rules tests. A stolen service-account key is out of scope for rules (the Admin SDK bypasses them) and is handled by keeping that key off developer laptops that do not need it, off the repository, and off the frontend.

## 7. Auth flow

```text
Register (email/password) or Google redirect
        │
        ▼
Firebase Auth session
        │
        ├─ client calls syncAuthProfile
        │    creates users/{uid} if missing, then refreshes Auth-owned fields
        │
        ▼
emailVerified on the ID token?
        │
        ├─ no  → /verify-email (resend, refresh user, sign out)
        │
        └─ yes → load memberships where userId == uid and status == active
                    │
                    ├─ none → /business/register
                    ├─ some → /admin with a validated active business
                    └─ token.superAdmin == true may show /super-admin
                       Data loads only when platformAdmins/{uid}.status == active
                       Otherwise the shell shows 403, including when the token is stale
```

1. Email registration collects display name, email, and password. The client calls `createUserWithEmailAndPassword`, then `sendEmailVerification`.
2. Google uses `signInWithRedirect` so mobile browsers and popup blockers share one path ([OQ-8](#oq-8-google-sign-in-interaction)).
3. If Google reports that the email already belongs to a password account, the UI asks the person to sign in with the original method. `guardProviderSignIn` rejects that sign-in before the account is linked. Phase 1 does not link accounts automatically ([OQ-7](#oq-7-same-email-on-google-and-password)).

Step 5 does not load memberships. A verified user opens the existing `/admin` placeholder. The redirect to `/business/register` when there are no memberships arrives with steps 6 and 7. `/business/register` is registered now so the verification gate can be tested, and the page says onboarding is not yet implemented.

4. Password reset uses `sendPasswordResetEmail`. Email enumeration protection is turned on in each Firebase project.
5. Sign-out calls `signOut` and clears the active business hint from memory and `localStorage`.
6. Route checks for "verified" read `user.emailVerified` on the Auth user (the ID token). They do not read the Firestore mirror. Callables check `request.auth.token.email_verified`.
7. The Auth emulator stands in for Google during automated tests. A real Google consent-screen run is a manual check, recorded as such when it is executed.

Verification is required before onboarding and before the dashboard ([OQ-3](#oq-3-email-verification-gate)). A Google account is already verified by the provider. A password account stays on `/verify-email` until the token says otherwise.

## 8. Multi-tenant data model

### 8.1 Strategy

| Collection | Scope | Why it is a root collection |
| --- | --- | --- |
| `users/{userId}` | Person | Identity is independent of any business. |
| `businesses/{businessId}` | Tenant | The tenant root. The id is a Firestore auto-id. |
| `businessMembers/{businessId}_{userId}` | Relationship | One `get()` from rules. Queryable by user and by business. |
| `businessSlugs/{slug}` | Uniqueness lock | The document id is the slug, which Firestore enforces as unique. |
| `platformSettings/global` | Platform | One document. Not tenant data. |
| `platformAdmins/{uid}` | Platform | Authoritative super-admin registry. The document id is the Auth uid. |
| `auditLogs/{auditLogId}` | Platform or one business | An active platform admin queries across tenants. Business auditors query `businessId`. |

Auto-ids and Auth uids are alphanumeric, so the membership id can use a single underscore and never needs to be parsed. Code reads `businessId` and `userId` from fields.

Future operational collections are subcollections of `businesses/{businessId}`. A client then cannot place a booking in business A while setting `businessId` to business B; the path is the tenant. Cross-tenant marketplace queries, when they arrive in Phase 3, use collection-group queries with rules that allow only documents marked public. The owner approved this layout ([OQ-20](#oq-20-confirm-the-collection-layout)). `platformAdmins` stays a root collection because it is platform data, not a tenant's operational data.

Every Phase 1 timestamp field below is a Firestore `Timestamp` written with `FieldValue.serverTimestamp()` in functions, or forced equal to `request.time` when the client is the writer. Clients do not invent `createdAt`.

### 8.2 `users/{userId}`

`userId` is the Firebase Auth uid. The document is the person's profile. It contains no business id, no business role, and no field that grants platform administration.

| Field | Type | Writer | Notes |
| --- | --- | --- | --- |
| `id` | string | system | Same as the document id. |
| `email` | string | system | Copied from Auth. |
| `emailVerified` | boolean | system | Copied from Auth. Not an authorization input; the token is. |
| `displayName` | string | owner of the doc | 1–80 characters. Required before onboarding can finish. |
| `phoneNumber` | string or null | owner of the doc | E.164 `+[1-9][0-9]{7,14}`, or null. |
| `photoPath` | string or null | system | `users/{uid}/avatar` or null. Never an external URL. |
| `locale` | string | owner of the doc | BCP 47. Phase 1 seed allows `en`. |
| `status` | `"active"` or `"disabled"` | system | Created as `active`. Nothing in Phase 1 sets `disabled`. Functions still refuse a disabled user. |
| `createdAt` | timestamp | system | Immutable. |
| `updatedAt` | timestamp | owner or system | Client updates must equal `request.time`. |
| `lastLoginAt` | timestamp or null | system | Set by `syncAuthProfile`. Null only before the first successful sync. |

**Ownership.** The person owns the profile. A business does not own it. Deleting a membership does not delete the user.

**Security.**

- `get`: the user themselves, or an active platform admin (`isActivePlatformAdmin()` in section 15).
- `list`: an active platform admin only. A normal user, and a revoked admin whose token still says `superAdmin`, cannot list the collection.
- `create`: denied. `syncAuthProfile` creates the document. Two overlapping calls use one transaction, so the second call updates Auth-owned fields and does not reset `displayName`, `phoneNumber`, `photoPath`, `locale`, `status`, or `createdAt`. If the stored display name is still empty or the placeholder `Member`, and Auth now has a name, that second call fills the name. The client retries the callable once when the error is `internal`, `unavailable`, `deadline-exceeded`, or `aborted`. A restored session calls it only when `users/{uid}` is missing. Sign-up, sign-in, and a verification reload always call it.
- `update`: the user themselves, and only `displayName`, `phoneNumber`, `locale`, and `updatedAt`. `email`, `emailVerified`, `photoPath`, `status`, `createdAt`, and `lastLoginAt` stay unchanged on a client update. Any unknown field rejects the write.
- `delete`: denied.

### 8.3 `businesses/{businessId}`

| Field | Type | Writer | Notes |
| --- | --- | --- | --- |
| `id` | string | system | Document id. |
| `name` | string | owner, admin, manager | Unicode, 2–80 characters, no control characters. |
| `slug` | string | system | ASCII, immutable in Phase 1. |
| `categoryId` | string | owner, admin, manager | Must match an id in `platformSettings/global`. |
| `description` | string | owner, admin, manager | 0–2000 characters. |
| `contact.email` | string | owner, admin, manager | Required at creation. May differ from the owner's login email. |
| `contact.phone` | string or null | owner, admin, manager | E.164 or null. |
| `contact.website` | string or null | owner, admin, manager | `https` URL, max 200 characters, or null. |
| `address.line1` | string | owner, admin, manager | Required, max 120. |
| `address.line2` | string or null | owner, admin, manager | Max 120. |
| `address.city` | string | owner, admin, manager | Required, max 80. |
| `address.region` | string or null | owner, admin, manager | State or province, max 80. |
| `address.postalCode` | string or null | owner, admin, manager | Max 16. Optional because some countries do not use one. |
| `address.country` | string | owner, admin, manager | ISO 3166-1 alpha-2. Validated against the committed list in `shared/data/countries.ts`. |
| `timezone` | string | owner, admin | IANA name validated on the server with `Intl`. |
| `currency` | string | owner, admin | ISO 4217 code present in platform settings. |
| `language` | string | owner, admin | BCP 47 present in platform settings. |
| `logoPath` | string or null | system | Storage path or null. |
| `coverImagePath` | string or null | system | Storage path or null. |
| `status` | `"active"` or `"suspended"` | super-admin function | Created as `active`. |
| `verificationStatus` | `"unverified"`, `"pending"`, `"verified"`, `"rejected"` | super-admin function | Created as `unverified`. |
| `ownerId` | string | system | Uid of the creator. Immutable. Informational. Authorization uses the membership, not this field. |
| `settings.bookingApprovalMode` | `"manual"` | system | Only legal value in Phase 1. Stored so Phase 2 inherits the blueprint default. |
| `settings.notificationEmail` | string or null | owner, admin | Optional. |
| `settings.publicProfileEnabled` | boolean | system | Created `false`. No Phase 1 control, because public pages do not exist yet. |
| `createdAt` | timestamp | system | |
| `updatedAt` | timestamp | system | |
| `createdBy` | string | system | Uid of the creator. |

**Ownership.** The business is the tenant. Members act through membership. The owner membership is the control relationship; `ownerId` is a denormalized copy so super-admin can show an owner without an extra query, and functions keep it equal to the owner membership.

**Security.**

- `get`: an active member of this business, or an active platform admin.
- `list`: an active platform admin only. A member loads their businesses by id after reading their own memberships. A collection query of `businesses` would be rejected for them, which is the intended rules behavior.
- `create`, `update`, `delete`: denied to every client, including a super-admin using the client SDK.

Suspended businesses remain readable by their members so the shell can explain the suspension. Functions reject profile and settings updates while `status != "active"`.

### 8.4 `businessMembers/{businessId}_{userId}`

One document per person per business. The id format makes a duplicate membership impossible and gives rules a direct path.

| Field | Type | Writer | Notes |
| --- | --- | --- | --- |
| `id` | string | system | `{businessId}_{userId}`. |
| `businessId` | string | system | |
| `userId` | string | system | |
| `role` | `"owner"`, `"admin"`, `"manager"`, `"staff"` | system | Phase 1 creation writes `owner` only. |
| `status` | `"active"` or `"revoked"` | system | Phase 1 writes `active`. Revocation is a Phase 2 team action. |
| `createdAt` | timestamp | system | |
| `updatedAt` | timestamp | system | |
| `createdBy` | string | system | Uid, or `"system"` for a seed. |
| `revokedAt` | timestamp or null | system | Null in Phase 1. |
| `revokedBy` | string or null | system | Null in Phase 1. |

**Ownership.** The document is relationship data shared by the user and the business. Neither party deletes it from the client.

**Security.**

- `get`: the member themselves, an active platform admin, or an active owner/admin/manager of the same business (staff directory read).
- `list`: three shapes, because rules are not filters. A query is allowed only when its constraints match a rule.
  - `where("userId", "==", caller)` for the caller's own memberships.
  - an active platform admin, unconstrained.
  - `where("businessId", "==", id)` when the caller is an active owner, admin, or manager of `id`.
- If emulator tests show that the third shape is rejected because the rule's `get()` depends on `resource.data.businessId`, Phase 1 adds a `listBusinessMembers` callable instead of weakening the rule. The cross-tenant tests stay either way.
- `create`, `update`, `delete`: denied to every client.

A user with no memberships is a normal account. Phase 1 does not create a `customers` document for them. "Customer" in the blueprint's role list is the future customer-account experience, not a flag on `users`.

### 8.5 `businessSlugs/{slug}`

| Field | Type | Writer | Notes |
| --- | --- | --- | --- |
| `slug` | string | system | Document id. Lowercase ASCII. |
| `businessId` | string | system | |
| `createdAt` | timestamp | system | |

**Security.** All client reads and writes are denied. Availability checks go through `checkSlugAvailability`, which returns a boolean and does not return `businessId`.

**Slug rules.** Pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, length 3–48. The wizard may suggest a slug by lowercasing the business name and dropping characters outside that pattern. If the name has no ASCII letters, the suggestion is empty and the person types one. Names themselves stay Unicode, so a Sinhala or Tamil business name is valid ([OQ-14](#oq-14-unicode-business-names-and-ascii-slugs)).

The reserved set is the union of a code-level minimum and `platformSettings.reservedSlugs`. The code-level minimum cannot be removed by editing settings, because those words collide with routes:

`admin`, `super-admin`, `superadmin`, `login`, `register`, `account`, `search`, `api`, `auth`, `onboarding`, `dashboard`, `settings`, `new`, `edit`, `magemai`, `mavixas`, `www`, `app`, `null`, `undefined`.

`register` is reserved so `/business/register` remains the wizard. No pilot slug is reserved.

Changing a slug in a later phase is a transaction that creates the new reservation and deletes the old one. Phase 1 does not offer the edit.

### 8.6 `platformSettings/global`

A single document. The seed script writes it. Phase 1 has no settings editor in the product UI.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `"global"` | |
| `supportedCountries` | string[] | ISO alpha-2 codes pinned to the top of the country control. Bounded. Any code in `shared/data/countries.ts` is still valid, so this list is a highlight, not a second allow-list. |
| `supportedCurrencies` | string[] | ISO 4217. Seed: `LKR`, `USD`, `EUR`, `GBP`, `INR`, `AUD`, `CAD`, `SGD`. |
| `supportedLanguages` | string[] | Seed: `["en"]`. |
| `defaultCountry` | string | `LK`. |
| `defaultCurrency` | string | `LKR`. |
| `defaultLanguage` | string | `en`. |
| `defaultTimezone` | string | `Asia/Colombo`. |
| `businessCategories` | `{ id: string, label: string }[]` | Bounded curated list. Ids are stable. Businesses store the id. |
| `reservedSlugs` | string[] | Extra reserved slugs. Bounded. |
| `maintenanceMode` | boolean | Seed `false`. The app reads it in a later phase. |
| `updatedAt` | timestamp | |
| `updatedBy` | string or null | Uid of the operator, or `"system"`. |

Seed categories (ids): `photography`, `videography`, `drone`, `events`, `beauty`, `music`, `venues`, `consulting`, `education`, `fitness`, `wellness`, `home-services`, `other`. The list covers the initial creative and event market and other appointment businesses. `other` is required so onboarding is never stuck. The UI labels come from this document, not from a photography-specific enum in components.

**Security.**

- `get` of `global`: any signed-in user. Onboarding needs the category, currency, and language lists.
- `get` of any other id: an active platform admin only, so a future private settings document is not readable by every user.
- `list`: an active platform admin only.
- client writes: denied.

### 8.7 `platformAdmins/{uid}`

The document id is the Firebase Auth uid. This collection is the authoritative record of who may administer the platform. The custom claim `superAdmin: true` is a navigation hint. A sensitive read or a privileged callable also requires this document to exist and to say `status == "active"`.

| Field | Type | Writer | Notes |
| --- | --- | --- | --- |
| `id` | string | Admin SDK | Same as the document id and the Auth uid. |
| `status` | `"active"` or `"revoked"` | Admin SDK | Any other value, and a missing document, deny platform access. |
| `grantedBy` | string | Admin SDK | Email of the service account that granted or re-granted. |
| `grantedAt` | timestamp | Admin SDK | Server time of the grant or of the latest re-grant. |
| `revokedBy` | string or null | Admin SDK | Null while `active`. Service-account email once revoked. |
| `revokedAt` | timestamp or null | Admin SDK | Null while `active`. |
| `reason` | string or null | Admin SDK | Null while `active`. Required when `status` is `revoked`. |

A re-grant sets `status` back to `active`, writes new `grantedBy` and `grantedAt`, and clears `revokedBy`, `revokedAt`, and `reason`. The earlier revocation stays in `auditLogs`. The script does not delete the document.

**Ownership.** The platform owns the document. The person it names cannot edit it.

**Security.**

- Client create, update, and delete are denied for every caller, including an active platform admin using the client SDK and including a super-admin custom claim.
- Client `get`: a signed-in user may read their own document, so the shell can show a 403 when the registry is revoked while the ID token still carries `superAdmin`. An active platform admin may read any document in the collection.
- Client `list`: an active platform admin only.
- Security-rule `exists()` and `get()` inside `isActivePlatformAdmin()` read this document even when a client read of someone else's document would be denied. That is what rejects a stale token.

### 8.8 `auditLogs/{auditLogId}`

Append-only. The document id is an auto-id. Phase 1 writes an audit row in the same transaction as the change it describes, except the storage-token trigger, which does not audit ordinary uploads (the image callable writes the audit).

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | |
| `scope` | `"platform"` or `"business"` | |
| `businessId` | string or null | Required when `scope` is `business`. Null for platform actions. |
| `actorId` | string | Uid, or `"system"`. |
| `actorType` | `"user"`, `"super_admin"`, `"system"` | |
| `action` | string | Closed catalog below. |
| `targetType` | `"business"`, `"user"`, `"membership"`, `"platformSettings"`, `"superAdmin"` | |
| `targetId` | string | |
| `summary` | string | One line, no secrets, no file bytes. |
| `metadata` | map | Small before/after values such as `{ "from": "active", "to": "suspended" }`. No nested copies of a whole business. |
| `createdAt` | timestamp | Server time. |

Phase 1 action catalog:

| Action | When |
| --- | --- |
| `business.create` | Onboarding transaction |
| `business.profile.update` | Profile callable |
| `business.settings.update` | Settings callable |
| `business.image.update` | Logo or cover linked |
| `user.avatar.update` | Avatar linked |
| `business.status.update` | Suspend or reactivate |
| `business.verification.update` | Verification change |
| `platform_settings.seed` | Seed script |
| `super_admin.provision` | Registry set to `active` and the claim set. Metadata records `grantedBy`. A re-grant sets `metadata.regrant` true. |
| `super_admin.revoke` | Registry set to `revoked`, refresh tokens revoked, then the claim removed. Metadata records `reason`, `revokedBy`. |

Self-service edits to display name, phone, and locale are not audit events in Phase 1 ([OQ-15](#oq-15-what-is-audited)).

**Ownership.** Platform logs belong to the platform. Business logs belong to that tenant for reading, and to the platform for retention.

**Security.**

- Client create, update, and delete: denied, including for super-admins using the client SDK.
- `get` and `list`: an active platform admin may read every log. A token that still contains `superAdmin` while the registry is `revoked` cannot.
- A business owner or admin may read a log only when `scope == "business"` and `businessId` is a business they actively administer. The query must filter on both fields.
- Managers, staff, and non-members cannot read audit logs.
- The Admin SDK bypasses these rules. No function or script deletes logs. Retention is indefinite in Phase 1 ([OQ-16](#oq-16-audit-retention)).

### 8.9 Future collections (relationships only)

These are not created in Phase 1. No security rules, indexes, or screen should reference them yet. When a later phase adds one, it gets a field-level spec and rules tests in that phase.

| Future collection | Relationship | Access intent |
| --- | --- | --- |
| `businesses/{id}/services` | Owned by the business. Referenced by packages and bookings. | Members with a service permission. Public read only of documents explicitly published, in Phase 3. |
| `businesses/{id}/packages` | Owned by the business. References that business's services. | Same as services. |
| `businesses/{id}/bookings` | Owned by the business. References a service or package, a customer, and optionally a staff uid. | Business members with a booking permission, and the customer who owns the request, through a rule that does not expose other customers. |
| `businesses/{id}/customers` | CRM record owned by one business. May point at a platform uid. The same person at two businesses is two customer documents. | That business only, unless a later collaboration feature shares a specific field. |
| `businesses/{id}/payments` | Owned by the business. References a booking and a customer. Append-only ledger. | Narrow finance permission. |
| `businesses/{id}/invoices` | Owned by the business. References a booking and a customer. Snapshot, not a live join. | Finance permission, plus the customer for their own invoice. |
| `businesses/{id}/expenses` | Owned by the business. | Finance permission. |
| `businesses/{id}/availability` | Owned by the business. May reference a staff uid. | Members. Anything shared outward is a redacted busy/free projection, defined in Phase 5. |
| `businesses/{id}/resources` | Bookable assets owned by the business (rooms, equipment). Referenced by availability and bookings. | Members. |
| `collaborationGroups/{groupId}` | Root, because a group spans businesses. | Group members. Membership in a group does not grant a business role. |
| `collaborationMembers/{id}` | Links a user or a business to a group, with a collaboration role. | That group. |
| `collaborationInvitations/{id}` | Invitation to a group. Accepted or rejected by the invitee. | Sender and invitee. |
| `sharedProjects/{projectId}` | Owned by a collaboration group. References participating businesses. | Accepted participants. |
| `projectAssignments/{id}` | Links a project to a participant. Effective only after acceptance. | That project. |
| `reviews/{id}` | Written by a user about one booking at one business. One review per eligible booking. | Public read of published reviews is a Phase 6 decision. |
| `notifications/{id}` | Owned by the recipient uid. May reference a `businessId`. | The recipient. |

Business-to-business reads are not implied by any of these relationships. A later phase that shares data defines the shared fields and a test where the neighboring business cannot read the rest.

## 9. Membership model

A person may:

- own several businesses
- hold a non-owner role at a business they do not own (data model and rules; the invitation UI is Phase 2)
- belong to collaboration groups (Phase 5), without those groups making them staff
- later be the platform user behind a business's customer record (Phase 2–3)

Phase 1's user-facing way to hold two memberships is to complete onboarding twice. The switcher lists every active membership. Tests that need an admin, manager, or staff membership create that document with the Admin SDK through the emulator. They do not go through a hidden UI.

Invariants enforced by `createBusiness` and reserved for the Phase 2 role functions:

- A business has exactly one `owner` membership.
- The creator receives `owner`. The payload's role is ignored.
- A client cannot insert a membership.
- Phase 1 has no ownership transfer and no second owner.
- An admin, once invites exist, cannot assign or revoke `owner`.
- The last owner cannot be revoked.
- `status: "revoked"` is the end of access. Rules treat anything other than `active` as no access.
- Creating a business is capped at 10 successful creations per user in a rolling 24 hours and 25 owner memberships total ([OQ-13](#oq-13-how-many-businesses-one-person-may-create)). Before it commits, the callable queries businesses with this `ownerId`, including `createdAt` for the 24-hour window, and returns `resource-exhausted` when either cap is hit.

Staff invitations, acceptance, and revocation are Phase 2. The fields `revokedAt` and `revokedBy` exist so that phase does not need a new collection.

## 10. RBAC

Permissions are explicit strings in `shared/permissions`. Roles map to permissions. Call sites check a permission, not a raw role, except the single rule "this role is `owner`" where ownership itself matters.

### 10.1 Platform

| Permission | Super-admin |
| --- | --- |
| `platform.users.read` | yes |
| `platform.businesses.read` | yes |
| `platform.businesses.setStatus` | yes |
| `platform.businesses.setVerification` | yes |
| `platform.audit.read` | yes |
| `platform.settings.read` | yes |

Super-admin is not a business role and is not stored on `businessMembers` or on `users`. The permission is granted only when `platformAdmins/{uid}.status` is `active` and the ID token carries `superAdmin: true`. The registry is the half that can be revoked immediately. The claim is the half the shell uses to show navigation. Holding either one does not write an owner membership and does not grant Storage reads.

### 10.2 Business

| Permission | Owner | Admin | Manager | Staff |
| --- | --- | --- | --- | --- |
| `business.profile.read` | yes | yes | yes | yes |
| `business.profile.update` | yes | yes | yes | |
| `business.settings.read` | yes | yes | yes | |
| `business.settings.update` | yes | yes | | |
| `business.image.update` | yes | yes | yes | |
| `membership.list` | yes | yes | yes | |
| `audit.business.read` | yes | yes | | |
| `dashboard.access` | yes | yes | yes | yes |

Empty cells are denied. There is no `business.delete`. Suspension is the platform permission `platform.businesses.setStatus`.

Phase 2 will add permissions such as `membership.invite`, `membership.updateRole`, and `membership.revoke` on this same map. Admin will be unable to change an owner membership. Those permissions are not implemented and not checked anywhere in Phase 1.

UI, functions, and rules share this matrix. The functions import the TypeScript map. The rules encode the same allow and deny with role lists. The parity tests fail if a role can pass a rule for an action the map denies.

### 10.3 Collaboration roles

Group owner, group admin, and group member are Phase 5. They are not Phase 1 roles and they never imply a business role.

## 11. Custom claims, the admin registry, and membership documents

Three mechanisms answer three questions. Sensitive platform access uses the first two together. Business access uses the third.

| | Custom claim `superAdmin` | `platformAdmins/{uid}` | Membership document |
| --- | --- | --- | --- |
| Question it answers | Should the shell show platform navigation? | Is this person an active platform admin right now? | What may this person do at this business? |
| Where it is checked | The React route guard only | Rules, via `isActivePlatformAdmin()`, and every privileged callable | Rules and business callables |
| Freshness | Stale until the ID token refreshes, up to one hour | The next request sees `revoked` | The next request sees a revocation |
| Who can set it | Admin SDK in the operator script | Admin SDK in the same script | Admin SDK inside `createBusiness` |
| Sufficient on its own for a platform read | No | No. The rule also requires the claim. | Not a platform grant |

Business id, business role, and permission lists are not written into the token. A token cannot list every business a person may join, and a removed member would keep that copy until refresh.

The claim is not copied onto the user document. A boolean there would invite a later rule to trust a field a client might try to write. `platformAdmins` is a separate collection with client writes denied, which is why the registry can be the authorization record and the user profile cannot.

The admin UI shows super-admin navigation from `getIdTokenResult().claims.superAdmin`. That check is cosmetic. If the registry is `revoked`, the platform queries fail and the shell renders the 403 state even though the nav was offered. `setBusinessStatus` and `setBusinessVerification` call `assertActivePlatformAdmin` on every invocation: the Admin SDK reads the Auth user and requires `customClaims.superAdmin == true`, then reads `platformAdmins/{uid}` and requires `status == "active"`. Either miss returns `permission-denied`. The function does not cache that result across calls.

`revokeRefreshTokens` runs during revocation so the client cannot mint a new ID token from its refresh token. An ID token that was already issued stays valid until it expires, which is at most one hour. The registry check is what denies that token. Removing the claim without first revoking the registry would leave the old token authorized. The script therefore writes `status: "revoked"` before it touches tokens or claims (section 17.3).

## 12. Active business context

The browser holds `activeBusinessId` so the shell knows which name to show. Authorization uses a different input.

**On a read,** the client requests a specific document, for example `businesses/abc`. The rule loads `businessMembers/abc_{uid}`. The value stored in `localStorage` is not part of the request. If `abc` is another tenant, the `get()` does not find an active membership and the read fails.

**On a write,** the callable receives a `businessId` argument. The function:

1. Requires a verified caller whose user document is `active`.
2. Loads `businessMembers/{businessId}_{uid}` with the Admin SDK.
3. Requires `status == "active"` and a role that the shared map allows for this action.
4. Loads the business and requires `status == "active"` for member edits.
5. Ignores any `role`, `ownerId`, `status`, or `verificationStatus` in the payload.
6. Writes the change and the audit row in one transaction.

A caller who is an owner of business A and passes business B's id is rejected at step 2. Tests XT-1 through XT-25 in section 20 exercise tenant isolation and platform-admin revocation.

Privileged platform callables run `assertActivePlatformAdmin` before the membership checks above, and they do not consult a membership at all. A stale `superAdmin` claim with a revoked registry fails that helper.

Switching businesses never writes a membership and never changes a claim.

## 13. Slug uniqueness

Firestore has no unique-field constraint. The slug is unique because it is a document id in `businessSlugs`.

`createBusiness` runs one transaction:

1. Reject the call unless the token is verified and the user document is `active`.
2. Parse the payload with the shared Zod schema. Drop privileged fields.
3. Normalize and validate the slug, including the reserved set.
4. `get(businessSlugs/{slug})`. If the reservation exists, load the business it points at. When `ownerId` is the caller, return that business (a double submit is idempotent). When `ownerId` is someone else, abort with `already-exists`.
5. Create `businessSlugs/{slug}`, `businesses/{newId}`, `businessMembers/{newId}_{uid}` with role `owner`, and an audit row `business.create`.

A double-click cannot create two businesses with one slug. Two different users cannot take the same slug. The business document's `slug` field is written only inside this transaction, so it cannot drift from the reservation.

## 14. Time, currency, and money

**Instants.** `createdAt`, `updatedAt`, `lastLoginAt`, and audit `createdAt` are UTC instants. The server writes them. A client-supplied timestamp on a privileged write is discarded because the client cannot perform that write.

**Civil time.** `business.timezone` is the IANA zone used whenever a screen shows an instant that belongs to that business, and whenever a later phase decides what "today" means for bookings or reports. Platform audit rows have no business; the super-admin list labels them in UTC. The viewer's laptop zone is not used for business records.

The server validates timezones with `Intl.supportedValuesOf("timeZone")` on Node 24. A zone the browser offers and the server rejects fails onboarding with `invalid-argument`.

**Currency.** The business stores an ISO 4217 code. The onboarding form pre-selects `platformSettings.defaultCurrency` (`LKR`) and the person can choose any code in `supportedCurrencies`. The code is configuration, not an amount.

**Money.** Phase 1 persists no monetary amount. The contract for Phase 4, recorded now so invoices do not start from floats:

- Store `amountMinor` as an integer and `currency` as ISO 4217.
- The exponent comes from ISO 4217. LKR, USD, EUR, GBP, INR, AUD, CAD, and SGD use exponent 2. A later currency with exponent 0 or 3 uses that currency's exponent. The code must not assume 2 for every code.
- `1_500_000` minor units of LKR display as LKR 15,000.00.
- Formatting uses `Intl.NumberFormat`. Arithmetic stays on integers.
- The blueprint's illustration (amount `15000` displayed as LKR 15,000.00) does not name its unit. [OQ-2](#oq-2-money-units) records that conflict. The owner approved integer minor units. Phase 1 stores no amounts. The field name will be `amountMinor` when money arrives.

Historical payment and invoice rows, when they exist, are append-only and keep their own currency and amount. Changing a business's default currency later does not rewrite them.

## 15. Firestore rules strategy

Rules are default-deny, version 2. A missing match denies. `if false` does not override a different match that allows; tests cover the sensitive paths directly rather than trusting a catch-all.

Helpers:

- `isSignedIn()` — `request.auth != null`
- `platformAdminPath()` — `/databases/$(database)/documents/platformAdmins/$(request.auth.uid)`
- `isActivePlatformAdmin()` — the platform-read gate. The claim is required and is not sufficient:

```text
function isActivePlatformAdmin() {
  return isSignedIn()
    && request.auth.token.superAdmin == true
    && exists(/databases/$(database)/documents/platformAdmins/$(request.auth.uid))
    && get(/databases/$(database)/documents/platformAdmins/$(request.auth.uid)).data.status == 'active';
}
```

`&&` stops at the first false term, so a missing claim does not read the registry, and a missing document does not read `.data`. `exists` before `get` keeps a missing document from failing the whole rules expression. A document whose `status` is `revoked` makes the function false while `request.auth.token.superAdmin` is still true. That is the stale-token case (XT-24).

No `allow` rule may treat `request.auth.token.superAdmin == true` as enough on its own. There is no helper named for the claim alone, so a later edit cannot call one by mistake.

- `membershipPath(businessId)` — `/databases/$(database)/documents/businessMembers/$(businessId + '_' + request.auth.uid)`
- `membershipExists(businessId)` — `exists()` before any `get()`, so a missing membership denies that clause instead of erroring the whole expression
- `membership(businessId)` — `get()` after `exists()`
- `isActiveMember(businessId)` — exists, `status == "active"`
- `roleIs(businessId, roles)` — active member whose `role` is in the list

A member allow touches the membership document (`exists` plus `get`). A platform allow touches `platformAdmins/{uid}` the same way. An allow that ORs the two can touch both, which stays inside the ten-document access limit. Rules do not loop and do not scan a collection.

| Path | Client read | Client write |
| --- | --- | --- |
| `users/{uid}` | Self `get`, or active platform admin `get`/`list` | Create denied. Self update of the allow-list in 8.2. |
| `businesses/{id}` | Active member `get`, or active platform admin `get`/`list` | Denied |
| `businessMembers/{id}` | The shapes in 8.4 | Denied |
| `businessSlugs/{slug}` | Denied | Denied |
| `platformSettings/global` | Any signed-in `get` | Denied |
| `platformSettings/{other}` | Active platform admin | Denied |
| `platformAdmins/{uid}` | Own `get` if signed in. Any `get`, and `list`, if an active platform admin. | Denied |
| `auditLogs/{id}` | Active platform admin, or owner/admin of that business for `scope == "business"`. Managers and staff cannot read the log. | Denied |
| anything else | Denied | Denied |

Rules do not grant access because an id is hard to guess. They do not read a role from the request body. They do not treat `ownerId` on the business as proof of ownership.

App Check enforcement is configured in the Firebase console for production Firestore, Storage, and Functions (App Check is not a substitute for these rules). The emulator and the rules unit tests do not use App Check. Local manual runs use a debug token, documented in [setup.md](./setup.md).

Indexes committed in `firestore.indexes.json`:

| Collection | Fields |
| --- | --- |
| `businessMembers` | `userId` ASC, `status` ASC |
| `businessMembers` | `businessId` ASC, `status` ASC |
| `businesses` | `ownerId` ASC, `createdAt` DESC |
| `businesses` | `status` ASC, `createdAt` DESC |
| `businesses` | `verificationStatus` ASC, `createdAt` DESC |
| `auditLogs` | `scope` ASC, `createdAt` DESC |
| `auditLogs` | `businessId` ASC, `createdAt` DESC |
| `users` | `createdAt` DESC |

Single-field indexes that Firestore creates automatically are left automatic.

## 16. Storage rules strategy

The live default bucket is `magemai.firebasestorage.app` in `us-east1`. That location is deliberate: it is the no-cost Storage tier, and the bucket stays there. Do not create a second bucket in `asia-south1`. Avatar, logo, and cover bytes live in the United States. Firestore and the other functions stay in `asia-south1`.

The Storage emulator does not model that split. It stores objects in `<project>.appspot.com` (`demo-magemai.appspot.com` in tests). `defaultBucket()` in `functions/src/storage.ts` selects the appspot name when `FIREBASE_STORAGE_EMULATOR_HOST` is set. On the live project it selects `magemai.firebasestorage.app`, including when `FIREBASE_CONFIG` still names the legacy `magemai.appspot.com` bucket. The trigger itself does not hardcode a bucket, so the emulator listens to the appspot bucket and a live deploy listens to the default bucket.

### 16.1 Paths

| Path | Phase 1 contents | Read | Write |
| --- | --- | --- | --- |
| `users/{userId}/avatar` | One avatar object | Any signed-in user | That user only |
| `businesses/{businessId}/brand/logo` | One logo | Active member of that business | Owner, admin, manager |
| `businesses/{businessId}/brand/cover` | One cover | Active member of that business | Owner, admin, manager |
| `businesses/{businessId}/private/**` | Reserved for later private files | Denied | Denied |
| any other path | — | Denied | Denied |

Object names are fixed. The client does not choose a filename, which removes path traversal and leftover objects. Replacing a logo overwrites the same path.

"Brand" is not public. Unauthenticated reads are denied. Public marketplace images are a Phase 3 change: a specific allow rule for businesses that are active and `publicProfileEnabled`, reviewed in that phase. Phase 1 leaves `publicProfileEnabled` false and has no public rule.

Super-admins do not get a Storage allow. Operator inspection of a private file would be a later, audited break-glass. It is not part of Phase 1 ([OQ-11](#oq-11-super-admin-access-to-files)).

Avatars are readable by any signed-in user so a member list can show a face without a cross-business membership lookup, which Storage rules cannot express cleanly. Avatars are profile photos, not documents. The private prefix is where sensitive files will go, and it is denied now so the test exists before those files do.

### 16.2 Upload validation

Rules reject the upload unless all of the following hold:

- Content type is `image/jpeg`, `image/png`, or `image/webp`.
- Size is greater than 0, at most 2 MiB for an avatar or logo, and at most 5 MiB for a cover.
- The caller passes the membership check for that path.

SVG is rejected because a later public serve could treat it as HTML. GIF and HEIC are rejected ([OQ-17](#oq-17-phone-photos-and-heic)). The UI tells the person to choose a JPEG, PNG, or WebP.

The callable that links the image repeats the metadata check with the Admin SDK. Rules are the gate on the bytes; the function is the gate on the Firestore path.

### 16.3 Download tokens

The Firebase client SDK attaches a `firebaseStorageDownloadTokens` metadata value on upload. A URL that includes that token serves the object without evaluating Storage rules. Storing download URLs in Firestore, or calling `getDownloadURL`, would make the rules irrelevant for anyone who sees the URL.

Phase 1 therefore:

- Stores the object path only.
- Runs `stripDownloadTokens` on finalize in `us-east1` (`STORAGE_REGION` in `shared/firebase/region.ts`), and strips again inside `setBusinessImage` and `setUserAvatar`, which stay in `asia-south1`.
- Displays images by reading bytes through the SDK (`getBlob`) and creating an object URL.
- Forbids `getDownloadURL` in application code. Step 10 includes a repository search for that call.

The exact Admin SDK call that clears the token is confirmed against the emulator in step 9, because SDK versions differ on whether the key is deleted or set to an empty value. The acceptance test is the behavior: after upload, a non-member SDK read fails, and the download-token metadata is absent.

## 17. Super-admin authorization and provisioning

### 17.1 What super-admin can do in Phase 1

- Read the user list, the business list, and audit logs.
- Set a business to `active` or `suspended`.
- Set verification to `unverified`, `pending`, `verified`, or `rejected`.

User rows are read-only. There is no "make this user a super-admin" button, no role dropdown, and no user-disable action ([OQ-10](#oq-10-user-administration-in-phase-1)). Verification in Phase 1 is the status field. Document upload and review workflows belong to the later verification work in the blueprint ([OQ-9](#oq-9-what-verification-means-in-phase-1)).

Every status and verification change writes `business.status.update` or `business.verification.update` with `actorType: "super_admin"` and the previous and next values. A no-op (setting the value the business already has) does not write a second audit row.

### 17.2 What cannot grant super-admin

- The registration form, including extra JSON fields.
- Google sign-in.
- A write to `users/{uid}`, `businessMembers`, or `platformAdmins` from the client SDK. Rules deny every client write to `platformAdmins`.
- A callable, including one restricted to existing super-admins.
- Owning a business.
- Setting the custom claim without an active registry document, or writing the registry without the claim. Platform reads require both.
- Hand-editing `platformAdmins` in the Firebase console. The console uses credentials that bypass rules, so a console write can change the document, and it will not set the claim or write the audit row. That is not the supported procedure. The supported procedure is the script below, which keeps the registry, the claim, and the audit row together.

### 17.3 Provisioning and revocation

The only supported grant and revoke path is `scripts/provision-super-admin.ts`, run by an operator with service credentials. Step 8 implements the script. There is no in-app control and no callable.

```text
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run provision:super-admin -- --project <firebase-project-id> --email <email>
```

Revoke, with a reason:

```text
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run provision:super-admin -- --project <firebase-project-id> --email <email> \
  --revoke --reason "<why this access ends>"
```

The script refuses to start unless `GOOGLE_APPLICATION_CREDENTIALS` points at a file outside the repository and `--project` and `--email` are present. `--revoke` also requires a non-empty `--reason`. It prints the project id, the project number, and the email. The operator must type the project id and the project number. For `magemai` the number has to be `122706427013`. A mismatch exits without writing. `grantedBy` and `revokedBy` are the service-account email.

#### Grant order

1. Load the Auth user by email. If there is no such user, create one with a randomly generated password that is printed once, and set `emailVerified` true. The person then uses password reset to choose a password. The operator may instead create the user in the Authentication console first and then run the script. The public registration form is not involved.
2. Create or update `users/{uid}` system fields through the Admin SDK. Do not add an admin field to that document.
3. Upsert `platformAdmins/{uid}` to `status: "active"`. On a first grant, set `grantedBy`, `grantedAt`, and leave `revokedBy`, `revokedAt`, and `reason` null. On a re-grant of a revoked document, set a new `grantedBy` and `grantedAt` and clear the three revocation fields. If the document is already `active`, leave `grantedAt` unchanged.
4. Read existing custom claims, merge `superAdmin: true` without dropping unrelated claims, and call `setCustomUserClaims`.
5. Write an audit row `super_admin.provision` with `scope: "platform"`, `actorType: "system"`, and `metadata.operator` set to the service-account email. A re-grant also sets `metadata.regrant` true.
6. Print that the person must sign out and sign in.

The registry is written before the claim. If the process stops between steps 3 and 4, the document is `active` and the claim is absent. Rules require both, so platform reads stay denied, and the shell has no claim to show. Re-running the script sets the claim.

#### Revoke order

Revocation writes the registry first. That is the step that denies an ID token which still contains `superAdmin: true`.

1. Upsert `platformAdmins/{uid}` to `status: "revoked"`, set `revokedBy` and `revokedAt`, and store `reason`. If no document exists, create it already revoked so a claim-only account is recorded and denied. Do not delete the document. If it is already `revoked`, do not change `revokedAt` or `reason`.
2. Call `revokeRefreshTokens(uid)`. This invalidates refresh tokens. An ID token that was already issued remains valid until its `exp`, at most one hour. The registry from step 1 denies that token anyway.
3. Remove the `superAdmin` key with `setCustomUserClaims`, preserving any unrelated claims.
4. Write an audit row `super_admin.revoke` with the reason and the service-account email. Do not delete the user.

Doing step 3 before step 1 would be unsafe: the old ID token would still carry the claim, the registry would still be `active`, and platform reads would still succeed until the token expired.

#### Idempotence

| Starting state | Grant | Revoke |
| --- | --- | --- |
| No user | Create the user, then grant | Exit 0. There is nothing to revoke. |
| User, no registry, no claim | Write an active registry, set the claim, audit | Write a revoked registry, clear a claim that is already absent, revoke refresh tokens, audit |
| Registry `active`, claim set | Exit 0. Do not change `grantedAt`. Do not write a second audit. | Revoke as above |
| Registry `revoked`, claim absent | Re-grant as above, with a new `grantedAt` and one audit row | Exit 0. Call `revokeRefreshTokens` again (it is safe). Do not change `revokedAt`. Do not write a second audit. |
| Registry and claim disagree | Repair to active registry plus claim, one audit row | Repair to revoked registry, no claim, refresh tokens revoked, one audit row |

#### Partial failure

The script stops at the first error, exits non-zero, and prints the last step that succeeded. Re-running the same command resumes from the stored state.

| Stopped after | Registry | Claim | Platform read with the current token | What the re-run does |
| --- | --- | --- | --- | --- |
| Grant step 3, step 4 failed | `active` | absent | Denied. Both are required. | Sets the claim and writes the audit |
| Grant step 4, step 5 failed | `active` | present | Allowed | Writes the missing audit row |
| Revoke step 1, step 2 failed | `revoked` | still present | Denied, including an old token that still has the claim | Revokes refresh tokens, removes the claim, writes the audit |
| Revoke step 2 or 3, audit failed | `revoked` | removed | Denied | Writes the missing audit row |

A partial grant cannot open platform reads. A partial revoke cannot leave them open.

The service account needs Firebase Authentication Admin and Cloud Datastore User on `magemai` only. A claim or a `platformAdmins` document exists in that project alone. The script prints project id `magemai` and project number `122706427013` and requires the operator to type both before it writes. It refuses to run when `--project` is `magemai` and the typed number is anything else.

Credentials live outside the repo. `.gitignore` rejects `.env` files and service-account JSON. The frontend has no Admin SDK dependency and no code path that accepts a service account.

A second operator is provisioned by running the script again. Existing super-admins cannot mint or revoke further super-admins from the UI.

## 18. Onboarding wizard

The wizard at `/business/register` is available to a verified user. Steps:

1. **Identity.** Business name, slug (availability check on blur and before next), category.
2. **Description.**
3. **Contact.** Contact email required. Phone and website optional ([OQ-12](#oq-12-which-contact-fields-are-required)).
4. **Location.** Country (pre-selected `LK`), line 1, optional line 2, city, optional region, optional postal code, timezone (pre-selected `Asia/Colombo`).
5. **Locale.** Currency and language, pre-selected from platform defaults.
6. **Images.** Logo and cover, both skippable ([OQ-6](#oq-6-logo-and-cover-required)).
7. **Review.** Submit once.

If `displayName` is blank, the wizard asks for it before submit and saves it through the user-profile update. That is the "business owner details" collection. The owner is the signed-in user, not a second record ([OQ-18](#oq-18-where-owner-details-live)).

Submit calls `createBusiness`. The screen stays in a loading state until the function returns, then routes to `/admin`. The new membership is the active business. There is no local-only success state.

On success the stored business has `status: "active"`, `verificationStatus: "unverified"`, `settings.bookingApprovalMode: "manual"`, `settings.publicProfileEnabled: false`, and an owner membership. Verification is a later platform decision; the business can use the dashboard shell immediately ([OQ-4](#oq-4-initial-business-status)).

## 19. Environment configuration

The owner will not create separate development or staging Firebase projects. `magemai` is the only cloud project. The app and a production build use it unless the emulator flag is exactly `true`. Rules tests and CI Playwright stay on the Emulator Suite.

| | Value |
| --- | --- |
| Cloud project id | `magemai` |
| Project number | `122706427013` |
| Support email | `mavixas.ceo@gmail.com` |
| Billing | The owner is upgrading this project to Blaze. Budget alerts are required before the first functions deploy (section 22). |
| Firestore and Functions region | `asia-south1` (D13). `stripDownloadTokens` is the exception, in `us-east1`. |
| Storage bucket | `magemai.firebasestorage.app` in `us-east1` (no-cost tier) |
| Assigned hostnames | `magemai.web.app` and `magemai.firebaseapp.com` |
| App default | live project `magemai` |

Those two hostnames are the ones Firebase assigns to project id `magemai`. They are not a custom domain. D12 still forbids any other hostname. The public web config (API key, app id, and the rest of the `VITE_FIREBASE_*` values) is not in the repository. It is added later in a gitignored env file.

| Work | Project | Rule |
| --- | --- | --- |
| `npm run dev` and a production build | `magemai` | Default. Public web config stays in gitignored `.env.local`. |
| Rules tests and `npm run test:e2e` | `demo-magemai` on the Emulator Suite | Required for `@firebase/rules-unit-testing` and for CI. |
| `deploy:rules`, `deploy:functions`, `deploy:hosting`, and `seed:platform-settings` | `magemai` | Run by the owner on their PC. CI does not run them. |

`.firebaserc` sets `default` to `magemai`. The alias `demo` is `demo-magemai`. Emulator scripts still pass `--project demo-magemai` themselves. Deploy scripts pass `--project magemai`. There are no `dev`, `staging`, or `prod` aliases. CI does not deploy.

Authorized Auth domains for `magemai` are `localhost`, `127.0.0.1`, `magemai.web.app`, and `magemai.firebaseapp.com`. The OAuth consent screen support email is `mavixas.ceo@gmail.com`. No custom domain is added.

### Safeguards for the single live project

`magemai` holds real data once anyone uses the hosted app. These safeguards are part of the implementation, not optional hygiene:

1. **Live by default.** The full contract is [section 24](#24-live-firebase-by-default). The app connects to `magemai` unless `VITE_USE_FIREBASE_EMULATORS` is exactly `true`. A production build fails, and the client also throws, if that flag is `true`.
2. **Rules tests stay on the emulator.** `npm run test:rules` and `npm run test:e2e` pass `--project demo-magemai` and refuse non-local emulator hosts. They do not load `GOOGLE_APPLICATION_CREDENTIALS`. `npm run test:e2e:live` is a separate operator command and is not part of CI.
3. **No destructive scripts against `magemai`.** No script deletes collections, clears Auth users, imports emulator data, or overwrites the database. If a maintenance script of that kind is added later, it must refuse `--project magemai` outright. Seed and super-admin provisioning are intentional writes, not wipes, and they still require the confirmation below.
4. **Deploys are manual.** `npm run deploy:rules`, `npm run deploy:functions`, and `npm run deploy:hosting` pass `--project magemai` and do not ask for a typed confirmation. CI does not run them. This document does not run a deploy.
5. **Budget alerts before the first functions deploy.** Section 22. The owner is upgrading `magemai` to Blaze. Minimum instances stay at 0.

### Environment variables

Vite modes stay in env files so the project id is data, not a constant in source. Another project can be introduced later by adding a gitignored env file and pointing these variables at it. Application code keeps reading the variables. No second project is part of the current plan.

| File | Mode | Committed | Points at |
| --- | --- | --- | --- |
| `.env.example` | names only | yes, values empty | — |
| `.env.local` | `vite` / local and production build | no | live `magemai` web config |
| `.env.production` | `vite build` | no | `magemai`, emulators off |

Variable names. These are the Firebase *web* config values, which ship in the browser bundle. They are not service credentials. The service account is not one of them.

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_APP_CHECK_SITE_KEY
VITE_GOOGLE_AUTH_ENABLED
VITE_USE_FIREBASE_EMULATORS
VITE_FIREBASE_EMULATOR_HOST
```

Leave `VITE_USE_FIREBASE_EMULATORS` unset for the live project. Set it to `true` only for the emulator suite. A production build fails, and the client throws, if that flag is `true`. `VITE_GOOGLE_AUTH_ENABLED` is `true` only after Google provider is configured; the login screen hides the Google button otherwise.

`VITE_FIREBASE_APP_CHECK_SITE_KEY` is empty locally. A build aimed at `magemai` sets the reCAPTCHA Enterprise site key. The matching secret stays in App Check / Cloud, not in the frontend env file.

Operator-only, never prefixed with `VITE_`, never committed:

```text
GOOGLE_APPLICATION_CREDENTIALS
```

That variable points at a JSON key stored outside the working tree. CI for rules and unit tests uses the emulator and does not receive this variable.

## 20. Testing strategy

A test box in the checklist is checked only after the command has been run and has passed. A skipped test is reported as skipped, with the reason.

### 20.1 Vitest

Pure logic, no emulator:

- Permission map: every role against every Phase 1 permission, including the denied cells.
- Slug normalizer, pattern, length, and reserved words.
- Zod schemas for registration, profile, and each wizard step: valid payloads, missing contact email, bad country, bad currency, bad timezone, bad phone, extra privileged keys stripped or rejected.
- Active-business selection helper: stored id absent from memberships, stored id revoked, no memberships, suspended membership still selectable for the read-only shell.
- Brand module exposes the product name, endorsement, and tagline.

### 20.2 React Testing Library

- Shared loading, empty, and error states render their text and, for error, a retry control.
- Login form: validation, submitting state, error message.
- Verify-email screen when the token is unverified.
- Wizard: cannot advance with an invalid slug; review shows the entered values; images can be skipped.
- Switcher lists two owner memberships and calls the selection handler.
- Dashboard nav renders Coming soon entries as disabled.
- Route guard sends an anonymous user toward login and does not render the dashboard.
- Super-admin nav is absent when the claim is missing, and a direct guard renders the 403 state.
- When the claim is present and the registry read returns `revoked`, the guard renders the 403 state and does not render platform lists.

### 20.3 Playwright

Runs against the Emulator Suite in two projects: a desktop Chromium viewport (1280×800) and a mobile viewport (390×844). A tablet viewport (768×1024) covers the drawer breakpoint. Flows:

- Register, mark the user verified through the Auth emulator, sign in, land on onboarding.
- Complete onboarding, land on `/admin`, see the business name and the owner role.
- Create a second business, switch, and see the second name. The first business's name is not left on screen.
- Sign out, open `/admin` while signed out, land on `/login`.
- Password reset completes using the emulator's out-of-band code.
- A normal user who opens `/super-admin` sees the 403 state.
- A user provisioned in the emulator with the claim and an active `platformAdmins` document sees the user list and the business list.
- A user whose registry is `revoked`, with a test token that still has `superAdmin: true`, does not see those lists.
- Suspend that business as super-admin, sign back in as the owner, see the suspended banner, and confirm the profile form is not editable.
- The audit list shows the suspension.

Google sign-in in Playwright uses the Auth emulator's simulated Google provider. That covers the application path. It does not prove the production OAuth client. The manual Google check is a separate checklist item and stays open until a person runs it on a configured project.

### 20.4 Emulator rules and function tests

`@firebase/rules-unit-testing` against the Firestore and Storage emulators, plus callable tests through the Functions emulator. The seed for every cross-tenant case is:

- User A, owner of business A.
- User B, owner of business B.
- User S, staff of business A (membership written with the Admin SDK).
- User P, no memberships, no claim.
- User SA, custom claim `superAdmin: true`, `platformAdmins/SA` with `status: "active"`, no membership.
- User SR, custom claim `superAdmin: true`, `platformAdmins/SR` with `status: "revoked"`, no membership. SR is the stale-token principal: the claim is still on the token.

| ID | Attempt | Expected |
| --- | --- | --- |
| XT-1 | A `get`s business B | deny |
| XT-2 | A `get`s B's owner membership | deny |
| XT-3 | A lists audit logs with B's `businessId` | deny |
| XT-4 | A reads B's logo through the Storage SDK | deny |
| XT-5 | A writes B's logo path | deny |
| XT-6 | A writes a business document from the client | deny |
| XT-7 | A writes a membership document from the client | deny |
| XT-8 | A writes an audit document from the client | deny |
| XT-9 | A updates their user document with `status` or an unknown admin field | deny |
| XT-10 | P `get`s A's user document and lists `users` | deny |
| XT-11 | A calls `setBusinessStatus` | `permission-denied` |
| XT-12 | S reads A's audit logs | deny |
| XT-13 | A reads A's business audit logs, and A reads a platform audit log | allow, then deny |
| XT-14 | SA, with an active registry, reads business A, business B, users, and platform audit logs | allow |
| XT-15 | SA writes an audit log, a business, a membership, or a `platformAdmins` document from the client SDK | deny |
| XT-16 | Signed-out reads of users, businesses, memberships, settings, `platformAdmins`, audit logs, and brand objects | deny |
| XT-17 | A uploads SVG, HEIC, or a 3 MiB logo to A's brand path | deny |
| XT-18 | A reads or writes `businesses/A/private/secret` | deny |
| XT-19 | After ordinary registration, A's token has no `superAdmin` claim | assert |
| XT-20 | `createBusiness` with a payload that sets `role: "staff"`, `status: "suspended"`, and `verificationStatus: "verified"` | stored role is `owner`, status is `active`, verification is `unverified` |
| XT-21 | SA (claim true, `platformAdmins` status `active`) reads users, businesses, and platform audit logs, and `setBusinessStatus` is authorized | allow |
| XT-22 | P, with no claim and no registry document, reads those platform collections or SA's `platformAdmins` document | deny |
| XT-23 | A principal whose registry is `revoked` and whose token has no `superAdmin` claim reads those platform collections or calls `setBusinessStatus` | deny |
| XT-24 | SR (registry `revoked`, ID token still has `superAdmin: true`) reads those platform collections or calls `setBusinessStatus` | deny |
| XT-25 | P creates or updates `platformAdmins/{any uid}` from the client SDK. The same test asserts SA's client SDK write is denied too | deny |

XT-21 is the positive registry case. XT-14 stays as the cross-tenant read by that same active admin. XT-24 is the revocation property: access ends when the registry says `revoked`, without waiting for the ID token to expire.

Positive cases sit next to these: A can `get` business A, A can list A's memberships, A can upload a small PNG logo, SA can suspend B and the audit row exists, and a staff member can `get` the business but cannot call `updateBusinessSettings`.

CI, added in step 10, runs `firebase emulators:exec` so a green test run includes XT-1 through XT-25. The job uses `demo-magemai` and does not receive service-account credentials for `magemai`. Unit tests and Playwright run inside that wrapper or immediately after it in the same job.

### 20.5 Commands the foundation will wire

The npm script contract is section 24.11: `dev`, `emulators:start`, `emulators:export`, `emulators:reset`, `emulators:seed`, `test`, `test:rules`, `test:e2e`, `typecheck`, `lint`, and `format`. `npm run test:all` remains the CI entry and runs the same suites inside `firebase emulators:exec --project demo-magemai`. None of these scripts deploy, and none of them accept a project id of `magemai`.

Step 4 wired the scripts in section 24.11. `npm run test:rules` currently checks the emulator hosts. The rule cases in section 20.4, and `npm run test:all`, arrive with steps 9 and 10. This document does not claim those cases pass.

## 21. Deployment strategy

There is one deploy target: project `magemai`. Firestore and Cloud Functions are in `asia-south1`, except `stripDownloadTokens`, which deploys to `us-east1` with the Storage bucket. CI does not deploy. The owner runs the npm scripts below from their PC. They do not prompt for a typed project id.

1. In the console, enable the Email/Password provider. Create Firestore in `asia-south1` if it does not exist. Stop if it already exists in another region. Leave the default Storage bucket `magemai.firebasestorage.app` in `us-east1`. A function in `asia-south1` cannot listen to that bucket.
2. Confirm Blaze and the budget alerts in section 22 before the first functions deploy. This document does not enable billing.
3. `npm run deploy:rules` deploys Firestore rules, Firestore indexes, and Storage rules.
4. `npm run deploy:functions` deploys functions. `firebase.json` runs `npm --prefix "$RESOURCE_DIR" run build` before the upload, so a stale `functions/lib` is not what gets deployed. The runtime stays `nodejs24`. There is no 1st gen function. The next deploy deletes the old `onAuthUserCreated` trigger; confirm that deletion. `stripDownloadTokens` can fail once on a new `us-east1` deploy while the Eventarc service agent permissions propagate. Retry the same command. It does not deploy `guardProviderSignIn` unless `MAGEMAI_DEPLOY_BLOCKING_AUTH=true`.
5. `npm run seed:platform-settings` writes `platformSettings/global`. It uses Application Default Credentials.
6. `npm run deploy:hosting` builds the app and deploys Hosting. `.env.local` must be present and must not set the emulator flag.
7. `npm run test:e2e:live`, then `npm run test:cleanup:live`. Live e2e fails until steps 3–5 have been deployed.

Hosting is a single-page app. `index.html` is not cached for long; hashed assets are. All routes rewrite to `index.html`. The live build must have `VITE_USE_FIREBASE_EMULATORS` unset or `false`.

The path to a live deploy is: emulator CI green, then the owner's explicit decision, then the typed confirmation, then the deploy command. There is no staging project in between. A mistake lands in the only cloud project, which is why the confirmation names both the id and the number.

No custom domain, no preview-channel requirement, and no server-side rendering in Phase 1. Public pages in Phase 3 are still a client-rendered SPA until a separate decision to prerender. That decision happens before a large marketplace launch, not during Phase 1.

Scheduled Firestore exports to Cloud Storage are the backup story. They require Blaze and a bucket, and they should be turned on before `magemai` holds real tenant data. They are an operations task, not a Phase 1 feature.

Auth settings on `magemai`: email/password enabled, Google enabled when the OAuth client exists, email enumeration protection on, authorized domains limited to `localhost`, `127.0.0.1`, `magemai.web.app`, and `magemai.firebaseapp.com`.

## 22. Firebase billing

### 22.1 What works on the Spark plan

- Authentication with email/password and Google.
- Cloud Firestore, within the Spark quota. Exceeding a Spark quota turns that product off until the next month or until the project moves to Blaze.
- Cloud Storage and Hosting, within their Spark quotas. The default bucket stays in `us-east1` for that no-cost location.
- Security rules.
- The Emulator Suite, including running Functions locally. Emulators do not bill.

Phone authentication is not used. Spark is enough for the Emulator Suite. `magemai` is moving to Blaze because it will host Cloud Functions.

### 22.2 What needs Blaze

Cloud Functions for Firebase, 1st and 2nd gen, deploy only from a Blaze project. Phase 1's trusted writes, the auth trigger, and the storage trigger are those functions. A Spark project can host the frontend and the database and still cannot run onboarding or suspension in the cloud.

Blaze includes a no-cost monthly allowance for function invocations, compute, and egress. Container storage and the builds that publish functions can still produce small charges inside that allowance, so a Blaze project is not a promise of a zero invoice. Firestore, Storage, and Hosting on Blaze keep a no-cost allowance and then bill for additional use.

`magemai` is the project the owner is moving to Blaze. Automated tests do not need Blaze and do not run against it. There is no second cloud project to upgrade.

### 22.3 Alerts, before the first deploy

On the billing account linked to `magemai`, before any functions deploy:

- A monthly budget chosen by the owner. A pre-launch project often starts with a budget on the order of USD 25–50. The number is the owner's.
- Alerts at 50%, 90%, and 100% of that budget.
- A Cloud Run spend cap. 2nd gen functions run on Cloud Run, so this cap bounds function spend. The cap should stop a runaway deploy without blocking an ordinary release. Minimum instances stay at 0 so idle functions do not bill.

Rules `get()` of a membership adds one document read to each authorized member read. Platform reads add `exists` and `get` of `platformAdmins/{uid}` so revocation is visible before the ID token expires. That extra read is the point of the registry. Super-admin list pages paginate at 25 and use `getCountFromServer` for the overview counts, which is a real aggregation query, not a fabricated number.

No resources are deployed to `magemai` without an explicit owner decision and the typed project-id and project-number confirmation in section 19.

## 23. Open questions and proposed decisions

Each item is a place the blueprint or the instructions left a choice open, or where two lines of the blueprint can be read differently. **Phase 1 will implement the proposed default** unless the owner overrides it before step 4. OQ-1, OQ-2, OQ-20, and OQ-23 were approved in the review of PR #1 and are closed. Overrides of the remaining items are written back into the relevant section of this document.

### OQ-1. Cloud region

**Status.** Approved. Closed. Decision D13.

**Decision.** `asia-south1` (Mumbai) for Firestore and for Functions. It is the closest common single region to Sri Lanka. A multi-region location costs more and is not justified before launch traffic. The Firestore location is permanent. Enable it on `magemai` only in this region.

**Storage exception, recorded 2026-11-20.** The default bucket `magemai.firebasestorage.app` was created in `us-east1` and stays there for the no-cost Storage tier. Avatar bytes live in the United States. Only `stripDownloadTokens` is deployed to `us-east1`. Moving that trigger back to `asia-south1` fails deploy with "A function in region asia-south1 cannot listen to a bucket in region us-east1".

### OQ-2. Money units

**Status.** Approved. Closed. Decision D10.

**Ambiguity that was resolved.** The blueprint requires integer minor units, and its illustration shows amount `15000` displayed as LKR 15,000.00. Those two statements use different units. 15,000.00 LKR is `1500000` minor units when LKR's exponent is 2.

**Decision.** Integer minor units. Phase 1 stores no amounts, only the ISO currency code. The field name will be `amountMinor` when money arrives.

### OQ-3. Email verification gate

**Ambiguity.** The blueprint requires verification and does not say it blocks onboarding.

**Default.** Unverified password users can sign in and can open `/verify-email`. They cannot open the wizard or the dashboard. Callables check the token. Google users pass because the provider verifies the address.

**If overridden.** Dropping the gate means businesses can be created from addresses that do not receive mail, which weakens reset and audit.

### OQ-4. Initial business status

**Ambiguity.** "Initial status" is unnamed. Verification is a separate platform process.

**Default.** `status: "active"` and `verificationStatus: "unverified"`. The owner can use the shell. Nothing is public, because public pages are Phase 3. Super-admin can suspend.

**If overridden.** Creating businesses as `draft` would block the dashboard until a review step exists. That review step is not in Phase 1.

### OQ-5. Who can read business documents in Phase 1

**Ambiguity.** Public profiles are part of the product and are scheduled for Phase 3. Phase 1 still creates the business document.

**Default.** Active members, and platform admins who pass `isActivePlatformAdmin()` (claim plus an active registry document). No public Firestore read and no public Storage read. A stale `superAdmin` claim does not qualify.

**If overridden.** A public read rule has to exclude fields that are not meant for the marketplace, or it will publish contact details early.

### OQ-6. Logo and cover required

**Ambiguity.** The wizard collects both. It does not say they block completion.

**Default.** Both are optional. Onboarding can finish without Storage. Images can be added afterward from the profile page.

**If overridden.** Making them required blocks onboarding on a Storage or permission failure.

### OQ-7. Same email on Google and password

**Ambiguity.** Firebase can throw `account-exists-with-different-credential`. Linking is a sensitive flow the blueprint does not describe.

**Default.** Show an error that names the original sign-in method. Do not link automatically.

**If overridden.** Linking needs its own design and tests. It is not folded into Phase 1 silently.

### OQ-8. Google sign-in interaction

**Ambiguity.** Popup and redirect both work on desktop. Popup is unreliable on mobile browsers, and Phase 1 must work on mobile.

**Default.** `signInWithRedirect` for every viewport.

**If overridden.** Popup-only would need a mobile fallback anyway.

### OQ-9. What verification means in Phase 1

**Ambiguity.** Super-admin manages verification status. A document-submission workflow is described later, under growth features.

**Default.** Super-admin sets the status enum directly. Businesses do not upload verification documents. There is no business-facing "request verification" button.

**If overridden.** A submission workflow is new scope (storage, review queue, states) and belongs in a later phase even if started early.

### OQ-10. User administration in Phase 1

**Ambiguity.** "Activation/suspension" sits next to user listing and business listing.

**Default.** Suspension applies to businesses. The user list is read-only. `users.status = "disabled"` is reserved and unused.

**If overridden.** Disabling a user should call Auth `updateUser` to disable the account and write an audit row. A Firestore-only flag would leave the person signed in.

### OQ-11. Super-admin access to files

**Ambiguity.** Operators can manage businesses. The blueprint also says private files stay private.

**Default.** Super-admin reads business and user documents and audit logs, and cannot read Storage objects. No break-glass download in Phase 1.

**If overridden.** Break-glass needs an audited function that mints a short-lived read, not a standing rules allow.

### OQ-12. Which contact fields are required

**Ambiguity.** "Contact details" does not say which channels are mandatory.

**Default.** Contact email is required. Phone and website are optional. Phone, when present, is E.164.

**If overridden.** Requiring a phone is reasonable and is a one-line schema change before launch. It does not affect tenant isolation.

### OQ-13. How many businesses one person may create

**Ambiguity.** No cap is given. Multiple memberships are required.

**Default.** 10 creations per user per rolling 24 hours, and 25 owner memberships in total. The callable enforces both.

**If overridden.** Caps are constants in the function. Raising them does not change the data model.

### OQ-14. Unicode business names and ASCII slugs

**Ambiguity.** The initial market uses Sinhala and Tamil names. The blueprint's public URLs are ASCII slugs. The sample slug in that illustration is not a reserved tenant.

**Default.** `name` is Unicode. `slug` is ASCII, typed or edited by the user, with a suggestion generated from ASCII letters in the name. No automatic transliteration.

**If overridden.** Unicode slugs need a homoglyph and normalization policy before they are allowed. They should not be turned on by relaxing the regex alone.

### OQ-15. What is audited

**Ambiguity.** "Every privileged administrative action" is required. Ordinary profile edits are not mentioned.

**Default.** Audit the action catalog in section 8.8. Do not audit display-name, phone, or locale edits.

**If overridden.** Adding those events is safe. Removing a catalog event for status or verification would miss an acceptance criterion.

### OQ-16. Audit retention

**Ambiguity.** No retention period is given.

**Default.** Keep audit logs indefinitely. No delete function.

**If overridden.** A retention job has to be an Admin SDK task with its own audit of the deletion, not a client rule.

### OQ-17. Phone photos and HEIC

**Ambiguity.** File types are not listed. Many phone cameras produce HEIC, which browsers display poorly.

**Default.** Accept JPEG, PNG, and WebP only. The UI explains the limit. No server-side image conversion in Phase 1.

**If overridden.** HEIC conversion is a function dependency and a billing consideration. It can be added later without moving existing JPEG objects.

### OQ-18. Where owner details live

**Ambiguity.** The wizard collects "business owner details" and the user profile already holds the person.

**Default.** The owner is the signed-in user. The wizard asks for a display name when it is missing and saves it on `users/{uid}`. No parallel owner subdocument.

**If overridden.** A copy of the owner's name on the business will go stale when the profile changes. Prefer not to copy.

### OQ-19. How a second membership is created in Phase 1

**Ambiguity.** Acceptance requires a user to belong to multiple businesses. Team invitations are Phase 2.

**Default.** The person creates two businesses and is owner of each. The switcher supports that. Admin, manager, and staff exist in the model, the rules, and the emulator tests. There is no invite UI and no "add member" form.

**If overridden.** A minimal invite flow pulls team management forward from Phase 2. It needs acceptance, revocation, and email, and it should be an explicit scope change.

### OQ-20. Confirm the collection layout

**Status.** Approved. Closed. Decision D3.

**Decision.** Root collections for the Phase 1 platform documents in section 8, including `platformAdmins`. Subcollections under `businesses/{businessId}` for future operational data. Membership ids are deterministic.

### OQ-21. Active business in the URL

**Ambiguity.** The blueprint's dashboard routes are `/admin`, not `/b/{businessId}/admin`. A URL that omits the tenant cannot be shared as a link to a specific business.

**Default.** Follow the blueprint. The active business lives in provider state plus `localStorage`, and it is validated as in section 12.

**If overridden.** Putting the business id in the path is a router change. It does not replace the membership check.

### OQ-22. App UI language

**Ambiguity.** Each business stores a language. The product is not yet translated.

**Default.** The interface is English. `business.language` and `users.locale` are stored. No i18n library in Phase 1. The language list seed is `en`.

**If overridden.** Adding translation later is easier if strings already live in components rather than in images. Phase 1 already keeps marketing copy in `brand.ts`.

### OQ-23. Production hostname

**Status.** Approved. Closed. Decision D12.

**Decision.** Use only the `web.app` and `firebaseapp.com` hostnames Firebase assigns. For the live project those are `magemai.web.app` and `magemai.firebaseapp.com`, because the project id is `magemai`. They are recorded in section 19 for that reason. No custom domain is added. A cleared custom domain would be a new decision, not a silent config change.

### OQ-24. Firebase project ids

**Status.** Decided by the owner. One cloud project.

**Decision.** The cloud project is `magemai`, project number `122706427013`, support email `mavixas.ceo@gmail.com`. The owner is upgrading it to Blaze. Local development and CI stay on the Emulator Suite (`demo-magemai`). There is no dev, staging, or production Firebase project. Environment variables still carry the project id (section 19), so another project could be added later without a code change. Tests and destructive scripts do not run against `magemai`. A deploy or a live operator script requires the operator to type the project id and the project number.

### OQ-25. Accent color

**Ambiguity.** The blueprint asks for navy or charcoal and "a distinctive secondary accent" without naming a hex.

**Default.** The token table in section 5.2.

**If overridden.** Change the token table before step 4. Components will not contain the values directly, so a later change stays in `tokens.css`.

### OQ-26. Package manager and formatting

**Ambiguity.** The instructions require ESLint and formatting and do not name the tools.

**Default.** npm, ESLint with `typescript-eslint`, and Prettier. `any` is a lint error. A use of `any` needs a one-line comment that states why.

**If overridden.** pnpm or Biome would be chosen in step 4 before the lockfile exists.

### OQ-27. Super-admin routes that are out of Phase 1 scope

**Ambiguity.** The blueprint lists super-admin pages for categories, subscriptions, and reports. The Phase 1 scope lists users, businesses, verification, and audit.

**Default.** Categories are seeded into `platformSettings/global` and are not editable in the UI. Subscriptions, reports, categories, and platform settings screens render Coming soon. Verification is a filter and actions on the business table.

**If overridden.** A category editor is a small screen plus `platform_settings.update` audit. It is still easy to leave until someone needs a new category, which the seed script can add.

### OQ-28. Dashboard URL for a suspended business and for staff

**Ambiguity.** Staff "see assigned work", and there is no assigned work yet. The blueprint does not say what suspension feels like.

**Default.** Staff can open the shell and read the profile. They cannot open settings edit, member lists, or audit. A suspended business is readable and not editable for every role, with a banner.

**If overridden.** Hiding the shell entirely from staff until Phase 2 is possible. The membership would still exist so the rules tests have a staff principal.

---

These defaults are enough to implement Phase 1 without another architecture pass. OQ-1 (region), OQ-2 (money units), OQ-20 (collection layout), and OQ-23 (Firebase-assigned hostnames only) are owner-approved and stay unchanged. The `platformAdmins` registry is an addition under that same collection layout.

## 24. Live Firebase by default

On 2026-11-20 the owner dropped the emulator-first default. The app uses the live project `magemai` unless `VITE_USE_FIREBASE_EMULATORS` is exactly `true`. He could not run the emulators on his PC and does not want them for day-to-day work. There is still one cloud project (D14) and no dev or staging project. D3, D10, D12, and D13 are unchanged. The same day the default Storage bucket was left in `us-east1` (section 16).

Rules tests stay on the Emulator Suite because `@firebase/rules-unit-testing` only works there. `npm run test:e2e` also stays on the emulators so CI can run without live credentials. `npm run test:e2e:live` is the operator command for project `magemai`. It is not part of CI, and it cannot pass until rules, indexes, and functions are deployed.

Emulator scripts still pass `--project demo-magemai`. Deploy scripts pass `--project magemai`. CI does not deploy.

### 24.1 Emulators and ports

`firebase.json` binds every emulator to `127.0.0.1`. Clients use that address, not a LAN address and not `localhost` as a substitute that might resolve differently.

| Emulator | `firebase.json` key | Host | Port |
| --- | --- | --- | --- |
| Authentication | `auth` | `127.0.0.1` | 9099 |
| Cloud Firestore | `firestore` | `127.0.0.1` | 8080 |
| Cloud Storage | `storage` | `127.0.0.1` | 9199 |
| Cloud Functions | `functions` | `127.0.0.1` | 5001 |
| Hosting | `hosting` | `127.0.0.1` | 5000 |
| Emulator UI | `ui` | `127.0.0.1` | 4000 |

`emulators.singleProjectMode` is `true`. The suite then answers only one project id. Scripts always pass `--project demo-magemai`. A request that names `magemai` is refused by the suite and by the script guard in 24.7.

The Functions client is constructed for region `asia-south1` (D13) in every mode. The emulator still listens on `127.0.0.1:5001`. The region is the callable path, not a second cloud project. `stripDownloadTokens` is declared with region `us-east1`. The emulator delivers Storage events by bucket name, not by that region, and the bucket it creates is `demo-magemai.appspot.com`. The live client bucket is `magemai.firebasestorage.app` from gitignored `.env.local`.

### 24.2 Local services use the emulator endpoints

When emulators are active, `src/lib/firebase/client.ts` calls, once:

- `connectAuthEmulator(auth, "http://127.0.0.1:9099")`
- `connectFirestoreEmulator(db, "127.0.0.1", 8080)`
- `connectStorageEmulator(storage, "127.0.0.1", 9199)`
- `connectFunctionsEmulator(functions, "127.0.0.1", 5001)`

The host comes from `VITE_FIREBASE_EMULATOR_HOST`, default `127.0.0.1`. Ports are the table above, not free-form env values, so a typo cannot point a client at another machine. Admin SDK code in scripts and tests sets:

```text
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

`firebase emulators:exec` sets those variables. The guard in 24.7 still checks them.

### 24.3 Connect emulators once

`getFirebase()` is the only initializer. It lives in `src/lib/firebase/client.ts`.

- If `getApps()` already contains the default app, return that app and its services.
- Connect the emulators only when `shouldUseEmulators()` is true and the process has not connected them yet.
- Store the flag on `globalThis` (`globalThis.__magemaiEmulatorsConnected`). A Vite HMR reload re-executes the module and would otherwise call `connectAuthEmulator` a second time, which throws. The global flag survives that reload.
- Do not call the `connect*Emulator` helpers from a component, a test, or a second module.

### 24.4 The app uses live Firebase unless the emulator flag is true

`resolveFirebaseAccess()` selects the emulator only when `VITE_USE_FIREBASE_EMULATORS` is exactly `true`. Any other value, including unset, selects the live project. The live project id defaults to `magemai` when `VITE_FIREBASE_PROJECT_ID` is empty. The public web config (API key, auth domain, storage bucket, sender id, app id) must be present in gitignored `.env.local`. Those values are not committed.

There is no `VITE_ALLOW_LIVE_FIREBASE` flag and no live banner.

### 24.5 Production builds cannot connect to localhost

Both of these are required:

1. **Build-time.** `vite.config.ts` loads env for the current mode. When `mode` is `production` and `VITE_USE_FIREBASE_EMULATORS` is `true`, `defineConfig` throws before the bundle is emitted. `vite build` exits non-zero. The message states that production cannot connect to localhost.
2. **Runtime.** `getFirebase()` throws if `import.meta.env.PROD` is true and `shouldUseEmulators()` is true. This covers a flag injected after the config check.

`VITE_ALLOW_LIVE_FIREBASE` does not turn emulators on in a production build, and it does not weaken check 1.

### 24.6 Emulators are optional

Set `VITE_USE_FIREBASE_EMULATORS=true` and `VITE_FIREBASE_PROJECT_ID=demo-magemai` only when you intend to use the local suite. Playwright's emulator config sets those for `npm run test:e2e`. A production build with the emulator flag set to `true` fails (24.5).

The emulator client still refuses project id `magemai` and any host other than `127.0.0.1`. That keeps a mistaken flag from pointing the emulator SDK at the live project.

### 24.7 Automated tests never touch the live project

`scripts/emulators.mjs` is the only process that invokes the Firebase CLI for tests and for the emulator lifecycle. It hardcodes the project id `demo-magemai`. It does not read a project id from the environment.

Before it spawns the CLI, it exits 1 when the project id it is about to pass is not exactly `demo-magemai`. Emulator children drop `GOOGLE_APPLICATION_CREDENTIALS` so the suite cannot use a live service account.

`exec` (used by `test:rules` and `test:e2e`) also exits 1 after the emulators start if any of `FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`, or `FIREBASE_STORAGE_EMULATOR_HOST` is missing or does not start with `127.0.0.1` or `localhost`.

`npm test` stubs the emulator flag so component tests do not need live credentials. A project id of `magemai` is not, by itself, a unit-test failure. `npm run test:e2e:live` and `npm run test:cleanup:live` are separate commands. They use Application Default Credentials on the operator's machine, never a committed key, and this repository's CI does not run them.

### 24.8 No deploy without approval, and no destructive live commands

CI does not deploy. The owner runs `deploy:rules`, `deploy:functions`, and `deploy:hosting` from their own machine. Those scripts do not prompt for the project id. They do not run from tests.

`guardProviderSignIn` is a blocking Auth function and needs Identity Platform. A normal `deploy:functions` does not export it. The emulator loads it because `FUNCTIONS_EMULATOR` is set. After Identity Platform is enabled, set `MAGEMAI_DEPLOY_BLOCKING_AUTH=true` for that deploy only. Until then, a verified Google sign-in can attach to an existing password account.

`emulators:reset` deletes only the local directory `emulator-data/` inside the repository. The script resolves that path, checks the final segment is `emulator-data`, and refuses any other path. It does not call the Firebase CLI.

### 24.9 Synthetic emulator seed

`npm run emulators:seed` runs `node scripts/emulators.mjs seed`, which calls `firebase emulators:exec --project demo-magemai` and then `node scripts/seed-emulators.mjs`. The seed runs only inside that exec, after the guard in 24.7.

It writes synthetic records and nothing else:

| Auth email | Password (emulator only) | Records |
| --- | --- | --- |
| `owner.a@example.test` | `emupass-not-for-live` | Owner of business "Test Studio A", slug `test-studio-a` |
| `owner.b@example.test` | `emupass-not-for-live` | Owner of business "Test Studio B", slug `test-studio-b` |
| `staff.a@example.test` | `emupass-not-for-live` | Staff membership on Test Studio A |
| `platform.admin@example.test` | `emupass-not-for-live` | `platformAdmins` status `active` and the emulator claim `superAdmin: true` |
| `unverified.a@example.test` | `emupass-not-for-live` | Password account with `emailVerified: false`. No business. The verification gate keeps this user on `/verify-email` |

It also writes `platformSettings/global` from `shared/platform/defaults.ts`. Emails use the reserved `.test` domain. Names are the labels above. The seed does not contain a real customer, a real inbox, or the pilot business named in the blueprint. Running it twice does not duplicate businesses: slug reservations make the second run a no-op for those slugs.

The password exists only in the Auth emulator. The seed process exits before any write if the project id is not `demo-magemai`.

`npm run seed:platform-settings` writes `platformSettings/global` and one audit row `platform_settings.seed`. Against the emulator it runs when `FIRESTORE_EMULATOR_HOST` is set. With that host unset it uses Application Default Credentials and project `magemai`. It does not create the synthetic users above and it does not ask for a typed confirmation.

### 24.10 Import, export, and gitignore

Exports live in `emulator-data/` at the repository root. That directory is gitignored. Exports contain password hashes and the synthetic records, and they change every session. Repeatable tests use `emulators:seed`, not a committed snapshot. A developer may keep an export on their own machine.

`scripts/emulators.mjs start` runs one of these, with the project id literal:

```text
firebase emulators:start --project demo-magemai --import ./emulator-data --export-on-exit ./emulator-data
```

It passes `--import` only when `emulator-data/firebase-export-metadata.json` already exists. The first start, and any start after `emulators:reset`, omits `--import` and still passes `--export-on-exit ./emulator-data`. The CLI refuses an import directory that has no metadata file, so the script must not pass `--import` in that case.

`emulators:export`, while the suite is already running:

```text
firebase emulators:export ./emulator-data --project demo-magemai --force
```

### 24.11 npm scripts

Step 4 adds these `package.json` scripts. Each name is invoked as `npm run <name>` from Command Prompt or PowerShell. The script bodies call `node` or `tsc` or `eslint`. They do not use bash assignment, `rm`, or `source`.

| Script | Command | What it is allowed to touch |
| --- | --- | --- |
| `dev` | `vite` | Live `magemai` unless `VITE_USE_FIREBASE_EMULATORS=true` |
| `emulators:start` | `node scripts/emulators.mjs start` | Local suite only, project `demo-magemai`, import/export `./emulator-data` |
| `emulators:export` | `node scripts/emulators.mjs export` | The running local suite, write `./emulator-data` |
| `emulators:reset` | `node scripts/emulators.mjs reset` | Delete local `./emulator-data` only |
| `emulators:seed` | `node scripts/emulators.mjs seed` | Auth and Firestore emulators, synthetic rows from 24.9 |
| `test` | `vitest run` | Unit tests. The Vitest config stubs the emulator flag |
| `test:rules` | `node scripts/emulators.mjs exec -- vitest run --config vitest.rules.config.ts` | `firebase emulators:exec --project demo-magemai` |
| `test:e2e` | `node scripts/emulators.mjs exec -- playwright test` | Emulator Playwright, including onboarding |
| `test:e2e:live` | `playwright test --config playwright.live.config.ts` | Live `magemai`. Needs a deploy and ADC. Not run in CI |
| `test:cleanup:live` | `node scripts/cleanup-live-e2e.mjs` | Deletes only Auth users whose email starts with `e2e+` and their E2E businesses |
| `seed:platform-settings` | `node scripts/seed-platform-settings.mjs` | `platformSettings/global` on the emulator or on live `magemai` |
| `deploy:rules` | `firebase deploy --only firestore:rules,firestore:indexes,storage --project magemai` | Rules, indexes, and Storage rules |
| `deploy:functions` | `firebase deploy --only functions --project magemai` | Compiles `functions` first, then deploys 2nd gen functions. No blocking Auth function and no 1st gen trigger. |
| `deploy:hosting` | `npm run build && firebase deploy --only hosting --project magemai` | Production build, then Hosting |
| `typecheck` | `tsc --noEmit -p tsconfig.json` and `tsc --noEmit -p functions/tsconfig.json` | Local files |
| `lint` | `eslint .` | Local files |
| `format` | `prettier --write .` | Local files |

`scripts/emulators.mjs exec` spawns:

```text
firebase emulators:exec --project demo-magemai --only auth,firestore,functions,storage <the command after -->
```

`test:rules` and `test:e2e` stay on `demo-magemai`. `test:e2e:live` is the only Playwright command aimed at `magemai`.

Windows and the day-to-day commands are in [setup.md](./setup.md).
