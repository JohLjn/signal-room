import "server-only";

import type { AuthContext } from "@/lib/auth-context";
import { AppError, isAppError } from "@/lib/errors";
import { incidentService, type IncidentService } from "@/features/incidents/service";

export type ResolveAuthContext = (workspaceSlug: string) => Promise<AuthContext>;

export function errorResponse(error: unknown): Response {
  const appError = isAppError(error)
    ? error
    : new AppError("CONFLICT", "The request could not be completed.");
  return Response.json(
    { error: { code: appError.code, message: appError.message } },
    { status: isAppError(error) ? appError.status : 500 },
  );
}

async function json(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION", "The request body must be valid JSON.");
  }
}

export function createIncidentHandlers(
  resolveAuthContext: ResolveAuthContext,
  service: IncidentService = incidentService,
) {
  return {
    async list(workspaceSlug: string): Promise<Response> {
      try {
        const context = await resolveAuthContext(workspaceSlug);
        return Response.json(await service.listIncidents(context));
      } catch (error) {
        return errorResponse(error);
      }
    },
    async create(request: Request, workspaceSlug: string): Promise<Response> {
      try {
        const context = await resolveAuthContext(workspaceSlug);
        return Response.json(await service.createIncident(context, await json(request)), { status: 201 });
      } catch (error) {
        return errorResponse(error);
      }
    },
    async get(workspaceSlug: string, incidentId: string): Promise<Response> {
      try {
        const context = await resolveAuthContext(workspaceSlug);
        return Response.json(await service.getIncident(context, incidentId));
      } catch (error) {
        return errorResponse(error);
      }
    },
    async update(request: Request, workspaceSlug: string, incidentId: string): Promise<Response> {
      try {
        const context = await resolveAuthContext(workspaceSlug);
        return Response.json(await service.updateIncident(context, incidentId, await json(request)));
      } catch (error) {
        return errorResponse(error);
      }
    },
    async comment(request: Request, workspaceSlug: string, incidentId: string): Promise<Response> {
      try {
        const context = await resolveAuthContext(workspaceSlug);
        return Response.json(await service.addComment(context, incidentId, await json(request)), { status: 201 });
      } catch (error) {
        return errorResponse(error);
      }
    },
  };
}
