// app/auth/SupabaseAuthProvider.js
"use client";
import React, { createContext, useState, useContext, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { auth as firebaseAuth } from '../firebase/firebase-client'; // Assuming you have a firebase init file
import { onAuthStateChanged } from 'firebase/auth';

// Create initial Supabase client (unauthenticated)
const initialSupabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const EDGE_FUNCTION_URL=process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTION_URL;

const SupabaseAuthContext = createContext(null);

export const SupabaseAuthProvider = ({ children }) => {
    const [supabase, setSupabaseClient] = useState(initialSupabaseClient);
    const [loading, setLoading] = useState(true); // Start in a loading state
    const [accessToken, setAccessToken] = useState(null); // Track access token
    const [user, setUser] = useState(null); // Track user

    useEffect(() => {
        // This listener is the key to session persistence
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in with Firebase. Get a fresh Firebase ID token.
                const firebaseToken = await firebaseUser.getIdToken();
                // Trade it for a Supabase access token.
                await loginWithFirebaseToken(firebaseToken);
                setUser(firebaseUser);
            } else {
                // User is signed out. Revert to the unauthenticated client.
                setSupabaseClient(initialSupabaseClient);
                setAccessToken(null);
                setUser(null);
            }
            // Finished checking, set loading to false.
            setLoading(false);
        });

        // Cleanup the subscription when the component unmounts
        return () => unsubscribe();
    }, []); // The empty dependency array ensures this runs only once on mount

    const loginWithFirebaseToken = async (firebaseToken) => {
        try {
            const response = await fetch(EDGE_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({token: firebaseToken }),
            });

            if (!response.ok) {
                throw new Error("Token exchange failed");
            }

            const data = await response.json();
            console.log(data.access_token)

            // Create authenticated client with the access token
            const authenticatedClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    global: {
                        headers: {
                            Authorization: `Bearer ${data.access_token}`
                        }
                    },
                }
            );

            setSupabaseClient(authenticatedClient);
            setAccessToken(data.access_token);
        } catch (error) {
            console.error("Error exchanging Firebase token for Supabase token:", error);
            setSupabaseClient(initialSupabaseClient);
            setAccessToken(null);
        }
    };

    const logout = async () => {
        try {
            await firebaseAuth.signOut(); // Sign out from Firebase
            setSupabaseClient(initialSupabaseClient); // Revert to unauthenticated client
            setAccessToken(null);
            setUser(null);
        } catch (error) {
            console.error("Error during logout:", error);
        }
    };

    return (
        <SupabaseAuthContext.Provider value={{
            supabase,
            loading,
            accessToken,
            user,
            loginWithFirebaseToken,
            logout
        }}>
            {children}
        </SupabaseAuthContext.Provider>
    );
};

export const useSupabase = () => {
    const context = useContext(SupabaseAuthContext);
    if (!context) {
        throw new Error('useSupabase must be used within a SupabaseAuthProvider');
    }
    return context;
};