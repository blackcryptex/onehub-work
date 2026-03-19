-- Lock down Prisma migrations table (should not be exposed via PostgREST)

ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM authenticated;

-- No policies on purpose:
-- With RLS enabled and no policies, anon/authenticated get zero access.
