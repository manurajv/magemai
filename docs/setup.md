# Magemai environment setup

**Product:** Magemai  
**Endorsement:** A Mavixas product  
**Tagline:** Your business. Your own space.

This guide is for local development against the Emulator Suite, and for the one cloud project the owner already has. The application is not scaffolded yet. Commands that depend on `package.json` or on `scripts/provision-super-admin.ts` are marked as available once the matching checklist step has landed. The contracts those commands must meet are in [architecture.md](./architecture.md).

Do not deploy to `magemai` until the owner explicitly says so. Local work and automated tests use the Emulator Suite (`demo-magemai`) and do not need a paid Firebase plan. There is no separate dev or staging project.

## 1. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 24.x (Active LTS) | App, tests, and the Cloud Functions `nodejs24` runtime. The emulator runs functions on the local Node version, so a mismatch means tests do not match production. |
| npm | the npm that ships with Node 24 | Package manager for the app and for functions. |
| Java JDK | 21 or newer | Required by the Firebase emulators (Firestore). |
| Firebase CLI | 14.26.0 or newer | Recognizes the Node.js 24 runtime. |
| Git | current | Clone and branch. |
| A Google account | — | Firebase console and, later, Google sign-in configuration. |

Optional: a Node version manager so the machine stays on 24.x while other projects use something else.

Check:

```bash
node --version    # v24.x
npm --version
java -version     # 21 or newer
firebase --version
```

Install the CLI if it is missing:

```bash
npm install -g firebase-tools
firebase login
```

`firebase login` is for console administration. It is not the credential the super-admin script uses. That script uses a service-account file (section 8).

## 2. Repository

```bash
git clone <the magemai repository url>
cd magemai
```

After workflow step 4 (foundation) has added the manifest:

```bash
npm install
```

Until that step, there is nothing to install. Planning docs are in `docs/`.

## 3. Firebase projects

### 3.1 Live project

The owner already has the only cloud project. Do not create a dev, staging, or production project. Do not put web API keys in the repository. Those public config values go in a gitignored env file later (section 6). The variables are what a later project would change. Source code does not hardcode a second project.

| | Value |
| --- | --- |
| Project id | `magemai` |
| Project number | `122706427013` |
| Support email | `mavixas.ceo@gmail.com` |
| Billing | Being upgraded to the Blaze plan by the owner |
| Region | `asia-south1` (Mumbai) for Firestore and for Cloud Functions. Owner-approved. The Firestore location cannot be changed after the database is created. |
| Assigned hostnames | `magemai.web.app` and `magemai.firebaseapp.com` |

Confirm in the console that the project number is `122706427013` before running an operator script, so the credentials are for this project and not a different one named similarly.

When Cloud Firestore is enabled, choose `asia-south1`. If the database already exists in another region, stop. Do not create a second database to work around it, and do not deploy Functions elsewhere. Tell the owner, because D13 is a locked decision.

Enable Cloud Storage in the same region. Enable Authentication as in section 4. Add a web app in Project settings and copy the SDK config into the gitignored env file. Leave the values out of git. Hosting's GitHub integration is not required.

### 3.2 Local emulators

Use the project id `demo-magemai` for every emulator run, including CI. `demo-` projects are reserved by the emulator and do not touch `magemai`.

```bash
firebase emulators:start --project demo-magemai
```

`.firebaserc` maps `default` to `magemai` so a deliberate deploy has one target. Emulator commands always pass `--project demo-magemai` and do not use that default. Do not add `dev`, `staging`, or `prod` aliases.

### 3.3 Safeguards

`magemai` is the only cloud database. A test or a bad script cannot be aimed at a disposable project, because there isn't one.

- Day-to-day development and every automated test use the emulators. `.env.development` sets `VITE_USE_FIREBASE_EMULATORS=true` and `VITE_FIREBASE_PROJECT_ID=demo-magemai`.
- Do not run the rules suite, Playwright, an emulator import, or any script that deletes or overwrites collections against `magemai`. Test commands must fail if they see that project id.
- Seed and super-admin scripts may write to `magemai` only after the operator types the project id `magemai` and the project number `122706427013`.
- `firebase deploy` is not part of test runs. It runs only after the owner has said to deploy, and only after the same typed confirmation. Section 10.
- Set budget alerts on `magemai` before the first functions deploy. Section 7.

## 4. Authentication providers

