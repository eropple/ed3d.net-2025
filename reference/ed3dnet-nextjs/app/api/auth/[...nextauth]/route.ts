import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";

import { CONFIG } from "@/lib/config";
import { db } from "@/lib/db";

const adapter = DrizzleAdapter(db);

const handler = NextAuth({
  adapter,
  providers: [],
  secret: CONFIG().NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
