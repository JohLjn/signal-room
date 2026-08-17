import { expect, test, type Page } from "@playwright/test";

import { resetAndSeed, TEST_PASSWORD, type SeededFixture } from "../helpers/fixtures";

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/w\/operations$/);
}

test.describe("incident Route Handlers over HTTP", () => {
  let seeded: SeededFixture;

  test.beforeEach(async () => {
    seeded = await resetAndSeed();
  });

  test("rejects unauthenticated operations", async ({ request }) => {
    const incidentUrl = `/api/workspaces/operations/incidents/${seeded.localIncident.id}`;
    const calls = [
      request.get("/api/workspaces/operations/incidents"),
      request.post("/api/workspaces/operations/incidents", { data: {} }),
      request.get(incidentUrl),
      request.patch(incidentUrl, { data: { status: "resolved" } }),
      request.post(`${incidentUrl}/comments`, { data: { body: "No session" } }),
    ];

    for (const response of await Promise.all(calls)) {
      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "UNAUTHENTICATED" },
      });
    }
  });

  test("connects an authenticated session to create, retrieve, update, and comment", async ({ page }) => {
    await signIn(page, seeded.admin.email);
    const collectionUrl = "/api/workspaces/operations/incidents";
    const createdResponse = await page.request.post(collectionUrl, {
      data: {
        title: "HTTP integration incident",
        description: "Created across the network boundary",
        status: "open",
        severity: "sev2",
        ownerId: seeded.admin.id,
      },
    });
    expect(createdResponse.status()).toBe(201);
    const created = await createdResponse.json();
    const incidentUrl = `${collectionUrl}/${created.id}`;

    const updateResponse = await page.request.patch(incidentUrl, {
      data: { status: "investigating", severity: "sev1" },
    });
    expect(updateResponse.status()).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({
      status: "investigating",
      severity: "sev1",
    });

    const commentResponse = await page.request.post(`${incidentUrl}/comments`, {
      data: { body: "Verified through the HTTP boundary" },
    });
    expect(commentResponse.status()).toBe(201);

    const loadedResponse = await page.request.get(incidentUrl);
    expect(loadedResponse.status()).toBe(200);
    const loaded = await loadedResponse.json();
    expect(loaded.comments).toEqual([
      expect.objectContaining({ body: "Verified through the HTTP boundary" }),
    ]);
    expect(loaded.activity).toHaveLength(4);
    expect(loaded.activity).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "incident_created", details: {} }),
      expect.objectContaining({
        type: "status_changed",
        details: { from: "open", to: "investigating" },
      }),
      expect.objectContaining({
        type: "severity_changed",
        details: { from: "sev2", to: "sev1" },
      }),
      expect.objectContaining({ type: "comment_added", details: {} }),
    ]));
  });

  test("enforces incident and workspace authorization", async ({ browser }) => {
    const nonOwnerContext = await browser.newContext();
    const nonOwnerPage = await nonOwnerContext.newPage();
    await signIn(nonOwnerPage, seeded.nonOwner.email);
    const localUrl = `/api/workspaces/operations/incidents/${seeded.localIncident.id}`;

    const forbidden = await nonOwnerPage.request.patch(localUrl, {
      data: { status: "closed" },
    });
    expect(forbidden.status()).toBe(403);
    await expect(forbidden.json()).resolves.toMatchObject({ error: { code: "FORBIDDEN" } });
    await nonOwnerContext.close();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, seeded.admin.email);
    const foreignCollection = "/api/workspaces/other-workspace/incidents";
    const foreignIncident = `${foreignCollection}/${seeded.foreignIncident.id}`;
    const hiddenResponses = await Promise.all([
      adminPage.request.get(foreignCollection),
      adminPage.request.get(foreignIncident),
      adminPage.request.patch(foreignIncident, { data: { status: "closed" } }),
      adminPage.request.post(`${foreignIncident}/comments`, { data: { body: "Hidden" } }),
    ]);

    for (const response of hiddenResponses) {
      expect(response.status()).toBe(404);
      await expect(response.json()).resolves.toMatchObject({ error: { code: "NOT_FOUND" } });
    }
    await adminContext.close();
  });

  test("rejects malformed JSON and invalid domain values", async ({ page }) => {
    await signIn(page, seeded.admin.email);
    const collectionUrl = "/api/workspaces/operations/incidents";
    const malformed = await page.request.post(collectionUrl, {
      data: "{",
      headers: { "content-type": "application/json" },
    });
    expect(malformed.status()).toBe(400);

    const invalidCreate = await page.request.post(collectionUrl, {
      data: {
        title: "",
        description: "Invalid",
        status: "unknown",
        severity: "sev9",
        ownerId: seeded.admin.id,
      },
    });
    expect(invalidCreate.status()).toBe(400);

    const invalidUpdate = await page.request.patch(
      `${collectionUrl}/${seeded.localIncident.id}`,
      { data: { status: "unknown" } },
    );
    expect(invalidUpdate.status()).toBe(400);

    const emptyComment = await page.request.post(
      `${collectionUrl}/${seeded.localIncident.id}/comments`,
      { data: { body: "   " } },
    );
    expect(emptyComment.status()).toBe(400);
  });
});
