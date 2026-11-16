# Magemai

A Mavixas product.

**Your business. Your own space.**

Magemai is a multi-tenant platform for service businesses. Each business gets its own booking and management space, without building or hosting a separate website.

## Status

Phase 1 (Foundation and Identity) is in **planning**. This repository holds the product blueprint and the architecture contract. Application code, Firebase project bindings, and dependency installs come next, after the architecture is accepted.

Phase 2 and later (bookings, marketplace, finance, collaboration, subscriptions) are out of scope until the Phase 1 acceptance criteria pass.

No production domain is configured. Hosting, when it is deployed, uses the hostname Firebase assigns to the project.

## Documentation

- [Product blueprint](docs/magemai-blueprint.md) — the product specification.
- [Architecture](docs/architecture.md) — data model, security, environments, and the open questions to confirm before implementation.
- [Phase 1 checklist](docs/phase-1-checklist.md) — implementation steps 4–12 and the acceptance criteria.
- [Environment setup](docs/setup.md) — Node.js, Firebase projects, emulators, environment variables, and super-admin provisioning.

## Tenants

Every business is created through onboarding. The product does not reserve a slug or ship a fixture for a named pilot customer.
