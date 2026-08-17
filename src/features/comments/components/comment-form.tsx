"use client";

import { useState, type FormEvent } from "react";

import { routes } from "@/contracts/routes";

import styles from "@/features/incidents/components/incident.module.css";

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
    <form className={`${styles.sectionCard} ${styles.commentForm}`} onSubmit={submit}>
      <h2>Add comment</h2>
      <label className={styles.commentLabel} htmlFor="comment-body">Comment</label>
      <textarea id="comment-body" name="body" required maxLength={10_000} rows={4} />
      <div className={styles.actions}>
        <button className={styles.primaryButton} disabled={pending}>{pending ? "Adding…" : "Add comment"}</button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}
