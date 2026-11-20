# Magemai environment setup

**Product:** Magemai  
**Endorsement:** A Mavixas product  
**Tagline:** Your business. Your own space.

Day-to-day development uses the live Firebase project `magemai`. Emulators are optional and are required only for rules tests and for `npm run test:e2e`. The policy is [Live Firebase by default](./architecture.md#24-live-firebase-by-default). There is no separate dev or staging project.

Windows setup is section 2. You do not need the JDK or the emulators to sign in and create a business.

## 1. Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 24.x LTS recommended. 26.x supported for local development. | The app, tests, and npm scripts accept Node `>=24`. Cloud Functions still deploy as `nodejs24`. The emulator runs function source on the local Node version. |
| npm | the npm that ships with that Node | Package manager for the app and for functions. npm 11 was used with Node 24 and Node 26. |
| Java JDK | 21 or newer (Temurin 21.0.13 is a known-good build) | Required by the Firebase emulators (Firestore). |
| Firebase CLI | 15.0.0 or newer (15.36.0 verified) | Emulators require JDK 21 or newer, and the CLI recognizes the Node.js 24 runtime. The repository also installs `firebase-tools` locally. |
| Git | current | Clone and branch. |
| A Google account | — | Firebase console and, later, Google sign-in configuration. |

Optional: a Node version manager so the machine stays on 24.x while other projects use something else.

Check:

```bash
node --version    # v24.x recommended, or v26.x
npm --version
java -version     # 21 or newer
firebase --version
```

Install the CLI if it is missing:

```bash
npm install -g firebase-tools
firebase login
```

`firebase login` is for console administration. It is not the credential the super-admin script uses. That script uses a service-account file (section 9). On Windows, follow section 2 instead of the bash snippets above.

## 2. Windows setup

These steps are for Windows 10 or Windows 11, using PowerShell. They install the tools. They do not create a Firebase project, and they do not deploy. **Node.js 24 LTS is recommended. Node.js 26 is supported for local development.** The owner's PC uses Node.js 26.13.1 and JDK 21.0.13 (Temurin). Keep that Node 26 install. Cloud Functions still declare runtime `nodejs24`. `package.json` accepts Node `>=24` and this repository sets `engine-strict=false`, so npm install does not fail on Node 26. `.nvmrc` stays on `24` for a version manager that wants the recommended LTS. The Functions emulator runs function code on the local Node, so a Node 26 machine prints a warning that the requested runtime is 24 and then uses 26. Step 4 exports no business functions, so that warning does not change behavior. When functions are added, CI should run them on Node 24. [OQ-26](./architecture.md#oq-26-package-manager-and-formatting) selects **npm** (the npm that ships with the installed Node), ESLint, and Prettier. The commands below use npm.

Open "Terminal" or "PowerShell" from the Start menu. You do not need "Run as administrator" for these installs if you install for the current user.

### 2.1 Node.js 24

**Installer.** Download the Windows 64-bit installer for Node.js 24 LTS from [https://nodejs.org/](https://nodejs.org/). Accept the defaults, including the option that adds Node to `PATH`. Close every open terminal, open a new PowerShell, and check:

```powershell
node --version
npm --version
```

`node --version` may print `v24.x` or `v26.x`. Both are accepted. `v24.x` is the recommended LTS. If it prints a version older than 24, an earlier install is still first on `PATH`. The installer path is usually `C:\Program Files\nodejs\`. Move that entry above older Node entries in Environment Variables → Path, then open a new terminal. Do not uninstall Node.js 26 just to match `.nvmrc`.

**nvm-windows, if you already use it.** This is the Windows program named nvm-windows, not the Unix `nvm` script. In a new PowerShell:

```powershell
nvm install 24
nvm use 24
node --version
```

Node 26 is the other supported local version:

```powershell
nvm install 26
nvm use 26
node --version
```

If `nvm` is not recognized, Node was not installed that way. Use the installer above. Do not run both an installer Node and `nvm use` against different versions in the same terminal.

### 2.2 Java JDK 21

The Firestore and Storage emulators are Java programs. Firebase CLI 15 and newer refuse to start them on Java older than 21. Install **JDK 21 or newer** (Temurin 21 LTS from [https://adoptium.net/](https://adoptium.net/) is a suitable build). The official Emulator Suite page still mentions JDK 11. That line is older than CLI 15. This project follows CLI 15: JDK 21 or newer.

Temurin 21.0.13 is a known-good build. The Temurin installer can set `JAVA_HOME` if you leave that option checked. If `java` is not found, set it for the current user:

1. Start → search "Environment Variables" → "Edit environment variables for your account".
2. New user variable `JAVA_HOME` = the JDK directory, for example `C:\Program Files\Eclipse Adoptium\jdk-21.0.x-hotspot`. Do not point it at the `bin` folder.
3. Edit the user `Path` variable. Add `%JAVA_HOME%\bin`.
4. Close PowerShell and open it again.

```powershell
java -version
```

The first line must say version 21 or greater. If it says 8, 11, or 17, another Java is earlier on `PATH`. Fix `Path` so `%JAVA_HOME%\bin` comes first, then open a new terminal.

### 2.3 Firebase CLI and login

```powershell
npm install -g firebase-tools
firebase --version
```

Use Firebase CLI **15.0.0 or newer**. CLI 15 dropped emulator support for Java before 21. CLI 14.26 or newer can deploy the Node.js 24 runtime, and 15 satisfies that as well.

Emulator work with `--project demo-magemai` does **not** require login. Login is only for a later deploy the owner has approved:

```powershell
firebase login
```

A browser opens. If the redirect never returns, run `firebase login --no-localhost` and paste the code it prints. `firebase login` does not deploy anything.

If PowerShell says running scripts is disabled when you type `firebase`, the shim is `firebase.ps1` and the execution policy blocked it. Either call `firebase.cmd --version`, or set the current-user policy once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Do not set the policy to `Unrestricted`. `npm` and `node` are `.exe` files and are not affected by that policy.

### 2.4 Repository and install

`package.json` is in the repository. From the repository root, in PowerShell:

```powershell
cd C:\path\to\magemai
npm install
npm install --prefix functions
```

`npm install` warns, and does not fail, when Node is 26 and a dependency declares an older engine. `firebase-tools` pulls in `superstatic`, whose engine list is Node 20, 22, or 24. The CLI still runs on Node 26. The functions package declares `"node": "24"` so a deploy uses the `nodejs24` runtime. `functions/.npmrc` sets `engine-strict=false` so that install also succeeds on Node 26.

### 2.5 Emulator configuration

Step 4 commits `firebase.json` with the ports and `singleProjectMode` from architecture section 24.1. The values are fixed:

| Emulator | Address |
| --- | --- |
| Emulator UI | http://127.0.0.1:4000 |
| Hosting | 127.0.0.1:5000 |
| Functions | 127.0.0.1:5001 |
| Firestore | 127.0.0.1:8080 |
| Authentication | 127.0.0.1:9099 |
| Storage | 127.0.0.1:9199 |

The first start downloads the emulator jars. That download is local. It does not create cloud resources.

### 2.6 Start, stop, import, and export

From the repository root, in PowerShell:

```powershell
npm run emulators:start
```

That runs `node scripts/emulators.mjs start`, which runs `firebase emulators:start --project demo-magemai`. When `emulator-data\firebase-export-metadata.json` already exists it also passes `--import ./emulator-data`. It always passes `--export-on-exit ./emulator-data`. The project id is hardcoded to `demo-magemai`.

Leave that window open. Open the UI at http://127.0.0.1:4000.

**Stop.** Click the emulator window and press Ctrl+C once. Wait until it prints that the export finished. A second Ctrl+C skips the export and the next start will not see the latest data.

**Export while the suite is running.** In a second PowerShell:

```powershell
npm run emulators:export
```

That runs `firebase emulators:export ./emulator-data --project demo-magemai --force` against the local suite.

**Reset local data.** Stop the suite first, then:

```powershell
npm run emulators:reset
npm run emulators:start
```

`emulators:reset` deletes only the `emulator-data` folder inside this repository. It does not call Firebase and it cannot delete cloud data.

`emulator-data\` is gitignored. Do not force-add it. Synthetic data is recreated with the seed, not by committing an export.

### 2.7 Sign in against the live project

Create `.env.local` in the repository root. It is gitignored. Put the public web config there and leave `VITE_USE_FIREBASE_EMULATORS` unset:

```text
VITE_FIREBASE_API_KEY=<from the Firebase console>
VITE_FIREBASE_AUTH_DOMAIN=magemai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=magemai
VITE_FIREBASE_STORAGE_BUCKET=magemai.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=122706427013
VITE_FIREBASE_APP_ID=1:122706427013:web:1a378bc69df68f37bc3dec
```

The API key is also a public client value. Copy it from the console. Do not commit this file.

In the Firebase console, before the first sign-in:

1. Authentication → Sign-in method → enable Email/Password.
2. Firestore → create the database in `asia-south1` if it does not exist. If it already exists in another region, stop and do not create a second database.
3. Storage is already the default bucket `magemai.firebasestorage.app` in `us-east1`. Leave it there. That location is the no-cost tier and is intentional. Do not create a second bucket in `asia-south1`. Avatar, logo, and cover bytes live in that US bucket. Firestore stays in `asia-south1`.

Then:

```powershell
npm run dev
```

Open http://127.0.0.1:5173/register, create an account, and open the verification email. After you verify, sign in and open http://127.0.0.1:5173/business/register. Creating a business needs the rules, functions, and platform settings deployed (section 11).

The emulator seed in section 6 is optional. Its password `emupass-not-for-live` exists only in the Auth emulator. Do not reuse it on the live project.

### 2.8 Tests, types, and lint

```powershell
npm test
npm run test:rules
npm run test:e2e
npm run typecheck
npm run lint
npm run format
```

`npm test` does not need the emulators. `test:rules` and `test:e2e` start the Emulator Suite as `demo-magemai` and refuse a non-local host. They do not deploy.

`npm run test:e2e:live` talks to project `magemai`. It fails until section 11 has been deployed. `npm run test:cleanup:live` deletes only users whose email starts with `e2e+`.

### 2.9 Deploy from this PC

Deploy only after Email/Password is enabled, Firestore exists in `asia-south1`, and Blaze plus the budget alerts in section 8 are in place. The commands do not ask you to type the project id. They always pass `--project magemai`. CI does not run them.

```powershell
npm run deploy:rules
npm run deploy:functions
npm run seed:platform-settings
npm run deploy:hosting
npm run test:e2e:live
npm run test:cleanup:live
```

`deploy:functions` compiles `functions` before it uploads. `firebase.json` sets that predeploy to `npm --prefix "$RESOURCE_DIR" run build`. The Firebase CLI fills `RESOURCE_DIR` on Windows and on Linux, so a stale `functions/lib` is not deployed. The runtime stays `nodejs24`. Every function is 2nd gen. `onAuthUserCreated` is gone: Gen1 cannot run `nodejs24`. The next deploy asks to delete that old trigger. Confirm the deletion. Do not add `beforeUserCreated`.

`npm run deploy:functions` runs `node --experimental-strip-types scripts/deploy-functions.ts`. That wrapper sets `FUNCTIONS_DISCOVERY_TIMEOUT` to `60` when it is missing or lower. The Firebase CLI otherwise stops after 10 seconds with "Cannot determine backend specification. Timeout after 10000", which showed up on Windows while loading the functions code. The same Node process is used on Windows and on Linux, so the timeout does not depend on shell syntax. A value already above 60 is left alone. Handler modules stay behind a dynamic import, so discovery loads the function entry file and each function loads the Admin SDK on its first call.

`deploy:functions` publishes the callables in `asia-south1` and `stripDownloadTokens` in `us-east1`. The trigger has to share the bucket region. Deploying it in `asia-south1` fails with "A function in region asia-south1 cannot listen to a bucket in region us-east1". The first deploy of that 2nd gen trigger can also fail while Eventarc service-agent permissions propagate. Wait a minute and run `npm run deploy:functions` again. No code change is required for that warning.

`deploy:functions` does not publish `guardProviderSignIn`. That blocking function needs Identity Platform. Set `MAGEMAI_DEPLOY_BLOCKING_AUTH=true` in the same PowerShell window only after Identity Platform is enabled, then run `npm run deploy:functions` again. Until then, Google can attach to an existing password account.

2nd gen functions store container images in Artifact Registry, in `asia-south1` and in `us-east1`. After the first functions deploy, set a one-day cleanup in both regions so old images do not accumulate:

```powershell
firebase functions:artifacts:setpolicy --location asia-south1 --days 1 --project magemai --force
firebase functions:artifacts:setpolicy --location us-east1 --days 1 --project magemai --force
```

Run those once. A later deploy that warns about a missing cleanup policy means one of the two locations still needs the command.

`seed:platform-settings` and the live cleanup use Application Default Credentials. In PowerShell, after `gcloud auth application-default login`, or with `GOOGLE_APPLICATION_CREDENTIALS` pointing at a service-account file that is not in the repository:

```powershell
npm run seed:platform-settings
```

`deploy:hosting` reads `.env.local`. Leave the emulator flag unset. Live e2e will not pass before the rules, functions, and platform settings exist.

There is no `npm run deploy`. A deploy happens only after the owner explicitly approves it, using section 11, and only after you type the project id and the project number.

### 2.10 Windows troubleshooting

| Symptom | What to do |
| --- | --- |
| `Error: Could not spawn java -version` or "Java not found" | JDK 21 is installed, `JAVA_HOME` points at the JDK directory (not `bin`), `%JAVA_HOME%\bin` is on `Path`, and the terminal was opened after the change. `java -version` prints 21 or newer. |
| `firebase-tools no longer supports Java version before 21` | The `java` on `Path` is 8, 11, or 17. Point `JAVA_HOME` at JDK 21 and put it first on `Path`. |
| Port already in use (`8080`, `9099`, `5001`, `4000`, `5000`, `9199`) | Another emulator is still running. Close that window, or in PowerShell run `netstat -ano \| findstr :8080` (use the busy port) and stop that process. Do not retarget the script at `magemai` to "avoid" the port. |
| Windows Firewall asks to allow Java or Node | Allow it on private networks so the process can bind to `127.0.0.1`. If you block it, the emulator UI and the app cannot connect. The emulators are bound to loopback. They are not a public server. |
| PowerShell: "running scripts is disabled" | Run `firebase.cmd` instead of `firebase`, or `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once. |
| Stale users or businesses in the UI | Stop with one Ctrl+C so the export finishes, run `npm run emulators:reset`, start again, then `npm run emulators:seed`. Reset deletes only `emulator-data` on this PC. |
| Functions code changed and the emulator still runs the old function | Stop `npm run emulators:start` and start it again. A dependency change in `functions` needs the same restart after `npm install` inside `functions`. Do not deploy functions to see a local change. |
| A script or JSON file behaves differently on Windows than in CI | Line endings. Step 4 adds `.gitattributes` so `*.ts`, `*.tsx`, `*.json`, `*.mjs`, `*.rules`, and `*.md` stay LF. If you already checked out CRLF, run `git add --renormalize .` after that file exists. EditorConfig or "files.eol": "\n" in the editor avoids new CRLF saves. |
| The app shows data you did not seed, or the banner says LIVE FIREBASE | `.env.development.local` has the live opt-in. Remove `VITE_ALLOW_LIVE_FIREBASE` or set it to `false`, set `VITE_USE_FIREBASE_EMULATORS=true`, and restart `npm run dev`. |
| `npm run emulators:start` is not found | Run the command from the repository root after `npm install`. The script is `node scripts/emulators.mjs start`. |

## 3. Repository

```bash
git clone <the magemai repository url>
cd magemai
```

```bash
npm install
npm install --prefix functions
```

Planning docs remain in `docs/`.

## 4. Firebase projects

### 4.1 Live project

The owner already has the only cloud project. Do not create a dev, staging, or production project. Do not put web API keys in the repository. Those public config values go in a gitignored env file later (section 7). The variables are what a later project would change. Source code does not hardcode a second project.

| | Value |
| --- | --- |
| Project id | `magemai` |
| Project number | `122706427013` |
| Support email | `mavixas.ceo@gmail.com` |
| Billing | Being upgraded to the Blaze plan by the owner |
| Region | `asia-south1` (Mumbai) for Firestore and for Cloud Functions. Owner-approved. The Firestore location cannot be changed after the database is created. The default Storage bucket stays in `us-east1` for the no-cost tier. Only `stripDownloadTokens` is deployed there. |
| Assigned hostnames | `magemai.web.app` and `magemai.firebaseapp.com` |

Confirm in the console that the project number is `122706427013` before running an operator script, so the credentials are for this project and not a different one named similarly.

When Cloud Firestore is enabled, choose `asia-south1`. If the database already exists in another region, stop. Do not create a second database to work around it, and do not deploy the callables elsewhere. Tell the owner, because D13 is a locked decision.

Cloud Storage is already enabled as `magemai.firebasestorage.app` in `us-east1`. Leave that bucket where it is. Enable Authentication as in section 5. Add a web app in Project settings and copy the SDK config into the gitignored env file. `VITE_FIREBASE_STORAGE_BUCKET` is `magemai.firebasestorage.app`. Leave the values out of git. Hosting's GitHub integration is not required.

### 4.2 Local emulators

Use the project id `demo-magemai` for every emulator run, including CI. `demo-` projects are reserved by the emulator and do not touch `magemai`. Start them with `npm run emulators:start` (section 2.6 and architecture section 24). That command is the only supported start path. It passes `--project demo-magemai` itself. Use Node 24 in CI so the Functions emulator matches the `nodejs24` runtime. Node 26 is supported on a developer PC.

`.firebaserc` maps `default` to `demo-magemai`. `npx firebase use` prints that id. A Firebase CLI command without `--project`, including a bare `firebase deploy`, stays on `demo-magemai` and does not touch the live project. The live project is available only as the alias `live`, so the operator must pass `--project live` or `--project magemai`. Do not run `firebase use live`, because that rewrites the default. Emulator commands still pass `--project demo-magemai` themselves. Do not add `dev`, `staging`, or `prod` aliases.

### 4.3 Safeguards

`magemai` is the only cloud database. A test or a bad script cannot be aimed at a disposable project, because there isn't one.

- Day-to-day development and every automated test use the emulators. Development mode connects to them even when the flag is unset. `.env.development` still sets `VITE_USE_FIREBASE_EMULATORS=true` and `VITE_FIREBASE_PROJECT_ID=demo-magemai`. The full contract is architecture section 24.
- Do not run the rules suite, Playwright, an emulator import, or any script that deletes or overwrites collections against `magemai`. Test commands must fail if they see that project id or if an emulator host is missing.
- The synthetic seed (`npm run emulators:seed`) writes only to the emulators. Platform-settings and super-admin scripts may write to `magemai` only after the operator types the project id `magemai` and the project number `122706427013`.
- `firebase deploy` is not part of test runs and is not an npm script. It runs only after the owner has said to deploy, and only after the same typed confirmation. Section 11.
- Set budget alerts on `magemai` before the first functions deploy. Section 8.

## 5. Authentication providers

On project `magemai`, open Authentication → Sign-in method:

1. Enable **Email/Password**. Leave email link (passwordless) off.
2. Enable **Google**.
   - Set the OAuth consent-screen support email to `mavixas.ceo@gmail.com` on project `magemai`.
   - The consent screen can stay in testing while the product is private. Add the Google accounts that will sign in during testing as test users if the screen is in testing mode.
   - Authorized domains: `localhost`, `127.0.0.1`, `magemai.web.app`, and `magemai.firebaseapp.com`. Do not add a custom domain.
3. Turn on **email enumeration protection** (Authentication → Settings → User actions).
4. Leave phone authentication off. It is not part of Phase 1 and has its own billing.

The web client shows the Google button only when `VITE_GOOGLE_AUTH_ENABLED=true`. Leave that variable empty until the provider is enabled for that project. Step 5 does not enable Email/Password, Google, enumeration protection, authorized domains, or App Check on the live `magemai` project, and it does not turn on billing.

Google sign-in in the Emulator Suite does not contact Google. Automated tests use the emulator's simulated Google provider. `guardProviderSignIn` rejects a Google sign-in when that email already has a password, and the screen names the password method. Accounts are not linked. A real Google consent screen is a manual check on a project where this section is done.

Callables do not set `enforceAppCheck`. The emulator would reject them if they required an App Check token. Before a production deploy, configure App Check with reCAPTCHA Enterprise and the site key in `VITE_FIREBASE_APP_CHECK_SITE_KEY` (section 6, App Check locally).

A verification or reset email from the emulator is not delivered. The Auth emulator stores the code. Open `http://127.0.0.1:9099/emulator/v1/projects/demo-magemai/oobCodes`, copy the `oobCode`, and open `/auth/action?mode=verifyEmail&oobCode=...` or `/auth/action?mode=resetPassword&oobCode=...` on the Vite origin. `mode` is `verifyEmail` or `resetPassword`.

## 6. Emulator Suite

Ports, the `127.0.0.1` bind, and `singleProjectMode` are fixed in architecture section 24.1. Windows start, stop, import, export, seed, and the common failures are section 2. From the repository root:

```text
npm run emulators:start
```

That runs `firebase emulators:start --project demo-magemai`, adds `--import ./emulator-data` only when `emulator-data/firebase-export-metadata.json` exists, and always adds `--export-on-exit ./emulator-data`. The UI is at `http://127.0.0.1:4000`. The app connects to these ports on `127.0.0.1`.

Rules and end-to-end tests go through `firebase emulators:exec --project demo-magemai`:

```text
npm run test:rules
npm run test:e2e
```

`npm run test:all`, added with the CI workflow, runs the same suites under that exec. The script exits before any test if the project id is `magemai` or an emulator host is missing.

### Auth emulator and verification emails

The emulator does not send mail. Verification and password-reset codes are stored in the emulator. The UI lists them, and tests read:

```text
http://127.0.0.1:9099/emulator/v1/projects/demo-magemai/oobCodes
```

Use that seam in automated tests. Do not point a test at a real inbox.

### App Check locally

The emulator does not enforce App Check. For a manual run against a cloud project that does enforce it, create an App Check debug token in the console and set it in the browser as the Firebase debug token. Do not commit the token. Production enforcement uses reCAPTCHA Enterprise, configured in the App Check console, with the site key in `VITE_FIREBASE_APP_CHECK_SITE_KEY`.

## 7. Environment variables

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
VITE_ALLOW_LIVE_FIREBASE=
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

A production build fails in `vite.config.ts` when `VITE_USE_FIREBASE_EMULATORS` is `true`. The same build also fails, before Vite emits a bundle, when any of `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, or `VITE_FIREBASE_APP_ID` is missing. That stops `npm run deploy:hosting` from publishing a bundle that opens and shows "Firebase is unavailable".

Save `.env.local` and `.env.production` as UTF-8 without a BOM. On Windows, Notepad and some editors write a UTF-8 BOM. Vite then treats the first name as `\uFEFFVITE_FIREBASE_API_KEY` instead of `VITE_FIREBASE_API_KEY`, drops the API key, and the deployed app shows "Firebase is unavailable". The production build check reports that missing key. If the error names `VITE_FIREBASE_API_KEY` and the line looks present, re-save the file without a BOM.

`VITE_FIREBASE_APP_CHECK_SITE_KEY` is not required for the build. It stays empty until App Check is configured.

`VITE_FIREBASE_APP_CHECK_SITE_KEY` is empty locally and set in `.env.production` after App Check is configured on `magemai`.

Never create a `VITE_` variable that contains a private key, a service-account JSON, or an OAuth client secret.

Operator-only, in the shell environment of the person running a script, never in an env file that Vite loads:

```text
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json
```

## 8. Billing

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

The owner is upgrading `magemai` to Blaze. Set the budget, the 50/90/100 percent alerts, and the Cloud Run spend cap on that billing account before the first functions deploy. There is no second cloud project. Skip cloud billing for as long as you stay on the emulators. Emulator work does not touch `magemai`. Step 4 did not deploy functions, Hosting, rules, or indexes.

Scheduled database exports, which are the backup story before real tenant data lands in `magemai`, also need Blaze and a storage bucket. Turn them on as an operations task when that project is first deployed, not before.

## 9. Platform seed and super-admin provisioning

Both scripts are implemented (seed in step 6, provisioning in step 8). Do not hand-edit Firestore to fake an administrator. Platform access requires both the custom claim `superAdmin: true` and `platformAdmins/{uid}` with `status` `active`. Clients cannot write that collection. The operator script is the only supported writer. Architecture section 17.3 is the contract, including order, idempotence, and partial failure.

### 9.1 Service account

For `magemai`:

1. In Google Cloud console, select project number `122706427013` (`magemai`). Create a service account used only for Magemai operator scripts, for example `magemai-operator`.
2. Grant it **Firebase Authentication Admin** and **Cloud Datastore User** on that project only.
3. Create a JSON key and store it outside the repository. A reasonable location is a directory your home folder owns and the repo is not inside.
4. Confirm `git status` does not list the JSON file. `.gitignore` rejects `*serviceAccount*.json` and `*firebase-adminsdk*.json`.

This service account is for `magemai` only. The emulator does not use it. If a second cloud project is ever introduced, it gets its own key. Do not reuse this one.

The emulator does not need this file. Tests set the claim and the registry document through the emulator's admin interface, against `demo-magemai` only.

### 9.2 Seed platform settings

Day-to-day seeding runs against the emulator (`demo-magemai`) and does not use a cloud key. The test harness does the same.

Against `magemai`, only when the owner wants the live settings document, and only after typing the project id and the project number. Set the credential path in the shell, then run npm. PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\outside\the\repo\service-account.json"
npm run seed:platform-settings -- --project magemai
```

bash:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run seed:platform-settings -- --project magemai
```

The script writes `platformSettings/global` (defaults in the architecture: Sri Lanka, LKR, English, `Asia/Colombo`, the shared category list) and an audit row. Running it again updates that document. It does not delete other collections. Step 6 records the exact emulator command in this file if it differs.

### 9.3 Provision the first super-admin

Public registration cannot create a super-admin. There is no in-app control and no callable that writes `platformAdmins` or custom claims.

After step 8, against the live project only when the owner wants a real operator, and against the emulator for tests. PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\outside\the\repo\service-account.json"
npm run provision:super-admin -- --project magemai --email <operator-email>
```

bash:

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

PowerShell:

```powershell
npm run provision:super-admin -- --project magemai --email <operator-email> --revoke --reason "<why this access ends>"
```

bash:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json \
npm run provision:super-admin -- --project magemai --email <operator-email> \
  --revoke --reason "<why this access ends>"
```

The PowerShell form uses the `$env:GOOGLE_APPLICATION_CREDENTIALS` value set in the same window.

Revoke order:

1. Set `platformAdmins/{uid}` to `status: "revoked"` and fill `revokedBy`, `revokedAt`, and `reason`. Keep the document. This step alone denies access, including an ID token that still contains `superAdmin: true`.
2. Call `revokeRefreshTokens` for that uid. Refresh tokens stop working. An already issued ID token remains until it expires (at most one hour) and is denied by step 1 while it does.
3. Remove the `superAdmin` claim, leaving any unrelated claims in place.
4. Write audit log `super_admin.revoke` with the reason. Do not delete the Auth user.

If the script stops after step 1, access is already denied. Re-run to finish the token revocation, the claim removal, and the audit row. Do not remove the claim first. An old token would keep working until expiry if the registry were still `active`.

Sign in at `/login` with that email. The super-admin area is `/super-admin`. A user without the claim sees a 403 state. A user whose registry is `revoked` also sees a 403 state, even when the token still carries the claim.

## 10. Local app

With `.env.local` in place (section 2.7):

```text
npm run dev
```

The Vite URL is http://127.0.0.1:5173. The app uses project `magemai`. Create an account on `/register`, verify the email from the real inbox, then sign in. The personal profile is `/profile`. `/business/register` is the onboarding wizard. It needs the deploy in section 11 and `npm run seed:platform-settings` before a business can be saved. After a successful create, the app stores `magemai.activeBusinessId` and opens `/admin`. The header switcher lists every active membership. A stored id that is no longer an active membership falls back to the newest one, or back to the wizard when there are none. `/admin/profile` and `/admin/settings` save through `updateBusinessProfile` and `updateBusinessSettings`. `/super-admin` is the platform area. It needs the step 8 rules, indexes, and `setBusinessStatus` / `setBusinessVerification` deployed, plus `npm run provision:super-admin` for the operator. A user without the claim, or with a revoked `platformAdmins` row, sees a 403 state on that route.

Create businesses through that wizard. Do not add a hard-coded tenant.

## 11. Deploy

Run these from PowerShell after section 2.9's console steps. Order matters: rules, then functions, then platform settings, then hosting.

```powershell
npm run deploy:rules
npm run deploy:functions
npm run seed:platform-settings
npm run deploy:hosting
```

`deploy:rules` publishes Firestore rules, the membership and creation indexes, the business and audit indexes used by the platform lists, and Storage rules. `deploy:functions` builds the functions package, then publishes the callables, including `createBusiness`, `syncAuthProfile`, `setBusinessStatus`, and `setBusinessVerification`, in `asia-south1`, and publishes `stripDownloadTokens` in `us-east1` so it can listen to `magemai.firebasestorage.app`. It sets `FUNCTIONS_DISCOVERY_TIMEOUT` to 60 seconds. It leaves out the Identity Platform blocking function and does not deploy a 1st gen Auth trigger. `deploy:hosting` runs `npm run build` and publishes Hosting. `.firebaserc` already defaults to `magemai`. These scripts also pass `--project magemai`. Provisioning a super-admin is not part of deploy. Run section 9.3 after the rules and functions are live.

After that first functions deploy, set the Artifact Registry cleanup described in section 2.9 for `asia-south1` and `us-east1`.

Then:

```powershell
npm run test:e2e:live
npm run test:cleanup:live
```

Live e2e registers `e2e+<timestamp>@e2e.magemai.test` with a display name starting `E2E `, marks that user verified with Application Default Credentials, and creates one business. Cleanup deletes only those `e2e+` users, their user documents, their memberships, and businesses whose names start with `E2E `. Audit rows are left in place. Both commands fail if the emulator hosts are set. Neither is run by CI.

Hosting answers on `magemai.web.app` and `magemai.firebaseapp.com`. Add `localhost`, `127.0.0.1`, and those two hostnames to Authentication → Authorized domains if they are missing. Do not attach a custom domain. Google sign-in, email enumeration protection, and App Check stay console tasks and are not done by these scripts.

## 12. What not to commit

- `.env`, `.env.development`, `.env.production`, and any other `.env.*` file except `.env.example`
- Service-account JSON and any file named like a Firebase admin SDK key
- `GOOGLE_APPLICATION_CREDENTIALS` contents
- App Check debug tokens
- A custom domain. `magemai.web.app` and `magemai.firebaseapp.com` are the Firebase-assigned hostnames for project `magemai` and are the only hosts the docs name.
- `emulator-data/` and any other emulator export. Exports hold Auth password hashes and drift every session. Recreate data with `npm run emulators:seed`.

`.env.example` is the exception: names only, empty values.

## 13. Troubleshooting

| Symptom | What to check |
| --- | --- |
| Emulators fail immediately with a Java error | JDK 21+ is installed, `JAVA_HOME` points at the JDK directory, and `java` is on `PATH`. Windows detail is section 2.10. |
| The app reads a cloud project while you expected local data | Development uses emulators unless `.env.development.local` opts into live access. Restart the dev server after changing env files. |
| Google button missing | `VITE_GOOGLE_AUTH_ENABLED=true`, then restart Vite. |
| Onboarding returns an internal error about platform settings | Run `npm run emulators:seed` against the running suite, or the live settings seed (section 9.2) only when the app is opted into `magemai`. |
| Super-admin pages show 403 after provisioning | Sign out and sign in so the claim is on the token. Confirm `platformAdmins/{uid}.status` is `active` and the script's `--project` was `magemai`. |
| Super-admin nav appears and the lists return permission-denied | The token still has `superAdmin` and the registry is `revoked` or missing. That is the intended denial. Re-run the grant script only if the revocation was a mistake. |
| Functions deploy rejected | The project is still on Spark. Section 8. `magemai` needs the Blaze upgrade the owner is applying, plus a budget alert, before a functions deploy. |
| `firebase deploy` warns that the local Node version is not 24 | Install Node 24. The emulator warning means tests are running on a different runtime than production. |
