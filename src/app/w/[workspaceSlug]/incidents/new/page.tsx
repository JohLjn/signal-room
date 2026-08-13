import { notFound, redirect } from "next/navigation";

import { IncidentForm } from "@/features/incidents/components/incident-form";
import { incidentService } from "@/features/incidents/service";
import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";
import { isAppError } from "@/lib/errors";

export default async function NewIncidentPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  let members;

  try {
    const authContext = await resolveAuthContext(workspaceSlug);
    members = await incidentService.listMembers(authContext);
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
      <h1>Create incident</h1>
      <IncidentForm members={members} workspaceSlug={workspaceSlug} />
    </main>
  );
}
