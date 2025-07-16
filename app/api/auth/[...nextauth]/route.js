// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import { authOptions } from "@/utils/authOptions" ;

const handler = NextAuth(authOptions);

// Exporter les méthodes HTTP que NextAuth doit gérer
export { handler as GET, handler as POST };