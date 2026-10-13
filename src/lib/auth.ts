import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        employeeId: { label: "รหัสพนักงาน", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.employeeId || !credentials?.password) {
          return null;
        }

        const user = await db.user.findFirst({
          where: { employeeId: credentials.employeeId.trim().toUpperCase() },
        });

        if (!user || user.approvalStatus !== "APPROVED" || user.isActive === false) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: "ADMIN" | "USER" }).role;
      }
      // Re-read the account on every session check so a suspension, role change or name change by an
      // admin applies immediately instead of when the JWT expires. (Middleware only decodes the JWT and
      // never runs this callback, so this stays out of the edge runtime.)
      if (token.id) {
        const account = await db.user.findUnique({
          where: { id: token.id },
          select: { name: true, role: true, isActive: true, approvalStatus: true, mustChangePassword: true },
        });
        token.active = Boolean(account && account.isActive !== false && account.approvalStatus === "APPROVED");
        if (account) {
          token.role = account.role;
          token.name = account.name;
          token.mustChangePassword = account.mustChangePassword === true;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "USER";
        session.user.name = token.name ?? session.user.name;
        session.user.active = token.active !== false;
        session.user.mustChangePassword = token.mustChangePassword === true;
      }
      return session;
    },
  },
};

export function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  if (!session.user.active) {
    throw new Error("บัญชีนี้ถูกระงับการใช้งาน");
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
