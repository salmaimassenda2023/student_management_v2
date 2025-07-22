// components/drivers/DriverListClient.js
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseAuth } from "@/utils/SupabaseAuthProvider";
import {createClient} from "@supabase/supabase-js";
import {supabase} from "@/utils/supabaseConfig";


export default function DriverListClient() {
    const router = useRouter();
    const { accessToken, logout } = useSupabaseAuth();
    console.log("accessToken",accessToken)
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // const supabaseWithAuth = createClient(
    //     process.env.NEXT_PUBLIC_SUPABASE_URL,
    //     process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    //     {
    //         global: {
    //             headers: {
    //                 Authorization: `Bearer ${accessToken}`
    //             }
    //         }
    //     }
    // );



    // Handle authentication and data fetching
    useEffect(() => {
        const fetchDrivers = async () => {
            if (!accessToken) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);


                // **KEY PART: Use the access token for authenticated requests**
                const { data, error: fetchError } = await supabase
                    .from('drivers')
                    .select('*');

                if (fetchError) {
                    console.error("Supabase error:", fetchError);

                    // Handle token expiration (401 error)
                    if (fetchError.code === '401' || fetchError.message.includes('JWT')) {
                        console.log("Token expired, logging out...");
                        logout();
                        router.push('/signin');
                        return;
                    }

                    setError(fetchError.message);
                } else {
                    setDrivers(data || []);
                }
            } catch (error) {
                console.error("Error fetching drivers:", error);
                setError("Failed to fetch drivers");
            } finally {
                setLoading(false);
            }
        };

        fetchDrivers();
    }, [accessToken]);

    // Redirect to login if no access token
    useEffect(() => {
        if (  !accessToken) {
            router.push('/signin');
        }
    }, [accessToken]);


    // Show login message if not authenticated
    if (!accessToken) {
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


    // Show drivers list
    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Drivers List</h1>
                <button
                    onClick={logout}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Logout
                </button>
            </div>

            {drivers.length === 0 ? (
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