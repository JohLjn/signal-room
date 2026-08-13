import { notFound, redirect } from "next/navigation";

import { IncidentDetail } from "@/features/incidents/components/incident-detail";
import { incidentService } from "@/features/incidents/service";
import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";
import { isAppError } from "@/lib/errors";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; incidentId: string }>;
}) {
  const { workspaceSlug, incidentId } = await params;
  let incident;
  let members;
  let canUpdate;

  try {
    const authContext = await resolveAuthContext(workspaceSlug);
    [incident, members] = await Promise.all([
      incidentService.getIncident(authContext, incidentId),
      incidentService.listMembers(authContext),
    ]);
    canUpdate =
      authContext.membershipRole === "admin" ||
      incident.owner.id === authContext.userId;
  } catch (error) {
    if (isAppError(error) && error.code === "UNAUTHENTICATED") {
      redirect("/sign-in");
    }

    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }

    throw error;
  }

  return (
    <main>
      <IncidentDetail
        canUpdate={canUpdate}
        incident={incident}
        members={members}
        workspaceSlug={workspaceSlug}
      />
    </main>
  );
}
