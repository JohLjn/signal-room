"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { INCIDENT_SEVERITIES, INCIDENT_STATUSES } from "@/contracts/domain";
import { routes } from "@/contracts/routes";
import type { MemberOption } from "@/features/incidents/repository";

import styles from "./incident.module.css";

export function IncidentForm({ workspaceSlug, members }: { workspaceSlug: string; members: MemberOption[] }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(routes.incidentsApi(workspaceSlug), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const body = await response.json();
    setPending(false);
    if (!response.ok) return setError(body.error?.message ?? "Unable to create incident.");
    window.location.assign(routes.incident(workspaceSlug, body.id));
  }

  return (
    <form className={`${styles.formCard} ${styles.createForm}`} onSubmit={submit}>
      <div className={styles.field}>
        <label htmlFor="incident-title">Title</label>
        <input
          aria-describedby="incident-title-count"
          id="incident-title"
          maxLength={200}
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          required
          value={title}
        />
        <p className={styles.fieldHint} id="incident-title-count">{title.length} / 200 characters</p>
      </div>
      <div className={styles.field}>
        <label htmlFor="incident-description">Description</label>
        <textarea id="incident-description" name="description" maxLength={10_000} rows={6} />
      </div>
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="incident-status">Status</label>
          <select id="incident-status" name="status">{INCIDENT_STATUSES.map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        <div className={styles.field}>
          <label htmlFor="incident-severity">Severity</label>
          <select id="incident-severity" name="severity">{INCIDENT_SEVERITIES.map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select>
        </div>
        <div className={styles.field}>
          <label htmlFor="incident-owner">Owner</label>
          <select id="incident-owner" name="ownerId" required>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select>
        </div>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button className={styles.primaryButton} disabled={pending || members.length === 0}>{pending ? "Creating…" : "Create incident"}</button>
        <Link className={styles.secondaryLink} href={routes.workspace(workspaceSlug)}>Cancel</Link>
      </div>
    </form>
  );
}
