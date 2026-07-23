/**
 * Event command-center truth-state helpers.
 *
 * Shared logic for the Pro Planner event dashboard so that spine-step
 * status labels, progress math, and delete/cancel semantics stay honest
 * and consistent between the server page and client components.
 */

export type SpineState = "Done" | "Pending" | "Blocked";

/**
 * Resolve the display state of a commerce-spine step.
 * "Done" replaces the older awkward "Happened" label.
 * A step that actually happened is Done even if a downstream flag
 * marks it blocked; blocked only applies to work that has not happened.
 */
export function spineStepState(input: {
  happened: boolean;
  blocked: boolean;
}): SpineState {
  if (input.happened) return "Done";
  if (input.blocked) return "Blocked";
  return "Pending";
}

/**
 * Chip styling for a spine state.
 */
export function chipClassForSpineState(state: SpineState | string): string {
  if (state === "Done") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (state === "Blocked") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

/**
 * Blend checklist completion and commerce-spine completion into one
 * honest progress number. Avoids false 0% when real work exists in
 * either dimension: only dimensions with actual totals participate.
 */
export function computeEventProgress(input: {
  checklistDone: number;
  checklistTotal: number;
  commerceStepsDone: number;
  commerceStepsTotal: number;
}): number {
  const components: number[] = [];

  if (input.checklistTotal > 0) {
    components.push(
      Math.min(1, Math.max(0, input.checklistDone / input.checklistTotal)),
    );
  }
  if (input.commerceStepsTotal > 0) {
    components.push(
      Math.min(1, Math.max(0, input.commerceStepsDone / input.commerceStepsTotal)),
    );
  }

  if (components.length === 0) return 0;

  const blended =
    components.reduce((sum, ratio) => sum + ratio, 0) / components.length;
  return Math.min(100, Math.max(0, Math.round(blended * 100)));
}

export type EventDeleteSemantics = {
  label: string;
  busyLabel: string;
  confirmMessage: (eventName: string) => string;
};

/**
 * Safe delete semantics for events.
 * Commerce-linked events are never presented as hard delete: the server
 * cancels-and-archives them (see deleteEventWithDependents), so the UI
 * must say so up front instead of promising an irreversible delete.
 */
export function eventDeleteSemantics(commerceLinked: boolean): EventDeleteSemantics {
  if (commerceLinked) {
    return {
      label: "Cancel & archive",
      busyLabel: "Canceling...",
      confirmMessage: (eventName: string) =>
        `"${eventName}" has commerce records (proposals, contracts, or payments). It will be canceled and archived to preserve those records. Continue?`,
    };
  }

  return {
    label: "Delete",
    busyLabel: "Deleting...",
    confirmMessage: (eventName: string) =>
      `Are you sure you want to delete "${eventName}"? This action cannot be undone.`,
  };
}
