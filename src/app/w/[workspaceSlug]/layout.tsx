import { notFound, redirect } from "next/navigation";

import { signOutCurrentUser } from "@/features/auth/actions";
import { resolveAuthContext } from "@/features/workspaces/resolve-auth-context";
import { isAppError } from "@/lib/errors";

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
      <header>
        <form action={signOutCurrentUser}>
          <button type="submit">Sign out</button>
        </form>
      </header>
      {children}
    </>
  );
}
