import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';

interface Tax {
    id: string;
    name: string;
    rate: number;
}

interface Additional {
    id: string;
    name: string;
    description: string;
    dynamic: string;
    type: string;
    resident: string;
    amount_ksh: number;
    taxable_amount: number;
    priority: number;
    taxes: Tax[];
}

enum Type {
    corporate = 'corporate',
    leisure = 'leisure',
}

enum Dynamic {
    False = 'false',
    True = 'true',
}

enum Resident {
    ea = 'ea',
    non = 'non',
}

const Additional = () => {
    const { isAuthenticated, logout, user } = useAuth();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Additional | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedAdditionalIds, setSelectedAdditionalIds] = useState<string[]>([]);
    const [duplicating, setDuplicating] = useState(false);
    const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
    const [isPending, setIsPending] = useState(false);
    const [additionals, setAdditionals] = useState<Additional[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        description: ' ',
        dynamic: Dynamic.False,
        type: Type.corporate,
        resident: Resident.ea,
        amount_ksh: 0,
        taxable_amount: 0,
        priority: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [additionalsResponse, taxesResponse] = await Promise.all([axios.get('/api/additionals'), axios.get('/api/taxes')]);
                setAdditionals(additionalsResponse.data);
                setTaxes(taxesResponse.data);
            } catch (error) {
                toast.error('Failed to fetch data!');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredAdditionals = useMemo(() => {
        if (!searchQuery.trim()) return additionals;

        const query = searchQuery?.toLowerCase();
        return additionals.filter((additional) => {
            return (
                additional.name?.toLowerCase().includes(query) ||
                additional.description?.toLowerCase().includes(query) ||
                additional.type?.toLowerCase().includes(query) ||
                additional.resident?.toLowerCase().includes(query) ||
                additional.amount_ksh?.toString().includes(query)
            );
        });
    }, [additionals, searchQuery]);

    const { totalTaxRate, taxable_amount } = useMemo(() => {
        const applicableTaxes = taxes?.filter((tax) => selectedTaxIds.includes(tax.id));
        const rate = 1 + applicableTaxes.reduce((sum, tax) => sum + (tax.rate || 0), 0) / 100;
        const amount = (formData.amount_ksh / rate).toFixed(2);
        return {
            totalTaxRate: rate,
            taxable_amount: amount,
        };
    }, [formData.amount_ksh, selectedTaxIds, taxes]);

    const { editTotalTaxRate, edittaxable_amount } = useMemo(() => {
        if (!editFormData) return { editTotalTaxRate: 0, edittaxable_amount: 0 };
        const applicableTaxes = taxes.filter((tax) => selectedTaxIds.includes(tax.id));
        const rate = 1 + applicableTaxes.reduce((sum, tax) => sum + (tax.rate || 0), 0) / 100;
        const amount = (editFormData.amount_ksh / rate).toFixed(2);
        return {
            editTotalTaxRate: rate,
            edittaxable_amount: amount,
        };
    }, [editFormData?.amount_ksh, selectedTaxIds, taxes]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error('You must be logged in to perform this action!');
            return;
        }
        if (formData.dynamic === 'false' && formData.amount_ksh === 0) {
            toast.error('Amount is required');
            return;
        }
        if (!formData.name || !formData.description || !formData.type) {
            toast.error('All fields are required!');
            return;
        }

        setIsPending(true);
        try {
            const response = await axios.post('/api/additionals', {
                ...formData,
                taxable_amount: Number(taxable_amount),
                tax_ids: selectedTaxIds,
            });
            setAdditionals([...additionals, response.data]);
            toast.success('Additional added successfully!');
            setFormData({
                name: '',
                description: '',
                dynamic: Dynamic.False,
                type: Type.corporate,
                resident: Resident.ea,
                amount_ksh: 0,
                taxable_amount: 0,
                priority: 0,
            });
            setIsCreateModalOpen(false);
            setSelectedTaxIds([]);
            setIsPending(false);
        } catch (error) {
            toast.error('Failed to add pricing!');
            setIsPending(false);
        }
    };

    const handleUpdate = async () => {
        if (!isAuthenticated) {
            toast.error('You must be logged in to perform this action!');
            return;
        }
        if (!editingId || !editFormData) return;
        setIsUpdating(true);

        try {
            const response = await axios.put(`/api/additionals/${editingId}`, {
                name: editFormData.name,
                description: editFormData.description,
                dynamic: editFormData.dynamic,
                type: editFormData.type,
                resident: editFormData.resident,
                amount_ksh: editFormData.amount_ksh,
                taxable_amount: Number(edittaxable_amount),
                priority: editFormData.priority,
                tax_ids: selectedTaxIds,
            });
            setAdditionals(additionals.map((add) => (add.id === editingId ? response.data : add)));
            toast.success('Additional updated successfully!');
            setIsEditModalOpen(false);
            setIsUpdating(false);
            setEditingId(null);
        } catch (error) {
            toast.error('Failed to update pricing!');
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAuthenticated) {
            toast.error('You must be logged in to perform this action!');
            return;
        }
        if (!confirm('Are you sure you want to delete this Additional?')) return;
        setDeletingId(id);
        setDeleting(true);

        try {
            await axios.delete(`/api/additionals/${id}`);
            setAdditionals(additionals.filter((add) => add.id !== id));
            toast.success('Additional deleted successfully!');
            setDeleting(false);
            setDeletingId(null);
        } catch (error) {
            toast.error('Failed to delete pricing!');
            setDeleting(false);
            setDeletingId(null);
        }
    };

    const handleDuplicateSelected = async () => {
        if (!isAuthenticated) {
            toast.error('You must be logged in to perform this action!');
            return;
        }
        if (selectedAdditionalIds.length === 0) return;
        setDuplicating(true);

        const selectedItems = additionals.filter((item) => selectedAdditionalIds.includes(item.id));
        const duplicatesToCreate = selectedItems.filter((original) => {
            const oppositeType = original.type === 'corporate' ? 'leisure' : 'corporate';
            const oppositeExists = additionals.some((item) => item.name === original.name && item.type === oppositeType);
            return !oppositeExists;
        });

        if (duplicatesToCreate.length === 0) {
            toast.error('No eligible items to duplicate.');
            setDuplicating(false);
            return;
        }

        try {
            const response = await axios.post('/api/additionals/duplicate', { ids: selectedAdditionalIds });
            setAdditionals([...additionals, ...response.data]);
            toast.success(`Duplicated ${duplicatesToCreate.length} additional(s) successfully.`);
            setDuplicating(false);
        } catch (error) {
            toast.error('Failed to duplicate selected items.');
            setDuplicating(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (!isAuthenticated) {
            toast.error('You must be logged in to perform this action!');
            return;
        }
        if (!confirm(`Are you sure you want to delete ${selectedAdditionalIds.length} Additionals?`)) return;
        setDeletingId(selectedAdditionalIds[0]);
        setDeleting(true);

        try {
            await Promise.all(selectedAdditionalIds.map((id) => axios.delete(`/api/additionals/${id}`)));
            setAdditionals(additionals.filter((add) => !selectedAdditionalIds.includes(add.id)));
            toast.success('Selected additionals deleted successfully!');
            setDeleting(false);
            setDeletingId(null);
            setSelectedAdditionalIds([]);
        } catch (error) {
            toast.error('Failed to delete selected items!');
            setDeleting(false);
            setDeletingId(null);
        }
    };

    return (
        <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Additional Services</h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                >
                    <Plus size={18} /> Create Additional
                </button>
            </div>

            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, description, type, resident, or amount..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
            </div>

            <div className="hidden overflow-x-auto shadow-md sm:rounded-lg md:block">
                {loading ? (
                    <p>Loading...</p>
                ) : filteredAdditionals.length === 0 ? (
                    <p>{searchQuery ? 'No matching additionals found...' : 'No Additionals found...'}</p>
                ) : (
                    <div className="overflow-x-auto shadow-md sm:rounded-lg">
                        {selectedAdditionalIds.length > 0 && (
                            <div className="mb-4 ml-4 flex items-center gap-3">
                                <button
                                    onClick={handleDeleteSelected}
                                    disabled={deleting}
                                    className={`flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition-all duration-150 hover:bg-red-600 ${deleting ? 'cursor-not-allowed opacity-60' : ''}`}
                                    title="Delete selected items"
                                >
                                    {deleting ? (
                                        <>
                                            <FaSpinner className="animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>Delete Selected ({selectedAdditionalIds.length})</>
                                    )}
                                </button>
                                <button
                                    onClick={handleDuplicateSelected}
                                    disabled={duplicating}
                                    className={`flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-all duration-150 hover:bg-blue-600 ${duplicating ? 'cursor-not-allowed opacity-60' : ''}`}
                                    title="Duplicate selected items"
                                >
                                    {duplicating ? (
                                        <>
                                            <FaSpinner className="animate-spin" />
                                            Duplicating...
                                        </>
                                    ) : (
                                        <>Duplicate Selected ({selectedAdditionalIds.length})</>
                                    )}
                                </button>
                            </div>
                        )}

                        <table className="min-w-full table-auto text-left text-sm text-gray-500">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2">
                                        <input
                                            type="checkbox"
                                            checked={filteredAdditionals.length > 0 && selectedAdditionalIds.length === filteredAdditionals.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedAdditionalIds(filteredAdditionals.map((add) => add.id));
                                                } else {
                                                    setSelectedAdditionalIds([]);
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200">Name</th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200">Description</th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200">Type</th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200">Resident</th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200">Amount (Ksh)</th>
                                    <th className="px-4 py-2">Applied Taxes</th>
                                    <th className="px-4 py-2">Taxable Amount</th>
                                    <th className="px-4 py-2 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAdditionals.map((pkg) => (
                                    <tr key={pkg.id} className="border-b hover:bg-gray-100">
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedAdditionalIds.includes(pkg.id)}
                                                onChange={() => {
                                                    setSelectedAdditionalIds((prev) =>
                                                        prev.includes(pkg.id) ? prev.filter((id) => id !== pkg.id) : [...prev, pkg.id],
                                                    );
                                                }}
                                            />
                                        </td>
                                        <td className="px-4 py-2">{pkg.name}</td>
                                        <td className="px-4 py-2">{pkg.description}</td>
                                        <td className="px-4 py-2">{pkg.type}</td>
                                        <td className="px-4 py-2">{pkg.resident}</td>
                                        <td className="px-4 py-2">{pkg.amount_ksh}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap">
                                                {pkg.taxes?.length > 0 ? (
                                                    pkg.taxes.map((tax) => (
                                                        <span key={tax.id} className="mr-1 rounded bg-gray-100 px-2 py-1 text-xs">
                                                            {tax?.name || 'No name'} ({tax?.rate || 0}%)
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">No taxes exists</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">Kes {pkg.taxable_amount}</td>
                                        <td className="text-center">
                                            <button
                                                onClick={() => {
                                                    setEditingId(pkg.id);
                                                    setEditFormData(pkg);
                                                    setSelectedTaxIds(pkg.taxes?.map((t) => t.id) || []);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-3 text-blue-500 hover:text-blue-700"
                                                title="Edit"
                                            >
                                                <Edit size={22} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(pkg.id)}
                                                className="ml-6 p-3 text-red-500 hover:text-red-700"
                                                title="Delete"
                                            >
                                                {deletingId === pkg.id ? <FaSpinner className="animate-spin" size={22} /> : <Trash2 size={22} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isEditModalOpen && editFormData && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <h2 className="mb-4 text-xl font-semibold">Edit Additional</h2>
                        <label className="mb-2 block text-sm text-gray-600">Name</label>
                        <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            className="w-full rounded-lg border p-2"
                        />
                        <label className="mt-4 mb-2 block text-sm text-gray-600">Priority</label>
                        <input
                            type="number"
                            value={editFormData.priority}
                            onChange={(e) => setEditFormData({ ...editFormData, priority: parseInt(e.target.value) })}
                            className="w-full rounded-lg border p-2"
                        />
                        <label className="mt-4 mb-2 block text-sm text-gray-600">Description</label>
                        <textarea
                            placeholder="Description"
                            value={editFormData.description}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            className="w-full rounded-lg border p-2"
                        />
                        <div className="mt-4">
                            <label className="mb-2 block text-sm font-medium text-gray-700">Applied Taxes</label>
                            <div className="grid grid-cols-2 gap-2">
                                {taxes.map((tax) => (
                                    <div key={tax.id} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`edit-tax-${tax.id}`}
                                            checked={selectedTaxIds.includes(tax.id)}
                                            onChange={() => {
                                                setSelectedTaxIds((prev) =>
                                                    prev.includes(tax.id) ? prev.filter((id) => id !== tax.id) : [...prev, tax.id],
                                                );
                                            }}
                                            className="h-4 w-4 rounded text-blue-600"
                                        />
                                        <label htmlFor={`edit-tax-${tax.id}`} className="ml-2">
                                            {tax.name} ({tax.rate}%)
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex w-full flex-col">
                            <label className="mt-4 mb-2 text-sm text-gray-600">Applies to</label>
                            <select
                                value={editFormData.type}
                                onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as Type })}
                                className="w-full rounded-lg border p-2"
                            >
                                <option value={Type.corporate}>Corporate</option>
                                <option value={Type.leisure}>Leisure</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label className="mt-4 mb-2 text-sm text-gray-600">Select Resident</label>
                                <select
                                    value={editFormData.resident}
                                    onChange={(e) => setEditFormData({ ...editFormData, resident: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                >
                                    <option value={Resident.ea}>East Africa</option>
                                    <option value={Resident.non}>Non-East Africa</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <label className="mt-4 mb-2 text-sm text-gray-600">Amount in KSH</label>
                                <input
                                    type="number"
                                    placeholder="Amount Ksh"
                                    value={editFormData.amount_ksh}
                                    onChange={(e) => setEditFormData({ ...editFormData, amount_ksh: parseFloat(e.target.value) })}
                                    className="w-full rounded-lg border p-2"
                                />
                            </div>
                        </div>
                        <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Base Amount:</span>
                                <span>KSh {editFormData.amount_ksh.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax ({editTotalTaxRate}%):</span>
                                <span className="font-medium">KSh {edittaxable_amount}</span>
                            </div>
                        </div>
                        <div className="flex flex-1 justify-between">
                            <button onClick={handleUpdate} className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white">
                                {isUpdating ? 'Updating...' : 'Save Changes'}
                            </button>
                            <button onClick={() => setIsEditModalOpen(false)} className="ml-2 text-gray-600 hover:text-gray-900">
                                ❌ Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50">
                    <div className="max-h-[95vh] w-full max-w-2xl max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                            <h2 className="text-xl font-semibold">Create Pricing Additional</h2>
                            <div className="mt-8">
                                <label className="mt-4 mb-2 text-sm text-gray-600">Name</label>
                            </div>
                            <input
                                type="text"
                                placeholder="Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mb-4 w-full rounded-lg border p-2"
                            />
                            <label className="mt-4 mb-2 block text-sm text-gray-600">Priority</label>
                            <input
                                type="number"
                                value={formData.priority}
                                placeholder="priority"
                                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                className="w-full rounded-lg border p-2"
                            />
                            <div className="mt-8">
                                <div className="mt-8 mb-4">
                                    <label className="mb-8 text-sm text-gray-600">Description</label>
                                </div>
                                <textarea
                                    placeholder="Description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                />
                            </div>
                            <div className="mt-4">
                                <label className="mb-2 block text-sm font-medium text-gray-700">Apply Taxes</label>
                                <div className="space-y-2">
                                    {taxes.map((tax) => (
                                        <div key={tax.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`tax-${tax.id}`}
                                                checked={selectedTaxIds.includes(tax.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTaxIds([...selectedTaxIds, tax.id]);
                                                    } else {
                                                        setSelectedTaxIds(selectedTaxIds.filter((id) => id !== tax.id));
                                                    }
                                                }}
                                                className="h-4 w-4 rounded text-blue-600"
                                            />
                                            <label htmlFor={`tax-${tax.id}`} className="ml-2">
                                                {tax.name} ({tax.rate}%)
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex w-full flex-col">
                                <label className="mt-4 mb-2 text-sm text-gray-600">Type of Service</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Type })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                >
                                    <option value={Type.corporate}>Corporate</option>
                                    <option value={Type.leisure}>Leisure</option>
                                </select>
                            </div>
                            <div className="flex w-full flex-col">
                                <label className="mt-4 mb-2 text-sm text-gray-600">Are the cost entered after</label>
                                <select
                                    value={formData.dynamic}
                                    onChange={(e) => setFormData({ ...formData, dynamic: e.target.value as Dynamic })}
                                    className="w-full rounded-lg border p-2"
                                >
                                    <option value={Dynamic.True}>Yes</option>
                                    <option value={Dynamic.False}>No</option>
                                </select>
                            </div>
                            {formData.dynamic === Dynamic.False && (
                                <div>
                                    <div className="flex justify-between gap-8">
                                        <div className="flex w-full flex-col">
                                            <label className="mt-4 mb-2 text-sm text-gray-600">Amount in KES</label>
                                            <input
                                                type="number"
                                                placeholder="Amount Ksh"
                                                value={formData.amount_ksh}
                                                onChange={(e) => setFormData({ ...formData, amount_ksh: parseFloat(e.target.value) })}
                                                className="w-full rounded-lg border p-2"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Base Amount:</span>
                                            <span>KSh {formData.amount_ksh.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Tax ({totalTaxRate}%):</span>
                                            <span className="font-medium">KSh {taxable_amount}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-1 justify-between">
                                <button type="submit" disabled={isPending} className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white">
                                    {isPending ? ' 💾Saving...' : ' 💾 Add Additional'}
                                </button>
                                <button onClick={() => setIsCreateModalOpen(false)} className="ml-2 text-gray-600 hover:text-gray-900">
                                    ❌ Close
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Additional;
