/**
 * AI service for generating proposals from event and vendor/venue context
 */

import { openai, isAIAvailable } from "./client";
import { isDemoMode, logDemoMode, logAI } from "@/lib/demo-mode";
import type { Prisma } from "@prisma/client";

/**
 * Context needed to generate a proposal
 */
export interface ProposalContext {
  event: {
    name: string;
    startAt: Date;
    endAt: Date;
    venueCity?: string | null;
    venueState?: string | null;
    venueCountry?: string | null;
    guestTarget?: number | null;
    description?: string | null;
    objective?: string | null;
    budgetRaw?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    budgetCurrency?: string | null;
  };
  vendor?: {
    name: string;
    category: string;
    description?: string | null;
    about?: string | null;
    city?: string | null;
    state?: string | null;
    website?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  } | null;
  venue?: {
    name: string;
    category: string;
    description?: string | null;
    about?: string | null;
    city?: string | null;
    state?: string | null;
    website?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  } | null;
  planner?: {
    name?: string | null;
    email?: string | null;
    orgName?: string | null;
  };
}

/**
 * Generated proposal structure
 */
export interface GeneratedProposal {
  title: string;
  summary: string;
  sections: {
    heading: string;
    body: string;
  }[];
  lineItems: {
    label: string;
    description?: string;
    qty: number;
    unit?: string;
    unitPriceCents: number;
  }[];
  milestones: {
    title: string;
    description?: string;
    dueType: "DATE_ABSOLUTE" | "OFFSET_FROM_EVENT_START";
    dueDate?: Date;
    dueOffsetDays?: number;
    amountCents: number;
  }[];
  totalPriceEstimate?: number;
  currency?: string;
  terms?: string;
}

/**
 * Generate a deterministic demo proposal (fallback when AI unavailable)
 */
