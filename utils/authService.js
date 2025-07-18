// lib/authService.js
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/firebase/firebase-client'; // Your Firebase auth instance
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

// IMPORTANT: Ensure this matches your deployed Edge Function URL
const EDGE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTION_URL;

class AuthService {
    constructor() {
        this.supabase = createBrowserSupabaseClient();
    }

    // Common method to exchange Firebase token for Supabase session
    async exchangeFirebaseTokenForSupabaseSession(firebaseUser) {
        if (!firebaseUser) throw new Error('Firebase user is null.');

        const firebaseToken = await firebaseUser.getIdToken(); // Get fresh token

        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: firebaseToken }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to exchange token: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        const supabaseAccessToken = data.access_token;

        // Set the Supabase session in the client
        await this.supabase.auth.setSession({ access_token: supabaseAccessToken });

        console.log('Successfully signed in to Supabase via Edge Function!');
        return data.user; // Return the Supabase user record
    }

    // Register user with Firebase and get Supabase session
    async registerWithGoogle() {
        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            return this.exchangeFirebaseTokenForSupabaseSession(userCredential.user);
        } catch (error) {
            console.error('Firebase registration error:', error);
            throw error;
        }
    }

    async registerWithEmail(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            return this.exchangeFirebaseTokenForSupabaseSession(userCredential.user);
        } catch (error) {
            console.error('Firebase registration error:', error);
            throw error;
        }
    }

    // Sign in user with Firebase and get Supabase session
    async signInWithEmail(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );
            return this.exchangeFirebaseTokenForSupabaseSession(userCredential.user);
        } catch (error) {
            console.error('Firebase sign-in error:', error);
            throw error;
        }
    }
    async signInWithGoogle() {
        try {
            const userCredential = await  signInWithPopup(auth, new GoogleAuthProvider());
            return this.exchangeFirebaseTokenForSupabaseSession(userCredential.user);
        } catch (error) {
            console.error('Firebase sign-in error:', error);
            throw error;
        }
    }

    // Sign out from both Firebase (optional but good practice) and Supabase
    async signOut() {
        try {
            await auth.signOut(); // Sign out from Firebase
            await this.supabase.auth.signOut(); // Clear Supabase session
            console.log('Successfully signed out.');
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }
}

export const authService = new AuthService();