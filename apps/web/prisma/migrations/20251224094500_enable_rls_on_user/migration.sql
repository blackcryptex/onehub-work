-- Secure public.User with RLS (high risk due to password column)

ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."User" FROM anon;
REVOKE ALL ON TABLE public."User" FROM authenticated;

-- Replace policies idempotently
DROP POLICY IF EXISTS "user_select_own" ON public."User";

-- Allow authenticated users to read ONLY their own user record
-- id is text; auth.uid() is uuid -> cast to text and use SELECT wrapper for initplan
CREATE POLICY "user_select_own"
ON public."User"
FOR SELECT
TO authenticated
USING ("id" = ((select auth.uid())::text));

-- Intentionally no INSERT/UPDATE/DELETE policies:
-- user creation/updates should be handled server-side (service role) or via controlled RPC.
