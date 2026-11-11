import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // O donde tengas definida la configuración de authOptions

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };