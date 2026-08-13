"use client";

import { useState, type FormEvent } from "react";

import { routes } from "@/contracts/routes";

export function CommentForm({ workspaceSlug, incidentId }: { workspaceSlug: string; incidentId: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "");
    const response = await fetch(routes.commentsApi(workspaceSlug, incidentId), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const payload = await response.json();
    setPending(false);
    if (!response.ok) return setError(payload.error?.message ?? "Unable to add comment.");
    form.reset();
    window.location.reload();
  }

  return (
    <form onSubmit={submit}>
      <h2>Add comment</h2>
      <textarea name="body" required maxLength={10_000} rows={4} />
      <br />
      <button disabled={pending}>{pending ? "Adding…" : "Add comment"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
