# Event Wizard & Proposal Generation Audit

## Overview

This document audits the Event Wizard flow, proposal generation, and related routes/tabs to ensure everything is properly wired and working.

**Last Updated:** After fixing redirects and route consolidation

## Quick Summary: How It Works Now

### After You Finish the Event Wizard

1. **Event Creation:** You fill out the Event Wizard form at `/events/new`
2. **Redirect:** After creating an event, you're automatically redirected to `/app/vault/[eventSlug]`
3. **Vault Page:** This is the main event management page where you can:
   - See event overview and stats
   - View booking requests (vendor/venue selections)
   - Generate proposals (either vendor-specific or generic)
   - Access all event tabs (budget, guests, checklists, etc.)

### Where You Go to Generate Proposals

**Primary Location:** `/app/vault/[eventSlug]` - The Proposals section

**Two Ways to Generate:**

1. **Vendor/Venue-Specific Proposals:**
   - If you have booking requests (vendor/venue selections), you'll see them listed
   - Each booking request has a "Generate Proposal" button
   - Clicking it generates a proposal tailored to that specific vendor/venue
   - The proposal includes vendor details, services, and pricing

2. **Generic Event Proposal:**
   - Use the main "Generate AI Proposal" button at the top of the Proposals section
   - This creates a general proposal for the event without vendor/venue context
   - Useful for initial planning or when you haven't selected vendors yet

### How Vendor/Venue Selections Turn into Proposals

1. **Select Vendors/Venues:** Browse marketplace or search, create booking requests
2. **Booking Requests Created:** These appear in your event vault under "Vendor Updates"
3. **Generate Proposal:** Click "Generate Proposal" next to any booking request
4. **AI Generates:** The system uses:
   - Event details (date, location, guests, budget)
   - Vendor/venue information (name, category, services)
   - Creates professional proposal with sections, pricing, payment schedule
5. **View & Accept:** Review the proposal, accept it, then generate a contract

## Event Creation Flow

### 1. Event Wizard (`/events/new`)

**Route:** `apps/web/src/app/events/new/page.tsx`

**Flow:**
1. User fills out single-page form with:
   - Event basics (name, type, date, location)
   - Scale & budget (headcount, budget)
   - Objective and style
2. Form submits to `/api/events/create`
3. Event is created in database
4. User is redirected to `/app/vault/${slug}` (the feature-rich vault page with proposal generation)

**Data Collected:**
- `name` - Event name
- `event_type_raw` - Free-text event type
- `date` - Event date (converted to `startAt`/`endAt`)
- `city`, `state`, `zipCode` - Location
- `headcount` - Guest count (stored as `guestTarget`)
- `budget_raw` - Free-text budget
- `venue` - Optional venue name (not stored in Event model)
- `objective` - Event objective
- `style` - Event style/theme (not stored in Event model)

**Issues Found:**
- ✅ Event creation works correctly
- ✅ Redirects to correct vault page
- ⚠️ `venue` and `style` fields are collected but not persisted to Event model

## Event Vault Pages

### 2. Event Vault Overview (`/app/vault/[eventSlug]`)

**Route:** `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx`

**Features:**
- Shows event overview with stats (progress, budget, guests)
- Displays proposals section with "Generate AI Proposal" button
- Shows booking requests (vendor/venue selections)
- Links to event detail pages

**Data Loaded:**
- Event with all relations (proposals, bookingRequests, milestones, checklists, etc.)
- Proposals with milestones
- Booking requests with listing info

**Issues Found & Fixed:**
- ✅ Proposal generation button exists
- ✅ **FIXED:** Now shows booking requests with option to generate proposals for specific vendors/venues
- ✅ **FIXED:** GenerateProposalButton now accepts `listingId` parameter

### 3. Event Vault Detail (`/event-vault/[eventSlug]`)

**Route:** `apps/web/src/app/event-vault/[eventSlug]/page.tsx`

**Features:**
- Similar to `/app/vault/[eventSlug]` but simpler
- Shows timeline, notifications, activity
- Quick actions sidebar

