import { describe, expect, it, vi } from "vitest";

import { createIncidentHandlers, errorResponse } from "@/features/incidents/http";
import { AppError } from "@/lib/errors";

describe("incident HTTP transport", () => {
  it.each([
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["VALIDATION", 400],
    ["CONFLICT", 409],
  ] as const)("maps %s errors to %i", async (code, status) => {
    const response = errorResponse(new AppError(code, "Message"));
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: { code, message: "Message" } });
  });

  it("uses 201 for incident and comment creation", async () => {
    const context = {} as never;
    const resolver = vi.fn().mockResolvedValue(context);
    const service = {
      listIncidents: vi.fn(),
      getIncident: vi.fn(),
      updateIncident: vi.fn(),
      createIncident: vi.fn().mockResolvedValue({ id: "incident" }),
      addComment: vi.fn().mockResolvedValue({ id: "comment" }),
    };
    const handlers = createIncidentHandlers(resolver, service as never);
    const request = () => new Request("http://localhost", { method: "POST", body: "{}" });

    expect((await handlers.create(request(), "workspace")).status).toBe(201);
    expect((await handlers.comment(request(), "workspace", "incident")).status).toBe(201);
  });

  it("rejects malformed JSON with the local error envelope", async () => {
    const handlers = createIncidentHandlers(
      vi.fn().mockResolvedValue({}),
      { createIncident: vi.fn() } as never,
    );
    const response = await handlers.create(
      new Request("http://localhost", { method: "POST", body: "{" }),
      "workspace",
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "VALIDATION" } });
  });
});