function generateDemoProposal(ctx: ProposalContext): GeneratedProposal {
  logDemoMode("Generating deterministic demo proposal");
  
  const vendorOrVenue = ctx.vendor || ctx.venue;
  const vendorName = vendorOrVenue?.name || "Vendor";
  const vendorCategory = vendorOrVenue?.category || "Event Services";
  const vendorLocation = vendorOrVenue?.city && vendorOrVenue?.state 
    ? `${vendorOrVenue.city}, ${vendorOrVenue.state}` 
    : vendorOrVenue?.city || vendorOrVenue?.state || "";
  const eventDate = new Date(ctx.event.startAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  // Calculate realistic pricing based on event scale and category
  const guestCount = ctx.event.guestTarget || 100;
  
  // Category-specific line items
  let lineItems: Array<{ label: string; description: string; qty: number; unit: string; unitPriceCents: number }> = [];
  
  if (vendorCategory === "VENUE_SPACE") {
    const venueBase = guestCount * 80; // $80 per guest for venue
    lineItems = [
      {
        label: "Venue Rental (8 hours)",
        description: "Full access to venue space including setup and breakdown time",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(venueBase * 0.6),
      },
      {
        label: "Basic Setup & Breakdown",
        description: "Standard setup and breakdown services",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(venueBase * 0.15),
      },
      {
        label: "Security Services",
        description: "On-site security personnel for event duration",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(venueBase * 0.1),
      },
      {
        label: "Parking Access",
        description: "Guest parking availability",
        qty: guestCount,
        unit: "guest",
        unitPriceCents: Math.round(venueBase * 0.05 / guestCount),
      },
      {
        label: "Utilities & Cleaning",
        description: "Event utilities and post-event cleaning",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(venueBase * 0.1),
      },
    ];
  } else if (vendorCategory === "CATERING") {
    const cateringBase = guestCount * 60; // $60 per guest for catering
    lineItems = [
      {
        label: "Per-Person Meal Service",
        description: "Full-service meal including appetizers, main course, and dessert",
        qty: guestCount,
        unit: "guest",
        unitPriceCents: Math.round(cateringBase * 0.7 / guestCount),
      },
      {
        label: "Bar Service",
        description: "Full bar service with bartenders",
        qty: guestCount,
        unit: "guest",
        unitPriceCents: Math.round(cateringBase * 0.15 / guestCount),
      },
      {
        label: "Service Staff",
        description: "Professional waitstaff and bartenders",
        qty: Math.ceil(guestCount / 15),
        unit: "server",
        unitPriceCents: Math.round(cateringBase * 0.1 / Math.ceil(guestCount / 15)),
      },
      {
        label: "Equipment Rental",
        description: "Tables, linens, glassware, and serving equipment",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(cateringBase * 0.05),
      },
    ];
  } else if (vendorCategory === "PHOTO_VIDEO") {
    const photoBase = guestCount * 25; // $25 per guest for photography
    lineItems = [
      {
        label: "Event Photography Coverage (8 hours)",
        description: "Full event coverage including ceremony, reception, and candid moments",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(photoBase * 0.6),
      },
      {
        label: "Second Shooter",
        description: "Additional photographer for comprehensive coverage",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(photoBase * 0.2),
      },
      {
        label: "Photo Editing & Delivery",
        description: "Professional editing and digital delivery of all images",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(photoBase * 0.15),
      },
      {
        label: "Online Gallery Access",
        description: "Private online gallery for viewing and downloading images",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(photoBase * 0.05),
      },
    ];
  } else if (vendorCategory === "DECOR_FLORAL") {
    const decorBase = guestCount * 30; // $30 per guest for decor
    lineItems = [
      {
        label: "Design Consultation",
        description: "Initial design consultation and planning",
        qty: 1,
        unit: "consultation",
        unitPriceCents: Math.round(decorBase * 0.15),
      },
      {
        label: "Centerpieces & Table Decor",
        description: "Floral centerpieces and table decorations",
        qty: Math.ceil(guestCount / 8),
        unit: "table",
        unitPriceCents: Math.round(decorBase * 0.4 / Math.ceil(guestCount / 8)),
      },
      {
        label: "Ceremony Arch & Aisle Decor",
        description: "Ceremony floral arrangements and aisle decorations",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(decorBase * 0.25),
      },
      {
        label: "Delivery & Installation",
        description: "Delivery, setup, and breakdown of all floral arrangements",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(decorBase * 0.2),
      },
    ];
  } else if (vendorCategory === "ENTERTAINMENT") {
    const entertainmentBase = guestCount * 20; // $20 per guest for entertainment
    lineItems = [
      {
        label: "DJ Performance (5 hours)",
        description: "Professional DJ services including music selection and MC duties",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(entertainmentBase * 0.5),
      },
      {
        label: "Sound System & Equipment",
        description: "Professional sound system, speakers, and microphones",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(entertainmentBase * 0.25),
      },
      {
        label: "Lighting Package",
        description: "Event lighting including dance floor lighting",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(entertainmentBase * 0.15),
      },
      {
        label: "Overtime (per hour)",
        description: "Additional performance time beyond contracted hours",
        qty: 0,
        unit: "hour",
        unitPriceCents: Math.round(entertainmentBase * 0.1),
      },
    ];
  } else {
    // Generic fallback for other categories
    const basePrice = guestCount * 50;
    lineItems = [
      {
        label: `${vendorCategory} Services`,
        description: vendorOrVenue?.description || "Professional event services",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(basePrice * 0.6),
      },
      {
        label: "Setup and Coordination",
        description: "Event setup and day-of coordination",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(basePrice * 0.25),
      },
      {
        label: "Breakdown Services",
        description: "Post-event breakdown and cleanup",
        qty: 1,
        unit: "event",
        unitPriceCents: Math.round(basePrice * 0.15),
      },
    ];
  }
  
  const subtotal = lineItems.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0);
  const depositAmount = Math.round(subtotal * 0.4);
  const balanceAmount = Math.round(subtotal * 0.35);
  const finalAmount = subtotal - depositAmount - balanceAmount;
  
  const whyFitParagraph = vendorLocation 
    ? `${vendorName} is an ideal choice for ${ctx.event.name} because of our specialized expertise in ${vendorCategory}${vendorLocation ? ` and our location in ${vendorLocation}, which allows us to provide responsive, local service` : ""}. Our team brings years of experience serving events of this scale and type, ensuring that every detail is handled with professionalism and care.`
    : `${vendorName} is an ideal choice for ${ctx.event.name} because of our specialized expertise in ${vendorCategory}. Our team brings years of experience serving events of this scale and type, ensuring that every detail is handled with professionalism and care.`;
  
  return {
    title: `${vendorName} - ${vendorCategory} Proposal for ${ctx.event.name}`,
    summary: `We are pleased to present this comprehensive ${vendorCategory.toLowerCase()} proposal for ${ctx.event.name} on ${eventDate}. ${vendorName}${vendorLocation ? ` (${vendorLocation})` : ""} is committed to delivering exceptional service and ensuring your event is a memorable success.`,
    sections: [
      {
        heading: "Introduction",
        body: `Thank you for considering ${vendorName} for ${ctx.event.name}. We are excited about the opportunity to work with you and are confident that our expertise in ${vendorCategory} will contribute to the success of your event.\n\n${whyFitParagraph}\n\nThis proposal outlines our services, pricing, and terms. We look forward to discussing how we can make your vision a reality.`,
      },
      {
        heading: "Scope of Services",
        body: vendorCategory === "VENUE_SPACE" 
          ? `Our comprehensive venue rental package includes:\n\n- Full access to venue space for ${guestCount} guests\n- Setup and breakdown services\n- Security personnel for event duration\n- Guest parking availability\n- Utilities and post-event cleaning\n- Venue coordinator for day-of support\n\nWe will work closely with you to ensure every detail is executed flawlessly.`
          : vendorCategory === "CATERING"
          ? `Our comprehensive catering services include:\n\n- Full-service meal for ${guestCount} guests (appetizers, main course, dessert)\n- Professional bar service with experienced bartenders\n- Service staff (${Math.ceil(guestCount / 15)} servers)\n- Tables, linens, glassware, and serving equipment\n- Dietary accommodations (vegetarian, vegan, gluten-free options)\n- Setup, service, and breakdown\n\nWe will work closely with you to ensure every detail is executed flawlessly.`
          : vendorCategory === "PHOTO_VIDEO"
          ? `Our comprehensive photography services include:\n\n- Full event coverage (8 hours) including ceremony and reception\n- Second shooter for comprehensive coverage\n- Professional editing and digital delivery of all images\n- Private online gallery for viewing and downloading\n- Candid moments and formal portraits\n- High-resolution digital files\n\nWe will work closely with you to ensure every detail is captured beautifully.`
          : vendorCategory === "DECOR_FLORAL"
          ? `Our comprehensive decor and floral services include:\n\n- Design consultation and planning\n- Floral centerpieces and table decorations (${Math.ceil(guestCount / 8)} tables)\n- Ceremony arch and aisle decorations\n- Delivery, installation, and breakdown\n- Custom design tailored to your event theme\n- Premium floral selections\n\nWe will work closely with you to ensure every detail is executed flawlessly.`
          : vendorCategory === "ENTERTAINMENT"
          ? `Our comprehensive entertainment services include:\n\n- Professional DJ performance (5 hours)\n- Professional sound system, speakers, and microphones\n- Event lighting including dance floor lighting\n- Music selection and MC duties\n- Optional overtime availability\n- Pre-event consultation for music preferences\n\nWe will work closely with you to ensure every detail is executed flawlessly.`
          : `Our comprehensive service package includes:\n\n- Full ${vendorCategory.toLowerCase()} services tailored to your event\n- Day-of event management and support\n- Setup and breakdown services\n- Post-event follow-up and coordination\n\nWe will work closely with you to ensure every detail is executed flawlessly.`,
      },
      {
        heading: "Event Details",
        body: `Event: ${ctx.event.name}\nDate: ${eventDate}\nExpected Guests: ${guestCount}\nLocation: ${ctx.event.venueCity || "TBD"}${ctx.event.venueState ? `, ${ctx.event.venueState}` : ""}\n\nWe understand the importance of this event and are committed to delivering exceptional service that exceeds your expectations.`,
      },
      {
        heading: "Service Approach",
        body: `At ${vendorName}, we pride ourselves on our attention to detail, professionalism, and commitment to excellence. Our team brings years of experience in ${vendorCategory} and will work tirelessly to ensure your event is executed flawlessly.\n\nWe believe in transparent communication, proactive problem-solving, and building lasting relationships with our clients.`,
      },
      {
        heading: "Pricing Overview",
        body: `Our pricing structure is designed to be transparent and comprehensive. The total investment for your event is detailed below, with payment milestones that align with industry standards.`,
      },
      {
        heading: "Terms & Conditions",
        body: `**Payment Terms:**\n- Initial deposit (40%) due upon acceptance\n- Balance payment (35%) due 14 days before event\n- Final payment (25%) due on event date\n\n**Cancellation Policy:**\n- 90+ days: Full refund minus deposit\n- 30-90 days: 50% refund\n- Less than 30 days: No refund\n\n**Rescheduling:**\nRescheduling requests must be made at least 30 days in advance and are subject to availability.\n\n**Liability:**\n${vendorName} maintains appropriate insurance coverage. Client is responsible for venue access and any venue-specific requirements.`,
      },
    ],
    lineItems,
    milestones: [
      {
        title: "Initial Deposit",
        description: "Due upon acceptance of this proposal",
        dueType: "DATE_ABSOLUTE",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        amountCents: depositAmount,
      },
      {
        title: "Balance Payment",
        description: "Due 14 days before event",
        dueType: "OFFSET_FROM_EVENT_START",
        dueOffsetDays: -14,
        amountCents: balanceAmount,
      },
      {
        title: "Final Payment",
        description: "Due on event date",
        dueType: "OFFSET_FROM_EVENT_START",
        dueOffsetDays: 0,
        amountCents: finalAmount,
      },
    ],
    totalPriceEstimate: subtotal,
    currency: "USD",
    terms: "All services subject to final confirmation. Additional services may be added with written approval. Force majeure provisions apply.",
  };
}

