-- Fix Supabase warning: multiple permissive policies for SELECT on public.UserSettings
-- Cause: usersettings_upsert_own was FOR ALL (includes SELECT).
-- Fix: keep one SELECT policy; restrict write policies to INSERT/UPDATE only.

-- Drop the broad policy
DROP POLICY IF EXISTS "usersettings_upsert_own" ON public."UserSettings";

-- Create INSERT policy (own row)
DROP POLICY IF EXISTS "usersettings_insert_own" ON public."UserSettings";
CREATE POLICY "usersettings_insert_own"
ON public."UserSettings"
FOR INSERT
TO authenticated
WITH CHECK ("userId" = ((select auth.uid())::text));

-- Create UPDATE policy (own row)
DROP POLICY IF EXISTS "usersettings_update_own" ON public."UserSettings";
CREATE POLICY "usersettings_update_own"
ON public."UserSettings"
FOR UPDATE
TO authenticated
USING ("userId" = ((select auth.uid())::text))
WITH CHECK ("userId" = ((select auth.uid())::text));
