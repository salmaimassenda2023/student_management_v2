// lib/firebase-admin.js
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Configuration Firebase Admin avec les bonnes variables d'environnement
const firebaseAdminConfig = {
    credential: cert({
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
};

// Initialize Firebase Admin
const app = !getApps().length ? initializeApp(firebaseAdminConfig) : getApps()[0];
const auth = getAuth(app);

export { app, auth };