import type { DashboardResult } from "@/contracts/dashboard";
import { INCIDENT_SEVERITIES } from "@/contracts/domain";

import styles from "../dashboard.module.css";

interface DashboardMetricsProps {
  metrics: DashboardResult["metrics"];
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <section aria-labelledby="dashboard-summary-heading">
      <h2 className={styles.sectionTitle} id="dashboard-summary-heading">
        Incident summary
      </h2>
      <div className={styles.metricGrid}>
        <Metric label="Open" value={metrics.openIncidents} />
        <Metric label="Investigating" value={metrics.investigatingIncidents} />
        {INCIDENT_SEVERITIES.map((severity) => (
          <Metric
            key={severity}
            label={`Open ${severity.toUpperCase()}`}
            value={metrics.openBySeverity[severity]}
          />
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
    </article>
  );
}
