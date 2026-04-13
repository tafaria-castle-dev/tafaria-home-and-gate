import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Baby,
    BedDouble,
    Briefcase,
    Building2,
    CalendarCheck,
    CalendarX,
    Car,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Eye,
    Filter,
    Hash,
    LogOut,
    MapPin,
    Pencil,
    Phone,
    Receipt,
    Search,
    Shield,
    Sparkles,
    Sunset,
    Trash2,
    UserCheck,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { SECTIONS } from './CreateReservation';

interface ViewGuestReservationsProps {
    setActiveTab: (tab: string) => void;
    setReservationId: (id: string | null) => void;
    activeTab: string;
}

export interface GuestReservation {
    id: string;
    guest_name: string;
    dream_pass_id?: string | null;
    ref_no?: string | null;
    section: string;
    entry_time?: string;
    exit_time?: string;
    check_in?: string;
    check_out?: string;
    contact_id?: string;
    car_plate_number?: string;
    reservation_number: string;
    contact_person_id?: string;
    phone_number?: string;
    kids_count?: number;
    infants_count?: number;
    adults_count: number;
    dream_pass_code?: string;
    is_express_check_in?: boolean;
    is_express_check_out?: boolean;
    type: 'corporate' | 'leisure';
    checked_in_by_user_id?: string;
    cleared_bills?: { is_cleared?: boolean; comments?: string } | null;
    cleared_bills_by_user_id?: string;
    cleared_by_house_keeping?: { is_cleared?: boolean; comments?: string } | null;
    cleared_by_house_keeping_user_id?: string;
    created_at: string;
    updated_at: string;
    contact?: { id: string; institution: string };
    contact_person?: { id: string; first_name: string; last_name: string; phone?: string; email?: string };
    checked_in_by_user?: { id: string; name: string };
    cleared_bills_by_user?: { id: string; name: string };
    cleared_by_house_keeping_user?: { id: string; name: string };
    visit_count?: number;
    total_hours_spent?: number;
    entry_type?: 'walk_in' | 'drive_in';
}

const getSectionLabel = (val: string) => SECTIONS.find((s) => s.value === val)?.label ?? val;

const formatDate = (d?: string) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '—';
    }
};

const formatDateTime = (d?: string) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return '—';
    }
};

const getNightCount = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return null;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    if (diff <= 0) return null;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getGuestDisplayName = (r: GuestReservation) =>
    r.contact?.institution ||
    (r.contact_person ? `${r.contact_person.first_name || ''} ${r.contact_person.last_name || ''}`.trim() : null) ||
    r.guest_name;

const StatusBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{label}</span>
);

