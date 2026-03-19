/**
 * Build AI planner payload from event data
 * Includes both raw user text and normalized fields for AI processing
 */

export type PlannerPayload = {
  event_type: {
    raw: string;
    canonical: string | null;
  };
  budget: {
    raw: string;
    min: number | null;
    max: number | null;
    currency: string | null;
  };
};

/**
 * Build planner payload from event data
 * Uses both raw and normalized fields to preserve user intent while enabling calculations
 */
export function buildPlannerPayload(evt: {
  eventTypeRaw: string | null;
  eventTypeCanonical: string | null;
  budgetRaw: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetCurrency: string | null;
}): PlannerPayload {
  return {
    event_type: {
      raw: evt.eventTypeRaw || 'Unknown',
      canonical: evt.eventTypeCanonical ?? null,
    },
    budget: {
      raw: evt.budgetRaw || 'Not specified',
      min: evt.budgetMin ?? null,
      max: evt.budgetMax ?? null,
      currency: evt.budgetCurrency ?? null,
    },
  };
}

/**
 * System prompt for AI planner
 * Instructs the AI to use both raw and normalized fields appropriately
 */
export const PLANNER_SYSTEM_PROMPT = `You are an expert event planner AI assistant. You receive both raw user text and normalized fields for event planning.

Guidelines:
• Use RAW fields to preserve user intent and nuance (style, qualifiers, specific language).
• Prefer NORMALIZED numbers/currency for calculations and vendor matching.
• If normalization is missing or ambiguous, infer a working range and state confidence.
• Never reject plans due to missing normalization if RAW text is present.
• When providing recommendations, reference the user's exact wording from RAW fields when relevant.
• Use normalized budget ranges for vendor matching and budget allocation.
• If currency is not specified, default to USD and note this assumption.`;

