import { SignInForm } from "@/app/(auth)/sign-in/sign-in-form";

import styles from "./sign-in.module.css";

export default function SignInPage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="sign-in-heading">
        <header className={styles.intro}>
          <p className={styles.identity}>SignalRoom</p>
          <h1 id="sign-in-heading">Sign in</h1>
          <p className={styles.description}>
            Coordinate incidents, ownership, and operational updates in one place.
          </p>
        </header>
        <SignInForm />
      </section>
    </main>
  );
}
