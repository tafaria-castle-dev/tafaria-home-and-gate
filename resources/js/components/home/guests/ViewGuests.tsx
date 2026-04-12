import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Baby,
    BadgeCheck,
    Briefcase,
    Building2,
    Calendar,
    Car,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    Download,
    Filter,
    Hotel,
    LogOut,
    MapPin,
    MoreHorizontal,
    Phone,
    Receipt,
    RefreshCw,
    Search,
    Shield,
    Sparkles,
    Star,
    Timer,
    User,
    UserCheck,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import CreateDreamPass from '../dreamPasses/CreateDreamPass';
import { SECTIONS } from '../reservations/CreateReservation';

interface GuestReservation {
    id: string;
    guest_name: string;
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
    adults_count?: number;
    dream_pass_code?: string;
    is_express_check_in?: boolean;
    is_express_check_out?: boolean;
    type: 'corporate' | 'leisure';
    entry_type?: 'walk_in' | 'drive_in';
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
}

interface Aggregations {
    total: number;
    corporate: number;
    leisure: number;
    overdue: number;
    active: number;
    checked_out_today: number;
    avg_stay_hours: number;
    bills_pending: number;
    bills_cleared: number;
    housekeeping_pending: number;
    walk_in: number;
    drive_in: number;
    express: number;
    vip: number;
}

const getSectionLabel = (val: string) => SECTIONS.find((s) => s.value === val)?.label ?? val.replace(/_/g, ' ');
const getSectionIcon = (val: string) => SECTIONS.find((s) => s.value === val)?.icon ?? '📍';

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

const formatDuration = (hours?: number) => {
    if (!hours || hours <= 0) return '—';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return rem > 0 ? `${days}d ${rem.toFixed(0)}h` : `${days}d`;
};

const getHoursSpent = (entry?: string, exit?: string) => {
    if (!entry) return 0;
    const end = exit ? new Date(exit) : new Date();
    const diff = end.getTime() - new Date(entry).getTime();
    return Math.max(0, diff / (1000 * 60 * 60));
};

const getGuestDisplayName = (r: GuestReservation) =>
    r.contact?.institution || (r.contact_person ? `${r.contact_person.first_name} ${r.contact_person.last_name}`.trim() : null) || r.guest_name;

const getInitials = (name: string) =>
    name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

const isOverdue = (r: GuestReservation) => !r.exit_time && r.check_out && new Date(r.check_out).getTime() < Date.now();
const isCheckedIn = (r: GuestReservation) => !!r.entry_time && !r.exit_time;
const isVIP = (r: GuestReservation) => !!r.dream_pass_code || r.is_express_check_in;

