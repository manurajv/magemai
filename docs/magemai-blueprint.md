# MAGEMAI
## Product Development Blueprint & Technical Architecture

**Product:** Magemai  
**Brand endorsement:** A Mavixas product  
**Tagline:** Your business. Your own space.  
**Product category:** Multi-tenant SaaS booking, business management and collaboration platform  
**Initial market:** Sri Lanka  
**Long-term market:** International  
**Initial hosting:** Firebase Hosting  
**Document status:** Development specification – Version 1.0

---

# 1. Product Vision

Magemai is a multi-tenant SaaS platform that allows service-based businesses and independent professionals to create their own online business presence, manage bookings, handle customers, organize teams, manage finances and collaborate with other businesses.

The central promise is:

**Every business gets its own online booking and management space without having to develop or maintain a separate website or booking application.**

Magemai will also provide a public marketplace where customers can discover businesses, compare services, view portfolios and submit booking requests.

A distinctive feature will be cross-business collaboration. Independent businesses and professionals will be able to form collaboration groups, share limited availability information and coordinate joint projects without exposing confidential customer or financial information.

## 1.1 Main objectives

1. Give every business its own online booking system.
2. Provide public business profiles and service listings.
3. Allow customers to discover and book services.
4. Provide business owners with booking, customer and financial management tools.
5. Support internal business teams and independent collaborators.
6. Enable businesses to work together on shared projects.
7. Provide a scalable foundation for international SaaS expansion.

## 1.2 Initial target market

Start with creative and event-related businesses:

- Wedding photographers
- Videographers
- Drone operators
- Event planners
- Makeup artists
- Freelance creatives
- Studios
- Independent service providers

Later expand to salons, consultants, tutors, fitness professionals, repair services and other appointment-based or reservation-based businesses.

The platform must be industry-flexible. Do not hardcode photography-specific concepts into the core architecture.

---

# 2. Brand and Product Identity

**Product name:** Magemai  
**Brand endorsement:** A Mavixas product  
**Primary tagline:** Your business. Your own space.

The brand should communicate ownership, simplicity, independence and professionalism.

Suggested design direction:

- Premium modern SaaS interface
- Clean light admin dashboard
- Navy or deep charcoal primary accents
- A distinctive secondary accent color
- Clear typography
- Rounded cards and controls
- Responsive layouts
- Professional and accessible visual hierarchy

The brand must be configurable through a central design-token system. Do not scatter colors, typography or branding values throughout components.

Use the product name Magemai in application metadata, browser titles, login pages, documentation and UI branding.

Do not assume a domain or trademark is legally available. Domain and trademark clearance must be completed before public commercial launch.

---

# 3. Application Structure

Build one web application with multiple experiences and role-based areas.

## 3.1 Public marketplace

- `/` – Homepage
- `/search` – Business discovery
- `/categories` – Service categories
- `/business/:slug` – Public business profile
- `/business/:slug/services` – Services and packages
- `/business/:slug/portfolio` – Portfolio
- `/business/:slug/book` – Booking request
- `/login` – Login
- `/register` – Customer registration
- `/business/register` – Business onboarding

## 3.2 Customer account

- `/account`
- `/account/bookings`
- `/account/bookings/:id`
- `/account/invoices`
- `/account/payments`
- `/account/profile`
- `/account/reviews`
- `/account/notifications`

## 3.3 Business dashboard

- `/admin`
- `/admin/profile`
- `/admin/services`
- `/admin/packages`
- `/admin/calendar`
- `/admin/bookings`
- `/admin/customers`
- `/admin/team`
- `/admin/availability`
- `/admin/finances`
- `/admin/payments`
- `/admin/invoices`
- `/admin/expenses`
- `/admin/reports`
- `/admin/portfolio`
- `/admin/collaboration`
- `/admin/projects`
- `/admin/settings`

A user may belong to multiple businesses. Provide a business switcher for users with multiple memberships.

## 3.4 Platform administration

