"use client";

import { useState, type FormEvent } from "react";

import { INCIDENT_SEVERITIES, INCIDENT_STATUSES } from "@/contracts/domain";
import { routes } from "@/contracts/routes";
import type { MemberOption } from "@/features/incidents/repository";

export function IncidentForm({ workspaceSlug, members }: { workspaceSlug: string; members: MemberOption[] }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

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
    <form onSubmit={submit}>
      <p><label>Title<br /><input name="title" required maxLength={200} /></label></p>
      <p><label>Description<br /><textarea name="description" maxLength={10_000} rows={6} /></label></p>
      <p><label>Status<br /><select name="status">{INCIDENT_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label></p>
      <p><label>Severity<br /><select name="severity">{INCIDENT_SEVERITIES.map((value) => <option key={value}>{value}</option>)}</select></label></p>
      <p><label>Owner<br /><select name="ownerId" required>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label></p>
      {error && <p role="alert">{error}</p>}
      <button disabled={pending || members.length === 0}>{pending ? "Creating…" : "Create incident"}</button>
    </form>
  );
}
