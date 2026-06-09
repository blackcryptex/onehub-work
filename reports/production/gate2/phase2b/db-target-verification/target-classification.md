# Gate 2 Phase 2B DB target classification

Secrets redacted: no username, password, full URL, or query token is printed.

Selected source: `apps/web/.env.local`
Target class: `remote-managed-postgres`
Host: `aws-1-us-east-1.pooler.supabase.com`
Database: `postgres`
Port: `5432`
SSL mode: `None`
URL fingerprint: `a7ad54378c00`

Candidate DATABASE_URL entries found: 4
Unique redacted fingerprints: 2
Active ambiguous: False
Selection reason: Selected process.env DATABASE_URL when set, else apps/web/.env.local as the runtime local env source. Other save/example files are recorded as inactive candidates only.

## Inactive candidate sources (redacted)
- apps/web/.env.local: class=remote-managed-postgres, host=aws-1-us-east-1.pooler.supabase.com, db=postgres, fp=a7ad54378c00
- apps/web/.env.local.save: class=remote-managed-postgres, host=aws-1-us-east-1.pooler.supabase.com, db=postgres, fp=a7ad54378c00
- apps/web/.env.local.save.1: class=remote-managed-postgres, host=aws-1-us-east-1.pooler.supabase.com, db=postgres, fp=a7ad54378c00
- apps/web/.env.example: class=non-postgres-or-invalid, host=, db=, fp=760d6134d795