- `/super-admin`
- `/super-admin/users`
- `/super-admin/businesses`
- `/super-admin/categories`
- `/super-admin/verifications`
- `/super-admin/subscriptions`
- `/super-admin/reports`
- `/super-admin/audit-logs`
- `/super-admin/settings`

Super-admin privileges must be granted through trusted backend processes, never through user-controlled registration fields.

---

# 4. User Roles and Permissions

## 4.1 Platform roles

- Super Admin
- Customer
- Business Owner
- Business Admin
- Business Manager
- Business Staff

## 4.2 Collaboration roles

- Collaboration Group Owner
- Collaboration Group Admin
- Collaboration Group Member

A collaboration member is not automatically an employee of another business.

## 4.3 Permission principles

Use role-based access control with explicit permissions.

Examples:

- Business Owner: Full control over their business.
- Business Admin: Manage most business operations.
- Manager: Manage assigned operational areas.
- Staff: Access only assigned work and permitted customer information.
- Customer: Manage their own account and bookings.
- Collaborator: Access only information explicitly shared with them.
- Super Admin: Platform-level administration.

Do not rely on frontend route visibility to enforce permissions. All sensitive operations must be authorized on the backend and protected through Firestore and Storage rules.

---

# 5. Core Product Modules

## Module A – Authentication and User Management

Support:

- Email and password registration
- Email verification
- Google sign-in
- Password reset
- Logout
- User profile management
- Account status
- Multi-business membership

Use Firebase Authentication.

Keep user identity separate from business membership and business-specific roles.

## Module B – Business Onboarding

A user should be able to create a business profile through a guided wizard.

Collect:

- Business name
- Business slug
- Business category
- Business description
- Contact details
- Address
- Country
- City
- Business timezone
- Default currency
- Preferred language
- Logo
- Cover image
- Business owner details

The business creator becomes the initial business owner.

The onboarding process should create:

1. User profile if not already present.
2. Business document.
3. Business membership document.
4. Owner role assignment.
5. Default business settings.
6. Initial business status.

Business registration here means onboarding a business onto Magemai, not legal incorporation or government company registration.

Business verification should be a separate platform process.

## Module C – Business Public Profile

Each business should have a public profile page.

Features:

- Business name and description
- Logo and cover image
- Address and contact information
- Business categories
- Services and packages
- Portfolio/gallery
- Customer reviews
- Availability information
- Booking request button
- Social links
- Public business URL

Example:

`magemai.web.app/business/beyond-gravity`

Future support for custom domains and branded business pages.

## Module D – Services and Packages

Business owners can create services and packages.

Service fields:

- Name
- Description
- Category
- Duration
- Price
- Currency
- Booking buffer
- Advance payment requirement
- Availability rules
- Assigned staff
- Active/inactive status
- Images

Packages may contain multiple services or deliverables.

The system must support fixed-price services, configurable packages and quotation-based services.

Do not assume all businesses use hourly appointments. Support event bookings and longer-duration services in the future.

## Module E – Booking Management

This is one of the most important modules.

### Customer booking flow

1. Discover or visit a business.
2. Select a service or package.
3. Select a preferred date and time.
4. Enter customer information.
5. Add notes or special requirements.
6. Submit a booking request.
7. Receive confirmation or rejection.
8. Pay the required advance when enabled.
9. View booking details and invoice.

### Business booking flow

Business owners can:

- View booking calendar.
- Approve requests.
- Reject requests.
- Reschedule bookings.
- Cancel bookings.
- Create manual bookings.
- Assign staff.
- Add internal notes.
- Record payments.
- Track booking status.

### Booking confirmation policy

Manual approval is the default.

Automatic confirmation can be an optional future setting.

### Booking statuses

- Draft
- Pending
- Approved
- Confirmed
- In Progress
- Completed
- Rejected
- Cancelled
- Expired

Use clear state-transition rules and record important changes in an audit trail.

### Availability engine

The backend must validate availability.

Consider:

- Business operating hours
- Staff availability
- Existing confirmed bookings
- Temporary booking holds
- Blocked dates
- Service duration
- Preparation and cleanup buffers
- Assigned resources
- Project assignments

