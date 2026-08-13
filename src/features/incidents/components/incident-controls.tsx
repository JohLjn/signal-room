"use client";

import { useState, type FormEvent } from "react";

import { INCIDENT_SEVERITIES, INCIDENT_STATUSES } from "@/contracts/domain";
import { routes } from "@/contracts/routes";
import type { IncidentDetail } from "@/contracts/incidents";
import type { MemberOption } from "@/features/incidents/repository";

export function IncidentControls({ workspaceSlug, incident, members, canUpdate }: {
  workspaceSlug: string;
  incident: IncidentDetail;
  members: MemberOption[];
  canUpdate: boolean;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  if (!canUpdate) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch(routes.incidentApi(workspaceSlug, incident.id), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });
    const body = await response.json();
    setPending(false);
    if (!response.ok) return setError(body.error?.message ?? "Unable to update incident.");
    window.location.reload();
  }

  return (
    <form onSubmit={submit}>
      <h2>Update incident</h2>
      <label>Status <select name="status" defaultValue={incident.status}>{INCIDENT_STATUSES.map((value) => <option key={value}>{value}</option>)}</select></label>{" "}
      <label>Severity <select name="severity" defaultValue={incident.severity}>{INCIDENT_SEVERITIES.map((value) => <option key={value}>{value}</option>)}</select></label>{" "}
      <label>Owner <select name="ownerId" defaultValue={incident.owner.id}>{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>{" "}
      <button disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
