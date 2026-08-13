import type { IncidentDetail as IncidentDetailView } from "@/contracts/incidents";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { CommentForm } from "@/features/comments/components/comment-form";
import { IncidentControls } from "@/features/incidents/components/incident-controls";
import type { MemberOption } from "@/features/incidents/repository";

export function IncidentDetail({ workspaceSlug, incident, members, canUpdate }: {
  workspaceSlug: string;
  incident: IncidentDetailView;
  members: MemberOption[];
  canUpdate: boolean;
}) {
  return (
    <article>
      <h1>{incident.title}</h1>
      <p>{incident.description}</p>
      <dl>
        <dt>Status</dt><dd>{incident.status}</dd>
        <dt>Severity</dt><dd>{incident.severity}</dd>
        <dt>Owner</dt><dd>{incident.owner.name}</dd>
        <dt>Creator</dt><dd>{incident.creator.name}</dd>
      </dl>
      <IncidentControls workspaceSlug={workspaceSlug} incident={incident} members={members} canUpdate={canUpdate} />
      <section>
        <h2>Comments</h2>
        {incident.comments.length === 0 ? <p>No comments yet.</p> : (
          <ol>{incident.comments.map((comment) => <li key={comment.id}><strong>{comment.author.name}</strong>: {comment.body} <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time></li>)}</ol>
        )}
      </section>
      <CommentForm workspaceSlug={workspaceSlug} incidentId={incident.id} />
      <ActivityTimeline entries={incident.activity} />
    </article>
  );
}
