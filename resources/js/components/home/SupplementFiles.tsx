import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import { ArrowDown, ArrowUp, Edit, MoreVertical, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface FileUpload {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    category: string | null;
    created_at: string;
    updated_at: string;
}

interface FormData {
    files: File[];
    category: string;
    supplementType: string;
}

const SupplementFiles: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filteredFiles, setFilteredFiles] = useState<FileUpload[]>([]);
    const [sortField, setSortField] = useState<keyof FileUpload>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [loadingFileId, setLoadingFileId] = useState<string | null>(null);
    const [expandedFile, setExpandedFile] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
        files: [],
        category: 'supplements',
        supplementType: 'Christmas',
    });
    const [editFileId, setEditFileId] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchFiles = async () => {
            setIsFetching(true);
            try {
                const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}&category=supplements` : '?category=supplements';
                const response = await axios.get(`/api/file-uploads${query}`);
                setFilteredFiles(response.data);
            } catch (error) {
                toast.error('Failed to fetch files');
            } finally {
                setIsFetching(false);
            }
        };

        fetchFiles();
    }, [searchQuery]);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setSearchQuery(value);
        }, 300),
        [],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
    };

    const handleSort = (field: keyof FileUpload) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedFiles = filteredFiles?.slice().sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        let compareA: string | number = aValue ?? '';
        let compareB: string | number = bValue ?? '';

        if (sortField === 'created_at') {
            compareA = new Date(aValue as string).getTime();
            compareB = new Date(bValue as string).getTime();
        } else if (sortField === 'file_size') {
            compareA = aValue as number;
            compareB = bValue as number;
        } else if (sortField === 'category') {
            compareA = aValue ? aValue.toString().toLowerCase() : '';
            compareB = bValue ? bValue.toString().toLowerCase() : '';
        } else {
            compareA = aValue?.toString().toLowerCase() ?? '';
            compareB = bValue?.toString().toLowerCase() ?? '';
        }

        if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
        if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            if (file.size > 50 * 1024 * 1024) {
                toast.error('File size must be less than 50MB');
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
                toast.error('Only JPEG, PNG, or GIF images are allowed');
                return;
            }
            setFormData((prev) => ({
                ...prev,
                files: [file],
            }));
        }
    };

    const handleCreate = async () => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }

        if (formData.files.length === 0) {
            toast.error('An image file is required');
            return;
        }

        setIsSubmitting(true);
        const data = new FormData();
        formData.files.forEach((file, index) => {
            data.append(`files[${index}]`, file, file.name);
        });
        const fullCategory = formData.category.trim() ? `${formData.category} - ${formData.supplementType}` : formData.supplementType;
        data.append('category', fullCategory);

        try {
            const response = await axios.post('/api/file-uploads', data);
            setFilteredFiles([...filteredFiles, ...response.data]);
            toast.success('File uploaded successfully');
            setShowCreateModal(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to upload file');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (file: FileUpload) => {
        setEditFileId(file.id);
        const [baseCategory, supplementType] = file.category ? file.category.split(' - ') : ['supplements', 'Christmas'];
        setFormData({
            files: [],
            category: baseCategory,
            supplementType: supplementType || 'Christmas',
        });
        setShowEditModal(true);
    };

    const handleUpdate = async () => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }

        setIsSubmitting(true);
        const data = new FormData();
        formData.files.forEach((file, index) => {
            data.append(`files[${index}]`, file, file.name);
        });
        const fullCategory = formData.category.trim() ? `${formData.category} - ${formData.supplementType}` : formData.supplementType;
        data.append('category', fullCategory);
        data.append('_method', 'PUT');

        try {
            const response = await axios.post(`/api/file-uploads/${editFileId}`, data);
            setFilteredFiles(filteredFiles.map((item) => (item.id === editFileId ? response.data : item)));
            toast.success('File updated successfully');
            setShowEditModal(false);
            resetForm();
        } catch (error: any) {
            if (error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else if (error.response?.data?.errors) {
                const errorMessages = Object.values(error.response.data.errors).flat();
                toast.error(errorMessages.join(', '));
            } else {
                toast.error('Failed to update file');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }

        setLoadingFileId(id);
        try {
            await axios.delete(`/api/file-uploads/${id}`);
            setFilteredFiles(filteredFiles.filter((item) => item.id !== id));
            toast.success('File deleted successfully');
        } catch (error) {
            toast.error('Failed to delete file');
        } finally {
            setLoadingFileId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            files: [],
            category: 'supplements',
            supplementType: 'Christmas',
        });
        setEditFileId(null);
    };

    const formatFileSize = (size: number) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    };

    const getCategoryAndSupplementType = (category: string | null) => {
        if (!category) return { baseCategory: '-', supplementType: '-' };
        const [baseCategory, supplementType] = category.split(' - ');
        return { baseCategory: baseCategory || 'supplements', supplementType: supplementType || '-' };
    };

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <motion.div
                    className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: 'linear',
                    }}
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
                <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">Supplement Files 📂</h2>
                <div className="flex w-full items-center gap-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search by file name or category"
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
                        Upload File
                    </button>
                </div>
            </div>

            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">{showEditModal ? 'Edit File' : 'Upload New File'}</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Image File * <span className="text-xs text-gray-500">(Max 50MB, JPEG/PNG/GIF)</span>
                                </label>
                                <div className="flex items-center space-x-4">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
                                        <Upload className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <label className="cursor-pointer rounded-md border bg-gray-100 px-4 py-2 transition-colors hover:bg-gray-200">
                                        {formData.files.length > 0 ? 'Change File' : 'Select File'}
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/jpeg,image/png,image/gif"
                                            onChange={handleFileUpload}
                                            disabled={isSubmitting}
                                        />
                                    </label>
                                    {formData.files.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    files: [],
                                                }))
                                            }
                                            className="text-sm text-red-600 hover:text-red-800"
                                            disabled={isSubmitting}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                                {formData.files.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-600">Selected File:</p>
                                        <p className="text-sm text-gray-600">{formData.files[0].name}</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Supplement Type</label>
                                <div className="flex gap-4">
                                    {['Christmas', "New Year's Eve", 'Easter'].map((type) => (
                                        <label key={type} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="supplementType"
                                                value={type}
                                                checked={formData.supplementType === type}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        supplementType: e.target.value,
                                                    }))
                                                }
                                                disabled={isSubmitting}
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
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
                                            {showEditModal ? 'Updating...' : 'Uploading...'}
                                        </span>
                                    ) : showEditModal ? (
                                        'Update'
                                    ) : (
                                        'Upload'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isFetching && <p>Loading...</p>}
            {!isFetching && !filteredFiles?.length && <p>No files found for your search</p>}
            {!isFetching && filteredFiles?.length > 0 && (
                <>
                    <div className="hidden overflow-x-auto shadow-md sm:rounded-lg md:block">
                        <table className="min-w-full table-auto text-left text-sm text-gray-500">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('file_name')}>
                                        <div className="flex items-center">
                                            File Name{' '}
                                            {sortField === 'file_name' &&
                                                (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                        </div>
                                    </th>
                                    <th className="px-4 py-2">Preview</th>

                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('category')}>
                                        <div className="flex items-center">
                                            Category{' '}
                                            {sortField === 'category' && (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                        </div>
                                    </th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('category')}>
                                        <div className="flex items-center">
                                            Supplement Type{' '}
                                            {sortField === 'category' && (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
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
                                {sortedFiles?.map((file) => {
                                    const { baseCategory, supplementType } = getCategoryAndSupplementType(file.category);
                                    return (
                                        <tr key={file.id} className="border-b hover:bg-gray-100">
                                            <td className="px-4 py-4">{file.file_name}</td>
                                            <td className="px-4 py-4">
                                                {file.file_type.startsWith('image/') ? (
                                                    <img src={file.file_path} alt={file.file_name} className="h-16 w-16 rounded object-cover" />
                                                ) : (
                                                    <div className="flex h-16 w-16 items-center justify-center text-gray-400">
                                                        <Upload size={24} />
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-4">{baseCategory}</td>
                                            <td className="px-4 py-4">{supplementType}</td>
                                            <td className="px-4 py-4">{new Date(file.created_at).toLocaleDateString()}</td>
                                            <td className="flex gap-2 px-4 py-4">
                                                <button
                                                    className="rounded bg-green-500 px-3 py-1 text-sm text-white transition-colors hover:bg-green-600"
                                                    onClick={() => handleEdit(file)}
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    className="rounded bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
                                                    onClick={() => handleDelete(file.id)}
                                                    disabled={loadingFileId === file.id}
                                                >
                                                    {loadingFileId === file.id ? 'Deleting...' : <Trash2 size={14} />}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-4 md:hidden">
                        {sortedFiles?.map((file) => {
                            const { baseCategory, supplementType } = getCategoryAndSupplementType(file.category);
                            return (
                                <div key={file.id} className="rounded-lg border p-4 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{file.file_name}</h3>
                                            <p className="text-sm text-gray-500">Size: {formatFileSize(file.file_size)}</p>
                                        </div>
                                        <button
                                            onClick={() => setExpandedFile(expandedFile === file.id ? null : file.id)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>

                                    {expandedFile === file.id && (
                                        <div className="mt-3 space-y-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-600">Preview:</span>
                                                {file.file_type.startsWith('image/') ? (
                                                    <img
                                                        src={file.file_path}
                                                        alt={file.file_name}
                                                        className="mt-1 h-32 w-full rounded object-cover"
                                                    />
                                                ) : (
                                                    <div className="mt-1 flex h-32 w-full items-center justify-center text-gray-400">
                                                        <Upload size={32} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-600">Category:</span>
                                                <span className="text-sm">{baseCategory}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-600">Supplement Type:</span>
                                                <span className="text-sm">{supplementType}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">Created:</span>
                                                <span className="text-sm">{new Date(file.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    className="flex-1 rounded bg-blue-500 py-1 text-sm text-white"
                                                    onClick={() => handleEdit(file)}
                                                >
                                                    Edit File
                                                </button>
                                                <button
                                                    className="flex-1 rounded bg-red-500 py-1 text-sm text-white"
                                                    onClick={() => handleDelete(file.id)}
                                                    disabled={loadingFileId === file.id}
                                                >
                                                    {loadingFileId === file.id ? 'Deleting...' : 'Delete File'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </motion.div>
    );
};

export default SupplementFiles;
