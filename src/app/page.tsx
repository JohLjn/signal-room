import { notFound, redirect } from "next/navigation";

import { routes } from "@/contracts/routes";
import { resolveAuthenticatedIdentity } from "@/features/auth/session";
import { resolveFirstWorkspaceMembership } from "@/features/workspaces/membership";
import { isAppError } from "@/lib/errors";

export default async function Home() {
  const identity = await resolveAuthenticatedIdentity().catch((error: unknown) => {
    if (isAppError(error) && error.code === "UNAUTHENTICATED") {
      redirect(routes.signIn);
    }

    throw error;
  });
  const membership = await resolveFirstWorkspaceMembership(identity.userId).catch(
    (error: unknown) => {
      if (isAppError(error) && error.code === "NOT_FOUND") {
        notFound();
      }

      throw error;
    },
  );

  redirect(routes.workspace(membership.workspaceSlug));
}
