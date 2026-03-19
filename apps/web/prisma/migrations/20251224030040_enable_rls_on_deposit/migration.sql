-- Enable RLS on Deposit table (idempotent)
ALTER TABLE public."Deposit" ENABLE ROW LEVEL SECURITY;

-- Force RLS on Deposit table (idempotent)
ALTER TABLE public."Deposit" FORCE ROW LEVEL SECURITY;

-- Revoke ALL privileges from anon and authenticated roles (idempotent)
REVOKE ALL ON TABLE public."Deposit" FROM anon;
REVOKE ALL ON TABLE public."Deposit" FROM authenticated;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "deposit_select_policy" ON public."Deposit";
DROP POLICY IF EXISTS "deposit_insert_policy" ON public."Deposit";

-- Create SELECT policy for authenticated users scoped to clientUserId = auth.uid()
CREATE POLICY "deposit_select_policy" ON public."Deposit"
  FOR SELECT
  TO authenticated
  USING ("clientUserId" = auth.uid()::text);

-- Create INSERT policy for authenticated users scoped to clientUserId = auth.uid()
CREATE POLICY "deposit_insert_policy" ON public."Deposit"
  FOR INSERT
  TO authenticated
  WITH CHECK ("clientUserId" = auth.uid()::text);

