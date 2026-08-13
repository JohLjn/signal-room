import "server-only";

import { verify } from "argon2";
import { eq } from "drizzle-orm";

import {
  CredentialsInputSchema,
  type CredentialsData,
} from "@/contracts/auth";
import { users } from "@/db/schema";
import { getDatabase, type Database } from "@/db/client";

export type AuthenticatedUser = Readonly<{
  id: string;
  email: string;
  name: string;
}>;

async function findUserByEmail(
  email: string,
  database: Database,
): Promise<{
  id: string;
  email: string;
  name: string;
  passwordHash: string;
} | null> {
  const [user] = await database
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function verifyCredentials(
  input: unknown,
  database?: Database,
): Promise<AuthenticatedUser | null> {
  const parsed = CredentialsInputSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  const credentials: CredentialsData = parsed.data;
  const user = await findUserByEmail(
    credentials.email,
    database ?? getDatabase(),
  );

  if (!user) {
    return null;
  }

  let passwordMatches = false;

  try {
    passwordMatches = await verify(user.passwordHash, credentials.password);
  } catch {
    // A malformed persisted hash must fail closed like any other bad credential.
    return null;
  }

  if (!passwordMatches) {
    return null;
  }

  return { id: user.id, email: user.email, name: user.name };
}