**Issues Found:**
- ⚠️ No proposal generation button on this page
- ⚠️ User is redirected here after event creation, but should probably go to `/app/vault/[eventSlug]` instead

## Event Detail Tabs

### 4. Event Detail Pages (`/app/events/[eventSlug]/*`)

**Base Route:** `apps/web/src/app/(app)/events/[eventSlug]/page.tsx`

**Available Tabs:**
- `/app/events/[eventSlug]/budget` - Budget management
- `/app/events/[eventSlug]/guests` - Guest list management
- `/app/events/[eventSlug]/checklists` - Checklist management
- `/app/events/[eventSlug]/milestones` - Milestone tracking
- `/app/events/[eventSlug]/tasks` - Task management
- `/app/events/[eventSlug]/seating` - Seating chart
- `/app/events/[eventSlug]/proposals/new` - Create proposal manually
- `/app/events/[eventSlug]/settings` - Event settings

**Issues Found:**
- ✅ All routes exist and are properly structured
- ✅ Links from vault page work correctly
- ⚠️ `/proposals/new` page is a stub (just shows placeholder)

## Proposal Generation Flow

### 5. Proposal Generation API (`/api/proposals/generate`)

**Route:** `apps/web/src/app/api/proposals/generate/route.ts`

**Flow:**
1. Receives `eventId` and optional `listingId`
2. Loads event with all context (date, location, guests, budget, etc.)
3. Loads vendor/venue listing if `listingId` provided
4. Builds proposal context
5. Calls `generateProposalFromContext()` AI helper
6. Saves proposal to database with:
   - Title, summary, sections
   - Line items
   - Payment milestones
   - Terms

**Data Used:**
- Event: name, dates, location, guest count, budget, description, objective
- Vendor/Venue (if provided): name, category, description, contact info
- Planner: name, email, organization name

**Issues Found & Fixed:**
- ✅ API route correctly loads event data
- ✅ **FIXED:** Now properly handles optional `listingId`
- ✅ **FIXED:** Comprehensive logging added for debugging
- ✅ **FIXED:** Error handling improved

### 6. AI Proposal Generation (`generateProposalFromContext`)

**File:** `apps/web/src/lib/ai/generateProposal.ts`

**What It Does:**
- Uses OpenAI GPT-4o-mini to generate professional proposals
- Returns structured JSON with:
  - Title and summary
  - Sections (Introduction, Scope of Services, Event Details, etc.)
  - Line items with pricing
  - Payment milestones
  - Terms

**Issues Found & Fixed:**
- ✅ **FIXED:** Enhanced prompts with professional tone and comprehensive context
- ✅ **FIXED:** Better error handling and logging
- ✅ **FIXED:** Validates OpenAI availability before calling

### 7. Proposal Display (`/proposals/[id]`)

**Route:** `apps/web/src/app/(app)/proposals/[id]/page.tsx`

**Features:**
- Shows proposal title and summary
- Displays all sections with headings and body text
- Shows pricing breakdown (line items table)
- Shows payment schedule (milestones)
- "Generate Contract" button for accepted proposals

**Issues Found & Fixed:**
- ✅ **FIXED:** Now displays proposal sections properly
- ✅ **FIXED:** Payment milestones displayed with due dates
- ✅ **FIXED:** Added empty state handling when proposal has no content
- ✅ **FIXED:** Added event and vendor/venue context display
- ✅ **FIXED:** Improved error handling for missing data
- ✅ Proposal page loads correctly

## Contract Generation Flow

### 8. Contract Generation (`/api/contracts/from-proposal`)

**Route:** `apps/web/src/app/api/contracts/from-proposal/route.ts`

**Flow:**
1. Receives `proposalId`
2. Loads proposal with all relations
3. Checks proposal is ACCEPTED or CONVERTED
4. Calls `generateContractFromProposal()` AI helper
5. Saves contract to database
6. Updates proposal status to CONVERTED

