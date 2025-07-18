// handel supabase session on the app context
// components/SupabaseProvider.js
'use client'; // This directive makes it a Client Component

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation'; // Correct import for App Router
import { authService } from '@/utils/authService'; // Adjust path based on your project structure

export default function SupabaseProvider({ children, initialSession }) {
    const [supabaseClient] = useState(() => createBrowserSupabaseClient({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }));

    const router = useRouter();

    // Handle Supabase auth state changes (optional, but good for reactivity)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            console.log('Supabase session signed out. Redirecting to login.');
            router.push('/login');
        }
    });

    const handleLogout = async () => {
        try {
            await authService.signOut();
            // Redirection handled by onAuthStateChange listener
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to log out: ' + error.message);
        }
    };

    return (
        <SessionContextProvider
            supabaseClient={supabaseClient}
            initialSession={initialSession} // Pass initialSession from parent layout
        >

            {children}
        </SessionContextProvider>
    );
}