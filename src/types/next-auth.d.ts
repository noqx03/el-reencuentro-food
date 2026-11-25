import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

export type AppRole = "SUPERADMIN" | "ADMIN" | "VENTAS";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      rol?: AppRole;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
  }
}
