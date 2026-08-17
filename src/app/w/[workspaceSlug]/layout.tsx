import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { routes } from "@/contracts/routes";
import { signOutCurrentUser } from "@/features/auth/actions";
import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";
import { isAppError } from "@/lib/errors";

import styles from "./workspace-layout.module.css";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  try {
    await resolveAuthContext(workspaceSlug);
  } catch (error) {
    if (isAppError(error) && error.code === "UNAUTHENTICATED") {
      redirect("/sign-in");
    }

    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }

    throw error;
  }

  return (
    <>
      <header className={styles.appHeader}>
        <div className={styles.appHeaderInner}>
          <Link className={styles.homeLink} href={routes.workspace(workspaceSlug)}>
            <span>SignalRoom</span>
            <span className={styles.homeLabel}>Dashboard</span>
          </Link>
          <form action={signOutCurrentUser}>
            <button className={styles.signOutButton} type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </>
  );
}
