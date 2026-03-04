import { useAuth } from '@/hooks/use-auth';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Edit, Plus, SortAsc, SortDesc, Trash2, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';

enum Resident {
    ea = 'ea',
    non = 'non',
}

enum RoomType {
    single = 'single',
    double = 'double',
}

const PackagesSettings: React.FC = () => {
    const { isAuthenticated, logout, user } = useAuth();
    const [packages, setPackages] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isPending, setIsPending] = useState<boolean>(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
    const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
    const [selectedDiscountsId, setSelectedDiscountsId] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: string }>({ key: null, direction: 'asc' });
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        board_type: 'Full Board',
        taxable_amount: 0,
        number_of_rooms: 1,
        resident: Resident.ea,
        room_type: RoomType.single,
        amount_ksh: 0,
    });

    useEffect(() => {
        if (!isAuthenticated) {
            router.get('/');
        } else {
            fetchData();
        }
    }, [isAuthenticated]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [packagesResponse, taxesResponse] = await Promise.all([axios.get('/api/packages'), axios.get('/api/taxes')]);
            setPackages(packagesResponse.data || []);
            setTaxes(taxesResponse.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data!');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.description || !formData.amount_ksh) {
            toast.error('All fields are required!');
            return;
        }

        try {
            setIsPending(true);
            await axios.post('/api/packages', {
                ...formData,
                taxable_amount: Number(taxable_amount),
                tax_ids: selectedTaxIds,
                discounts: selectedDiscountsId.map((id) => ({ id })),
            });
            toast.success('Package added successfully!');
            setFormData({
                name: '',
                description: '',
                board_type: 'Full Board',
                taxable_amount: 0,
                number_of_rooms: 1,
                resident: Resident.ea,
                room_type: RoomType.single,
                amount_ksh: 0,
            });
            setSelectedTaxIds([]);
            setSelectedDiscountsId([]);
            setIsCreateModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to add pricing!');
        } finally {
            setIsPending(false);
        }
    };

    const handleUpdatePackage = async () => {
        if (!editingId || !editFormData) return;
        setIsUpdating(true);

        try {
            await axios.put(`/api/packages/${editingId}`, {
                ...editFormData,
                taxable_amount: Number(edittaxable_amount),
                tax_ids: selectedTaxIds,
                discounts: selectedDiscountsId.map((id) => ({ id })),
            });
            toast.success('Package updated successfully!');
            setIsEditModalOpen(false);
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update package!');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeletePackage = async (id: string) => {
        if (!confirm('Are you sure you want to delete this package?')) return;
        setDeletingId(id);

        try {
            await axios.delete(`/api/packages/${id}`);
            toast.success('Package deleted successfully!');
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete pricing!');
        } finally {
            setDeletingId(null);
        }
    };

    const { totalTaxRate, taxable_amount } = useMemo(() => {
        const applicableTaxes = taxes.filter((tax) => selectedTaxIds.includes(tax.id));
        const rate = 1 + applicableTaxes.reduce((sum, tax) => sum + (tax.rate || 0) / 100, 0);
        const amount = (formData.amount_ksh / rate).toFixed(2);

        return {
            totalTaxRate: rate,
            taxable_amount: amount,
        };
    }, [formData.amount_ksh, selectedTaxIds, taxes]);

    const { editTotalTaxRate, edittaxable_amount } = useMemo(() => {
        if (!editFormData) return { editTotalTaxRate: 0, edittaxable_amount: 0 };

        const applicableTaxes = taxes.filter((tax) => selectedTaxIds.includes(tax.id));
        const rate = 1 + applicableTaxes.reduce((sum, tax) => sum + (tax.rate || 0) / 100, 0);
        const amount = (editFormData.amount_ksh / rate).toFixed(2);

        return {
            editTotalTaxRate: rate,
            edittaxable_amount: amount,
        };
    }, [editFormData?.amount_ksh, selectedTaxIds, taxes]);

    const handleSort = (key: string) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedPackages = [...packages].sort((a, b) => {
        if (!sortConfig.key) return 0;
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <FaSpinner className="animate-spin text-blue-500" size={24} />
            </div>
        );
    }

    return (
        <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mt-4">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <h3 className="text-lg font-semibold">Existing Packages</h3>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm text-white hover:bg-green-600 sm:text-base"
                    >
                        <Plus size={18} /> Create Package
                    </button>
                </div>

                {isLoading ? (
                    <p className="mt-4">Loading packages...</p>
                ) : (
                    <>
                        <div className="mt-4 hidden overflow-x-auto shadow-md sm:rounded-lg md:block">
                            <table className="min-w-full table-auto text-left text-sm text-gray-500">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {[
                                            { label: 'Name', key: 'name' },
                                            { label: 'Room Type', key: 'room_type' },
                                            { label: 'Description', key: 'description' },
                                            { label: 'Room Nos', key: 'number_of_rooms' },
                                            { label: 'Board Type', key: 'board_type' },
                                            { label: 'Applied Taxes', key: 'tax' },
                                            { label: 'Taxable Amount', key: 'taxable_amount' },
                                            { label: 'Amount', key: 'amount_ksh' },
                                            { label: 'Available Discounts', key: 'discounts' },
                                        ].map(({ label, key }) => (
                                            <th key={key} onClick={() => handleSort(key)} className="cursor-pointer px-4 py-2 hover:bg-gray-200">
                                                <div className="flex items-center">
                                                    {label}
                                                    {sortConfig.key === key &&
                                                        (sortConfig.direction === 'asc' ? (
                                                            <SortAsc className="ml-1 inline" size={14} />
                                                        ) : (
                                                            <SortDesc className="ml-1 inline" size={14} />
                                                        ))}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedPackages.map((pkg) => (
                                        <tr key={pkg.id} className="border-b hover:bg-gray-100">
                                            <td className="px-4 py-2">{pkg.name}</td>
                                            <td className="px-4 py-2">{pkg.room_type}</td>
                                            <td className="px-4 py-2">{pkg.description}</td>
                                            <td className="px-4 py-2">{pkg.number_of_rooms}</td>
                                            <td className="px-4 py-2">{pkg.board_type}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {pkg.taxes?.length > 0 ? (
                                                        pkg.taxes.map((tax: any) => (
                                                            <span key={tax.id} className="rounded bg-gray-100 px-2 py-1 text-xs">
                                                                {tax?.name || 'No name'} ({tax?.rate || 0}%)
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No taxes</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">KSh {pkg.taxable_amount.toLocaleString()}</td>
                                            <td className="px-4 py-2">KSh {pkg.amount_ksh.toLocaleString()}</td>
                                            <td className="px-4 py-2">
                                                {pkg.discounts?.length > 0 ? (
                                                    pkg.discounts.map((discount: any) => (
                                                        <span key={discount.id} className="mx-1 rounded bg-gray-100 px-2 py-1 text-xs">
                                                            ({discount.rate}%)
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">0</span>
                                                )}
                                            </td>
                                            <td className="flex gap-2 px-4 py-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(pkg.id);
                                                        setEditFormData(pkg);
                                                        setIsEditModalOpen(true);
                                                        setSelectedDiscountsId(pkg.discounts?.map((t: any) => t.id) || []);
                                                        setSelectedTaxIds(pkg.taxes?.map((t: any) => t.id) || []);
                                                    }}
                                                    className="text-blue-500 hover:text-blue-700"
                                                    title="Edit"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePackage(pkg.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Delete"
                                                    disabled={deletingId === pkg.id}
                                                >
                                                    {deletingId === pkg.id ? <FaSpinner className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 space-y-4 md:hidden">
                            {sortedPackages.map((pkg) => (
                                <div key={pkg.id} className="rounded-lg border p-4 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{pkg.name}</h3>
                                            <p className="text-sm text-gray-500">{pkg.room_type} Room</p>
                                        </div>
                                        <button
                                            onClick={() => setExpandedPackage(expandedPackage === pkg.id ? null : pkg.id)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            {expandedPackage === pkg.id ? <X size={18} /> : <Plus size={18} />}
                                        </button>
                                    </div>

                                    {expandedPackage === pkg.id && (
                                        <div className="mt-3 space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-gray-500">Description</p>
                                                    <p className="text-sm font-medium">{pkg.description}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Room Nos</p>
                                                    <p className="text-sm font-medium">{pkg.number_of_rooms}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Board Type</p>
                                                    <p className="text-sm font-medium">{pkg.board_type}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Amount</p>
                                                    <p className="text-sm font-medium">KSh {pkg.amount_ksh.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">Applied Taxes</p>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {pkg.taxes?.length > 0 ? (
                                                        pkg.taxes.map((tax: any) => (
                                                            <span key={tax.id} className="rounded bg-gray-100 px-2 py-1 text-xs">
                                                                {tax?.name || 'No name'} ({tax?.rate || 0}%)
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No taxes applied</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-gray-700">Taxable Amount (KES)</label>
                                                <input
                                                    type="text"
                                                    value={edittaxable_amount}
                                                    disabled
                                                    className="w-full rounded-lg border bg-gray-100 p-2"
                                                />
                                                <p className="mt-1 text-xs text-gray-500">
                                                    Total tax rate: {editTotalTaxRate}%
                                                    {editTotalTaxRate > 0 && editFormData && (
                                                        <span>
                                                            {' '}
                                                            ({editFormData.amount_ksh.toFixed(2)} × {editTotalTaxRate}%)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {isEditModalOpen && editFormData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Edit Package</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Number of rooms</label>
                                <input
                                    type="number"
                                    value={editFormData.number_of_rooms}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            number_of_rooms: parseInt(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    value={editFormData.description}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            description: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Room type</label>
                                <select
                                    value={editFormData.room_type}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            room_type: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                >
                                    <option value={RoomType.single}>Single</option>
                                    <option value={RoomType.double}>Double</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Board type</label>
                                <select
                                    value={editFormData.board_type}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            board_type: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                >
                                    <option value="Full Board">Full Board</option>
                                    <option value="Half Board">Half Board</option>
                                    <option value="Bed & Breakfast">Bed & Breakfast</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Resident</label>
                                <select
                                    value={editFormData.resident}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            resident: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                >
                                    <option value={Resident.ea}>East Africa</option>
                                    <option value={Resident.non}>Non-East Africa</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Amount (KES)</label>
                                <input
                                    type="number"
                                    placeholder="Amount Ksh"
                                    value={editFormData.amount_ksh}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
                                            amount_ksh: parseFloat(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Applied Taxes</label>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {taxes.map((tax: any) => (
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
                                            <label htmlFor={`edit-tax-${tax.id}`} className="ml-2 text-sm">
                                                {tax.name} ({tax.rate}%)
                                            </label>
                                        </div>
                                    ))}
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
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button onClick={handleUpdatePackage} className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                                {isUpdating ? (
                                    <>
                                        <FaSpinner className="mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Create New Package</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePackage} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    placeholder="Package name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Number of rooms</label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={formData.number_of_rooms}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            number_of_rooms: parseInt(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    placeholder="Package description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Room type</label>
                                <select
                                    value={formData.room_type}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            room_type: e.target.value as RoomType,
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                    required
                                >
                                    <option value={RoomType.single}>Single</option>
                                    <option value={RoomType.double}>Double</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Board type</label>
                                <select
                                    value={formData.board_type}
                                    onChange={(e) => setFormData({ ...formData, board_type: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                >
                                    <option value="Full Board">Full Board</option>
                                    <option value="Half Board">Half Board</option>
                                    <option value="Bed & Breakfast">Bed & Breakfast</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Resident</label>
                                <select
                                    value={formData.resident}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            resident: e.target.value as Resident,
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                    required
                                >
                                    <option value={Resident.ea}>East Africa</option>
                                    <option value={Resident.non}>Non-East Africa</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Amount (KES)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.amount_ksh}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            amount_ksh: parseFloat(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Apply Taxes</label>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {taxes.map((tax: any) => (
                                        <div key={tax.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`tax-${tax.id}`}
                                                checked={selectedTaxIds.includes(tax.id)}
                                                onChange={() => {
                                                    setSelectedTaxIds((prev) =>
                                                        prev.includes(tax.id) ? prev.filter((id) => id !== tax.id) : [...prev, tax.id],
                                                    );
                                                }}
                                                className="h-4 w-4 rounded text-blue-600"
                                            />
                                            <label htmlFor={`tax-${tax.id}`} className="ml-2 text-sm">
                                                {tax.name} ({tax.rate}%)
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Available Discounts</label>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Taxable Amount (KES)</label>
                                <input type="text" value={taxable_amount} disabled className="w-full rounded-lg border bg-gray-100 p-2" />
                                <p className="mt-1 text-xs text-gray-500">
                                    Total tax rate: {totalTaxRate}%
                                    {totalTaxRate > 0 && (
                                        <span>
                                            {' '}
                                            ({formData.amount_ksh.toFixed(2)} × {totalTaxRate}%)
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="mt-4 flex justify-end gap-3 md:col-span-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
                                >
                                    {isPending ? 'Creating...' : 'Create Package'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PackagesSettings;
