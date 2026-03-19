# OneHub Demo Scan Report

**Generated:** Thu Dec 25 06:02:43 CST 2025

## Repo layout
ADMIN_IMPLEMENTATION_SUMMARY.md
CODE_ANALYSIS_REPORT.md
DEMO_READINESS_ANALYSIS.md
DEMO_SCAN_REPORT.md
DIY_PRO_EVENT_ISOLATION_AUDIT.md
ERROR_COMPONENTS_AUDIT_REPORT.md
EVENT_EDIT_DELETE_AUDIT.md
EVENT_VAULT_404_FIX_REPORT.md
FINAL_VISION_LOCK_AUDIT.md
LINK_FIXES_REPORT.md
MVP-ANALYSIS.md
NAVIGATION_AUDIT_REPORT.md
PAYMENT_IMPLEMENTATION_SUMMARY.md
PHASE_0_SECURITY_TEST_CHECKLIST.md
PHASE_1_IMPLEMENTATION_SUMMARY.md
PHASE_2_IMPLEMENTATION_SUMMARY.md
PHASE_3_IMPLEMENTATION_SUMMARY.md
PHASE_7A_IMPLEMENTATION_SUMMARY.md
PRISMA_FIXES_REPORT.md
PRO_PLANNER_CLIENT_AUDIT.md
PRO_PLANNER_CREATE_EVENT_AUDIT.md
PRO_PLANNER_DASHBOARD_AUDIT.md
README.md
REGRESSION_FIXES_REPORT.md
SIGNIN_ROLE_ACCESS_AUDIT.md
STYLING_FIXES_REPORT.md
SUPABASE_ERROR_PLAYBOOK.md
TODO-ONEHUB.md
VISION_ALIGNMENT_AUDIT.md
apps
demo_scan.sh
docs
e2e
node_modules
package-lock.json
package.json
packages
playwright.config.ts
pnpm-lock.yaml
pnpm-workspace.yaml
reports
scripts
tsconfig.json
tsconfig.tsbuildinfo
vitest.config.ts

## Vault-related pages
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx
apps/web/src/app/(app)/vault/page.tsx
apps/web/src/app/app/vault/[eventSlug]/page.tsx
apps/web/src/app/app/vault/page.tsx
apps/web/src/app/pro/planner/vault/[eventSlug]/page.tsx
apps/web/src/app/pro/planner/vault/page.tsx
apps/web/src/app/event-vault/[eventSlug]/page.tsx
apps/web/src/app/event-vault/page.tsx
apps/web/src/app/diy-planner/vault/[eventSlug]/page.tsx
apps/web/src/app/diy-planner/vault/page.tsx

## Event Vault core file (if present)
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx


## Where proposal generation is wired

apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:18:import { GenerateProposalButton } from "@/components/proposals/GenerateProposalButton";
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:626:                <GenerateProposalButton eventId={event.id} />
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:647:                        <GenerateProposalButton 
apps/web/src/components/proposals/GenerateProposalButton.tsx:8:interface GenerateProposalButtonProps {
apps/web/src/components/proposals/GenerateProposalButton.tsx:14:export function GenerateProposalButton({
apps/web/src/components/proposals/GenerateProposalButton.tsx:18:}: GenerateProposalButtonProps) {

## Shortlist usage

apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:109:        shortlistItems: {
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:137:    // If it's a Prisma relation error (e.g., shortlistItems not in schema), try without it
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:138:    if (error instanceof Error && error.message.includes("shortlistItems")) {
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:139:      console.warn("[Vault] Retrying without shortlistItems relation...");
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:631:              {('shortlistItems' in event && event.shortlistItems && Array.isArray(event.shortlistItems) && event.shortlistItems.length > 0) ? (
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:635:                    {(event.shortlistItems as any[]).map((item: any) => (
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:681:                  {(!('shortlistItems' in event) || !event.shortlistItems || !Array.isArray(event.shortlistItems) || event.shortlistItems.length === 0) && (
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:693:                    {('shortlistItems' in event && event.shortlistItems && Array.isArray(event.shortlistItems) && event.shortlistItems.length > 0) 
apps/web/src/app/api/diy/events/route.ts:74:      shortlistItems: {
apps/web/src/app/api/diy/events/route.ts:199:function mapVendor(shortlistItem: PrismaEventWithRelations["shortlistItems"][number]): VendorLink {
apps/web/src/app/api/diy/events/route.ts:245:  const vendors = event.shortlistItems.map(mapVendor);
apps/web/src/app/api/diy/events/route.ts:392:        shortlistItems: {
apps/web/src/app/api/events/create/route.ts:148:  // shortlistItems not included in query, so vendors will be empty array for newly created events
apps/web/src/app/api/events/create/route.ts:473:    // Note: Using type assertion for shortlistItems due to Prisma type generation issues
apps/web/src/app/api/events/create/route.ts:531:        // Note: shortlistItems removed - not available in Prisma client and not needed for newly created events

## Shortlist DB mutations


## Add Vendor UI text


## Where vendorsseist is rendered/consumed


## Vault base-path routing helper

apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:22:import { getVaultBasePath, eventBudget, eventGuests, eventChecklists, proposalDetail, vaultDetail } from "@/lib/routes";
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:57:  const vaultBasePath = getVaultBasePath(user.role);
apps/web/src/app/(app)/vault/page.tsx:8:import { getVaultBasePath, vaultDetail, vaultIndex } from "@/lib/routes";
apps/web/src/app/(app)/vault/page.tsx:44:  const vaultBasePath = getVaultBasePath(user.role);
apps/web/src/lib/routes.ts:22:export function getVaultBasePath(role: Role | undefined): string {
apps/web/src/lib/routes.ts:38:  return getVaultBasePath(role);
apps/web/src/lib/routes.ts:45:  const base = getVaultBasePath(role);
apps/web/src/lib/routes.ts:65:    const base = getVaultBasePath(role);
apps/web/src/lib/routes.ts:80:    const base = getVaultBasePath(role);
apps/web/src/lib/routes.ts:95:    const base = getVaultBasePath(role);

## AI contract generation references


## Milestones/payment tracking references

apps/web/src/app/(app)/contracts/[id]/page.tsx:39:          milestones: {
apps/web/src/app/(app)/contracts/[id]/page.tsx:65:    milestones: (contract.proposal.milestones || []).map((m) => ({
apps/web/src/app/(app)/events/[eventSlug]/milestones/page.tsx:14:  const items = await prisma.milestone.findMany({
apps/web/src/app/(app)/events/[eventSlug]/page.tsx:13:  const ev = await prisma.event.findFirst({ where: { slug: params.eventSlug }, include: { budgetLines: true, milestones: true } });
apps/web/src/app/(app)/events/[eventSlug]/page.tsx:38:          <Timeline items={ev.milestones.map((m) => ({ id: m.id, title: m.title, date: m.dueAt, completed: m.done }))} />
apps/web/src/app/(app)/events/[eventSlug]/proposals/new/page.tsx:62:              <li>Set payment milestones manually</li>
apps/web/src/app/(app)/proposals/[id]/page.tsx:21:      milestones: true, 
apps/web/src/app/(app)/proposals/[id]/page.tsx:132:      {proposal.milestones && proposal.milestones.length > 0 && (
apps/web/src/app/(app)/proposals/[id]/page.tsx:136:            {proposal.milestones.map((milestone) => (
apps/web/src/app/(app)/proposals/[id]/page.tsx:137:              <div key={milestone.id} className="flex items-start justify-between border-b border-slate-200 pb-3 last:border-0">
apps/web/src/app/(app)/proposals/[id]/page.tsx:139:                  <div className="font-medium">{milestone.title}</div>
apps/web/src/app/(app)/proposals/[id]/page.tsx:140:                  {milestone.description && (
apps/web/src/app/(app)/proposals/[id]/page.tsx:141:                    <div className="mt-1 text-sm text-slate-600">{milestone.description}</div>
apps/web/src/app/(app)/proposals/[id]/page.tsx:143:                  {milestone.dueDate && (
apps/web/src/app/(app)/proposals/[id]/page.tsx:145:                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
apps/web/src/app/(app)/proposals/[id]/page.tsx:148:                  {milestone.dueOffsetDays && milestone.dueOffsetDays < 0 && (
apps/web/src/app/(app)/proposals/[id]/page.tsx:150:                      Due: {Math.abs(milestone.dueOffsetDays)} days before event
apps/web/src/app/(app)/proposals/[id]/page.tsx:155:                  ${(milestone.amountCents / 100).toFixed(2)} {proposal.currency}
apps/web/src/app/(app)/proposals/[id]/fund/page.tsx:8:    include: { milestones: true, escrowAccount: true },
apps/web/src/app/(app)/proposals/[id]/fund/page.tsx:11:  const dueAmount = proposal.milestones
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:86:        milestones: { orderBy: { dueAt: "asc" } },
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:128:            milestones: { select: { id: true, status: true, amountCents: true } }
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:165:          milestones: { orderBy: { dueAt: "asc" } },
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:190:              milestones: { select: { id: true, status: true, amountCents: true } }
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:247:  // Get upcoming tasks (milestones + checklist items)
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:248:  const upcomingMilestones = event.milestones.filter((m) => !m.done && m.dueAt && new Date(m.dueAt) > new Date()).slice(0, 5);
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:254:  // Get payment info from milestones (Payout model doesn't have direct relation to Proposal)
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:255:  const paymentsDue = event.proposals.flatMap((p) => p.milestones.filter((m) => m.status === "PENDING")).length;
apps/web/src/app/(app)/vault/[eventSlug]/page.tsx:256:  const paymentsReceived = event.proposals.flatMap((p) => p.milestones.filter((m) => m.status === "PAID")).length;
apps/web/src/app/(app)/vault/page.tsx:66:          milestones: { select: { id: true, title: true, dueAt: true, done: true }, orderBy: { dueAt: "asc" } },
apps/web/src/app/(app)/vault/page.tsx:122:            const upcoming = ev.milestones.find((m) => !m.done) || null;
apps/web/src/app/(app)/vault/page.tsx:198:                        <div className="text-slate-500">No upcoming milestones</div>
apps/web/src/app/(app)/vault/page.tsx:230:                  .flatMap((ev) => ev.milestones.filter((m) => !m.done).map((m) => ({ ev, m })))
apps/web/src/app/features/page.tsx:41:      description: "Never miss a deadline. Create checklists, assign tasks, set milestones, and track progress automatically.",
apps/web/src/app/api/payments/release-milestone/route.ts:13:  milestoneId: z.string(),
apps/web/src/app/api/payments/release-milestone/route.ts:21:  let body: { milestoneId?: string } | null = null;
apps/web/src/app/api/payments/release-milestone/route.ts:26:      logger.warn({ route: "/api/payments/release-milestone" }, "Unauthorized milestone release attempt");
apps/web/src/app/api/payments/release-milestone/route.ts:31:    const { milestoneId } = releaseMilestoneSchema.parse(body);
apps/web/src/app/api/payments/release-milestone/route.ts:33:    logger.debug({ userId: user.id, milestoneId, route: "/api/payments/release-milestone" }, "Milestone release started");
apps/web/src/app/api/payments/release-milestone/route.ts:35:    // Fetch milestone with proposal, contract, event, and organization
apps/web/src/app/api/payments/release-milestone/route.ts:36:    const milestone = await prisma.paymentMilestone.findUnique({
apps/web/src/app/api/payments/release-milestone/route.ts:37:      where: { id: milestoneId },
apps/web/src/app/api/payments/release-milestone/route.ts:63:    if (!milestone) {
apps/web/src/app/api/payments/release-milestone/route.ts:67:    // Idempotency guard: if milestone is already PAID, return success
apps/web/src/app/api/payments/release-milestone/route.ts:68:    if (milestone.status === "PAID") {
apps/web/src/app/api/payments/release-milestone/route.ts:71:        where: { milestoneId: milestone.id },
apps/web/src/app/api/payments/release-milestone/route.ts:82:    // Verify milestone is in escrow
apps/web/src/app/api/payments/release-milestone/route.ts:84:    if ((milestone.status as string) !== "IN_ESCROW") {
apps/web/src/app/api/payments/release-milestone/route.ts:89:    const contract = milestone.proposal.contract;
apps/web/src/app/api/payments/release-milestone/route.ts:94:    const event = milestone.proposal.event;
apps/web/src/app/api/payments/release-milestone/route.ts:106:    const escrowAccount = milestone.proposal.escrowAccount;
apps/web/src/app/api/payments/release-milestone/route.ts:107:    if (!escrowAccount || escrowAccount.balanceCents < milestone.amountCents) {
apps/web/src/app/api/payments/release-milestone/route.ts:113:    const sellerOrg = milestone.proposal.org;
apps/web/src/app/api/payments/release-milestone/route.ts:118:      // Re-check milestone status within transaction
apps/web/src/app/api/payments/release-milestone/route.ts:120:        where: { id: milestoneId },
apps/web/src/app/api/payments/release-milestone/route.ts:130:          where: { milestoneId: milestone.id },
apps/web/src/app/api/payments/release-milestone/route.ts:137:      // Create payout record (unique constraint on milestoneId prevents duplicates)
apps/web/src/app/api/payments/release-milestone/route.ts:140:          proposalId: milestone.proposalId,
apps/web/src/app/api/payments/release-milestone/route.ts:141:          milestoneId: milestone.id,
apps/web/src/app/api/payments/release-milestone/route.ts:142:          listingId: milestone.proposal.listingId || undefined,
apps/web/src/app/api/payments/release-milestone/route.ts:144:          amountCents: milestone.amountCents,
apps/web/src/app/api/payments/release-milestone/route.ts:154:            amount: milestone.amountCents,
apps/web/src/app/api/payments/release-milestone/route.ts:155:            currency: milestone.proposal.currency.toLowerCase(),
apps/web/src/app/api/payments/release-milestone/route.ts:159:              milestoneId: milestone.id,
apps/web/src/app/api/payments/release-milestone/route.ts:160:              proposalId: milestone.proposalId,
apps/web/src/app/api/payments/release-milestone/route.ts:178:      // Update milestone status
apps/web/src/app/api/payments/release-milestone/route.ts:180:        where: { id: milestoneId },
apps/web/src/app/api/payments/release-milestone/route.ts:188:          balanceCents: { decrement: milestone.amountCents },
apps/web/src/app/api/payments/release-milestone/route.ts:189:          status: escrowAccount.balanceCents === milestone.amountCents ? "RELEASED" : "PARTIALLY_RELEASED",
apps/web/src/app/api/payments/release-milestone/route.ts:193:      // Update contract status if all milestones are paid
apps/web/src/app/api/payments/release-milestone/route.ts:196:        where: { proposalId: milestone.proposalId },
apps/web/src/app/api/payments/release-milestone/route.ts:212:            proposalId: milestone.proposalId,
apps/web/src/app/api/payments/release-milestone/route.ts:213:            milestoneId: milestone.id,
apps/web/src/app/api/payments/release-milestone/route.ts:214:            amountCents: milestone.amountCents,
apps/web/src/app/api/payments/release-milestone/route.ts:215:            currency: milestone.proposal.currency,
apps/web/src/app/api/payments/release-milestone/route.ts:222:              escrowBalanceAfter: escrowAccount.balanceCents - milestone.amountCents,
apps/web/src/app/api/payments/release-milestone/route.ts:231:            proposalId: milestone.proposalId,
apps/web/src/app/api/payments/release-milestone/route.ts:232:            milestoneId: milestone.id,
apps/web/src/app/api/payments/release-milestone/route.ts:233:            amountCents: milestone.amountCents,
apps/web/src/app/api/payments/release-milestone/route.ts:234:            currency: milestone.proposal.currency,

## Stripe integration references

apps/web/src/app/api/payments/release-milestone/route.ts:6:import { stripe } from "@/server/lib/stripe";
apps/web/src/app/api/payments/release-milestone/route.ts:114:    const sellerStripeAccountId = null; // Placeholder: should fetch from Organization.stripeConnectAccountId
apps/web/src/app/api/payments/release-milestone/route.ts:150:      let stripeTransferId: string | undefined;
apps/web/src/app/api/payments/release-milestone/route.ts:151:      if (sellerStripeAccountId && stripe) {
apps/web/src/app/api/payments/release-milestone/route.ts:153:          const transfer = await stripe.transfers.create({
apps/web/src/app/api/payments/release-milestone/route.ts:164:          stripeTransferId = transfer.id;
apps/web/src/app/api/payments/release-milestone/route.ts:168:              stripeTransfer: transfer.id,
apps/web/src/app/api/payments/release-milestone/route.ts:172:        } catch (stripeError) {
apps/web/src/app/api/payments/release-milestone/route.ts:173:          console.error("Stripe transfer error:", stripeError);
apps/web/src/app/api/payments/release-milestone/route.ts:207:      // Create MoneyTx entry for the release (unique constraint on stripeId prevents duplicates if transfer exists)
apps/web/src/app/api/payments/release-milestone/route.ts:208:      if (stripeTransferId) {
apps/web/src/app/api/payments/release-milestone/route.ts:216:            stripeId: stripeTransferId,
apps/web/src/app/api/payments/release-milestone/route.ts:227:        // Create MoneyTx without stripeId if no transfer
apps/web/src/app/api/payments/release-milestone/route.ts:246:      return { payout, contractStatusBefore, allPaid, stripeTransferId };
apps/web/src/app/api/payments/release-milestone/route.ts:258:    const { payout, contractStatusBefore, allPaid, stripeTransferId } = result;
apps/web/src/app/api/payments/release-milestone/route.ts:274:        stripeTransferId: stripeTransferId || payout.stripeTransfer,
apps/web/src/app/api/payments/release-milestone/route.ts:295:        stripeTransferId: stripeTransferId || payout.stripeTransfer,
apps/web/src/app/api/payments/confirm/route.ts:5:import { stripe } from "@/server/lib/stripe";
apps/web/src/app/api/payments/confirm/route.ts:63:    if (!stripe) {
apps/web/src/app/api/payments/confirm/route.ts:68:    const stripeIntent = await stripe.paymentIntents.retrieve(paymentIntent.stripeIntentId || "");
apps/web/src/app/api/payments/confirm/route.ts:69:    if (!stripeIntent) {
apps/web/src/app/api/payments/confirm/route.ts:73:    if (stripeIntent.status !== "succeeded") {
apps/web/src/app/api/payments/confirm/route.ts:129:          paymentMethod: stripeIntent.payment_method_types?.[0] || "card",
apps/web/src/app/api/payments/confirm/route.ts:168:          stripeChargeId: stripeIntent.latest_charge as string | undefined,
apps/web/src/app/api/payments/confirm/route.ts:196:          stripeChargeId: stripeIntent.latest_charge as string | undefined,
apps/web/src/app/api/payments/create-intent/route.ts:5:import { getStripeOrThrow } from "@/server/lib/stripe";
apps/web/src/app/api/payments/create-intent/route.ts:104:    if (existingPaymentIntent && existingPaymentIntent.stripeIntentId) {
apps/web/src/app/api/payments/create-intent/route.ts:106:      const stripe = getStripeOrThrow();
apps/web/src/app/api/payments/create-intent/route.ts:107:      const existingStripeIntent = await stripe.paymentIntents.retrieve(existingPaymentIntent.stripeIntentId);
apps/web/src/app/api/payments/create-intent/route.ts:122:    const stripe = getStripeOrThrow();
apps/web/src/app/api/payments/create-intent/route.ts:123:    const stripeIntent = await stripe.paymentIntents.create(
apps/web/src/app/api/payments/create-intent/route.ts:143:    // Use upsert to handle race conditions (unique constraint on stripeIntentId will prevent duplicates)
apps/web/src/app/api/payments/create-intent/route.ts:145:      where: { stripeIntentId: stripeIntent.id },
apps/web/src/app/api/payments/create-intent/route.ts:155:        stripeIntentId: stripeIntent.id,
apps/web/src/app/api/payments/create-intent/route.ts:160:    if (!escrowAccount.stripeIntent) {
apps/web/src/app/api/payments/create-intent/route.ts:163:        data: { stripeIntent: stripeIntent.id },
apps/web/src/app/api/payments/create-intent/route.ts:169:      clientSecret: stripeIntent.client_secret,
apps/web/src/app/api/health/route.ts:31:          stripe: "error" as const,
apps/web/src/app/api/events/[eventSlug]/deposits/route.ts:5:import { getStripeOrThrow } from "@/server/lib/stripe";
apps/web/src/app/api/events/[eventSlug]/deposits/route.ts:66:    const stripe = getStripeOrThrow();
apps/web/src/app/api/events/[eventSlug]/deposits/route.ts:67:    const paymentIntent = await stripe.paymentIntents.create({
apps/web/src/app/api/events/[eventSlug]/deposits/route.ts:88:        stripePaymentIntentId: paymentIntent.id,
apps/web/src/app/api/stripe/webhook/route.ts:2:import { stripe } from "@/server/lib/stripe";
apps/web/src/app/api/stripe/webhook/route.ts:4:import type Stripe from "stripe";
apps/web/src/app/api/stripe/webhook/route.ts:10:  if (!stripe) {
apps/web/src/app/api/stripe/webhook/route.ts:14:  const signature = req.headers.get("stripe-signature");
apps/web/src/app/api/stripe/webhook/route.ts:20:    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
apps/web/src/app/api/stripe/webhook/route.ts:50:                stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:55:            // Find deposit by stripePaymentIntentId
apps/web/src/app/api/stripe/webhook/route.ts:57:              where: { stripePaymentIntentId: intent.id },
apps/web/src/app/api/stripe/webhook/route.ts:63:              if (!stripe) {
apps/web/src/app/api/stripe/webhook/route.ts:66:              const charges = await stripe.paymentIntents.retrieve(intent.id, {
apps/web/src/app/api/stripe/webhook/route.ts:75:                  stripeChargeId: chargeId || null,
apps/web/src/app/api/stripe/webhook/route.ts:90:                  stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:91:                  stripeChargeId: chargeId,
apps/web/src/app/api/stripe/webhook/route.ts:92:                  source: "stripe_webhook",
apps/web/src/app/api/stripe/webhook/route.ts:102:                stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:103:                route: "/api/stripe/webhook",
apps/web/src/app/api/stripe/webhook/route.ts:121:              stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:126:          // Lookup escrow by stripe intent id
apps/web/src/app/api/stripe/webhook/route.ts:128:            where: { stripeIntent: intent.id },
apps/web/src/app/api/stripe/webhook/route.ts:142:            // Create MoneyTx (unique constraint on stripeId prevents duplicates)
apps/web/src/app/api/stripe/webhook/route.ts:149:                stripeId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:165:                stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:166:                stripeCustomerId: intent.customer as string | undefined,
apps/web/src/app/api/stripe/webhook/route.ts:169:                source: "stripe_webhook",
apps/web/src/app/api/stripe/webhook/route.ts:181:              stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:182:              route: "/api/stripe/webhook",
apps/web/src/app/api/stripe/webhook/route.ts:204:                stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:209:            // Find deposit by stripePaymentIntentId
apps/web/src/app/api/stripe/webhook/route.ts:211:              where: { stripePaymentIntentId: intent.id },
apps/web/src/app/api/stripe/webhook/route.ts:234:                  stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:236:                  source: "stripe_webhook",
apps/web/src/app/api/stripe/webhook/route.ts:246:                stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:248:                route: "/api/stripe/webhook",
apps/web/src/app/api/stripe/webhook/route.ts:266:              stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:272:            where: { stripeIntent: intent.id },
apps/web/src/app/api/stripe/webhook/route.ts:289:                stripeIntentId: intent.id,
apps/web/src/app/api/stripe/webhook/route.ts:290:                stripeCustomerId: intent.customer as string | undefined,
apps/web/src/app/api/stripe/webhook/route.ts:292:                source: "stripe_webhook",

## Prisma: ShortlistItem + Listing models (excerpt)

### ShortlistItem block
295:  tasks           Task[]
296:  checklists      Checklist[]
297:  milestones      Milestone[]
298:  budgetLines     BudgetLine[]
299:  activities      Activity[]
300:  media           Media[]
301:  bookingRequests BookingRequest[]
302:  proposals       Proposal[]
303:  contracts       Contract[]
304:  escrowAccounts  EscrowAccount[]
305:  threads         Thread[]
306:  disputes        Dispute[]
307:  calendarEvents  CalendarEvent[]
308:  guestLists      GuestList[]
309:  seatingPlans    SeatingPlan[]
310:  invitations     Invitation[]
311:  shortlistItems  ShortlistItem[]
312:  stakeholders    EventStakeholder[]
313:  shares          EventShare[]
314:  deposits        Deposit[]
315:}
316:
317:model ShortlistItem {
318:  id        String   @id @default(cuid())
319:  eventId   String
320:  listingId String // Links to Listing (vendor or venue)
321:  createdAt DateTime @default(now())
322:  notes     String? // Optional user notes about why this vendor/venue was shortlisted
323:
324:  event   Event   @relation(fields: [eventId], references: [id], onDelete: Cascade)
325:  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
326:
327:  @@unique([eventId, listingId])
328:  @@index([eventId])
329:}
330:
331:enum EventType {
332:  WEDDING
333:  CORPORATE_GALA
334:  FUNDRAISER
335:  BIRTHDAY
336:  CONFERENCE
337:  FESTIVAL
338:  SPORTS
339:  OTHER
340:}
341:
342:enum EventStatus {
343:  PLANNING
344:  ACTIVE
345:  ON_HOLD
346:  COMPLETED
347:  CANCELED
348:}
349:
350:enum EventStakeholderRole {
351:  CLIENT
352:  STAKEHOLDER
353:}
354:
355:// Phase 1: Event-scoped client relationship model

### Listing block
515:  title     String
516:  body      String?
517:  read      Boolean      @default(false)
518:  link      String?
519:  createdAt DateTime     @default(now())
520:  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
521:  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
522:}
523:
524:// Wave 4: Marketplace & Booking
525:
526:model Listing {
527:  id              String             @id @default(cuid())
528:  createdAt       DateTime           @default(now())
529:  updatedAt       DateTime           @updatedAt
530:  orgId           String
531:  slug            String             @unique
532:  title           String
533:  type            ListingType
534:  category        ListingCategory
535:  description     String?
536:  website         String?
537:  phone           String?
538:  email           String?
539:  minGuests       Int?
540:  maxGuests       Int?
541:  priceTier       Int?
542:  street          String?
543:  city            String?
544:  state           String?
545:  country         String?            @default("US")
546:  postalCode      String?
547:  latitude        Float?
548:  longitude       Float?
549:  coverImageUrl   String?
550:  ratingAvg       Float              @default(0)
551:  ratingCount     Int                @default(0)
552:  org             Organization       @relation(fields: [orgId], references: [id], onDelete: Cascade)
553:  tags            ListingTag[]
554:  gallery         Media[]
555:  availSlots      AvailabilitySlot[]
556:  offers          Offer[]
557:  reviews         Review[]
558:  bookingRequests BookingRequest[]
559:  proposals       Proposal[]
560:  threads         Thread[]
561:  shortlistItems  ShortlistItem[]
562:}
563:
564:enum ListingType {
565:  VENDOR
566:  VENUE
567:}
568:
569:enum ListingCategory {
570:  VENUE_SPACE
571:  CATERING
572:  DECOR_FLORAL
573:  ENTERTAINMENT
574:  PHOTO_VIDEO
575:  TRANSPORT
576:  STAFFING
577:  PLANNING_SERVICES
578:  RENTALS
579:  OTHER
580:}
581:
582:model ListingTag {
583:  id        String  @id @default(cuid())
584:  listingId String
585:  value     String
586:  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
587:
588:  @@index([value])
589:}
590:
591:model Media {
592:  id        String   @id @default(cuid())
593:  listingId String?
594:  eventId   String?
595:  url       String

## Vault Page Key Sections (excerpt)

### Imports + top of file
1:import { Card, Button } from "@/components/ui";
2:import { prisma } from "@/lib/prisma";
3:import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
4:import { canManageEvent, canEditEvent, canDeleteEvent, isPlanner, canAccessDashboard } from "@/lib/rbac";
5:import { redirect, notFound } from "next/navigation";
6:import Link from "next/link";
7:import {
8:  Calendar,
9:  CheckCircle2,
10:  Clock,
11:  Users,
12:  Bell,
13:  Lightbulb,
14:  FileCheck,
15:  CreditCard,
16:  FileText,
17:} from "lucide-react";
18:import { GenerateProposalButton } from "@/components/proposals/GenerateProposalButton";
19:import { EventActions } from "@/components/events/EventActions";
20:import { ShareEventButton } from "@/components/events/ShareEventButton";
21:import { ManageStakeholders } from "@/components/events/ManageStakeholders";
22:import { getVaultBasePath, eventBudget, eventGuests, eventChecklists, proposalDetail, vaultDetail } from "@/lib/routes";
23:
24:export default async function EventVaultDetailPage({ params }: { params: { eventSlug: string } }) {
25:  const user = await getCurrentUser();
26:  
27:  // Debug logging
28:  console.log("[Event Vault Detail] Page load started", {
29:    eventSlug: params.eventSlug,
30:    hasUser: !!user,
31:    userId: user?.id,
32:    userRole: user?.role,
33:  });
34:  
35:  if (!user) {
36:    console.warn("[Event Vault Detail] No user found, redirecting to signin");
37:    // Use generic redirect - will be handled by role-specific routes
38:    redirect("/signin?redirect=/app/vault" as any);
39:  }
40:  const userId = user.id;
41:
42:  // Legacy route protection: Redirect planners to their role-specific vault detail
43:  // This ensures planners never use the legacy /app/vault/[slug] route
44:  if (canAccessDashboard(user, "DIY_PLANNER") || canAccessDashboard(user, "PRO_PLANNER")) {
45:    const roleSpecificVaultDetail = vaultDetail(user.role, params.eventSlug);
46:    console.log("[Event Vault Detail] Redirecting planner from legacy route to:", roleSpecificVaultDetail);
47:    redirect(roleSpecificVaultDetail);
48:  }
49:
50:  // Phase 0: Security hardening - Block CLIENT users from accessing planner vault
51:  if (user.role === "CLIENT") {
52:    console.warn("[Event Vault Detail] CLIENT user attempted to access planner vault, redirecting");
53:    redirect("/app");
54:  }
55:
56:  // Determine vault base path based on user role using centralized helper
57:  const vaultBasePath = getVaultBasePath(user.role);
58:
59:  let event;
60:  try {
61:    event = await prisma.event.findFirst({
62:      where: { slug: params.eventSlug },
63:      include: {
64:        createdBy: { select: { name: true, email: true } },
65:        org: {
66:          include: {
67:            owner: { select: { name: true, email: true } },
68:            members: {
69:              where: { userId: userId },
70:              include: { user: { select: { name: true, email: true } } },
71:            },
72:          },
73:        },
74:        // Phase 1: Include stakeholders for event-scoped client access
75:        stakeholders: {
76:          include: {
77:            user: { select: { id: true, name: true, email: true } },
78:          },
79:        },
80:        // Phase 2: Include shares for sharing/forwarding

### Event query include block (approx lines 80-220)
80:        // Phase 2: Include shares for sharing/forwarding
81:        shares: {
82:          select: { viewerUserId: true, scope: true },
83:          where: { scope: "SUMMARY" },
84:        },
85:        budgetLines: { select: { plannedCents: true, actualCents: true, category: true } },
86:        milestones: { orderBy: { dueAt: "asc" } },
87:        checklists: { 
88:          include: { items: { select: { id: true, done: true, title: true } } },
89:          orderBy: { title: "asc" } 
90:        },
91:        guestLists: {
92:          include: {
93:            guests: { include: { invitations: { select: { respondedAt: true, sentAt: true } } } },
94:          },
95:        },
96:        bookingRequests: {
97:          include: { 
98:            listing: { 
99:              select: { 
100:                id: true,
101:                title: true,
102:                type: true,
103:                category: true,
104:              } 
105:            } 
106:          },
107:          orderBy: { createdAt: "desc" },
108:        },
109:        shortlistItems: {
110:          include: {
111:            listing: {
112:              include: {
113:                org: {
114:                  select: {
115:                    id: true,
116:                    name: true,
117:                    city: true,
118:                    state: true,
119:                  },
120:                },
121:              },
122:            },
123:          },
124:          orderBy: { createdAt: "desc" },
125:        },
126:        proposals: { 
127:          include: { 
128:            milestones: { select: { id: true, status: true, amountCents: true } }
129:          }, 
130:          orderBy: { createdAt: "desc" } 
131:        },
132:        activities: { orderBy: { at: "desc" }, take: 20 },
133:      },
134:    });
135:  } catch (error) {
136:    console.error("[Vault] Error loading event:", error);
137:    // If it's a Prisma relation error (e.g., shortlistItems not in schema), try without it
138:    if (error instanceof Error && error.message.includes("shortlistItems")) {
139:      console.warn("[Vault] Retrying without shortlistItems relation...");
140:      event = await prisma.event.findFirst({
141:        where: { slug: params.eventSlug },
142:        include: {
143:          createdBy: { select: { name: true, email: true } },
144:          org: {
145:            include: {
146:              owner: { select: { name: true, email: true } },
147:              members: {
148:                where: { userId: userId },
149:                include: { user: { select: { name: true, email: true } } },
150:              },
151:            },
152:          },
153:          // Phase 1: Include stakeholders for event-scoped client access
154:          stakeholders: {
155:            include: {
156:              user: { select: { id: true, name: true, email: true } },
157:            },
158:          },
159:          // Phase 2: Include shares for sharing/forwarding
160:          shares: {
161:            select: { viewerUserId: true, scope: true },
162:            where: { scope: "SUMMARY" },
163:          },
164:          budgetLines: { select: { plannedCents: true, actualCents: true, category: true } },
165:          milestones: { orderBy: { dueAt: "asc" } },
166:          checklists: { 
167:            include: { items: { select: { id: true, done: true, title: true } } },
168:            orderBy: { title: "asc" } 
169:          },
170:          guestLists: {
171:            include: {
172:              guests: { include: { invitations: { select: { respondedAt: true, sentAt: true } } } },
173:            },
174:          },
175:          bookingRequests: {
176:            include: { 
177:              listing: { 
178:                select: { 
179:                  id: true,
180:                  title: true,
181:                  type: true,
182:                  category: true,
183:                } 
184:              } 
185:            },
186:            orderBy: { createdAt: "desc" },
187:          },
188:          proposals: { 
189:            include: { 
190:              milestones: { select: { id: true, status: true, amountCents: true } }
191:            }, 
192:            orderBy: { createdAt: "desc" } 
193:          },
194:          activities: { orderBy: { at: "desc" }, take: 20 },
195:        },
196:      });
197:    } else {
198:      throw error;
199:    }
200:  }
201:
202:  if (!event) {
203:    console.warn("[Event Vault Detail] Event not found:", params.eventSlug);
204:    return notFound();
205:  }
206:
207:  console.log("[Event Vault Detail] Event found:", {
208:    eventId: event.id,
209:    eventName: event.name,
210:    orgId: event.orgId,
211:    createdById: event.createdById,
212:  });
213:
214:  // Check access using RBAC helpers
215:  const canManage = canManageEvent(user, event);
216:  const canEdit = canEditEvent(user, event);
217:  const canDelete = canDeleteEvent(user, event);
218:  
219:  console.log("[Event Vault Detail] Access check:", {
220:    userId,

### Shortlist + proposals section (approx lines 580-740)
580:          <Card className="p-6">
581:            <h3 className="text-base font-semibold mb-4">Event Details</h3>
582:            <div className="space-y-3 text-sm">
583:              <div>
584:                <div className="text-xs text-slate-500">Event Type</div>
585:                <div className="font-medium">{event.type.replace(/_/g, " ")}</div>
586:              </div>
587:              <div>
588:                <div className="text-xs text-slate-500">Location</div>
589:                <div className="font-medium">{event.venueCity || "—"}, {event.venueState || ""}</div>
590:              </div>
591:              <div>
592:                <div className="text-xs text-slate-500">Expected Guests</div>
593:                <div className="font-medium">{event.guestTarget || "—"}</div>
594:              </div>
595:              {event.objective && (
596:                <div>
597:                  <div className="text-xs text-slate-500">Objective</div>
598:                  <div className="font-medium">{event.objective}</div>
599:                </div>
600:              )}
601:            </div>
602:          </Card>
603:
604:          <Card className="p-6">
605:            <h3 className="text-base font-semibold mb-4">Quick Actions</h3>
606:            <div className="space-y-2">
607:              <Button asChild variant="secondary" className="w-full justify-start">
608:                <Link href={eventGuests(user.role, params.eventSlug) as any}>Manage Guest List</Link>
609:              </Button>
610:              <Button asChild variant="secondary" className="w-full justify-start">
611:                <Link href={eventBudget(user.role, params.eventSlug) as any}>View Budget</Link>
612:              </Button>
613:              <Button asChild variant="secondary" className="w-full justify-start">
614:                <Link href={eventChecklists(user.role, params.eventSlug) as any}>Checklists</Link>
615:              </Button>
616:            </div>
617:          </Card>
618:
619:          <Card className="p-6">
620:            <div className="mb-4 flex items-center justify-between">
621:              <h3 className="text-base font-semibold flex items-center gap-2">
622:                <FileText className="w-4 h-4" /> Proposals
623:              </h3>
624:              <div className="flex gap-2">
625:                {/* Generate generic proposal (no vendor/venue) */}
626:                <GenerateProposalButton eventId={event.id} />
627:              </div>
628:            </div>
629:            <div className="space-y-4">
630:              {/* Show shortlist items with option to generate proposals */}
631:              {('shortlistItems' in event && event.shortlistItems && Array.isArray(event.shortlistItems) && event.shortlistItems.length > 0) ? (
632:                <div className="mb-4">
633:                  <h4 className="text-sm font-medium mb-2 text-slate-700">Generate Proposals from Shortlist:</h4>
634:                  <div className="space-y-2">
635:                    {(event.shortlistItems as any[]).map((item: any) => (
636:                      <div key={item.id} className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 p-3">
637:                        <div className="flex-1">
638:                          <div className="text-sm font-medium">{item.listing.title}</div>
639:                          <div className="text-xs text-slate-500 mt-1">
640:                            {item.listing.type === "VENUE" ? "Venue" : "Vendor"} • {item.listing.category}
641:                            {item.listing.org.city && ` • ${item.listing.org.city}, ${item.listing.org.state}`}
642:                          </div>
643:                          {item.notes && (
644:                            <div className="text-xs text-slate-400 mt-1 italic">{item.notes}</div>
645:                          )}
646:                        </div>
647:                        <GenerateProposalButton 
648:                          eventId={event.id} 
649:                          listingId={item.listingId}
650:                        />
651:                      </div>
652:                    ))}
653:                  </div>
654:                </div>
655:              ) : null}
656:              {/* Show existing proposals */}
657:              {event.proposals.length > 0 ? (
658:                <div>
659:                  <h4 className="text-sm font-medium mb-2 text-slate-700">Existing Proposals:</h4>
660:                  <div className="space-y-2">
661:                    {event.proposals.map((proposal) => (
662:                      <div key={proposal.id} className="rounded border border-slate-200 bg-slate-50 p-3">
663:                        <div className="flex items-center justify-between">
664:                          <div>
665:                            <div className="text-sm font-medium">
666:                              <Link href={proposalDetail(proposal.id) as any} className="hover:underline">
667:                                {proposal.title}
668:                              </Link>
669:                            </div>
670:                            <div className="text-xs text-slate-500 mt-1">
671:                              Status: {proposal.status} • ${(proposal.totalCents / 100).toFixed(2)}
672:                            </div>
673:                          </div>
674:                        </div>
675:                      </div>
676:                    ))}
677:                  </div>
678:                </div>
679:              ) : (
680:                <div className="space-y-3">
681:                  {(!('shortlistItems' in event) || !event.shortlistItems || !Array.isArray(event.shortlistItems) || event.shortlistItems.length === 0) && (
682:                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
683:                      <p className="text-sm text-indigo-900 mb-2">
684:                        <strong>💡 Tip:</strong> To generate vendor/venue-specific proposals, first add vendors or venues to your shortlist.
685:                      </p>
686:                      <p className="text-xs text-indigo-700">
687:                        Browse the marketplace and add vendors/venues to your shortlist, then generate proposals from them. 
688:                        You can also generate a generic AI proposal for this event using the button above.
689:                      </p>
690:                    </div>
691:                  )}
692:                  <div className="text-sm text-slate-500">
693:                    {('shortlistItems' in event && event.shortlistItems && Array.isArray(event.shortlistItems) && event.shortlistItems.length > 0) 
694:                      ? "Select a vendor/venue above to generate a proposal, or use the button above for a generic proposal."
695:                      : "No proposals yet. Generate one to get started."}
696:                  </div>
697:                </div>
698:              )}
699:            </div>
700:          </Card>
701:        </div>
702:      </div>
703:    </div>
704:  );
705:}

---
Report saved to: DEMO_SCAN_REPORT.md

