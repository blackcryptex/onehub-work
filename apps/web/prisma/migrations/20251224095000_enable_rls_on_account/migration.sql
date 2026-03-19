-- Secure public.Account with RLS (high risk due to token columns)

ALTER TABLE public."Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Account" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."Account" FROM anon;
REVOKE ALL ON TABLE public."Account" FROM authenticated;

DROP POLICY IF EXISTS "account_select_own" ON public."Account";

-- Allow authenticated users to read ONLY their own account rows
-- userId is text; auth.uid() is uuid -> cast to text and use initplan SELECT wrapper
CREATE POLICY "account_select_own"
ON public."Account"
FOR SELECT
TO authenticated
USING ("userId" = ((select auth.uid())::text));

-- Intentionally no INSERT/UPDATE/DELETE policies
