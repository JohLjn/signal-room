import { createIncidentHandlers } from "@/features/incidents/http";
import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";

const handlers = createIncidentHandlers(resolveAuthContext);

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ workspaceSlug: string; incidentId: string }>;
  },
) {
  const { workspaceSlug, incidentId } = await params;
  return handlers.comment(request, workspaceSlug, incidentId);
}
