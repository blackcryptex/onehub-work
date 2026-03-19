# OneHub – Supabase Errors: Required Fix Plan (48–72 Hour Sprint)

Copy/paste this into Slack/Notion for the CTO. It focuses on getting the Supabase "errors require your attention" list under control fast with evidence before/after.

## 1) Freeze + Snapshot
- Create a short-lived branch: `hotfix/supabase-errors`.
- Baseline snapshot:
  - Supabase Dashboard: screenshot/export the "errors require your attention" view.
  - Capture current DB schema/migration status (Prisma + Supabase).
- Goal: prove "before vs after" without increasing error volume.

## 2) Export + Classify All Errors (no fixes yet)
- Build an "Error Triage Sheet" (Notion/GSheet) with columns: Error ID/Title, Service (DB/Auth/Storage/Edge Functions/Realtime/API), Severity (P0/P1/P2), Frequency (constant/spikes/rare), Endpoint/Table/Function, Repro steps (or "unknown"), Owner, Fix PR link, Status (triaged → in progress → fixed → verified).
- Deliverable: every error captured, even if details are "unknown."

## 3) Identify the Top 5 Root Cause Buckets
- A) RLS/permission denials: "permission denied…", "violates row-level security." Fix: review table policies, confirm `auth.uid()`, service role vs anon usage.
- B) Foreign key/constraint failures: null/unique/FK collisions. Fix: server-side validation, correct write order, upserts.
- C) Auth/JWT/session issues: invalid/missing/expired tokens. Fix: service key usage, client session tokens, refresh flow sanity.
- D) API misuse/wrong schema assumptions: bad column names/types. Fix: align Prisma ↔ Supabase schema, regenerate types, update queries.
- E) Edge functions/webhooks: timeouts/500s/env drift. Fix: correlation IDs, retries/backoff, env validation.
- Deliverable: 1-page "Root Cause Summary" mapping each error to a bucket.

## 4) Fix Order (security and data first)
1. RLS leaks or overly permissive tables.
2. Critical writes blocked by RLS (signup, event creation, payments).
3. Constraint errors causing corruption/duplicates.
4. 500s in Edge Functions/API routes.
5. Auth loops/token failures.
6. Noise: console spam, minor 404s, non-user-impacting warnings.

## 5) Required Debug Instrumentation
- Add request correlation IDs in API routes/edge functions.
- Structured logging: `{ userId, route, table, action, payloadShape, errorCode }`.
- For DB writes: log table + operation + keys (avoid sensitive values).
- Rule: if you can't reproduce or trace it, you can't claim a fix.

## 6) Concrete Task Templates
1. **RLS Audit**: list tables, required access per role (DIY planner, pro planner, vendor, venue, admin), confirm policies match rules, add allow/deny tests.
2. **Schema Consistency**: compare Prisma vs Supabase schemas, fix drift (migrations/columns/enums/relations), regenerate types and update queries.
3. **Top 10 Error Fixes**: tackle highest-frequency errors first with reproduction/log evidence, PR link, and verification notes.
4. **Edge Functions Reliability**: ensure env vars exist and are correct, add timeouts/retries, improve error responses (no generic 500s).

## 7) Verification Standard
- A fix is "Done" when: (a) the error disappears from Supabase dashboard/logs for 24h, or (b) reproduction is impossible (test + logs).
- Deliverable: end-of-sprint report showing before/after error counts, remaining issues with reasons, and any security/data risks discovered.

## 8) Communication Cadence
- Daily Slack/notes update: "Errors remaining: X", "Fixed today: …", "Top blocker: …", "Next focus: …".

## Optional: faster triage help
Share one screenshot or list of the Supabase errors (10–20 items is enough). We'll pin them to buckets and suggest exact fixes (RLS policies, schema mismatch suspects, and affected OneHub flows).