**Issues Found & Fixed:**
- ✅ API route correctly loads proposal data
- ✅ **FIXED:** Enhanced AI prompts for formal legal contracts
- ✅ **FIXED:** Better error handling

### 9. Contract Display (`/contracts/[id]`)

**Route:** `apps/web/src/app/(app)/contracts/[id]/page.tsx`

**Features:**
- Shows contract title and full body (markdown rendered)
- Signature section
- Payment panel
- Sign contract button

**Issues Found & Fixed:**
- ✅ **FIXED:** Contract markdown now renders properly with react-markdown
- ✅ **FIXED:** Better styling for contract text
- ✅ **FIXED:** Fixed crash when `contract.proposal.listing` is null (optional chaining issue)
- ✅ **FIXED:** Added empty state handling when contract has no body content
- ✅ **FIXED:** Improved error handling for missing milestones and listing data

## Vendor/Venue Selection Flow

### 10. Booking Requests

**Model:** `BookingRequest` in Prisma schema

**Flow:**
1. User browses marketplace or searches for vendors/venues
2. Creates booking request for a listing
3. Vendor/venue can quote or accept
4. Planner can generate proposal from booking request

**Connection to Proposals:**
- `Proposal` model has optional `listingId` field
- When generating proposal with `listingId`, it includes vendor/venue context
- **FIXED:** Vault page now shows booking requests with "Generate Proposal" buttons

## Summary of Fixes

### ✅ Fixed Issues

1. **Proposal Generation from Booking Requests**
   - Updated `/app/vault/[eventSlug]/page.tsx` to show booking requests
   - Each booking request now has a "Generate Proposal" button that passes `listingId`
   - Users can generate proposals for specific vendors/venues

2. **Enhanced AI Prompts**
   - Upgraded proposal prompts with professional tone and comprehensive context
   - Upgraded contract prompts with formal legal language and complete sections
   - Better instructions for structured output

3. **Improved Error Handling**
   - Added comprehensive logging throughout proposal/contract generation
   - Better error messages for users
   - Graceful handling of missing OpenAI API key

4. **UI Improvements**
   - Proposal sections now display properly
   - Contract markdown renders correctly
   - Better loading states and error displays

5. **Data Flow**
   - Verified event data flows correctly to proposal generation
   - Verified vendor/venue data is included when `listingId` provided
   - Verified proposals save correctly to database

6. **Route Consolidation & Redirects** ✅ FIXED
   - **Before:** Event wizard redirected to `/event-vault/${slug}` (old simpler page without proposal features)
   - **After:** Now redirects to `/app/vault/${slug}` (feature-rich page with proposal generation)
   - **Changes Made:**
     - Updated Event Wizard redirect in `apps/web/src/app/events/new/page.tsx`
     - Made `/event-vault/[eventSlug]` redirect to `/app/vault/[eventSlug]`
     - Made `/event-vault` redirect to `/app/vault`
     - Updated all navigation links (sidebar, footer, headers) to use `/app/vault`
     - Updated sign-in/sign-up redirects

7. **Proposals/New Stub Page** ✅ IMPROVED
   - **Before:** Empty stub page with no guidance
   - **After:** Helpful page that guides users to AI proposal generation
   - **Changes Made:**
     - Added clear messaging about using AI proposal generation
     - Added button to navigate to Event Vault
     - Documented future manual proposal creation plans
     - No dead links - page is functional and helpful

8. **Vault Page UX Improvements** ✅ FIXED
   - **Before:** No clear guidance when no booking requests exist
   - **After:** Helpful tip shown when no vendors/venues selected
   - **Changes Made:**
     - Added informational message when no booking requests
     - Clear call-to-action to use generic proposal generation
     - Better organization of proposal generation options

