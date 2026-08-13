import Link from "next/link";

import type { DashboardResult } from "@/contracts/dashboard";
import { routes } from "@/contracts/routes";

import styles from "../dashboard.module.css";
import { LastUpdated } from "./last-updated";

interface OpenIncidentListProps {
  incidents: DashboardResult["incidents"];
  workspaceSlug: string;
}

export function OpenIncidentList({
  incidents,
  workspaceSlug,
}: OpenIncidentListProps) {
  return (
    <section aria-labelledby="active-incidents-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Current workspace</p>
          <h2 className={styles.sectionTitle} id="active-incidents-heading">
            Active incidents
          </h2>
        </div>
        <Link className={styles.createLink} href={routes.newIncident(workspaceSlug)}>
          New incident
        </Link>
      </div>

      {incidents.length === 0 ? (
        <p className={styles.emptyState}>No open or investigating incidents.</p>
      ) : (
        <ul className={styles.incidentList}>
          {incidents.map((incident) => (
            <li className={styles.incidentCard} key={incident.id}>
              <div className={styles.incidentMain}>
                <Link
                  className={styles.incidentTitle}
                  href={routes.incident(workspaceSlug, incident.id)}
                >
                  {incident.title}
                </Link>
                <span className={styles.owner}>Owned by {incident.owner.name}</span>
              </div>
              <div className={styles.incidentMetadata}>
                <span className={styles.badge}>{incident.status}</span>
                <span className={styles.badge}>{incident.severity.toUpperCase()}</span>
                <span className={styles.updatedAt}>
                  Updated <LastUpdated value={incident.updatedAt} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
