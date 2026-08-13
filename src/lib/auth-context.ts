import "server-only";

import type {
  AuthenticatedIdentity,
  ResolvedWorkspaceMembership,
} from "@/contracts/auth";
import type { MembershipRole } from "@/contracts/domain";

declare const trustedAuthContext: unique symbol;

export type AuthContext = Readonly<{
  userId: string;
  workspaceId: string;
  workspaceSlug: string;
  membershipRole: MembershipRole;
  [trustedAuthContext]: true;
}>;

/**
 * The only constructor for trusted authorization state. Callers must first
 * authenticate the session and resolve its current workspace membership from
 * PostgreSQL. Client request data must never be passed through as either input.
 */
export function createAuthContext(
  identity: AuthenticatedIdentity,
  membership: ResolvedWorkspaceMembership,
): AuthContext {
  return Object.freeze({
    userId: identity.userId,
    workspaceId: membership.workspaceId,
    workspaceSlug: membership.workspaceSlug,
    membershipRole: membership.role,
  }) as AuthContext;
}
