import { notFound, redirect } from "next/navigation";

import { IncidentForm } from "@/features/incidents/components/incident-form";
import { incidentService } from "@/features/incidents/service";
import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";
import { isAppError } from "@/lib/errors";

import styles from "@/features/incidents/components/incident.module.css";

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
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Incident management</p>
        <h1>Create incident</h1>
        <p className={styles.lede}>
          Capture the operational impact and assign clear ownership.
        </p>
      </header>
      <IncidentForm members={members} workspaceSlug={workspaceSlug} />
    </main>
  );
}
