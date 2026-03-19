-- Optimize RLS policy to avoid per-row auth.uid() evaluation (Supabase auth_rls_initplan)

DROP POLICY IF EXISTS "session_select_own" ON public."Session";

CREATE POLICY "session_select_own"
ON public."Session"
FOR SELECT
TO authenticated
USING ("userId" = ((select auth.uid())::text));