On project `magemai`, open Authentication → Sign-in method:

1. Enable **Email/Password**. Leave email link (passwordless) off.
2. Enable **Google**.
   - Set the OAuth consent-screen support email to `mavixas.ceo@gmail.com` on project `magemai`.
   - The consent screen can stay in testing while the product is private. Add the Google accounts that will sign in during testing as test users if the screen is in testing mode.
   - Authorized domains: `localhost`, `magemai.web.app`, and `magemai.firebaseapp.com`. Do not add a custom domain.
3. Turn on **email enumeration protection** (Authentication → Settings → User actions).
4. Leave phone authentication off. It is not part of Phase 1 and has its own billing.

The web client shows the Google button only when `VITE_GOOGLE_AUTH_ENABLED=true`. Leave that variable empty until the provider is enabled for that project.

Google sign-in in the Emulator Suite does not contact Google. Automated tests use the emulator's simulated Google provider. A real Google sign-in is a manual check on a project where section 4.2 is done.

## 5. Emulator Suite

The emulator ports Phase 1 will commit in `firebase.json`:

| Emulator | Port |
| --- | --- |
| Authentication | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Storage | 9199 |
| Hosting | 5000 |
| Emulator UI | 4000 |

After step 4, start them from the repository root:

```bash
firebase emulators:start --project demo-magemai
```

The UI is at `http://127.0.0.1:4000`. The app, with `VITE_USE_FIREBASE_EMULATORS=true`, connects to these ports on `127.0.0.1`.

Tests use a one-shot run so CI does not leave processes behind:

```bash
npm run test:all
```

That script is added in steps 4, 9, and 10. It runs unit tests, security-rules tests, and Playwright under `firebase emulators:exec`.

### Auth emulator and verification emails

The emulator does not send mail. Verification and password-reset codes are stored in the emulator. The UI lists them, and tests read:

```text
http://127.0.0.1:9099/emulator/v1/projects/demo-magemai/oobCodes
```

Use that seam in automated tests. Do not point a test at a real inbox.

### App Check locally

The emulator does not enforce App Check. For a manual run against a cloud project that does enforce it, create an App Check debug token in the console and set it in the browser as the Firebase debug token. Do not commit the token. Production enforcement uses reCAPTCHA Enterprise, configured in the App Check console, with the site key in `VITE_FIREBASE_APP_CHECK_SITE_KEY`.

## 6. Environment variables

Vite loads env files by mode. Create them locally. Only `.env.example` is committed, and its values stay empty.

| File | When it is used | Committed |
| --- | --- | --- |
| `.env.example` | documentation | yes, empty values |
| `.env.development` | local `vite` dev server | no |
| `.env.production` | `vite build` aimed at `magemai` | no |

