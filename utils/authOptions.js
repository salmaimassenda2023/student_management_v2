// pages/api/auth/[...nextauth].js (or wherever your authOptions are defined)

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";


// IMPORTANT: Import the Firebase Admin SDK's auth instance
import { auth as adminAuth } from "@/firebase/firebase-admin"; // Alias to avoid name conflict with client-side 'auth' if it were still imported

export const authOptions = {
    providers: [
        // Provider for Google via Firebase (already correctly implemented)
        CredentialsProvider({
            id: "firebase-google",
            name: "Google",
            credentials: {
                idToken: { label: "ID Token", type: "text" },
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.idToken) {
                        return null;
                    }

                    // This part is already correct, using adminAuth
                    const decodedToken = await adminAuth.verifyIdToken(credentials.idToken);

                    // Map Firebase decoded token to NextAuth.js user object
                    return {
                        id: decodedToken.uid,
                        email: decodedToken.email,
                        name: decodedToken.name || decodedToken.email, // Ensure name exists
                        image: decodedToken.picture || null, // Firebase tokens often have 'picture' for photoURL
                    };
                } catch (error) {
                    console.error("Firebase Google auth error:", error);
                    // NextAuth expects an error to be thrown for failed authorization
                    throw new Error("Firebase Google authentication failed: " + error.message);
                }
            },
        }),

        // Provider for Email/Password via Firebase - REVISED
        CredentialsProvider({
            id: "firebase-credentials",
            name: "Email/Password",
            credentials: {
                // Now, this provider also expects an ID token from the client
                idToken: { label: "ID Token", type: "text" },
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.idToken) {
                        return null; // No ID token provided
                    }

                    // Use Firebase Admin SDK to verify the ID token sent from the client
                    const decodedToken = await adminAuth.verifyIdToken(credentials.idToken);

                    // The decodedToken contains the user's information
                    return {
                        id: decodedToken.uid,
                        email: decodedToken.email,
                        name: decodedToken.name || decodedToken.email, // Use name from token, fallback to email
                    };
                } catch (error) {
                    console.error("Firebase Email/Password auth error in authorize:", error);
                    // Re-throw the error so NextAuth handles the unauthorized state
                    throw new Error("Firebase Email/Password authentication failed: " + error.message);
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            // The 'user' object here comes from the 'authorize' function's return value
            if (user) {
                token.uid = user.id;
                token.email = user.email; // Add email to token
                token.name = user.name;   // Add name to token
                token.picture = user.image; // Add image to token
            }
            return token;
        },

        async session({ session, token }) {
            // Populate the session object with data from the token
            if (token) {
                session.user.uid = token.uid;
                session.user.email = token.email;
                session.user.name = token.name;
                session.user.image = token.picture;
            }
            return session;
        },
    },

    session: {
        strategy: "jwt",
    },

    pages: {
        signIn: "/signin",
    },
};

export default NextAuth(authOptions);