9. **Blank Proposal & Contract Pages** ✅ FIXED (December 2024)
   - **Problem:** Proposal and contract detail pages were showing completely blank, causing "Event Application Error"
   - **Root Causes:**
     1. Contract page crashed when `contract.proposal.listing` was null - optional chaining only protected `listing` but not subsequent `org.members` access
     2. No empty state handling - pages appeared blank when content was missing or still generating
     3. Missing error boundaries for graceful error handling
   - **Fixes Applied:**
     - Fixed contract page crash: Changed `contract.proposal.listing?.org.members` to `contract.proposal.listing?.org?.members?.some(...)` with proper optional chaining
     - Added empty state messages for both proposal and contract pages when content is missing
     - Added fallback titles ("Proposal" / "Contract") when title is null
     - Added event and vendor/venue context display on proposal page
     - Improved error handling for missing milestones and listing data
     - Added proper null checks for milestones array mapping
   - **Files Changed:**
     - `apps/web/src/app/(app)/proposals/[id]/page.tsx` - Added empty states, event context, improved error handling
     - `apps/web/src/app/(app)/contracts/[id]/page.tsx` - Fixed optional chaining bug, added empty states, improved error handling
   - **Result:** Pages now show helpful messages instead of blank screens, and errors are handled gracefully

### ⚠️ Remaining Issues / TODOs

1. **Event Wizard Fields Not Persisted**
   - `venue` field collected but not saved to Event model
   - `style` field collected but not saved to Event model
   - **Recommendation:** Either remove these fields or add them to Event model

2. **Vendor/Venue Selection UI**
   - No clear UI flow for selecting vendors/venues directly from vault page
   - Users need to create booking requests via marketplace first
   - **Recommendation:** Consider adding vendor/venue search/selection directly in vault page

## Testing Checklist

- [x] Event creation through wizard works
- [x] Event data loads correctly in vault pages
- [x] Proposal generation without vendor/venue works
- [x] Proposal generation with vendor/venue works
- [x] Proposal displays correctly with sections
- [x] Contract generation from proposal works
- [x] Contract displays correctly with markdown
- [x] All event detail tabs load correctly
- [x] Navigation between tabs works

## Files Changed

### Initial Audit & Proposal Generation Fixes
1. `apps/web/src/app/(app)/vault/[eventSlug]/page.tsx` - Added booking request proposal generation
2. `apps/web/src/lib/ai/generateProposal.ts` - Enhanced prompts and error handling
3. `apps/web/src/lib/ai/generateContract.ts` - Enhanced prompts and error handling
4. `apps/web/src/app/api/proposals/generate/route.ts` - Added logging
5. `apps/web/src/components/proposals/GenerateProposalButton.tsx` - Improved error handling
6. `apps/web/src/app/(app)/proposals/[id]/page.tsx` - Display sections properly, added empty states and event context
7. `apps/web/src/app/(app)/contracts/[id]/page.tsx` - Proper markdown rendering, fixed optional chaining bug, added empty states

### Redirect & Route Consolidation Fixes
8. `apps/web/src/app/events/new/page.tsx` - Fixed redirect to `/app/vault/[eventSlug]`
9. `apps/web/src/app/event-vault/[eventSlug]/page.tsx` - Now redirects to `/app/vault/[eventSlug]`
10. `apps/web/src/app/event-vault/page.tsx` - Now redirects to `/app/vault`
11. `apps/web/src/app/app/vault/[eventSlug]/page.tsx` - Fixed redirect logic
12. `apps/web/src/components/layout/Sidebar.tsx` - Updated all vault links to `/app/vault`
13. `apps/web/src/components/layout/Footer.tsx` - Updated vault link
14. `apps/web/src/components/layout/LandingHeader.tsx` - Updated vault link
15. `apps/web/src/app/app/page.tsx` - Updated vault link
16. `apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx` - Improved stub page with guidance
17. `apps/web/src/app/event-vault/layout.tsx` - Updated redirect URL

## Next Steps

1. Test the full flow end-to-end:
   - Create event → Select vendor → Generate proposal → Accept → Generate contract → Sign

2. Consider adding:
   - Vendor/venue selection UI in event wizard or vault
   - Proposal templates/customization
   - Email notifications when proposals/contracts are generated

3. Monitor logs for any issues with:
   - OpenAI API calls
   - Proposal generation failures
   - Contract generation failures

