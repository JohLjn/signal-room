import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { verifyCredentials } from "@/features/auth/credentials";
import { getServerEnv } from "@/lib/env";

export const { auth, handlers, signIn, signOut } = NextAuth(() => ({
  secret: getServerEnv().AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => verifyCredentials(credentials),
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      return userId ? { sub: userId } : {};
    },
    session({ session, token }) {
      if (!token.sub) {
        return session;
      }

      return { ...session, user: { id: token.sub } };
    },
  },
}));
