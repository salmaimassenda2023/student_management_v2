// lib/authService.js
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/firebase/firebase-client';

const EDGE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTION_URL;

class AuthService {




    async registerWithGoogle(supabaseClient) {
        try {
            console.log('🔄 Starting Google registration...');
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            console.log('✅ Google authentication successful');
            return await this.exchangeFirebaseTokenForSupabaseSession(userCredential.user, supabaseClient);
        } catch (error) {
            console.error('❌ Google registration error:', error);
            throw error;
        }
    }

    async registerWithEmail(email, password, supabaseClient) {
        try {
            console.log('🔄 Starting email registration...');
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('✅ Email registration successful');
            return await this.exchangeFirebaseTokenForSupabaseSession(userCredential.user, supabaseClient);
        } catch (error) {
            console.error('❌ Email registration error:', error);
            throw error;
        }
    }

    async signInWithEmail(email, password, supabaseClient) {
        try {
            console.log('🔄 Starting email sign in...');
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Email sign in successful');
            return await this.exchangeFirebaseTokenForSupabaseSession(userCredential.user, supabaseClient);
        } catch (error) {
            console.error('❌ Email sign in error:', error);
            throw error;
        }
    }

    async signInWithGoogle(supabaseClient) {
        try {
            console.log('🔄 Starting Google sign in...');
            const userCredential = await signInWithPopup(auth, new GoogleAuthProvider());
            console.log('✅ Google sign in successful');
            return await this.exchangeFirebaseTokenForSupabaseSession(userCredential.user, supabaseClient);
        } catch (error) {
            console.error('❌ Google sign in error:', error);
            throw error;
        }
    }

    async signOut(supabaseClient) {
        try {
            console.log('🔄 Starting sign out...');
            await Promise.all([
                auth.signOut(),
                supabaseClient?.auth.signOut()
            ]);
            console.log('✅ Sign out successful');
        } catch (error) {
            console.error('❌ Sign out error:', error);
            throw error;
        }
    }
}

export const authService = new AuthService();