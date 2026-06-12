import type { PrismaClient } from "@prisma/client";

type EventDeleteClient = Pick<
  PrismaClient,
  | "activity"
  | "media"
  | "thread"
  | "dispute"
  | "calendarEvent"
  | "bookingRequest"
  | "proposal"
  | "contract"
  | "escrowAccount"
  | "deposit"
  | "paymentIntent"
  | "event"
>;

type EventDeletePrisma = EventDeleteClient & {
  $transaction<T>(callback: (client: EventDeleteClient) => Promise<T>): Promise<T>;
};

export type EventDeleteResult =
  | { action: "deleted" }
  | { action: "canceled"; reason: string };

export type EventDeleteApiResponse =
  | { success: true; action: "deleted"; archived: false; message: string }
  | { success: true; action: "canceled"; archived: true; message: string };

export type EventDeleteActivityRecord = {
  eventId: string | null;
  action: "EVENT_DELETED" | "EVENT_CANCELED";
  target: string;
  meta: {
    lifecycleAction: EventDeleteResult["action"];
    archived: boolean;
    message?: string;
    preservedCommerceLinkedRecords?: boolean;
  };
};

export class EventDeleteBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventDeleteBlockedError";
  }
}

export const COMMERCE_LINKED_EVENT_DELETE_MESSAGE =
  "This commerce-linked event has proposal, contract, escrow, or payment history and was canceled instead of deleted to preserve commerce records.";

export function buildEventDeleteApiResponse(result: EventDeleteResult): EventDeleteApiResponse {
  if (result.action === "canceled") {
    return {
      success: true,
      action: "canceled",
      archived: true,
      message: result.reason,
    };
  }

  return {
    success: true,
    action: "deleted",
    archived: false,
    message: "Event deleted successfully.",
  };
}

export function buildEventDeleteActivityRecord(eventId: string, result: EventDeleteResult): EventDeleteActivityRecord {
  if (result.action === "canceled") {
    return {
      eventId,
      action: "EVENT_CANCELED",
      target: eventId,
      meta: {
        lifecycleAction: "canceled",
        archived: true,
        message: result.reason,
        preservedCommerceLinkedRecords: true,
      },
    };
  }

  return {
    eventId: null,
    action: "EVENT_DELETED",
    target: eventId,
    meta: {
      lifecycleAction: "deleted",
      archived: false,
    },
  };
}

export async function deleteEventWithDependents(
  prisma: EventDeletePrisma,
  eventId: string,
): Promise<EventDeleteResult> {
  return prisma.$transaction(async (tx) => {
    const [proposalCount, contractCount, escrowCount, depositCount, paymentIntentCount] = await Promise.all([
      tx.proposal.count({ where: { eventId } }),
      tx.contract.count({ where: { eventId } }),
      tx.escrowAccount.count({ where: { eventId } }),
      tx.deposit.count({ where: { eventId } }),
      tx.paymentIntent.count({ where: { contract: { eventId } } }),
    ]);

    const hasCommerceLinks =
      proposalCount > 0 || contractCount > 0 || escrowCount > 0 || depositCount > 0 || paymentIntentCount > 0;

    if (hasCommerceLinks) {
      await tx.event.update({
        where: { id: eventId },
        data: { status: "CANCELED" },
      });
      return { action: "canceled", reason: COMMERCE_LINKED_EVENT_DELETE_MESSAGE };
    }

    await tx.activity.updateMany({ where: { eventId }, data: { eventId: null } });
    await tx.media.updateMany({ where: { eventId }, data: { eventId: null } });
    await tx.thread.updateMany({ where: { eventId }, data: { eventId: null } });
    await tx.dispute.updateMany({ where: { eventId }, data: { eventId: null } });
    await tx.calendarEvent.updateMany({ where: { eventId }, data: { eventId: null } });

    await tx.bookingRequest.deleteMany({ where: { eventId } });

    await tx.event.delete({ where: { id: eventId } });
    return { action: "deleted" };
  });
}
