# Phase 1 security review

Reviewed against `docs/architecture.md` sections 8, 10, 15, and 16, and the XT-1 through XT-25 cases in section 20.4. Rules are default deny. The catch-all match denies every path that has no explicit allow. Tests run on the Emulator Suite as `demo-magemai`.

## Firestore

| Path | Client read | Client write | Tests |
| --- | --- | --- | --- |
| `users/{uid}` | Self `get`. Active platform admin `get` and `list`. | Create and delete denied. Self update of `displayName`, `phoneNumber`, `locale`, and `updatedAt` only. | XT-9, XT-10, XT-14, XT-16. `tests/rules/user-access.test.ts` covers the allowed profile update. |
| `businesses/{id}` | Active member `get`, including a suspended business. Active platform admin `get` and `list`. | Denied, including status, verification, and owner fields. | XT-1, XT-6, XT-14, XT-15. Suspended read is in `tests/rules/phase1-security.test.ts`. |
| `businessMembers/{id}` | Own `get`. Active platform admin. Active owner, admin, or manager `get` of the same business. Staff cannot read another member. | Denied. | XT-2, XT-7, XT-15. List shapes below. |
| `businessMembers` list | Own `userId`. Active platform admin. Manager query with `businessId` pinned to their business. | Denied. | The pinned `businessId` query succeeds for a manager and fails for staff and for another tenant. No `listBusinessMembers` callable was added. |
| `businessSlugs/{slug}` | Denied. | Denied. | `phase1-security.test.ts`. |
| `platformSettings/global` | Any signed-in `get`. | Denied. | XT-16 and the signed-in allow. |
| `platformSettings/{other}` | Active platform admin. | Denied. | `phase1-security.test.ts`. |
| `platformAdmins/{uid}` | Own `get`. Active platform admin `get` and `list`. | Denied for every client, including an active super-admin. | XT-15, XT-21 through XT-25. |
| `auditLogs/{id}` | Active platform admin. Owner or admin of that business when `scope` is `business`. | Denied. | XT-3, XT-8, XT-12, XT-13, XT-14, XT-15. |
| Any other path | Denied. | Denied. | `customers/one` in `phase1-security.test.ts`. |

`isActivePlatformAdmin()` requires the claim and `exists()` before `get()` on `platformAdmins/{uid}`, then `status == "active"`. A missing registry document and a `revoked` document both deny, including when the ID token still has `superAdmin: true`. Membership checks use `exists()` before `get()` the same way.

A revoked membership cannot read the business. The person can still read their own membership document.

## Storage

| Path | Read | Write | Tests |
| --- | --- | --- | --- |
| `users/{uid}/avatar` | Any signed-in user. | That user, JPEG, PNG, or WebP, 1 byte through 2 MiB. | `user-access.test.ts` and XT-16. |
| `businesses/{id}/brand/logo` | Active member. | Owner, admin, or manager, and only while `businesses/{id}.status` is `active`. Max 2 MiB. | XT-4, XT-5, XT-17. Staff can read and cannot write. A super-admin without a membership cannot read. |
| `businesses/{id}/brand/cover` | Active member. | Same editors, active business, max 5 MiB. | Small PNG allowed. Over 5 MiB denied. |
| `businesses/{id}/private/**` | Denied. | Denied. | XT-18, including an object seeded with rules disabled. |
| Any other path | Denied. | Denied. | `brand/extra`. |

SVG, HEIC, and GIF are denied. A suspended business stays readable and rejects a new logo. `setBusinessImage` returns the suspended-business error before it links an object.

## Download tokens

Application code does not call `getDownloadURL`. The search covered `src`, `functions`, `scripts`, and `tests`. The name appears only in docs.

`clearDownloadToken` sets `firebaseStorageDownloadTokens` to null and `magemaiDownloadTokenStripped` to `"true"`. `setUserAvatar`, `setBusinessImage`, and the `stripDownloadTokens` finalize trigger all use that helper. On the Storage emulator, null does not replace a token that is already stored. The marker is stored and the previous token remains. A signed-out SDK read still fails. `docs/setup.md` records the difference.

## Indexes

`firestore.indexes.json` has the composite indexes from architecture section 15 for businesses, memberships, and audit logs, plus the `createdBy` + `createdAt` index used by the daily creation cap. `users.createdAt` descending is a single-field index Firestore creates automatically, so it is not repeated as a composite.

## Fixes in this review

- Manager member lists are allowed only when the query pins `businessId`. The emulator accepts that shape, so the collection stays closed and no list callable was added.
- Brand writes and `setBusinessImage` now require `status == "active"`. Members can still read a suspended business and its existing logo.
- The download-token helper is the one function used by the trigger and both image callables. The emulator result is locked by a test instead of assumed.

## Deploy

These files changed and are not live until the owner deploys:

- `firestore.rules`
- `storage.rules`
- `functions/src/storage.ts` and `functions/src/business.ts` (`deploy:functions`)
- Hosting, for the booking-link wizard and the platform Check again button (`deploy:hosting`)

Indexes did not change. Storage rules did, so `deploy:rules` still publishes them with the Firestore rules.
