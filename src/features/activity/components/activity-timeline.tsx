import type { ActivityEntryView } from "@/contracts/incidents";

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
    <section>
      <h2>Activity</h2>
      <ol>
        {entries.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.actor.name}</strong> {description(entry)}{" "}
            <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
