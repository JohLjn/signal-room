"use client";

import { useActionState } from "react";

import {
  signInWithCredentials,
  type SignInState,
} from "@/features/auth/actions";

import styles from "./sign-in.module.css";

const initialState: SignInState = {};

export function SignInForm() {
  const [state, action, pending] = useActionState(
    signInWithCredentials,
    initialState,
  );

  return (
    <form action={action} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="email">Email</label>
        <input
          autoComplete="email"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="password">Password</label>
        <input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>
      {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
      <button className={styles.submitButton} disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
