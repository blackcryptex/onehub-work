/**
 * AI service for generating contracts from approved proposals
 */

import { openai, isAIAvailable } from "./client";
import { isDemoMode, logDemoMode, logAI } from "@/lib/demo-mode";

/**
 * Context needed to generate a contract from a proposal
 */
export interface ContractContext {
  proposal: {
    title: string;
    summary?: string | null;
    terms?: string | null;
    lineItems: Array<{
      label: string;
      description?: string | null;
      qty: number;
      unit?: string | null;
      unitPriceCents: number;
      totalCents: number;
    }>;
    milestones: Array<{
      title: string;
      description?: string | null;
      dueType: string;
      dueDate?: Date | null;
      dueOffsetDays?: number | null;
      amountCents: number;
    }>;
    totalCents: number;
    currency: string;
  };
  event: {
    name: string;
    startAt: Date;
    endAt: Date;
    venueCity?: string | null;
    venueState?: string | null;
    venueCountry?: string | null;
    guestTarget?: number | null;
  };
  vendor?: {
    name: string;
    category: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
  } | null;
  venue?: {
    name: string;
    category: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
  } | null;
  planner: {
    name?: string | null;
    email?: string | null;
    orgName?: string | null;
  };
  vendorOrg?: {
    name: string;
    legalEntity?: string | null;
  } | null;
}

/**
 * Generated contract structure
 */
export interface GeneratedContract {
  title: string;
  bodyMd: string; // Full contract text in markdown format
}

/**
 * Generate a deterministic demo contract (fallback when AI unavailable)
 */
