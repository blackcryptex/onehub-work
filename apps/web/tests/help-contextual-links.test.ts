import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("contextual help links", () => {
  it("links pro planner settings and messages to real help routes", () => {
    expect(source("../src/components/pro-planner/Dashboard.tsx")).toContain("/help/roles/pro-planner");
    expect(source("../src/app/(app)/messages/page.tsx")).toContain("/help/articles/pro-planner-send-message");
    expect(source("../src/app/(app)/messages/[threadId]/page.tsx")).toContain("/help/articles/pro-planner-send-message");
  });

  it("links DIY help to role, event creation, and sourcing guides", () => {
    const dashboard = source("../src/components/diy-planner/Dashboard.tsx");

    expect(dashboard).toContain("/help/roles/diy-planner");
    expect(dashboard).toContain("/help/articles/diy-create-event");
    expect(dashboard).toContain("/help/articles/source-vendors-and-venues");
  });
});