export default function ViewGuests() {
    const [reservations, setReservations] = useState<GuestReservation[]>([]);
    const [aggregations, setAggregations] = useState<Aggregations | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [isFetching, setIsFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [sortField, setSortField] = useState<string>('entry_time');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [selectedGuest, setSelectedGuest] = useState<GuestReservation | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
    const [isClearBillsModalOpen, setIsClearBillsModalOpen] = useState(false);
    const [isHousekeepingModalOpen, setIsHousekeepingModalOpen] = useState(false);
    const [actionGuest, setActionGuest] = useState<GuestReservation | null>(null);
    const [billComment, setBillComment] = useState('');
    const [housekeepingComment, setHousekeepingComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeQuickFilter, setActiveQuickFilter] = useState<string>('checked_in');
    const [filters, setFilters] = useState<{
        section?: string;
        type?: string;
        status?: string;
        entry_type?: string;
        bills_status?: string;
        housekeeping_status?: string;
        dateField?: string;
        dateRange?: string;
        customStart?: string;
        customEnd?: string;
    }>({ status: 'checked_in' });
    const [tempFilters, setTempFilters] = useState<typeof filters>({ status: 'checked_in' });
    const [isDreamPassModalOpen, setIsDreamPassModalOpen] = useState(false);
    const [dreamPassGuest, setDreamPassGuest] = useState<GuestReservation | null>(null);
    const fetchReservations = useCallback(
        async (page = 1) => {
            setIsFetching(true);
            try {
                const params: Record<string, string> = { page: page.toString(), per_page: '25', has_entry: '1' };
                if (filters.section) params.section = filters.section;
                if (filters.type) params.type = filters.type;
                if (filters.status) params.status = filters.status;
                if (filters.entry_type) params.entry_type = filters.entry_type;
                if (filters.bills_status) params.bills_status = filters.bills_status;
                if (filters.housekeeping_status) params.housekeeping_status = filters.housekeeping_status;
                if (filters.dateField) params.dateField = filters.dateField;
                if (filters.dateRange) params.dateRange = filters.dateRange;
                if (filters.customStart) params.customStart = filters.customStart;
                if (filters.customEnd) params.customEnd = filters.customEnd;
                if (searchQuery.trim()) params.search = searchQuery.trim();

                const [resData, aggData] = await Promise.all([
                    axios.get('/api/guest-reservations', { params }),
                    axios.get('/api/guest-reservations/aggregations', { params }),
                ]);

                const data = resData.data;
                setReservations(data.data ?? data);
                setTotalCount(data.total ?? (data.data ?? data).length);
                setCurrentPage(data.current_page ?? 1);
                setLastPage(data.last_page ?? 1);
                setAggregations(aggData.data);
            } catch {
                toast.error('Failed to fetch guest reservations.');
            } finally {
                setIsFetching(false);
            }
        },
        [filters, searchQuery],
    );

    useEffect(() => {
        fetchReservations(1);
    }, [fetchReservations]);
    const handleOpenDreamPass = (r: GuestReservation) => {
        setDreamPassGuest(r);
        setIsDreamPassModalOpen(true);
    };
    const sortedReservations = useMemo(() => {
        return [...reservations].sort((a, b) => {
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
                case 'entry_time':
                    va = a.entry_time ?? '';
                    vb = b.entry_time ?? '';
                    break;
                case 'check_out':
                    va = a.check_out ?? '';
                    vb = b.check_out ?? '';
                    break;
                case 'duration':
                    va = getHoursSpent(a.entry_time, a.exit_time);
                    vb = getHoursSpent(b.entry_time, b.exit_time);
                    return sortDirection === 'asc' ? va - vb : vb - va;
                default:
                    return 0;
            }
            return sortDirection === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
    }, [reservations, sortField, sortDirection]);

    const handleSort = (field: string) => {
        if (sortField === field) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleViewGuest = (r: GuestReservation) => {
        setSelectedGuest(r);
        setIsPanelOpen(true);
    };

    const handleCheckOut = async () => {
        if (!actionGuest) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/guest-reservations/${actionGuest.id}/check-out`);
            toast.success('Guest checked out successfully.');
            fetchReservations(currentPage);
            setIsCheckOutModalOpen(false);
            if (selectedGuest?.id === actionGuest.id) setIsPanelOpen(false);
        } catch {
            toast.error('Failed to check out guest.');
        } finally {
            setIsSubmitting(false);
            setActionGuest(null);
        }
    };

    const handleClearBills = async () => {
        if (!actionGuest) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/guest-reservations/${actionGuest.id}`, {
                cleared_bills: { is_cleared: true, comments: billComment },
            });
            toast.success('Bills marked as cleared.');
            fetchReservations(currentPage);
            setIsClearBillsModalOpen(false);
            setBillComment('');
        } catch {
            toast.error('Failed to clear bills.');
        } finally {
            setIsSubmitting(false);
            setActionGuest(null);
        }
    };

    const handleClearHousekeeping = async () => {
        if (!actionGuest) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/guest-reservations/${actionGuest.id}`, {
                cleared_by_house_keeping: { is_cleared: true, comments: housekeepingComment },
            });
            toast.success('Housekeeping marked as cleared.');
            fetchReservations(currentPage);
            setIsHousekeepingModalOpen(false);
            setHousekeepingComment('');
        } catch {
            toast.error('Failed to update housekeeping.');
        } finally {
            setIsSubmitting(false);
            setActionGuest(null);
        }
    };

    const applyFilters = () => {
        setFilters(tempFilters);
        setIsFilterOpen(false);
        toast.success('Filters applied.');
    };

    const clearFilters = () => {
        const reset = { status: 'checked_in' };
        setFilters(reset);
        setTempFilters(reset);
        setActiveQuickFilter('checked_in');
        setIsFilterOpen(false);
    };

    const handleQuickFilter = (key: string, status: string) => {
        setActiveQuickFilter(key);
        const newFilters = { status };
        setFilters(newFilters);
        setTempFilters(newFilters);
    };

    const activeFilterCount = Object.values(filters).filter((v) => v && v !== 'checked_in').length;

    const SortIcon = ({ field }: { field: string }) =>
        sortField === field ? (
            sortDirection === 'asc' ? (
                <ArrowUp size={12} className="ml-1 opacity-80" />
            ) : (
                <ArrowDown size={12} className="ml-1 opacity-80" />
            )
        ) : (
            <ArrowDown size={12} className="ml-1 opacity-20" />
        );

    return (
        <div
            className="min-h-screen"
            style={{
                background: 'linear-gradient(135deg, #fdf8f3 0%, #f9f4ee 50%, #f5efe8 100%)',
                fontFamily: "'Cormorant Garamond', Georgia, serif",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
                .dm { font-family: 'DM Sans', sans-serif; }
                .brand-grad { background: linear-gradient(135deg, #902729, #b83a3c); }
                .gold-grad { background: linear-gradient(135deg, #93723c, #b8914d); }
                .stat-card { background: white; border-radius: 16px; border: 1px solid rgba(147,114,60,0.15); box-shadow: 0 2px 12px rgba(144,39,41,0.06); transition: all 0.2s; }
                .stat-card:hover { box-shadow: 0 8px 24px rgba(144,39,41,0.12); transform: translateY(-1px); }
                .guest-row { transition: background 0.15s; border-bottom: 1px solid rgba(147,114,60,0.08); }
                .guest-row:hover { background: rgba(147,114,60,0.04); }
                .filter-pill { border-radius: 100px; border: 1.5px solid rgba(147,114,60,0.25); background: white; transition: all 0.15s; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 6px 14px; color: #5a4a3a; }
                .filter-pill:hover { border-color: #93723c; color: #93723c; }
                .filter-pill.active { background: #93723c; border-color: #93723c; color: white; }
                .filter-pill.active-red { background: #902729; border-color: #902729; color: white; }
                .action-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; padding: 7px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: all 0.15s; cursor: pointer; border: none; }
                .btn-primary { background: linear-gradient(135deg, #902729, #b83a3c); color: white; }
                .btn-primary:hover { box-shadow: 0 4px 12px rgba(144,39,41,0.35); transform: translateY(-1px); }
                .btn-gold { background: linear-gradient(135deg, #93723c, #b8914d); color: white; }
                .btn-gold:hover { box-shadow: 0 4px 12px rgba(147,114,60,0.35); transform: translateY(-1px); }
                .btn-outline { background: white; color: #5a4a3a; border: 1.5px solid rgba(147,114,60,0.25); }
                .btn-outline:hover { border-color: #93723c; color: #93723c; }
                .side-panel { position: fixed; right: 0; top: 0; height: 100vh; width: 420px; background: white; box-shadow: -8px 0 40px rgba(0,0,0,0.12); z-index: 100; overflow-y: auto; border-left: 1px solid rgba(147,114,60,0.15); }
                .panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 99; backdrop-filter: blur(2px); }
                .input-styled { width: 100%; border-radius: 10px; border: 1.5px solid rgba(147,114,60,0.2); background: white; padding: 9px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #2d1f0e; outline: none; transition: border 0.15s; }
                .input-styled:focus { border-color: #93723c; box-shadow: 0 0 0 3px rgba(147,114,60,0.1); }
                .select-styled { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2393723c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .modal-box { background: white; border-radius: 20px; padding: 28px; width: 440px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
                .th-cell { padding: 12px 16px; text-align: left; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.85); cursor: pointer; user-select: none; white-space: nowrap; }
                .th-cell:hover { color: white; }
                .td-cell { padding: 14px 16px; vertical-align: middle; }
                .avatar { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 13px; flex-shrink: 0; }
                .badge-pill { display: inline-flex; align-items: center; border-radius: 100px; padding: 3px 10px; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }
                .scrollbar-thin::-webkit-scrollbar { width: 4px; } .scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(147,114,60,0.3); border-radius: 2px; }
                .stat-number { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; line-height: 1; }
                .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(147,114,60,0.08); }
                .info-label { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: #9a8060; }
                .info-value { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #2d1f0e; text-align: right; }
                .section-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 8px; background: rgba(147,114,60,0.08); font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; color: #6a5030; border: 1px solid rgba(147,114,60,0.15); }
                .dots-menu { position: relative; }
                .dots-dropdown { position: absolute; right: 0; top: calc(100% + 4px); background: white; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.14); border: 1px solid rgba(147,114,60,0.12); min-width: 180px; z-index: 50; overflow: hidden; }
                .dots-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #3d2c1a; cursor: pointer; transition: background 0.12s; border: none; background: none; width: 100%; text-align: left; }
                .dots-item:hover { background: rgba(147,114,60,0.06); }
                .dots-item.danger { color: #902729; }
                .dots-item.danger:hover { background: rgba(144,39,41,0.05); }
                .pag-btn { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid rgba(147,114,60,0.2); background: white; cursor: pointer; transition: all 0.15s; color: #6a5030; }
                .pag-btn:hover:not(:disabled) { border-color: #93723c; color: #93723c; }
                .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .pag-btn.active { background: #93723c; border-color: #93723c; color: white; }
                textarea.input-styled { resize: vertical; min-height: 80px; }
            `}</style>

            <div className="mx-auto max-w-[1600px] px-6 py-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 flex items-center gap-3">
                                <div className="brand-grad flex h-10 w-10 items-center justify-center rounded-xl">
                                    <Hotel size={20} color="white" />
                                </div>
                                <h1
                                    style={{
                                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                                        fontSize: 32,
                                        fontWeight: 700,
                                        color: '#1a0e06',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Guest Management
                                </h1>
                            </div>
                            <p className="dm ml-13 text-xl text-stone-500">Real-time tracking of guests on property</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="action-btn btn-outline" onClick={() => fetchReservations(currentPage)}>
                                <RefreshCw size={14} />
                                <span>Refresh</span>
                            </button>
                            <button className="action-btn btn-gold">
                                <Download size={14} />
                                <span>Export</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Aggregation Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.08 }}
                    className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8"
                >
                    {[
                        {
                            label: 'On Property',
                            value: aggregations?.active ?? totalCount,
                            icon: <Users size={16} />,
                            color: '#902729',
                            bg: 'rgba(144,39,41,0.07)',
                        },
                        {
                            label: 'Corporate',
                            value: aggregations?.corporate ?? 0,
                            icon: <Briefcase size={16} />,
                            color: '#1a5fa8',
                            bg: 'rgba(26,95,168,0.07)',
                        },
                        {
                            label: 'Leisure',
                            value: aggregations?.leisure ?? 0,
                            icon: <Sparkles size={16} />,
                            color: '#7c3aed',
                            bg: 'rgba(124,58,237,0.07)',
                        },
                        {
                            label: 'Overdue',
                            value: aggregations?.overdue ?? 0,
                            icon: <AlertTriangle size={16} />,
                            color: '#dc2626',
                            bg: 'rgba(220,38,38,0.07)',
                        },
                        {
                            label: 'Bills Pending',
                            value: aggregations?.bills_pending ?? 0,
                            icon: <Receipt size={16} />,
                            color: '#d97706',
                            bg: 'rgba(217,119,6,0.07)',
                        },
                        {
                            label: 'Bills Cleared',
                            value: aggregations?.bills_cleared ?? 0,
                            icon: <CheckCircle2 size={16} />,
                            color: '#059669',
                            bg: 'rgba(5,150,105,0.07)',
                        },
                        {
                            label: 'Avg Stay',
                            value: formatDuration(aggregations?.avg_stay_hours),
                            icon: <Timer size={16} />,
                            color: '#93723c',
                            bg: 'rgba(147,114,60,0.07)',
                            isText: true,
                        },
                        {
                            label: 'VIP Guests',
                            value: aggregations?.vip ?? 0,
                            icon: <Star size={16} />,
                            color: '#93723c',
                            bg: 'rgba(147,114,60,0.07)',
                        },
                    ].map((card, i) => (
                        <div key={i} className="stat-card flex flex-col gap-2 p-4">
                            <div className="flex items-center justify-between">
                                <span className="dm text-xs leading-tight font-semibold tracking-wider text-stone-400 uppercase">{card.label}</span>
                                <div style={{ color: card.color, background: card.bg, borderRadius: 8, padding: 5 }}>{card.icon}</div>
                            </div>
                            <div className="stat-number" style={{ fontSize: card.isText ? 20 : 28, color: card.color }}>
                                {card.value}
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Quick Filters */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mb-4 flex flex-wrap gap-2">
                    {[
                        { key: 'checked_in', label: 'Currently In', status: 'checked_in' },
                        { key: 'checked_out', label: 'Checked Out', status: 'checked_out' },
                        { key: 'overdue', label: '⚠ Overdue', status: 'overdue' },
                        { key: 'bills_pending', label: 'Bills Pending', status: 'checked_in', bills_status: 'pending' },
                        // { key: 'vip', label: '★ VIP ', status: 'vip' },
                        { key: 'all', label: 'All Guests', status: '' },
                    ].map((q) => (
                        <button
                            key={q.key}
                            onClick={() => handleQuickFilter(q.key, q.status)}
                            className={`filter-pill ${activeQuickFilter === q.key ? (q.key === 'overdue' ? 'active-red' : 'active') : ''}`}
                        >
                            {q.label}
                        </button>
                    ))}
                </motion.div>

                {/* Search + Filters Row */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-4 flex flex-col gap-3 sm:flex-row"
                >
                    <div className="relative max-w-lg flex-1">
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9a8060' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search guest name, reservation #, phone, car plate…"
                            className="input-styled"
                            style={{ paddingLeft: 36 }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#9a8060',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setIsFilterOpen((o) => !o)}
                        className={`filter-pill flex items-center gap-2 ${isFilterOpen || activeFilterCount > 0 ? 'active' : ''}`}
                    >
                        <Filter size={13} />
                        Advanced Filters
                        {activeFilterCount > 0 && (
                            <span
                                style={{
                                    background: 'white',
                                    color: '#93723c',
                                    borderRadius: '100px',
                                    minWidth: 18,
                                    height: 18,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px',
                                }}
                            >
                                {activeFilterCount}
                            </span>
                        )}
                        {isFilterOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                </motion.div>

                {/* Advanced Filter Panel */}
                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ overflow: 'hidden' }}
                            className="mb-5"
                        >
                            <div
                                style={{
                                    background: 'white',
                                    borderRadius: 16,
                                    border: '1.5px solid rgba(147,114,60,0.15)',
                                    padding: 20,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                                }}
                            >
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                    {[
                                        {
                                            label: 'Section',
                                            key: 'section',
                                            options: [['', 'All Sections'], ...SECTIONS.map((s) => [s.value, s.label])],
                                        },
                                        {
                                            label: 'Guest Type',
                                            key: 'type',
                                            options: [
                                                ['', 'All Types'],
                                                ['corporate', 'Corporate'],
                                                ['leisure', 'Leisure'],
                                            ],
                                        },
                                        {
                                            label: 'Entry Method',
                                            key: 'entry_type',
                                            options: [
                                                ['', 'All'],
                                                ['walk_in', 'Walk-In'],
                                                ['drive_in', 'Drive-In'],
                                            ],
                                        },
                                        {
                                            label: 'Bills Status',
                                            key: 'bills_status',
                                            options: [
                                                ['', 'All'],
                                                ['cleared', 'Cleared'],
                                                ['pending', 'Pending'],
                                            ],
                                        },
                                        {
                                            label: 'Housekeeping',
                                            key: 'housekeeping_status',
                                            options: [
                                                ['', 'All'],
                                                ['cleared', 'Cleared'],
                                                ['pending', 'Pending'],
                                            ],
                                        },
                                        {
                                            label: 'Date Field',
                                            key: 'dateField',
                                            options: [
                                                ['', 'None'],
                                                ['check_in', 'Check-In Date'],
                                                ['check_out', 'Check-Out Date'],
                                                ['entry_time', 'Entry Time'],
                                                ['created_at', 'Created At'],
                                            ],
                                        },
                                    ].map((f) => (
                                        <div key={f.key}>
                                            <label
                                                className="dm"
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    letterSpacing: '0.07em',
                                                    textTransform: 'uppercase',
                                                    color: '#9a8060',
                                                    display: 'block',
                                                    marginBottom: 6,
                                                }}
                                            >
                                                {f.label}
                                            </label>
                                            <select
                                                value={(tempFilters as any)[f.key] ?? ''}
                                                onChange={(e) => setTempFilters((p) => ({ ...p, [f.key]: e.target.value || undefined }))}
                                                className="input-styled select-styled"
                                            >
                                                {f.options.map(([val, lbl]) => (
                                                    <option key={val} value={val}>
                                                        {lbl}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                    {tempFilters.dateField && (
                                        <>
                                            <div>
                                                <label
                                                    className="dm"
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        letterSpacing: '0.07em',
                                                        textTransform: 'uppercase',
                                                        color: '#9a8060',
                                                        display: 'block',
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    Date Range
                                                </label>
                                                <select
                                                    value={tempFilters.dateRange ?? ''}
                                                    onChange={(e) => setTempFilters((p) => ({ ...p, dateRange: e.target.value || undefined }))}
                                                    className="input-styled select-styled"
                                                >
                                                    <option value="">Preset Ranges</option>
                                                    <option value="today">Today</option>
                                                    <option value="yesterday">Yesterday</option>
                                                    <option value="thisWeek">This Week</option>
                                                    <option value="last7Days">Last 7 Days</option>
                                                    <option value="last30Days">Last 30 Days</option>
                                                    <option value="last3Months">Last 3 Months</option>
                                                    <option value="last6Months">Last 6 Months</option>
                                                    <option value="lastYear">Last Year</option>
                                                    <option value="custom">Custom Range</option>
                                                </select>
                                            </div>
                                            {tempFilters.dateRange === 'custom' && (
                                                <div className="col-span-2">
                                                    <label
                                                        className="dm"
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            letterSpacing: '0.07em',
                                                            textTransform: 'uppercase',
                                                            color: '#9a8060',
                                                            display: 'block',
                                                            marginBottom: 6,
                                                        }}
                                                    >
                                                        Custom Range
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="date"
                                                            value={tempFilters.customStart ?? ''}
                                                            onChange={(e) => setTempFilters((p) => ({ ...p, customStart: e.target.value }))}
                                                            className="input-styled flex-1"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={tempFilters.customEnd ?? ''}
                                                            onChange={(e) => setTempFilters((p) => ({ ...p, customEnd: e.target.value }))}
                                                            className="input-styled flex-1"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="mt-5 flex justify-end gap-3">
                                    <button className="action-btn btn-outline" onClick={clearFilters}>
                                        Clear All
                                    </button>
                                    <button className="action-btn btn-gold" onClick={applyFilters}>
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    style={{
                        background: 'white',
                        borderRadius: 16,
                        border: '1px solid rgba(147,114,60,0.12)',
                        overflow: 'hidden',
                        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
                    }}
                >
                    {isFetching ? (
                        <div className="flex items-center justify-center" style={{ minHeight: 280 }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    border: '3px solid rgba(147,114,60,0.2)',
                                    borderTopColor: '#93723c',
                                }}
                            />
                        </div>
                    ) : sortedReservations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: 280, color: '#c4a87a' }}>
                            <Users size={40} opacity={0.3} />
                            <p className="dm text-sm font-medium" style={{ color: '#c4a87a' }}>
                                No guests match the current filters
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'linear-gradient(135deg, #902729, #7a2124)' }}>
                                        {[
                                            { field: 'guest_name', label: 'Guest' },
                                            { field: 'type', label: 'Type' },
                                            { field: 'section', label: 'Section' },
                                            { field: null, label: 'Party' },
                                            { field: 'entry_time', label: 'Entry' },
                                            { field: 'check_out', label: 'Check-Out' },
                                            { field: 'duration', label: 'Duration' },
                                            { field: 'dream_passes', label: 'Dream Passes' },
                                            { field: null, label: 'Bills' },
                                            { field: null, label: 'HK' },
                                            { field: null, label: '' },
                                        ].map((col, i) => (
                                            <th
                                                key={i}
                                                className="th-cell"
                                                onClick={() => col.field && handleSort(col.field)}
                                                style={{ cursor: col.field ? 'pointer' : 'default' }}
                                            >
                                                <div className="flex items-center">
                                                    {col.label}
                                                    {col.field && <SortIcon field={col.field} />}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedReservations.map((r, idx) => (
                                        <GuestRow
                                            key={r.id}
                                            r={r}
                                            idx={idx}
                                            onView={() => handleViewGuest(r)}
                                            onCheckOut={() => {
                                                setActionGuest(r);
                                                setIsCheckOutModalOpen(true);
                                            }}
                                            onClearBills={() => {
                                                setActionGuest(r);
                                                setIsClearBillsModalOpen(true);
                                            }}
                                            onClearHousekeeping={() => {
                                                setActionGuest(r);
                                                setIsHousekeepingModalOpen(true);
                                            }}
                                            handleOpenDreamPass={handleOpenDreamPass}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!isFetching && lastPage > 1 && (
                        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid rgba(147,114,60,0.1)' }}>
                            <span className="dm text-xs text-stone-400">
                                Page <strong>{currentPage}</strong> of <strong>{lastPage}</strong> &bull; <strong>{totalCount}</strong> records
                            </span>
                            <div className="flex gap-1">
                                <button className="pag-btn" disabled={currentPage <= 1} onClick={() => fetchReservations(currentPage - 1)}>
                                    <ChevronLeft size={14} />
                                </button>
                                {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                                    const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                                    if (page < 1 || page > lastPage) return null;
                                    return (
                                        <button
                                            key={page}
                                            className={`pag-btn dm text-xs font-semibold ${page === currentPage ? 'active' : ''}`}
                                            onClick={() => fetchReservations(page)}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                                <button className="pag-btn" disabled={currentPage >= lastPage} onClick={() => fetchReservations(currentPage + 1)}>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Guest Detail Side Panel */}
            <AnimatePresence>
                {isPanelOpen && selectedGuest && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="panel-overlay"
                            onClick={() => setIsPanelOpen(false)}
                        />
                        <motion.div
                            initial={{ x: 420 }}
                            animate={{ x: 0 }}
                            exit={{ x: 420 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="side-panel scrollbar-thin"
                        >
                            <GuestDetailPanel
                                guest={selectedGuest}
                                onClose={() => setIsPanelOpen(false)}
                                onCheckOut={() => {
                                    setActionGuest(selectedGuest);
                                    setIsCheckOutModalOpen(true);
                                }}
                                onClearBills={() => {
                                    setActionGuest(selectedGuest);
                                    setIsClearBillsModalOpen(true);
                                }}
                                onClearHousekeeping={() => {
                                    setActionGuest(selectedGuest);
                                    setIsHousekeepingModalOpen(true);
                                }}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Check-Out Modal */}
            <AnimatePresence>
                {isCheckOutModalOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal-box" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
                            <div className="mb-5 flex items-center gap-3">
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: 'rgba(144,39,41,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <LogOut size={20} color="#902729" />
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#1a0e06' }}>
                                        Check Out Guest
                                    </h3>
                                    <p className="dm text-xs text-stone-400">This action will record the exit time</p>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(147,114,60,0.06)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                                <p className="dm text-sm font-semibold" style={{ color: '#3d2c1a' }}>
                                    {actionGuest ? getGuestDisplayName(actionGuest) : ''}
                                </p>
                                <p className="dm mt-0.5 text-xs text-stone-400">Reservation #{actionGuest?.reservation_number}</p>
                            </div>
                            {actionGuest && !actionGuest.cleared_bills?.is_cleared && (
                                <div
                                    style={{
                                        background: 'rgba(217,119,6,0.08)',
                                        border: '1px solid rgba(217,119,6,0.2)',
                                        borderRadius: 10,
                                        padding: '10px 14px',
                                        marginBottom: 18,
                                        display: 'flex',
                                        gap: 10,
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <p className="dm text-xs font-medium" style={{ color: '#92400e' }}>
                                        Bills have not been cleared for this guest. Please ensure settlement before check-out.
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button className="action-btn btn-outline flex-1 justify-center" onClick={() => setIsCheckOutModalOpen(false)}>
                                    Cancel
                                </button>
                                <button className="action-btn btn-primary flex-1 justify-center" onClick={handleCheckOut} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                            style={{
                                                width: 14,
                                                height: 14,
                                                border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: 'white',
                                                borderRadius: '50%',
                                            }}
                                        />
                                    ) : (
                                        <LogOut size={14} />
                                    )}
                                    Confirm Check-Out
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clear Bills Modal */}
            <AnimatePresence>
                {isClearBillsModalOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal-box" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
                            <div className="mb-5 flex items-center gap-3">
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: 'rgba(5,150,105,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Receipt size={20} color="#059669" />
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#1a0e06' }}>
                                        Clear Bills
                                    </h3>
                                    <p className="dm text-xs text-stone-400">{actionGuest ? getGuestDisplayName(actionGuest) : ''}</p>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label
                                    className="dm"
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        letterSpacing: '0.07em',
                                        textTransform: 'uppercase',
                                        color: '#9a8060',
                                        display: 'block',
                                        marginBottom: 6,
                                    }}
                                >
                                    Comments (optional)
                                </label>
                                <textarea
                                    value={billComment}
                                    onChange={(e) => setBillComment(e.target.value)}
                                    placeholder="Settlement notes, payment method, reference…"
                                    className="input-styled"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    className="action-btn btn-outline flex-1 justify-center"
                                    onClick={() => {
                                        setIsClearBillsModalOpen(false);
                                        setBillComment('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="action-btn flex-1 justify-center"
                                    style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: 'white' }}
                                    onClick={handleClearBills}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        '…'
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} /> Mark as Cleared
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Housekeeping Modal */}
            <AnimatePresence>
                {isHousekeepingModalOpen && (
                    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div className="modal-box" initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}>
                            <div className="mb-5 flex items-center gap-3">
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        background: 'rgba(147,114,60,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Shield size={20} color="#93723c" />
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#1a0e06' }}>
                                        Housekeeping Clearance
                                    </h3>
                                    <p className="dm text-xs text-stone-400">{actionGuest ? getGuestDisplayName(actionGuest) : ''}</p>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label
                                    className="dm"
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        letterSpacing: '0.07em',
                                        textTransform: 'uppercase',
                                        color: '#9a8060',
                                        display: 'block',
                                        marginBottom: 6,
                                    }}
                                >
                                    Housekeeping Notes
                                </label>
                                <textarea
                                    value={housekeepingComment}
                                    onChange={(e) => setHousekeepingComment(e.target.value)}
                                    placeholder="Room condition, items returned, remarks…"
                                    className="input-styled"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    className="action-btn btn-outline flex-1 justify-center"
                                    onClick={() => {
                                        setIsHousekeepingModalOpen(false);
                                        setHousekeepingComment('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="action-btn btn-gold flex-1 justify-center"
                                    onClick={handleClearHousekeeping}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        '…'
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} /> Mark Cleared
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {isDreamPassModalOpen && dreamPassGuest && (
                <div
                    className="modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsDreamPassModalOpen(false);
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        style={{
                            background: 'white',
                            borderRadius: 20,
                            maxWidth: 900,
                            maxHeight: '90vh',
                            overflowY: 'auto',
                        }}
                    >
                        <CreateDreamPass
                            activeTab="create"
                            setActiveTab={() => {}}
                            onClose={() => setIsDreamPassModalOpen(false)}
                            prefillData={{
                                reservationNumber: dreamPassGuest.reservation_number,
                                checkIn: dreamPassGuest.check_in ?? undefined,
                                checkOut: dreamPassGuest.check_out ?? undefined,
                                guestName: getGuestDisplayName(dreamPassGuest),
                            }}
                        />
                    </motion.div>
                </div>
            )}
        </div>
    );
}

function GuestRow({
    r,
    idx,
    onView,
    onCheckOut,
    onClearBills,
    onClearHousekeeping,
    handleOpenDreamPass,
}: {
    r: GuestReservation;
    idx: number;
    onView: () => void;
    onCheckOut: () => void;
    onClearBills: () => void;
    onClearHousekeeping: () => void;
    handleOpenDreamPass: (r: GuestReservation) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const overdue = isOverdue(r);
    const vip = isVIP(r);
    const name = getGuestDisplayName(r);
    const duration = getHoursSpent(r.entry_time, r.exit_time);
    const typeColor =
        r.type === 'corporate'
            ? { bg: 'rgba(26,95,168,0.08)', color: '#1a5fa8', border: 'rgba(26,95,168,0.18)' }
            : { bg: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: 'rgba(124,58,237,0.18)' };
    const avatarColor = r.type === 'corporate' ? { bg: 'rgba(144,39,41,0.08)', color: '#902729' } : { bg: 'rgba(147,114,60,0.1)', color: '#93723c' };

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <motion.tr
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.025 }}
            className="guest-row"
            style={{ background: overdue ? 'rgba(220,38,38,0.025)' : undefined }}
        >
            <td className="td-cell">
                <div className="flex items-center gap-3">
                    <div className="avatar" style={{ background: avatarColor.bg, color: avatarColor.color }}>
                        {vip ? <Star size={16} /> : getInitials(name)}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="dm text-sm font-semibold" style={{ color: '#1a0e06' }}>
                                {name}
                            </span>
                            {vip && <span style={{ fontSize: 10, color: '#93723c', fontWeight: 700 }}>VIP</span>}
                        </div>
                        <p className="dm text-xs" style={{ color: '#9a8060' }}>
                            #{r.reservation_number}
                        </p>

                        {r.phone_number && (
                            <p className="dm text-xs" style={{ color: '#b0957a' }}>
                                {r.phone_number}
                            </p>
                        )}
                    </div>
                </div>
            </td>
            <td className="td-cell">
                <span className="badge-pill" style={{ background: typeColor.bg, color: typeColor.color, border: `1px solid ${typeColor.border}` }}>
                    {r.type === 'corporate' ? <Briefcase size={10} className="mr-1" /> : <Sparkles size={10} className="mr-1" />}
                    {r.type.toUpperCase()}
                </span>
            </td>
            <td className="td-cell">
                <span className="section-tag">
                    {getSectionIcon(r.section)} {getSectionLabel(r.section)}
                </span>
            </td>
            <td className="td-cell">
                <div className="dm text-sm" style={{ color: '#3d2c1a' }}>
                    <span className="font-semibold">{(r.adults_count ?? 0) + (r.kids_count ?? 0)}</span>
                    <span style={{ color: '#9a8060' }}> pax</span>
                </div>
                {(r.kids_count ?? 0) > 0 && (
                    <div className="mt-0.5 flex items-center gap-1">
                        <Baby size={10} color="#93723c" />
                        <span className="dm text-xs" style={{ color: '#9a8060' }}>
                            {r.kids_count} child
                        </span>
                    </div>
                )}
            </td>
            <td className="td-cell">
                <span className="dm text-sm" style={{ color: '#3d2c1a' }}>
                    {formatDateTime(r.entry_time)}
                </span>
                {r.is_express_check_in && (
                    <div className="mt-0.5 flex items-center gap-1">
                        <Zap size={10} color="#93723c" />
                        <span className="dm text-xs font-semibold" style={{ color: '#93723c' }}>
                            Express
                        </span>
                    </div>
                )}
                {r.entry_type === 'drive_in' && r.car_plate_number && (
                    <div className="mt-0.5 flex items-center gap-1">
                        <Car size={10} color="#9a8060" />
                        <span className="dm text-xs" style={{ color: '#9a8060' }}>
                            {r.car_plate_number}
                        </span>
                    </div>
                )}
            </td>
            <td className="td-cell">
                <div style={{ color: overdue ? '#dc2626' : '#3d2c1a' }} className="dm text-sm">
                    {formatDate(r.check_out)}
                    {overdue && (
                        <div className="mt-0.5 flex items-center gap-1">
                            <AlertTriangle size={10} color="#dc2626" />
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626' }}>OVERDUE</span>
                        </div>
                    )}
                    {r.exit_time && <div className="dm text-xs text-stone-400">Out: {formatDateTime(r.exit_time)}</div>}
                </div>
            </td>
            <td className="td-cell">
                <div className="flex items-center gap-1.5">
                    <Clock size={12} color="#93723c" />
                    <span className="dm text-sm font-semibold" style={{ color: '#3d2c1a' }}>
                        {formatDuration(duration)}
                    </span>
                </div>
            </td>
            <td className="td-cell">
                <div className="flex items-center gap-1.5">
                    <button
                        className="flex items-center gap-1 rounded-md bg-[#902729] px-2 py-1 text-xs text-white"
                        onClick={() => {
                            handleOpenDreamPass(r);
                        }}
                    >
                        Create DreamPass
                    </button>
                </div>
            </td>
            <td className="td-cell">
                {r.cleared_bills?.is_cleared ? (
                    <span
                        className="badge-pill"
                        style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}
                    >
                        <CheckCircle2 size={10} className="mr-1" />
                        CLEARED
                    </span>
                ) : (
                    <span
                        className="badge-pill"
                        style={{ background: 'rgba(217,119,6,0.08)', color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' }}
                    >
                        <Receipt size={10} className="mr-1" />
                        PENDING
                    </span>
                )}
            </td>
            <td className="td-cell">
                {r.cleared_by_house_keeping?.is_cleared ? (
                    <span
                        className="badge-pill"
                        style={{ background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)' }}
                    >
                        <BadgeCheck size={10} className="mr-1" />
                        OK
                    </span>
                ) : (
                    <span
                        className="badge-pill"
                        style={{ background: 'rgba(147,114,60,0.08)', color: '#93723c', border: '1px solid rgba(147,114,60,0.2)' }}
                    >
                        <Shield size={10} className="mr-1" />
                        PEND
                    </span>
                )}
            </td>
            <td className="td-cell">
                <div className="dots-menu" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((o) => !o)}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1.5px solid rgba(147,114,60,0.2)',
                            background: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9a8060',
                        }}
                    >
                        <MoreHorizontal size={15} />
                    </button>
                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                className="dots-dropdown"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                            >
                                <button
                                    className="dots-item"
                                    onClick={() => {
                                        onView();
                                        setMenuOpen(false);
                                    }}
                                >
                                    <User size={14} color="#93723c" />
                                    View Profile
                                </button>
                                {!r.cleared_bills?.is_cleared && (
                                    <button
                                        className="dots-item"
                                        onClick={() => {
                                            onClearBills();
                                            setMenuOpen(false);
                                        }}
                                    >
                                        <Receipt size={14} color="#d97706" />
                                        Clear Bills
                                    </button>
                                )}
                                {!r.cleared_by_house_keeping?.is_cleared && (
                                    <button
                                        className="dots-item"
                                        onClick={() => {
                                            onClearHousekeeping();
                                            setMenuOpen(false);
                                        }}
                                    >
                                        <Shield size={14} color="#93723c" />
                                        Housekeeping
                                    </button>
                                )}
                                {!r.exit_time && (
                                    <button
                                        className="dots-item danger"
                                        onClick={() => {
                                            onCheckOut();
                                            setMenuOpen(false);
                                        }}
                                    >
                                        <LogOut size={14} />
                                        Check Out
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </td>
        </motion.tr>
    );
}

function GuestDetailPanel({
    guest,
    onClose,
    onCheckOut,
    onClearBills,
    onClearHousekeeping,
}: {
    guest: GuestReservation;
    onClose: () => void;
    onCheckOut: () => void;
    onClearBills: () => void;
    onClearHousekeeping: () => void;
}) {
    const name = getGuestDisplayName(guest);
    const duration = getHoursSpent(guest.entry_time, guest.exit_time);
    const overdue = isOverdue(guest);
    const vip = isVIP(guest);
    const totalPax = (guest.adults_count ?? 0) + (guest.kids_count ?? 0);
    const stayNights =
        guest.check_in && guest.check_out
            ? Math.ceil((new Date(guest.check_out).getTime() - new Date(guest.check_in).getTime()) / (1000 * 60 * 60 * 24))
            : null;

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {/* Panel Header */}
            <div style={{ background: 'linear-gradient(135deg, #902729, #7a2124)', padding: '24px 20px 20px' }}>
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 16,
                                background: 'rgba(255,255,255,0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 20,
                                fontWeight: 700,
                                color: 'white',
                                fontFamily: "'DM Sans', sans-serif",
                            }}
                        >
                            {vip ? <Star size={22} color="gold" /> : getInitials(name)}
                        </div>
                        <div>
                            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>
                                {name}
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 }}>#{guest.reservation_number}</p>
                            {vip && <span style={{ fontSize: 10, fontWeight: 700, color: '#ffd700', letterSpacing: '0.1em' }}>★ VIP GUEST</span>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                    {guest.exit_time ? (
                        <span
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                color: 'white',
                                borderRadius: 100,
                                padding: '4px 12px',
                                fontSize: 11,
                                fontWeight: 700,
                            }}
                        >
                            CHECKED OUT
                        </span>
                    ) : overdue ? (
                        <span
                            style={{ background: '#dc2626', color: 'white', borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}
                        >
                            ⚠ OVERDUE
                        </span>
                    ) : (
                        <span
                            style={{
                                background: 'rgba(34,197,94,0.3)',
                                color: '#4ade80',
                                borderRadius: 100,
                                padding: '4px 12px',
                                fontSize: 11,
                                fontWeight: 700,
                            }}
                        >
                            ● ON PROPERTY
                        </span>
                    )}
                    <span
                        style={{
                            background: 'rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.85)',
                            borderRadius: 100,
                            padding: '4px 12px',
                            fontSize: 11,
                            fontWeight: 600,
                        }}
                    >
                        {guest.type.toUpperCase()}
                    </span>
                    {guest.is_express_check_in && (
                        <span
                            style={{
                                background: 'rgba(255,215,0,0.25)',
                                color: '#ffd700',
                                borderRadius: 100,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                            }}
                        >
                            ⚡ EXPRESS
                        </span>
                    )}
                </div>
            </div>

            {/* Quick stats */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 1,
                    background: 'rgba(147,114,60,0.1)',
                    borderBottom: '1px solid rgba(147,114,60,0.12)',
                }}
            >
                {[
                    { label: 'Time on Property', value: formatDuration(duration), icon: <Clock size={14} /> },
                    { label: 'Party Size', value: `${totalPax} pax`, icon: <Users size={14} /> },
                    {
                        label: stayNights ? 'Planned Stay' : 'Section',
                        value: stayNights ? `${stayNights} night${stayNights > 1 ? 's' : ''}` : getSectionLabel(guest.section),
                        icon: stayNights ? <Calendar size={14} /> : <MapPin size={14} />,
                    },
                ].map((s, i) => (
                    <div key={i} style={{ background: 'white', padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ color: '#93723c', display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: '#902729' }}>{s.value}</div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#9a8060',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginTop: 2,
                            }}
                        >
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ padding: '20px' }}>
                {/* Action Buttons */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {!guest.exit_time && (
                        <button className="action-btn btn-primary flex-1 justify-center" onClick={onCheckOut}>
                            <LogOut size={13} />
                            Check Out
                        </button>
                    )}
                    {!guest.cleared_bills?.is_cleared && (
                        <button className="action-btn btn-gold flex-1 justify-center" onClick={onClearBills}>
                            <Receipt size={13} />
                            Clear Bills
                        </button>
                    )}
                    {!guest.cleared_by_house_keeping?.is_cleared && (
                        <button className="action-btn btn-outline flex-1 justify-center" onClick={onClearHousekeeping}>
                            <Shield size={13} />
                            Housekeeping
                        </button>
                    )}
                </div>

                {/* Guest Info */}
                <div style={{ marginBottom: 20 }}>
                    <h4
                        style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 16,
                            fontWeight: 700,
                            color: '#1a0e06',
                            marginBottom: 12,
                            paddingBottom: 8,
                            borderBottom: '2px solid rgba(147,114,60,0.15)',
                        }}
                    >
                        Guest Information
                    </h4>
                    <div>
                        {[
                            { label: 'Full Name', value: name, icon: <User size={13} /> },
                            guest.contact?.institution && { label: 'Institution', value: guest.contact.institution, icon: <Building2 size={13} /> },
                            guest.contact_person?.email && { label: 'Email', value: guest.contact_person.email, icon: <Phone size={13} /> },
                            guest.phone_number && { label: 'Phone', value: guest.phone_number, icon: <Phone size={13} /> },
                            { label: 'Type', value: guest.type.charAt(0).toUpperCase() + guest.type.slice(1), icon: <Briefcase size={13} /> },
                            { label: 'Entry Method', value: guest.entry_type?.replace(/_/g, ' ') ?? '—', icon: <UserCheck size={13} /> },
                            guest.car_plate_number && { label: 'Vehicle', value: guest.car_plate_number, icon: <Car size={13} /> },
                            guest.dream_pass_code && { label: 'DreamPass Code', value: guest.dream_pass_code, icon: <Star size={13} /> },
                        ]
                            .filter(Boolean)
                            .map((row: any, i) => (
                                <div key={i} className="info-row">
                                    <span className="info-label flex items-center gap-1.5">
                                        <span style={{ color: '#93723c' }}>{row.icon}</span>
                                        {row.label}
                                    </span>
                                    <span className="info-value">{row.value}</span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Visit Timeline */}
                <div style={{ marginBottom: 20 }}>
                    <h4
                        style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 16,
                            fontWeight: 700,
                            color: '#1a0e06',
                            marginBottom: 12,
                            paddingBottom: 8,
                            borderBottom: '2px solid rgba(147,114,60,0.15)',
                        }}
                    >
                        Visit Timeline
                    </h4>
                    <div style={{ position: 'relative', paddingLeft: 20 }}>
                        <div
                            style={{
                                position: 'absolute',
                                left: 7,
                                top: 8,
                                bottom: 8,
                                width: 2,
                                background: 'linear-gradient(to bottom, #902729, #93723c, rgba(147,114,60,0.2))',
                            }}
                        />
                        {[
                            guest.check_in && { time: formatDateTime(guest.check_in), label: 'Scheduled Check-In', color: '#1a5fa8', dot: '#1a5fa8' },
                            guest.entry_time && {
                                time: formatDateTime(guest.entry_time),
                                label: `Arrived${guest.is_express_check_in ? ' (Express)' : ''}`,
                                color: '#059669',
                                dot: '#059669',
                            },
                            !guest.exit_time &&
                                overdue && {
                                    time: formatDate(guest.check_out),
                                    label: 'Scheduled Check-Out (Overdue)',
                                    color: '#dc2626',
                                    dot: '#dc2626',
                                },
                            !guest.exit_time &&
                                !overdue &&
                                guest.check_out && {
                                    time: formatDate(guest.check_out),
                                    label: 'Scheduled Check-Out',
                                    color: '#d97706',
                                    dot: '#d97706',
                                },
                            guest.exit_time && { time: formatDateTime(guest.exit_time), label: 'Checked Out', color: '#6b7280', dot: '#6b7280' },
                        ]
                            .filter(Boolean)
                            .map((evt: any, i) => (
                                <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 14, paddingLeft: 14, position: 'relative' }}>
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: -6,
                                            top: 5,
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            background: evt.dot,
                                            border: '2px solid white',
                                            boxShadow: '0 0 0 2px ' + evt.dot + '30',
                                        }}
                                    />
                                    <div>
                                        <p style={{ fontSize: 12, fontWeight: 600, color: evt.color }}>{evt.label}</p>
                                        <p style={{ fontSize: 11, color: '#9a8060', marginTop: 1 }}>{evt.time}</p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Party Details */}
                <div style={{ marginBottom: 20 }}>
                    <h4
                        style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 16,
                            fontWeight: 700,
                            color: '#1a0e06',
                            marginBottom: 12,
                            paddingBottom: 8,
                            borderBottom: '2px solid rgba(147,114,60,0.15)',
                        }}
                    >
                        Party &amp; Location
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Adults', value: guest.adults_count ?? 0, icon: <User size={13} /> },
                            { label: 'Children', value: guest.kids_count ?? 0, icon: <Baby size={13} /> },
                            { label: 'Total', value: totalPax, icon: <Users size={13} /> },
                            { label: 'Section', value: getSectionLabel(guest.section), icon: <MapPin size={13} /> },
                        ].map((s, i) => (
                            <div
                                key={i}
                                style={{
                                    background: 'rgba(147,114,60,0.05)',
                                    borderRadius: 10,
                                    padding: '10px 12px',
                                    border: '1px solid rgba(147,114,60,0.1)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#93723c', marginBottom: 4 }}>
                                    {s.icon}
                                    <span
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.07em',
                                            color: '#9a8060',
                                        }}
                                    >
                                        {s.label}
                                    </span>
                                </div>
                                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#902729' }}>
                                    {s.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Clearance Status */}
                <div style={{ marginBottom: 20 }}>
                    <h4
                        style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 16,
                            fontWeight: 700,
                            color: '#1a0e06',
                            marginBottom: 12,
                            paddingBottom: 8,
                            borderBottom: '2px solid rgba(147,114,60,0.15)',
                        }}
                    >
                        Clearance Status
                    </h4>
                    {[
                        {
                            title: 'Billing',
                            cleared: guest.cleared_bills?.is_cleared,
                            comments: guest.cleared_bills?.comments,
                            clearedBy: guest.cleared_bills_by_user?.name,
                            icon: <Receipt size={15} />,
                        },
                        {
                            title: 'Housekeeping',
                            cleared: guest.cleared_by_house_keeping?.is_cleared,
                            comments: guest.cleared_by_house_keeping?.comments,
                            clearedBy: guest.cleared_by_house_keeping_user?.name,
                            icon: <Shield size={15} />,
                        },
                    ].map((s, i) => (
                        <div
                            key={i}
                            style={{
                                background: s.cleared ? 'rgba(5,150,105,0.05)' : 'rgba(217,119,6,0.05)',
                                border: `1px solid ${s.cleared ? 'rgba(5,150,105,0.18)' : 'rgba(217,119,6,0.18)'}`,
                                borderRadius: 12,
                                padding: '12px 14px',
                                marginBottom: 10,
                            }}
                        >
                            <div className="mb-1 flex items-center justify-between">
                                <div className="flex items-center gap-2" style={{ color: s.cleared ? '#059669' : '#d97706' }}>
                                    {s.icon}
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</span>
                                </div>
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: s.cleared ? '#059669' : '#d97706',
                                        background: s.cleared ? 'rgba(5,150,105,0.1)' : 'rgba(217,119,6,0.1)',
                                        borderRadius: 100,
                                        padding: '2px 8px',
                                    }}
                                >
                                    {s.cleared ? 'CLEARED' : 'PENDING'}
                                </span>
                            </div>
                            {s.clearedBy && <p style={{ fontSize: 11, color: '#9a8060' }}>By: {s.clearedBy}</p>}
                            {s.comments && <p style={{ fontSize: 11, color: '#6a5030', marginTop: 4, fontStyle: 'italic' }}>"{s.comments}"</p>}
                        </div>
                    ))}
                </div>
                {guest.checked_in_by_user && (
                    <div>
                        <h4
                            style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#1a0e06',
                                marginBottom: 12,
                                paddingBottom: 8,
                                borderBottom: '2px solid rgba(147,114,60,0.15)',
                            }}
                        >
                            Staff
                        </h4>
                        <div className="info-row">
                            <span className="info-label flex items-center gap-1.5">
                                <UserCheck size={13} style={{ color: '#93723c' }} />
                                Checked In By
                            </span>
                            <span className="info-value">{guest.checked_in_by_user.name}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Reservation Created</span>
                            <span className="info-value">{formatDateTime(guest.created_at)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
