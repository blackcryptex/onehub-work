# Phase 3 Implementation Summary: Client Intake Step in Event Wizard

## Overview
Phase 3 adds a "Client Intake" step to the Pro Planner event creation wizard, allowing Pro Planners to select or invite clients and link them to events during creation.

## Implementation Details

### 1. Multi-Step Wizard UI
**File**: `apps/web/src/app/events/new/page.tsx`

- Converted single-page wizard to multi-step flow
- Added step state management (`"details"` | `"clients"`)
- Step indicator shows progress (only visible for Pro Planners)
- Client Intake step is only shown for Pro Planners
- Non-Pro Planners skip directly to event creation

**Key Changes**:
- Added `step` state variable
- Added `selectedClientIds` and `autoShareSummary` state
- Modified `handleSubmit` to validate and navigate between steps
- Added `handleBack` function for navigation
- Conditional rendering based on user role and step

### 2. Client Intake Component
**File**: `apps/web/src/components/events/ClientIntakeStep.tsx`

**Features**:
- Search for existing CLIENT users by name or email
- Invite new clients by email (creates CLIENT user if doesn't exist)
- Display selected clients with ability to remove
- Option to auto-share event SUMMARY with selected clients
- Clear UI with helpful messaging

**Props**:
- `selectedClientIds: string[]` - Array of selected client user IDs
- `onClientIdsChange: (ids: string[]) => void` - Callback when selection changes
- `autoShareSummary: boolean` - Whether to auto-share SUMMARY
- `onAutoShareChange: (value: boolean) => void` - Callback for auto-share toggle

### 3. User Search API
**File**: `apps/web/src/app/api/users/search/route.ts`

**Endpoint**: `GET /api/users/search?q=query&role=CLIENT`

**Features**:
- Search users by name or email (case-insensitive)
- Filter by role (defaults to CLIENT)
- Only planners (PRO_PLANNER, DIY_PLANNER, ADMIN) can search
- Returns up to 10 results

**Response**:
```json
{
  "users": [
    {
      "id": "user_id",
      "name": "Client Name",
      "email": "client@example.com"
    }
  ]
}
```

### 4. Client Invite API
**File**: `apps/web/src/app/api/users/invite-client/route.ts`

**Endpoint**: `POST /api/users/invite-client`

**Features**:
- Creates new CLIENT user if email doesn't exist
- Returns existing user if already registered
- Only planners can invite clients
- Generates temporary password (user must reset on first login)
- TODO: Send invitation email (currently stubbed)

**Request**:
```json
{
  "email": "client@example.com"
}
```

**Response**:
```json
{
  "userId": "user_id",
  "name": "Client Name",
  "email": "client@example.com",
  "message": "Client invited successfully"
}
```

### 5. Event Creation API Updates
**File**: `apps/web/src/app/api/events/create/route.ts`

**Schema Updates**:
- Added `clientIds: string[]` (optional, defaults to `[]`)
- Added `autoShareSummary: boolean` (optional, defaults to `false`)

**New Logic** (after event creation):
1. Validates all client IDs are valid CLIENT users
2. Creates `EventStakeholder` records for each selected client
   - `eventId`: The created event
   - `userId`: Client user ID
   - `role`: `"CLIENT"`
   - `addedByUserId`: Pro Planner user ID
3. If `autoShareSummary` is true, creates `EventShare` records
   - `eventId`: The created event
   - `viewerUserId`: Client user ID
   - `scope`: `"SUMMARY"`
   - `createdByUserId`: Pro Planner user ID

**Error Handling**:
- Ignores unique constraint violations (client already stakeholder/share exists)
- Logs warnings for other errors but doesn't fail event creation
- Event creation succeeds even if client linking fails

## Database Models Used

### EventStakeholder (Phase 1)
- Links clients to events without org membership
- Unique constraint: `(eventId, userId)`

### EventShare (Phase 2)
- Controls what clients can view
- Scope: `SUMMARY` (only scope currently supported)
- Unique constraint: `(eventId, viewerUserId, scope)`

## User Experience Flow

### Pro Planner Flow:
1. **Step 1: Event Details**
   - Fill out event form (name, type, date, location, budget, etc.)
   - Click "Next: Client Intake"

2. **Step 2: Client Intake** (optional)
   - Search for existing clients
   - Invite new clients by email
   - Select clients to link to event
   - Optionally enable auto-share SUMMARY
   - Click "Back" to return to details
   - Click "Create Event" to finish

### Non-Pro Planner Flow:
1. **Step 1: Event Details**
   - Fill out event form
   - Click "Create Event" (skips client intake)

## Acceptance Criteria ✅

- ✅ Pro can assign clients during event creation
- ✅ Clients are linked correctly via EventStakeholder records
- ✅ Clients can see shared summary if auto-share is enabled
- ✅ Client intake step only appears for Pro Planners
- ✅ Non-Pro Planners can still create events (skips client intake)
- ✅ Sharing scopes limited to SUMMARY (as per constraints)

## Testing Recommendations

1. **Pro Planner Event Creation with Clients**:
   - Create event as Pro Planner
   - Navigate to Client Intake step
   - Search for existing CLIENT users
   - Invite new client by email
   - Select multiple clients
   - Enable auto-share SUMMARY
   - Create event
   - Verify EventStakeholder records created
   - Verify EventShare records created (if auto-share enabled)

2. **Pro Planner Event Creation without Clients**:
   - Create event as Pro Planner
   - Skip Client Intake step (or select no clients)
   - Create event
   - Verify event created successfully
   - Verify no EventStakeholder records created

3. **Non-Pro Planner Event Creation**:
   - Create event as DIY_PLANNER
   - Verify Client Intake step is not shown
   - Create event directly
   - Verify event created successfully

4. **Client Access**:
   - As linked CLIENT user, verify can access event (via `canViewEvent` RBAC)
   - If SUMMARY shared, verify client can see summary view

## Files Modified

1. `apps/web/src/app/events/new/page.tsx` - Multi-step wizard
2. `apps/web/src/components/events/ClientIntakeStep.tsx` - New component
3. `apps/web/src/app/api/users/search/route.ts` - New API endpoint
4. `apps/web/src/app/api/users/invite-client/route.ts` - New API endpoint
5. `apps/web/src/app/api/events/create/route.ts` - Updated to handle client intake

## Next Steps

- Implement email invitation sending (currently stubbed)
- Add client dashboard to view shared events
- Expand sharing scopes beyond SUMMARY (future phase)
- Add client payment/deposit flows (future phase)

