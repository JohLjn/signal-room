"use server";

import { CredentialsSignin } from "next-auth";

import { signIn, signOut } from "@/features/auth/config";

export type SignInState = Readonly<{
  error?: string;
}>;

export async function signInWithCredentials(
  _previousState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return { error: "Invalid email or password." };
    }

    throw error;
  }

  return {};
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut({ redirectTo: "/sign-in" });
}
