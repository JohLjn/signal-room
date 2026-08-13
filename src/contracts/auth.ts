import { z } from "zod";

import { MembershipRoleSchema, UuidSchema } from "@/contracts/domain";

export const WorkspaceSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const CredentialsInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1),
});

export const AuthenticatedIdentitySchema = z.object({
  userId: UuidSchema,
});

export const ResolvedWorkspaceMembershipSchema = z.object({
  workspaceId: UuidSchema,
  workspaceSlug: WorkspaceSlugSchema,
  role: MembershipRoleSchema,
});

export type AuthenticatedIdentity = z.infer<typeof AuthenticatedIdentitySchema>;
export type CredentialsInput = z.input<typeof CredentialsInputSchema>;
export type CredentialsData = z.output<typeof CredentialsInputSchema>;
export type ResolvedWorkspaceMembership = z.infer<
  typeof ResolvedWorkspaceMembershipSchema
>;
