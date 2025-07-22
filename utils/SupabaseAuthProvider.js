// app/auth/SupabaseAuthProvider.js
"use client";

import React, { createContext, useState, useContext } from 'react';

// Create the context with a default value of null
const SupabaseAuthContext = createContext(null);
const EDGE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_EDGE_FUNCTION_URL;


// Create the provider component
export const SupabaseAuthProvider = ({ children }) => {
    const [accessToken, setAccessToken] = useState(null);

    // This function calls your Edge Function to trade a Firebase token for a Supabase token
    const loginWithFirebaseToken = async (firebaseToken) => {
        try {
            const response = await fetch(EDGE_FUNCTION_URL, { // A Next.js API route that calls your Edge Function
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: firebaseToken }),
            });

            if (!response.ok) {
                // Handle error
                const errorData = await response.json();
                console.error("Failed to get Supabase token:", errorData.error);
                setAccessToken(null);
                throw new Error(errorData.error || "Failed to get Supabase token");
            }

            const data = await response.json();
            setAccessToken(data.access_token);
        } catch (error) {
            console.error("Error during loginWithFirebaseToken:", error);
            setAccessToken(null);
            throw error; // Re-throw to allow calling component to handle
        }
    };

    const logout = () => {
        // Clear the token from state
        setAccessToken(null);
        // You would also sign the user out of Firebase here (e.g., firebase.auth().signOut())
        console.log("User logged out.");
    };

    return (
        <SupabaseAuthContext.Provider value={{ accessToken, loginWithFirebaseToken, logout }}>
            {children}
        </SupabaseAuthContext.Provider>
    );
};

// Create a custom hook for easy access to the context
export const useSupabaseAuth = () => {
    const context = useContext(SupabaseAuthContext);
    if (!context) {
        throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
    }
    return context;
};