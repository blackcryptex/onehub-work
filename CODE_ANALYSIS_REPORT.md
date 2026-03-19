# Code Analysis Report - OneHub

## 🔴 CRITICAL ISSUES FOUND

### 1. DUPLICATE LAYOUTS (Identical Code)
**Location:** `apps/web/src/app/(app)/layout.tsx` and `apps/web/src/app/app/layout.tsx`
- Both files are **identical** (except trailing newline)
- Both handle authentication and render the same layout
- **Impact:** Maintenance burden, potential confusion
- **Recommendation:** Remove one - likely `app/layout.tsx` since `(app)` is the route group

### 2. WRONG ROUTE IN EVENT CREATION
**Location:** `apps/web/src/app/events/new/page.tsx` lines 58, 61
- Uses `/vault/${slug}` instead of `/app/vault/${slug}`
- **Impact:** 404 error when navigating to created events
- **Fix Required:** Change to `/app/vault/${slug}`

### 3. REDUNDANT AUTH CHECK IN VAULT DETAIL
**Location:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` line 20-23
- Already protected by `(app)/layout.tsx` which checks auth
- **Impact:** Unnecessary code duplication
- **Note:** Layout already redirects if no session, so this check is redundant but harmless

### 4. INCORRECT ACCESS CHECK LOGIC
**Location:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` lines 62-64
```typescript
const isOwner = event.org.ownerId === userId;
const isMember = event.org.members.length > 0; // WRONG: checks if ANY members exist
if (!isOwner && !isMember) return notFound();
```
- **Bug:** `isMember` checks if org has ANY members, not if USER is a member
- **Impact:** Users might be denied access incorrectly
- **Fix:** Should check `event.org.members.some(m => m.userId === userId)`

### 5. CHECKLIST CREATION ERROR
**Location:** `apps/web/src/app/api/events/create/route.ts` lines 123-131
- Creates `checklist` records but should create `checklist` with `items` 
- Schema shows `Checklist` has `items: ChecklistItem[]` relation
- **Impact:** Creates empty checklists without items
- **Fix:** Should create Checklist first, then ChecklistItems

## 🟡 MINOR ISSUES

### 6. Inconsistent Redirect Paths
- Some use `/signin`, others use `/signin?redirect=/app/vault`
- `(app)/vault/page.tsx` redirects to `/signin` (no redirect param)
- Should be consistent: always include redirect parameter

### 7. Duplicate createEvent Variable
**Location:** `apps/web/src/app/(auth)/signin/page.tsx` lines 17, 31
- `createEvent` defined twice (line 17 and line 31)
- **Impact:** Minor, but redundant

### 8. Type Safety Issues
- Multiple `as any` casts: `(session?.user as any)?.role`
- `redirect as any` in signin/signup pages
- Should use proper TypeScript types

## ✅ CORRECT LOGIC

### Authentication Flow
- Layout-level auth protection in `(app)/layout.tsx` is correct
- Sign-in/sign-up redirects are mostly correct
- Session management looks good

### Database Queries
- Prisma queries are well-structured
- Includes are properly nested
- Access checks are in place (though one has a bug)

## 📋 SUMMARY

**Total Issues Found:** 8
- **Critical:** 5
- **Minor:** 3

**Recommendations:**
1. Remove duplicate `app/layout.tsx`
2. Fix route paths in event creation
3. Fix access check logic in vault detail page
4. Fix checklist creation to use ChecklistItems
5. Standardize redirect paths
6. Remove duplicate variable declarations
7. Improve type safety

