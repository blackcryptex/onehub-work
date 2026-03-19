# Routing & Links Analysis

## DIY Planner Routes

### ✅ Verified Routes

| Route | Component | Status | Notes |
|-------|-----------|--------|-------|
| `/diy-planner` | `DIYPlannerDashboard` | ✅ Working | Main dashboard |
| `/diy-planner?view=overview` | `Overview` | ✅ Working | Default view |
| `/diy-planner?view=wizard` | `EventWizard` | ✅ Working | In-page wizard |
| `/diy-planner?view=calendar` | `CalendarPane` | ✅ Working | Calendar view |
| `/diy-planner?view=vault` | Event Vault | ✅ Working | Event list |
| `/diy-planner?view=eventDetail` | `EventManagementSection` | ✅ Working | Event detail |

### Sidebar Navigation Order ✅

**Verified in:** `apps/web/src/components/diy-planner/DIYSidebar.tsx:77-96`

Current order:
1. **Overview** (Dashboard section)
2. **Calendar** (Dashboard section) ✅ Moved below Overview
3. Event Vault section
   - My Events
   - Event cards list
4. Planning section
   - Vendors, Proposals, Contracts, etc.

**Status:** ✅ Correct - Calendar appears directly below Overview

### Create Event Flow ✅

**Verified in:** `apps/web/src/components/diy-planner/Dashboard.tsx:245-251`

1. User clicks "Create Event" in sidebar
2. `onCreate={() => setUiRoute("wizard")}` is called
3. Main view switches to `EventWizard` component
4. **No route change** - stays on `/diy-planner`
5. URL updates to `?view=wizard` (via `history.replaceState`)

**Status:** ✅ Working - Wizard mounts in-place, no redirect

## API Routes

### Event Creation
- ✅ `POST /api/events/create` - Updated to new DTO
- ✅ `POST /api/dreams/create` - Updated, backward compatible
- ⚠️ `GET /api/events/[slug]` - Returns event, may need new fields in response

### Potential Issues

| Route | Issue | Severity | Fix |
|-------|-------|----------|-----|
| `/api/events/[slug]` | Doesn't include new fields in response | Low | Add to select/include if needed |

## Dead Links

### Internal Links
- ✅ All sidebar links use `onClick` handlers (no `href="#"` issues)
- ✅ Overview deep-links use callback functions (no broken routes)

### External Links
- ⚠️ Some footer links may need verification (not analyzed in this pass)

## Route Verification Checklist

- [x] DIY Planner landing page loads
- [x] Overview section renders
- [x] Create Event opens wizard in-page
- [x] Calendar appears below Overview in sidebar
- [x] Event detail view loads with Action Bar
- [x] All tab panes mount correctly
- [ ] Legacy event creation pages (`/events/new`) still work (needs update)

## Recommendations

1. **Update Legacy Pages:** `apps/web/src/app/events/new/page.tsx` should use new DTO
2. **API Response:** Consider including new fields in GET responses for consistency
3. **Link Verification:** Run link checker script to verify external links

