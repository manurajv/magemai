# Magemai

A Mavixas product.

**Your business. Your own space.**

Magemai is a multi-tenant platform for service businesses. Each business gets its own booking and management space, without building or hosting a separate website.

## Status

Phase 1 step 5 (authentication and personal profiles) is in this repository. Email and password registration, sign-in, email verification, password reset, Google redirect, and the personal profile are implemented against the Firebase emulators. Onboarding, dashboard data, business switching, and super-admin behavior are not.

Phase 2 and later (bookings, marketplace, finance, collaboration, subscriptions) stay out of scope until the Phase 1 acceptance criteria pass.

No production domain is configured. Hosting, when it is deployed, uses the hostname Firebase assigns to the project. Nothing in this step deploys to `magemai` or enables billing. Real Google sign-in on the live project needs the owner to enable the provider and add the authorized domains in [docs/setup.md](docs/setup.md).

## Local development

Node.js 24 LTS is recommended. Node.js 26 is supported for local development. Cloud Functions stay on the `nodejs24` runtime. JDK 21 is required for the emulators. The full Windows install is in [docs/setup.md](docs/setup.md).

```bash
npm install
npm install --prefix functions
npm run dev
```

Emulators always use the demo project. In a second terminal:

```bash
npm run emulators:start
npm run emulators:seed
```

`.firebaserc` names `demo-magemai` as the default project, so a Firebase CLI command without `--project` stays on the demo project. The live project is the alias `live` and has to be named explicitly. Emulator scripts still pass `--project demo-magemai` themselves.

## Documentation

- [Product blueprint](docs/magemai-blueprint.md) — the product specification.
- [Architecture](docs/architecture.md) — data model, security, environments, and the locked decisions.
- [Phase 1 checklist](docs/phase-1-checklist.md) — implementation steps 4–12 and the acceptance criteria.
- [Environment setup](docs/setup.md) — Windows install, Node.js 24 LTS (Node.js 26 supported locally), JDK 21, the Emulator Suite, environment variables, and super-admin provisioning.

## Tenants

Every business is created through onboarding. The product does not reserve a slug or ship a fixture for a named pilot customer.
