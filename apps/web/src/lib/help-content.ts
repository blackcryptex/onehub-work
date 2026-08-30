export type HelpRole = "pro-planner" | "diy-planner" | "vendor" | "venue" | "client" | "admin" | "all";

export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  roles: HelpRole[];
  category: string;
  updatedAt: string;
  beforeYouStart: string[];
  steps: string[];
  successLooksLike: string[];
  commonMistakes: string[];
  safetyNotes?: string[];
  relatedSlugs: string[];
};

export const HELP_ROLES = ["pro-planner", "diy-planner", "vendor", "venue", "client", "admin"] as const satisfies readonly HelpRole[];

export const HELP_ROLE_LABELS: Record<(typeof HELP_ROLES)[number], string> = {
  "pro-planner": "Pro Planner",
  "diy-planner": "DIY Planner",
  vendor: "Vendor",
  venue: "Venue",
  client: "Client",
  admin: "Admin",
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "pro-planner-send-message",
    title: "Send a message as a pro planner",
    summary: "Use the message inbox or a connected thread to reply to clients, vendors, venues, proposals, booking requests, and event records.",
    roles: ["pro-planner"],
    category: "Messages and follow-up",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "You are signed in as a pro planner with access to the organization or event thread.",
      "You know whether the note belongs in a client/vendor-visible thread or in an internal planner note.",
    ],
    steps: [
      "Open the Pro Planner dashboard and choose Messages, or go directly to /messages.",
      "Choose the thread connected to the event, client, vendor, venue, proposal, booking request, contract, task, payment item, or crisis record you need to discuss.",
      "Read the linked record summary so your reply matches the right event context.",
      "Type the reply in the message box and click Send.",
      "Refresh or reopen the thread and confirm your reply appears in the conversation history.",
    ],
    successLooksLike: [
      "The reply is visible in the selected thread after send or refresh.",
      "The thread remains tied to the correct event, proposal, listing, or booking request context.",
      "Private planner-only notes stay out of client/vendor-visible conversations.",
    ],
    commonMistakes: [
      "Posting an internal planning note in a client-visible or provider-visible thread.",
      "Replying from the inbox without checking which event or proposal the thread is attached to.",
      "Assuming email-only participants received an external email when the product only shows them as unbound participants.",
    ],
    safetyNotes: [
      "Do not put private planner-only notes in client/vendor-visible threads.",
      "Use internal notes only for planner-only content.",
    ],
    relatedSlugs: ["review-proposal", "review-contract", "understand-payment-readiness"],
  },
  {
    slug: "diy-create-event",
    title: "Create an event as a DIY planner",
    summary: "Start a neutral event workspace from the DIY dashboard so planning records, vendors, tasks, proposals, contracts, and payment readiness have one home.",
    roles: ["diy-planner"],
    category: "Event setup",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "You have a basic event idea such as a gala, corporate event, private party, conference, wedding, fundraiser, or community gathering.",
      "You know the target date, city, state or ZIP code, guest target, and rough budget if available.",
    ],
    steps: [
      "Open the DIY Planner dashboard or guided planning cockpit.",
      "Choose Create event or open the event wizard.",
      "Enter the event name, event type, date, city, state or ZIP code, guest target, budget, objective, and style notes that apply.",
      "Review the details before saving so the event workspace starts with accurate planning context.",
      "Submit the wizard and wait for the Event Vault or event detail workspace to open.",
    ],
    successLooksLike: [
      "The event appears in your Event Vault or dashboard list.",
      "The event detail workspace opens with the name, date, location, and planning sections you entered.",
    ],
    commonMistakes: [
      "Using a vendor search before creating the event workspace that should hold the request context.",
      "Leaving the city or date blank when vendors and venues need those details to assess fit.",
      "Treating AI suggestions as final bookings or payments.",
    ],
    safetyNotes: ["Creating an event workspace does not book a provider, approve a contract, or move money."],
    relatedSlugs: ["source-vendors-and-venues", "create-tasks-and-milestones", "understand-payment-readiness"],
  },
  {
    slug: "pro-planner-create-event",
    title: "Create a client event as a pro planner",
    summary: "Create a pro planner event workspace before coordinating clients, vendors, venue options, proposals, contracts, tasks, and readiness status.",
    roles: ["pro-planner"],
    category: "Event setup",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "You are signed in to the planner organization that should own the event workspace.",
      "You have the event type, date, city, guest target, budget, client objective, and any early service needs.",
    ],
    steps: [
      "Open the Pro Planner dashboard.",
      "Click Create Event or open /events/new from the planner priority area.",
      "Enter the event type, date, city, guest target, budget, client objective, and any known service categories.",
      "Save the event and confirm the pro planner Event Vault or command center opens.",
      "Add client sharing, team assignments, vendor/venue sourcing, and messages only after the event workspace exists.",
    ],
    successLooksLike: [
      "The event is listed in the pro planner dashboard or vault.",
      "The event command center can hold tasks, vendor requests, proposals, contracts, and message threads.",
    ],
    commonMistakes: [
      "Confusing event creation with client approval or payment approval.",
      "Sharing client access before checking the event details and visibility settings.",
    ],
    safetyNotes: ["Planner event creation is workspace setup only; keep client access, contracts, and money readiness as separate reviewed steps."],
    relatedSlugs: ["pro-planner-send-message", "source-vendors-and-venues", "create-tasks-and-milestones"],
  },
  {
    slug: "source-vendors-and-venues",
    title: "Source vendors and venues",
    summary: "Use marketplace discovery to find provider or venue options for an event without treating discovery as a booking.",
    roles: ["diy-planner", "pro-planner", "client"],
    category: "Marketplace sourcing",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "Your event workspace exists and includes location, date, guest target, budget, and needed services.",
      "You know which categories you need to compare first.",
    ],
    steps: [
      "Open Marketplace or Explore Vendors from the event workspace or dashboard.",
      "Search or filter by event need, category, location, capacity, availability context, service fit, or price tier.",
      "Open a vendor or venue profile and review trust details, status, capacity, availability, proof, and service fit.",
      "Shortlist a provider or return to the event workspace when the option is not a fit.",
      "Use a booking request when you are ready to ask about availability, quote details, or next steps.",
    ],
    successLooksLike: [
      "You have one or more provider or venue options connected to the event decision path.",
      "The event workspace reflects the next sourcing or request step without implying a booking has happened.",
    ],
    commonMistakes: [
      "Assuming a search result means the provider is available or booked.",
      "Skipping capacity, location, date, and service-fit checks before sending a request.",
    ],
    safetyNotes: ["Sourcing or shortlisting is not a signed contract, provider acceptance, payment, or final booking."],
    relatedSlugs: ["send-booking-request", "review-proposal", "understand-payment-readiness"],
  },
  {
    slug: "send-booking-request",
    title: "Send a booking request",
    summary: "Ask a vendor or venue about availability and quote details from a selected listing while keeping request status separate from contracts and payments.",
    roles: ["diy-planner", "pro-planner", "client", "vendor", "venue"],
    category: "Marketplace sourcing",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "You have selected a vendor or venue listing that appears relevant to the event.",
      "The request includes enough event details for the provider to respond accurately.",
    ],
    steps: [
      "Open the selected vendor, venue, or listing profile.",
      "Review availability context, capacity, category, location, service fit, and any provider proof shown in OneHub.",
      "Enter the event or request details, including date/time range, guest count, requested service, and useful notes.",
      "Send the request.",
      "Confirm the request, status, or connected message thread appears in the event workspace, request queue, or messages area.",
    ],
    successLooksLike: [
      "The request exists with the selected provider or venue attached.",
      "A request status or connected thread is available for follow-up.",
    ],
    commonMistakes: [
      "Treating a sent request as provider acceptance.",
      "Sending too little event context for a useful provider response.",
      "Assuming the request created a signed contract or moved money.",
    ],
    safetyNotes: ["A request is not acceptance, a signed contract, a final booking, or payment movement."],
    relatedSlugs: ["source-vendors-and-venues", "review-proposal", "pro-planner-send-message"],
  },
  {
    slug: "review-proposal",
    title: "Review a proposal",
    summary: "Check proposal scope, price, provider proof, milestones, and linked event context before deciding whether to ask questions or continue.",
    roles: ["diy-planner", "pro-planner", "vendor", "venue"],
    category: "Contracts and proposals",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "A proposal is available from the event workspace, proposal queue, request, or connected message thread.",
      "You can compare the proposal against the event need, date, budget, and provider or venue fit.",
    ],
    steps: [
      "Open the proposal from the event workspace, proposal queue, booking request, or connected thread.",
      "Review the title, scope, price, provider or venue proof, milestones, dates, and linked event.",
      "Check whether the proposal has enough provider-submitted evidence for the next contract step.",
      "Use the connected thread to ask questions when scope, price, dates, or responsibilities are unclear.",
      "Decide the next step only after the terms are ready for the event owner or planner to act on.",
    ],
    successLooksLike: [
      "You know whether to ask questions, request edits, decline, or continue toward acceptance.",
      "Open questions are recorded in the connected thread or event workspace.",
    ],
    commonMistakes: [
      "Accepting before reviewing milestones, dates, responsibilities, and provider proof.",
      "Treating proposal review as contract approval or payment authorization.",
    ],
    safetyNotes: ["Proposal review is not a substitute for professional review, automatic booking, contract approval, or money movement."],
    relatedSlugs: ["accept-proposal", "review-contract", "pro-planner-send-message"],
  },
  {
    slug: "accept-proposal",
    title: "Accept a proposal",
    summary: "Accept a proposal only after provider, scope, dates, price, milestones, and terms are ready for the next guarded contract or signature step.",
    roles: ["diy-planner", "pro-planner", "client"],
    category: "Contracts and proposals",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "The proposal has been reviewed and open questions are answered.",
      "The event owner or authorized planner is ready for the next contract or signature state.",
    ],
    steps: [
      "Open the proposal detail from the proposal queue or event workspace.",
      "Confirm provider or venue identity, linked event, dates, scope, price, milestones, terms, and evidence.",
      "Use the connected message thread for any final question before taking action.",
      "Accept only when the terms are ready for the next contract, signature, or readiness state.",
      "Confirm the proposal status changes and the next contract, signature, or readiness action appears.",
    ],
    successLooksLike: [
      "The proposal shows an accepted or next-step status in OneHub.",
      "The related contract, signature, or readiness path is clear without implying payment completion.",
    ],
    commonMistakes: [
      "Accepting without checking dates, scope, provider proof, and price.",
      "Assuming acceptance alone creates live money movement.",
    ],
    safetyNotes: ["Acceptance does not equal payment completion unless a guarded payment flow separately confirms readiness and successful processing."],
    relatedSlugs: ["review-proposal", "review-contract", "understand-payment-readiness"],
  },
  {
    slug: "review-contract",
    title: "Review a contract",
    summary: "Review contract parties, event context, scope, proposal link, milestones, signatures, and payment readiness before any signing or funding step.",
    roles: ["diy-planner", "pro-planner", "client", "vendor", "venue"],
    category: "Contracts and proposals",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "A contract record is available from an accepted proposal, event workspace, contract queue, or message thread.",
      "You can compare contract details to the proposal and event records.",
    ],
    steps: [
      "Open the contract detail from the event workspace, contract queue, or connected proposal.",
      "Review parties, event, scope, linked proposal, milestones, signature status, and payment readiness status.",
      "Check who needs to sign next and whether any party, date, milestone, or price looks wrong.",
      "Use the connected message thread for questions or corrections before signing.",
      "Continue to signing only after the responsible user is comfortable with the terms shown in OneHub.",
    ],
    successLooksLike: [
      "You can identify the next signer or next correction needed.",
      "The contract record matches the event and proposal context you intend to use.",
    ],
    commonMistakes: [
      "Reviewing only the price and skipping parties, scope, dates, milestones, and linked proposal context.",
      "Treating readiness status as a legal conclusion or public launch approval.",
    ],
    safetyNotes: ["OneHub is not a law firm; contract and payment readiness statuses are private-pilot/test-mode product states that still require appropriate human review."],
    relatedSlugs: ["sign-contract", "understand-payment-readiness", "pro-planner-send-message"],
  },
  {
    slug: "sign-contract",
    title: "Sign a contract",
    summary: "Use the contract signature route only when the signer is authorized and has reviewed the terms, parties, event, scope, and readiness state.",
    roles: ["diy-planner", "pro-planner", "client", "vendor", "venue"],
    category: "Contracts and proposals",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "The contract terms have been reviewed by the person who is about to sign.",
      "The signer is authorized to sign for themselves or their organization.",
    ],
    steps: [
      "Open the contract or signature route from the contract detail page.",
      "Confirm signer identity, event, parties, scope, milestones, price, and terms.",
      "Sign only if you are authorized and the details are correct.",
      "After signing, confirm the signature count or status updates in the contract detail.",
      "Check whether another signer, contract correction, or guarded readiness step is still required.",
    ],
    successLooksLike: [
      "Your signature is recorded in the contract status or signature list.",
      "The contract detail shows who, if anyone, needs to sign next.",
    ],
    commonMistakes: [
      "Signing for another person without authorization.",
      "Skipping terms and relying only on a message summary.",
      "Assuming signature status alone guarantees legal outcome or money movement.",
    ],
    safetyNotes: ["Do not claim a legal outcome beyond the current product wording and your own authority to sign."],
    relatedSlugs: ["review-contract", "understand-payment-readiness", "accept-proposal"],
  },
  {
    slug: "understand-payment-readiness",
    title: "Understand payment readiness",
    summary: "Read OneHub payment states as guarded private-pilot/test-mode readiness signals, not as public launch, escrow, payout, refund, or legal guarantees.",
    roles: ["all"],
    category: "Payments and readiness",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "You are looking at a proposal, contract, payment plan, milestone, dispute, refund, holdback, or admin review state.",
      "You understand that readiness labels explain product state and do not replace payment-provider, admin, or legal review.",
    ],
    steps: [
      "Open the proposal, contract, payment panel, milestone, or admin review item connected to the event.",
      "Read the status as a guarded private-pilot or test-mode signal such as blocked, ready, failed, processing, held, under review, or completed in the UI context shown.",
      "Check whether a signed contract, accepted proposal, configured provider account, payout readiness, admin approval, dispute, refund, or holdback state is still required.",
      "Use message threads or admin review notes to clarify what evidence or correction is needed.",
      "Continue only when the product state, user authority, and review requirements all support the next action.",
    ],
    successLooksLike: [
      "You can explain why the item is blocked, ready, failed, processing, held, or under manual review.",
      "No one treats readiness language as proof of public launch, legal status, payout certainty, or refund certainty.",
    ],
    commonMistakes: [
      "Calling a guarded readiness state an enabled public payment flow.",
      "Skipping disputes, refunds, holdbacks, or admin review before acting.",
      "Assuming a proposal or contract status alone proves money can move.",
    ],
    safetyNotes: ["Do not promise live money movement, escrow status, payouts, refunds, or legal enforceability. Treat payment readiness as guarded status until the actual flow confirms the result."],
    relatedSlugs: ["review-contract", "accept-proposal", "admin-review-risk"],
  },
  {
    slug: "create-tasks-and-milestones",
    title: "Create tasks and milestones",
    summary: "Use tasks and milestones to make ownership, dates, blockers, dependencies, and completion proof visible in the event workspace.",
    roles: ["diy-planner", "pro-planner", "client"],
    category: "Tasks and milestones",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "The event workspace exists and you know what needs an owner, date, dependency, or completion note.",
      "You know who should see or own the task based on event visibility rules.",
    ],
    steps: [
      "Open the event workspace, Event Vault, or command center.",
      "Go to Tasks, Milestones, or the event management area that holds timeline work.",
      "Add the task or milestone title with a clear owner and due date when those fields are available.",
      "Set any dependency, blocker, status, or note supported by the current workspace.",
      "Record completion proof, a note, or a linked message when the work is done.",
    ],
    successLooksLike: [
      "The task or milestone appears in the event workspace with the correct owner or status.",
      "The next planner, client, or admin can understand what is done, blocked, or due next.",
    ],
    commonMistakes: [
      "Creating vague task names that do not say what action is required.",
      "Assigning client-visible work without checking visibility or ownership.",
      "Marking work complete without proof or a useful note.",
    ],
    safetyNotes: ["Planner/admin visibility depends on the event workspace and sharing model; keep sensitive notes in the correct internal location."],
    relatedSlugs: ["diy-create-event", "pro-planner-create-event", "handle-crisis-and-replacement"],
  },
  {
    slug: "handle-crisis-and-replacement",
    title: "Handle a crisis or replacement",
    summary: "Record an issue, link affected records, and start replacement action while keeping money, contract, and legal changes under manual review.",
    roles: ["diy-planner", "pro-planner", "admin"],
    category: "Risk and recovery",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "You know the event, affected vendor or venue, contract, payment item, task, milestone, or proposal involved.",
      "You can describe the issue and urgency without exposing unnecessary private information.",
    ],
    steps: [
      "Open the event workspace or risk/crisis area connected to the event.",
      "Record the issue with severity, impact, and recommended next action.",
      "Link the vendor, venue, contract, payment item, proposal, booking request, task, milestone, or message thread when available.",
      "Start a replacement request or marketplace search if a backup provider or venue is needed.",
      "Use admin oversight or manual review before any money, contract, refund, holdback, or legal-status change.",
      "Confirm the risk item appears in the planner or admin oversight queue with the linked context.",
    ],
    successLooksLike: [
      "The issue is visible in the event workspace or admin risk queue.",
      "Replacement sourcing or follow-up has a clear next action.",
      "Money and contract changes wait for the appropriate review path.",
    ],
    commonMistakes: [
      "Handling a replacement entirely in free-text messages without linking the affected record.",
      "Making payment, refund, holdback, or contract changes without manual review.",
    ],
    safetyNotes: ["Crisis recovery should not bypass guarded payment, contract, refund, holdback, dispute, or admin review controls."],
    relatedSlugs: ["source-vendors-and-venues", "understand-payment-readiness", "admin-review-risk"],
  },
  {
    slug: "admin-review-risk",
    title: "Review risk as an admin",
    summary: "Use admin oversight to review risk queues, disputes, refunds, holdbacks, payout readiness, overrides, and evidence with minimum necessary access.",
    roles: ["admin"],
    category: "Risk and recovery",
    updatedAt: "2026-08-29",
    beforeYouStart: [
      "You are signed in with the appropriate admin role for the review surface.",
      "You have enough context to review the event, parties, linked records, evidence, and requested action.",
    ],
    steps: [
      "Open the admin oversight or verification area for risk, disputes, refunds, holdbacks, payouts, or overrides.",
      "Review the linked event, organization, users, vendor or venue, proposal, contract, payment item, messages, and evidence shown.",
      "Check current status, who requested the action, and what manual review notes already say.",
      "Use the minimum necessary access to decide whether more evidence, correction, or escalation is needed.",
      "Do not use manual override for money, contract, refund, holdback, payout, or legal-risk changes without approval and evidence in the guarded review path.",
    ],
    successLooksLike: [
      "The risk item has a clear reviewed status, evidence note, or next action.",
      "Admin action remains scoped to the guarded review path and does not expose unnecessary data.",
    ],
    commonMistakes: [
      "Using broad admin access when a smaller review surface is enough.",
      "Changing money or contract-related status without approval and evidence.",
      "Treating admin review as a legal conclusion or final public launch approval.",
    ],
    safetyNotes: ["Admin review must preserve minimum necessary access and guarded manual review for money, contract, refund, holdback, payout, dispute, and override actions."],
    relatedSlugs: ["understand-payment-readiness", "handle-crisis-and-replacement", "review-contract"],
  },
];

export function getAllHelpArticles() {
  return [...HELP_ARTICLES];
}

export function getHelpArticle(slug: string) {
  return HELP_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function getHelpArticlesByRole(role: HelpRole) {
  return HELP_ARTICLES.filter((article) => article.roles.includes(role) || article.roles.includes("all"));
}

export function getHelpArticlesByCategory(category: string) {
  return HELP_ARTICLES.filter((article) => article.category === category);
}

export function getHelpCategories() {
  return Array.from(new Set(HELP_ARTICLES.map((article) => article.category))).map((category) => ({
    category,
    articles: getHelpArticlesByCategory(category),
  }));
}

export function isHelpRole(role: string): role is (typeof HELP_ROLES)[number] {
  return HELP_ROLES.includes(role as (typeof HELP_ROLES)[number]);
}

export function isHelpArticleSlug(slug: string) {
  return HELP_ARTICLES.some((article) => article.slug === slug);
}

export function helpArticleHref(slug: string) {
  return `/help/articles/${slug}`;
}

export function helpRoleHref(role: HelpRole) {
  return `/help/roles/${role}`;
}
