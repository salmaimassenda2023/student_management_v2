"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaEdit } from "react-icons/fa";
// Ensure this path is correct based on your project structure
import { useSupabaseAuth } from "@/utils/SupabaseAuthProvider";
import {supabase} from "@/utils/supabaseConfig";

export default function DashboardPage() {
    const router = useRouter();
    // Destructure accessToken, user, logout, and the supabase client from context
    const { accessToken, user, logout } = useSupabaseAuth();

    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Initial loading for the whole page
    const [error, setError] = useState(null);
    const [currentUserInfo, setCurrentUserInfo] = useState(null); // To store current user's role
    const [editingUser, setEditingUser] = useState(null); // User currently being edited
    const [newRole, setNewRole] = useState(""); // State for the new role input

    const allowedRoles = ['CLIENT', 'MANAGER', 'ADMIN']; // Ensure these match your Supabase user_type values

    // Effect 1: Authenticate user and set current user info
    // This runs once when accessToken or user changes
    useEffect(() => {
        if (!accessToken || !user) {
            console.log("No access token or user found, redirecting to signin.");
            router.push('/signin');
            return; // Exit early
        }

        // Set current user info from the context's user object
        setCurrentUserInfo({
            uid: user.firebase_uid, // Assuming firebase_uid is stored
            role: user.user_type,   // Assuming user_type is the role column
            email: user.email,
            id: user.id             // Supabase user ID
        });

        // After successfully determining user, stop initial page loading.
        // The table's loading state will be managed by the fetchUsers useEffect.
        setIsLoading(false);

    }, [accessToken, user, router]); // Dependencies: accessToken, user, router

    // Effect 2: Fetch all users (dependent on currentUserInfo and supabase client)
    useEffect(() => {
        const fetchUsers = async () => {
            // Check for supabase client and user authorization BEFORE trying to fetch
            if (!supabase) {
                console.warn("Supabase client is not yet available. Cannot fetch users.");
                return; // Don't proceed if supabase is undefined
            }

            // This is an admin dashboard, so only ADMINs should fetch the user list.
            // If the user is not an ADMIN, stop here.
            if (!currentUserInfo || currentUserInfo.role !== 'CLIENT') {
                console.log("Not authorized to fetch users (requires ADMIN role).");
                // Don't set isLoading(false) here, as it's for unauthorized access and initial loading is handled
                return;
            }

            setIsLoading(true); // Start loading for the user list specifically
            setError(null); // Clear previous errors

            try {
                // Use the Supabase client to fetch users
                const { data: fetchedUsers, error: fetchError } = await supabase
                    .from('users') // Your users table name
                    .select('id, firebase_uid, email, user_type, full_name, created_at, updated_at'); // Explicitly select columns

                if (fetchError) {
                    console.error("Supabase fetch users error:", fetchError.message);
                    throw new Error(fetchError.message);
                }

                // Map Supabase data to match your component's expected structure
                const formattedUsers = fetchedUsers.map(u => ({
                    id: u.id,
                    uid: u.firebase_uid,
                    email: u.email,
                    role: u.user_type,
                    createdAt: u.created_at,
                    lastSignInTime: u.updated_at, // Assuming updated_at can serve as a proxy for last interaction/sign-in time
                }));

                setUsers(formattedUsers); // Update the state with fetched users
            } catch (err) {
                console.error("Error fetching users:", err.message);
                setError("Failed to load user data: " + err.message);
                if (err.message.includes("not authorized") || err.message.includes("permission denied")) {
                    alert("Your session has expired or you are not authorized. Please log in again.");
                    logout();
                    router.push('/signin');
                }
            } finally {
                setIsLoading(false); // End loading for user list
            }
        };

        // Trigger fetchUsers only if currentUserInfo is set, it's an ADMIN, AND supabase is ready
        if (currentUserInfo && currentUserInfo.role === 'CLIENT' && supabase) {
            fetchUsers();
        }

    }, [currentUserInfo, router, logout, supabase]); // Dependencies for fetching users

    const handleEditRole = (userToEdit) => {
        setEditingUser(userToEdit);
        setNewRole(userToEdit.role); // Set current role as default for editing
    };

    const handleUpdateRole = async () => {
        // Ensure all necessary data/clients are available before attempting update
        if (!editingUser || !newRole || !accessToken || !supabase) {
            console.error("Missing data for role update.");
            return;
        }

        setIsLoading(true); // Indicate loading for the update action
        setError(null); // Clear previous errors
        try {
            // Update the user's role in Supabase
            const { data, error: updateError } = await supabase
                .from('users')
                .update({ user_type: newRole, updated_at: new Date().toISOString() }) // Assuming 'user_type' is your role column
                .eq('id', editingUser.id); // Use the Supabase 'id' for updating

            if (updateError) {
                console.error('Supabase update error:', updateError);
                throw new Error(updateError.message);
            }

            // Update the user's role in the local state to reflect the change immediately
            setUsers(prevUsers =>
                prevUsers.map(userItem =>
                    userItem.id === editingUser.id ? { ...userItem, role: newRole } : userItem
                )
            );
            setEditingUser(null); // Exit editing mode
            setNewRole(""); // Clear new role state
            alert("Rôle mis à jour avec succès! 🎉"); // Success feedback
        } catch (err) {
            console.error("Error updating user role:", err.message);
            setError(`Erreur lors de la mise à jour du rôle: ${err.message}`);
            if (err.message.includes("not authorized") || err.message.includes("permission denied")) {
                alert("Your session has expired or you are not authorized to update roles. Please log in again.");
                logout();
                router.push('/signin');
            }
        } finally {
            setIsLoading(false); // End loading for update action
        }
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setNewRole("");
    };

    const handleLogout = () => {
        logout(); // Call the logout function from your context
        router.push('/signin');
    };

    // --- Loading and Authorization States ---
    // Show a general loading message if authentication info isn't fully loaded yet.
    if (!accessToken || !user || !currentUserInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-black dark:text-white">
                <p className="text-xl font-semibold">Chargement du tableau de bord...</p>
            </div>
        );
    }

    // Display error message if there's a problem fetching data
    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 text-red-500">
                <p className="text-xl font-semibold">Erreur: {error}</p>
                <button
                    onClick={() => router.push('/signin')}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                >
                    Retour à la connexion
                </button>
            </div>
        );
    }

    // Access control: Only ADMINs can view this page.
    // This check runs AFTER currentUserInfo is surely available.
    if (currentUserInfo.role !== 'CLIENT') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-red-500 flex-col">
                <p className="text-xl font-semibold mb-4">Accès Refusé. Seuls les administrateurs peuvent accéder à cette page. 🚫</p>
                <button
                    onClick={() => router.push('/')}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                >
                    Retour à l'accueil
                </button>
            </div>
        );
    }

    // --- Main Dashboard Content (rendered only for authenticated ADMINs) ---
    return (
        <div className="min-h-screen flex flex-col items-center justify-start p-8 gap-8 bg-gray-50 dark:bg-gray-900 text-black dark:text-white">
            <div className="w-full flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Tableau de bord administrateur 📊</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                >
                    Déconnexion
                </button>
            </div>
            {/* Display current user's full_name and user_type */}
            {user && (
                <h1 className="text-2xl font-semibold">Bienvenue, {user.full_name} ({user.user_type}) 👋</h1>
            )}

            <div className="w-full max-w-5xl">
                <h2 className="text-xl font-semibold mb-4">Gestion des utilisateurs</h2>
                {isLoading ? ( // Show loading indicator specifically for the user list content
                    <p className="text-lg">Chargement des utilisateurs...</p>
                ) : users.length === 0 ? (
                    <p className="text-lg">Aucun utilisateur trouvé.</p>
                ) : (
                    <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-700">
                        <thead className="bg-gray-200 dark:bg-gray-800">
                        {/* FIX FOR HYDRATION ERROR: NO WHITESPACE BETWEEN <th> TAGS */}
                        <tr>
                            <th>Email</th>
                            <th>Rôle</th>
                            <th>Créé le</th>
                            <th>Dernière maj.</th>
                            <th>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((userItem) => (
                            <tr key={userItem.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="border px-4 py-2">{userItem.email}</td>
                                <td className="border px-4 py-2">
                                    {editingUser?.id === userItem.id ? (
                                        <select
                                            value={newRole}
                                            onChange={(e) => setNewRole(e.target.value)}
                                            className="border rounded px-2 py-1 text-black bg-white dark:bg-gray-600 dark:text-white"
                                        >
                                            {allowedRoles.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        userItem.role
                                    )}
                                </td>
                                <td className="border px-4 py-2 text-center text-sm">
                                    {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="border px-4 py-2 text-center text-sm">
                                    {userItem.lastSignInTime ? new Date(userItem.lastSignInTime).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="border px-4 py-2 text-center space-x-2">
                                    {editingUser?.id === userItem.id ? (
                                        <>
                                            <button
                                                onClick={handleUpdateRole}
                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                                                // Prevent admin demoting self
                                                disabled={isLoading || (userItem.id === currentUserInfo.id && newRole !== 'ADMIN')}
                                            >
                                                Mettre à jour
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                                                disabled={isLoading}
                                            >
                                                Annuler
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleEditRole(userItem)}
                                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                            // Admin cannot edit their own role via this UI to prevent accidental lockout
                                            disabled={isLoading || userItem.id === currentUserInfo.id}
                                        >
                                            <FaEdit />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}