Prevent double booking through server-side validation and concurrency-safe transactions or equivalent reservation mechanisms.

Do not trust a slot merely because the frontend displayed it as available.

Temporary booking holds must expire automatically.

## Module F – Customer Management / CRM

Business owners should be able to:

- View customers.
- Search and filter customers.
- View customer booking history.
- View payment history.
- Add internal customer notes.
- Track customer contact information.
- View customer preferences where appropriate.

Customer data must remain isolated between businesses unless explicitly shared with appropriate authorization.

## Module G – Payments and Financial Management

Support:

- Booking advances
- Partial payments
- Installments
- Remaining balances
- Manual cash payment records
- Manual bank transfer records
- Payment history
- Refund records
- Expenses
- Financial summaries

Store all money using integer minor units and an ISO currency code.

Never use floating-point arithmetic for financial calculations.

Example:

- Amount: 15000
- Currency: LKR
- Amount in display: LKR 15,000.00

The platform must be multi-currency ready.

A payment ledger should be append-oriented. Do not overwrite or silently modify historical financial transactions.

Payment gateway integration will be introduced in a later phase after researching provider availability, regulatory obligations and payout requirements.

Do not implement transaction commissions in the initial MVP.

## Module H – Invoices

Businesses should be able to generate invoices for customers.

Invoice fields:

- Invoice number
- Business details
- Customer details
- Booking reference
- Items and descriptions
- Subtotal
- Discounts
- Taxes where applicable
- Amount paid
- Remaining balance
- Currency
- Issue date
- Due date
- Invoice status

Invoice statuses:

- Draft
- Issued
- Partially Paid
- Paid
- Overdue
- Cancelled

Generate PDF invoices on the backend.

Invoice numbering must be unique and generated atomically.

Preserve invoice snapshots so that changes to a service or customer profile do not rewrite historical invoices.

## Module I – Team Management

A business owner can:

- Invite staff.
- Assign roles.
- Accept or revoke memberships.
- Assign bookings.
- Manage staff availability.
- Assign tasks.
- Restrict access to financial or customer information.

Staff invitations must require acceptance.

## Module J – Collaboration System

This is a major differentiator for Magemai.

Support two collaboration types.

### 1. Internal business collaboration

Employees and team members coordinate within their own business.

### 2. Independent collaboration groups

Separate businesses and professionals can create collaboration groups.

Examples:

- A wedding photographer and videographer.
- A drone operator and event planner.
- Multiple freelancers working on a joint project.
- A production crew working across different businesses.

Features:

- Create collaboration groups.
- Invite members.
- Accept or reject invitations.
- Manage group roles.
- Share limited availability.
- Create shared projects.
- Assign participants.
- Track project progress.
- View shared milestones and tasks.
- Send notifications.

### Privacy-first availability sharing

Default shared information should be limited to:

- Available / unavailable.
- Date.
- Optional time range.
- Optional collaboration status.

Do not expose by default:

- Customer names.
- Customer contact information.
- Booking amounts.
- Private booking notes.
- Confidential business information.

Business names and booking descriptions should also remain hidden unless explicitly authorized.

Each business or individual must control what is shared.

Project assignment requires explicit acceptance from the assigned participant.

## Module K – Portfolio and Gallery

Allow businesses to:

- Upload images.
- Upload videos or supported video links.
- Create portfolio collections.
- Add project descriptions.
- Set cover images.
- Control public visibility.
- Organize work into categories.

Use Firebase Storage with secure access rules, file-size limits and supported MIME-type validation.

Do not expose private business files through public storage permissions.

## Module L – Notifications

Support in-app notifications initially.

Possible notification events:

- New booking request.
- Booking approved.
- Booking rejected.
- Booking rescheduled.
- Payment recorded.
- Invoice issued.
- Staff invitation.
- Collaboration invitation.
- Project assignment.
- Project update.

Prepare the architecture for email, push and SMS notifications.

## Module M – Reviews

Customers can submit reviews after completed bookings.

