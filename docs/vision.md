# OneHub — Vision & Core Use Cases (Wave 1–3)

## Users & Roles
- DIY Planner
- Pro Planner
- Vendor
- Venue
- Client
- Admin

## MVP Outcomes
- Authentication: users can sign up/sign in; roles assigned by admin or invite.
- Authenticated users land on a dashboard shell (widgets placeholder for now).
- Global design system and navigation in place.
- Audit-friendly logging (client + server) with per-request IDs.

## Guardrails
- Accessibility: WCAG AA goals; keyboard navigation; visible focus.
- Internationalization-ready (default: en-US).
- Security first: OWASP ASVS mindset; least-privilege RBAC.

## Wave Scope (High Level)
- Wave 1: Foundations — Auth, RBAC, UI shell, logging, basic DX/test.
- Wave 2: Organizations/Teams, richer domain entities, invites & role workflows.
- Wave 3: Setup checklist, guided onboarding, early analytics and insights.

## Glossary (Short)
- DIY Planner: Individual planning their own event(s).
- Pro Planner: Professional planning on behalf of clients.
- Vendor: Supplier offering services (e.g., catering, decor).
- Venue: Location operators managing availability and bookings.
- Client: End-customer receiving services (may overlap with DIY Planner).
- Admin: Platform admin with elevated controls.