Names:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_APP_CHECK_SITE_KEY=
VITE_GOOGLE_AUTH_ENABLED=
VITE_USE_FIREBASE_EMULATORS=
VITE_FIREBASE_EMULATOR_HOST=
```

Local development values:

```text
VITE_USE_FIREBASE_EMULATORS=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_PROJECT_ID=demo-magemai
VITE_GOOGLE_AUTH_ENABLED=true
```

The other `VITE_FIREBASE_*` keys can be any non-empty placeholder when the emulator flag is on. Local tests keep `VITE_FIREBASE_PROJECT_ID=demo-magemai`.

A build aimed at the live project uses `.env.production`. It sets `VITE_USE_FIREBASE_EMULATORS=false` and `VITE_FIREBASE_PROJECT_ID=magemai`, and fills the other `VITE_FIREBASE_*` keys from the web app config in the Firebase console for project number `122706427013`. Those values are public web config, not a service account. They are still not committed. Copy them into the gitignored env file when a cloud build is actually needed. This documentation change does not add them. Another project later would be a different gitignored env file with a different `VITE_FIREBASE_PROJECT_ID`. Do not add that file now.

The client throws on startup if a production build sees the emulator flag set to `true`.

`VITE_FIREBASE_APP_CHECK_SITE_KEY` is empty locally and set in `.env.production` after App Check is configured on `magemai`.

Never create a `VITE_` variable that contains a private key, a service-account JSON, or an OAuth client secret.

Operator-only, in the shell environment of the person running a script, never in an env file that Vite loads:

```text
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json
```

## 7. Billing

| Need | Plan |
| --- | --- |
| Emulators, including Functions on your machine | Spark is enough. Emulators do not bill. |
| Auth (email/password and Google), Firestore, Storage, Hosting, security rules, within the no-cost quotas | Spark |
| Deploying Cloud Functions (onboarding, profile sync, status changes, storage trigger) | **Blaze** |

Spark turns a product off for the rest of the month if that product's no-cost quota is exceeded. Phone authentication is not used.

Cloud Functions, including 2nd gen functions on Cloud Run, deploy only from a Blaze project. The no-cost invocation allowance still applies, and container storage and function builds can produce a small charge anyway. Treat Blaze as "can bill", not as "will stay at zero".

Before the first functions deploy on a project:

1. Link a billing account and upgrade that project to Blaze.
2. Create a monthly budget you are willing to spend. A pre-launch starting point is often on the order of USD 25–50. Pick the number yourself.
3. Add budget alerts at 50%, 90%, and 100%.
4. Set a Cloud Run spend cap so a runaway functions deploy stops. Leave function minimum instances at 0.

The owner is upgrading `magemai` to Blaze. Set the budget, the 50/90/100 percent alerts, and the Cloud Run spend cap on that billing account before the first functions deploy. There is no second cloud project. Skip cloud billing for as long as you stay on the emulators. Emulator work does not touch `magemai`.

Scheduled database exports, which are the backup story before real tenant data lands in `magemai`, also need Blaze and a storage bucket. Turn them on as an operations task when that project is first deployed, not before.

## 8. Platform seed and super-admin provisioning

Both scripts are implemented in the checklist (seed in step 6, provisioning in step 8). Until they exist, do not hand-edit Firestore to fake an administrator. Platform access requires both the custom claim `superAdmin: true` and `platformAdmins/{uid}` with `status` `active`. Clients cannot write that collection. The operator script is the only supported writer. Architecture section 17.3 is the contract, including order, idempotence, and partial failure.

### 8.1 Service account

For `magemai`:

1. In Google Cloud console, select project number `122706427013` (`magemai`). Create a service account used only for Magemai operator scripts, for example `magemai-operator`.
2. Grant it **Firebase Authentication Admin** and **Cloud Datastore User** on that project only.
3. Create a JSON key and store it outside the repository. A reasonable location is a directory your home folder owns and the repo is not inside.
4. Confirm `git status` does not list the JSON file. `.gitignore` rejects `*serviceAccount*.json` and `*firebase-adminsdk*.json`.

This service account is for `magemai` only. The emulator does not use it. If a second cloud project is ever introduced, it gets its own key. Do not reuse this one.

The emulator does not need this file. Tests set the claim and the registry document through the emulator's admin interface, against `demo-magemai` only.

### 8.2 Seed platform settings

Day-to-day seeding runs against the emulator (`demo-magemai`) and does not use a cloud key. The test harness does the same.

Against `magemai`, only when the owner wants the live settings document, and only after typing the project id and the project number:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run seed:platform-settings -- --project magemai
```

The script writes `platformSettings/global` (defaults in the architecture: Sri Lanka, LKR, English, `Asia/Colombo`, the shared category list) and an audit row. Running it again updates that document. It does not delete other collections. Step 6 records the exact emulator command in this file if it differs.

### 8.3 Provision the first super-admin

Public registration cannot create a super-admin. There is no in-app control and no callable that writes `platformAdmins` or custom claims.

After step 8, against the live project only when the owner wants a real operator, and against the emulator for tests:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run provision:super-admin -- --project magemai --email <operator-email>
```

The script refuses to run if the credentials path is missing, is inside the repository, or if `--project` or `--email` is missing. It prints the project id, the project number, and the email. The operator types `magemai` and `122706427013`. Any other number exits before a write.

Grant order:

1. Load the Auth user by email. If the email does not exist, create it, mark the email verified, and print a one-time random password. The person uses **Forgot password** on `/login` to choose their own. Creating the user in the Authentication console first is the same kind of operator action. The `/register` page is not involved.
2. Ensure `users/{uid}` exists, with no admin field on that document.
3. Upsert `platformAdmins/{uid}` to `status: "active"`, with `grantedBy` set to the service-account email and `grantedAt` set to the server time. `revokedBy`, `revokedAt`, and `reason` are null. If the document is already active, leave `grantedAt` as it is.
4. Merge the custom claim `superAdmin: true` without removing other claims.
5. Write audit log `super_admin.provision`.
6. Tell the person to sign out and sign in so the ID token picks up the claim. Navigation uses the claim. Lists and status changes also require the registry row from step 3.

The registry is written before the claim. If the script stops after step 3, platform reads stay denied because the claim is missing. Re-run the same command. It repairs the missing half and does not duplicate the audit row when both halves are already in place. Full idempotence and partial-failure behavior is in architecture section 17.3.

Revoke. `--reason` is required:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run provision:super-admin -- --project magemai --email <operator-email> \
  --revoke --reason "<why this access ends>"
```

