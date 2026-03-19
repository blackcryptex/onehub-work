# ADMIN Role & DEV_GOD_MODE Implementation Summary

## Overview

Implemented a proper ADMIN role system with a development "god mode" feature that allows easy access to all dashboards without constantly logging in during development.

## What Was Implemented

### 1. Database Schema ✅

- **Status**: The `User` model already had a `role` field of type `Role` enum
- **Role Enum**: Already includes `ADMIN` along with `DIY_PLANNER`, `PRO_PLANNER`, `VENDOR`, `VENUE`, `CLIENT`
- **No migration needed**: The role field already exists in the schema

### 2. Seed Admin User ✅

**File**: `scripts/seed.ts`

- Added `admin@onehub.local` user to the seed data:
  - Email: `admin@onehub.local`
  - Name: `OneHub Admin`
  - Role: `ADMIN`
  - Password: `password` (hashed with bcrypt)

**To seed the database:**
```bash
cd apps/web
pnpm prisma db seed
```

### 3. NextAuth Session Configuration ✅

**File**: `apps/web/src/lib/auth.ts`

- Updated session config to use environment variables:
  - `NEXTAUTH_SESSION_MAX_AGE` (default: 12 hours)
  - `NEXTAUTH_SESSION_UPDATE_AGE` (default: 1 hour)
- JWT callback already stores `role` in token
- Session callback already reads `role` from token and sets it on `session.user`

**File**: `apps/web/src/types/next-auth.d.ts`

- Updated TypeScript types to ensure `role` is required (not optional) on `User` and `Session`
- Added `id` to JWT interface

### 4. Shared Auth Helper with DEV_GOD_MODE ✅

**File**: `apps/web/src/lib/auth-helpers.ts` (NEW)

Created a new shared auth helper module with:

- **`AppUser` type**: Represents authenticated user with `id`, `email`, `name`, `role`
- **`isAdmin(user)` function**: Checks if user has ADMIN role
- **`getCurrentUser()` function**: 
  - In **development** with `DEV_GOD_MODE=true`: Returns fake admin user without requiring login
  - In **production**: Only returns real authenticated users
  - Maps NextAuth session to `AppUser` type

### 5. Dashboard Updates ✅

Updated all server-side dashboard pages to use `getCurrentUser()` and `isAdmin()`:

**Files Updated:**
- `apps/web/src/app/app/page.tsx` - Main app dashboard
- `apps/web/src/app/vendor/dashboard/page.tsx` - Vendor dashboard
- `apps/web/src/app/venue/dashboard/page.tsx` - Venue dashboard
- `apps/web/src/app/pro/planner/page.tsx` - Pro Planner dashboard
- `apps/web/src/app/(app)/vault/page.tsx` - Event Vault page
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` - Event detail page
- `apps/web/src/app/(app)/layout.tsx` - App layout
- `apps/web/src/app/app/layout.tsx` - App layout

**Changes Made:**
- Replaced `auth()` calls with `getCurrentUser()`
- Added `isAdmin(user)` checks
- Updated Prisma queries to:
  - **Admin users**: See all data (no owner/org filters)
  - **Normal users**: See only their own data (existing filters preserved)
- Added comments indicating admin vs normal user behavior

### 6. Environment Variables ✅

**Session Configuration:**
- `NEXTAUTH_SESSION_MAX_AGE` - Session lifetime in seconds (default: 43200 = 12 hours)
- `NEXTAUTH_SESSION_UPDATE_AGE` - Session refresh interval in seconds (default: 3600 = 1 hour)

**DEV_GOD_MODE:**
- `DEV_GOD_MODE=true` - Enables fake admin user in development
- Only works when `NODE_ENV=development`
- Has no effect in production

## How to Use

### Log in as Admin User

1. **Seeded Admin User**:
   - Email: `admin@onehub.local`
   - Password: `password`
   - Go to `/signin` and log in with these credentials

2. **Existing Admin User** (from seed):
   - Email: `admin@example.com`
   - Password: `password`

### Enable DEV_GOD_MODE

Add to `.env.local`:
```bash
# Development "god mode" - bypasses auth, returns fake admin user
DEV_GOD_MODE=true

# Optional: Customize session lifetime
NEXTAUTH_SESSION_MAX_AGE=86400  # 24 hours
NEXTAUTH_SESSION_UPDATE_AGE=3600  # 1 hour
```

**Important**: 
- `DEV_GOD_MODE` only works when `NODE_ENV=development`
- In production, `DEV_GOD_MODE` is ignored and only real authenticated users are allowed

### Disable DEV_GOD_MODE

Remove or set to `false` in `.env.local`:
```bash
DEV_GOD_MODE=false
# or simply remove the line
```

## Files Changed

### Created:
- `apps/web/src/lib/auth-helpers.ts` - Shared auth helper with DEV_GOD_MODE

### Modified:
- `scripts/seed.ts` - Added `admin@onehub.local` user
- `apps/web/src/lib/auth.ts` - Added session env variable support
- `apps/web/src/types/next-auth.d.ts` - Made role required, added id to JWT
- `apps/web/src/app/app/page.tsx` - Updated to use `getCurrentUser()` and admin checks
- `apps/web/src/app/vendor/dashboard/page.tsx` - Updated to use `getCurrentUser()` and admin checks
- `apps/web/src/app/venue/dashboard/page.tsx` - Updated to use `getCurrentUser()` and admin checks
- `apps/web/src/app/pro/planner/page.tsx` - Updated to use `getCurrentUser()` and admin checks
- `apps/web/src/app/(app)/vault/page.tsx` - Updated to use `getCurrentUser()` and admin checks
- `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` - Updated to use `getCurrentUser()` and admin checks
- `apps/web/src/app/(app)/layout.tsx` - Updated to use `getCurrentUser()`
- `apps/web/src/app/app/layout.tsx` - Updated to use `getCurrentUser()`

## Testing

1. **Test Admin Login**:
   ```bash
   # Seed database
   cd apps/web
   pnpm prisma db seed
   
   # Start dev server
   pnpm dev
   
   # Go to http://localhost:3000/signin
   # Login with: admin@onehub.local / password
   ```

2. **Test DEV_GOD_MODE**:
   ```bash
   # Add to .env.local
   DEV_GOD_MODE=true
   
   # Restart dev server
   # Visit any dashboard - should work without login
   ```

3. **Verify Admin Access**:
   - Admin should see all organizations, events, contracts, etc.
   - Normal users should only see their own data

## Notes

- The role field already existed in the Prisma schema, so no migration was needed
- Some TypeScript errors remain related to ContractStatus enum values that need Prisma migration (from payment implementation)
- DEV_GOD_MODE is completely disabled in production - it only works when `NODE_ENV=development`
- Admin users bypass all owner/org filters in queries, allowing them to see all data across the platform

