-- Secure public.UserSettings with RLS (user-owned by userId)

ALTER TABLE public."UserSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserSettings" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."UserSettings" FROM anon;
REVOKE ALL ON TABLE public."UserSettings" FROM authenticated;

-- Replace policies idempotently
DROP POLICY IF EXISTS "usersettings_select_own" ON public."UserSettings";
DROP POLICY IF EXISTS "usersettings_upsert_own" ON public."UserSettings";

-- SELECT: users can read their own settings
CREATE POLICY "usersettings_select_own"
ON public."UserSettings"
FOR SELECT
TO authenticated
USING ("userId" = ((select auth.uid())::text));

-- INSERT/UPDATE (optional): allow user to create/update their own settings
-- If your app writes UserSettings from the client, you need this.
CREATE POLICY "usersettings_upsert_own"
ON public."UserSettings"
FOR ALL
TO authenticated
USING ("userId" = ((select auth.uid())::text))
WITH CHECK ("userId" = ((select auth.uid())::text));
