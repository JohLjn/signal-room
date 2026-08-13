import { createIncidentHandlers } from "@/features/incidents/http";
import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";

const handlers = createIncidentHandlers(resolveAuthContext);

type IncidentRouteParams = Promise<{
  workspaceSlug: string;
  incidentId: string;
}>;

export async function GET(
  _request: Request,
  { params }: { params: IncidentRouteParams },
) {
  const { workspaceSlug, incidentId } = await params;
  return handlers.get(workspaceSlug, incidentId);
}

export async function PATCH(
  request: Request,
  { params }: { params: IncidentRouteParams },
) {
  const { workspaceSlug, incidentId } = await params;
  return handlers.update(request, workspaceSlug, incidentId);
}
