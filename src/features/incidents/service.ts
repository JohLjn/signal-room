import "server-only";

import { ZodError } from "zod";

import {
  AddCommentInputSchema,
  CreateIncidentInputSchema,
  type IncidentDetail,
  type IncidentServiceContract,
  type IncidentSummary,
  UpdateIncidentInputSchema,
} from "@/contracts/incidents";
import { UuidSchema } from "@/contracts/domain";
import { getDatabase, type Database } from "@/db/client";
import { withTransaction } from "@/db/transaction";
import { ActivityRepository } from "@/features/activity/repository";
import { CommentRepository } from "@/features/comments/repository";
import { IncidentRepository } from "@/features/incidents/repository";
import type { AuthContext } from "@/lib/auth-context";
import { AppError } from "@/lib/errors";

function validationError(error: ZodError): AppError {
  return new AppError("VALIDATION", "The submitted incident data is invalid.", {
    issues: error.issues,
  });
}

function parse<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof ZodError) throw validationError(error);
    throw error;
  }
}

function incidentId(value: string): string {
  return parse(() => UuidSchema.parse(value));
}

export class IncidentService implements IncidentServiceContract {
  constructor(private readonly configuredDatabase?: Database) {}

  private get database(): Database {
    return this.configuredDatabase ?? getDatabase();
  }

  async listIncidents(authContext: AuthContext): Promise<IncidentSummary[]> {
    return new IncidentRepository(this.database).list(authContext.workspaceId);
  }

  async getIncident(
    authContext: AuthContext,
    requestedIncidentId: string,
  ): Promise<IncidentDetail> {
    return this.loadDetail(authContext.workspaceId, incidentId(requestedIncidentId));
  }

  async createIncident(authContext: AuthContext, rawInput: unknown): Promise<IncidentDetail> {
    const input = parse(() => CreateIncidentInputSchema.parse(rawInput));
    const created = await withTransaction(this.database, async (transaction) => {
      const incidents = new IncidentRepository(transaction);
      if (!(await incidents.isMember(authContext.workspaceId, input.ownerId))) {
        throw new AppError("VALIDATION", "The owner must be a workspace member.");
      }
      const incident = await incidents.create(authContext.workspaceId, authContext.userId, input);
      await new ActivityRepository(transaction).append({
        workspaceId: authContext.workspaceId,
        incidentId: incident.id,
        actorId: authContext.userId,
        type: "incident_created",
      });
      return incident;
    });
    return this.loadDetail(authContext.workspaceId, created.id);
  }

  async updateIncident(
    authContext: AuthContext,
    requestedIncidentId: string,
    rawInput: unknown,
  ): Promise<IncidentDetail> {
    const id = incidentId(requestedIncidentId);
    const input = parse(() => UpdateIncidentInputSchema.parse(rawInput));
    await withTransaction(this.database, async (transaction) => {
      const incidents = new IncidentRepository(transaction);
      const current = await incidents.find(authContext.workspaceId, id);
      if (!current) throw new AppError("NOT_FOUND", "Incident not found.");
      if (current.ownerId !== authContext.userId && authContext.membershipRole !== "admin") {
        throw new AppError("FORBIDDEN", "Only the incident owner or an administrator can update it.");
      }
      if (input.ownerId && !(await incidents.isMember(authContext.workspaceId, input.ownerId))) {
        throw new AppError("VALIDATION", "The owner must be a workspace member.");
      }

      const changes = {
        ...(input.status !== undefined && input.status !== current.status
          ? { status: input.status }
          : {}),
        ...(input.severity !== undefined && input.severity !== current.severity
          ? { severity: input.severity }
          : {}),
        ...(input.ownerId !== undefined && input.ownerId !== current.ownerId
          ? { ownerId: input.ownerId }
          : {}),
      };
      if (Object.keys(changes).length === 0) return;

      await incidents.update(authContext.workspaceId, id, changes);
      const activity = new ActivityRepository(transaction);
      if (changes.status) {
        await activity.append({
          workspaceId: authContext.workspaceId,
          incidentId: id,
          actorId: authContext.userId,
          type: "status_changed",
          details: { from: current.status, to: changes.status },
        });
      }
      if (changes.severity) {
        await activity.append({
          workspaceId: authContext.workspaceId,
          incidentId: id,
          actorId: authContext.userId,
          type: "severity_changed",
          details: { from: current.severity, to: changes.severity },
        });
      }
      if (changes.ownerId) {
        const [from, to] = await Promise.all([
          incidents.getUser(current.ownerId),
          incidents.getUser(changes.ownerId),
        ]);
        if (!from || !to) throw new AppError("VALIDATION", "The selected owner is invalid.");
        await activity.append({
          workspaceId: authContext.workspaceId,
          incidentId: id,
          actorId: authContext.userId,
          type: "owner_changed",
          details: { from, to },
        });
      }
    });
    return this.loadDetail(authContext.workspaceId, id);
  }

  async addComment(authContext: AuthContext, requestedIncidentId: string, rawInput: unknown) {
    const id = incidentId(requestedIncidentId);
    const input = parse(() => AddCommentInputSchema.parse(rawInput));
    return withTransaction(this.database, async (transaction) => {
      const incidents = new IncidentRepository(transaction);
      if (!(await incidents.find(authContext.workspaceId, id))) {
        throw new AppError("NOT_FOUND", "Incident not found.");
      }
      const comment = await new CommentRepository(transaction).create({
        workspaceId: authContext.workspaceId,
        incidentId: id,
        authorId: authContext.userId,
        body: input.body,
      });
      await new ActivityRepository(transaction).append({
        workspaceId: authContext.workspaceId,
        incidentId: id,
        actorId: authContext.userId,
        type: "comment_added",
        commentId: comment.id,
      });
      await incidents.touch(authContext.workspaceId, id);
      return comment;
    });
  }

  async listMembers(authContext: AuthContext) {
    return new IncidentRepository(this.database).listMembers(authContext.workspaceId);
  }

  private async loadDetail(workspaceId: string, id: string): Promise<IncidentDetail> {
    const incidents = new IncidentRepository(this.database);
    const incident = await incidents.find(workspaceId, id);
    if (!incident) throw new AppError("NOT_FOUND", "Incident not found.");
    const [people, comments, activity] = await Promise.all([
      incidents.getPeople(workspaceId, id),
      new CommentRepository(this.database).listForIncident(workspaceId, id),
      new ActivityRepository(this.database).listForIncident(workspaceId, id),
    ]);
    if (!people) throw new AppError("NOT_FOUND", "Incident not found.");
    return {
      id: incident.id,
      title: incident.title,
      description: incident.description,
      status: incident.status,
      severity: incident.severity,
      owner: { id: people.ownerId, name: people.ownerName },
      creator: { id: people.creatorId, name: people.creatorName },
      comments,
      activity,
      createdAt: incident.createdAt.toISOString(),
      updatedAt: incident.updatedAt.toISOString(),
    };
  }
}

export const incidentService = new IncidentService();
