# Event Wizard Flow - Simple Summary

## What Happens After You Finish the Event Wizard

1. **You fill out the form** at `/events/new` with:
   - Event name, type, date, location
   - Guest count and budget
   - Objective and style

2. **Event gets created** in the database via `/api/events/create`

3. **You're redirected** to `/app/vault/[eventSlug]` - the main event management page

## Where You Go to Generate Proposals

**Location:** `/app/vault/[eventSlug]` - Look for the "Proposals" section

**Two Ways to Generate:**

### Option 1: Vendor/Venue-Specific Proposals
- If you've selected vendors/venues (created booking requests), you'll see them listed
- Each vendor/venue has a "Generate Proposal" button next to it
- Click it to create a proposal tailored to that specific vendor/venue
- The proposal includes their services, pricing, and terms

### Option 2: Generic Event Proposal  
- Use the main "Generate AI Proposal" button at the top
- Creates a general proposal for your event
- Useful when you haven't selected specific vendors yet

## How Vendor/Venue Selections Turn into Proposals

**The Flow:**

1. **Browse & Select:** Go to marketplace, find vendors/venues you like
2. **Create Booking Request:** Request a quote or booking from them
3. **Booking Request Appears:** Shows up in your event vault under "Vendor Updates"
4. **Generate Proposal:** Click "Generate Proposal" next to the booking request
5. **AI Creates Proposal:** Uses:
   - Your event details (date, location, guests, budget)
   - Vendor/venue info (name, services, category)
   - Creates professional proposal with sections, pricing, payment schedule
6. **Review & Accept:** View the proposal, accept it if you like it
7. **Generate Contract:** Once accepted, generate a formal contract
8. **Sign Contract:** Both you and the vendor sign electronically

## All Event Tabs & Routes

**Main Event Page:** `/app/vault/[eventSlug]` - Overview with proposals

**Event Detail Tabs (all under `/app/events/[eventSlug]/`):**
- `/budget` - Budget management
- `/guests` - Guest list management  
- `/checklists` - Checklist management
- `/milestones` - Milestone tracking
- `/tasks` - Task management
- `/seating` - Seating chart
- `/settings` - Event settings
- `/proposals/new` - Manual proposal creation (currently guides to AI generation)

**Proposal & Contract Pages:**
- `/proposals/[id]` - View a specific proposal
- `/contracts/[id]` - View and sign a contract

## Important Notes

- **Old routes redirect:** `/event-vault/...` automatically redirects to `/app/vault/...`
- **All navigation updated:** Sidebar, footer, and headers now point to `/app/vault`
- **Proposal generation works:** Both with and without vendor/venue selections
- **Contracts work:** Generate from accepted proposals, sign electronically

## Testing the Flow

1. Go to `/events/new` and create an event
2. You should land on `/app/vault/[your-event-slug]`
3. In the Proposals section, you'll see:
   - "Generate AI Proposal" button (for generic proposal)
   - List of booking requests (if any) with "Generate Proposal" buttons
4. Click "Generate AI Proposal" or a vendor-specific button
5. You'll be redirected to `/proposals/[id]` to view the generated proposal
6. The proposal should have:
   - Professional title and summary
   - Multiple sections (Introduction, Scope of Services, etc.)
   - Pricing breakdown with line items
   - Payment schedule with milestones
7. Accept the proposal, then generate a contract
8. View and sign the contract

