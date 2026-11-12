import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const url = process.env.TEST_DATABASE_URL!;
const db = new PrismaClient({ datasources: { db: { url } } });
const prefix = `e2e-${randomUUID()}`;

test.afterAll(async () => {
  await db.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await db.$disconnect();
});

test("anonymous landing and protected page/API boundaries", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Movie");
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeEnabled();
  await page.goto("/dashboard");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.goto("/onboarding");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  for (const path of ["/api/me", "/api/fact"]) {
    const response = await page.request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  expect((await page.request.put("/api/me/movie", { data: { movie: "Alien" } })).status()).toBe(401);
  const providers = await page.request.get("/api/auth/providers");
  expect((await providers.json()).google.type).toBe("oidc");
});

test("first-time onboarding, persistence, error recovery, returning redirect, logout", async ({ page, context }) => {
  const userId = `${prefix}-${randomUUID()}`;
  const token = randomUUID();
  await db.user.create({ data: { id: userId, name: "Alex Morgan", email: `${userId}@example.com`, sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 3_600_000) } } } });
  // Real Auth.js database session fixture; no test provider or app authentication bypass exists.
  await context.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByLabel("Your favorite movie")).toBeVisible();
  await page.getByLabel("Your favorite movie").fill("  Arrival  ");
  await page.getByRole("button", { name: "Save my movie" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Arrival", exact: true })).toBeVisible();
  expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).favoriteMovie).toBe("Arrival");
  await expect(page.getByRole("region", { name: "Today’s fact" }).getByRole("alert")).toContainText("couldn’t get a fact");
  // A cached fact makes the next real API request succeed even without an OpenAI key.
  await db.fact.create({ data: { userId, movie: "Arrival", text: "A saved database fact for this browser test." } });
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("A saved database fact for this browser test.", { exact: true })).toBeVisible();
  await expect(page.getByText("Cached", { exact: true })).toBeVisible();
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  const attack = await page.request.get("/api/fact?userId=someone-else");
  expect(attack.status()).toBe(400);
  await page.getByRole("button", { name: /Log out/ }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  expect(await db.session.findUnique({ where: { sessionToken: token } })).toBeNull();
  await page.goto("/dashboard");
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
});

test("missing name/photo and stale-provider fallback are graceful", async ({ page, context }) => {
  const userId = `${prefix}-${randomUUID()}`;
  const token = randomUUID();
  await db.user.create({ data: {
    id: userId, favoriteMovie: "M",
    sessions: { create: { sessionToken: token, expires: new Date(Date.now() + 3_600_000) } },
    facts: { create: { movie: "M", text: "Your older saved fact remains available.", createdAt: new Date(Date.now() - 61_000) } },
  } });
  await context.addCookies([{ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.goto("/dashboard");
  await expect(page.getByText("Movie lover", { exact: true })).toBeVisible();
  await expect(page.getByText("Email unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("Your older saved fact remains available.", { exact: true })).toBeVisible();
  await expect(page.getByText("We couldn't refresh this time.", { exact: false })).toBeVisible();
  await expect(page.getByText("Saved earlier", { exact: true })).toBeVisible();
});

test("public preview supports onboarding, retry, and a narrow screen", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("Preview mode", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Interstellar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Try onboarding" }).click();
  await page.getByLabel("Your favorite movie").fill("Spirited Away");
  await page.getByRole("button", { name: "Save my movie" }).click();
  await expect(page.getByRole("heading", { name: "Spirited Away", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show error state" }).click();
  await expect(page.getByRole("region", { name: "Today’s fact" }).getByRole("alert")).toContainText("Sample error");
  await page.getByRole("button", { name: "Show working state" }).click();
  await expect(page.getByRole("button", { name: "New fact" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
