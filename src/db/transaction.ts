import "server-only";

import type { Database } from "@/db/client";

export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];
export type DatabaseExecutor = Database | DatabaseTransaction;

export function withTransaction<T>(
  database: Database,
  operation: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return database.transaction(operation);
}
