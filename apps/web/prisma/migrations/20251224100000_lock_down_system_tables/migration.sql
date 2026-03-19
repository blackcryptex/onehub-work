-- Batch #1: Lock down system/internal tables (deny all for anon/authenticated).
-- These tables should be accessed only via server/service role, not directly from the client.

-- Helper pattern: Enable+Force RLS + revoke grants + no policies => deny all.

-- AuditLog
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AuditLog" FROM anon;
REVOKE ALL ON TABLE public."AuditLog" FROM authenticated;

-- WebhookEvent
ALTER TABLE public."WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WebhookEvent" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."WebhookEvent" FROM anon;
REVOKE ALL ON TABLE public."WebhookEvent" FROM authenticated;

-- CalendarMapping
ALTER TABLE public."CalendarMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CalendarMapping" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."CalendarMapping" FROM anon;
REVOKE ALL ON TABLE public."CalendarMapping" FROM authenticated;

-- CalendarSyncState
ALTER TABLE public."CalendarSyncState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CalendarSyncState" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."CalendarSyncState" FROM anon;
REVOKE ALL ON TABLE public."CalendarSyncState" FROM authenticated;

-- PaymentIntent
ALTER TABLE public."PaymentIntent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentIntent" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PaymentIntent" FROM anon;
REVOKE ALL ON TABLE public."PaymentIntent" FROM authenticated;

-- Transaction
ALTER TABLE public."Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Transaction" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Transaction" FROM anon;
REVOKE ALL ON TABLE public."Transaction" FROM authenticated;

-- MoneyTx
ALTER TABLE public."MoneyTx" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MoneyTx" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."MoneyTx" FROM anon;
REVOKE ALL ON TABLE public."MoneyTx" FROM authenticated;

-- EscrowAccount
ALTER TABLE public."EscrowAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EscrowAccount" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."EscrowAccount" FROM anon;
REVOKE ALL ON TABLE public."EscrowAccount" FROM authenticated;

-- Payout
ALTER TABLE public."Payout" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payout" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."Payout" FROM anon;
REVOKE ALL ON TABLE public."Payout" FROM authenticated;

-- AbuseReport (sensitive)
ALTER TABLE public."AbuseReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AbuseReport" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AbuseReport" FROM anon;
REVOKE ALL ON TABLE public."AbuseReport" FROM authenticated;

-- MetricDaily (internal metrics)
ALTER TABLE public."MetricDaily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MetricDaily" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."MetricDaily" FROM anon;
REVOKE ALL ON TABLE public."MetricDaily" FROM authenticated;

-- FeatureFlag (treat as server-controlled)
ALTER TABLE public."FeatureFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FeatureFlag" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."FeatureFlag" FROM anon;
REVOKE ALL ON TABLE public."FeatureFlag" FROM authenticated;

-- OrgFeatureFlag (server-controlled)
ALTER TABLE public."OrgFeatureFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrgFeatureFlag" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."OrgFeatureFlag" FROM anon;
REVOKE ALL ON TABLE public."OrgFeatureFlag" FROM authenticated;

-- UserFeatureFlag (server-controlled)
ALTER TABLE public."UserFeatureFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserFeatureFlag" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."UserFeatureFlag" FROM anon;
REVOKE ALL ON TABLE public."UserFeatureFlag" FROM authenticated;

-- OrgSettings (server-controlled by org admin flows; lock down until explicit policies are added)
ALTER TABLE public."OrgSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrgSettings" FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."OrgSettings" FROM anon;
REVOKE ALL ON TABLE public."OrgSettings" FROM authenticated;