Support:

- Star rating.
- Written feedback.
- Business response.
- Moderation.
- Review reporting.

Prevent duplicate reviews for the same eligible booking.

## Module N – Reports and Analytics

Business dashboards should eventually include:

- Total bookings.
- Pending bookings.
- Completed bookings.
- Cancelled bookings.
- Revenue.
- Outstanding balances.
- New customers.
- Popular services.
- Staff performance.
- Booking trends.

Use currency-aware calculations and respect business timezone boundaries.

## Module O – Platform Administration

Platform administrators should be able to:

- View platform statistics.
- Manage users.
- Manage businesses.
- Verify businesses.
- Suspend or reactivate businesses.
- Manage categories.
- Review reported content.
- Review audit logs.
- Manage subscriptions in future releases.

Every privileged administrative action must be logged.

---

# 6. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide icons
- React Router
- TanStack Query
- React Hook Form
- Zod
- FullCalendar
- Recharts
- TanStack Table
- date-fns

## Backend and infrastructure

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Functions
- Firebase Hosting
- Firebase App Check
- Firebase Emulator Suite

## Testing

- Vitest
- React Testing Library
- Playwright
- Firebase Emulator security-rule tests

Use strict TypeScript. Avoid `any` unless there is a documented and justified reason.

Keep business logic out of UI components.

Use feature-based modular architecture.

---

# 7. Architecture and Project Structure

Recommended starting structure:

```text
magemai/
├── public/
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── layouts/
│   ├── components/
│   │   ├── ui/
│   │   └── shared/
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── businesses/
│   │   ├── marketplace/
│   │   ├── services/
│   │   ├── bookings/
│   │   ├── customers/
│   │   ├── team/
│   │   ├── finance/
│   │   ├── invoices/
│   │   ├── collaboration/
│   │   ├── projects/
│   │   ├── portfolio/
│   │   ├── notifications/
│   │   ├── reports/
│   │   └── super-admin/
│   ├── hooks/
│   ├── lib/
│   │   ├── firebase/
│   │   ├── permissions/
│   │   ├── validation/
│   │   └── utilities/
│   ├── services/
│   ├── types/
│   ├── config/
│   └── styles/
├── functions/
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── tests/
├── docs/
└── README.md
```

Keep each feature modular, with clear separation between:

- UI
- Domain models
- Validation schemas
- Data-access functions
- Business services
- Tests

Do not put all Firestore operations directly inside page components.

---

# 8. Firestore Data Model

Use tenant-aware document structures.

Recommended collections:

```text
users/{userId}

businesses/{businessId}

businessMembers/{membershipId}

services/{serviceId}

packages/{packageId}

bookings/{bookingId}

customers/{customerId}

payments/{paymentId}

invoices/{invoiceId}

expenses/{expenseId}

availability/{availabilityId}

resources/{resourceId}

collaborationGroups/{groupId}

collaborationMembers/{membershipId}

collaborationInvitations/{invitationId}

sharedProjects/{projectId}

projectAssignments/{assignmentId}

reviews/{reviewId}

notifications/{notificationId}

auditLogs/{auditLogId}

platformSettings/{settingId}
```

Every tenant-owned record must contain a reliable business association.

Where appropriate, use business-scoped subcollections or explicit `businessId` fields. Choose one consistent strategy and document it.

Do not assume that a document is safe merely because its ID is difficult to guess.

All reads and writes must be protected through authorization rules.

## Important data principles

1. Use server timestamps for important system events.
2. Store business timezone separately from UTC timestamps.
3. Use ISO currency codes.
4. Store money as integer minor units.
5. Preserve historical booking and invoice snapshots.
6. Record important state transitions.
7. Avoid unbounded arrays in Firestore documents.
8. Use pagination for potentially large collections.
9. Design indexes for actual query patterns.
10. Keep audit logs protected from ordinary business users.

---

# 9. Security and Multi-Tenant Isolation

Security is a core product requirement, not a later improvement.

Implement:

