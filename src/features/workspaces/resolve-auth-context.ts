import "server-only";

import type { AuthContext } from "@/lib/auth-context";
import { createAuthContext } from "@/lib/auth-context";
import { resolveAuthenticatedIdentity } from "@/features/auth/session";
import { resolveWorkspaceMembership } from "@/features/workspaces/membership";

/**
 * The stable server-only authorization entry point for workspace operations.
 * The URL slug is the sole caller-provided value; identity and membership are
 * always resolved from the Auth.js session and PostgreSQL before construction.
 */
export async function resolveAuthContext(
  workspaceSlug: string,
): Promise<AuthContext> {
  const identity = await resolveAuthenticatedIdentity();
  const membership = await resolveWorkspaceMembership(
    identity.userId,
    workspaceSlug,
  );

  return createAuthContext(identity, membership);
}
