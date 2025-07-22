// components/drivers/DriverListClient.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from "@/utils/SupabaseAuthProvider";

export default function DriverListClient() {
    const router = useRouter();
    const { supabase, loading, logout, user } = useSupabase(); // Get user from Firebase context

    const [drivers, setDrivers] = useState([]);
    const [error, setError] = useState(null);
    const [fetchLoading, setFetchLoading] = useState(false);

    // Handle data fetching when we have a user
    useEffect(() => {
        const fetchDrivers = async () => {
            // Don't fetch if still loading auth or no user
            if (loading || !user) {
                return;
            }

            setFetchLoading(true);
            try {
                const { data, error: fetchError } = await supabase
                    .from('drivers')
                    .select('*');

                if (fetchError) {
                    console.error("Supabase error:", fetchError);
                    setError(fetchError.message);
                } else {
                    setDrivers(data || []);
                    setError(null); // Clear any previous errors
                }
            } catch (error) {
                console.error("Error fetching drivers:", error);
                setError("Failed to fetch drivers");
            } finally {
                setFetchLoading(false);
            }
        };

        fetchDrivers();
    }, [supabase, user, loading]);

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4">Loading...</p>
                </div>
            </div>
        );
    }

    // Show login page if not authenticated (no user)
    if (!user) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <p className="mb-4">Please log in to see the drivers list.</p>
                    <button
                        onClick={() => router.push('/signin')}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    function goDashboard() {
        router.push("/dashboard");
    }

    function retryFetch() {
        setError(null);
        // Trigger re-fetch by updating a dependency or calling fetchDrivers directly
        window.location.reload(); // Simple approach, or implement a retry state
    }

    // Show error if there's one
    if (error) {
        return (
            <div className="container mx-auto p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Drivers List</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={goDashboard}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={logout}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p>Error: {error}</p>
                    <button
                        onClick={retryFetch}
                        className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Show drivers list (user is authenticated)
    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Drivers List</h1>
                <div className="flex gap-2">
                    <button
                        onClick={goDashboard}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={logout}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Show user info if available */}
            {user && (
                <div className="mb-4 p-3 bg-gray-100 rounded">
                    <p className="text-sm text-gray-600">
                        Logged in as: {user.email || user.uid}
                    </p>
                </div>
            )}

            {fetchLoading ? (
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading drivers...</span>
                </div>
            ) : drivers.length === 0 ? (
                <p className="text-gray-500">No drivers found in the system.</p>
            ) : (
                <div className="grid gap-4">
                    {drivers.map(driver => (
                        <div key={driver.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow">
                            <h3 className="font-bold text-lg">{driver.name}</h3>
                            <p className="text-gray-600">Phone: {driver.tele}</p>
                            <p className="text-gray-600">Age: {driver.age}</p>
                            {/* Add more driver fields as needed */}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}