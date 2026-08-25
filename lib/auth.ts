import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (!user.consentAt) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Google OAuth accounts skip the explicit consent-checkbox path only if
      // they've already consented once (e.g. re-login). New Google sign-ups
      // are routed through /consent before they can use the app.
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (existing && !existing.consentAt) {
          // allow sign-in; app-level guard sends them to /consent
          return true;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
      }
      const email = user?.email ?? token.email;
      // Re-read consent/plan from the DB on every request that decodes this
      // token (not just sign-in) so that accepting consent, or an
      // upgrade/downgrade, is reflected immediately without depending on
      // client-side session.update() round-trips.
      if (email) {
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.email = dbUser.email;
          token.consented = Boolean(dbUser.consentAt);
          token.plan = dbUser.plan;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
        (session.user as { consented?: boolean }).consented = Boolean(
          token.consented
        );
        (session.user as { plan?: string }).plan = token.plan as string;
      }
      return session;
    },
  },
});
