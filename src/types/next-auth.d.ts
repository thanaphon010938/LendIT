import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "USER";
      /** false once an admin suspends the account; checked on every request. */
      active: boolean;
      /** true while the user is on an admin-issued temporary password. */
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "USER";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "USER";
    active?: boolean;
    mustChangePassword?: boolean;
  }
}
