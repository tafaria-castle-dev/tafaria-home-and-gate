import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, CheckCheck, CheckCircle2, ChevronDown, Clock, Edit3, Eye, Filter, Search, Trash2, X, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FormData } from './CreateDreamPass';
import DreamPassDetailModal, { DreamPass } from './DreamPassDetailsModal';
interface ViewDreamPassProps {
    setEdit: (val: boolean) => void;
    setActiveTab: (tab: string) => void;
    activeTab: string;
}

const ViewDreamPasses: React.FC<ViewDreamPassProps> = ({ setEdit, setActiveTab }) => {
    const { isAuthenticated, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<'room_number' | 'created_at' | 'check_in_date' | 'check_out_date'>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState<{ status?: string }>({});
    const [tempFilters, setTempFilters] = useState<{ status?: string }>({});
    const [selectedDreamPass, setSelectedDreamPass] = useState<DreamPass | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [dreamPassToDelete, setDreamPassToDelete] = useState<string | null>(null);
    const [isStatusChanging, setIsStatusChanging] = useState(false);
    const [currentChangingId, setCurrentChangingId] = useState<string | null>(null);
    const [dreamPasses, setDreamPasses] = useState<DreamPass[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [redeemingActivity, setRedeemingActivity] = useState<string | null>(null);
    const [showBulkApprovalModal, setShowBulkApprovalModal] = useState(false);
    const [selectedForBulkApproval, setSelectedForBulkApproval] = useState<Set<string>>(new Set());
    const [bulkApproving, setBulkApproving] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [selectedForBulkDelete, setSelectedForBulkDelete] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const fetchDreamPasses = useCallback(async () => {
        setIsFetching(true);
        try {
            const queryParams = new URLSearchParams();
            if (filters.status) queryParams.append('status', filters.status);
            const response = await axios.get(`/api/dream-passes?${queryParams.toString()}`);
            setDreamPasses(response.data.data || []);
        } catch (error) {
            toast.error('Failed to fetch dream passes');
        } finally {
            setIsFetching(false);
        }
    }, [filters]);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchDreamPasses();
        }
    }, [isAuthenticated, fetchDreamPasses]);

    const filteredDreamPasses = useMemo(() => {
        let results = dreamPasses;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            results = results.filter((dp) => dp.room_number.toLowerCase().includes(query) || dp.status.toLowerCase().includes(query));
        }
        return results;
    }, [dreamPasses, searchQuery]);

    const sortedDreamPasses = useMemo(() => {
        return [...filteredDreamPasses].sort((a, b) => {
            const isDateField = sortField === 'created_at' || sortField === 'check_in_date' || sortField === 'check_out_date';

            if (isDateField) {
                const aStr = a[sortField as 'created_at' | 'check_in_date' | 'check_out_date'];
                const bStr = b[sortField as 'created_at' | 'check_in_date' | 'check_out_date'];
                const aTime = aStr ? new Date(aStr).getTime() : 0;
                const bTime = bStr ? new Date(bStr).getTime() : 0;
                return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
            }

            const aVal = String(a[sortField as keyof DreamPass] ?? '');
            const bVal = String(b[sortField as keyof DreamPass] ?? '');
            return sortDirection === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        });
    }, [filteredDreamPasses, sortField, sortDirection]);

    const pendingDreamPasses = useMemo(() => {
        return sortedDreamPasses.filter((dp) => dp.status === 'pending');
    }, [sortedDreamPasses]);

    const handleSort = (field: 'room_number' | 'created_at' | 'check_in_date' | 'check_out_date') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleStatusChange = async (dp: any, newStatus: string) => {
        setIsStatusChanging(true);
        setCurrentChangingId(dp.id);
        try {
            if (newStatus === 'approved') {
                await axios.post(`/api/dream-passes/${dp.id}/approve`);
            } else if (newStatus === 'rejected') {
                await axios.post(`/api/dream-passes/${dp.id}/reject`);
            } else if (newStatus === 'draft') {
                await axios.post(`/api/dream-passes/${dp.id}/draft`);
            } else if (newStatus === 'pending') {
                await axios.post(`/api/dream-passes/${dp.id}/pending`);
            }
            toast.success('Status updated');
            fetchDreamPasses();
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setIsStatusChanging(false);
            setCurrentChangingId(null);
        }
    };

    const handleDelete = (id: string) => {
        setDreamPassToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!dreamPassToDelete) return;
        try {
            await axios.delete(`/api/dream-passes/${dreamPassToDelete}`);
            toast.success('DreamPass deleted');
            fetchDreamPasses();
        } catch (error) {
            toast.error('Failed to delete');
        } finally {
            setIsDeleteModalOpen(false);
            setDreamPassToDelete(null);
        }
    };

    const handleOpenDetails = async (id: string) => {
        try {
            const response = await axios.get(`/api/dream-passes/${id}`);
            setSelectedDreamPass(response.data);
        } catch (error) {
            toast.error('Failed to load details');
        }
    };

    const defaultSouvenirItems = ['T-Shirt', 'Mug', 'Keychain', 'Cap', 'Postcard', 'Magnet', 'Sticker Pack'];

    const handleUpdate = async (dp: any) => {
        const editedFormData: FormData = {
            roomNumber: dp.room_number,
            guest_name: dp.guest_name || '',
            name: dp.guest_name || '',
            checkIn: format(new Date(dp.check_in_date), 'yyyy-MM-dd'),
            checkOut: format(new Date(dp.check_out_date), 'yyyy-MM-dd'),
            activities: dp.activities.map((act: any) => ({
                name: act.activity_name,
                voucher_count: act.voucher_count || 1,
                validFrom: format(new Date(act.valid_from), 'yyyy-MM-dd'),
                validTo: format(new Date(act.valid_to), 'yyyy-MM-dd'),
            })),
            souvenir: dp.souvenir_discount
                ? {
                      discount: dp.souvenir_discount.discount_percentage.toString(),
                      validFrom: dp.souvenir_discount.valid_from,
                      validTo: dp.souvenir_discount.valid_to,
                      items: defaultSouvenirItems
                          .map((name) => ({
                              name,
                              checked: dp.souvenir_discount.applicable_items?.includes(name) || false,
                          }))
                          .concat(
                              (dp.souvenir_discount.applicable_items || [])
                                  .filter((item: string) => !defaultSouvenirItems.includes(item))
                                  .map((name: string) => ({ name, checked: true })),
                          ),
                  }
                : {
                      discount: '',
                      validFrom: '',
                      validTo: '',
                      items: defaultSouvenirItems.map((name) => ({ name, checked: false })),
                  },
        };

        localStorage.setItem('editingDreamPass', JSON.stringify(editedFormData));
        localStorage.setItem('editingDreamPassId', dp.id);
        localStorage.setItem('dayVisit', dp.day_visit ? 'true' : 'false');

        setActiveTab('edit');
    };

    const applyFilters = () => {
        setFilters(tempFilters);
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        setTempFilters({});
        setFilters({});
        setIsFilterOpen(false);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'rejected':
                return <XCircle className="h-4 w-4 text-red-600" />;
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-600" />;
            default:
                return <div className="h-4 w-4 rounded-full bg-gray-400" />;
        }
    };

    const toggleBulkSelection = (id: string) => {
        setSelectedForBulkApproval((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleSelectAllPending = () => {
        if (selectedForBulkApproval.size === pendingDreamPasses.length) {
            setSelectedForBulkApproval(new Set());
        } else {
            setSelectedForBulkApproval(new Set(pendingDreamPasses.map((dp) => dp.id)));
        }
    };

    const handleBulkApproval = async () => {
        if (selectedForBulkApproval.size === 0) {
            toast.error('Please select at least one pass to approve');
            return;
        }

        setBulkApproving(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const id of Array.from(selectedForBulkApproval)) {
                try {
                    await axios.post(`/api/dream-passes/${id}/approve`);
                    successCount++;
                } catch (error) {
                    failCount++;
                    console.error(`Failed to approve pass ${id}:`, error);
                }
            }

            toast.success(`Bulk approval complete: ${successCount} approved, ${failCount} failed`);
            setShowBulkApprovalModal(false);
            setSelectedForBulkApproval(new Set());
            fetchDreamPasses();
        } catch (error) {
            toast.error('Bulk approval failed');
        } finally {
            setBulkApproving(false);
        }
    };

    const toggleBulkDeleteSelection = (id: string) => {
        setSelectedForBulkDelete((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleSelectAllForDelete = () => {
        if (selectedForBulkDelete.size === sortedDreamPasses.length) {
            setSelectedForBulkDelete(new Set());
        } else {
            setSelectedForBulkDelete(new Set(sortedDreamPasses.map((dp) => dp.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedForBulkDelete.size === 0) {
            toast.error('Please select at least one pass to delete');
            return;
        }

        setBulkDeleting(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const id of Array.from(selectedForBulkDelete)) {
                try {
                    await axios.delete(`/api/dream-passes/${id}`);
                    successCount++;
                } catch (error) {
                    failCount++;
                    console.error(`Failed to delete pass ${id}:`, error);
                }
            }

            toast.success(`Bulk delete complete: ${successCount} deleted, ${failCount} failed`);
            setShowBulkDeleteModal(false);
            setSelectedForBulkDelete(new Set());
            fetchDreamPasses();
        } catch (error) {
            toast.error('Bulk delete failed');
        } finally {
            setBulkDeleting(false);
        }
    };
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
                >
                    <div className="bg-gradient-to-r from-[#902729] to-[#7e1a1c] px-6 py-5 text-white sm:px-8 sm:py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
                                    <Eye className="h-7 w-7 sm:h-8 sm:w-8" />
                                    View DreamPasses
                                </h2>
                                <p className="mt-1 text-sm text-blue-100 sm:text-base">{sortedDreamPasses.length} total results</p>
                            </div>

                            {user?.role === 'admin' && sortedDreamPasses.length > 0 && (
                                <>
                                    {pendingDreamPasses.length > 0 && (
                                        <button
                                            onClick={() => setShowBulkApprovalModal(true)}
                                            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-medium text-indigo-700 transition hover:bg-gray-100"
                                        >
                                            <CheckCheck className="h-5 w-5" />
                                            <span className="hidden sm:inline">Bulk Approve</span>
                                            <span className="inline sm:hidden">Approve</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowBulkDeleteModal(true)}
                                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                        <span className="hidden sm:inline">Bulk Delete</span>
                                        <span className="inline sm:hidden">Delete</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6 p-4 sm:p-8">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by room or status..."
                                    className="w-full rounded-lg border border-gray-300 py-3 pr-10 pl-10 transition focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-5 py-3 text-white transition hover:bg-gray-900"
                            >
                                <Filter className="h-5 w-5" />
                                Filters
                                <ChevronDown className={`h-5 w-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
                                        <h3 className="mb-4 text-base font-semibold sm:text-lg">Filter by Status</h3>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                            {['All', 'Draft', 'Pending', 'Approved', 'Rejected'].map((status) => (
                                                <label
                                                    key={status}
                                                    className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition hover:bg-white"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="status"
                                                        value={status.toLowerCase() === 'all' ? '' : status.toLowerCase()}
                                                        checked={
                                                            tempFilters.status === (status.toLowerCase() === 'all' ? undefined : status.toLowerCase())
                                                        }
                                                        onChange={(e) => setTempFilters({ status: e.target.value || undefined })}
                                                        className="h-4 w-4 text-indigo-600"
                                                    />
                                                    <span className="text-sm font-medium">{status}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                            <button
                                                onClick={clearFilters}
                                                className="order-2 rounded-lg bg-gray-200 px-5 py-2 text-gray-700 transition hover:bg-gray-300 sm:order-1"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                onClick={applyFilters}
                                                className="order-1 rounded-lg bg-indigo-600 px-6 py-2 text-white transition hover:bg-indigo-700 sm:order-2"
                                            >
                                                Apply Filters
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {isFetching ? (
                            <div className="flex items-center justify-center py-20">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                    className="h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="hidden overflow-x-auto rounded-xl border border-gray-200 lg:block">
                                    <table className="w-full min-w-[800px]">
                                        <thead className="border-b border-gray-200 bg-gray-50">
                                            <tr>
                                                <th
                                                    onClick={() => handleSort('room_number')}
                                                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-600 uppercase transition hover:bg-gray-100"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Room/Day Visit Pass
                                                        {sortField === 'room_number' &&
                                                            (sortDirection === 'asc' ? (
                                                                <ArrowUp className="h-4 w-4" />
                                                            ) : (
                                                                <ArrowDown className="h-4 w-4" />
                                                            ))}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-600 uppercase">
                                                    Status
                                                </th>
                                                <th
                                                    onClick={() => handleSort('check_in_date')}
                                                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-600 uppercase transition hover:bg-gray-100"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Check In
                                                        {sortField === 'check_in_date' &&
                                                            (sortDirection === 'asc' ? (
                                                                <ArrowUp className="h-4 w-4" />
                                                            ) : (
                                                                <ArrowDown className="h-4 w-4" />
                                                            ))}
                                                    </div>
                                                </th>
                                                <th
                                                    onClick={() => handleSort('check_out_date')}
                                                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-600 uppercase transition hover:bg-gray-100"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Check Out
                                                        {sortField === 'check_out_date' &&
                                                            (sortDirection === 'asc' ? (
                                                                <ArrowUp className="h-4 w-4" />
                                                            ) : (
                                                                <ArrowDown className="h-4 w-4" />
                                                            ))}
                                                    </div>
                                                </th>
                                                <th
                                                    onClick={() => handleSort('created_at')}
                                                    className="cursor-pointer px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-600 uppercase transition hover:bg-gray-100"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Created
                                                        {sortField === 'created_at' &&
                                                            (sortDirection === 'asc' ? (
                                                                <ArrowUp className="h-4 w-4" />
                                                            ) : (
                                                                <ArrowDown className="h-4 w-4" />
                                                            ))}
                                                    </div>
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-gray-600 uppercase">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {sortedDreamPasses.map((dp) => (
                                                <tr key={dp.id} className="transition hover:bg-gray-50">
                                                    <td className="px-4 py-4 font-medium text-gray-900">{dp.room_number}</td>
                                                    <td className="px-4 py-4">
                                                        {user?.role === 'admin' ? (
                                                            <select
                                                                value={dp.status}
                                                                onChange={(e) => handleStatusChange(dp, e.target.value)}
                                                                disabled={isStatusChanging && currentChangingId === dp.id}
                                                                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                            >
                                                                <option value="draft">Draft</option>
                                                                <option value="pending">Pending</option>
                                                                <option value="approved">Approved</option>
                                                                <option value="rejected">Rejected</option>
                                                            </select>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                {getStatusIcon(dp.status)}
                                                                <span className="text-sm font-medium capitalize">{dp.status}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                        {format(new Date(dp.check_in_date), 'dd MMM yyyy')}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                        {format(new Date(dp.check_out_date), 'dd MMM yyyy')}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                        {format(new Date(dp.created_at), 'dd MMM yyyy')}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleOpenDetails(dp.id)}
                                                                className="rounded-lg bg-blue-100 p-2 text-blue-700 transition hover:bg-blue-200"
                                                                title="View Details"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdate(dp)}
                                                                className="rounded-lg bg-green-100 p-2 text-green-700 transition hover:bg-green-200"
                                                                title="Edit"
                                                            >
                                                                <Edit3 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(dp.id)}
                                                                className="rounded-lg bg-red-100 p-2 text-red-700 transition hover:bg-red-200"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid gap-4 lg:hidden">
                                    {sortedDreamPasses.map((dp) => (
                                        <motion.div
                                            key={dp.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                                        >
                                            <div className="mb-4 flex items-start justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-600">{dp.day_visit ? 'Pass' : 'Room'} Number</p>
                                                    <p className="text-2xl font-bold text-gray-900">{dp.room_number}</p>
                                                </div>
                                                <div className="text-right">
                                                    {user?.role === 'admin' ? (
                                                        <select
                                                            value={dp.status}
                                                            onChange={(e) => handleStatusChange(dp, e.target.value)}
                                                            disabled={isStatusChanging && currentChangingId === dp.id}
                                                            className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                        >
                                                            <option value="draft">Draft</option>
                                                            <option value="pending">Pending</option>
                                                            <option value="approved">Approved</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(dp.status)}
                                                            <span className="font-medium capitalize">{dp.status}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
                                                {dp.day_visit ? (
                                                    <div>
                                                        {dp.guest_name && <p className="font-semibold text-gray-600">Guest Name: {dp.guest_name}</p>}
                                                        <p className="text-gray-600">Visit Date</p>
                                                        <p className="font-semibold">{format(new Date(dp.check_in_date), 'dd MMM yyyy')}</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div>
                                                            <p className="text-gray-600">Check In</p>
                                                            <p className="font-semibold">{format(new Date(dp.check_in_date), 'dd MMM yyyy')}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-600">Check Out</p>
                                                            <p className="font-semibold">{format(new Date(dp.check_out_date), 'dd MMM yyyy')}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-3 border-t pt-4">
                                                <button
                                                    onClick={() => handleOpenDetails(dp.id)}
                                                    className="rounded-lg bg-blue-100 px-4 py-2 text-blue-700 transition hover:bg-blue-200"
                                                >
                                                    <Eye className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleUpdate(dp)}
                                                    className="rounded-lg bg-green-100 px-4 py-2 text-green-700 transition hover:bg-green-200"
                                                >
                                                    <Edit3 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dp.id)}
                                                    className="rounded-lg bg-red-100 px-4 py-2 text-red-700 transition hover:bg-red-200"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {sortedDreamPasses.length === 0 && <div className="py-12 text-center text-gray-500">No dream passes found</div>}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

            {selectedDreamPass && <DreamPassDetailModal dreamPass={selectedDreamPass} onClose={() => setSelectedDreamPass(null)} />}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <h3 className="mb-3 text-lg font-bold">Confirm Delete</h3>
                        <p className="mb-6 text-sm text-gray-600">Are you sure you want to delete this DreamPass? This action cannot be undone.</p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="order-2 rounded-lg bg-gray-200 px-5 py-2 text-gray-700 transition hover:bg-gray-300 sm:order-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="order-1 rounded-lg bg-red-600 px-6 py-2 text-white transition hover:bg-red-700 sm:order-2"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showBulkApprovalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b bg-gradient-to-r from-[#902729] to-[#7e1a1c] px-6 py-4 text-white">
                            <h3 className="text-xl font-bold">Bulk Approve DreamPasses</h3>
                            <button onClick={() => setShowBulkApprovalModal(false)} className="rounded-lg p-1 hover:bg-white/20">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm text-gray-600">{pendingDreamPasses.length} pending passes available</p>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedForBulkApproval.size === pendingDreamPasses.length && pendingDreamPasses.length > 0}
                                        onChange={toggleSelectAllPending}
                                        className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Select All</span>
                                </label>
                            </div>

                            <div className="space-y-3">
                                {pendingDreamPasses.map((dp) => (
                                    <label
                                        key={dp.id}
                                        className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedForBulkApproval.has(dp.id)}
                                                onChange={() => toggleBulkSelection(dp.id)}
                                                className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {dp.day_visit ? `Pass` : `Room`} {dp.room_number}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {!dp.day_visit && `${format(new Date(dp.check_in_date), 'dd MMM')}-${' '}`}
                                                    {format(new Date(dp.check_out_date), 'dd MMM yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock className="h-4 w-4 text-yellow-600" />
                                            <span>{dp.activities.length} activities</span>
                                        </div>
                                    </label>
                                ))}

                                {pendingDreamPasses.length === 0 && (
                                    <div className="py-12 text-center text-gray-500">No pending passes to approve</div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between border-t px-6 py-4">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">{selectedForBulkApproval.size}</span> passes selected
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBulkApprovalModal(false)}
                                    disabled={bulkApproving}
                                    className="rounded-lg bg-gray-200 px-5 py-2 font-medium text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkApproval}
                                    disabled={bulkApproving || selectedForBulkApproval.size === 0}
                                    className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {bulkApproving ? 'Approving...' : `Approve ${selectedForBulkApproval.size} Passes`}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            {showBulkDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 text-white">
                            <h3 className="text-xl font-bold">Bulk Delete DreamPasses</h3>
                            <button onClick={() => setShowBulkDeleteModal(false)} className="rounded-lg p-1 hover:bg-white/20">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm text-gray-600">{sortedDreamPasses.length} passes available</p>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedForBulkDelete.size === sortedDreamPasses.length && sortedDreamPasses.length > 0}
                                        onChange={toggleSelectAllForDelete}
                                        className="h-5 w-5 rounded text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Select All</span>
                                </label>
                            </div>

                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                                <p className="text-sm font-medium text-red-800">⚠️ Warning: This action cannot be undone!</p>
                            </div>

                            <div className="space-y-3">
                                {sortedDreamPasses.map((dp) => (
                                    <label
                                        key={dp.id}
                                        className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition hover:bg-gray-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedForBulkDelete.has(dp.id)}
                                                onChange={() => toggleBulkDeleteSelection(dp.id)}
                                                className="h-5 w-5 rounded text-red-600 focus:ring-red-500"
                                            />
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {dp.day_visit ? 'Pass' : 'Room'} {dp.room_number}
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {!dp.day_visit && `${format(new Date(dp.check_in_date), 'dd MMM')}-${' '}`}
                                                    {format(new Date(dp.check_out_date), 'dd MMM yyyy')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(dp.status)}
                                            <span className="text-sm font-medium text-gray-600 capitalize">{dp.status}</span>
                                        </div>
                                    </label>
                                ))}

                                {sortedDreamPasses.length === 0 && <div className="py-12 text-center text-gray-500">No passes to delete</div>}
                            </div>
                        </div>

                        <div className="flex justify-between border-t px-6 py-4">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">{selectedForBulkDelete.size}</span> passes selected
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBulkDeleteModal(false)}
                                    disabled={bulkDeleting}
                                    className="rounded-lg bg-gray-200 px-5 py-2 font-medium text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleting || selectedForBulkDelete.size === 0}
                                    className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                                >
                                    {bulkDeleting ? 'Deleting...' : `Delete ${selectedForBulkDelete.size} Passes`}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ViewDreamPasses;
