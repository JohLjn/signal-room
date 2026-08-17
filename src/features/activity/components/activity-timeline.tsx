import type { ActivityEntryView } from "@/contracts/incidents";
import { LocalDateTime } from "@/features/incidents/components/local-date-time";
import styles from "@/features/incidents/components/incident.module.css";

function description(entry: ActivityEntryView): string {
  switch (entry.type) {
    case "incident_created": return "created the incident";
    case "comment_added": return "added a comment";
    case "status_changed": {
      const details = entry.details as { from: string; to: string };
      return `changed status from ${details.from} to ${details.to}`;
    }
    case "severity_changed": {
      const details = entry.details as { from: string; to: string };
      return `changed severity from ${details.from} to ${details.to}`;
    }
    case "owner_changed": {
      const details = entry.details as { from: { name: string }; to: { name: string } };
      return `changed owner from ${details.from.name} to ${details.to.name}`;
    }
  }
}

export function ActivityTimeline({ entries }: { entries: ActivityEntryView[] }) {
  return (
    <section className={styles.sectionCard}>
      <h2>Activity</h2>
      <ol className={styles.activityList}>
        {entries.map((entry) => (
          <li className={styles.activityRow} key={entry.id}>
            <strong>{entry.actor.name}</strong> {description(entry)}{" "}
            <span className={styles.activityTime}><LocalDateTime value={entry.createdAt} /></span>
          </li>
        ))}
      </ol>
    </section>
  );
}
