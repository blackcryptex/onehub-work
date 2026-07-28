import { mkdirSync } from "node:fs";
import * as path from "node:path";

import { expect, test as setup, type APIRequestContext } from "@playwright/test";

type SeedRole = "PRO_PLANNER" | "DIY_PLANNER";

const authDir = path.join(process.cwd(), "e2e", ".auth");
const accounts: Array<{
  email: string;
  password: string;
  role: SeedRole;
  storageState: string;
}> = [
  {
    email: process.env.PLAYWRIGHT_PRO_EMAIL ?? "pro@example.com",
    password: process.env.PLAYWRIGHT_PRO_PASSWORD ?? "password",
    role: "PRO_PLANNER",
    storageState: path.join(authDir, "pro.json"),
  },
  {
    email: process.env.PLAYWRIGHT_DIY_EMAIL ?? "diy@example.com",
    password: process.env.PLAYWRIGHT_DIY_PASSWORD ?? "password",
    role: "DIY_PLANNER",
    storageState: path.join(authDir, "diy.json"),
  },
];

async function authenticate(request: APIRequestContext, account: (typeof accounts)[number]) {
  const csrfResponse = await request.get("/api/auth/csrf");
  expect(csrfResponse.ok(), "Auth.js CSRF endpoint should respond before credential login").toBe(true);

  const csrf = (await csrfResponse.json()) as { csrfToken?: string };
  expect(csrf.csrfToken, "Auth.js CSRF response should include csrfToken").toBeTruthy();

  const callbackUrl = new URL("/api/auth/session", process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").toString();
  const form = new URLSearchParams({
    csrfToken: csrf.csrfToken ?? "",
    email: account.email,
    password: account.password,
    callbackUrl,
  });

  const loginResponse = await request.post("/api/auth/callback/credentials", {
    data: form.toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    maxRedirects: 0,
  });

  expect(
    [200, 302, 303].includes(loginResponse.status()),
    `credential login for ${account.email} should complete without an error response`,
  ).toBe(true);

  const sessionResponse = await request.get("/api/auth/session");
  expect(sessionResponse.ok(), "Auth.js session endpoint should respond after credential login").toBe(true);

  const session = (await sessionResponse.json()) as {
    user?: { email?: string | null; role?: string | null };
  } | null;

  expect(session?.user?.email, `${account.email} should be the active session user`).toBe(account.email);
  expect(session?.user?.role, `${account.email} should carry the expected role`).toBe(account.role);
}

for (const account of accounts) {
  setup(`authenticate ${account.role}`, async ({ request }) => {
    mkdirSync(authDir, { recursive: true });

    await authenticate(request, account);
    await request.storageState({ path: account.storageState });
  });
}