- Firebase Authentication.
- Firestore security rules.
- Storage security rules.
- Backend authorization.
- Role-based permissions.
- Tenant isolation.
- Server-side validation.
- Firebase App Check.
- Audit logging.
- Secure file upload validation.

A user must never access another business's private information simply by changing a URL or Firestore document ID.

A business owner must not be able to assign themselves super-admin privileges.

Do not rely on client-supplied `businessId`, role or payment status without backend authorization and validation.

Test cross-tenant access explicitly using Firebase Emulator Suite.

---

# 10. International-Ready Requirements

Although Sri Lanka is the initial market, the architecture must not assume Sri Lankan-only operation.

Support:

- Multiple countries.
- Multiple currencies.
- Business-specific timezones.
- International phone numbers.
- Country-specific address formats.
- Multiple languages.
- Configurable tax settings.
- Different date and number formats.
- Localized invoice formatting.

Initial defaults may include:

- Country: Sri Lanka.
- Currency: LKR.
- Language: English.
- Timezone: Asia/Colombo.

These must be configurable for each business.

Use UTC for stored timestamps and convert them to the relevant business timezone for display and scheduling.

---

# 11. Subscription and Monetization Strategy

Future revenue sources:

1. Monthly or annual business subscriptions.
2. Premium business listings.
3. Booking transaction commissions.
4. Additional staff seats.
5. Additional storage.
6. Premium portfolio features.
7. Custom business domains.
8. Advanced analytics.
9. Additional collaboration features.

Potential subscription tiers:

- Free
- Starter
- Pro
- Business

Pricing must be researched and validated before launch. Do not hardcode proposed prices into business logic.

Do not implement commissions or payment gateway deductions in Phase 1.

Keep subscription entitlements configurable from the backend.

---

# 12. Deployment and Environments

Use separate Firebase projects for:

- Development
- Staging
- Production

Use Firebase Emulator Suite for local development and testing.

Initial deployment:

- Firebase Hosting
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Cloud Functions

Important billing consideration:

Some Cloud Functions and backend capabilities require the Firebase Blaze billing plan. Do not assume the full architecture can operate indefinitely on the Spark free plan.

Configure budget alerts, usage monitoring and quotas.

Do not place secret API keys or service credentials in frontend code.

Public business pages need an SEO strategy. A client-rendered React application can support the MVP, but evaluate server-side rendering or prerendering before large-scale marketplace expansion.

---

# 13. Development Roadmap

## Phase 1 – Foundation and Identity

- Project setup.
- Design system.
- Routing and application layouts.
- Firebase setup.
- Authentication.
- User profiles.
- Business onboarding.
- Business memberships.
- Business switcher.
- Role-based access control.
- Firestore and Storage security.
- Super-admin foundation.
- Responsive dashboard shell.

## Phase 2 – Business Management

- Business profiles.
- Services.
- Packages.
- Availability management.
- Calendar.
- Manual booking creation.
- Booking request management.
- Staff management.

## Phase 3 – Customer Experience and Marketplace

- Public homepage.
- Business discovery.
- Search and filters.
- Public business pages.
- Portfolios.
- Customer accounts.
- Online booking requests.
- Booking status tracking.

## Phase 4 – Financial Management

- Payment records.
- Advance payments.
- Partial payments.
- Payment ledger.
- Invoices.
- Expenses.
- Financial reports.

## Phase 5 – Collaboration

- Collaboration groups.
- Invitations.
- Membership roles.
- Availability sharing.
- Privacy controls.
- Shared projects.
- Project assignments.
- Project progress.

## Phase 6 – Growth Features

- Reviews.
- Notifications.
- Advanced analytics.
- Customizable public profiles.
- Additional portfolio layouts.
- Business verification enhancements.

## Phase 7 – Commercial Expansion

- Payment gateways.
- Subscription billing.
- Transaction commissions.
- Payout management.
- Custom domains.
- International payment and tax integrations.

---

# 14. Phase 1 – Detailed Scope

Phase 1 must deliver a secure, working application foundation.

## Required implementation

### A. Project setup

