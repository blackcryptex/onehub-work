import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import TaskList from "../src/components/tasks/TaskList";

const tasks = [{
  id: "task-1",
  title: "Confirm timeline",
  due: "2027-05-01T12:00:00.000Z",
  done: false,
  assignee: "Unassigned",
  assigneeId: undefined,
  priority: "high" as const,
}];

const baseProps = {
  tasks,
  milestones: [],
  filters: {},
  onToggle: vi.fn(),
  onFilterChange: vi.fn(),
  onJumpToMilestone: vi.fn(),
};

describe("TaskList assistant assignment UI", () => {
  it("renders a team member assignee picker and persists selected assignee ids", () => {
    const onEdit = vi.fn();

    render(
      <React.StrictMode>
        <TaskList
          {...baseProps}
          onEdit={onEdit}
          teamMembers={[{ id: "assistant-1", label: "Avery Assistant", staffRole: "ASSISTANT" }]}
          canAssignTasks
        />
      </React.StrictMode>,
    );

    expect(screen.getByText("Assigned to: Unassigned")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Assign Confirm timeline"), { target: { value: "assistant-1" } });

    expect(onEdit).toHaveBeenCalledWith("task-1", {
      assigneeId: "assistant-1",
      assignee: "Avery Assistant",
    });
  });

  it("can render assigned task status controls without unsafe assignment controls", () => {
    render(
      <React.StrictMode>
        <TaskList
          {...baseProps}
          onEdit={vi.fn()}
          currentUserMode="assistant"
          canAssignTasks={false}
        />
      </React.StrictMode>,
    );

    expect(screen.getByText("My assigned task controls")).toBeInTheDocument();
    expect(screen.queryByLabelText("Assign Confirm timeline")).not.toBeInTheDocument();
  });
});
