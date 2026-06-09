import { PrismaClient, Role, OrgRole, OrgType, TaskStatus, TaskPriority, BudgetCategory, EventType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const users: Array<{ email: string; name: string; role: Role; password: string }> = [
  { email: "diy@example.com", name: "DIY Planner", role: "DIY_PLANNER", password: "password" },
  { email: "pro@example.com", name: "Pro Planner", role: "PRO_PLANNER", password: "password" },
  { email: "vendor@example.com", name: "Vendor", role: "VENDOR", password: "password" },
  { email: "venue@example.com", name: "Venue", role: "VENUE", password: "password" },
  { email: "client@example.com", name: "Client", role: "CLIENT", password: "password" },
  { email: "admin@example.com", name: "Admin", role: "ADMIN", password: "password" },
  { email: "admin@onehub.local", name: "OneHub Admin", role: "ADMIN", password: "password" },
];

async function main() {
  // Users
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      create: { email: u.email, name: u.name, role: u.role, password: hash },
      update: { name: u.name, role: u.role, password: hash },
    });
  }

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@example.com" } });
  const pro = await prisma.user.findUniqueOrThrow({ where: { email: "pro@example.com" } });
  const vendor = await prisma.user.findUniqueOrThrow({ where: { email: "vendor@example.com" } });
  const venue = await prisma.user.findUniqueOrThrow({ where: { email: "venue@example.com" } });

  // Orgs
  const plannerAgency = await prisma.organization.upsert({
    where: { slug: "planner-agency" },
    create: { name: "Planner Agency", slug: "planner-agency", type: "PLANNER", ownerId: pro.id, members: { create: [{ userId: pro.id, role: "OWNER" }] }, settings: { create: {} } },
    update: {},
  });
  const vendorCo = await prisma.organization.upsert({
    where: { slug: "vendor-co" },
    create: { name: "Vendor Co.", slug: "vendor-co", type: "VENDOR", ownerId: vendor.id, members: { create: [{ userId: vendor.id, role: "OWNER" }] }, settings: { create: {} } },
    update: {},
  });
  const venueLlc = await prisma.organization.upsert({
    where: { slug: "venue-llc" },
    create: { name: "Venue LLC", slug: "venue-llc", type: "VENUE", ownerId: venue.id, members: { create: [{ userId: venue.id, role: "OWNER" }] }, settings: { create: {} } },
    update: {},
  });

  // Members
  await prisma.membership.upsert({ where: { userId_orgId: { userId: admin.id, orgId: plannerAgency.id } }, create: { userId: admin.id, orgId: plannerAgency.id, role: "ADMIN" }, update: {} });

  // Invites
  await prisma.invite.createMany({ data: [
    { orgId: plannerAgency.id, email: "client2@example.com", role: "MEMBER", token: "tok-client2", expiresAt: new Date(Date.now() + 7*24*60*60*1000) },
    { orgId: plannerAgency.id, email: "assistant@example.com", role: "MEMBER", token: "tok-assistant", expiresAt: new Date(Date.now() + 7*24*60*60*1000) },
  ], skipDuplicates: true });

  // Flags
  await prisma.featureFlag.createMany({ data: [
    { key: "beta.eventWizard", enabled: false },
    { key: "beta.marketplace", enabled: false },
    { key: "ai.proposals", enabled: false },
  ], skipDuplicates: true });

  // Checklist Templates
  const weddingTemplate = await prisma.checklistTemplate.upsert({
    where: { id: "seed-wedding" },
    create: { id: "seed-wedding", title: "Wedding", type: "WEDDING", items: [
      { title: "Book venue", rel: -180 },
      { title: "Secure caterer", rel: -150 },
      { title: "Photographer", rel: -120 },
      { title: "Invitations", rel: -90 },
      { title: "Seating plan", rel: -21 },
      { title: "Rehearsal", rel: -2 },
      { title: "Day-of run sheet", rel: 0 },
    ] },
    update: {},
  });
  await prisma.checklistTemplate.upsert({ where: { id: "seed-gala" }, create: { id: "seed-gala", title: "Corporate Gala", type: "CORPORATE_GALA", items: [] }, update: {} });
  await prisma.checklistTemplate.upsert({ where: { id: "seed-fundraiser" }, create: { id: "seed-fundraiser", title: "Fundraiser", type: "FUNDRAISER", items: [] }, update: {} });

  // Sample Event for plannerAgency
  const now = new Date();
  const in30 = new Date(now.getTime() + 30*24*60*60*1000);
  const ev = await prisma.event.upsert({
    where: { slug: "agency-sample-event" },
    create: { orgId: plannerAgency.id, createdById: pro.id, name: "Sample Wedding", slug: "agency-sample-event", type: "WEDDING", startAt: in30, endAt: new Date(in30.getTime() + 6*60*60*1000), budgetCents: 0 },
    update: {},
  });

  // DEMO EVENT: Stable slug for investor demos
  const demoEvent = await prisma.event.upsert({
    where: { slug: "demo-wedding" },
    create: {
      orgId: plannerAgency.id,
      createdById: pro.id,
      name: "Demo Wedding Event",
      slug: "demo-wedding",
      type: "WEDDING",
      startAt: new Date(now.getTime() + 90*24*60*60*1000), // 90 days out
      endAt: new Date(now.getTime() + 90*24*60*60*1000 + 8*60*60*1000),
      venueCity: "Chicago",
      venueState: "IL",
      venueCountry: "US",
      guestTarget: 150,
      description: "A beautiful wedding celebration with family and friends",
      objective: "Create an unforgettable wedding experience",
      budgetRaw: "$50,000 - $75,000",
      budgetMin: 5000000, // $50,000 in cents
      budgetMax: 7500000, // $75,000 in cents
      budgetCurrency: "USD",
      budgetCents: 6000000, // $60,000 in cents
    },
    update: {},
  });
  await prisma.milestone.createMany({ data: [
    { eventId: ev.id, title: "90 days out", dueAt: new Date(in30.getTime() - 90*24*60*60*1000), order: 0 },
    { eventId: ev.id, title: "30 days out", dueAt: new Date(in30.getTime() - 30*24*60*60*1000), order: 1 },
    { eventId: ev.id, title: "Day-of", dueAt: in30, order: 2 },
  ], skipDuplicates: true });
  await prisma.task.createMany({ data: [
    { eventId: ev.id, title: "Confirm venue", status: "TODO" },
    { eventId: ev.id, title: "Send invitations", status: "IN_PROGRESS" },
    { eventId: ev.id, title: "Arrange photographer", status: "BLOCKED" },
  ] });
  await prisma.budgetLine.createMany({ data: [
    { eventId: ev.id, category: "VENUE", label: "Hall", plannedCents: 500000, actualCents: 200000 },
    { eventId: ev.id, category: "CATERING", label: "Dinner", plannedCents: 300000, actualCents: 0 },
  ] });

  // Wave 4: Marketplace listings
  const venue1 = await prisma.listing.upsert({
    where: { slug: "grand-ballroom-chicago" },
    update: {},
    create: {
      orgId: venueLlc.id,
      slug: "grand-ballroom-chicago",
      title: "Grand Ballroom Chicago",
      type: "VENUE",
      category: "VENUE_SPACE",
      description: "Elegant ballroom in downtown Chicago",
      city: "Chicago",
      state: "IL",
      country: "US",
      minGuests: 50,
      maxGuests: 500,
      priceTier: 4,
      ratingAvg: 4.5,
      ratingCount: 12,
      tags: { create: [{ value: "ballroom" }, { value: "downtown" }, { value: "elegant" }] },
    },
  });
  const venue2 = await prisma.listing.upsert({
    where: { slug: "lakeside-venue-seattle" },
    update: {},
    create: {
      orgId: venueLlc.id,
      slug: "lakeside-venue-seattle",
      title: "Lakeside Venue Seattle",
      type: "VENUE",
      category: "VENUE_SPACE",
      city: "Seattle",
      state: "WA",
      minGuests: 20,
      maxGuests: 150,
      priceTier: 3,
      ratingAvg: 4.2,
      ratingCount: 8,
    },
  });
  const caterer = await prisma.listing.upsert({
    where: { slug: "premium-catering-co" },
    update: {},
    create: {
      orgId: vendorCo.id,
      slug: "premium-catering-co",
      title: "Premium Catering Co.",
      type: "VENDOR",
      category: "CATERING",
      description: "Gourmet catering for all occasions",
      city: "Chicago",
      state: "IL",
      priceTier: 3,
      ratingAvg: 4.7,
      ratingCount: 15,
      tags: { create: [{ value: "gourmet" }, { value: "vegetarian-options" }] },
    },
  });

  // DEMO LISTINGS: Additional verified vendors/venues for demo event (matching Chicago, IL)
  const demoPhotographer = await prisma.listing.upsert({
    where: { slug: "demo-elite-photography" },
    create: {
      orgId: vendorCo.id,
      slug: "demo-elite-photography",
      title: "Elite Photography Studio",
      type: "VENDOR",
      category: "PHOTO_VIDEO",
      description: "Professional wedding photography and videography services",
      city: "Chicago",
      state: "IL",
      priceTier: 4,
      ratingAvg: 4.8,
      ratingCount: 25,
      website: "https://example.com/elite-photography",
      tags: { create: [{ value: "wedding" }, { value: "professional" }] },
    },
    update: {},
  });

  const demoFlorist = await prisma.listing.upsert({
    where: { slug: "demo-elegant-florals" },
    create: {
      orgId: vendorCo.id,
      slug: "demo-elegant-florals",
      title: "Elegant Floral Design",
      type: "VENDOR",
      category: "DECOR_FLORAL",
      description: "Luxury floral arrangements and event decor",
      city: "Chicago",
      state: "IL",
      priceTier: 3,
      ratingAvg: 4.6,
      ratingCount: 18,
      website: "https://example.com/elegant-florals",
      tags: { create: [{ value: "luxury" }, { value: "custom" }] },
    },
    update: {},
  });

  const demoEntertainment = await prisma.listing.upsert({
    where: { slug: "demo-premier-entertainment" },
    create: {
      orgId: vendorCo.id,
      slug: "demo-premier-entertainment",
      title: "Premier Entertainment Group",
      type: "VENDOR",
      category: "ENTERTAINMENT",
      description: "Live music, DJ services, and entertainment coordination",
      city: "Chicago",
      state: "IL",
      priceTier: 3,
      ratingAvg: 4.5,
      ratingCount: 12,
      website: "https://example.com/premier-entertainment",
      tags: { create: [{ value: "dj" }, { value: "live-music" }] },
    },
    update: {},
  });

  // Ensure demo venue exists (reuse venue1 or create new)
  const demoVenue = await prisma.listing.upsert({
    where: { slug: "demo-grand-ballroom-chicago" },
    create: {
      orgId: venueLlc.id,
      slug: "demo-grand-ballroom-chicago",
      title: "Grand Ballroom Chicago",
      type: "VENUE",
      category: "VENUE_SPACE",
      description: "Elegant ballroom perfect for weddings and special events",
      city: "Chicago",
      state: "IL",
      country: "US",
      minGuests: 50,
      maxGuests: 300,
      priceTier: 4,
      ratingAvg: 4.7,
      ratingCount: 32,
      website: "https://example.com/grand-ballroom",
      tags: { create: [{ value: "ballroom" }, { value: "elegant" }, { value: "downtown" }] },
    },
    update: {},
  });
  await prisma.availabilitySlot.createMany({
    data: Array.from({ length: 30 }).map((_, i) => ({
      listingId: venue1.id,
      startAt: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
      status: i % 3 === 0 ? "BOOKED" : "AVAILABLE",
    })),
  });
  await prisma.bookingRequest.createMany({
    data: [
      { orgId: plannerAgency.id, eventId: ev.id, listingId: venue1.id, contactName: "Jane Planner", contactEmail: "pro@example.com", startAt: in30, endAt: new Date(in30.getTime() + 8 * 60 * 60 * 1000), guests: 200, status: "QUOTED", quoteCents: 500000 },
      { orgId: plannerAgency.id, eventId: ev.id, listingId: caterer.id, contactName: "Jane Planner", contactEmail: "pro@example.com", startAt: in30, endAt: new Date(in30.getTime() + 8 * 60 * 60 * 1000), guests: 200, status: "PENDING" },
    ],
  });
  await prisma.review.createMany({
    data: [
      { authorId: pro.id, listingId: venue1.id, rating: 5, title: "Beautiful venue", body: "Perfect for our wedding" },
      { authorId: admin.id, listingId: venue1.id, rating: 4, title: "Great location", body: "Central and accessible" },
      { authorId: pro.id, listingId: caterer.id, rating: 5, title: "Excellent food", body: "Delicious menu options" },
    ],
  });
  const reviewsAvg = await prisma.review.aggregate({ where: { listingId: venue1.id }, _avg: { rating: true }, _count: true });
  await prisma.listing.update({ where: { id: venue1.id }, data: { ratingAvg: reviewsAvg._avg.rating ?? 0, ratingCount: reviewsAvg._count } });

  // Wave 5: Proposals, Contracts, Payments, Disputes, Threads
  const proposal1 = await prisma.proposal.create({
    data: {
      orgId: plannerAgency.id,
      eventId: ev.id,
      listingId: venue1.id,
      title: "Wedding Venue Proposal",
      summary: "Full service wedding venue package",
      status: "ACCEPTED",
      currency: "USD",
      subtotalCents: 500000,
      totalCents: 500000,
      lineItems: {
        create: [
          { label: "Venue Rental", qty: 1, unitPriceCents: 300000, totalCents: 300000 },
          { label: "Catering (200 guests)", qty: 200, unit: "guest", unitPriceCents: 1000, totalCents: 200000 },
        ],
      },
      milestones: {
        create: [
          { title: "Deposit", dueType: "DATE_ABSOLUTE", dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), amountCents: 150000, status: "PAID" },
          { title: "Final Payment", dueType: "OFFSET_FROM_EVENT_START", dueOffsetDays: -7, amountCents: 350000 },
        ],
      },
    },
  });
  const contract1 = await prisma.contract.create({
    data: {
      proposalId: proposal1.id,
      orgId: plannerAgency.id,
      eventId: ev.id,
      title: "Service Agreement - Wedding Venue",
      bodyMd: "Contract terms...",
      signatures: {
        create: [
          { signerName: "Jane Planner", signerEmail: "pro@example.com", signedAt: new Date() },
          { signerName: "Venue Manager", signerEmail: "venue@example.com" },
        ],
      },
    },
  });
  await prisma.escrowAccount.create({
    data: {
      orgId: plannerAgency.id,
      eventId: ev.id,
      proposalId: proposal1.id,
      status: "FUNDED",
      balanceCents: 150000,
      currency: "USD",
    },
  });
  await prisma.dispute.create({
    data: {
      orgId: plannerAgency.id,
      eventId: ev.id,
      proposalId: proposal1.id,
      actorId: pro.id,
      actorRole: pro.role,
      bookingClassification: "PLANNER_MEDIATED",
      feeProfileSnapshot: {
        source: "seed",
        currency: "USD",
        platformFeeBps: 1000,
      },
      title: "Venue availability issue",
      body: "Requesting resolution for date conflict",
      disputeReason: "Provider date conflict requires manual resolution",
      status: "OPEN",
    },
  });
  const thread1 = await prisma.thread.create({
    data: {
      orgId: plannerAgency.id,
      eventId: ev.id,
      proposalId: proposal1.id,
      subject: "Proposal Discussion",
      participants: {
        create: [
          { email: "pro@example.com", userId: pro.id },
          { email: "venue@example.com" },
        ],
      },
      messages: {
        create: [
          { bodyMd: "Thank you for the proposal!", senderId: pro.id },
          { bodyMd: "We're excited to work with you." },
        ],
      },
    },
  });

  // Wave 6: Guests & Seating
  const guestList1 = await prisma.guestList.upsert({
    where: { eventId: ev.id },
    update: {},
    create: {
      eventId: ev.id,
      title: "Wedding Guests",
      invited: 30,
      rsvped: 18,
      groups: {
        create: [
          { name: "Bride's Family" },
          { name: "Groom's Family" },
          { name: "Friends" },
        ],
      },
    },
  });
  const groups = await prisma.guestGroup.findMany({ where: { guestListId: guestList1.id } });
  const group1 = groups.find((g) => g.name === "Bride's Family");
  const group2 = groups.find((g) => g.name === "Groom's Family");
  const group3 = groups.find((g) => g.name === "Friends");
  const guestTemplates = [
    { firstName: "Alice", lastName: "Smith", group: group1, status: "ACCEPTED" as const },
    { firstName: "Bob", lastName: "Smith", group: group1, status: "ACCEPTED" as const },
    { firstName: "Carol", lastName: "Smith", group: group1, status: "PENDING" as const },
    { firstName: "David", lastName: "Jones", group: group2, status: "ACCEPTED" as const },
    { firstName: "Eve", lastName: "Jones", group: group2, status: "ACCEPTED" as const },
    { firstName: "Frank", lastName: "Jones", group: group2, status: "DECLINED" as const },
    { firstName: "Grace", lastName: "Brown", group: group3, status: "ACCEPTED" as const, plusOnes: 1 },
    { firstName: "Henry", lastName: "Brown", group: group3, status: "ACCEPTED" as const },
  ];
  for (let i = 0; i < 30; i++) {
    const template = guestTemplates[i % guestTemplates.length]!;
    await prisma.guest.create({
      data: {
        guestListId: guestList1.id,
        groupId: template.group?.id,
        firstName: `${template.firstName} ${i}`,
        lastName: template.lastName,
        email: `guest${i}@example.com`,
        status: template.status,
        plusOnes: template.plusOnes ?? 0,
      },
    });
  }

  const seatingPlan1 = await prisma.seatingPlan.upsert({
    where: { eventId: ev.id },
    update: {},
    create: {
      eventId: ev.id,
      title: "Main Floor",
      tables: {
        create: Array.from({ length: 10 }, (_, i) => ({
          name: `Table ${i + 1}`,
          capacity: 8,
          x: (i % 5) * 150,
          y: Math.floor(i / 5) * 150,
          seats: {
            create: Array.from({ length: 8 }, (_, j) => ({ number: j + 1 })),
          },
        })),
      },
    },
  });
  const tables = await prisma.table.findMany({ where: { seatingPlanId: seatingPlan1.id }, include: { seats: true } });
  const guests = await prisma.guest.findMany({ where: { guestListId: guestList1.id, status: "ACCEPTED" }, take: 20 });
  for (let i = 0; i < Math.min(guests.length, tables.length * 8); i++) {
    const table = tables[Math.floor(i / 8)]!;
    const seat = table.seats[i % 8];
    if (seat) {
      await prisma.guest.update({ where: { id: guests[i]!.id }, data: { seatId: seat.id } });
    }
  }

  // Wave 6: Calendar Events
  await prisma.calendarEvent.createMany({
    data: [
      {
        orgId: plannerAgency.id,
        eventId: ev.id,
        title: "Venue Walkthrough",
        startAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        location: "Venue Location",
      },
      {
        orgId: plannerAgency.id,
        eventId: ev.id,
        title: "Rehearsal Dinner",
        startAt: new Date(ev.startAt.getTime() - 24 * 60 * 60 * 1000),
        endAt: new Date(ev.startAt.getTime() - 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      },
      {
        orgId: plannerAgency.id,
        title: "Team Meeting",
        startAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        endAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      },
    ],
  });

  // Wave 6: Metrics
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    await prisma.metricDaily.upsert({
      where: { date },
      create: {
        date,
        orgCount: 3 + Math.floor(Math.random() * 2),
        userCount: 6 + Math.floor(Math.random() * 4),
        eventsCount: 1 + Math.floor(Math.random() * 3),
        gmvInCents: 500000 + Math.floor(Math.random() * 500000),
        payoutsCents: 300000 + Math.floor(Math.random() * 200000),
      },
      update: {},
    });
  }

  // Wave 6: Abuse Reports
  const review1 = await prisma.review.findFirst({ where: { listingId: venue1.id } });
  await prisma.abuseReport.createMany({
    data: [
      {
        reporterId: admin.id,
        targetType: "REVIEW",
        targetId: review1?.id || "unknown",
        reason: "Spam content",
        status: "OPEN",
      },
      {
        reporterId: pro.id,
        targetType: "LISTING",
        targetId: venue1.id,
        reason: "Misleading information",
        status: "OPEN",
      },
    ],
  });

  // DEMO: Pre-create shortlist items for demo event (optional - can be added via UI)
  await prisma.shortlistItem.createMany({
    data: [
      { eventId: demoEvent.id, listingId: demoVenue.id, notes: "Primary venue option" },
      { eventId: demoEvent.id, listingId: caterer.id, notes: "Preferred caterer" },
    ],
    skipDuplicates: true,
  });

  // DEMO: Create proposal with milestones for demo event (if missing)
  const existingDemoProposal = await prisma.proposal.findFirst({
    where: { eventId: demoEvent.id },
    include: { milestones: true, payouts: true },
  });

  // Calculate due dates for offset milestones
  const balancePaymentDue = new Date(demoEvent.startAt.getTime() + (-30) * 24 * 60 * 60 * 1000);
  const finalPaymentDue = new Date(demoEvent.startAt.getTime() + (-7) * 24 * 60 * 60 * 1000);

  let demoProposal;
  if (!existingDemoProposal) {
    // Create new proposal with milestones
    demoProposal = await prisma.proposal.create({
      data: {
        orgId: plannerAgency.id,
        eventId: demoEvent.id,
        listingId: demoVenue.id,
        title: "Demo Wedding Proposal",
        summary: "Complete wedding venue and catering package",
        status: "ACCEPTED",
        currency: "USD",
        subtotalCents: 5000000, // $50,000
        totalCents: 5000000,
        milestones: {
          create: [
            { 
              title: "Initial Deposit", 
              dueType: "DATE_ABSOLUTE", 
              dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), 
              amountCents: 1500000, // $15,000
              status: "PENDING" 
            },
            { 
              title: "Balance Payment", 
              dueType: "OFFSET_FROM_EVENT_START", 
              dueDate: balancePaymentDue,
              dueOffsetDays: -30,
              amountCents: 2500000, // $25,000
              status: "PENDING" 
            },
            { 
              title: "Final Payment", 
              dueType: "OFFSET_FROM_EVENT_START", 
              dueDate: finalPaymentDue,
              dueOffsetDays: -7,
              amountCents: 1000000, // $10,000
              status: "PENDING" 
            },
          ],
        },
      },
    });
  } else {
    demoProposal = existingDemoProposal;
    if (existingDemoProposal.milestones.length === 0) {
      // Proposal exists but has no milestones, add them
      await prisma.paymentMilestone.createMany({
        data: [
          { 
            proposalId: existingDemoProposal.id,
            title: "Initial Deposit", 
            dueType: "DATE_ABSOLUTE", 
            dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), 
            amountCents: 1500000,
            status: "PENDING" 
          },
          { 
            proposalId: existingDemoProposal.id,
            title: "Balance Payment", 
            dueType: "OFFSET_FROM_EVENT_START", 
            dueDate: balancePaymentDue,
            dueOffsetDays: -30,
            amountCents: 2500000,
            status: "PENDING" 
          },
          { 
            proposalId: existingDemoProposal.id,
            title: "Final Payment", 
            dueType: "OFFSET_FROM_EVENT_START", 
            dueDate: finalPaymentDue,
            dueOffsetDays: -7,
            amountCents: 1000000,
            status: "PENDING" 
          },
        ],
        skipDuplicates: true,
      });
    }
  }

  // DEMO: Create deposit lines (PaymentMilestone with deposit metadata)
  const depositMetadata = JSON.stringify({ lineType: "deposit" });
  const existingDeposits = await prisma.paymentMilestone.findMany({
    where: {
      proposalId: demoProposal.id,
      description: depositMetadata,
    },
  });

  if (existingDeposits.length === 0) {
    // Create 2-3 deposit lines
    await prisma.paymentMilestone.createMany({
      data: [
        {
          proposalId: demoProposal.id,
          title: "Deposit 1",
          description: depositMetadata,
          dueType: "DATE_ABSOLUTE",
          dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          amountCents: 2000000, // $20,000
          status: "PENDING",
        },
        {
          proposalId: demoProposal.id,
          title: "Deposit 2",
          description: depositMetadata,
          dueType: "DATE_ABSOLUTE",
          dueDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          amountCents: 1500000, // $15,000
          status: "PENDING",
        },
        {
          proposalId: demoProposal.id,
          title: "Final Deposit",
          description: depositMetadata,
          dueType: "OFFSET_FROM_EVENT_START",
          dueOffsetDays: -30,
          dueDate: new Date(demoEvent.startAt.getTime() - 30 * 24 * 60 * 60 * 1000),
          amountCents: 1500000, // $15,000
          status: "PENDING",
        },
      ],
      skipDuplicates: true,
    });
  }

  // DEMO: Create payout lines (Payout records) for verified vendors
  const existingPayouts = await prisma.payout.findMany({
    where: {
      proposalId: demoProposal.id,
      status: { not: "CANCELED" },
    },
  });

  if (existingPayouts.length === 0) {
    // Create payout lines for key vendors (venue, caterer, photographer, florist)
    const payoutData = [
      { listingId: demoVenue.id, amountCents: 2500000 }, // $25,000
      { listingId: caterer.id, amountCents: 1500000 }, // $15,000
      { listingId: demoPhotographer.id, amountCents: 800000 }, // $8,000
      { listingId: demoFlorist.id, amountCents: 600000 }, // $6,000
    ];

    await prisma.payout.createMany({
      data: payoutData.map((p) => ({
        proposalId: demoProposal.id,
        listingId: p.listingId,
        orgId: plannerAgency.id,
        amountCents: p.amountCents,
        status: "PENDING",
      })),
      skipDuplicates: true,
    });
  }

  // DEMO: Pre-seed booking requests for demo event
  await prisma.bookingRequest.createMany({
    data: [
      {
        orgId: plannerAgency.id,
        eventId: demoEvent.id,
        listingId: demoPhotographer.id,
        contactName: "Jane Planner",
        contactEmail: "pro@example.com",
        contactPhone: "(555) 123-4567",
        startAt: demoEvent.startAt,
        endAt: demoEvent.endAt,
        guests: 150,
        message: "Interested in photography services for our wedding event.",
        status: "QUOTED",
        quoteCents: 800000, // $8,000
      },
      {
        orgId: plannerAgency.id,
        eventId: demoEvent.id,
        listingId: demoFlorist.id,
        contactName: "Jane Planner",
        contactEmail: "pro@example.com",
        contactPhone: "(555) 123-4567",
        startAt: demoEvent.startAt,
        endAt: demoEvent.endAt,
        guests: 150,
        message: "Looking for floral arrangements and decor.",
        status: "PENDING",
      },
    ],
    skipDuplicates: true,
  });

  // DEMO: Pre-seed notifications for demo event
  // Fetch contract if it exists for demo proposal
  const demoContract = demoProposal
    ? await prisma.contract.findUnique({
        where: { proposalId: demoProposal.id },
        select: { id: true },
      })
    : null;

  const demoNotifications = [
    {
      userId: pro.id,
      orgId: plannerAgency.id,
      type: "PROPOSAL_CREATED",
      title: "New proposal created for Demo Wedding Event",
      body: "A proposal has been created for Elite Photography Studio",
      link: demoProposal ? `/proposals/${demoProposal.id}` : `/events/demo-wedding`,
    },
    {
      userId: pro.id,
      orgId: plannerAgency.id,
      type: "DEPOSIT_FUNDED",
      title: "Deposit funded for Demo Wedding Event",
      body: "Client deposit of $15,000 has been funded and is held in escrow",
      link: `/app/events/demo-wedding/milestones`,
    },
    {
      userId: pro.id,
      orgId: plannerAgency.id,
      type: "PAYOUT_RELEASED",
      title: "Payout released to vendor",
      body: "Payout of $8,000 has been released to Elite Photography Studio",
      link: `/app/events/demo-wedding/milestones`,
    },
    {
      userId: pro.id,
      orgId: plannerAgency.id,
      type: "CONTRACT_SIGNED",
      title: "Contract signed for Demo Wedding Event",
      body: "Contract has been fully signed by all parties",
      link: demoContract ? `/app/contracts/${demoContract.id}` : `/app/events/demo-wedding`,
    },
  ];

  await prisma.notification.createMany({
    data: demoNotifications.map((n, i) => ({
      ...n,
      read: i >= 2, // First 2 are unread, last 2 are read
      createdAt: new Date(now.getTime() - (3 - i) * 24 * 60 * 60 * 1000), // Staggered dates
    })),
    skipDuplicates: true,
  });

  // eslint-disable-next-line no-console
  console.log("Seeded users, orgs, events, listings, bookings, reviews, proposals, contracts, disputes, threads, guests, seating, calendar events, metrics, abuse reports, and notifications.");
  console.log("\n=== DEMO MODE SEED DATA ===");
  console.log("Demo Event Slug: demo-wedding");
  console.log("Demo Event Location: Chicago, IL");
  console.log("Demo Verified Listings:");
  console.log(`  - ${demoVenue.title} (VENUE_SPACE) - Chicago, IL`);
  console.log(`  - ${caterer.title} (CATERING) - Chicago, IL`);
  console.log(`  - ${demoPhotographer.title} (PHOTO_VIDEO) - Chicago, IL`);
  console.log(`  - ${demoFlorist.title} (DECOR_FLORAL) - Chicago, IL`);
  console.log(`  - ${demoEntertainment.title} (ENTERTAINMENT) - Chicago, IL`);
  console.log("\nDemo Login:");
  console.log("  Email: pro@example.com");
  console.log("  Password: password");
  console.log("  Role: PRO_PLANNER");
}

main().finally(async () => {
  await prisma.$disconnect();
});
