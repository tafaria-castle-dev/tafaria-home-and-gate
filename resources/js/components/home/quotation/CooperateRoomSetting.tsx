import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { ChevronDown, ChevronUp, Edit, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';

interface Tax {
    id: string;
    name: string;
    rate: number;
}

interface Discount {
    id: string;
    name: string;
    rate: number;
    discountCode: string;
}

interface CorporateRoomSetting {
    id: string;
    description: string;
    board_type: string;
    room_type: string;
    amount_ksh: number;
    taxable_amount: number;
    taxes: Tax[];
}

enum RoomType {
    single = 'single',
    double = 'double',
    triple = 'triple',
    quadra = 'quadra',
}

const CorporateRoomSettings = () => {
    const { isAuthenticated } = useAuth();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<CorporateRoomSetting | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
    const [selectedDiscountsId, setSelectedDiscountsId] = useState<string[]>([]);
    const [expandedSetting, setExpandedSetting] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [roomSettings, setRoomSettings] = useState<CorporateRoomSetting[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        description: '',
        board_type: 'Full Board',
        room_type: RoomType.single as RoomType,
        amount_ksh: 0,
        taxable_amount: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [settingsResponse, taxesResponse] = await Promise.all([axios.get('/api/corporate-room-settings'), axios.get('/api/taxes')]);
                console.log('settingsResponse.data', settingsResponse.data);
                setRoomSettings(settingsResponse.data);
                setTaxes(taxesResponse.data);
            } catch (error) {
                toast.error('Failed to fetch data!');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const { totalTaxRate, taxable_amount } = useMemo(() => {
        const applicableTaxes = taxes.filter((tax) => selectedTaxIds.includes(tax.id));
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
        if (!formData.board_type || !formData.description || !formData.room_type || !formData.amount_ksh) {
            toast.error('All fields are required!');
            return;
        }

        setIsPending(true);
        try {
            const response = await axios.post('/api/corporate-room-settings', {
                ...formData,
                taxable_amount: Number(taxable_amount),
                tax_ids: selectedTaxIds,
                discount_ids: selectedDiscountsId,
            });
            setRoomSettings([...roomSettings, response.data]);
            toast.success('Room Setting added successfully!');
            setFormData({
                description: '',
                board_type: 'Full Board',
                room_type: RoomType.single,
                amount_ksh: 0,
                taxable_amount: 0,
            });
            setSelectedTaxIds([]);
            setSelectedDiscountsId([]);
            setIsCreateModalOpen(false);
            setIsPending(false);
        } catch (error) {
            toast.error('Failed to add room setting!');
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
            const response = await axios.put(`/api/corporate-room-settings/${editingId}`, {
                description: editFormData.description,
                board_type: editFormData.board_type,
                room_type: editFormData.room_type,
                amount_ksh: editFormData.amount_ksh,
                taxable_amount: Number(edittaxable_amount),
                tax_ids: selectedTaxIds,
                discount_ids: selectedDiscountsId,
            });
            setRoomSettings(roomSettings.map((setting) => (setting.id === editingId ? response.data : setting)));
            toast.success('Room setting updated successfully!');
            setIsEditModalOpen(false);
            setIsUpdating(false);
            setEditingId(null);
        } catch (error) {
            toast.error('Failed to update room setting!');
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAuthenticated) {
            toast.error('You must be logged in to perform this action!');
            return;
        }
        if (!confirm('Are you sure you want to delete this room setting?')) return;
        setDeletingId(id);

        try {
            await axios.delete(`/api/corporate-room-settings/${id}`);
            setRoomSettings(roomSettings.filter((setting) => setting.id !== id));
            toast.success('Room setting deleted successfully!');
            setDeletingId(null);
        } catch (error) {
            toast.error('Failed to delete room setting!');
            setDeletingId(null);
        }
    };

    return (
        <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Corporate Room Settings</h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                >
                    <Plus size={18} /> Create Setting
                </button>
            </div>

            <div className="hidden overflow-x-auto shadow-md sm:rounded-lg md:block">
                {loading ? (
                    <p>Loading...</p>
                ) : roomSettings.length === 0 ? (
                    <p>No room settings found...</p>
                ) : (
                    <table className="min-w-full table-auto text-left text-sm text-gray-500">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2">Board Type</th>
                                <th className="px-4 py-2">Room Type</th>
                                <th className="px-4 py-2">Amount (Ksh)</th>
                                <th className="px-4 py-2">Applied Taxes</th>
                                <th className="px-4 py-2">Taxable Amount</th>
                                <th className="px-4 py-2">Available Discounts</th>
                                <th className="px-4 py-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roomSettings.map((setting) => (
                                <tr key={setting.id} className="border-b hover:bg-gray-100">
                                    <td className="px-4 py-2">{setting.board_type}</td>
                                    <td className="px-4 py-2 capitalize">{setting.room_type.toLowerCase()}</td>
                                    <td className="px-4 py-2">KSh {setting.amount_ksh.toLocaleString()}</td>
                                    <td className="px-4 py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {setting.taxes?.length > 0 ? (
                                                setting.taxes.map((tax) => (
                                                    <span key={tax.id} className="rounded bg-gray-100 px-2 py-1 text-xs">
                                                        {tax.name} ({tax.rate}%)
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-400">No taxes</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">KSh {setting.taxable_amount.toLocaleString()}</td>

                                    <td className="flex justify-center gap-2 px-4 py-2">
                                        <button
                                            onClick={() => {
                                                setEditingId(setting.id);
                                                setEditFormData(setting);
                                                setSelectedTaxIds(setting.taxes?.map((t) => t.id) || []);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="text-blue-500 hover:text-blue-700"
                                            title="Edit"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(setting.id)} className="text-red-500 hover:text-red-700" title="Delete">
                                            {deletingId === setting.id ? <FaSpinner className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="mt-4 space-y-4 md:hidden">
                {loading ? (
                    <p>Loading...</p>
                ) : roomSettings.length === 0 ? (
                    <p>No room settings found</p>
                ) : (
                    roomSettings.map((setting) => (
                        <div key={setting.id} className="rounded-lg border p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-medium text-gray-900">{setting.board_type}</h3>
                                    <p className="text-sm text-gray-500 capitalize">{setting.room_type.toLowerCase()}</p>
                                </div>
                                <button
                                    onClick={() => setExpandedSetting(expandedSetting === setting.id ? null : setting.id)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    {expandedSetting === setting.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                            </div>

                            {expandedSetting === setting.id && (
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <p className="text-sm text-gray-500">Amount</p>
                                        <p className="text-sm font-medium">KSh {setting.amount_ksh.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Applied Taxes</p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {setting.taxes?.length > 0 ? (
                                                setting.taxes.map((tax) => (
                                                    <span key={tax.id} className="rounded bg-gray-100 px-2 py-1 text-xs">
                                                        {tax.name} ({tax.rate}%)
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-400">No taxes applied</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Taxable Amount</p>
                                        <p className="text-sm font-medium">KSh {setting.taxable_amount.toLocaleString()}</p>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => {
                                                setEditingId(setting.id);
                                                setEditFormData(setting);
                                                setSelectedTaxIds(setting.taxes?.map((t) => t.id) || []);
                                                setIsEditModalOpen(true);
                                            }}
                                            className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-500 px-3 py-1 text-sm text-white"
                                        >
                                            <Edit size={14} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(setting.id)}
                                            className="flex flex-1 items-center justify-center gap-1 rounded bg-red-500 px-3 py-1 text-sm text-white"
                                        >
                                            {deletingId === setting.id ? <FaSpinner className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {isEditModalOpen && editFormData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Edit Room Setting</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                                <input
                                    type="text"
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Board Type</label>
                                <select
                                    value={editFormData.board_type}
                                    onChange={(e) => setEditFormData({ ...editFormData, board_type: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                >
                                    <option value="Full Board">Full Board</option>
                                    <option value="Half Board">Half Board</option>
                                    <option value="Bed & Breakfast">Bed & Breakfast</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Room Type</label>
                                <select
                                    value={editFormData.room_type}
                                    onChange={(e) => setEditFormData({ ...editFormData, room_type: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                >
                                    <option value={RoomType.single}>Single</option>
                                    <option value={RoomType.double}>Double</option>
                                    <option value={RoomType.triple}>Triple</option>
                                    <option value={RoomType.quadra}>Quadra</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Amount (KES)</label>
                                <input
                                    type="number"
                                    value={editFormData.amount_ksh}
                                    onChange={(e) => setEditFormData({ ...editFormData, amount_ksh: parseFloat(e.target.value) })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Applied Taxes</label>
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
                                            <label htmlFor={`edit-tax-${tax.id}`} className="ml-2 text-sm">
                                                {tax.name} ({tax.rate}%)
                                            </label>
                                        </div>
                                    ))}
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
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUpdate}
                                    disabled={isUpdating}
                                    className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
                                >
                                    {isUpdating ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Create Room Setting</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                                <input
                                    type="text"
                                    placeholder="Setting description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Board Type</label>
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
                                <label className="mb-1 block text-sm font-medium text-gray-700">Room Type</label>
                                <select
                                    value={formData.room_type}
                                    onChange={(e) => setFormData({ ...formData, room_type: e.target.value as RoomType })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                >
                                    <option value={RoomType.single}>Single</option>
                                    <option value={RoomType.double}>Double</option>
                                    <option value={RoomType.triple}>Triple</option>
                                    <option value={RoomType.quadra}>Quadra</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Amount (KES)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.amount_ksh}
                                    onChange={(e) => setFormData({ ...formData, amount_ksh: parseFloat(e.target.value) })}
                                    className="w-full rounded-lg border p-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">Apply Taxes</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {taxes.map((tax) => (
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
                            <div className="flex justify-end gap-3 pt-4">
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
                                    {isPending ? 'Creating...' : 'Create Setting'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorporateRoomSettings;
