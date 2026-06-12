export type EventDeleteUiResult =
  | { action: "deleted"; archived: false; message?: string }
  | { action: "canceled"; archived: true; message?: string };

export type EventDeleteUiEvent = {
  id: string;
  status: string;
};

const DEFAULT_DELETED_MESSAGE = "Event deleted successfully.";
const DEFAULT_CANCELED_MESSAGE =
  "This commerce-linked event was canceled and archived instead of deleted to preserve commerce records.";

type RawEventDeleteResponse = {
  action?: unknown;
  archived?: unknown;
  message?: unknown;
};

export function parseEventDeleteResult(raw: RawEventDeleteResponse | null | undefined): EventDeleteUiResult {
  if (raw?.action === "canceled" || raw?.archived === true) {
    return {
      action: "canceled",
      archived: true,
      message: typeof raw.message === "string" ? raw.message : DEFAULT_CANCELED_MESSAGE,
    };
  }

  return {
    action: "deleted",
    archived: false,
    message: typeof raw?.message === "string" ? raw.message : DEFAULT_DELETED_MESSAGE,
  };
}

export function eventDeleteResultMessage(result: EventDeleteUiResult): string {
  if (result.action === "canceled") {
    return result.message || DEFAULT_CANCELED_MESSAGE;
  }

  return result.message || DEFAULT_DELETED_MESSAGE;
}

export function applyEventDeleteResult<TEvent extends EventDeleteUiEvent>(
  events: TEvent[],
  eventId: string,
  result: Pick<EventDeleteUiResult, "action" | "archived">,
): TEvent[] {
  if (result.action === "canceled" || result.archived) {
    return events.map((event) =>
      event.id === eventId
        ? {
            ...event,
            status: "CANCELED",
          }
        : event,
    );
  }

  return events.filter((event) => event.id !== eventId);
}
