import "server-only";

import type { AuthenticatedIdentity } from "@/contracts/auth";
import { auth } from "@/features/auth/config";
import { authenticatedIdentityFromSession } from "@/features/auth/identity";

export async function resolveAuthenticatedIdentity(): Promise<AuthenticatedIdentity> {
  return authenticatedIdentityFromSession(await auth());
}
