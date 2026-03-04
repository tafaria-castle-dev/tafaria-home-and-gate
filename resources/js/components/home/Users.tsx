import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, MoreVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { formatMySQLDate } from '../utils/formatMYSQLDate';

export default function UserManagement() {
    const { isAuthenticated, user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(true);
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortDirection, setSortDirection] = useState<string>('desc');
    const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [newName, setNewName] = useState<string>('');
    const [newPasscode, setNewPasscode] = useState<string>('');
    const [selectedSignature, setSelectedSignature] = useState<File | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchUsers();
        }
    }, [isAuthenticated]);

    const fetchUsers = async () => {
        try {
            setIsFetching(true);
            const response = await axios.get('/api/users', {
                params: { deleted: false },
            });
            setUsers(response.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load users');
        } finally {
            setIsFetching(false);
        }
    };

    const updateUserRole = async (id: string, role: string) => {
        if (user?.role !== 'admin') {
            toast.error('Only admins can update roles');
            return;
        }

        if (id === user?.id) {
            toast.error('Cannot change your own role');
            return;
        }

        setLoadingUserId(id);
        try {
            await axios.put(`/api/users/${id}`, { role });
            toast.success('Role updated successfully');
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update role');
        } finally {
            setLoadingUserId(null);
        }
    };
    const saveUserName = async (id: string, name: string) => {
        setLoadingUserId(id);
        try {
            await axios.put(`/api/users/${id}`, { name });
        } catch (error) {
            console.error(error);
            toast.error('Failed to update name');
        } finally {
            setLoadingUserId(null);
        }
    };
    const saveUserPasscode = async (id: string, passcode: string) => {
        setLoadingUserId(id);
        try {
            await axios.put(`/api/users/${id}`, { pass_code: passcode });
        } catch (error) {
            console.error(error);
            toast.error('Failed to update passcode');
        } finally {
            setLoadingUserId(null);
        }
    };

    const updateUserName = async (id: string, name: string, userToEdit: string, signature?: File) => {
        if (user?.role !== 'admin') {
            toast.error('Only admins can update user details');
            return;
        }

        if (!name.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        if (name !== userToEdit) {
            try {
                await saveUserName(id, name);
                toast.success('Name updated successfully');
                fetchUsers();
            } catch (error) {
                console.error(error);
                toast.error('Failed to update user details');
            } finally {
                setLoadingUserId(null);
            }
        }
        if (newPasscode) {
            if (newPasscode.length < 4 || newPasscode.length > 6) {
                toast.error('Passcode must be between 4 and 6 characters');
                return;
            }
            try {
                await saveUserPasscode(id, newPasscode);
                toast.success('Passcode updated successfully');
                fetchUsers();
                setNewPasscode('');
            } catch (error) {
                console.error(error);
                toast.error('Failed to update user passcode!');
            } finally {
                setLoadingUserId(null);
            }
        }

        if (signature) {
            setLoadingUserId(id);
            try {
                const formData = new FormData();
                formData.append('_method', 'PUT');
                formData.append('signature', signature, signature.name);
                await axios.post(`/api/users/${id}`, formData);
                toast.success('Signature updated successfully');
                setEditingUserId(null);
                setSelectedSignature(null);
                fetchUsers();
            } catch (error) {
                console.error(error);
                toast.error('Failed to update user details');
            } finally {
                setLoadingUserId(null);
            }
        }
    };

    const toggleUserStatus = async (id: string, deleted: boolean) => {
        if (id === user?.id) {
            toast.error('Cannot change your own status');
            return;
        }

        setLoadingUserId(id);
        try {
            await axios.put(`/api/users/${id}`, { deleted: !deleted });
            toast.success(deleted ? 'User restored successfully' : 'User deleted successfully');
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update user status');
        } finally {
            setLoadingUserId(null);
        }
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                setSelectedSignature(file);
            } else {
                toast.error('Please select an image file');
                e.target.value = '';
            }
        }
    };

    const sortedUsers = users?.slice().sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];

        if (sortField === 'created_at') {
            aValue = new Date(aValue);
            bValue = new Date(bValue);
        } else {
            aValue = aValue?.toString().toLowerCase();
            bValue = bValue?.toString().toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg bg-white p-4 shadow-md sm:p-6"
        >
            <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">Users 📜</h2>
            <p className="my-2 text-gray-600">Here you can manage users!</p>

            {isFetching && <p>Loading...</p>}
            {!isFetching && !users?.length && <p>No users found</p>}
            {!isFetching && users?.length > 0 && (
                <>
                    <div className="hidden overflow-x-auto shadow-md sm:rounded-lg md:block">
                        <table className="min-w-full table-auto text-left text-sm text-gray-500">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('name')}>
                                        <div className="flex items-center">
                                            Name{' '}
                                            {sortField === 'name' && (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                        </div>
                                    </th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('email')}>
                                        <div className="flex items-center">
                                            Email{' '}
                                            {sortField === 'email' && (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                        </div>
                                    </th>
                                    <th className="px-4 py-2">Role</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('created_at')}>
                                        <div className="flex items-center">
                                            Created At{' '}
                                            {sortField === 'created_at' &&
                                                (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                        </div>
                                    </th>
                                    <th className="px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedUsers?.map((userItem) => (
                                    <tr key={userItem.id} className="border-b hover:bg-gray-100">
                                        <td className="px-4 py-2">
                                            {editingUserId === userItem.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <input
                                                        type="text"
                                                        value={newName}
                                                        onChange={(e) => setNewName(e.target.value)}
                                                        className="rounded border border-gray-400 bg-gray-50 p-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                        placeholder="Enter new name"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={newPasscode}
                                                        onChange={(e) => setNewPasscode(e.target.value)}
                                                        className="rounded border border-gray-400 bg-gray-50 p-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                        placeholder="Enter new passcode"
                                                    />
                                                    <div className="relative flex flex-col gap-1">
                                                        <label className="text-xs text-gray-600">Signature (optional):</label>
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handleFileChange}
                                                                className="rounded border border-gray-400 bg-gray-50 p-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-blue-500 file:px-4 file:py-1 file:text-sm file:text-white hover:file:bg-blue-600"
                                                            />
                                                            <svg
                                                                className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500"
                                                                width="20"
                                                                height="20"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth="2"
                                                                    d="M12 4v16m8-8H4"
                                                                />
                                                            </svg>
                                                        </div>
                                                        {selectedSignature && (
                                                            <span className="text-xs text-green-600">{selectedSignature.name}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="rounded bg-blue-500 px-2 py-1 text-sm text-white"
                                                            onClick={() =>
                                                                updateUserName(userItem.id, newName, userItem.name, selectedSignature || undefined)
                                                            }
                                                            disabled={loadingUserId === userItem.id}
                                                        >
                                                            {loadingUserId === userItem.id ? 'Saving...' : 'Save'}
                                                        </button>
                                                        <button
                                                            className="rounded bg-gray-300 px-2 py-1 text-sm text-gray-700"
                                                            onClick={() => {
                                                                setEditingUserId(null);
                                                                setNewName('');
                                                                setSelectedSignature(null);
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {userItem.name}
                                                    <button
                                                        className="ml-3 border bg-green-500 px-3 text-sm text-white hover:underline"
                                                        onClick={() => {
                                                            setEditingUserId(userItem.id);
                                                            setNewName(userItem.name);
                                                        }}
                                                        disabled={user?.role !== 'admin'}
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">{userItem.email}</td>
                                        <td className="px-4 py-2">
                                            <select
                                                className="rounded border p-1 text-sm"
                                                value={userItem.role}
                                                onChange={(e) => updateUserRole(userItem.id, e.target.value)}
                                                disabled={loadingUserId === userItem.id || user?.role !== 'admin' || userItem.id === user?.id}
                                            >
                                                <option value="client">Client</option>
                                                <option value="staff">Staff</option>
                                                <option value="super_staff">Super Staff</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                    userItem.deleted ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                }`}
                                            >
                                                {userItem.deleted ? 'Not Active' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">{formatMySQLDate(userItem.created_at)}</td>
                                        <td className="px-4 py-2">
                                            <button
                                                className={`rounded px-3 py-1 text-sm text-white ${userItem.deleted ? 'bg-green-500' : 'bg-red-500'}`}
                                                onClick={() => toggleUserStatus(userItem.id, userItem.deleted)}
                                                disabled={loadingUserId === userItem.id || userItem.id === user?.id}
                                            >
                                                {loadingUserId === userItem.id ? 'Processing...' : userItem.deleted ? 'Restore' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-4 md:hidden">
                        {sortedUsers?.map((userItem) => (
                            <div key={userItem.id} className="rounded-lg border p-4 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        {editingUserId === userItem.id ? (
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    className="rounded border border-gray-400 bg-gray-50 p-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                    placeholder="Enter new name"
                                                />
                                                <div className="relative flex flex-col gap-1">
                                                    <label className="text-xs text-gray-600">Signature (optional):</label>
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleFileChange}
                                                            className="rounded border border-gray-400 bg-gray-50 p-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-blue-500 file:px-4 file:py-1 file:text-sm file:text-white hover:file:bg-blue-600"
                                                        />
                                                        <svg
                                                            className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500"
                                                            width="20"
                                                            height="20"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </div>
                                                    {selectedSignature && <span className="text-xs text-green-600">{selectedSignature.name}</span>}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="rounded bg-blue-500 px-2 py-1 text-sm text-white"
                                                        onClick={() =>
                                                            updateUserName(userItem.id, newName, userItem.name, selectedSignature || undefined)
                                                        }
                                                        disabled={loadingUserId === userItem.id}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        className="rounded bg-gray-300 px-2 py-1 text-sm text-gray-700"
                                                        onClick={() => {
                                                            setEditingUserId(null);
                                                            setNewName('');
                                                            setSelectedSignature(null);
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <h3 className="font-medium text-gray-900">{userItem.name}</h3>
                                                <button
                                                    className="text-sm text-blue-500 hover:underline"
                                                    onClick={() => {
                                                        setEditingUserId(userItem.id);
                                                        setNewName(userItem.name);
                                                    }}
                                                    disabled={user?.role !== 'admin'}
                                                >
                                                    Edit Name
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-sm text-gray-500">{userItem.email}</p>
                                    </div>
                                    <button
                                        onClick={() => setExpandedUser(expandedUser === userItem.id ? null : userItem.id)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>

                                {expandedUser === userItem.id && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Role:</span>
                                            <select
                                                className="rounded border p-1 text-sm"
                                                value={userItem.role}
                                                onChange={(e) => updateUserRole(userItem.id, e.target.value)}
                                                disabled={loadingUserId === userItem.id || user?.role !== 'admin' || userItem.id === user?.id}
                                            >
                                                <option value="client">Client</option>
                                                <option value="staff">Staff</option>
                                                <option value="super_staff">Super Staff</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Status:</span>
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                    userItem.deleted ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                }`}
                                            >
                                                {userItem.deleted ? 'Not Active' : 'Active'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Created:</span>
                                            <span className="text-sm">{formatMySQLDate(userItem.created_at)}</span>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                className={`w-full rounded py-1 text-sm text-white ${
                                                    userItem.deleted ? 'bg-green-500' : 'bg-red-500'
                                                }`}
                                                onClick={() => toggleUserStatus(userItem.id, userItem.deleted)}
                                                disabled={loadingUserId === userItem.id || userItem.id === user?.id}
                                            >
                                                {loadingUserId === userItem.id ? 'Processing...' : userItem.deleted ? 'Restore User' : 'Delete User'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </motion.div>
    );
}
