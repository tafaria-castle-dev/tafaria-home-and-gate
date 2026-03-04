import axios from 'axios';
import { ChevronDown, ChevronUp, Edit, Plus, SortAsc, SortDesc, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

interface Tax {
    id: string;
    name: string;
    tax_code: string;
    rate: number;
}

interface TaxPayload {
    name: string;
    tax_code: string;
    rate: number;
    [key: string]: string | number;
}

const TaxSettingsForm: React.FC = () => {
    const [activeTab, setActiveTab] = useState('view');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Tax | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [expandedTax, setExpandedTax] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState<TaxPayload>({
        name: '',
        tax_code: '',
        rate: 0,
    });

    const [sortConfig, setSortConfig] = useState<{
        key: keyof Tax | null;
        direction: 'asc' | 'desc';
    }>({ key: null, direction: 'asc' });

    useEffect(() => {
        const fetchTaxes = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/api/taxes');
                setTaxes(response.data);
            } catch (error) {
                toast.error('Failed to fetch taxes!');
            } finally {
                setLoading(false);
            }
        };
        fetchTaxes();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.tax_code || formData.rate === 0) {
            toast.error('All fields are required!');
            return;
        }

        setIsCreating(true);
        try {
            const response = await axios.post('/api/taxes', formData);
            setTaxes([...taxes, response.data]);
            toast.success('Tax added successfully!');
            setFormData({
                name: '',
                tax_code: '',
                rate: 0,
            });
            setActiveTab('view');
        } catch (error) {
            console.error(error);
            toast.error('Failed to add tax!');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingId || !editFormData) return;

        const updatePayload: TaxPayload = {
            name: editFormData.name,
            tax_code: editFormData.tax_code,
            rate: editFormData.rate,
        };

        setIsUpdating(true);
        try {
            const response = await axios.put(`/api/taxes/${editingId}`, updatePayload);
            setTaxes(taxes.map((tax) => (tax.id === editingId ? response.data : tax)));
            toast.success('Tax updated successfully!');
            setIsEditModalOpen(false);
            setEditingId(null);
            setEditFormData(null);
        } catch (error) {
            console.error(error);
            toast.error('Failed to update tax!');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this tax?')) return;
        try {
            await axios.delete(`/api/taxes/${id}`);
            setTaxes(taxes.filter((tax) => tax.id !== id));
            toast.success('Tax deleted successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete tax!');
        }
    };

    const handleSort = (key: keyof Tax) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTaxes = useMemo(() => {
        if (!sortConfig.key) return taxes;
        return [...taxes].sort((a, b) => {
            const aValue = a[sortConfig.key!];
            const bValue = b[sortConfig.key!];

            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return 1;
            if (bValue == null) return -1;

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [taxes, sortConfig]);

    return (
        <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Tax Settings</h2>
                <button
                    onClick={() => setActiveTab(activeTab === 'view' ? 'create' : 'view')}
                    className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                >
                    {activeTab === 'view' ? (
                        <>
                            <Plus size={18} /> Create Tax
                        </>
                    ) : (
                        <>
                            <X size={18} /> Cancel
                        </>
                    )}
                </button>
            </div>

            {/* Create Tax Form */}
            {activeTab === 'create' && (
                <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                placeholder="Tax name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-lg border p-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Tax Code</label>
                            <input
                                type="text"
                                placeholder="Tax code"
                                value={formData.tax_code}
                                onChange={(e) => setFormData({ ...formData, tax_code: e.target.value })}
                                className="w-full rounded-lg border p-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Rate (%)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={isNaN(formData.rate) ? '' : formData.rate}
                                onChange={(e) => {
                                    const newValue = parseFloat(e.target.value);
                                    setFormData({
                                        ...formData,
                                        rate: isNaN(newValue) ? 0 : newValue,
                                    });
                                }}
                                className="w-full rounded-lg border p-2"
                                required
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
                            >
                                {isCreating ? 'Creating...' : 'Create Tax'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Display Taxes */}
            {activeTab === 'view' && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden overflow-x-auto shadow-md sm:rounded-lg md:block">
                        {loading ? (
                            <p>Loading...</p>
                        ) : taxes?.length === 0 ? (
                            <p>No taxes found</p>
                        ) : (
                            <table className="min-w-full table-auto text-left text-sm text-gray-500">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {[
                                            { label: 'Name', key: 'name' as keyof Tax },
                                            { label: 'Tax Code', key: 'tax_code' as keyof Tax },
                                            { label: 'Rate (%)', key: 'rate' as keyof Tax },
                                        ].map(({ label, key }) => (
                                            <th key={key} onClick={() => handleSort(key)} className="cursor-pointer px-4 py-2 hover:bg-gray-200">
                                                <div className="flex items-center">
                                                    {label}
                                                    {sortConfig.key === key &&
                                                        (sortConfig.direction === 'asc' ? (
                                                            <SortAsc className="ml-1" size={14} />
                                                        ) : (
                                                            <SortDesc className="ml-1" size={14} />
                                                        ))}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-2 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedTaxes?.map((tax) => (
                                        <tr key={tax.id} className="border-b hover:bg-gray-100">
                                            <td className="px-4 py-2">{tax.name}</td>
                                            <td className="px-4 py-2">{tax.tax_code}</td>
                                            <td className="px-4 py-2">{tax.rate}%</td>
                                            <td className="flex justify-center gap-2 px-4 py-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(tax.id);
                                                        setEditFormData(tax);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tax.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Mobile Cards */}
                    <div className="mt-4 space-y-4 md:hidden">
                        {loading ? (
                            <p>Loading...</p>
                        ) : taxes.length === 0 ? (
                            <p>No taxes found</p>
                        ) : (
                            sortedTaxes.map((tax) => (
                                <div key={tax.id} className="rounded-lg border p-4 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{tax.name}</h3>
                                            <p className="text-sm text-gray-500">{tax.tax_code}</p>
                                        </div>
                                        <button
                                            onClick={() => setExpandedTax(expandedTax === tax.id ? null : tax.id)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            {expandedTax === tax.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>

                                    {expandedTax === tax.id && (
                                        <div className="mt-3 space-y-3">
                                            <div>
                                                <p className="text-sm text-gray-500">Rate</p>
                                                <p className="text-sm font-medium">{tax.rate}%</p>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(tax.id);
                                                        setEditFormData(tax);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-500 px-3 py-1 text-sm text-white"
                                                >
                                                    <Edit size={14} /> Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tax.id)}
                                                    className="flex flex-1 items-center justify-center gap-1 rounded bg-red-500 px-3 py-1 text-sm text-white"
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editFormData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Edit Tax</h2>
                            <button
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingId(null);
                                    setEditFormData(null);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleUpdate();
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Tax Code</label>
                                <input
                                    type="text"
                                    value={editFormData.tax_code}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            tax_code: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Rate (%)</label>
                                <input
                                    type="number"
                                    value={editFormData.rate}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            rate: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setEditingId(null);
                                        setEditFormData(null);
                                    }}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
                                >
                                    {isUpdating ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxSettingsForm;
