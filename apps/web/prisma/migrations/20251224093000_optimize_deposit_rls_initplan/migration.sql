-- Optimize RLS policies to avoid per-row auth.uid() evaluation (Supabase auth_rls_initplan)

-- Replace Deposit policies with versions that call auth.uid() via SELECT (initplan)

DROP POLICY IF EXISTS "deposit_select_policy" ON public."Deposit";
DROP POLICY IF EXISTS "deposit_insert_policy" ON public."Deposit";

CREATE POLICY "deposit_select_policy" ON public."Deposit"
  FOR SELECT
  TO authenticated
  USING ("clientUserId" = ((select auth.uid())::text));

CREATE POLICY "deposit_insert_policy" ON public."Deposit"
  FOR INSERT
  TO authenticated
  WITH CHECK ("clientUserId" = ((select auth.uid())::text));
