import { createIncidentHandlers } from "@/features/incidents/http";
import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";

const handlers = createIncidentHandlers(resolveAuthContext);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const { workspaceSlug } = await params;
  return handlers.list(workspaceSlug);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  const { workspaceSlug } = await params;
  return handlers.create(request, workspaceSlug);
}
