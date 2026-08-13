import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantCollaborationPanel } from "../src/components/pro-planner/AssistantCollaborationPanel";
import { AssistantTaskWorkspace } from "../src/components/pro-planner/AssistantTaskWorkspace";

const fetchMock = vi.fn();

describe("assistant collaboration persistence UI", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("creates persisted assistant invites and reloads persisted pending invites", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "invite-1", email: "existing@test.local", role: "MEMBER" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "invite-2", email: "assistant@test.local", inviteUrl: "/invites/accept/token-2" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: "invite-1", email: "existing@test.local", role: "MEMBER" },
          { id: "invite-2", email: "assistant@test.local", role: "MEMBER" },
        ],
      });

    render(<AssistantCollaborationPanel orgId="org-1" />);

    expect(await screen.findByText("existing@test.local")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Assistant email"), { target: { value: "assistant@test.local" } });
    fireEvent.click(screen.getByRole("button", { name: "Invite assistant" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/assistant-collaboration/invites?orgId=org-1", { cache: "no-store" });
      expect(fetchMock).toHaveBeenCalledWith("/api/assistant-collaboration/invites", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ orgId: "org-1", email: "assistant@test.local" }),
      }));
    });
    expect(await screen.findByText("assistant@test.local")).toBeInTheDocument();
    expect(screen.getByText("/invites/accept/token-2")).toBeInTheDocument();
  });

  it("persists task assignment changes and reloads the persisted assignee", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "task-1", title: "Confirm timeline", status: "TODO", assigneeId: null, assignee: null }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "task-1", title: "Confirm timeline", status: "TODO", assigneeId: "assistant-1", assignee: { id: "assistant-1", name: "Avery Assistant", email: "avery@test.local" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "task-1", title: "Confirm timeline", status: "TODO", assigneeId: "assistant-1", assignee: { id: "assistant-1", name: "Avery Assistant", email: "avery@test.local" } }],
      });

    render(
      <AssistantTaskWorkspace
        eventId="event-1"
        mode="planner"
        teamMembers={[{ id: "assistant-1", label: "Avery Assistant", staffRole: "ASSISTANT" }]}
      />,
    );

    expect(await screen.findByText("Assigned to: Unassigned")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Assign Confirm timeline"), { target: { value: "assistant-1" } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/assistant-collaboration/tasks/task-1", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ data: { assigneeId: "assistant-1" } }),
      }));
    });
    expect(await screen.findByText("Assigned to: Avery Assistant")).toBeInTheDocument();
  });

  it("lets assistants persist only assigned task status/checklist changes without assignment controls", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "task-1", title: "Confirm timeline", status: "TODO", assigneeId: "assistant-1", assignee: { id: "assistant-1", name: "Avery Assistant", email: "avery@test.local" } }],
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "task-1", status: "DONE", assigneeId: "assistant-1" }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "task-1", title: "Confirm timeline", status: "DONE", assigneeId: "assistant-1", assignee: { id: "assistant-1", name: "Avery Assistant", email: "avery@test.local" } }],
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "checklist-1", done: true }),
    });

    render(
      <AssistantTaskWorkspace
        eventId="event-1"
        mode="assistant"
        checklistItems={[{ id: "checklist-1", title: "Confirm rentals", done: false }]}
      />,
    );

    expect(await screen.findByText("My assigned task controls")).toBeInTheDocument();
    expect(screen.queryByLabelText("Assign Confirm timeline")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Status for Confirm timeline"), { target: { value: "DONE" } });
    fireEvent.click(screen.getByLabelText("Toggle checklist Confirm rentals"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/assistant-collaboration/tasks/task-1", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ data: { status: "DONE" } }),
      }));
      expect(fetchMock).toHaveBeenCalledWith("/api/assistant-collaboration/checklist-items/checklist-1", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ done: true }),
      }));
    });
  });
});
