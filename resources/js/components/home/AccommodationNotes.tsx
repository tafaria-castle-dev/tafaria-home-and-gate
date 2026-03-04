import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import { ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface AccommodationNote {
    id: string;
    name: string;
    description: string;
    created_at: string;
}

interface FormData {
    name: string;
    description: string;
}

export default function AccommodationNotes() {
    const { isAuthenticated, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredNotes, setFilteredNotes] = useState<AccommodationNote[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [formData, setFormData] = useState<FormData>({ name: '', description: '' });
    const [editNoteId, setEditNoteId] = useState<string | null>(null);
    const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
    const [nameToDelete, setNameToDelete] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [sortField, setSortField] = useState<keyof AccommodationNote>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [expandedNote, setExpandedNote] = useState<string | null>(null);

    const fetchNotes = useCallback(async () => {
        setIsFetching(true);
        try {
            const response = await axios.get(`/api/accommodation-notes${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
            setFilteredNotes(response.data);
        } catch (error) {
            toast.error('Failed to fetch notes');
        } finally {
            setIsFetching(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchNotes();
        }
    }, [isAuthenticated, fetchNotes]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin' && filteredNotes.length === 0) {
            const createDefaultNotes = async () => {
                const defaultNotes = [
                    { name: 'educational', description: 'Educational notes', created_by: user?.id },
                    { name: 'general', description: 'General notes', created_by: user?.id },
                ];

                try {
                    const response = await axios.get('/api/accommodation-notes');
                    const existingNotes = response.data;
                    const existingNoteNames = existingNotes.map((note: AccommodationNote) => note.name);

                    const notesToCreate = defaultNotes.filter((note) => !existingNoteNames.includes(note.name));

                    for (const note of notesToCreate) {
                        await axios.post('/api/accommodation-notes', note);
                    }
                    await fetchNotes();
                } catch (error) {
                    toast.error('Failed to create default notes');
                }
            };

            createDefaultNotes();
        }
    }, [isAuthenticated, user, filteredNotes.length, fetchNotes]);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearchQuery(value);
        }, 300),
        [],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
    };

    const sortedNotes = filteredNotes?.slice().sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        if (sortField === 'created_at') {
            aValue = new Date(aValue).getTime().toString();
            bValue = new Date(bValue).getTime().toString();
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
        if (!formData.name.trim() || !formData.description.trim()) {
            toast.error('Name and description are required');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post('/api/accommodation-notes', {
                name: formData.name,
                description: formData.description,
                created_by: user?.id,
            });
            setFilteredNotes([...filteredNotes, response.data]);
            toast.success('Note created successfully');
            setShowCreateModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to create note');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (note: AccommodationNote) => {
        setEditNoteId(note.id);
        setFormData({ name: note.name, description: note.description });
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!user) {
            toast.error('You must be logged in');
            return;
        }
        if (!formData.name.trim() || !formData.description.trim()) {
            toast.error('Name and description are required');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.patch(`/api/accommodation-notes/${editNoteId}`, {
                name: formData.name,
                description: formData.description,
            });
            setFilteredNotes(filteredNotes.map((item) => (item.id === editNoteId ? response.data : item)));
            toast.success('Note updated successfully');
            setShowEditModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to update note');
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
            await axios.delete(`/api/accommodation-notes/${deleteNoteId}`);
            setFilteredNotes(filteredNotes.filter((item) => item.id !== deleteNoteId));
            toast.success('Note deleted successfully');
            setShowDeleteModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to delete note');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', description: '' });
        setEditNoteId(null);
        setDeleteNoteId(null);
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
                <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">Accommodation Notes</h2>
                <div className="flex w-full items-center gap-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search notes..."
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
                            <Plus size={16} /> Add Note
                        </button>
                    )}
                </div>
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">Create New Note</h3>
                        <input
                            type="text"
                            placeholder="Note Name"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            onKeyDown={handleCreateKeyPress}
                            disabled={isSubmitting}
                            autoFocus
                        />
                        <textarea
                            placeholder="Note Description"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            disabled={isSubmitting}
                            rows={4}
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
                        <h3 className="mb-4 text-lg font-semibold">Edit Note</h3>
                        <input
                            type="text"
                            placeholder="Note Name"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            onKeyDown={handleUpdateKeyPress}
                            disabled
                            autoFocus
                        />
                        <textarea
                            placeholder="Note Description"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            disabled={isSubmitting}
                            rows={4}
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
                        <h3 className="mb-4 text-lg font-semibold">Delete Note</h3>
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
            {!isFetching && !filteredNotes?.length && <p>No notes found for your search</p>}
            {!isFetching && filteredNotes?.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sortedNotes?.map((note) => (
                        <div
                            key={note.id}
                            className="cursor-pointer rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md"
                            onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{note.name}</h3>
                                </div>
                                {expandedNote === note.id ? (
                                    <ChevronUp size={18} className="text-gray-400" />
                                ) : (
                                    <ChevronDown size={18} className="text-gray-400" />
                                )}
                            </div>
                            {expandedNote === note.id && (
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center">
                                        <span className="text-sm text-gray-600">Title: </span>
                                        <span className="pl-2 text-sm">
                                            <strong>{note.name}</strong>
                                        </span>
                                    </div>
                                    <div className="flex items-start">
                                        <span className="text-sm text-gray-600">Description: </span>
                                        <span className="pl-2 text-sm">{note.description}</span>
                                    </div>
                                    {user?.role === 'admin' && (
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                className="flex-1 rounded bg-blue-500 py-1 text-sm text-white transition-colors hover:bg-blue-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(note);
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="flex-1 rounded bg-red-500 py-1 text-sm text-white transition-colors hover:bg-red-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteNoteId(note.id);
                                                    setNameToDelete(note.name);
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
