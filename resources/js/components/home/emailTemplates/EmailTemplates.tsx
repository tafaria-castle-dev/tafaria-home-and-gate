import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import { ArrowDown, ArrowUp, Edit, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    description: string;
    created_at: string;
    updated_at: string;
    created_by_id: string;
}

interface FormData {
    name: string;
    subject: string;
    description: string;
}

const EmailTemplates: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filteredTemplates, setFilteredTemplates] = useState<EmailTemplate[]>([]);
    const [sortField, setSortField] = useState<keyof EmailTemplate>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
    const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [isMounted, setIsMounted] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        subject: '',
        description: '',
    });
    const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchTemplates = async () => {
            setIsFetching(true);
            try {
                const response = await axios.get(`/api/email-templates${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
                setFilteredTemplates(response.data);
            } catch (error) {
                toast.error('Failed to fetch email templates');
            } finally {
                setIsFetching(false);
            }
        };

        fetchTemplates();
    }, [searchQuery]);

    const quillModules = {
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image'],
            [{ align: [] }],
            ['clean'],
        ],
    };

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearchQuery(value);
        }, 300),
        [],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
    };

    const handleSort = (field: keyof EmailTemplate) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedTemplates = filteredTemplates?.slice().sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        let compareA: string | number = aValue;
        let compareB: string | number = bValue;

        if (sortField === 'created_at') {
            compareA = new Date(aValue).getTime();
            compareB = new Date(bValue).getTime();
        } else {
            compareA = aValue?.toString().toLowerCase() || '';
            compareB = bValue?.toString().toLowerCase() || '';
        }

        if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
        if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const handleCreate = async () => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }

        if (!formData.name.trim()) {
            toast.error('Template name is required');
            return;
        }
        if (!formData.subject.trim()) {
            toast.error('Subject is required');
            return;
        }
        if (!formData.description) {
            toast.error('Email body is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.post('/api/email-templates', {
                name: formData.name,
                subject: formData.subject,
                description: formData.description,
                created_by_id: user.id,
            });
            setFilteredTemplates([...filteredTemplates, response.data]);
            toast.success('Template created successfully');
            setShowCreateModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to create template');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (template: EmailTemplate) => {
        setEditTemplateId(template.id);
        setFormData({
            name: template.name,
            subject: template.subject,
            description: template.description,
        });
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }

        if (!formData.name.trim()) {
            toast.error('Template name is required');
            return;
        }
        if (!formData.subject.trim()) {
            toast.error('Subject is required');
            return;
        }
        if (!formData.description) {
            toast.error('Email body is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await axios.put(`/api/email-templates/${editTemplateId}`, {
                name: formData.name,
                subject: formData.subject,
                description: formData.description,
            });
            setFilteredTemplates(filteredTemplates.map((item) => (item.id === editTemplateId ? response.data : item)));
            toast.success('Template updated successfully');
            setShowEditModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to update template');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }

        setLoadingTemplateId(id);
        try {
            await axios.delete(`/api/email-templates/${id}`);
            setFilteredTemplates(filteredTemplates.filter((item) => item.id !== id));
            toast.success('Template deleted successfully');
        } catch (error) {
            toast.error('Failed to delete template');
        } finally {
            setLoadingTemplateId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            subject: '',
            description: '',
        });
        setEditTemplateId(null);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <motion.div
                    className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg bg-white p-4 shadow-md sm:p-6"
        >
            <div className="mb-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">Email Templates 📧</h2>
                <div className="flex w-full items-center gap-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search by subject, name or description"
                            className="w-full rounded-lg border p-2 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            onChange={handleSearch}
                        />
                        <Search size={20} className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
                    </div>
                    <button
                        className="flex shrink-0 items-center gap-2 rounded bg-blue-500 px-3 py-2 text-white"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={16} />
                        Add Template
                    </button>
                </div>
            </div>

            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">{showEditModal ? 'Edit Template' : 'Create New Template'}</h3>
                        <input
                            type="text"
                            placeholder="Template Name"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            disabled={isSubmitting}
                        />
                        <input
                            type="text"
                            placeholder="Subject"
                            className="mb-4 w-full rounded border p-2"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            disabled={isSubmitting}
                        />
                        <div className="mb-4">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Email Body</label>
                            {isMounted && (
                                <ReactQuill
                                    value={formData.description}
                                    onChange={(value: string) => setFormData({ ...formData, description: value })}
                                    modules={quillModules}
                                    className="mb-12 h-64"
                                    readOnly={isSubmitting}
                                />
                            )}
                        </div>
                        <div className="flex gap-4">
                            <button
                                className="flex-1 rounded bg-gray-300 p-2 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                    resetForm();
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 rounded bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
                                onClick={showEditModal ? handleUpdate : handleCreate}
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
                                        {showEditModal ? 'Updating...' : 'Creating...'}
                                    </span>
                                ) : showEditModal ? (
                                    'Update'
                                ) : (
                                    'Create'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isFetching && <p>Loading...</p>}
            {!isFetching && !filteredTemplates?.length && <p>No templates found for your search</p>}
            {!isFetching && filteredTemplates?.length > 0 && (
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
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('subject')}>
                                        <div className="flex items-center">
                                            Subject{' '}
                                            {sortField === 'subject' && (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                        </div>
                                    </th>
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
                                {sortedTemplates?.map((template) => (
                                    <tr key={template.id} className="border-b hover:bg-gray-100">
                                        <td className="px-4 py-4">{template.name}</td>
                                        <td className="px-4 py-4">{template.subject}</td>
                                        <td className="px-4 py-4">{new Date(template.created_at).toLocaleDateString()}</td>
                                        <td className="flex gap-2 px-4 py-4">
                                            <button
                                                className="rounded bg-green-500 px-3 py-1 text-sm text-white transition-colors hover:bg-green-600"
                                                onClick={() => handleEdit(template)}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                className="rounded bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
                                                onClick={() => handleDelete(template.id)}
                                                disabled={loadingTemplateId === template.id}
                                            >
                                                {loadingTemplateId === template.id ? 'Deleting...' : <Trash2 size={14} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-4 md:hidden">
                        {sortedTemplates?.map((template) => (
                            <div key={template.id} className="rounded-lg border p-4 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                                        <p className="text-sm text-gray-500">{template.subject}</p>
                                    </div>
                                    <button
                                        onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>

                                {expandedTemplate === template.id && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Subject:</span>
                                            <span className="text-sm">{template.subject}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-600">Body:</span>
                                            <div
                                                className="prose mt-1 max-w-none text-sm"
                                                dangerouslySetInnerHTML={{
                                                    __html: template.description,
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Created:</span>
                                            <span className="text-sm">{new Date(template.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                className="flex-1 rounded bg-blue-500 py-1 text-sm text-white"
                                                onClick={() => handleEdit(template)}
                                            >
                                                Edit Template
                                            </button>
                                            <button
                                                className="flex-1 rounded bg-red-500 py-1 text-sm text-white"
                                                onClick={() => handleDelete(template.id)}
                                                disabled={loadingTemplateId === template.id}
                                            >
                                                {loadingTemplateId === template.id ? 'Deleting...' : 'Delete Template'}
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
};

export default EmailTemplates;
