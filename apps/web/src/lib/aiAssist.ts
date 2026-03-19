export type AssistKind =
  | "vendors"
  | "proposal"
  | "contract"
  | "guests"
  | "tasks"
  | "milestones"
  | "overview";

export interface AIAssistResult {
  ok: boolean;
  message: string;
}

export async function aiAssist(
  kind: AssistKind,
  _payload?: unknown
): Promise<AIAssistResult> {
  try {
    // TODO: Call real backend API endpoint
    // For now, stub with delay to simulate API call
    await new Promise((r) => setTimeout(r, 250));

    const messages: Record<AssistKind, string> = {
      vendors: "AI vendor suggestions generated successfully.",
      proposal: "AI proposal draft created successfully.",
      contract: "AI contract draft created successfully.",
      guests: "AI guest list generated successfully.",
      tasks: "AI task plan created successfully.",
      milestones: "AI milestone plan created successfully.",
      overview: "AI suggestions generated successfully.",
    };

    return {
      ok: true,
      message: messages[kind] || "AI Assist completed successfully.",
    };
  } catch (e) {
    return {
      ok: false,
      message: (e as Error).message || "AI Assist failed. Please try again.",
    };
  }
}