/**
 * Generate a proposal using AI
 */
export async function generateProposalFromContext(
  ctx: ProposalContext
): Promise<GeneratedProposal> {
  // Demo mode: use deterministic fallback
  if (isDemoMode()) {
    return generateDemoProposal(ctx);
  }

  // Check AI availability - if unavailable, fall back to demo mode
  if (!isAIAvailable() || !openai) {
    logDemoMode("AI unavailable, using demo fallback");
    return generateDemoProposal(ctx);
  }

  const vendorOrVenue = ctx.vendor || ctx.venue;
  // Allow generating generic proposals without vendor/venue (will use generic vendor info)
  const vendorName = vendorOrVenue?.name || "Vendor";
  const vendorCategory = vendorOrVenue?.category || "Event Services";

  // Format event date/time
  const eventDate = new Date(ctx.event.startAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const eventTime = new Date(ctx.event.startAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const eventEndTime = new Date(ctx.event.endAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // Build location string
  const locationParts = [
    ctx.event.venueCity,
    ctx.event.venueState,
    ctx.event.venueCountry,
  ].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : "TBD";

  // Build budget info
  const budgetInfo = ctx.event.budgetRaw
    ? ctx.event.budgetRaw
    : ctx.event.budgetMin && ctx.event.budgetMax
    ? `$${Math.round(ctx.event.budgetMin / 100)} - $${Math.round(ctx.event.budgetMax / 100)}`
    : ctx.event.budgetMin
    ? `$${Math.round(ctx.event.budgetMin / 100)}`
    : "Budget TBD";

  const prompt = `You are an experienced event planner who writes professional, client-facing proposals for high-end events. Your proposals are polished, comprehensive, and demonstrate attention to detail that builds trust with clients.

EVENT DETAILS:
- Event Name: ${ctx.event.name}
- Date: ${eventDate}
- Time: ${eventTime} - ${eventEndTime}
- Location: ${location}
- Expected Guest Count: ${ctx.event.guestTarget || "TBD"}
- Budget Range: ${budgetInfo}
${ctx.event.description ? `- Event Description: ${ctx.event.description}` : ""}
${ctx.event.objective ? `- Event Objective: ${ctx.event.objective}` : ""}

VENDOR/VENUE INFORMATION:
- Name: ${vendorName}
- Category: ${vendorCategory}
${vendorOrVenue?.description ? `- Description: ${vendorOrVenue.description}` : ""}
${vendorOrVenue?.about ? `- About: ${vendorOrVenue.about}` : ""}
${vendorOrVenue?.city ? `- City: ${vendorOrVenue.city}` : ""}
${vendorOrVenue?.state ? `- State: ${vendorOrVenue.state}` : ""}
${vendorOrVenue?.website ? `- Website: ${vendorOrVenue.website}` : ""}
${vendorOrVenue?.contactEmail ? `- Contact Email: ${vendorOrVenue.contactEmail}` : ""}
${vendorOrVenue?.contactPhone ? `- Contact Phone: ${vendorOrVenue.contactPhone}` : ""}

PLANNER/ORGANIZATION INFORMATION:
${ctx.planner?.name ? `- Planner Name: ${ctx.planner.name}` : ""}
${ctx.planner?.orgName ? `- Organization: ${ctx.planner.orgName}` : ""}
${ctx.planner?.email ? `- Contact Email: ${ctx.planner.email}` : ""}

TASK: Generate a professional, polished proposal that a real event planner would send to a client. The proposal should:

1. **Title**: Be specific and professional (e.g., "Event Services Proposal for [Event Name]" or "Catering Proposal - [Event Name]")

2. **Summary**: A compelling 2-3 sentence overview that highlights the value proposition and sets a professional tone

3. **Sections**: Include well-structured sections with clear headings and detailed body text. Required sections:
   - **Introduction**: Welcome the client and express enthusiasm for their event. Include a one-paragraph "Why this vendor is a good fit" that references the vendor's name, category, location (if relevant), and how their expertise aligns with the event needs.
   - **Scope of Services**: Detailed description tailored to the vendor category (${vendorCategory}). For VENUE_SPACE: include venue capacity, amenities, setup/breakdown, access times. For CATERING: include menu options, dietary accommodations, service style, staff count. For PHOTO_VIDEO: include coverage hours, deliverables, editing timeline. For DECOR_FLORAL: include design consultation, installation, breakdown. For ENTERTAINMENT: include performance duration, equipment, sound requirements. For other categories, tailor appropriately. Include specific deliverables, timelines, and any special considerations.
   - **Event Details**: Comprehensive overview of the event (date, time, location, guest count, special requirements)
   - **Service Approach**: How ${vendorName} will approach this event, what makes them unique (reference their category expertise, location if relevant, website/credentials if available), and their commitment to excellence
   - **Pricing Overview**: Brief introduction to the pricing structure before the detailed breakdown
   - **Terms & Conditions**: Professional terms covering cancellation policy, rescheduling, payment terms, liability, insurance requirements, overtime policies (if applicable), deliverables timeline, and any vendor-specific policies

4. **Line Items**: Create 5-8 realistic, detailed line items tailored specifically to the vendor category (${vendorCategory}):
   - For VENUE_SPACE: Venue rental (hours/event), setup/breakdown, security, parking, utilities, cleaning fees
   - For CATERING: Per-person meal pricing, bar service, staff (servers/bartenders), equipment rental, dietary accommodations
   - For PHOTO_VIDEO: Coverage hours, second shooter, editing/delivery, raw footage, prints/albums, drone footage (if applicable)
   - For DECOR_FLORAL: Design consultation, centerpieces, ceremony arch, aisle decorations, delivery/installation, breakdown
   - For ENTERTAINMENT: Performance duration, DJ/band fees, sound system, lighting, MC services, overtime rates
   - For other categories: Tailor line items to industry standards for that service type
   Base pricing on event scale (${ctx.event.guestTarget || "standard"} guests), budget range (${budgetInfo}), and realistic industry rates. Each line item should have a clear label, optional description, quantity, unit (if applicable), and unit price in cents.

5. **Payment Milestones**: Create a standard payment schedule:
   - Initial deposit (typically 30-50% of total, due upon acceptance)
   - Balance payment (typically 30-50%, due 2-4 weeks before event)
   - Final payment (remaining balance, due on or before event date)
   Use OFFSET_FROM_EVENT_START with negative days for milestones before the event.

6. **Terms**: Include any additional terms or notes that are important but don't fit in the main sections.

TONE: Professional, warm, confident, and detail-oriented. Write as if you're a seasoned event professional who understands both the business and creative aspects of event planning.

Return your response as STRICT JSON matching this exact structure (no markdown, no code blocks, just pure JSON):
{
  "title": "string",
  "summary": "string",
  "sections": [
    {
      "heading": "string",
      "body": "string (can be multiple paragraphs, use \\n for line breaks)"
    }
  ],
  "lineItems": [
    {
      "label": "string",
      "description": "string (optional)",
      "qty": number,
      "unit": "string (optional, e.g., 'hour', 'person', 'item', 'table')",
      "unitPriceCents": number
    }
  ],
  "milestones": [
    {
      "title": "string",
      "description": "string (optional)",
      "dueType": "OFFSET_FROM_EVENT_START",
      "dueOffsetDays": number (negative for days before event, e.g., -14 = 14 days before),
      "amountCents": number
    }
  ],
  "totalPriceEstimate": number (in cents, sum of all line items),
  "currency": "USD",
  "terms": "string (optional)"
}

IMPORTANT: 
- All prices must be realistic for the vendor category (${vendorCategory}) and event scale (${ctx.event.guestTarget || "standard"} guests)
- Use proper event planning terminology specific to ${vendorCategory}
- Make the proposal feel personalized to this specific event and vendor (${vendorName})
- Reference the vendor's location (${vendorOrVenue?.city || ""}${vendorOrVenue?.state ? `, ${vendorOrVenue.state}` : ""}) if relevant
- Include a "Why this vendor is a good fit" paragraph that demonstrates understanding of the vendor's expertise and the event's needs
- Ensure all sections are well-written and professional
- The proposal must NOT be generic - it must clearly reference ${vendorName} and their specific category/services`;

  try {
    logAI("Generating proposal with OpenAI...");
    logAI("Model:", process.env.OPENAI_MODEL || "gpt-4o-mini");
    logAI("Event:", ctx.event.name);
    logAI("Vendor/Venue:", ctx.vendor?.name || ctx.venue?.name || "None");
    
    const completion = await openai!.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
      {
        role: "system",
        content:
          "You are an expert event planner with years of experience writing professional, client-facing proposals for high-end events. You understand the nuances of event planning, vendor relationships, and client communication. Always return valid JSON that matches the exact structure requested. Never include markdown code blocks or explanations - only pure JSON.",
      },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error("[AI] OpenAI returned empty content");
      throw new Error("AI did not return any content");
    }

    console.log("[AI] Raw AI response length:", content.length);
    console.log("[AI] Raw AI response preview:", content.substring(0, 200));

    let parsed: GeneratedProposal;
    try {
      parsed = JSON.parse(content) as GeneratedProposal;
    } catch (parseError) {
      console.error("[AI] Failed to parse JSON response:", parseError);
      console.error("[AI] Response content:", content);
      throw new Error(`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
    }

    // Validate and normalize the response
    if (!parsed.title || !parsed.summary) {
      console.error("[AI] Missing required fields:", { hasTitle: !!parsed.title, hasSummary: !!parsed.summary });
      throw new Error("AI response missing required fields (title or summary)");
    }

    // Ensure lineItems and milestones are arrays
    parsed.lineItems = parsed.lineItems || [];
    parsed.milestones = parsed.milestones || [];
    parsed.sections = parsed.sections || [];
    parsed.currency = parsed.currency || "USD";

    logAI("Proposal generated successfully:", {
      title: parsed.title,
      sectionsCount: parsed.sections.length,
      lineItemsCount: parsed.lineItems.length,
      milestonesCount: parsed.milestones.length,
    });

    return parsed;
  } catch (error) {
    logAI("Error generating proposal:", error);
    if (error instanceof Error) {
      logAI("Error stack:", error.stack);
      // Fallback to demo mode on error
      logDemoMode("AI error, falling back to demo proposal");
      return generateDemoProposal(ctx);
    }
    // Fallback to demo mode on unknown error
    logDemoMode("Unknown AI error, falling back to demo proposal");
    return generateDemoProposal(ctx);
  }
}

