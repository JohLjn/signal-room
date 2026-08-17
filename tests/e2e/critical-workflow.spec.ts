import { expect, test } from "@playwright/test";

import { resetAndSeed, TEST_PASSWORD } from "../helpers/fixtures";

test("critical authenticated incident workflow", async ({ page }) => {
  const seeded = await resetAndSeed();

  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel("Email").fill(seeded.admin.email);
  await page.getByLabel("Password").fill("invalid password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.getByLabel("Email").fill(seeded.admin.email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/w\/operations$/);
  await expect(page.getByRole("heading", { name: "Operations dashboard" })).toBeVisible();

  await page.getByRole("link", { name: "New incident" }).click();
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/w\/operations$/);

  await page.getByRole("link", { name: "New incident" }).click();
  await page.getByLabel("Title").fill("Production workflow incident");
  await page.getByLabel("Description").fill("Verified through the complete application stack");
  await page.getByLabel("Status").selectOption("open");
  await page.getByLabel("Severity").selectOption("sev2");
  await page.getByLabel("Owner").selectOption({ label: seeded.admin.name });
  await page.getByRole("button", { name: "Create incident" }).click();

  await expect(page).toHaveURL(/\/w\/operations\/incidents\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Production workflow incident" })).toBeVisible();
  await expect(page.getByText("Verified through the complete application stack")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "created the incident" })).toBeVisible();

  const updateForm = page.getByRole("heading", { name: "Update incident" }).locator("..");
  await updateForm.getByLabel("Status").selectOption("investigating");
  await updateForm.getByLabel("Severity").selectOption("sev1");
  await updateForm.getByLabel("Owner").selectOption({ label: seeded.member.name });
  await updateForm.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("changed status from open to investigating")).toBeVisible();
  await expect(page.getByText("changed severity from sev2 to sev1")).toBeVisible();
  await expect(page.getByText(`changed owner from ${seeded.admin.name} to ${seeded.member.name}`)).toBeVisible();

  await page.getByRole("heading", { name: "Add comment" }).locator("..").getByRole("textbox").fill("Mitigation is in progress");
  await page.getByRole("button", { name: "Add comment" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Mitigation is in progress" })).toBeVisible();
  await expect(page.getByText("added a comment")).toBeVisible();

  await page.reload();
  await expect(page.getByText("changed status from open to investigating")).toBeVisible();
  await expect(page.getByText("changed severity from sev2 to sev1")).toBeVisible();
  await expect(page.getByText(`changed owner from ${seeded.admin.name} to ${seeded.member.name}`)).toBeVisible();
  await expect(page.getByText("added a comment")).toBeVisible();

  await page.getByRole("link", { name: "SignalRoom Dashboard" }).click();
  await expect(page).toHaveURL(/\/w\/operations$/);
  const incidentCard = page.getByRole("listitem").filter({ hasText: "Production workflow incident" });
  await expect(incidentCard).toContainText("investigating");
  await expect(incidentCard).toContainText("SEV1");
  await expect(incidentCard).toContainText(`Owned by ${seeded.member.name}`);
  const summary = page.getByRole("region", { name: "Incident summary" });
  await expect(
    summary.getByRole("article").filter({
      has: page.getByText("Investigating", { exact: true }),
    }),
  ).toContainText("1");
  await expect(
    summary.getByRole("article").filter({
      has: page.getByText("Open", { exact: true }),
    }),
  ).toContainText("1");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/w/operations");
  await expect(page).toHaveURL(/\/sign-in$/);
  const rejected = await page.request.get("/api/workspaces/operations/incidents");
  expect(rejected.status()).toBe(401);
});
