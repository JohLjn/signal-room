import { notFound, redirect } from "next/navigation";

import { WorkspaceDashboard } from "@/features/dashboard/components/workspace-dashboard";
import { getDashboard } from "@/features/dashboard/service";
import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";
import { isAppError } from "@/lib/errors";

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  let dashboard;

  try {
    const authContext = await resolveAuthContext(workspaceSlug);
    dashboard = await getDashboard(authContext);
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
    <WorkspaceDashboard dashboard={dashboard} workspaceSlug={workspaceSlug} />
  );
}
