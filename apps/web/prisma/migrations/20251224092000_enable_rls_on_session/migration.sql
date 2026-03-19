-- Enable + force RLS on Session, lock down grants, and restrict access to the owning user.

ALTER TABLE public."Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Session" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."Session" FROM anon;
REVOKE ALL ON TABLE public."Session" FROM authenticated;

-- Idempotency: replace policies
DROP POLICY IF EXISTS "session_select_own" ON public."Session";

-- Allow authenticated users to read ONLY their own sessions
-- userId is text in this schema; auth.uid() is uuid -> cast to text
CREATE POLICY "session_select_own"
ON public."Session"
FOR SELECT
TO authenticated
USING ("userId" = auth.uid()::text);

-- Intentionally no INSERT/UPDATE/DELETE policies:
-- sessions should be managed server-side via service role / auth provider.