function generateDemoContract(ctx: ContractContext): GeneratedContract {
  logDemoMode("Generating deterministic demo contract");
  
  const vendorOrVenue = ctx.vendor || ctx.venue;
  if (!vendorOrVenue) {
    throw new Error("Either vendor or venue must be provided");
  }
  
  const eventDate = new Date(ctx.event.startAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const locationParts = [
    ctx.event.venueCity,
    ctx.event.venueState,
    ctx.event.venueCountry,
  ].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : "TBD";
  const governingLawState = ctx.event.venueState || "New York";
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const lineItemsText = ctx.proposal.lineItems
    .map((item) => `- ${item.label}${item.description ? `: ${item.description}` : ""} (${item.qty} ${item.unit || "unit"} @ $${(item.unitPriceCents / 100).toFixed(2)} = $${(item.totalCents / 100).toFixed(2)})`)
    .join("\n");
  
  const milestonesText = ctx.proposal.milestones
    .map((m) => {
      let dueText = "";
      if (m.dueDate) {
        dueText = ` (Due: ${new Date(m.dueDate).toLocaleDateString()})`;
      } else if (m.dueOffsetDays !== null && m.dueOffsetDays !== undefined) {
        dueText = ` (Due: ${Math.abs(m.dueOffsetDays)} days ${m.dueOffsetDays < 0 ? "before" : "after"} event)`;
      }
      return `- ${m.title}${m.description ? `: ${m.description}` : ""} - $${(m.amountCents / 100).toFixed(2)}${dueText}`;
    })
    .join("\n");
  
  const bodyMd = `# ${ctx.proposal.title || "Event Services Agreement"}

**Date of Execution:** ${today}

**Parties:**

**Client/Planner:**
${ctx.planner.name || "Event Planner"}
${ctx.planner.orgName ? `Organization: ${ctx.planner.orgName}` : ""}
${ctx.planner.email ? `Email: ${ctx.planner.email}` : ""}

**Vendor/Venue:**
${vendorOrVenue.name}${vendorOrVenue.category ? ` (${vendorOrVenue.category})` : ""}
${ctx.vendorOrg?.legalEntity ? `Legal Entity: ${ctx.vendorOrg.legalEntity}` : ""}
${vendorOrVenue.contactEmail ? `Email: ${vendorOrVenue.contactEmail}` : ""}
${vendorOrVenue.contactPhone ? `Phone: ${vendorOrVenue.contactPhone}` : ""}

---

## RECITALS

This Event Services Agreement ("Agreement") is entered into on ${today} between the Client/Planner and the Vendor/Venue for the provision of event services for ${ctx.event.name} scheduled to take place on ${eventDate}.

## DEFINITIONS

- **"Event"** means ${ctx.event.name} scheduled for ${eventDate} at ${location}.
- **"Services"** means all services described in the Scope of Services section below.
- **"Event Date"** means ${eventDate}.
- **"Contract Price"** means the total amount of $${(ctx.proposal.totalCents / 100).toFixed(2)} ${ctx.proposal.currency} as detailed in the Payment Terms section.
- **"Parties"** means the Client/Planner and Vendor/Venue collectively.

## SCOPE OF SERVICES

The Vendor/Venue agrees to provide the following services for the Event:

${lineItemsText}

**Event Details:**
- Event Name: ${ctx.event.name}
- Event Date: ${eventDate}
- Event Location: ${location}
- Expected Guest Count: ${ctx.event.guestTarget || "TBD"}

The Vendor/Venue will provide all necessary personnel, equipment, and materials to perform the Services in a professional and timely manner.

## PAYMENT TERMS

**Total Contract Price:** $${(ctx.proposal.totalCents / 100).toFixed(2)} ${ctx.proposal.currency}

**Payment Schedule:**

${milestonesText}

**Payment Methods:** Payments may be made by check, wire transfer, or credit card as agreed upon by the Parties.

**Late Payment:** Any payment not received within 5 business days of the due date shall incur a late fee of 1.5% per month (18% annually) on the overdue amount.

**Refund Policy:** 
- Cancellation 90+ days before Event Date: Full refund minus deposit
- Cancellation 30-90 days before Event Date: 50% refund
- Cancellation less than 30 days before Event Date: No refund

Deposits are non-refundable except as specified above.

## CHANGES AND ADDITIONAL SERVICES

Any changes to the scope of work must be agreed upon in writing by both Parties. Additional services will be billed at the Vendor/Venue's standard rates. The Client/Planner must approve any changes that increase the Contract Price by more than 10%.

## CANCELLATION AND RESCHEDULING

**Client Cancellation:**
- 90+ days before Event Date: Full refund minus deposit
- 30-90 days before Event Date: 50% refund
- Less than 30 days before Event Date: No refund

**Vendor Cancellation:** If the Vendor/Venue must cancel, the Vendor/Venue will provide a full refund of all payments received and assist the Client/Planner in finding a replacement vendor if possible.

**Rescheduling:** Rescheduling requests must be made at least 30 days in advance and are subject to Vendor/Venue availability. Additional fees may apply.

## CLIENT RESPONSIBILITIES

The Client/Planner agrees to:
- Provide timely approvals and decisions
- Provide access to the event venue as needed
- Provide accurate event information and guest counts
- Make payments according to the Payment Schedule
- Comply with all venue rules and regulations

## VENDOR/PLANNER RESPONSIBILITIES

The Vendor/Venue agrees to:
- Perform all Services in a professional and timely manner
- Maintain appropriate insurance coverage
- Comply with all applicable laws and regulations
- Provide qualified personnel and equipment
- Communicate promptly regarding any issues or changes

## LIABILITY AND INDEMNIFICATION

The Vendor/Venue shall maintain general liability insurance of at least $1,000,000. Each Party agrees to indemnify and hold harmless the other Party from any claims arising from their own negligence or breach of this Agreement.

The Vendor/Venue's total liability shall not exceed the Contract Price, except in cases of gross negligence or willful misconduct.

## FORCE MAJEURE

Neither Party shall be liable for failure to perform under this Agreement due to circumstances beyond their reasonable control, including but not limited to: natural disasters, pandemics, government actions, acts of war or terrorism, or other unforeseeable events. In such cases, the Parties will work together in good faith to reschedule or modify the Agreement.

## GENERAL PROVISIONS

**Governing Law:** This Agreement shall be governed by and construed in accordance with the laws of the State of ${governingLawState}, without regard to its conflict of law principles.

**Dispute Resolution:** The Parties agree to first attempt to resolve disputes through good faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in ${governingLawState}.

**Entire Agreement:** This Agreement constitutes the entire agreement between the Parties and supersedes all prior agreements or understandings.

**Severability:** If any provision is found invalid, the remainder of this Agreement shall remain in effect.

**Assignment:** Neither Party may assign this Agreement without the written consent of the other Party.

**Notices:** All notices must be in writing and delivered via email or certified mail to the addresses provided above.

**Waiver:** No waiver of any provision shall be effective unless in writing and signed by both Parties.

**Modifications:** Any modifications to this Agreement must be in writing and signed by both Parties.

## SIGNATURES

**IN WITNESS WHEREOF**, the parties have executed this Agreement as of the date first written above.

---

**Client/Planner:**

_________________________
${ctx.planner.name || "Event Planner"}
${ctx.planner.orgName ? `${ctx.planner.orgName}` : ""}
Date: _______________

**Vendor/Venue:**

_________________________
${vendorOrVenue.name}
${ctx.vendorOrg?.legalEntity ? `${ctx.vendorOrg.legalEntity}` : ""}
Date: _______________`;

  return {
    title: "Event Services Agreement",
    bodyMd,
  };
}

/**
 * Generate a contract from an approved proposal
 */
export async function generateContractFromProposal(
  ctx: ContractContext
): Promise<GeneratedContract> {
  // Demo mode: use deterministic fallback
  if (isDemoMode()) {
    return generateDemoContract(ctx);
  }

  // Check AI availability - if unavailable, fall back to demo mode
  if (!isAIAvailable() || !openai) {
    logDemoMode("AI unavailable, using demo fallback");
    return generateDemoContract(ctx);
  }

  const vendorOrVenue = ctx.vendor || ctx.venue;
  if (!vendorOrVenue) {
    throw new Error("Either vendor or venue must be provided");
  }

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

  // Format line items
  const lineItemsText = ctx.proposal.lineItems
    .map(
      (item) =>
        `- ${item.label}${item.description ? `: ${item.description}` : ""} (${item.qty} ${item.unit || "unit"} @ $${(item.unitPriceCents / 100).toFixed(2)} = $${(item.totalCents / 100).toFixed(2)})`
    )
    .join("\n");

  // Format milestones
  const milestonesText = ctx.proposal.milestones
    .map(
      (m) =>
        `- ${m.title}${m.description ? `: ${m.description}` : ""} - $${(m.amountCents / 100).toFixed(2)}${m.dueDate ? ` (Due: ${new Date(m.dueDate).toLocaleDateString()})` : m.dueOffsetDays ? ` (Due: ${Math.abs(m.dueOffsetDays)} days ${m.dueOffsetDays < 0 ? "before" : "after"} event)` : ""}`
    )
    .join("\n");

  // Determine governing law state
  const governingLawState = ctx.event.venueState || "New York";

  const prompt = `You are an experienced contract attorney specializing in event planning and venue/vendor agreements. You draft formal, legally sound contracts that protect both parties while maintaining clarity and professionalism.

PROPOSAL DETAILS:
Title: ${ctx.proposal.title}
${ctx.proposal.summary ? `Summary: ${ctx.proposal.summary}` : ""}

EVENT DETAILS:
- Event Name: ${ctx.event.name}
- Event Date: ${eventDate}
- Event Time: ${eventTime} - ${eventEndTime}
- Event Location: ${location}
- Expected Guest Count: ${ctx.event.guestTarget || "TBD"}

VENDOR/VENUE PARTY:
- Business Name: ${vendorOrVenue.name}
- Category: ${vendorOrVenue.category}
${ctx.vendorOrg?.legalEntity ? `- Legal Entity Name: ${ctx.vendorOrg.legalEntity}` : ""}
${vendorOrVenue.contactEmail ? `- Contact Email: ${vendorOrVenue.contactEmail}` : ""}
${vendorOrVenue.contactPhone ? `- Contact Phone: ${vendorOrVenue.contactPhone}` : ""}

PLANNER/CLIENT PARTY:
- Name: ${ctx.planner.name || "Event Planner"}
${ctx.planner.orgName ? `- Organization Name: ${ctx.planner.orgName}` : ""}
${ctx.planner.email ? `- Contact Email: ${ctx.planner.email}` : ""}

SERVICES & PRICING DETAILS:
${lineItemsText}

Total Contract Price: $${(ctx.proposal.totalCents / 100).toFixed(2)} ${ctx.proposal.currency}

PAYMENT SCHEDULE:
${milestonesText}

ADDITIONAL TERMS FROM PROPOSAL:
${ctx.proposal.terms || "None specified"}

TASK: Generate a complete, formal US-style contract in markdown format. This contract must be professional, legally sound, and suitable for e-signing between the planner/client and vendor/venue.

REQUIRED CONTRACT STRUCTURE:

1. **CONTRACT HEADER** (use # for title)
   - Formal contract title (e.g., "Event Services Agreement" or "Venue Rental Agreement")
   - Date of contract execution (use current date)
   - Clear identification of both parties:
     * "Client" or "Planner" (the party hiring services)
     * "Vendor" or "Venue" (the party providing services)
     Include full names, organization names (if applicable), and contact information

2. **RECITALS** (use ## for section heading)
   - Brief background stating the purpose of the agreement
   - Reference to the event and the parties' intent to enter into this agreement

3. **DEFINITIONS** (use ## for section heading)
   - Define key terms: "Event", "Services", "Event Date", "Contract Price", "Parties", etc.
   - Ensure clarity for all terms used throughout the contract

4. **SCOPE OF SERVICES** (use ## for section heading)
   - Detailed description of all services to be provided
   - Specific deliverables and what is included
   - Event details (date, time, location, guest count)
   - Any special requirements or specifications
   - Timeline for service delivery
   - What is NOT included (if applicable)

5. **PAYMENT TERMS** (use ## for section heading)
   - Total contract price: $${(ctx.proposal.totalCents / 100).toFixed(2)} ${ctx.proposal.currency}
   - Detailed payment schedule with specific amounts and due dates
   - Payment methods accepted
   - Late payment fees: Standard 1.5% per month (or 18% annually) on overdue amounts
   - Refund policy: Specify when refunds are available and any non-refundable portions
   - Deposit policy: Explain that deposits are typically non-refundable

6. **CHANGES AND ADDITIONAL SERVICES** (use ## for section heading)
   - How changes to the scope of work will be handled
   - Process for approving additional services
   - Pricing for changes and additions

7. **CANCELLATION AND RESCHEDULING** (use ## for section heading)
   - Client cancellation policy: Specify refund percentages based on cancellation timing (e.g., 90+ days = full refund minus deposit, 30-90 days = 50% refund, <30 days = no refund)
   - Vendor cancellation policy: Vendor's obligations if they must cancel
   - Rescheduling policy: How rescheduling requests will be handled
   - Force majeure clause: Protection for both parties in case of unforeseeable circumstances (natural disasters, pandemics, government restrictions, etc.)

8. **CLIENT RESPONSIBILITIES** (use ## for section heading)
   - Client's obligations (providing access, information, approvals, etc.)
   - Timelines for client deliverables
   - Any requirements or restrictions

9. **VENDOR/PLANNER RESPONSIBILITIES** (use ## for section heading)
   - Vendor's obligations to perform services
   - Quality standards and expectations
   - Compliance with laws and regulations
   - Insurance requirements (if applicable)

10. **LIABILITY AND INDEMNIFICATION** (use ## for section heading)
    - Limitation of liability clauses
    - Indemnification provisions protecting both parties
    - Insurance requirements for vendor
    - Damage and loss provisions

11. **FORCE MAJEURE** (use ## for section heading)
    - Comprehensive force majeure clause covering:
      * Natural disasters
      * Pandemics and health emergencies
      * Government actions or restrictions
      * Acts of war or terrorism
      * Other unforeseeable circumstances beyond either party's control
    - Rights and obligations of both parties in force majeure situations

12. **GENERAL PROVISIONS** (use ## for section heading)
    - **Governing Law**: This Agreement shall be governed by and construed in accordance with the laws of the State of ${governingLawState}, without regard to its conflict of law principles.
    - **Dispute Resolution**: 
      * First, parties agree to attempt to resolve disputes through good faith negotiation
      * If negotiation fails, parties agree to mediation
      * If mediation fails, disputes shall be resolved through binding arbitration in ${governingLawState}
    - **Entire Agreement**: This contract constitutes the entire agreement between the parties
    - **Severability**: If any provision is found invalid, the remainder of the contract remains in effect
    - **Assignment**: Restrictions on assigning the contract without consent
    - **Notices**: How formal notices must be delivered (email, certified mail, etc.)
    - **Waiver**: No waiver of any provision shall be effective unless in writing
    - **Modifications**: Any modifications must be in writing and signed by both parties

13. **SIGNATURES** (use ## for section heading)
    - Signature blocks for both parties with:
      * Printed name line
      * Signature line
      * Title/role line (if applicable)
      * Date line
    - Format: "IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above."

TONE AND STYLE:
- Use formal, legal language appropriate for a binding contract
- Be clear and precise - avoid ambiguity
- Use standard US contract terminology
- Number all sections and subsections clearly
- Format in clean markdown:
  * # for main title
  * ## for major sections
  * ### for subsections
  * Use bullet points or numbered lists where appropriate
  * Use **bold** for emphasis on key terms

Return ONLY the contract text in markdown format, starting with the title (#). Do not include any JSON wrapper, code blocks, or explanations. The output should be ready to display as a formatted contract document.`;

  try {
    logAI("Generating contract with OpenAI...");
    logAI("Model:", process.env.OPENAI_MODEL || "gpt-4o-mini");
    logAI("Event:", ctx.event.name);
    logAI("Proposal title:", ctx.proposal.title);
    
    const completion = await openai!.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an experienced contract attorney specializing in event planning and venue/vendor agreements. You draft formal, legally sound contracts using standard US contract language. Generate professional contracts in markdown format. Return only the contract text in markdown - no JSON wrapper, no code blocks, no explanations. Start with the title using # heading.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2, // Very low temperature for consistent, formal legal language
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.error("[AI] OpenAI returned empty content for contract");
      throw new Error("AI did not return any content");
    }

    logAI("Contract generated successfully, length:", content.length);

    if (!completion.choices[0]) {
      throw new Error("AI response is empty");
    }

    // Extract title from first line, body from rest
    const lines = content.trim().split("\n");
    const firstLine = lines[0];
    const title = firstLine ? firstLine.replace(/^#+\s*/, "").trim() || "Service Agreement" : "Service Agreement";
    const bodyMd = content.trim();

    return {
      title,
      bodyMd,
    };
  } catch (error) {
    logAI("Error generating contract:", error);
    if (error instanceof Error) {
      logAI("Error stack:", error.stack);
      // Fallback to demo mode on error
      logDemoMode("AI error, falling back to demo contract");
      return generateDemoContract(ctx);
    }
    // Fallback to demo mode on unknown error
    logDemoMode("Unknown AI error, falling back to demo contract");
    return generateDemoContract(ctx);
  }
}

