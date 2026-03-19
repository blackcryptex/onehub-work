// lib/email.service.ts (stub)
export async function sendEmail(_to: string, _subject: string, _body: string) {
  await new Promise(r => setTimeout(r, 200));
  return { ok: true };
}

export async function sendProposalEmail(_to: string, _subject: string, _body: string) {
  await new Promise(r => setTimeout(r, 200));
  return { ok: true };
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

  // TODO: Replace with actual email service integration
  // For now, this is a stub that logs the email
  console.log("[Email] Would send event shared email:", {
    to,
    subject,
    body,
  });

  return sendEmail(to, subject, body);
}

