import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import { ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

interface OpportunityName {
    id: string;
    name: string;
    created_at: string;
}

export default function OpportunityTypes() {
    const { isAuthenticated, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredOpportunityTypes, setFilteredOpportunityTypes] = useState<OpportunityName[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formData, setFormData] = useState({ name: '' });
    const [editOpportunityNameId, setEditOpportunityNameId] = useState<string | null>(null);
    const [deleteOpportunityNameId, setDeleteOpportunityNameId] = useState<string | null>(null);
    const [nameToDelete, setNameToDelete] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [sortField, setSortField] = useState<keyof OpportunityName>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [expandedOpportunityName, setExpandedOpportunityName] = useState<string | null>(null);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearchQuery(value);
        }, 300),
        [],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
    };

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchOpportunityTypes = async () => {
            setIsFetching(true);
            try {
                const response = await axios.get(`/api/opportunity-names${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
                setFilteredOpportunityTypes(response.data);
            } catch (error) {
                toast.error('Failed to fetch opportunity types');
            } finally {
                setIsFetching(false);
            }
        };

        fetchOpportunityTypes();
    }, [searchQuery]);

    const handleSort = (field: keyof OpportunityName) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedOpportunityTypes = useMemo(() => {
        return filteredOpportunityTypes.slice().sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];
            if (sortField === 'created_at') {
                aValue = new Date(aValue).getTime().toString();
                bValue = new Date(bValue).getTime().toString();
            } else {
                aValue = aValue.toString().toLowerCase();
                bValue = bValue.toString().toLowerCase();
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredOpportunityTypes, sortField, sortDirection]);

    const handleCreate = async () => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }
        if (!formData.name.trim()) {
            toast.error('Opportunity Type is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post('/api/opportunity-names', { name: formData.name });
            setFilteredOpportunityTypes([...filteredOpportunityTypes, response.data]);
            toast.success('Opportunity type created successfully');
            setShowCreateModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to create opportunity type');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (opportunityName: OpportunityName) => {
        setEditOpportunityNameId(opportunityName.id);
        setFormData({ name: opportunityName.name });
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }
        if (!formData.name.trim()) {
            toast.error('Opportunity type is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.put(`/api/opportunity-names/${editOpportunityNameId}`, { name: formData.name });
            setFilteredOpportunityTypes(filteredOpportunityTypes.map((item) => (item.id === editOpportunityNameId ? response.data : item)));
            toast.success('Opportunity type updated successfully');
            setShowEditModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to update opportunity type');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }
        setIsSubmitting(true);
        try {
            await axios.delete(`/api/opportunity-names/${deleteOpportunityNameId}`);
            setFilteredOpportunityTypes(filteredOpportunityTypes.filter((item) => item.id !== deleteOpportunityNameId));
            toast.success('Opportunity type deleted successfully');
            setShowDeleteModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to delete opportunity type');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '' });
        setEditOpportunityNameId(null);
        setDeleteOpportunityNameId(null);
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg bg-white p-4 shadow-md sm:p-6"
        >
            <div className="mb-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">Opportunity Types</h2>
                <div className="flex w-full items-center gap-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search opportunity types..."
                            className="w-full rounded-lg border p-2 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            onChange={handleSearch}
                        />
                        <Search size={20} className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
                    </div>
                    <button
                        className="flex shrink-0 items-center gap-2 rounded bg-blue-500 px-3 py-2 text-white"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={16} /> Add Opportunity Type
                    </button>
                </div>
            </div>
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">Create New Opportunity Type</h3>
                        <input
                            type="text"
                            placeholder="Opportunity Name Title"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ name: e.target.value })}
                            onKeyDown={handleCreateKeyPress}
                            disabled={isSubmitting}
                            autoFocus
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
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
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
                        <h3 className="mb-4 text-lg font-semibold">Edit Opportunity Type</h3>
                        <input
                            type="text"
                            placeholder="Opportunity Name Title"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ name: e.target.value })}
                            onKeyDown={handleUpdateKeyPress}
                            disabled={isSubmitting}
                            autoFocus
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
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6" onKeyDown={handleDeleteKeyPress}>
                        <h3 className="mb-4 text-lg font-semibold">Delete Opportunity Type</h3>
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
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
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
            {!isFetching && !filteredOpportunityTypes?.length && <p>No opportunity types found for your search</p>}
            {!isFetching && filteredOpportunityTypes?.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sortedOpportunityTypes?.map((opportunityName) => (
                        <div
                            key={opportunityName.id}
                            className="cursor-pointer rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md"
                            onClick={() => setExpandedOpportunityName(expandedOpportunityName === opportunityName.id ? null : opportunityName.id)}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{opportunityName.name}</h3>
                                </div>
                                {expandedOpportunityName === opportunityName.id ? (
                                    <ChevronUp size={18} className="text-gray-400" />
                                ) : (
                                    <ChevronDown size={18} className="text-gray-400" />
                                )}
                            </div>
                            {expandedOpportunityName === opportunityName.id && (
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-600">Title: </span>
                                        <span className="pl-2 text-sm">
                                            <strong>{opportunityName.name}</strong>
                                        </span>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            className="flex-1 rounded bg-blue-500 py-1 text-sm text-white transition-colors hover:bg-blue-600"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(opportunityName);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="flex-1 rounded bg-red-500 py-1 text-sm text-white transition-colors hover:bg-red-600"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteOpportunityNameId(opportunityName.id);
                                                setNameToDelete(opportunityName.name);
                                                setShowDeleteModal(true);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