- Initialize React, TypeScript and Vite.
- Configure strict TypeScript.
- Install Tailwind CSS and shadcn/ui.
- Install Lucide icons.
- Configure React Router.
- Configure ESLint and formatting.
- Configure Vitest.
- Configure Firebase.
- Configure Firebase Emulator Suite.
- Establish environment variable management.

### B. Design system

Create:

- Brand logo placeholder.
- Typography system.
- Color tokens.
- Buttons.
- Inputs.
- Selects.
- Dialogs.
- Dropdowns.
- Cards.
- Tables.
- Sidebar.
- Header.
- Toast notifications.
- Loading states.
- Empty states.
- Error states.

The design must be responsive and premium.

### C. Authentication

Implement:

- Registration.
- Login.
- Email verification.
- Google sign-in.
- Password reset.
- Logout.
- Authentication state management.
- Protected routes.

### D. Business onboarding

Create a guided business registration wizard.

It must create:

- Business document.
- Owner membership.
- Default business settings.
- Business status.

Provide validation and useful error handling.

### E. Business dashboard shell

Implement:

- Sidebar navigation.
- Header.
- User profile menu.
- Business switcher.
- Dashboard overview.
- Business profile/settings.

Booking, finance and collaboration sections should appear as clearly marked future modules, not fake working features.

### F. Super-admin foundation

Create a protected super-admin experience.

Implement:

- User listing.
- Business listing.
- Business status management.
- Verification status management.
- Audit log foundation.

Super-admin privileges must be provisioned through a trusted administrative process.

### G. Security

Implement:

- Firestore security rules.
- Storage security rules.
- Tenant isolation.
- Membership checks.
- Role validation.
- Backend authorization.
- Emulator-based security tests.

---

# 15. Phase 1 Acceptance Criteria

Phase 1 is complete only when all of these are satisfied:

1. A user can register and log in.
2. Google authentication works if configured.
3. Email verification works.
4. Password reset works.
5. A user can create a business.
6. The creator is assigned the owner role.
7. A user can belong to multiple businesses.
8. The business switcher changes the active business context.
9. Unauthorized users cannot access protected dashboards.
10. A user cannot access another business's private records.
11. A normal user cannot promote themselves to super-admin.
12. Storage rules prevent unauthorized access to private files.
13. Super-admin actions generate audit logs.
14. Forms validate correctly.
15. Loading, empty and error states are implemented.
16. The application works on mobile, tablet and desktop.
17. Tests pass in the local development environment.
18. Setup and deployment instructions are documented.

Do not proceed to Phase 2 until the Phase 1 acceptance criteria pass.

---

# 16. Critical Development Rules

- Build incrementally.
- Do not generate the entire platform in one step.
- Do not use mock data as a substitute for implemented backend functionality without clearly labeling it.
- Never bypass security rules to make a feature work.
- Do not put privileged logic in the frontend.
- Avoid duplicated business logic.
- Use reusable components.
- Write tests for sensitive operations.
- Document important architecture decisions.
- Keep all secrets outside source control.
- Use environment-specific Firebase configurations.
- Do not introduce unnecessary dependencies.
- Do not start the next phase before the current phase is tested and accepted.

---

# 17. Initial Pilot Strategy

The first pilot business will be **Beyond Gravity**.

Use it to test:

- Business onboarding.
- Business profile.
- Service creation.
- Booking management.
- Customer flow.
- Team management.
- Collaboration with other independent creatives.

Invite two additional friendly businesses or professionals to test cross-business workflows.

The initial pilot should validate the actual workflow before commercial expansion.

Suggested rollout targets, subject to validation:

- Private pilot: 3 businesses.
- Early local rollout: 10–20 businesses.
- Broader Sri Lankan launch: 50–100 active businesses.
- International expansion after product-market validation.

---

# Final Product Direction

Magemai should become more than an appointment calendar.

It should become the place where independent businesses establish their online presence, receive bookings, manage customers, organize their operations and collaborate with other professionals.

**Magemai — Your business. Your own space.**

**A Mavixas product.**