# Magemai

A Mavixas product.

**Your business. Your own space.**

Magemai is a multi-tenant platform for service businesses. Each business gets its own booking and management space, without building or hosting a separate website.

## Status

Phase 1 step 6 (business onboarding) is in this repository. The app uses the live Firebase project `magemai` unless `VITE_USE_FIREBASE_EMULATORS` is `true`. Email and password registration, profiles, and the business wizard are implemented. Dashboard data, business switching, and super-admin behavior are not.

Phase 2 and later stay out of scope until the Phase 1 acceptance criteria pass.

Nothing in this change deploys to `magemai` or enables billing. The owner deploys from their PC with `deploy:rules`, `deploy:functions`, and `deploy:hosting`. See [docs/setup.md](docs/setup.md).

## Local development

Node.js 24 LTS is recommended. Node.js 26 is supported. Cloud Functions stay on the `nodejs24` runtime. JDK 21 is needed only if you run the emulators. The Windows install is in [docs/setup.md](docs/setup.md).

```bash
npm install
npm install --prefix functions
npm run dev
```

Put the public web config in gitignored `.env.local` and leave the emulator flag unset. `.firebaserc` defaults to `magemai`. The `demo` alias is `demo-magemai` for rules tests and `npm run test:e2e`.

## Documentation

- [Product blueprint](docs/magemai-blueprint.md) — the product specification.
- [Architecture](docs/architecture.md) — data model, security, environments, and the locked decisions.
- [Phase 1 checklist](docs/phase-1-checklist.md) — implementation steps 4–12 and the acceptance criteria.
- [Environment setup](docs/setup.md) — Windows install, Node.js 24 LTS (Node.js 26 supported locally), JDK 21, the Emulator Suite, environment variables, and super-admin provisioning.

## Tenants

Every business is created through onboarding. The product does not reserve a slug or ship a fixture for a named pilot customer.
