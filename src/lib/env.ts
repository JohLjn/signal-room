import "server-only";

import { z } from "zod";

const ServerEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_URL: z.string().url(),
});

const TestEnvSchema = z.object({
  TEST_DATABASE_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;
export type TestEnv = z.infer<typeof TestEnvSchema>;

let serverEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  serverEnv ??= ServerEnvSchema.parse(process.env);
  return serverEnv;
}

export function parseTestEnv(environment: NodeJS.ProcessEnv = process.env): TestEnv {
  return TestEnvSchema.parse(environment);
}
