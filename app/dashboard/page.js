// app/dashboard/page.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaEdit } from "react-icons/fa";
import {useSupabaseAuth} from "@/utils/SupabaseAuthProvider"; // Using FaEdit for the edit button

export default function DashboardPage() {
    const router = useRouter();

    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [idToken, setIdToken] = useState(null);
    const [currentUserInfo, setCurrentUserInfo] = useState(null); // To store current user's role
    const [editingUser, setEditingUser] = useState(null); // User currently being edited
    const [newRole, setNewRole] = useState(""); // State for the new role input

    const allowedRoles = ['user', 'manager', 'admin']; // Define roles here for client-side dropdown

    // Function to get the token from localStorage
    const { accessToken, logout } = useSupabaseAuth();

    // Initial check for token and redirection
    useEffect(() => {

        if (!accessToken) {
            router.push('/signin'); // No token found, redirect to sign-in
        } else {
            setIdToken(token);
        }
    }, [router]);

    // Fetch current user's info to check role
    useEffect(() => {
        const fetchCurrentUserRole = async () => {
            if (!idToken) return;
            try {
                let { data: users, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq()
            } catch (err) {
                console.error("Error fetching current user role:", err.message);
                setError("Failed to verify user role. Please try again.");
                localStorage.removeItem('firebaseIdToken');
                router.push('/signin');
            }
        };

        if (idToken) {
            fetchCurrentUserRole();
        }
    }, [idToken, router]);


    // Fetch all users when idToken and current user info are available and admin role is confirmed
    useEffect(() => {
        const fetchUsers = async () => {
            if (!idToken || !currentUserInfo || currentUserInfo.role !== 'admin') {
                setIsLoading(false); // Stop loading if not authorized or token/info missing
                return;
            }

            setIsLoading(true);
            try {
                const res = await fetch("/api/admin-profile-setup", { // Assuming your GET API is at /api/admin/list-users
                    headers: { 'Authorization': `Bearer ${idToken}` },
                });

                if (res.status === 401 || res.status === 403) {
                    console.warn("Unauthorized to list users. Redirecting.");
                    localStorage.removeItem('firebaseIdToken');
                    router.push('/signin');
                    return;
                }
                if (!res.ok) throw new Error("Failed to fetch users: " + res.statusText);

                const data = await res.json();
                setUsers(data.users);
            } catch (err) {
                console.error("Error fetching users:", err.message);
                setError("Failed to load user data.");
            } finally {
                setIsLoading(false);
            }
        };

        if (idToken && currentUserInfo && currentUserInfo.role === 'admin') {
            fetchUsers();
        }
    }, [idToken, currentUserInfo, router]); // Re-run when these dependencies change

    const handleEditRole = (user) => {
        setEditingUser(user);
        setNewRole(user.role); // Set current role as default for editing
    };

    const handleUpdateRole = async () => {
        if (!editingUser || !newRole || !idToken) return;

        setIsLoading(true); // Indicate loading for the update action
        try {
            const res = await fetch("/api/admin-profile-setup", { // Your POST API route
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ uid: editingUser.uid, role: newRole }),
            });

            if (res.status === 401 || res.status === 403) {
                console.warn("Unauthorized to update role. Redirecting.");
                localStorage.removeItem('firebaseIdToken');
                router.push('/signin');
                return;
            }
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(`Failed to update role: ${errorData.message || res.statusText}`);
            }

            // Update the user's role in the local state
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.uid === editingUser.uid ? { ...user, role: newRole } : user
                )
            );
            setEditingUser(null); // Exit editing mode
            setNewRole(""); // Clear new role state
            alert("Rôle mis à jour avec succès!"); // Success feedback
        } catch (err) {
            console.error("Error updating user role:", err.message);
            setError(`Erreur lors de la mise à jour du rôle: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setNewRole("");
    };

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('firebaseIdToken');
        }
        router.push('/signin');
    };

    // --- Loading and Authorization States ---
    if (isLoading || !idToken || !currentUserInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-black dark:text-white">
                <p className="text-xl font-semibold">Chargement du tableau de bord...</p>
            </div>
        );
    }

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

    // This condition means user info loaded, but they are not an admin
    if (currentUserInfo && currentUserInfo.role !== 'admin') {
        // The useEffect should have already redirected them, but as a fallback
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-red-500">
                <p className="text-xl font-semibold">Accès Refusé. Seuls les administrateurs peuvent accéder à cette page.</p>
                <button
                    onClick={() => router.push('/')}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                >
                    Retour à l'accueil
                </button>
            </div>
        );
    }

    // --- Main Dashboard Content ---
    return (
        <div className="min-h-screen flex flex-col items-center justify-start p-8 gap-8 bg-gray-50 dark:bg-gray-900 text-black dark:text-white">
            <div className="w-full flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                >
                    Déconnexion
                </button>
            </div>

            <div className="w-full max-w-5xl">
                <h2 className="text-xl font-semibold mb-4">Gestion des utilisateurs</h2>
                {users.length === 0 ? (
                    <p>Aucun utilisateur trouvé.</p>
                ) : (
                    <table className="w-full table-auto border-collapse border border-gray-300 dark:border-gray-700">
                        <thead className="bg-gray-200 dark:bg-gray-800">
                        <tr>
                            <th className="border px-4 py-2 text-left">Email</th>
                            <th className="border px-4 py-2 text-left">Rôle</th>
                            <th className="border px-4 py-2 text-center">Créé le</th>
                            <th className="border px-4 py-2 text-center">Dernière connexion</th>
                            <th className="border px-4 py-2 text-center">Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((user) => (
                            <tr key={user.uid} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="border px-4 py-2">{user.email}</td>
                                <td className="border px-4 py-2">
                                    {editingUser?.uid === user.uid ? (
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
                                        user.role
                                    )}
                                </td>
                                <td className="border px-4 py-2 text-center text-sm">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="border px-4 py-2 text-center text-sm">
                                    {new Date(user.lastSignInTime).toLocaleDateString()}
                                </td>
                                <td className="border px-4 py-2 text-center space-x-2">
                                    {editingUser?.uid === user.uid ? (
                                        <>
                                            <button
                                                onClick={handleUpdateRole}
                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                                                disabled={isLoading || (user.uid === currentUserInfo.uid && newRole !== 'admin')} // Prevent admin demoting self
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
                                            onClick={() => handleEditRole(user)}
                                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                            disabled={isLoading || user.uid === currentUserInfo.uid} // Admin cannot edit their own role via this UI to prevent accidental lockout
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