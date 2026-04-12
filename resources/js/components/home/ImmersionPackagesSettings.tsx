import { useAuth } from '@/hooks/use-auth';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { Edit, Plus, Trash2, X } from 'lucide-react';
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
    triple = 'triple',
    quadra = 'quadra',
}

const ImmersionPackagesSettings: React.FC = () => {
    const { isAuthenticated, logout, user } = useAuth();
    const [packages, setPackages] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isPending, setIsPending] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        baseName: '',
        description: '',
        number_of_rooms: 1,
        resident: Resident.ea,
        single_full_board: 0,
        single_half_board: 0,
        single_bed_breakfast: 0,
        double_full_board: 0,
        double_half_board: 0,
        double_bed_breakfast: 0,
        triple_full_board: 0,
        triple_half_board: 0,
        triple_bed_breakfast: 0,
        quad_full_board: 0,
        quad_half_board: 0,
        quad_bed_breakfast: 0,
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
            const [packagesResponse, taxesResponse] = await Promise.all([axios.get('/api/immersion-packages'), axios.get('/api/taxes')]);
            setPackages(packagesResponse.data || []);
            setTaxes(taxesResponse.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data!');
        } finally {
            setIsLoading(false);
        }
    };
    const cutoffDate = new Date('2025-11-05T00:00:00');

    const groupedPackages = useMemo(() => {
        const groups: any = {};
        packages.forEach((pkg) => {
            const isOldPackage = new Date(pkg.created_at) < cutoffDate;
            if (isOldPackage) return;

            const ageGroup = isOldPackage ? 'old' : 'new';
            const key = `${pkg.name}|${pkg.description}|${pkg.resident}|${pkg.number_of_rooms}|${ageGroup}`;
            const boardKey = pkg.board_type.toLowerCase().replace(/ & /g, ' ').replace(/ /g, '_');
            const variantKey = `${pkg.room_type}_${boardKey}`;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    baseName: pkg.name,
                    description: pkg.description,
                    resident: pkg.resident,
                    number_of_rooms: pkg.number_of_rooms,
                    variants: {},
                    ids: {},
                    created_dates: [],
                    tax_ids: pkg.taxes?.map((t: any) => t.id) || [],
                    isOld: isOldPackage,
                };
            }
            groups[key].variants[variantKey] = {
                amount: pkg.amount_ksh,
                taxable_amount: pkg.taxable_amount,
            };
            groups[key].ids[variantKey] = pkg.id;
            groups[key].created_dates.push(pkg.created_at);
        });
        return Object.values(groups);
    }, [packages]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.baseName || !formData.description) {
            toast.error('Base name and description are required!');
            return;
        }

        const applicableTaxes = taxes.filter((tax) => selectedTaxIds.includes(tax.id));
        const totalTaxRate = applicableTaxes.reduce((sum, tax) => sum + (tax.rate || 0), 0);
        const rate = 1 + totalTaxRate / 100;

        const variants = [
            { room_type: 'single', board_type: 'Full Board', amount: formData.single_full_board, key: 'single_full_board' },
            { room_type: 'single', board_type: 'Half Board', amount: formData.single_half_board, key: 'single_half_board' },
            { room_type: 'single', board_type: 'Bed & Breakfast', amount: formData.single_bed_breakfast, key: 'single_bed_breakfast' },
            { room_type: 'double', board_type: 'Full Board', amount: formData.double_full_board, key: 'double_full_board' },
            { room_type: 'double', board_type: 'Half Board', amount: formData.double_half_board, key: 'double_half_board' },
            { room_type: 'double', board_type: 'Bed & Breakfast', amount: formData.double_bed_breakfast, key: 'double_bed_breakfast' },
            { room_type: 'triple', board_type: 'Full Board', amount: formData.triple_full_board, key: 'triple_full_board' },
            { room_type: 'triple', board_type: 'Half Board', amount: formData.triple_half_board, key: 'triple_half_board' },
            { room_type: 'triple', board_type: 'Bed & Breakfast', amount: formData.triple_bed_breakfast, key: 'triple_bed_breakfast' },
            { room_type: 'quadra', board_type: 'Full Board', amount: formData.quad_full_board, key: 'quad_full_board' },
            { room_type: 'quadra', board_type: 'Half Board', amount: formData.quad_half_board, key: 'quad_half_board' },
            { room_type: 'quadra', board_type: 'Bed & Breakfast', amount: formData.quad_bed_breakfast, key: 'quad_bed_breakfast' },
        ];

        const datas = variants
            .filter((v) => v.amount > 0)
            .map((v) => {
                const taxable_amount = (v.amount / rate).toFixed(2);
                return {
                    name: formData.baseName,
                    description: formData.description,
                    board_type: v.board_type,
                    taxable_amount: Number(taxable_amount),
                    number_of_rooms: formData.number_of_rooms,
                    resident: formData.resident,
                    room_type: v.room_type,
                    amount_ksh: v.amount,
                    tax_ids: selectedTaxIds,
                };
            });

        if (datas.length === 0) {
            toast.error('At least one amount is required!');
            return;
        }

        try {
            setIsPending(true);
            await Promise.all(datas.map((data) => axios.post('/api/immersion-packages', data)));
            toast.success('Packages added successfully!');
            resetForm();
            setIsCreateModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to add packages!');
        } finally {
            setIsPending(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editFormData.baseName || !editFormData.description) {
            toast.error('Base name and description are required!');
            return;
        }

        const applicableTaxes = taxes.filter((tax) => selectedTaxIds.includes(tax.id));
        const totalTaxRate = applicableTaxes.reduce((sum, tax) => sum + (tax.rate || 0), 0);
        const rate = 1 + totalTaxRate / 100;

        const variants = [
            { room_type: 'single', board_type: 'Full Board', amount: editFormData.single_full_board, key: 'single_full_board' },
            { room_type: 'single', board_type: 'Half Board', amount: editFormData.single_half_board, key: 'single_half_board' },
            { room_type: 'single', board_type: 'Bed & Breakfast', amount: editFormData.single_bed_breakfast, key: 'single_bed_breakfast' },
            { room_type: 'double', board_type: 'Full Board', amount: editFormData.double_full_board, key: 'double_full_board' },
            { room_type: 'double', board_type: 'Half Board', amount: editFormData.double_half_board, key: 'double_half_board' },
            { room_type: 'double', board_type: 'Bed & Breakfast', amount: editFormData.double_bed_breakfast, key: 'double_bed_breakfast' },
            { room_type: 'triple', board_type: 'Full Board', amount: editFormData.triple_full_board, key: 'triple_full_board' },
            { room_type: 'triple', board_type: 'Half Board', amount: editFormData.triple_half_board, key: 'triple_half_board' },
            { room_type: 'triple', board_type: 'Bed & Breakfast', amount: editFormData.triple_bed_breakfast, key: 'triple_bed_breakfast' },
            { room_type: 'quadra', board_type: 'Full Board', amount: editFormData.quad_full_board, key: 'quad_full_board' },
            { room_type: 'quadra', board_type: 'Half Board', amount: editFormData.quad_half_board, key: 'quad_half_board' },
            { room_type: 'quadra', board_type: 'Bed & Breakfast', amount: editFormData.quad_bed_breakfast, key: 'quad_bed_breakfast' },
        ];

        const datas = variants
            .filter((v) => v.amount > 0)
            .map((v) => {
                const taxable_amount = (v.amount / rate).toFixed(2);
                const id = editFormData.ids?.[v.key];
                return {
                    id,
                    name: editFormData.baseName,
                    description: editFormData.description,
                    board_type: v.board_type,
                    taxable_amount: Number(taxable_amount),
                    number_of_rooms: editFormData.number_of_rooms,
                    resident: editFormData.resident,
                    room_type: v.room_type,
                    amount_ksh: v.amount,
                    tax_ids: selectedTaxIds,
                };
            });

        if (datas.length === 0) {
            toast.error('At least one amount is required!');
            return;
        }

        const toDelete: string[] = [];
        variants.forEach((v) => {
            if (v.amount === 0 && editFormData.ids?.[v.key]) {
                toDelete.push(editFormData.ids[v.key]);
            }
        });

        try {
            setIsPending(true);
            await Promise.all([
                ...datas.map((data) => {
                    if (data.id) {
                        const { id, ...updateData } = data;
                        return axios.put(`/api/immersion-packages/${id}`, updateData);
                    } else {
                        return axios.post('/api/immersion-packages', data);
                    }
                }),
                ...toDelete.map((id) => axios.delete(`/api/immersion-packages/${id}`)),
            ]);
            toast.success('Packages updated successfully!');
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update packages!');
        } finally {
            setIsPending(false);
        }
    };

    const handleDeletePackage = async (id: string) => {
        if (!confirm('Are you sure you want to delete this package?')) return;
        setDeletingId(id);

        try {
            await axios.delete(`/api/immersion-packages/${id}`);
            toast.success('Package deleted successfully!');
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete package!');
        } finally {
            setDeletingId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            baseName: '',
            description: '',
            number_of_rooms: 1,
            resident: Resident.ea,
            single_full_board: 0,
            single_half_board: 0,
            single_bed_breakfast: 0,
            double_full_board: 0,
            double_half_board: 0,
            double_bed_breakfast: 0,
            triple_full_board: 0,
            triple_half_board: 0,
            triple_bed_breakfast: 0,
            quad_full_board: 0,
            quad_half_board: 0,
            quad_bed_breakfast: 0,
        });
        setSelectedTaxIds([]);
    };

    const openEditModal = (group: any) => {
        setEditFormData({
            baseName: group.baseName,
            description: group.description,
            number_of_rooms: group.number_of_rooms,
            resident: group.resident,
            single_full_board: group.variants.single_full_board?.amount || 0,
            single_half_board: group.variants.single_half_board?.amount || 0,
            single_bed_breakfast: group.variants.single_bed_breakfast?.amount || 0,
            double_full_board: group.variants.double_full_board?.amount || 0,
            double_half_board: group.variants.double_half_board?.amount || 0,
            double_bed_breakfast: group.variants.double_bed_breakfast?.amount || 0,
            triple_full_board: group.variants.triple_full_board?.amount || 0,
            triple_half_board: group.variants.triple_half_board?.amount || 0,
            triple_bed_breakfast: group.variants.triple_bed_breakfast?.amount || 0,
            quad_full_board: group.variants.quad_full_board?.amount || 0,
            quad_half_board: group.variants.quad_half_board?.amount || 0,
            quad_bed_breakfast: group.variants.quad_bed_breakfast?.amount || 0,
            ids: group.ids,
        });
        setSelectedTaxIds(group.tax_ids);
        setIsEditModalOpen(true);
    };
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
                    <div className="mt-4 space-y-4">
                        {groupedPackages.map((group: any) => (
                            <div key={group.key} className="rounded-lg border p-4 shadow-sm">
                                <div
                                    className="flex cursor-pointer items-start justify-between"
                                    onClick={() => setExpandedGroup(expandedGroup === group.key ? null : group.key)}
                                >
                                    <div>
                                        <h3 className="font-medium text-gray-900">
                                            {group.baseName} {group.isOld && <span className="text-gray-500">(Old)</span>}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {group.resident === 'ea' ? 'East Africa' : 'Non-East Africa'} Resident
                                        </p>
                                    </div>
                                    <div className="text-gray-400 hover:text-gray-600">
                                        {expandedGroup === group.key ? <X size={18} /> : <Plus size={18} />}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {expandedGroup === group.key && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div className="mt-3 space-y-3">
                                                <div>
                                                    <p className="text-sm text-gray-500">Description</p>
                                                    <p className="text-sm font-medium">{group.description}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Number of Rooms</p>
                                                    <p className="text-sm font-medium">{group.number_of_rooms}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-500">Applied Taxes</p>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        {group.tax_ids.length > 0 ? (
                                                            taxes
                                                                .filter((t) => group.tax_ids.includes(t.id))
                                                                .map((tax: any) => (
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
                                                    <p className="text-sm text-gray-500">Configurations</p>
                                                    <ul className="space-y-2">
                                                        {Object.entries(group.variants).map(([vk, v]: any) => {
                                                            const [rt, bt] = vk.split('_');
                                                            let board = bt
                                                                .split('_')
                                                                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                                                                .join(' ');
                                                            if (board === 'Bed Breakfast') board = 'Bed & Breakfast';
                                                            const currency = group.resident === 'non' ? 'US$' : 'KSh';
                                                            const id = group.ids[vk];
                                                            return (
                                                                <li key={vk} className="flex items-center justify-between">
                                                                    <span>
                                                                        {rt.charAt(0).toUpperCase() + rt.slice(1)} - {board}: {currency}{' '}
                                                                        {v.amount.toLocaleString()} (Taxable: {currency}{' '}
                                                                        {v.taxable_amount.toLocaleString()})
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleDeletePackage(id)}
                                                                        className="text-red-500 hover:text-red-700"
                                                                        title="Delete"
                                                                        disabled={deletingId === id}
                                                                    >
                                                                        {deletingId === id ? (
                                                                            <FaSpinner className="animate-spin" size={18} />
                                                                        ) : (
                                                                            <Trash2 size={18} />
                                                                        )}
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                                <button
                                                    onClick={() => openEditModal(group)}
                                                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
                                                >
                                                    <Edit size={18} /> Edit Group
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isEditModalOpen && editFormData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Edit Package Group</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Base Name</label>
                                <input
                                    type="text"
                                    placeholder="Base package name"
                                    value={editFormData.baseName}
                                    onChange={(e) => setEditFormData({ ...editFormData, baseName: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Number of rooms</label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={editFormData.number_of_rooms}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
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
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    rows={3}
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Resident</label>
                                <select
                                    value={editFormData.resident}
                                    onChange={(e) =>
                                        setEditFormData({
                                            ...editFormData,
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

                            <div className="md:col-span-2">
                                <h4 className="font-medium">Amounts for Single Rooms {editFormData.resident === Resident.non ? '(USD)' : '(KES)'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Full Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.single_full_board}
                                            onChange={(e) => setEditFormData({ ...editFormData, single_full_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Half Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.single_half_board}
                                            onChange={(e) => setEditFormData({ ...editFormData, single_half_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Bed & Breakfast</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.single_bed_breakfast}
                                            onChange={(e) =>
                                                setEditFormData({ ...editFormData, single_bed_breakfast: parseFloat(e.target.value) || 0 })
                                            }
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h4 className="font-medium">Amounts for Double Rooms {editFormData.resident === Resident.non ? '(USD)' : '(KES)'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Full Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.double_full_board}
                                            onChange={(e) => setEditFormData({ ...editFormData, double_full_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Half Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.double_half_board}
                                            onChange={(e) => setEditFormData({ ...editFormData, double_half_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Bed & Breakfast</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.double_bed_breakfast}
                                            onChange={(e) =>
                                                setEditFormData({ ...editFormData, double_bed_breakfast: parseFloat(e.target.value) || 0 })
                                            }
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h4 className="font-medium">Amounts for Triple Rooms {editFormData.resident === Resident.non ? '(USD)' : '(KES)'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Full Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.triple_full_board}
                                            onChange={(e) => setEditFormData({ ...editFormData, triple_full_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Half Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.triple_half_board}
                                            onChange={(e) => setEditFormData({ ...editFormData, triple_half_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Bed & Breakfast</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.triple_bed_breakfast}
                                            onChange={(e) =>
                                                setEditFormData({ ...editFormData, triple_bed_breakfast: parseFloat(e.target.value) || 0 })
                                            }
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h4 className="font-medium">Amounts for Quad Rooms {editFormData.resident === Resident.non ? '(USD)' : '(KES)'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Full Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.quad_full_board}
                                            onChange={(e) => setEditFormData({ ...editFormData, quad_full_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Half Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.quad_half_board}
                                            onChange={(e) => setEditFormData({ ...editFormData, quad_half_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Bed & Breakfast</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={editFormData.quad_bed_breakfast}
                                            onChange={(e) =>
                                                setEditFormData({ ...editFormData, quad_bed_breakfast: parseFloat(e.target.value) || 0 })
                                            }
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Apply Taxes</label>
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
                            </div>

                            <div className="mt-4 flex justify-end gap-3 md:col-span-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
                                >
                                    {isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Create New Package</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Base Name</label>
                                <input
                                    type="text"
                                    placeholder="Base package name"
                                    value={formData.baseName}
                                    onChange={(e) => setFormData({ ...formData, baseName: e.target.value })}
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

                            <div className="md:col-span-2">
                                <h4 className="font-medium">Amounts for Single Rooms {formData.resident === Resident.non ? '(USD)' : '(KES)'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Full Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.single_full_board}
                                            onChange={(e) => setFormData({ ...formData, single_full_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Half Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.single_half_board}
                                            onChange={(e) => setFormData({ ...formData, single_half_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Bed & Breakfast</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.single_bed_breakfast}
                                            onChange={(e) => setFormData({ ...formData, single_bed_breakfast: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h4 className="font-medium">Amounts for Double Rooms {formData.resident === Resident.non ? '(USD)' : '(KES)'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Full Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.double_full_board}
                                            onChange={(e) => setFormData({ ...formData, double_full_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Half Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.double_half_board}
                                            onChange={(e) => setFormData({ ...formData, double_half_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Bed & Breakfast</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.double_bed_breakfast}
                                            onChange={(e) => setFormData({ ...formData, double_bed_breakfast: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h4 className="font-medium">Amounts for Triple Rooms {formData.resident === Resident.non ? '(USD)' : '(KES)'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Full Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.triple_full_board}
                                            onChange={(e) => setFormData({ ...formData, triple_full_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Half Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.triple_half_board}
                                            onChange={(e) => setFormData({ ...formData, triple_half_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Bed & Breakfast</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.triple_bed_breakfast}
                                            onChange={(e) => setFormData({ ...formData, triple_bed_breakfast: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <h4 className="font-medium">Amounts for Quad Rooms {formData.resident === Resident.non ? '(USD)' : '(KES)'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Full Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.quad_full_board}
                                            onChange={(e) => setFormData({ ...formData, quad_full_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Half Board</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.quad_half_board}
                                            onChange={(e) => setFormData({ ...formData, quad_half_board: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Bed & Breakfast</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={formData.quad_bed_breakfast}
                                            onChange={(e) => setFormData({ ...formData, quad_bed_breakfast: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border p-2"
                                        />
                                    </div>
                                </div>
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
                                    {isPending ? 'Creating...' : 'Create Packages'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImmersionPackagesSettings;
