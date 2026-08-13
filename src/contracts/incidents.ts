import { z } from "zod";

import {
  ActivityTypeSchema,
  IncidentSeveritySchema,
  IncidentStatusSchema,
  UuidSchema,
} from "@/contracts/domain";
import type { AuthContext } from "@/lib/auth-context";

const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const UserSummarySchema = z.object({
  id: UuidSchema,
  name: z.string(),
});

export const CreateIncidentInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).default(""),
  status: IncidentStatusSchema,
  severity: IncidentSeveritySchema,
  ownerId: UuidSchema,
});

export const UpdateIncidentInputSchema = z
  .object({
    status: IncidentStatusSchema.optional(),
    severity: IncidentSeveritySchema.optional(),
    ownerId: UuidSchema.optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one incident field must be supplied.",
  });

export const AddCommentInputSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
});

export const IncidentSummarySchema = z.object({
  id: UuidSchema,
  title: z.string(),
  status: IncidentStatusSchema,
  severity: IncidentSeveritySchema,
  owner: UserSummarySchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const CommentViewSchema = z.object({
  id: UuidSchema,
  body: z.string(),
  author: UserSummarySchema,
  createdAt: IsoDateTimeSchema,
});

export const ActivityDetailsSchema = z.union([
  z.strictObject({}),
  z.object({ from: IncidentStatusSchema, to: IncidentStatusSchema }),
  z.object({ from: IncidentSeveritySchema, to: IncidentSeveritySchema }),
  z.object({
    from: UserSummarySchema,
    to: UserSummarySchema,
  }),
]);

export const ActivityEntryViewSchema = z.object({
  id: UuidSchema,
  type: ActivityTypeSchema,
  actor: UserSummarySchema,
  commentId: UuidSchema.nullable(),
  details: ActivityDetailsSchema,
  createdAt: IsoDateTimeSchema,
});

export const IncidentDetailSchema = IncidentSummarySchema.extend({
  description: z.string(),
  creator: UserSummarySchema,
  comments: z.array(CommentViewSchema),
  activity: z.array(ActivityEntryViewSchema),
});

export type CreateIncidentInput = z.input<typeof CreateIncidentInputSchema>;
export type CreateIncidentData = z.output<typeof CreateIncidentInputSchema>;
export type UpdateIncidentInput = z.input<typeof UpdateIncidentInputSchema>;
export type AddCommentInput = z.input<typeof AddCommentInputSchema>;
export type IncidentSummary = z.infer<typeof IncidentSummarySchema>;
export type IncidentDetail = z.infer<typeof IncidentDetailSchema>;
export type CommentView = z.infer<typeof CommentViewSchema>;
export type ActivityEntryView = z.infer<typeof ActivityEntryViewSchema>;
export type ActivityDetails = z.infer<typeof ActivityDetailsSchema>;

export interface IncidentServiceContract {
  listIncidents(authContext: AuthContext): Promise<IncidentSummary[]>;
  getIncident(authContext: AuthContext, incidentId: string): Promise<IncidentDetail>;
  createIncident(
    authContext: AuthContext,
    input: CreateIncidentInput,
  ): Promise<IncidentDetail>;
  updateIncident(
    authContext: AuthContext,
    incidentId: string,
    input: UpdateIncidentInput,
  ): Promise<IncidentDetail>;
  addComment(
    authContext: AuthContext,
    incidentId: string,
    input: AddCommentInput,
  ): Promise<CommentView>;
}
