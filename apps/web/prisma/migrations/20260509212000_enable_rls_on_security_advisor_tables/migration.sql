-- Enable Row Level Security on Supabase Security Advisor flagged tables.
-- These tables contain sensitive admin/payment/refund/acceptance/dream-response data.
-- The app accesses them through server-side Prisma using the database owner role;
-- no broad anon/authenticated client policies are added here.
ALTER TABLE "public"."AcceptanceCapture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AdminOverride" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."PaymentHoldback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."RefundRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DreamResponse" ENABLE ROW LEVEL SECURITY;
