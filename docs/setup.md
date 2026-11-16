# Magemai environment setup

**Product:** Magemai  
**Endorsement:** A Mavixas product  
**Tagline:** Your business. Your own space.

This guide is for local development and for creating the Firebase projects Phase 1 will use. The application is not scaffolded yet. Commands that depend on `package.json` or on `scripts/provision-super-admin.ts` are marked as available once the matching checklist step has landed. The contracts those commands must meet are in [architecture.md](./architecture.md).

Do not deploy production, and do not deploy staging, until the owner explicitly says so. Local work uses the Emulator Suite and does not need a paid Firebase plan.

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

## 3. Create the Firebase projects

Create three projects in the [Firebase console](https://console.firebase.google.com/). Suggested ids, which you may change:

| Environment | Suggested id | Alias in `.firebaserc` |
| --- | --- | --- |
| Development | `magemai-dev` | `dev` |
| Staging | `magemai-staging` | `staging` |
| Production | `magemai-prod` | `prod` |

The ids are yours. The docs do not assume a specific id, and they do not name a custom domain.

For **each** project, before the first database write:

1. Upgrade billing only when you are about to deploy Cloud Functions. See section 7. Emulator-only work can stay on the Spark plan.
2. Set the default Google Cloud resource location to **`asia-south1` (Mumbai)** unless open question OQ-1 in the architecture was overridden. Firestore cannot be moved afterward. Functions use the same region.
3. Add a web app in Project settings. Copy the SDK config into the env file for that environment (section 6). You do not need to turn on Firebase Hosting's GitHub integration.
4. Enable Cloud Firestore in production mode (rules deny by default; the committed `firestore.rules` replace the console placeholder at deploy time).
5. Enable Cloud Storage. Use the same region.
6. Enable Authentication (section 4).

You can develop entirely on emulators before these projects exist. Use the project id `demo-magemai` for emulator runs. `demo-` projects are reserved by the emulator and do not touch a real cloud project.

After step 4, `.firebaserc` maps aliases to the real ids on each machine. Do not commit a file that you are not prepared to share; project ids are not secret, service accounts are.

## 4. Authentication providers

In each cloud project, open Authentication → Sign-in method:

1. Enable **Email/Password**. Leave email link (passwordless) off.
2. Enable **Google**.
   - Set a support email on the OAuth consent screen.
   - The consent screen can stay in testing while the product is private. Add the Google accounts that will sign in during testing as test users if the screen is in testing mode.
   - Authorized domains: `localhost`, and the project's `web.app` and `firebaseapp.com` hostnames. Do not add a custom domain.
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
| `.env.staging` | `vite build --mode staging` | no |
| `.env.production` | `vite build` | no |

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

The other `VITE_FIREBASE_*` keys can be the development web-app config or any non-empty placeholder when the emulator flag is on. They are the public web config. They are not a service account, and they are safe to ship in a frontend bundle. They still do not belong in a ticket or a screenshot of a production project if you can avoid it.

Staging and production files set `VITE_USE_FIREBASE_EMULATORS=false` (or leave it unset) and use that project's web config. The client throws on startup if a production build sees the emulator flag set to `true`.

`VITE_FIREBASE_APP_CHECK_SITE_KEY` is empty locally and set in staging and production after App Check is configured.

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

Do this separately for development, staging, and production if each one will host functions. Skip it for as long as you stay on the emulators.

Scheduled database exports, which are the backup story before real tenant data lands in production, also need Blaze and a storage bucket. Turn them on as an operations task when production is first deployed, not before.

## 8. Platform seed and super-admin provisioning

Both scripts are implemented in the checklist (seed in step 6, provisioning in step 8). Until they exist, do not hand-edit a user document to fake an administrator. There is no document field that grants access. The grant is a custom claim set by the Admin SDK.

### 8.1 Service account

For each cloud project that needs a seed or a super-admin:

1. In Google Cloud console → IAM → Service accounts, create an account used only for Magemai operator scripts. Name it for the environment, for example `magemai-operator-dev`.
2. Grant it **Firebase Authentication Admin** and **Cloud Datastore User** on that project only.
3. Create a JSON key and store it outside the repository. A reasonable location is a directory your home folder owns and the repo is not inside.
4. Confirm `git status` does not list the JSON file. `.gitignore` rejects `*serviceAccount*.json` and `*firebase-adminsdk*.json`.

Development, staging, and production use different service accounts. A claim written in one project does nothing in the others.

The emulator does not need this file. Tests set the `superAdmin` claim through the Auth emulator's admin interface.

### 8.2 Seed platform settings

After step 6, against a cloud project or, for local data, against the emulator as the script's `--project` flag documents:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run seed:platform-settings -- --project <firebase-project-id>
```

The script writes `platformSettings/global` (defaults in the architecture: Sri Lanka, LKR, English, `Asia/Colombo`, the shared category list) and an audit row. It is safe to run again.

For day-to-day emulator use, the test harness and a local seed path write the same document without a cloud key. Step 6 records the exact local command in this file if it differs.

### 8.3 Provision the first super-admin

Public registration cannot create a super-admin. There is no in-app control for it either.

After step 8:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run provision:super-admin -- --project <firebase-project-id> --email <operator-email>
```

The script:

1. Refuses to run if the credentials path is missing, is inside the repository, or if `--project` or `--email` is missing.
2. Prints the project and the email and waits for a typed confirmation.
3. Loads the Auth user. If the email does not exist, it creates the user, marks the email verified, and prints a one-time random password. The person then uses **Forgot password** on `/login` to choose their own. You may also create the email/password user yourself in the Authentication console first, and then run the script. Either path is an operator action. The `/register` page is not involved.
4. Sets the custom claim `superAdmin: true` without removing other claims.
5. Ensures `users/{uid}` exists, still without an admin flag on the document.
6. Writes an audit log `super_admin.provision`.
7. Tells the person to sign out and sign in so the ID token refreshes.

Revoke:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run provision:super-admin -- --project <firebase-project-id> --email <operator-email> --revoke
```

That removes the claim and writes `super_admin.revoke`. It does not delete the user.

Sign in at `/login` with that email. The super-admin area is `/super-admin`. A user without the claim who opens that URL sees a 403 state.

## 9. Local app

After step 4, with emulators running and `.env.development` in place:

```bash
npm run dev
```

The Vite URL is printed in the terminal. Create an account on `/register`, verify it through the emulator UI's out-of-band code, and return to the app. Onboarding is `/business/register`.

Create businesses through that wizard. Do not add a hard-coded tenant.

## 10. Deploy

Not part of normal setup. When the owner has authorized a deploy to a named environment:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting --project <alias>
```

`<alias>` is `dev`, `staging`, or `prod` from `.firebaserc`. The project must already be on Blaze, with a budget alert, before this command includes functions.

Build the frontend for that environment first so the bundle contains that project's web config and does not contain the emulator flag:

```bash
npm run build -- --mode staging   # or production
```

The exact npm script names are fixed in step 4 and recorded here if they differ.

Hosting will answer on the project's `web.app` and `firebaseapp.com` hostnames. Add those hostnames to Authentication → Authorized domains if Firebase has not added them automatically. Do not attach a custom domain in this step.

## 11. What not to commit

- `.env`, `.env.development`, `.env.staging`, `.env.production`
- Service-account JSON and any file named like a Firebase admin SDK key
- `GOOGLE_APPLICATION_CREDENTIALS` contents
- App Check debug tokens
- A filled-in production hostname that has not been cleared for the brand
- Emulator data exports that contain real personal information

`.env.example` is the exception: names only, empty values.

## 12. Troubleshooting

| Symptom | What to check |
| --- | --- |
| Emulators fail immediately with a Java error | JDK 21+ is installed and `java` is on `PATH`. |
| The app reads a cloud project while you expected local data | `VITE_USE_FIREBASE_EMULATORS` is `true` and the dev server was restarted after the env change. |
| Google button missing | `VITE_GOOGLE_AUTH_ENABLED=true`, then restart Vite. |
| Onboarding returns an internal error about platform settings | Run the seed (section 8.2) against the same project the emulators or the app are using. |
| Super-admin pages show 403 after provisioning | Sign out and sign in so the claim is on the token. Confirm the script's `--project` is the project in the env file. |
| Functions deploy rejected | The project is still on Spark. Section 7. |
| `firebase deploy` warns that the local Node version is not 24 | Install Node 24. The emulator warning means tests are running on a different runtime than production. |
