-- Lock MVP User and Account reads to server-only Prisma access.
-- Browser Supabase/PostgREST roles must not be able to read sensitive columns.

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Account" ENABLE ROW LEVEL SECURITY;

-- Remove prior authenticated self-read policies that exposed User.password
-- and Account token fields through browser/client Supabase access.
DROP POLICY IF EXISTS "user_select_own" ON public."User";
DROP POLICY IF EXISTS "account_select_own" ON public."Account";

-- Recreate deny policies idempotently.
DROP POLICY IF EXISTS "user_select_deny_client" ON public."User";
DROP POLICY IF EXISTS "account_select_deny_client" ON public."Account";

CREATE POLICY "user_select_deny_client"
ON public."User"
FOR SELECT
TO anon, authenticated
USING (false);

CREATE POLICY "account_select_deny_client"
ON public."Account"
FOR SELECT
TO anon, authenticated
USING (false);
