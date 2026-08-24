type LegacyEmailDeliveryResult = {
  ok: false;
  status: "NOT_CONFIGURED";
  reason: string;
};

function legacyEmailNotConfigured(): LegacyEmailDeliveryResult {
  return {
    ok: false,
    status: "NOT_CONFIGURED",
    reason: "Legacy client-side email helper cannot send outbound email; use a server outbound route with provider credentials.",
  };
}

export async function sendEmail(_to: string, _subject: string, _body: string) {
  return legacyEmailNotConfigured();
}

export async function sendProposalEmail(_to: string, _subject: string, _body: string) {
  return legacyEmailNotConfigured();
}

/**
 * Phase 7A: Send email notification when event is shared with client
 */
export async function sendEventSharedEmail({
  to,
  clientName,
  eventName,
  eventUrl,
  plannerName,
}: {
  to: string;
  clientName?: string | null;
  eventName: string;
  eventUrl: string;
  plannerName?: string | null;
}) {
  const subject = `${plannerName || "Your planner"} shared "${eventName}" with you`;
  const body = `
Hello ${clientName || "there"},

${plannerName || "Your planner"} has shared information about the event "${eventName}" with you.

View the event portal: ${eventUrl}

You can review event details, make deposits, and communicate with your planner through the portal.

Best regards,
OneHub
  `.trim();

  return sendEmail(to, subject, body);
}

