# Magemai architecture

**Product:** Magemai  
**Endorsement:** A Mavixas product  
**Tagline:** Your business. Your own space.  
**Status:** Phase 1 planning. Application code is intentionally not in the repository yet.  
**Date:** 2026-11-16  
**Sources:** [Product blueprint](./magemai-blueprint.md) and the product owner's development instructions.

This document is the architecture contract for Phase 1. Workflow steps 4–12 in [phase-1-checklist.md](./phase-1-checklist.md) implement this contract. [setup.md](./setup.md) is the environment guide.

Phase 1 follows every proposed default in [Open questions and proposed decisions](#23-open-questions-and-proposed-decisions). Override an item there before step 4, and update this document in the same change. Do not leave the code and this document in disagreement.

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
| D2 | Node.js 24 for the app, the Functions runtime (`nodejs24`), and CI. Functions are 2nd generation only. The package manager is npm. |
| D3 | Phase 1 data lives in root collections. Every tenant-owned document carries `businessId`. Future operational records live under `businesses/{businessId}/…` so the path is the tenant. |
| D4 | A membership document id is `{businessId}_{userId}`. Rules and functions load it with one `get()`. Business role is never copied into a custom claim. |
| D5 | Platform administration is the custom claim `superAdmin: true`, set only by an operator script that uses service credentials. Registration cannot grant it. |
| D6 | Client SDK reads are authorized by security rules. Privileged writes go through callable functions and the Admin SDK, then rules deny the same writes from the client. |
| D7 | The signed-in user may update only `displayName`, `phoneNumber`, `locale`, and `updatedAt` on their own user document. Media paths are set by a function after Storage validation. |
| D8 | The active business id in the browser is a display hint. Rules authorize the document being read. Functions load the caller's membership for the `businessId` argument and ignore any client-supplied role. |
| D9 | Slug uniqueness is a `businessSlugs/{slug}` document created in the same transaction as the business. |
| D10 | Instants are Firestore timestamps (UTC). Each business stores an IANA timezone. Money, when it exists, is an integer minor-unit amount plus an ISO 4217 code. Phase 1 stores the currency code and no amounts. |
| D11 | Deployed environments that run Functions are on the Blaze plan, with a budget alert before the first deploy. Local development uses the Emulator Suite and does not need Blaze. |
| D12 | No production hostname is configured. Hosting uses the hostnames Firebase assigns to the project. |

The trade-offs behind D3–D10 are in the sections below.

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
│   ├── provision-super-admin.ts
│   └── seed-platform-settings.ts
├── tests/
│   ├── rules/                      # Firestore and Storage emulator tests
│   └── e2e/                        # Playwright
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── firebase.json
├── .firebaserc                     # aliases only; real project ids filled in locally
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
| `/business/register` | verified user | Onboarding wizard |
| `/admin` | member | Overview |
| `/admin/profile` | member | Business profile |
| `/admin/settings` | member | Timezone, currency, language |
| `/super-admin` | super-admin claim | Overview with real counts |
| `/super-admin/users` | super-admin claim | Read-only user list |
| `/super-admin/businesses` | super-admin claim | Status and verification actions |
| `/super-admin/verifications` | super-admin claim | Same table, verification filter |
| `/super-admin/audit-logs` | super-admin claim | Audit list |
| `/super-admin/categories` | super-admin claim | Coming soon |
| `/super-admin/subscriptions` | super-admin claim | Coming soon |
| `/super-admin/reports` | super-admin claim | Coming soon |
| `/super-admin/settings` | super-admin claim | Coming soon |

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

Three Firebase projects, one per environment: development, staging, production. Section 19 lists the configuration keys. The Emulator Suite is the default runtime for local work and CI.

| Product | Phase 1 use |
| --- | --- |
| Authentication | Email/password, Google, verification, reset |
| Cloud Firestore | The collections in section 8 |
| Storage | Avatar, logo, cover, and a denied private prefix |
| Cloud Functions (2nd gen) | Trusted writes, auth user bootstrap, storage token stripping |
| Hosting | The Vite single-page app |
| App Check | Enforced in production with reCAPTCHA Enterprise |
| Emulator Suite | Auth, Firestore, Functions, Storage, Hosting |

The Functions region and the Firestore location are the same region, so callables do not pay cross-region reads. The proposed region is `asia-south1` (Mumbai). It is the open question [OQ-1](#oq-1-cloud-region) because a Firestore location cannot be changed later.

Callable defaults: 256 MiB, 30 second timeout, minimum instances 0. Cold starts are acceptable in Phase 1. Raising minimum instances would bill continuously.

### 6.1 Function catalog

All callables require an authenticated user. Production deployments also require a valid App Check token. The emulator does not enforce App Check.

| Function | Caller | Effect |
| --- | --- | --- |
| `onAuthUserCreated` | Auth trigger | Creates the user document if missing. Forces `status: "active"`. Grants no claim. |
| `syncAuthProfile` | That user | Copies `email` and `emailVerified` from the Auth record onto the user document and sets `lastLoginAt`. |
| `checkSlugAvailability` | Verified user | Returns `{ available: boolean }`. |
| `createBusiness` | Verified user | Transaction: slug reservation, business, owner membership, audit. |
| `updateBusinessProfile` | Owner, admin, manager | Profile field allow-list, audit. |
| `updateBusinessSettings` | Owner, admin | Timezone, currency, language, audit. |
| `setBusinessImage` | Owner, admin, manager | Checks the Storage object, strips its download token, stores the path, audit. |
| `setUserAvatar` | That user | Same pattern for `users/{uid}/avatar`. |
| `setBusinessStatus` | Super-admin | `active` or `suspended`, audit with before and after. |
| `setBusinessVerification` | Super-admin | Verification enum, audit with before and after. |
| `stripDownloadTokens` | Storage trigger | Removes `firebaseStorageDownloadTokens` from every uploaded object. |

There is no callable that sets custom claims. Adding one would create a path the provisioning design exists to avoid.

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
        ├─ onAuthUserCreated creates users/{uid} if needed
        ├─ client calls syncAuthProfile
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
                    └─ token.superAdmin == true may open /super-admin
```

1. Email registration collects display name, email, and password. The client calls `createUserWithEmailAndPassword`, then `sendEmailVerification`.
2. Google uses `signInWithRedirect` so mobile browsers and popup blockers share one path ([OQ-8](#oq-8-google-sign-in-interaction)).
3. If Google reports that the email already belongs to a password account, the UI asks the person to sign in with the original method. Phase 1 does not link accounts automatically ([OQ-7](#oq-7-same-email-on-google-and-password)).
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
| `auditLogs/{auditLogId}` | Platform or one business | Super-admin queries across tenants. Business auditors query `businessId`. |

Auto-ids and Auth uids are alphanumeric, so the membership id can use a single underscore and never needs to be parsed. Code reads `businessId` and `userId` from fields.

Future operational collections are subcollections of `businesses/{businessId}`. A client then cannot place a booking in business A while setting `businessId` to business B; the path is the tenant. Cross-tenant marketplace queries, when they arrive in Phase 3, use collection-group queries with rules that allow only documents marked public. That choice is [OQ-20](#oq-20-confirm-the-collection-layout).

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
| `lastLoginAt` | timestamp or null | system | Set by `syncAuthProfile`. |

**Ownership.** The person owns the profile. A business does not own it. Deleting a membership does not delete the user.

**Security.**

- `get`: the user themselves, or a super-admin.
- `list`: super-admin only. A normal user cannot list the collection.
- `create`: the user themselves, only when the document is missing, with `status == "active"`, email fields equal to the token, `photoPath == null`, `phoneNumber == null`, and no extra keys. This covers a delay of the Auth trigger. The trigger overwrites system fields if it runs afterwards.
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

- `get`: an active member of this business, or a super-admin.
- `list`: super-admin only. A member loads their businesses by id after reading their own memberships. A collection query of `businesses` would be rejected for them, which is the intended rules behavior.
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

- `get`: the member themselves, a super-admin, or an active owner/admin/manager of the same business (staff directory read).
- `list`: three shapes, because rules are not filters. A query is allowed only when its constraints match a rule.
  - `where("userId", "==", caller)` for the caller's own memberships.
  - super-admin, unconstrained.
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
- `get` of any other id: super-admin only, so a future private settings document is not readable by every user.
- `list`: super-admin only.
- client writes: denied.

### 8.7 `auditLogs/{auditLogId}`

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
| `super_admin.provision` | Claim granted |
| `super_admin.revoke` | Claim removed |

Self-service edits to display name, phone, and locale are not audit events in Phase 1 ([OQ-15](#oq-15-what-is-audited)).

**Ownership.** Platform logs belong to the platform. Business logs belong to that tenant for reading, and to the platform for retention.

**Security.**

- Client create, update, and delete: denied, including for super-admins using the client SDK.
- `get` and `list`: a super-admin may read every log.
- A business owner or admin may read a log only when `scope == "business"` and `businessId` is a business they actively administer. The query must filter on both fields.
- Managers, staff, and non-members cannot read audit logs.
- The Admin SDK bypasses these rules. No function or script deletes logs. Retention is indefinite in Phase 1 ([OQ-16](#oq-16-audit-retention)).

### 8.8 Future collections (relationships only)

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

Super-admin is not a business role and is not stored on `businessMembers`. Holding it does not write an owner membership. It does not grant Storage reads.

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

## 11. Custom claims and membership documents

The two mechanisms answer different questions.

| | Custom claim `superAdmin` | Membership document |
| --- | --- | --- |
| Question it answers | Is this person a platform operator? | What may this person do at this business? |
| Visible to rules | `request.auth.token.superAdmin == true`, no document read | `get()` of `businessMembers/{businessId}_{uid}` |
| Freshness | Stale until the ID token refreshes, up to an hour | The next request sees a revocation |
| Size | Well under the 1000-byte claim limit | One small document per business |
| Who can set it | Admin SDK in the operator script | Admin SDK inside `createBusiness` |
| Fits many businesses | No. A user can belong to more businesses than a token should list. | Yes |

Business id, business role, and permission lists are not written into the token. Putting them there would let a removed member keep access until refresh, and it would hit the size limit for people who work with many businesses.

The claim is not mirrored onto the user document. A boolean on the user document would invite a future rule to trust a field the client might try to write. The admin UI decides whether to show super-admin navigation from `getIdTokenResult().claims.superAdmin`. That check is cosmetic. `setBusinessStatus` and `setBusinessVerification` verify the claim with the Admin SDK (`getUser`, then the custom claims) on every call.

After the provisioning script sets or clears the claim, the person signs out and signs in. `onIdTokenChanged` then sees the new token.

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

A caller who is an owner of business A and passes business B's id is rejected at step 2. Tests XT-1 through XT-20 in section 20 exercise that case.

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
- The blueprint's illustration (amount `15000` displayed as LKR 15,000.00) does not name its unit. [OQ-2](#oq-2-money-units) records that conflict. The plan follows integer minor units, which both the blueprint's data principle and the owner's instructions require.

Historical payment and invoice rows, when they exist, are append-only and keep their own currency and amount. Changing a business's default currency later does not rewrite them.

## 15. Firestore rules strategy

Rules are default-deny, version 2. A missing match denies. `if false` does not override a different match that allows; tests cover the sensitive paths directly rather than trusting a catch-all.

Helpers:

- `isSignedIn()` — `request.auth != null`
- `isSuperAdmin()` — `isSignedIn() && request.auth.token.superAdmin == true`
- `membershipPath(businessId)` — `/databases/$(database)/documents/businessMembers/$(businessId + '_' + request.auth.uid)`
- `membershipExists(businessId)` — `exists()` before any `get()`, so a missing membership denies that clause instead of erroring the whole expression
- `membership(businessId)` — `get()` after `exists()`
- `isActiveMember(businessId)` — exists, `status == "active"`
- `roleIs(businessId, roles)` — active member whose `role` is in the list

`get()` calls per request stay at one membership document (plus `exists` on the same path). Rules do not loop and do not scan a collection.

| Path | Client read | Client write |
| --- | --- | --- |
| `users/{uid}` | Self `get`, or super-admin `get`/`list` | Self create under the strict shape in 8.2. Self update of the allow-list. |
| `businesses/{id}` | Active member `get`, or super-admin `get`/`list` | Denied |
| `businessMembers/{id}` | The shapes in 8.4 | Denied |
| `businessSlugs/{slug}` | Denied | Denied |
| `platformSettings/global` | Any signed-in `get` | Denied |
| `platformSettings/{other}` | Super-admin | Denied |
| `auditLogs/{id}` | Super-admin, or owner/admin of that business for `scope == "business"` | Denied |
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
- Runs `stripDownloadTokens` on finalize, and strips again inside `setBusinessImage` and `setUserAvatar`.
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
- A write to `users/{uid}` or `businessMembers`.
- A callable, including one restricted to existing super-admins.
- Owning a business.
- The Firebase console's Firestore data editor. Claims are not a Firestore field. Editing a document cannot grant the claim, and there is no document field that rules accept as a substitute.

### 17.3 Initial provisioning

The only supported grant is `scripts/provision-super-admin.ts`, run by an operator with service credentials. Step 8 implements the script. The contract:

```text
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run provision:super-admin -- --project <firebase-project-id> --email <email>
```

The script:

1. Refuses to start unless `GOOGLE_APPLICATION_CREDENTIALS` points at a file outside the repository and `--project` and `--email` are present.
2. Prints the project id and email, and requires a typed confirmation.
3. Loads the Auth user by email. If there is no such user, it creates one with a randomly generated password that it prints once, and sets `emailVerified` true. The person then uses password reset to choose a password. The script can also be pointed at an account the operator already created in the Firebase console. Either way, the public registration form is not the grant.
4. Reads existing custom claims, merges `superAdmin: true` without dropping unrelated claims, and calls `setCustomUserClaims`.
5. Creates or updates `users/{uid}` system fields through the Admin SDK. It still does not add an admin boolean to the document.
6. Writes an audit row `super_admin.provision` with `scope: "platform"`, `actorType: "system"`, and the operator identity in `metadata.operator` taken from the service-account email.
7. Prints that the person must sign out and sign in.

Revocation is the same script with `--revoke`. It removes the `superAdmin` key, writes `super_admin.revoke`, and does not delete the user.

The service account needs Firebase Authentication Admin and Cloud Datastore User on that one project. Development, staging, and production each have their own service account and their own super-admin. A claim in one project is not a claim in another.

Credentials live outside the repo. `.gitignore` rejects `.env` files and service-account JSON. The frontend has no Admin SDK dependency and no code path that accepts a service account.

A second operator is provisioned by running the script again. Existing super-admins cannot mint further super-admins from the UI.

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

| Environment | Firebase project | Where it runs |
| --- | --- | --- |
| Local | Emulator project `demo-magemai`, or the dev project id when exercising deployed dev | Developer machine and CI |
| Development | A Firebase project the owner creates | Optional cloud deploy for shared testing |
| Staging | A second project | Cloud, Blaze, before a production promotion |
| Production | A third project | Cloud, Blaze, only after an explicit decision to deploy |

Suggested project ids (`magemai-dev`, `magemai-staging`, `magemai-prod`) are examples. The real ids are chosen in the Firebase console and written into gitignored env files and into `.firebaserc` aliases `dev`, `staging`, and `prod`. This repository does not invent a production domain. The hostname shown in the blueprint's public-profile example is an illustration, not an authorized domain and not a value to copy into config. Authorized Auth domains are `localhost`, `127.0.0.1`, and the `web.app` and `firebaseapp.com` hostnames of the project that was actually created.

Vite modes:

| File | Mode | Committed |
| --- | --- | --- |
| `.env.example` | documentation of names | yes, values empty |
| `.env.development` | `vite` / local emulators | no |
| `.env.staging` | `vite build --mode staging` | no |
| `.env.production` | `vite build` | no |

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

`VITE_USE_FIREBASE_EMULATORS` is `true` only in `.env.development`. The client throws on startup if a production build sees that flag set to `true`. `VITE_GOOGLE_AUTH_ENABLED` is `true` only after Google provider is configured for that project; the login screen hides the Google button otherwise, and tests that need a real Google account are reported as not run.

`VITE_FIREBASE_APP_CHECK_SITE_KEY` is empty locally. Production and staging builds set the reCAPTCHA Enterprise site key. The matching secret stays in App Check / Cloud, not in the frontend env file.

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

### 20.3 Playwright

Runs against the Emulator Suite in two projects: a desktop Chromium viewport (1280×800) and a mobile viewport (390×844). A tablet viewport (768×1024) covers the drawer breakpoint. Flows:

- Register, mark the user verified through the Auth emulator, sign in, land on onboarding.
- Complete onboarding, land on `/admin`, see the business name and the owner role.
- Create a second business, switch, and see the second name. The first business's name is not left on screen.
- Sign out, open `/admin` while signed out, land on `/login`.
- Password reset completes using the emulator's out-of-band code.
- A normal user who opens `/super-admin` sees the 403 state.
- A user provisioned with the claim in the emulator sees the user list and the business list.
- Suspend that business as super-admin, sign back in as the owner, see the suspended banner, and confirm the profile form is not editable.
- The audit list shows the suspension.

Google sign-in in Playwright uses the Auth emulator's simulated Google provider. That covers the application path. It does not prove the production OAuth client. The manual Google check is a separate checklist item and stays open until a person runs it on a configured project.

### 20.4 Emulator rules and function tests

`@firebase/rules-unit-testing` against the Firestore and Storage emulators, plus callable tests through the Functions emulator. The seed for every cross-tenant case is:

- User A, owner of business A.
- User B, owner of business B.
- User S, staff of business A (membership written with the Admin SDK).
- User P, no memberships, no claim.
- User SA, custom claim `superAdmin: true`, no membership.

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
| XT-14 | SA reads business A, business B, users, and platform audit logs | allow |
| XT-15 | SA writes an audit log, a business, or a membership from the client SDK | deny |
| XT-16 | Signed-out reads of users, businesses, memberships, settings, audit logs, and brand objects | deny |
| XT-17 | A uploads SVG, HEIC, or a 3 MiB logo to A's brand path | deny |
| XT-18 | A reads or writes `businesses/A/private/secret` | deny |
| XT-19 | After ordinary registration, A's token has no `superAdmin` claim | assert |
| XT-20 | `createBusiness` with a payload that sets `role: "staff"`, `status: "suspended"`, and `verificationStatus: "verified"` | stored role is `owner`, status is `active`, verification is `unverified` |

Positive cases sit next to these: A can `get` business A, A can list A's memberships, A can upload a small PNG logo, SA can suspend B and the audit row exists, and a staff member can `get` the business but cannot call `updateBusinessSettings`.

CI, added in step 10, runs `firebase emulators:exec` so a green test run includes XT-1 through XT-20. Unit tests and Playwright run inside that wrapper or immediately after it in the same job. The job does not receive service-account credentials.

### 20.5 Commands the foundation will wire

```text
npm test            # Vitest unit and component tests
npm run test:rules  # Firestore and Storage rules, and callable security tests
npm run test:e2e    # Playwright against emulators
npm run test:all    # the CI entry point
```

These scripts do not exist until step 4 and step 9. This planning pass does not claim they pass.

## 21. Deployment strategy

Order, per project:

1. Confirm the Firestore location and the Functions region before the first write.
2. Confirm Blaze and a budget alert (section 22) before the first functions deploy.
3. `firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting --project <alias>`.

Hosting is a single-page app. `index.html` is not cached for long; hashed assets are. All routes rewrite to `index.html`. The production build must have `VITE_USE_FIREBASE_EMULATORS` unset or `false`.

Promotion path: emulator CI green, then an explicit deploy to development or staging, then a manual pass of the checklist on that project, then production. Production is not deployed as part of Phase 1 implementation unless the owner explicitly authorizes that deploy. Staging is the same: the checklist prepares the project, and a person decides when to deploy.

No custom domain, no preview-channel requirement, and no server-side rendering in Phase 1. Public pages in Phase 3 are still a client-rendered SPA until a separate decision to prerender. That decision happens before a large marketplace launch, not during Phase 1.

Scheduled Firestore exports to Cloud Storage are the backup story. They require Blaze and a bucket, and they should be turned on before production holds real tenant data. They are an operations task on the production project, not a Phase 1 feature.

Auth settings to apply on each cloud project: email/password enabled, Google enabled when the OAuth client exists, email enumeration protection on, authorized domains limited to localhost and that project's Firebase hostnames.

## 22. Firebase billing

### 22.1 What works on the Spark plan

- Authentication with email/password and Google.
- Cloud Firestore, within the Spark quota. Exceeding a Spark quota turns that product off until the next month or until the project moves to Blaze.
- Cloud Storage and Hosting, within their Spark quotas.
- Security rules.
- The Emulator Suite, including running Functions locally. Emulators do not bill.

Phone authentication is not used. Spark is enough to create the projects and to develop against emulators.

### 22.2 What needs Blaze

Cloud Functions for Firebase, 1st and 2nd gen, deploy only from a Blaze project. Phase 1's trusted writes, the auth trigger, and the storage trigger are those functions. A Spark project can host the frontend and the database and still cannot run onboarding or suspension in the cloud.

Blaze includes a no-cost monthly allowance for function invocations, compute, and egress. Container storage and the builds that publish functions can still produce small charges inside that allowance, so a Blaze project is not a promise of a zero invoice. Firestore, Storage, and Hosting on Blaze keep a no-cost allowance and then bill for additional use.

Each of development, staging, and production that will have functions deployed needs its own Blaze upgrade and its own budget.

### 22.3 Alerts, before the first deploy

On the billing account, for each Blaze project:

- A monthly budget chosen by the owner. A pre-launch project often starts with a budget on the order of USD 25–50. The number is the owner's.
- Alerts at 50%, 90%, and 100% of that budget.
- A Cloud Run spend cap. 2nd gen functions run on Cloud Run, so this cap bounds function spend. The cap should sit at a level that stops a runaway deploy without blocking a normal staging test. Minimum instances stay at 0 so idle functions do not bill.

Rules `get()` of a membership adds one document read to each authorized read. That is the cost of fresh membership checks, and it is preferable to stale claims. Super-admin list pages paginate at 25 and use `getCountFromServer` for the overview counts, which is a real aggregation query, not a fabricated number.

No production resources are deployed without an explicit owner decision.

## 23. Open questions and proposed decisions

Each item is a place the blueprint or the instructions left a choice open, or where two lines of the blueprint can be read differently. **Phase 1 will implement the proposed default** unless the owner overrides it before step 4. Overrides are written back into the relevant section of this document.

### OQ-1. Cloud region

**Ambiguity.** No region is specified. The Firestore location is permanent.

**Default.** `asia-south1` (Mumbai) for Firestore and for Functions. It is the closest common single region to Sri Lanka. A multi-region location costs more and is not justified before launch traffic.

**If overridden.** Pick the region before the first Firestore write. `asia-southeast1` (Singapore) is the likely alternative. Functions move to the same region.

### OQ-2. Money units

**Ambiguity.** The blueprint requires integer minor units, and its illustration shows amount `15000` displayed as LKR 15,000.00. Those two statements use different units. 15,000.00 LKR is `1500000` minor units when LKR's exponent is 2.

**Default.** Integer minor units win. Phase 1 stores no amounts, only the ISO currency code. The field name will be `amountMinor` when money arrives.

**If overridden.** Any other unit has to be chosen before the first payment or invoice document is written. Changing it later rewrites financial history.

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

**Default.** Active members and super-admins only. No public Firestore read and no public Storage read.

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

**Default.** Audit the action catalog in section 8.7. Do not audit display-name, phone, or locale edits.

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

**Ambiguity.** The blueprint allows either subcollections or a `businessId` field and asks for one strategy.

**Default.** Root collections for the Phase 1 platform documents in section 8. Subcollections under `businesses/{businessId}` for future operational data. Membership ids are deterministic.

**If overridden.** Choosing root collections for bookings and customers as well is viable and should be decided before Phase 2. Phase 1 rules do not need to change either way, because those collections are not created now.

### OQ-21. Active business in the URL

**Ambiguity.** The blueprint's dashboard routes are `/admin`, not `/b/{businessId}/admin`. A URL that omits the tenant cannot be shared as a link to a specific business.

**Default.** Follow the blueprint. The active business lives in provider state plus `localStorage`, and it is validated as in section 12.

**If overridden.** Putting the business id in the path is a router change. It does not replace the membership check.

### OQ-22. App UI language

**Ambiguity.** Each business stores a language. The product is not yet translated.

**Default.** The interface is English. `business.language` and `users.locale` are stored. No i18n library in Phase 1. The language list seed is `en`.

**If overridden.** Adding translation later is easier if strings already live in components rather than in images. Phase 1 already keeps marketing copy in `brand.ts`.

### OQ-23. Production hostname

**Ambiguity.** No domain has been cleared. The blueprint forbids assuming one.

**Default.** Use the `web.app` and `firebaseapp.com` hostnames Firebase assigns to the project that was created. Do not copy the sample hostname from the blueprint into `firebase.json`, Auth authorized domains, or the README. Do not put a custom domain there either.

**If overridden.** Add a domain only after the owner confirms clearance, and add it to Auth authorized domains in the same change.

### OQ-24. Firebase project ids

**Ambiguity.** The projects do not exist yet.

**Default.** The owner creates three projects during setup and records the ids locally. Examples in the docs are not commitments. Emulators use `demo-magemai` so contributors can run tests before they have cloud access.

**If overridden.** One shared project for staging and production would mix data and claims. The plan keeps three.

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

These defaults are enough to implement Phase 1 without another architecture pass. The items that are expensive to change later are OQ-1 (region), OQ-2 (money units, before any amount is stored), OQ-20 (collection layout, before Phase 2), and OQ-23 (hostname, before public launch).
