import type { Session } from "next-auth";

import {
  AuthenticatedIdentitySchema,
  type AuthenticatedIdentity,
} from "@/contracts/auth";
import { AppError } from "@/lib/errors";

export function authenticatedIdentityFromSession(
  session: Session | null,
): AuthenticatedIdentity {
  const parsed = AuthenticatedIdentitySchema.safeParse({
    userId: session?.user?.id,
  });

  if (!parsed.success) {
    throw new AppError("UNAUTHENTICATED", "Authentication is required.");
  }

  return parsed.data;
}
