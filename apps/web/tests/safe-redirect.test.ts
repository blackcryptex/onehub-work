import { describe, expect, it } from "vitest";

import { sanitizeLocalRedirect } from "../src/lib/safe-redirect";

describe("safe auth redirects", () => {
  it.each([
    "https://evil.test/phish",
    "//evil.test/phish",
    "/\\evil.test/phish",
    "javascript:alert(1)",
    "",
  ])("falls back for unsafe callback redirect %s", (input) => {
    expect(sanitizeLocalRedirect(input, "/app")).toBe("/app");
  });

  it("keeps safe local paths with query and hash", () => {
    expect(sanitizeLocalRedirect("/events/new?createEvent=true#top", "/app")).toBe("/events/new?createEvent=true#top");
  });
});
