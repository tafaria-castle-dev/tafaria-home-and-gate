import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import { ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface Agent {
    id: string;
    name: string;
    email: string | null;
    phone_number: string | null;
    created_at: string;
}

interface FormData {
    name: string;
    email: string;
    phone_number: string;
}

export default function Agents() {
    const { isAuthenticated, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formData, setFormData] = useState<FormData>({ name: '', email: '', phone_number: '' });
    const [editAgentId, setEditAgentId] = useState<string | null>(null);
    const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
    const [nameToDelete, setNameToDelete] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [sortField, setSortField] = useState<keyof Agent>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

    const fetchAgents = useCallback(async () => {
        setIsFetching(true);
        try {
            const response = await axios.get(`/api/agents${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
            setFilteredAgents(response.data);
        } catch (error) {
            toast.error('Failed to fetch agents');
        } finally {
            setIsFetching(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchAgents();
        }
    }, [isAuthenticated, fetchAgents]);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearchQuery(value);
        }, 300),
        [],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
    };

    const sortedAgents = filteredAgents?.slice().sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        if (sortField === 'created_at') {
            aValue = new Date(aValue || 0).getTime().toString();
            bValue = new Date(bValue || 0).getTime().toString();
        } else {
            aValue = aValue?.toString().toLowerCase() || '';
            bValue = bValue?.toString().toLowerCase() || '';
        }
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const handleCreate = async () => {
        if (!user) {
            toast.error('You must be logged in');
            return;
        }
        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: any = {
                name: formData.name,
            };
            if (formData.email.trim()) {
                payload.email = formData.email;
            }
            if (formData.phone_number.trim()) {
                payload.phone_number = formData.phone_number;
            }

            const response = await axios.post('/api/agents', payload);
            setFilteredAgents([...filteredAgents, response.data]);
            toast.success('Agent created successfully');
            setShowCreateModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to create agent');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (agent: Agent) => {
        setEditAgentId(agent.id);
        setFormData({
            name: agent.name,
            email: agent.email || '',
            phone_number: agent.phone_number || '',
        });
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!user) {
            toast.error('You must be logged in');
            return;
        }
        if (!formData.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: any = {
                name: formData.name,
            };
            if (formData.email.trim()) {
                payload.email = formData.email;
            }
            if (formData.phone_number.trim()) {
                payload.phone_number = formData.phone_number;
            }

            const response = await axios.patch(`/api/agents/${editAgentId}`, payload);
            setFilteredAgents(filteredAgents.map((item) => (item.id === editAgentId ? response.data : item)));
            toast.success('Agent updated successfully');
            setShowEditModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to update agent');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!user) {
            toast.error('You must be logged in');
            return;
        }
        setIsSubmitting(true);
        try {
            await axios.delete(`/api/agents/${deleteAgentId}`);
            setFilteredAgents(filteredAgents.filter((item) => item.id !== deleteAgentId));
            toast.success('Agent deleted successfully');
            setShowDeleteModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to delete agent');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', phone_number: '' });
        setEditAgentId(null);
        setDeleteAgentId(null);
        setNameToDelete(null);
    };

    const handleCreateKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isSubmitting) {
            e.preventDefault();
            e.stopPropagation();
            handleCreate();
        }
    };

    const handleUpdateKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isSubmitting) {
            e.preventDefault();
            e.stopPropagation();
            handleUpdate();
        }
    };

    const handleDeleteKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !isSubmitting) {
            e.preventDefault();
            e.stopPropagation();
            handleDelete();
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg bg-white p-4 shadow-md sm:p-6"
        >
            <div className="mb-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">Agents</h2>
                <div className="flex w-full items-center gap-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search agents..."
                            className="w-full rounded-lg border p-2 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            onChange={handleSearch}
                        />
                        <Search size={20} className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
                    </div>
                    {user?.role === 'admin' && (
                        <button
                            className="flex shrink-0 items-center gap-2 rounded bg-blue-500 px-3 py-2 text-white"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={16} /> Add Agent
                        </button>
                    )}
                </div>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">Create New Agent</h3>
                        <input
                            type="text"
                            placeholder="Name *"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            onKeyDown={handleCreateKeyPress}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <input
                            type="email"
                            placeholder="Email (optional)"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            onKeyDown={handleCreateKeyPress}
                            disabled={isSubmitting}
                        />
                        <input
                            type="text"
                            placeholder="Phone Number (optional)"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            onKeyDown={handleCreateKeyPress}
                            disabled={isSubmitting}
                        />
                        <div className="flex gap-4">
                            <button
                                className="flex-1 rounded bg-gray-300 p-2 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 rounded bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
                                onClick={handleCreate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                                        <svg
                                            className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        Creating...
                                    </span>
                                ) : (
                                    'Create'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">Edit Agent</h3>
                        <input
                            type="text"
                            placeholder="Name *"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            onKeyDown={handleUpdateKeyPress}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <input
                            type="email"
                            placeholder="Email (optional)"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            onKeyDown={handleUpdateKeyPress}
                            disabled={isSubmitting}
                        />
                        <input
                            type="text"
                            placeholder="Phone Number (optional)"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            onKeyDown={handleUpdateKeyPress}
                            disabled={isSubmitting}
                        />
                        <div className="flex gap-4">
                            <button
                                className="flex-1 rounded bg-gray-300 p-2 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={() => {
                                    setShowEditModal(false);
                                    resetForm();
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 rounded bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
                                onClick={handleUpdate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                                        <svg
                                            className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        Updating...
                                    </span>
                                ) : (
                                    'Update'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onKeyDown={handleDeleteKeyPress}>
                    <div className="w-full max-w-md rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">Delete Agent</h3>
                        <p className="mb-4">Are you sure you want to delete {nameToDelete}?</p>
                        <div className="flex gap-4">
                            <button
                                className="flex-1 rounded bg-gray-300 p-2 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    resetForm();
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 rounded bg-red-500 p-2 text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                                        <svg
                                            className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        Deleting...
                                    </span>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isFetching && <p>Loading...</p>}
            {!isFetching && !filteredAgents?.length && <p>No agents found for your search</p>}
            {!isFetching && filteredAgents?.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sortedAgents?.map((agent) => (
                        <div
                            key={agent.id}
                            className="cursor-pointer rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md"
                            onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{agent.name}</h3>
                                </div>
                                {expandedAgent === agent.id ? (
                                    <ChevronUp size={18} className="text-gray-400" />
                                ) : (
                                    <ChevronDown size={18} className="text-gray-400" />
                                )}
                            </div>
                            {expandedAgent === agent.id && (
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-600">Name: </span>
                                        <span className="pl-2 text-sm">
                                            <strong>{agent.name}</strong>
                                        </span>
                                    </div>
                                    {agent.email && (
                                        <div className="flex items-center">
                                            <span className="text-sm text-gray-600">Email: </span>
                                            <span className="pl-2 text-sm">{agent.email}</span>
                                        </div>
                                    )}
                                    {agent.phone_number && (
                                        <div className="flex items-center">
                                            <span className="text-sm text-gray-600">Phone: </span>
                                            <span className="pl-2 text-sm">{agent.phone_number}</span>
                                        </div>
                                    )}
                                    {user?.role === 'admin' && (
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                className="flex-1 rounded bg-blue-500 py-1 text-sm text-white transition-colors hover:bg-blue-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(agent);
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="flex-1 rounded bg-red-500 py-1 text-sm text-white transition-colors hover:bg-red-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteAgentId(agent.id);
                                                    setNameToDelete(agent.name);
                                                    setShowDeleteModal(true);
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
