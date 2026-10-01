import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

/**
 * Auth configuration — swappable providers.
 * In dev mode, a Credentials provider lets you switch users instantly.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    // ── Google OAuth ─────────────────────────────────────
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),

    // ── Dev Login (development only) ─────────────────────
    ...(process.env.NODE_ENV === "development"
      ? [
          CredentialsProvider({
            id: "dev-login",
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "text" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              const user = await prisma.user.findUnique({
                where: { email: credentials.email },
              });
              if (!user) return null;
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.avatarUrl,
              };
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Restrict to allowed domain if configured
      const allowedDomain = process.env.ALLOWED_DOMAIN;
      if (allowedDomain && !user.email.endsWith(`@${allowedDomain}`)) {
        return false;
      }

      // Check user exists in our DB
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!dbUser) return false; // Only pre-registered users can log in

      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.designation = dbUser.designation;
          token.department = dbUser.department;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).role = token.role as string;
        (session.user as any).designation = token.designation as string;
        (session.user as any).department = token.department as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
