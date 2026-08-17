import styles from "./incident.module.css";

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ");
}

export function severityLabel(severity: string): string {
  return severity.toUpperCase();
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "investigating"
      ? styles.statusInvestigating
      : status === "resolved"
        ? styles.statusResolved
        : styles.statusOpen;

  return <span className={`${styles.badge} ${tone}`}>{statusLabel(status)}</span>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone = severity === "sev1" || severity === "sev2" ? styles.severityHigh : "";

  return <span className={`${styles.badge} ${tone}`}>{severityLabel(severity)}</span>;
}