const MiniTag: React.FC<{ icon: React.ReactNode; label: string; color: string }> = ({ icon, label, color }) => (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${color}`}>
        {icon}
        {label}
    </span>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex items-start justify-between gap-4 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-slate-400 uppercase">
            {icon && <span className="text-amber-400">{icon}</span>}
            {label}
        </div>
        <div className="text-right text-sm font-medium text-slate-700">{value || '—'}</div>
    </div>
);

const Divider = () => <div className="border-t border-slate-100" />;

const ViewGuestReservations: React.FC<ViewGuestReservationsProps> = ({ setActiveTab, setReservationId, activeTab }) => {
    const { isAuthenticated, user } = useAuth();

    const [reservations, setReservations] = useState<GuestReservation[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [isFetching, setIsFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileView, setIsMobileView] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedReservation, setSelectedReservation] = useState<GuestReservation | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [reservationToDelete, setReservationToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [filters, setFilters] = useState<{
        section?: string;
        type?: string;
        dateField?: string;
        dateRange?: string;
        customStart?: string;
        customEnd?: string;
    }>({});
    const [tempFilters, setTempFilters] = useState<typeof filters>({});

    const filterRef = useRef<HTMLDivElement>(null);

    const fetchReservations = useCallback(
        async (page = 1) => {
            setIsFetching(true);
            try {
                const params = new URLSearchParams({
                    has_entry: '0',
                    page: page.toString(),
                    ...(filters.section && { section: filters.section }),
                    ...(filters.type && { type: filters.type }),
                    ...(filters.dateField && { dateField: filters.dateField }),
                    ...(filters.dateRange && { dateRange: filters.dateRange }),
                    ...(filters.customStart && { customStart: filters.customStart }),
                    ...(filters.customEnd && { customEnd: filters.customEnd }),
                });
                const { data } = await axios.get(`/api/guest-reservations?${params}`);
                setReservations(data.data ?? data);
                setTotalCount(data.total ?? (data.data ?? data).length);
                setCurrentPage(data.current_page ?? 1);
                setLastPage(data.last_page ?? 1);
            } catch {
                toast.error('Failed to fetch reservations.');
            } finally {
                setIsFetching(false);
            }
        },
        [filters],
    );

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
            return;
        }
        fetchReservations(1);
    }, [isAuthenticated, fetchReservations, activeTab]);

    useEffect(() => {
        const check = () => setIsMobileView(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const filteredReservations = useMemo(() => {
        if (!searchQuery.trim()) return reservations;
        const q = searchQuery.toLowerCase();
        return reservations.filter((r) =>
            [
                r.guest_name,
                r.reservation_number,
                r.section,
                r.phone_number,
                r.type,
                r.car_plate_number,
                r.contact?.institution,
                r.contact_person?.first_name,
                r.contact_person?.last_name,
                r.checked_in_by_user?.name,
            ]
                .filter(Boolean)
                .some((v) => v!.toLowerCase().includes(q)),
        );
    }, [reservations, searchQuery]);

    const sortedReservations = useMemo(() => {
        if (!sortField) return filteredReservations;
        return [...filteredReservations].sort((a, b) => {
            let va: any, vb: any;
            switch (sortField) {
                case 'guest_name':
                    va = getGuestDisplayName(a);
                    vb = getGuestDisplayName(b);
                    break;
                case 'section':
                    va = a.section;
                    vb = b.section;
                    break;
                case 'type':
                    va = a.type;
                    vb = b.type;
                    break;
                case 'check_in':
                    va = a.check_in || '';
                    vb = b.check_in || '';
                    break;
                case 'check_out':
                    va = a.check_out || '';
                    vb = b.check_out || '';
                    break;
                case 'adults_count':
                    va = a.adults_count ?? 0;
                    vb = b.adults_count ?? 0;
                    return sortDirection === 'asc' ? va - vb : vb - va;
                case 'created_at':
                    va = a.created_at;
                    vb = b.created_at;
                    break;
                default:
                    return 0;
            }
            return sortDirection === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
    }, [filteredReservations, sortField, sortDirection]);

    const handleSort = (field: string) => {
        if (sortField === field) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleView = (r: GuestReservation) => {
        setSelectedReservation(r);
        setIsDetailOpen(true);
    };

    const handleEdit = (r: GuestReservation) => {
        setReservationId(r.id);
        setActiveTab('edit');
    };

    const handleDelete = (id: string) => {
        setReservationToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!reservationToDelete) return;
        setIsDeleting(true);
        try {
            await axios.delete(`/api/guest-reservations/${reservationToDelete}`);
            toast.success('Reservation deleted.');
            fetchReservations(currentPage);
        } catch {
            toast.error('Failed to delete reservation.');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setReservationToDelete(null);
        }
    };

    const applyFilters = () => {
        if (tempFilters.dateRange === 'custom' && tempFilters.dateField && (!tempFilters.customStart || !tempFilters.customEnd)) {
            toast.error('Provide both start and end dates for custom range.');
            return;
        }
        setFilters(tempFilters);
        toast.success('Filters applied.');
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        setTempFilters({});
        setFilters({});
        toast.success('Filters cleared.');
    };

    const SortIcon = ({ field }: { field: string }) =>
        sortField === field ? (
            sortDirection === 'asc' ? (
                <ArrowUp size={14} className="ml-1 text-amber-500" />
            ) : (
                <ArrowDown size={14} className="ml-1 text-amber-500" />
            )
        ) : null;

    const ThCell: React.FC<{ field: string; label: string; className?: string }> = ({ field, label, className = '' }) => (
        <th
            onClick={() => handleSort(field)}
            className={`cursor-pointer px-4 py-3 text-left text-xs font-bold tracking-wider text-slate-500 uppercase transition-colors select-none hover:text-amber-600 ${className}`}
        >
            <div className="flex items-center">
                {label}
                <SortIcon field={field} />
            </div>
        </th>
    );

    const activeFiltersList = useMemo(() => {
        const list: { label: string; key: string }[] = [];
        if (filters.section) list.push({ label: `Section: ${getSectionLabel(filters.section)}`, key: 'section' });
        if (filters.type) list.push({ label: `Type: ${filters.type}`, key: 'type' });
        if (filters.dateField) {
            const rangeLabel =
                { last3Months: 'Last 3 months', last6Months: 'Last 6 months', lastYear: 'Last year', custom: 'Custom' }[filters.dateRange ?? ''] ??
                '';
            list.push({ label: `Date: ${rangeLabel}`, key: 'date' });
        }
        return list;
    }, [filters]);

    if (!isAuthenticated) return null;

    return (
        <div
            className="min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8"
            style={{
                background: 'radial-gradient(ellipse at 20% 0%, #fef9ee 0%, #f8fafc 40%, #f1f5f9 100%)',
                fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            }}
        >
            <div className="mx-auto w-full">
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
                    <h1
                        className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        Guest Reservations
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        <span className="font-bold text-amber-600">{totalCount}</span> reservation{totalCount !== 1 ? 's' : ''} found
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.05 }}
                    className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, reservation #, section, phone…"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-10 text-sm shadow-sm placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setIsFilterOpen((o) => !o)}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                            isFilterOpen || activeFiltersList.length > 0
                                ? 'border-amber-400 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300'
                        }`}
                    >
                        <Filter className="h-4 w-4" />
                        Filters
                        {activeFiltersList.length > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
                                {activeFiltersList.length}
                            </span>
                        )}
                        {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </motion.div>

                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div
                            ref={filterRef}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="p-5">
                                {activeFiltersList.length > 0 && (
                                    <div className="mb-4 flex flex-wrap gap-2">
                                        {activeFiltersList.map((f) => (
                                            <span
                                                key={f.key}
                                                className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                                            >
                                                {f.label}
                                                <button
                                                    onClick={() => {
                                                        const updated = { ...filters };
                                                        if (f.key === 'date') {
                                                            delete updated.dateField;
                                                            delete updated.dateRange;
                                                            delete updated.customStart;
                                                            delete updated.customEnd;
                                                        } else delete (updated as any)[f.key];
                                                        setFilters(updated);
                                                        setTempFilters(updated);
                                                    }}
                                                    className="ml-1 text-amber-600 hover:text-amber-900"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold tracking-widest text-slate-500 uppercase">Section</label>
                                        <select
                                            value={tempFilters.section || ''}
                                            onChange={(e) => setTempFilters((p) => ({ ...p, section: e.target.value || undefined }))}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                                        >
                                            <option value="">All Sections</option>
                                            {SECTIONS.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold tracking-widest text-slate-500 uppercase">Type</label>
                                        <select
                                            value={tempFilters.type || ''}
                                            onChange={(e) => setTempFilters((p) => ({ ...p, type: e.target.value || undefined }))}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                                        >
                                            <option value="">All Types</option>
                                            <option value="corporate">Corporate</option>
                                            <option value="leisure">Leisure</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold tracking-widest text-slate-500 uppercase">Date Field</label>
                                        <select
                                            value={tempFilters.dateField || ''}
                                            onChange={(e) =>
                                                setTempFilters((p) => ({ ...p, dateField: e.target.value || undefined, dateRange: 'last3Months' }))
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                                        >
                                            <option value="">Select Date Field</option>
                                            <option value="check_in">Check-In</option>
                                            <option value="check_out">Check-Out</option>
                                            <option value="created_at">Created At</option>
                                        </select>
                                    </div>
                                    {tempFilters.dateField && (
                                        <div>
                                            <label className="mb-1 block text-xs font-bold tracking-widest text-slate-500 uppercase">
                                                Date Range
                                            </label>
                                            <select
                                                value={tempFilters.dateRange || ''}
                                                onChange={(e) => setTempFilters((p) => ({ ...p, dateRange: e.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                                            >
                                                <option value="last3Months">Last 3 Months</option>
                                                <option value="last6Months">Last 6 Months</option>
                                                <option value="lastYear">Last Year</option>
                                                <option value="custom">Custom Range</option>
                                            </select>
                                        </div>
                                    )}
                                    {tempFilters.dateRange === 'custom' && tempFilters.dateField && (
                                        <div className="sm:col-span-2">
                                            <label className="mb-1 block text-xs font-bold tracking-widest text-slate-500 uppercase">
                                                Custom Range
                                            </label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="date"
                                                    value={tempFilters.customStart || ''}
                                                    onChange={(e) => setTempFilters((p) => ({ ...p, customStart: e.target.value }))}
                                                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                                                />
                                                <input
                                                    type="date"
                                                    value={tempFilters.customEnd || ''}
                                                    onChange={(e) => setTempFilters((p) => ({ ...p, customEnd: e.target.value }))}
                                                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-5 flex justify-end gap-3">
                                    <button
                                        onClick={clearFilters}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={applyFilters}
                                        className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:from-amber-500 hover:to-orange-600"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isFetching ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="h-12 w-12 rounded-full border-4 border-amber-400 border-t-transparent"
                        />
                    </div>
                ) : sortedReservations.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white"
                    >
                        <BedDouble className="h-10 w-10 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-400">No reservations found</p>
                    </motion.div>
                ) : isMobileView ? (
                    <div className="space-y-4">
                        {sortedReservations.map((r, i) => (
                            <motion.div
                                key={r.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.04 }}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                            >
                                <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
                                    <div>
                                        <p className="font-bold text-slate-800">{getGuestDisplayName(r)}</p>
                                        <p className="mt-0.5 font-mono text-xs font-bold text-amber-600">#{r.reservation_number}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {r.type === 'corporate' ? (
                                            <MiniTag icon={<Briefcase className="h-3 w-3" />} label="Corporate" color="bg-blue-50 text-blue-700" />
                                        ) : (
                                            <MiniTag icon={<Sunset className="h-3 w-3" />} label="Leisure" color="bg-purple-50 text-purple-700" />
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-sm">
                                    <div>
                                        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Section</p>
                                        <p className="font-medium text-slate-700">{getSectionLabel(r.section)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Guests</p>
                                        <p className="font-medium text-slate-700">
                                            {r.adults_count ?? 0}A {r.kids_count ?? 0}K{r.infants_count ?? 0}I
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Check-In</p>
                                        <p className="font-medium text-slate-700">{formatDate(r.check_in)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Check-Out</p>
                                        <p className="font-medium text-slate-700">{formatDate(r.check_out)}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                                    {r.is_express_check_in && (
                                        <MiniTag icon={<Zap className="h-3 w-3" />} label="Express In" color="bg-amber-50 text-amber-700" />
                                    )}
                                    {r.is_express_check_out && (
                                        <MiniTag icon={<LogOut className="h-3 w-3" />} label="Express Out" color="bg-violet-50 text-violet-700" />
                                    )}
                                    {r.cleared_bills?.is_cleared && (
                                        <MiniTag
                                            icon={<Receipt className="h-3 w-3" />}
                                            label="Bills Cleared"
                                            color="bg-emerald-50 text-emerald-700"
                                        />
                                    )}
                                    {r.cleared_by_house_keeping?.is_cleared && (
                                        <MiniTag icon={<Sparkles className="h-3 w-3" />} label="HK Cleared" color="bg-sky-50 text-sky-700" />
                                    )}
                                </div>
                                <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                                    <button
                                        onClick={() => handleView(r)}
                                        className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-amber-100 hover:text-amber-700"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(r)}
                                        className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-blue-100 hover:text-blue-700"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    {user?.role === 'admin' && (
                                        <button
                                            onClick={() => handleDelete(r.id)}
                                            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-rose-100 hover:text-rose-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead>
                                    <tr className="bg-gradient-to-r from-slate-50 to-white">
                                        <ThCell field="reservation_number" label="Ref #" />
                                        <ThCell field="guest_name" label="Guest" />
                                        <ThCell field="section" label="Section" />
                                        <ThCell field="type" label="Type" />
                                        <ThCell field="check_in" label="Check-In" />
                                        <ThCell field="check_out" label="Check-Out" />
                                        <ThCell field="adults_count" label="Pax" />
                                        <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sortedReservations.map((r, i) => (
                                        <motion.tr
                                            key={r.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.2, delay: i * 0.03 }}
                                            className="group transition-colors hover:bg-amber-50/40"
                                        >
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-xs font-bold text-amber-600">#{r.reservation_number}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{getGuestDisplayName(r)}</p>
                                                    {r.phone_number && <p className="text-xs text-slate-400">{r.phone_number}</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{getSectionLabel(r.section)}</td>
                                            <td className="px-4 py-3">
                                                {r.type === 'corporate' ? (
                                                    <MiniTag
                                                        icon={<Briefcase className="h-3 w-3" />}
                                                        label="Corporate"
                                                        color="bg-blue-50 text-blue-700"
                                                    />
                                                ) : (
                                                    <MiniTag
                                                        icon={<Sunset className="h-3 w-3" />}
                                                        label="Leisure"
                                                        color="bg-purple-50 text-purple-700"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.check_in)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(r.check_out)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                                    {r.adults_count ?? 0}
                                                    {(r.kids_count ?? 0) > 0 && (
                                                        <span className="ml-1 flex items-center gap-0.5 text-slate-400">
                                                            <Baby className="h-3.5 w-3.5" />
                                                            {r.kids_count}
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1">
                                                    {r.is_express_check_in && (
                                                        <MiniTag
                                                            icon={<Zap className="h-3 w-3" />}
                                                            label="Exp.In"
                                                            color="bg-amber-50 text-amber-700"
                                                        />
                                                    )}
                                                    {r.is_express_check_out && (
                                                        <MiniTag
                                                            icon={<LogOut className="h-3 w-3" />}
                                                            label="Exp.Out"
                                                            color="bg-violet-50 text-violet-700"
                                                        />
                                                    )}
                                                    {r.cleared_bills?.is_cleared && (
                                                        <MiniTag
                                                            icon={<Receipt className="h-3 w-3" />}
                                                            label="Bills"
                                                            color="bg-emerald-50 text-emerald-700"
                                                        />
                                                    )}
                                                    {r.cleared_by_house_keeping?.is_cleared && (
                                                        <MiniTag icon={<Sparkles className="h-3 w-3" />} label="HK" color="bg-sky-50 text-sky-700" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleView(r)}
                                                        title="View"
                                                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-amber-100 hover:text-amber-700"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(r)}
                                                        title="Edit"
                                                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-blue-100 hover:text-blue-700"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {user?.role === 'admin' && (
                                                        <button
                                                            onClick={() => handleDelete(r.id)}
                                                            title="Delete"
                                                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-100 hover:text-rose-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {lastPage > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                                <p className="text-sm text-slate-500">
                                    Page <span className="font-bold text-slate-700">{currentPage}</span> of{' '}
                                    <span className="font-bold text-slate-700">{lastPage}</span>
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => fetchReservations(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => fetchReservations(currentPage + 1)}
                                        disabled={currentPage === lastPage}
                                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            <AnimatePresence>
                {isDetailOpen && selectedReservation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setIsDetailOpen(false);
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.25 }}
                            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                            style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}
                        >
                            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white px-6 py-5">
                                <div>
                                    <p className="font-mono text-xs font-bold text-amber-500">#{selectedReservation.reservation_number}</p>
                                    <h2
                                        className="mt-0.5 text-xl font-black text-slate-900"
                                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                                    >
                                        {getGuestDisplayName(selectedReservation)}
                                    </h2>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {selectedReservation.type === 'corporate' ? (
                                            <MiniTag icon={<Briefcase className="h-3 w-3" />} label="Corporate" color="bg-blue-50 text-blue-700" />
                                        ) : (
                                            <MiniTag icon={<Sunset className="h-3 w-3" />} label="Leisure" color="bg-purple-50 text-purple-700" />
                                        )}
                                        {selectedReservation.is_express_check_in && (
                                            <MiniTag icon={<Zap className="h-3 w-3" />} label="Express Check-In" color="bg-amber-50 text-amber-700" />
                                        )}
                                        {selectedReservation.is_express_check_out && (
                                            <MiniTag
                                                icon={<LogOut className="h-3 w-3" />}
                                                label="Express Check-Out"
                                                color="bg-violet-50 text-violet-700"
                                            />
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsDetailOpen(false)}
                                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-0 px-6 py-4">
                                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase">Stay Duration</p>
                                    <div className="flex items-center gap-3">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-400">Check-In</p>
                                            <p className="font-bold text-slate-700">{formatDate(selectedReservation.check_in)}</p>
                                        </div>
                                        <div className="flex-1 text-center">
                                            {getNightCount(selectedReservation.check_in, selectedReservation.check_out) !== null && (
                                                <div className="rounded-lg bg-amber-100 px-3 py-1">
                                                    <p className="text-xs font-bold text-amber-700">
                                                        {getNightCount(selectedReservation.check_in, selectedReservation.check_out)} night(s)
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-slate-400">Check-Out</p>
                                            <p className="font-bold text-slate-700">{formatDate(selectedReservation.check_out)}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    <InfoRow label="Guest Name" icon={<UserCheck className="h-3.5 w-3.5" />} value={selectedReservation.guest_name} />
                                    <InfoRow
                                        label="Section"
                                        icon={<MapPin className="h-3.5 w-3.5" />}
                                        value={getSectionLabel(selectedReservation.section)}
                                    />
                                    <InfoRow
                                        label="Adults"
                                        icon={<Users className="h-3.5 w-3.5" />}
                                        value={selectedReservation.adults_count ?? '—'}
                                    />
                                    <InfoRow label="Kids" icon={<Baby className="h-3.5 w-3.5" />} value={selectedReservation.kids_count ?? '—'} />
                                    <InfoRow label="Phone" icon={<Phone className="h-3.5 w-3.5" />} value={selectedReservation.phone_number} />
                                    <InfoRow label="Car Plate" icon={<Car className="h-3.5 w-3.5" />} value={selectedReservation.car_plate_number} />
                                    {selectedReservation.contact && (
                                        <InfoRow
                                            label="Institution"
                                            icon={<Building2 className="h-3.5 w-3.5" />}
                                            value={selectedReservation.contact.institution}
                                        />
                                    )}
                                    {selectedReservation.contact_person && (
                                        <InfoRow
                                            label="Contact Person"
                                            icon={<UserCheck className="h-3.5 w-3.5" />}
                                            value={`${selectedReservation.contact_person.first_name || ''} ${selectedReservation.contact_person.last_name || ''}`.trim()}
                                        />
                                    )}
                                    {selectedReservation.checked_in_by_user && (
                                        <InfoRow
                                            label="Checked In By"
                                            icon={<Shield className="h-3.5 w-3.5" />}
                                            value={selectedReservation.checked_in_by_user.name}
                                        />
                                    )}
                                    {selectedReservation.dream_pass_code && (
                                        <InfoRow
                                            label="Dream Pass"
                                            icon={<Hash className="h-3.5 w-3.5" />}
                                            value={selectedReservation.dream_pass_code}
                                        />
                                    )}
                                    <InfoRow
                                        label="Entry Time"
                                        icon={<CalendarCheck className="h-3.5 w-3.5" />}
                                        value={formatDateTime(selectedReservation.entry_time)}
                                    />
                                    <InfoRow
                                        label="Exit Time"
                                        icon={<CalendarX className="h-3.5 w-3.5" />}
                                        value={formatDateTime(selectedReservation.exit_time)}
                                    />
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div
                                        className={`rounded-xl border p-4 ${selectedReservation.cleared_bills?.is_cleared ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Receipt
                                                    className={`h-4 w-4 ${selectedReservation.cleared_bills?.is_cleared ? 'text-emerald-600' : 'text-slate-400'}`}
                                                />
                                                <span className="text-sm font-bold text-slate-700">Bills</span>
                                            </div>
                                            {selectedReservation.cleared_bills?.is_cleared ? (
                                                <MiniTag
                                                    icon={<CheckCircle2 className="h-3 w-3" />}
                                                    label="Cleared"
                                                    color="bg-emerald-100 text-emerald-700"
                                                />
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400">Pending</span>
                                            )}
                                        </div>
                                        {selectedReservation.cleared_bills?.comments && (
                                            <p className="mt-2 text-xs text-slate-500">{selectedReservation.cleared_bills.comments}</p>
                                        )}
                                        {selectedReservation.cleared_bills_by_user && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                By: <span className="font-semibold">{selectedReservation.cleared_bills_by_user.name}</span>
                                            </p>
                                        )}
                                    </div>

                                    <div
                                        className={`rounded-xl border p-4 ${selectedReservation.cleared_by_house_keeping?.is_cleared ? 'border-sky-200 bg-sky-50' : 'border-slate-100 bg-slate-50'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Sparkles
                                                    className={`h-4 w-4 ${selectedReservation.cleared_by_house_keeping?.is_cleared ? 'text-sky-600' : 'text-slate-400'}`}
                                                />
                                                <span className="text-sm font-bold text-slate-700">Housekeeping</span>
                                            </div>
                                            {selectedReservation.cleared_by_house_keeping?.is_cleared ? (
                                                <MiniTag
                                                    icon={<CheckCircle2 className="h-3 w-3" />}
                                                    label="Cleared"
                                                    color="bg-sky-100 text-sky-700"
                                                />
                                            ) : (
                                                <span className="text-xs font-semibold text-slate-400">Pending</span>
                                            )}
                                        </div>
                                        {selectedReservation.cleared_by_house_keeping?.comments && (
                                            <p className="mt-2 text-xs text-slate-500">{selectedReservation.cleared_by_house_keeping.comments}</p>
                                        )}
                                        {selectedReservation.cleared_by_house_keeping_user && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                By: <span className="font-semibold">{selectedReservation.cleared_by_house_keeping_user.name}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <p className="mt-4 text-right text-xs text-slate-400">Created {formatDateTime(selectedReservation.created_at)}</p>
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                                <button
                                    onClick={() => {
                                        setIsDetailOpen(false);
                                        handleEdit(selectedReservation);
                                    }}
                                    className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => setIsDetailOpen(false)}
                                    className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:from-amber-500 hover:to-orange-600"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isDeleteModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                        >
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                                <AlertTriangle className="h-6 w-6 text-rose-600" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Delete Reservation?</h3>
                            <p className="mt-1 text-sm text-slate-500">This action cannot be undone. The reservation will be permanently removed.</p>
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setReservationToDelete(null);
                                    }}
                                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                                >
                                    {isDeleting ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                            className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                                        />
                                    ) : (
                                        <>
                                            <Trash2 className="h-4 w-4" /> Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ViewGuestReservations;