Revoke order:

1. Set `platformAdmins/{uid}` to `status: "revoked"` and fill `revokedBy`, `revokedAt`, and `reason`. Keep the document. This step alone denies access, including an ID token that still contains `superAdmin: true`.
2. Call `revokeRefreshTokens` for that uid. Refresh tokens stop working. An already issued ID token remains until it expires (at most one hour) and is denied by step 1 while it does.
3. Remove the `superAdmin` claim, leaving any unrelated claims in place.
4. Write audit log `super_admin.revoke` with the reason. Do not delete the Auth user.

If the script stops after step 1, access is already denied. Re-run to finish the token revocation, the claim removal, and the audit row. Do not remove the claim first. An old token would keep working until expiry if the registry were still `active`.

Sign in at `/login` with that email. The super-admin area is `/super-admin`. A user without the claim sees a 403 state. A user whose registry is `revoked` also sees a 403 state, even when the token still carries the claim.

## 9. Local app

After step 4, with emulators running and `.env.development` in place:

```bash
npm run dev
```

The Vite URL is printed in the terminal. Create an account on `/register`, verify it through the emulator UI's out-of-band code, and return to the app. Onboarding is `/business/register`.

Create businesses through that wizard. Do not add a hard-coded tenant.

## 10. Deploy

Not part of normal setup, and not part of the test commands. Deploy only after the owner has explicitly said to deploy, Blaze is on, and the budget alerts in section 7 are in place.

Build first, so the bundle talks to `magemai` and not to the emulators:

```bash
npm run build -- --mode production
```

Then deploy. The command must print project id `magemai` and project number `122706427013` and wait until the operator types both. A wrapper added in the checklist does that before it invokes the CLI:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting --project magemai
```

There is no staging project to deploy to first. This setup guide does not authorize the deploy. Do not aim a test command at `magemai`.

Hosting answers on `magemai.web.app` and `magemai.firebaseapp.com`. Add those hostnames to Authentication → Authorized domains if Firebase has not added them automatically. Do not attach a custom domain.

## 11. What not to commit

- `.env`, `.env.development`, `.env.production`, and any other `.env.*` file except `.env.example`
- Service-account JSON and any file named like a Firebase admin SDK key
- `GOOGLE_APPLICATION_CREDENTIALS` contents
- App Check debug tokens
- A custom domain. `magemai.web.app` and `magemai.firebaseapp.com` are the Firebase-assigned hostnames for project `magemai` and are the only hosts the docs name.
- Emulator data exports that contain real personal information

`.env.example` is the exception: names only, empty values.

## 12. Troubleshooting

| Symptom | What to check |
| --- | --- |
| Emulators fail immediately with a Java error | JDK 21+ is installed and `java` is on `PATH`. |
| The app reads a cloud project while you expected local data | `VITE_USE_FIREBASE_EMULATORS` is `true` and the dev server was restarted after the env change. |
| Google button missing | `VITE_GOOGLE_AUTH_ENABLED=true`, then restart Vite. |
| Onboarding returns an internal error about platform settings | Run the seed (section 8.2) against the same project the emulators or the app are using. |
| Super-admin pages show 403 after provisioning | Sign out and sign in so the claim is on the token. Confirm `platformAdmins/{uid}.status` is `active` and the script's `--project` was `magemai`. |
| Super-admin nav appears and the lists return permission-denied | The token still has `superAdmin` and the registry is `revoked` or missing. That is the intended denial. Re-run the grant script only if the revocation was a mistake. |
| Functions deploy rejected | The project is still on Spark. Section 7. `magemai` needs the Blaze upgrade the owner is applying, plus a budget alert, before a functions deploy. |
| `firebase deploy` warns that the local Node version is not 24 | Install Node 24. The emulator warning means tests are running on a different runtime than production. |
