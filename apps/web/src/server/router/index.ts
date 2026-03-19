import { router, publicProcedure } from "@/server/trpc";
import { orgRouter } from "@/server/routers/org";
import { membershipRouter } from "@/server/routers/membership";
import { inviteRouter } from "@/server/routers/invite";
import { settingsRouter } from "@/server/routers/settings";
import { flagsRouter } from "@/server/routers/flags";
import { auditRouter } from "@/server/routers/audit";
import { eventRouter } from "@/server/routers/event";
import { milestoneRouter } from "@/server/routers/milestone";
import { checklistRouter } from "@/server/routers/checklist";
import { taskRouter } from "@/server/routers/task";
import { budgetRouter } from "@/server/routers/budget";
import { activityRouter } from "@/server/routers/activity";
import { notificationRouter } from "@/server/routers/notification";
import { listingRouter } from "@/server/routers/listing";
import { availabilityRouter } from "@/server/routers/availability";
import { bookingRequestRouter } from "@/server/routers/bookingRequest";
import { reviewRouter } from "@/server/routers/review";
import { searchRouter } from "@/server/routers/search";
import { proposalRouter } from "@/server/routers/proposal";
import { contractRouter } from "@/server/routers/contract";
import { billingRouter } from "@/server/routers/billing";
import { threadRouter } from "@/server/routers/thread";
import { messageRouter } from "@/server/routers/message";
import { disputeRouter } from "@/server/routers/dispute";
import { calendarRouter } from "@/server/routers/calendar";
import { guestRouter } from "@/server/routers/guest";
import { seatingRouter } from "@/server/routers/seating";
import { adminRouter } from "@/server/routers/admin";
import { aiRouter } from "@/server/routers/ai";
import { shortlistRouter } from "@/server/routers/shortlist";
import { performHealthChecks } from "@/lib/health";

export const appRouter = router({
  health: publicProcedure.query(async () => {
    const health = await performHealthChecks();
    return {
      status: health.status,
      database: health.checks.database,
      stripe: health.checks.stripe,
      timestamp: health.timestamp,
    };
  }),
  org: orgRouter,
  membership: membershipRouter,
  invite: inviteRouter,
  settings: settingsRouter,
  flags: flagsRouter,
  audit: auditRouter,
  event: eventRouter,
  milestone: milestoneRouter,
  checklist: checklistRouter,
  task: taskRouter,
  budget: budgetRouter,
  activity: activityRouter,
  notification: notificationRouter,
  listing: listingRouter,
  availability: availabilityRouter,
  bookingRequest: bookingRequestRouter,
  review: reviewRouter,
  search: searchRouter,
  proposal: proposalRouter,
  contract: contractRouter,
  billing: billingRouter,
  thread: threadRouter,
  message: messageRouter,
  dispute: disputeRouter,
  calendar: calendarRouter,
  guest: guestRouter,
  seating: seatingRouter,
  admin: adminRouter,
  ai: aiRouter,
  shortlist: shortlistRouter,
});

export type AppRouter = typeof appRouter;
