import type { DashboardResult } from "@/contracts/dashboard";

import styles from "../dashboard.module.css";
import { DashboardMetrics } from "./dashboard-metrics";
import { OpenIncidentList } from "./open-incident-list";

interface WorkspaceDashboardProps {
  dashboard: DashboardResult;
  workspaceSlug: string;
}

export function WorkspaceDashboard({
  dashboard,
  workspaceSlug,
}: WorkspaceDashboardProps) {
  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>SignalRoom</p>
        <h1>Operations dashboard</h1>
        <p>Monitor active incidents and their latest meaningful updates.</p>
      </header>
      <DashboardMetrics metrics={dashboard.metrics} />
      <OpenIncidentList
        incidents={dashboard.incidents}
        workspaceSlug={workspaceSlug}
      />
    </main>
  );
}
