import type { IncidentDetail as IncidentDetailView } from "@/contracts/incidents";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import { CommentForm } from "@/features/comments/components/comment-form";
import { IncidentControls } from "@/features/incidents/components/incident-controls";
import type { MemberOption } from "@/features/incidents/repository";

import { LocalDateTime } from "./local-date-time";
import { SeverityBadge, StatusBadge } from "./incident-presentation";
import styles from "./incident.module.css";

export function IncidentDetail({ workspaceSlug, incident, members, canUpdate }: {
  workspaceSlug: string;
  incident: IncidentDetailView;
  members: MemberOption[];
  canUpdate: boolean;
}) {
  return (
    <article className={styles.detail}>
      <header className={styles.detailHeader}>
        <p className={styles.eyebrow}>Incident</p>
        <h1>{incident.title}</h1>
        <p className={styles.description}>{incident.description}</p>
      </header>
      <dl className={styles.metadata}>
        <div className={styles.metadataItem}><dt>Status</dt><dd><StatusBadge status={incident.status} /></dd></div>
        <div className={styles.metadataItem}><dt>Severity</dt><dd><SeverityBadge severity={incident.severity} /></dd></div>
        <div className={styles.metadataItem}><dt>Owner</dt><dd>{incident.owner.name}</dd></div>
        <div className={styles.metadataItem}><dt>Creator</dt><dd>{incident.creator.name}</dd></div>
      </dl>
      <IncidentControls workspaceSlug={workspaceSlug} incident={incident} members={members} canUpdate={canUpdate} />
      <section className={styles.sectionCard}>
        <h2>Comments</h2>
        {incident.comments.length === 0 ? <p className={styles.emptyState}>No comments yet.</p> : (
          <ol className={styles.commentList}>{incident.comments.map((comment) => <li className={styles.commentRow} key={comment.id}>
            <div className={styles.commentMeta}>
              <strong>{comment.author.name}</strong>
              <LocalDateTime value={comment.createdAt} />
            </div>
            <p className={styles.commentBody}>{comment.body}</p>
          </li>)}</ol>
        )}
      </section>
      <CommentForm workspaceSlug={workspaceSlug} incidentId={incident.id} />
      <ActivityTimeline entries={incident.activity} />
    </article>
  );
}
