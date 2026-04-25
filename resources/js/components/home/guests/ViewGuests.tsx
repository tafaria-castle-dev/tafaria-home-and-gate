import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    Baby,
    Briefcase,
    Building2,
    Calendar,
    Car,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Download,
    Eye,
    Filter,
    History,
    Hotel,
    LogOut,
    MapPin,
    Phone,
    Receipt,
    RefreshCw,
    Search,
    Shield,
    Sparkles,
    Star,
    User,
    UserCheck,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import CreateDreamPass from '../dreamPasses/CreateDreamPass';
import DreamPassDetailsModal, { DreamPass } from '../dreamPasses/DreamPassDetailsModal';
import { SECTIONS } from '../reservations/CreateReservation';
import { GuestReservation } from '../reservations/ViewReservations';

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
    adults_active: number;
    kids_active: number;
    infants_active: number;
}

type FilterState = {
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
};

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
    return Math.max(0, (end.getTime() - new Date(entry).getTime()) / 3600000);
};

const getGuestDisplayName = (r: GuestReservation) =>
    r.contact?.institution ||
    (r.contact_person ? `${r.contact_person.first_name || ''} ${r.contact_person.last_name || ''}`.trim() : null) ||
    r.guest_name;

const getInitials = (name: string) =>
    name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

const isOverdue = (r: GuestReservation) => {
    if (r.exit_time || !r.check_out) return false;
    const co = new Date(r.check_out);
    co.setHours(23, 59, 59, 999);
    return co.getTime() < Date.now();
};
const isCheckedIn = (r: GuestReservation) => !!r.entry_time && !r.exit_time;
const isVIP = (r: GuestReservation) => !!r.dream_pass_code || r.is_express_check_in;
const isAccommodation = (section: string) => section === 'accommodation' || section.toLowerCase().includes('accommodation');

const FILTER_LABELS: Record<string, Record<string, string>> = {
    status: { checked_in: 'Currently In', checked_out: 'Checked Out', overdue: 'Overdue', vip: 'VIP', all: 'All Guests' },
    type: { corporate: 'Corporate', leisure: 'Leisure' },
    section: {},
    entry_type: { walk_in: 'Walk-In', drive_in: 'Drive-In' },
    bills_status: { cleared: 'Bills Cleared', pending: 'Bills Pending' },
    housekeeping_status: { cleared: 'HK Cleared', pending: 'HK Pending' },
    dateField: { check_in: 'Check-In', check_out: 'Check-Out', entry_time: 'Entry Time', created_at: 'Created At' },
    dateRange: {
        today: 'Today',
        yesterday: 'Yesterday',
        thisWeek: 'This Week',
        last7Days: 'Last 7 Days',
        last30Days: 'Last 30 Days',
        last3Months: 'Last 3 Months',
        custom: 'Custom Range',
    },
};

const getFilterLabel = (key: string, value: string) => {
    if (key === 'section') return getSectionLabel(value);
    if (key === 'customStart') return `From: ${value}`;
    if (key === 'customEnd') return `To: ${value}`;
    return FILTER_LABELS[key]?.[value] ?? value;
};

export default function ViewGuests() {
    const [reservations, setReservations] = useState<GuestReservation[]>([]);
    const [aggregations, setAggregations] = useState<Aggregations | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [isFetching, setIsFetching] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
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
    const [filters, setFilters] = useState<FilterState>({ status: 'checked_in' });
    const [tempFilters, setTempFilters] = useState<FilterState>({ status: 'checked_in' });
    const [isDreamPassModalOpen, setIsDreamPassModalOpen] = useState(false);
    const [dreamPassGuest, setDreamPassGuest] = useState<GuestReservation | null>(null);
    const [isDreamPassDetailsModalOpen, setIsDreamPassDetailsModalOpen] = useState(false);
    const [viewingDreamPass, setViewingDreamPass] = useState<DreamPass | null>(null);
    const [isDreamPassDetailsFetching, setIsDreamPassDetailsFetching] = useState(false);
    const [isUnclearBillsModalOpen, setIsUnclearBillsModalOpen] = useState(false);
    const [isUnclearHousekeepingModalOpen, setIsUnclearHousekeepingModalOpen] = useState(false);
    const [isClearBothModalOpen, setIsClearBothModalOpen] = useState(false);
    const [unclearBillsComment, setUnclearBillsComment] = useState('');
    const [unclearHousekeepingComment, setUnclearHousekeepingComment] = useState('');
    const [clearBothComment, setClearBothComment] = useState('');
    const [isMobileView, setIsMobileView] = useState(false);

    const sentinelRef = useRef<HTMLDivElement>(null);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const check = () => setIsMobileView(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const buildParams = useCallback(
        (page: number, overrideFilters?: FilterState, overrideSearch?: string) => {
            const f = overrideFilters ?? filters;
            const s = overrideSearch ?? searchQuery;
            const params: Record<string, string> = { page: page.toString(), per_page: '25', has_entry: '1' };
            if (f.section) params.section = f.section;
            if (f.type) params.type = f.type;
            if (f.status) params.status = f.status;
            if (f.entry_type) params.entry_type = f.entry_type;
            if (f.bills_status) params.bills_status = f.bills_status;
            if (f.housekeeping_status) params.housekeeping_status = f.housekeeping_status;
            if (f.dateField) params.dateField = f.dateField;
            if (f.dateRange) params.dateRange = f.dateRange;
            if (f.customStart) params.customStart = f.customStart;
            if (f.customEnd) params.customEnd = f.customEnd;
            if (s.trim()) params.search = s.trim();
            return params;
        },
        [filters, searchQuery],
    );

    const fetchReservations = useCallback(
        async (page = 1, overrideFilters?: FilterState, overrideSearch?: string) => {
            if (page === 1) setIsFetching(true);
            else setIsLoadingMore(true);
            try {
                const params = buildParams(page, overrideFilters, overrideSearch);
                const [resData, aggData] = await Promise.all([
                    axios.get('/api/guest-reservations', { params }),
                    page === 1 ? axios.get('/api/guest-reservations/aggregations', { params }) : Promise.resolve(null),
                ]);
                const data = resData.data;
                const items: GuestReservation[] = data.data ?? data;
                if (page === 1) {
                    setReservations(items);
                    if (aggData) setAggregations(aggData.data);
                } else {
                    setReservations((prev) => [...prev, ...items]);
                }
                setTotalCount(data.meta?.total ?? data.total ?? items.length);
                setCurrentPage(data.meta?.current_page ?? data.current_page ?? 1);
                setLastPage(data.meta?.last_page ?? data.last_page ?? 1);
            } catch {
                toast.error('Failed to fetch guest reservations.');
            } finally {
                setIsFetching(false);
                setIsLoadingMore(false);
            }
        },
        [buildParams],
    );

    useEffect(() => {
        fetchReservations(1);
    }, [filters]);

    useEffect(() => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            fetchReservations(1, undefined, searchQuery);
        }, 350);
        return () => {
            if (searchDebounce.current) clearTimeout(searchDebounce.current);
        };
    }, [searchQuery]);

    useEffect(() => {
        if (!sentinelRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMore && !isFetching && currentPage < lastPage) {
                    fetchReservations(currentPage + 1);
                }
            },
            { threshold: 0.1, rootMargin: '200px' },
        );
        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [isLoadingMore, isFetching, currentPage, lastPage, fetchReservations]);

    const handleViewDreamPass = async (dreamPassId: string) => {
        setIsDreamPassDetailsFetching(true);
        try {
            const { data } = await axios.get(`/api/dream-passes/${dreamPassId}`);
            setViewingDreamPass(data);
            setIsDreamPassDetailsModalOpen(true);
        } catch {
            toast.error('Failed to load DreamPass details.');
        } finally {
            setIsDreamPassDetailsFetching(false);
        }
    };

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
            fetchReservations(1);
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
            await axios.patch(`/api/guest-reservations/${actionGuest.id}`, { cleared_bills: { is_cleared: true, comments: billComment } });
            toast.success('Bills marked as cleared.');
            fetchReservations(1);
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
            fetchReservations(1);
            setIsHousekeepingModalOpen(false);
            setHousekeepingComment('');
        } catch {
            toast.error('Failed to update housekeeping.');
        } finally {
            setIsSubmitting(false);
            setActionGuest(null);
        }
    };

    const handleUnclearBills = async () => {
        if (!actionGuest) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/guest-reservations/${actionGuest.id}`, { cleared_bills: { is_cleared: false, comments: unclearBillsComment } });
            toast.success('Bills marked as pending.');
            fetchReservations(1);
            setIsUnclearBillsModalOpen(false);
            setUnclearBillsComment('');
        } catch {
            toast.error('Failed to update bills.');
        } finally {
            setIsSubmitting(false);
            setActionGuest(null);
        }
    };

    const handleUnclearHousekeeping = async () => {
        if (!actionGuest) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/guest-reservations/${actionGuest.id}`, {
                cleared_by_house_keeping: { is_cleared: false, comments: unclearHousekeepingComment },
            });
            toast.success('Housekeeping marked as pending.');
            fetchReservations(1);
            setIsUnclearHousekeepingModalOpen(false);
            setUnclearHousekeepingComment('');
        } catch {
            toast.error('Failed to update housekeeping.');
        } finally {
            setIsSubmitting(false);
            setActionGuest(null);
        }
    };

    const handleClearBoth = async () => {
        if (!actionGuest) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/guest-reservations/${actionGuest.id}`, {
                cleared_bills: { is_cleared: true, comments: clearBothComment },
                cleared_by_house_keeping: { is_cleared: true, comments: clearBothComment },
            });
            toast.success('Bills and housekeeping cleared.');
            fetchReservations(1);
            setIsClearBothModalOpen(false);
            setClearBothComment('');
        } catch {
            toast.error('Failed to clear both.');
        } finally {
            setIsSubmitting(false);
            setActionGuest(null);
        }
    };

    const applyFilters = () => {
        setFilters(tempFilters);
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        const reset: FilterState = { status: 'checked_in' };
        setFilters(reset);
        setTempFilters(reset);
        setActiveQuickFilter('checked_in');
        setIsFilterOpen(false);
    };

    const removeFilter = (key: keyof FilterState) => {
        const updated = { ...filters };
        delete updated[key];
        if (key === 'dateField') {
            delete updated.dateRange;
            delete updated.customStart;
            delete updated.customEnd;
        }
        if (key === 'dateRange') {
            delete updated.customStart;
            delete updated.customEnd;
        }
        if (key === 'status') {
            setActiveQuickFilter('');
        }
        setFilters(updated);
        setTempFilters(updated);
    };

    const handleQuickFilter = (key: string, status: string) => {
        setActiveQuickFilter(key);
        const newFilters: FilterState = { status };
        setFilters(newFilters);
        setTempFilters(newFilters);
    };

    const activeFilterChips = Object.entries(filters).filter(([k, v]) => {
        if (!v) return false;
        if (k === 'status' && v === '') return false;
        return true;
    });

    const displayedCount = sortedReservations.length;

    return (
        <div className="vg-root">
            <style>{`
                .vg-root {
                    min-height: 100vh;
                    background: linear-gradient(160deg, #fdf8f3 0%, #f5ede2 60%, #eee4d6 100%);
                    font-family: 'DM Sans', sans-serif;
                }
                .vg-header-card {
                    background: linear-gradient(135deg, #902729 0%, #6b1a1c 100%);
                    border-radius: 20px;
                    padding: 24px 28px;
                    box-shadow: 0 8px 40px rgba(144,39,41,0.22);
                    position: relative;
                    overflow: hidden;
                }
                .vg-header-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 60%);
                    pointer-events: none;
                }
                .vg-stat {
                    background: white;
                    border-radius: 14px;
                    border: 1px solid rgba(147,114,60,0.12);
                    box-shadow: 0 2px 12px rgba(144,39,41,0.05);
                    padding: 16px;
                    transition: all 0.2s;
                }
                .vg-stat:hover { box-shadow: 0 6px 24px rgba(144,39,41,0.10); transform: translateY(-2px); }
                .vg-pill {
                    border-radius: 100px;
                    border: 1.5px solid rgba(147,114,60,0.22);
                    background: white;
                    transition: all 0.15s;
                    cursor: pointer;
                    font-size: 12px;
                    padding: 6px 14px;
                    color: #5a4a3a;
                    font-family: 'DM Sans', sans-serif;
                    font-weight: 500;
                    white-space: nowrap;
                }
                .vg-pill:hover { border-color: #93723c; color: #93723c; background: rgba(147,114,60,0.04); }
                .vg-pill.active { background: #93723c; border-color: #93723c; color: white; }
                .vg-pill.active-red { background: #902729; border-color: #902729; color: white; }
                .vg-btn {
                    display: inline-flex; align-items: center; gap: 6px; border-radius: 12px;
                    padding: 9px 18px; font-size: 13px; font-weight: 600;
                    transition: all 0.15s; cursor: pointer; border: none;
                }
                .vg-btn-primary { background: linear-gradient(135deg, #902729, #b83a3c); color: white; }
                .vg-btn-primary:hover { box-shadow: 0 4px 16px rgba(144,39,41,0.32); transform: translateY(-1px); }
                .vg-btn-gold { background: linear-gradient(135deg, #93723c, #b8914d); color: white; }
                .vg-btn-gold:hover { box-shadow: 0 4px 16px rgba(147,114,60,0.32); transform: translateY(-1px); }
                .vg-btn-outline { background: white; color: #5a4a3a; border: 1.5px solid rgba(147,114,60,0.25); }
                .vg-btn-outline:hover { border-color: #93723c; color: #93723c; }
                .vg-btn-green { background: linear-gradient(135deg, #059669, #047857); color: white; }
                .vg-input {
                    width: 100%; border-radius: 12px; border: 1.5px solid rgba(147,114,60,0.2);
                    background: white; padding: 10px 14px; font-family: 'DM Sans', sans-serif;
                    font-size: 13px; color: #2d1f0e; outline: none; transition: border 0.15s, box-shadow 0.15s;
                }
                .vg-input:focus { border-color: #93723c; box-shadow: 0 0 0 3px rgba(147,114,60,0.1); }
                .vg-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2393723c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
                .vg-table { width: 100%; border-collapse: collapse; }
                .vg-th { padding: 13px 14px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: rgba(255,255,255,0.75); cursor: pointer; user-select: none; white-space: nowrap; }
                .vg-th:hover { color: white; }
                .vg-td { padding: 14px; vertical-align: middle; border-bottom: 1px solid rgba(147,114,60,0.06); }
                .vg-row { transition: background 0.12s; }
                .vg-row:hover { background: rgba(147,114,60,0.03); }
                .vg-avatar { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; flex-shrink: 0; }
                .vg-badge { display: inline-flex; align-items: center; border-radius: 100px; padding: 3px 9px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
                .vg-section-tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 8px; background: rgba(147,114,60,0.07); font-size: 11px; font-weight: 500; color: #6a5030; border: 1px solid rgba(147,114,60,0.12); }
                .vg-menu { position: relative; }
                .vg-dropdown { position: absolute; right: 0; top: calc(100% + 4px); background: white; border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border: 1px solid rgba(147,114,60,0.1); min-width: 190px; z-index: 50; overflow: hidden; }
                .vg-menu-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; font-size: 13px; font-weight: 500; color: #3d2c1a; cursor: pointer; transition: background 0.12s; border: none; background: none; width: 100%; text-align: left; }
                .vg-menu-item:hover { background: rgba(147,114,60,0.05); }
                .vg-menu-item.danger { color: #902729; }
                .vg-menu-item.danger:hover { background: rgba(144,39,41,0.05); }
                .vg-panel { position: fixed; right: 0; top: 0; height: 100vh; width: 460px; background: white; box-shadow: -8px 0 48px rgba(0,0,0,0.10); z-index: 100; overflow-y: auto; border-left: 1px solid rgba(147,114,60,0.12); }
                .vg-panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.25); z-index: 99; backdrop-filter: blur(3px); }
                .vg-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); padding: 16px; }
                .vg-modal { background: white; border-radius: 20px; padding: 28px; width: 460px; max-width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,0.18); }
                .vg-filter-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px 5px 12px; border-radius: 100px; background: rgba(144,39,41,0.08); border: 1px solid rgba(144,39,41,0.18); font-size: 11px; font-weight: 600; color: #902729; white-space: nowrap; }
                .vg-chip-x { width: 16px; height: 16px; border-radius: 50%; background: rgba(144,39,41,0.12); border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: #902729; padding: 0; transition: background 0.12s; }
                .vg-chip-x:hover { background: rgba(144,39,41,0.22); }
                .vg-info-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid rgba(147,114,60,0.07); }
                .vg-info-label { font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: #9a8060; }
                .vg-info-val { font-size: 13px; font-weight: 500; color: #2d1f0e; text-align: right; max-width: 60%; }
                .vg-visit-card { border-radius: 12px; border: 1px solid rgba(147,114,60,0.12); background: rgba(147,114,60,0.03); padding: 12px 14px; transition: all 0.15s; }
                .vg-visit-card:hover { background: rgba(147,114,60,0.06); }
                .vg-scrollbar::-webkit-scrollbar { width: 4px; }
                .vg-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .vg-scrollbar::-webkit-scrollbar-thumb { background: rgba(147,114,60,0.25); border-radius: 2px; }
                textarea.vg-input { resize: vertical; min-height: 80px; }
                .vg-mobile-card { background: white; border-radius: 16px; border: 1px solid rgba(147,114,60,0.1); padding: 14px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.15s; }
                .vg-mobile-card:hover { box-shadow: 0 4px 16px rgba(144,39,41,0.08); }
                .vg-count-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 100px; background: rgba(144,39,41,0.08); font-size: 12px; font-weight: 700; color: #902729; }
                @media (max-width: 767px) {
                    .vg-panel { width: 100vw; }
                    .vg-desktop-only { display: none !important; }
                }
                @media (min-width: 768px) {
                    .vg-mobile-only { display: none !important; }
                }
            `}</style>

            <div style={{ maxWidth: 1600, margin: '0 auto', padding: '20px 16px 48px' }}>
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="vg-header-card mb-6">
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 14,
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Hotel size={22} color="white" />
                            </div>
                            <div>
                                <h1
                                    style={{
                                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                                        fontSize: 26,
                                        fontWeight: 700,
                                        color: 'white',
                                        lineHeight: 1,
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    Guest Management
                                </h1>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 3 }}>
                                    Real-time tracking ·{' '}
                                    {totalCount > 0 && <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{totalCount} records</strong>}
                                    {aggregations && (
                                        <span>
                                            {' '}
                                            · <strong style={{ color: '#ffd700' }}>{aggregations.active} on property</strong>
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="vg-btn vg-btn-outline"
                                style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)' }}
                                onClick={() => fetchReservations(1)}
                            >
                                <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                                <span className="vg-desktop-only">Refresh</span>
                            </button>
                            <button
                                className="vg-btn"
                                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.2)' }}
                            >
                                <Download size={14} />
                                <span className="vg-desktop-only">Export</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 }}
                    className="mb-5"
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}
                >
                    {[
                        {
                            label: 'On Property',
                            value: aggregations?.active ?? 0,
                            icon: <Users size={14} />,
                            color: '#902729',
                            bg: 'rgba(144,39,41,0.07)',
                            breakdown: aggregations
                                ? [
                                      { label: 'Adults', value: aggregations.adults_active, color: '#902729' },
                                      { label: 'Kids', value: aggregations.kids_active, color: '#1a5fa8' },
                                  ]
                                : undefined,
                        },
                        {
                            label: 'Corporate',
                            value: aggregations?.corporate ?? 0,
                            icon: <Briefcase size={14} />,
                            color: '#1a5fa8',
                            bg: 'rgba(26,95,168,0.07)',
                            breakdown: aggregations
                                ? [
                                      { label: 'Corporate', value: aggregations.corporate, color: '#1a5fa8' },
                                      { label: 'Leisure', value: aggregations.leisure, color: '#7c3aed' },
                                  ]
                                : undefined,
                        },
                        {
                            label: 'Overdue',
                            value: aggregations?.overdue ?? 0,
                            icon: <AlertTriangle size={14} />,
                            color: '#dc2626',
                            bg: 'rgba(220,38,38,0.07)',
                            breakdown: undefined,
                        },
                        {
                            label: 'Bills Pending',
                            value: aggregations?.bills_pending ?? 0,
                            icon: <Receipt size={14} />,
                            color: '#d97706',
                            bg: 'rgba(217,119,6,0.07)',
                            breakdown: aggregations
                                ? [
                                      { label: 'Pending', value: aggregations.bills_pending, color: '#d97706' },
                                      { label: 'Cleared', value: aggregations.bills_cleared, color: '#059669' },
                                  ]
                                : undefined,
                        },
                        {
                            label: 'Bills Cleared',
                            value: aggregations?.bills_cleared ?? 0,
                            icon: <CheckCircle2 size={14} />,
                            color: '#059669',
                            bg: 'rgba(5,150,105,0.07)',
                            breakdown: undefined,
                        },
                        {
                            label: 'Total Records',
                            value: totalCount,
                            icon: <Star size={14} />,
                            color: '#7c3aed',
                            bg: 'rgba(124,58,237,0.07)',
                            breakdown: aggregations
                                ? [
                                      { label: 'Express', value: aggregations.express, color: '#059669' },
                                      { label: 'VIP', value: aggregations.vip, color: '#d97706' },
                                  ]
                                : undefined,
                        },
                    ].map((card, i) => (
                        <div key={i} className="vg-stat">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ color: card.color, background: card.bg, borderRadius: 9, padding: 7, flexShrink: 0 }}>{card.icon}</div>
                                <div>
                                    <p
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: '0.08em',
                                            textTransform: 'uppercase',
                                            color: '#9a8060',
                                        }}
                                    >
                                        {card.label}
                                    </p>
                                    <p
                                        style={{
                                            fontFamily: "'Cormorant Garamond', serif",
                                            fontSize: 24,
                                            fontWeight: 700,
                                            color: card.color,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {card.value}
                                    </p>
                                </div>
                            </div>
                            {card.breakdown && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                                        {card.breakdown.map((b, j) => {
                                            const total = card.breakdown!.reduce((s, x) => s + x.value, 0);
                                            const pct = total > 0 ? Math.round((b.value / total) * 100) : 0;
                                            return (
                                                <div
                                                    key={j}
                                                    style={{
                                                        height: 3,
                                                        flex: pct || 1,
                                                        background: b.color,
                                                        borderRadius: 100,
                                                        opacity: pct === 0 ? 0.15 : 1,
                                                        transition: 'flex 0.5s',
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 10px' }}>
                                        {card.breakdown.map((b, j) => (
                                            <span key={j} style={{ fontSize: 10, color: '#9a8060', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                <span
                                                    style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, display: 'inline-block' }}
                                                />
                                                {b.label}: <strong style={{ color: '#3d2c1a' }}>{b.value}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}
                >
                    {[
                        { key: 'checked_in', label: '● Currently In', status: 'checked_in' },
                        { key: 'checked_out', label: 'Checked Out', status: 'checked_out' },
                        { key: 'overdue', label: '⚠ Overdue', status: 'overdue' },
                        { key: 'all', label: 'All Guests', status: '' },
                    ].map((q) => (
                        <button
                            key={q.key}
                            onClick={() => handleQuickFilter(q.key, q.status)}
                            className={`vg-pill ${activeQuickFilter === q.key ? (q.key === 'overdue' ? 'active-red' : 'active') : ''}`}
                        >
                            {q.label}
                        </button>
                    ))}
                </motion.div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200, maxWidth: 480 }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9a8060' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search name, reservation #, phone…"
                            className="vg-input"
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
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setIsFilterOpen((o) => !o)}
                        className={`vg-pill ${isFilterOpen || Object.keys(filters).filter((k) => (filters as any)[k]).length > 0 ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', flexShrink: 0 }}
                    >
                        <Filter size={13} />
                        Filters
                        {Object.keys(filters).filter((k) => (filters as any)[k]).length > 0 && (
                            <span
                                style={{
                                    background: 'rgba(255,255,255,0.3)',
                                    color: 'inherit',
                                    borderRadius: '100px',
                                    minWidth: 18,
                                    height: 18,
                                    fontSize: 10,
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px',
                                }}
                            >
                                {Object.keys(filters).filter((k) => (filters as any)[k]).length}
                            </span>
                        )}
                        {isFilterOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <span className="vg-count-badge">
                        <Users size={11} />
                        {displayedCount} of {totalCount}
                    </span>
                </div>

                <AnimatePresence>
                    {activeFilterChips.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden', marginBottom: 12 }}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                <span
                                    style={{ fontSize: 11, fontWeight: 600, color: '#9a8060', textTransform: 'uppercase', letterSpacing: '0.07em' }}
                                >
                                    Active filters:
                                </span>
                                {activeFilterChips.map(([key, value]) => (
                                    <span key={key} className="vg-filter-chip">
                                        {getFilterLabel(key, value as string)}
                                        <button className="vg-chip-x" onClick={() => removeFilter(key as keyof FilterState)}>
                                            <X size={9} />
                                        </button>
                                    </span>
                                ))}
                                <button
                                    onClick={clearFilters}
                                    style={{
                                        fontSize: 11,
                                        color: '#902729',
                                        cursor: 'pointer',
                                        background: 'none',
                                        border: 'none',
                                        fontWeight: 600,
                                        textDecoration: 'underline',
                                    }}
                                >
                                    Clear all
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {isFilterOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            style={{ overflow: 'hidden', marginBottom: 14 }}
                        >
                            <div
                                style={{
                                    background: 'white',
                                    borderRadius: 18,
                                    border: '1.5px solid rgba(147,114,60,0.14)',
                                    padding: 20,
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.05)',
                                }}
                            >
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
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
                                                style={{
                                                    fontSize: 10,
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
                                                className="vg-input vg-select"
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
                                        <div>
                                            <label
                                                style={{
                                                    fontSize: 10,
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
                                                className="vg-input vg-select"
                                            >
                                                <option value="">Preset Ranges</option>
                                                {[
                                                    'today',
                                                    'yesterday',
                                                    'thisWeek',
                                                    'last7Days',
                                                    'last30Days',
                                                    'last3Months',
                                                    'last6Months',
                                                    'lastYear',
                                                    'custom',
                                                ].map((v) => (
                                                    <option key={v} value={v}>
                                                        {v.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {tempFilters.dateRange === 'custom' && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label
                                                style={{
                                                    fontSize: 10,
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
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input
                                                    type="date"
                                                    value={tempFilters.customStart ?? ''}
                                                    onChange={(e) => setTempFilters((p) => ({ ...p, customStart: e.target.value }))}
                                                    className="vg-input"
                                                    style={{ flex: 1 }}
                                                />
                                                <input
                                                    type="date"
                                                    value={tempFilters.customEnd ?? ''}
                                                    onChange={(e) => setTempFilters((p) => ({ ...p, customEnd: e.target.value }))}
                                                    className="vg-input"
                                                    style={{ flex: 1 }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                    <button className="vg-btn vg-btn-outline" onClick={clearFilters}>
                                        Clear All
                                    </button>
                                    <button className="vg-btn vg-btn-gold" onClick={applyFilters}>
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div
                    style={{
                        background: 'white',
                        borderRadius: 18,
                        border: '1px solid rgba(147,114,60,0.1)',
                        overflow: 'hidden',
                        boxShadow: '0 2px 24px rgba(0,0,0,0.05)',
                        position: 'relative',
                    }}
                >
                    {isFetching ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: 280,
                                gap: 14,
                            }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: '50%',
                                    border: '3px solid rgba(147,114,60,0.18)',
                                    borderTopColor: '#93723c',
                                }}
                            />
                            <p style={{ fontSize: 13, color: '#9a8060' }}>Loading guests…</p>
                        </div>
                    ) : sortedReservations.length === 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: 280,
                                gap: 10,
                            }}
                        >
                            <Users size={44} opacity={0.2} color="#c4a87a" />
                            <p style={{ fontSize: 14, color: '#c4a87a', fontWeight: 500 }}>No guests match the current filters</p>
                            <button
                                onClick={clearFilters}
                                style={{
                                    fontSize: 12,
                                    color: '#93723c',
                                    cursor: 'pointer',
                                    background: 'none',
                                    border: 'none',
                                    textDecoration: 'underline',
                                    fontWeight: 600,
                                }}
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="vg-desktop-only" style={{ overflowX: 'auto' }}>
                                <table className="vg-table">
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
                                                { field: null, label: 'DreamPass' },
                                                { field: null, label: 'Bills' },
                                                { field: null, label: 'HK' },
                                                { field: null, label: '' },
                                            ].map((col, i) => (
                                                <th
                                                    key={i}
                                                    className="vg-th"
                                                    onClick={() => col.field && handleSort(col.field)}
                                                    style={{ cursor: col.field ? 'pointer' : 'default' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                        {col.label}
                                                        {col.field && sortField === col.field && (
                                                            <span style={{ marginLeft: 4, opacity: 0.8 }}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                                        )}
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
                                                onUnclearBills={() => {
                                                    setActionGuest(r);
                                                    setIsUnclearBillsModalOpen(true);
                                                }}
                                                onClearHousekeeping={() => {
                                                    setActionGuest(r);
                                                    setIsHousekeepingModalOpen(true);
                                                }}
                                                onUnclearHousekeeping={() => {
                                                    setActionGuest(r);
                                                    setIsUnclearHousekeepingModalOpen(true);
                                                }}
                                                onClearBoth={() => {
                                                    setActionGuest(r);
                                                    setIsClearBothModalOpen(true);
                                                }}
                                                handleOpenDreamPass={handleOpenDreamPass}
                                                handleViewDreamPass={handleViewDreamPass}
                                                isDreamPassDetailsFetching={isDreamPassDetailsFetching}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="vg-mobile-only" style={{ padding: '12px 12px 0' }}>
                                {sortedReservations.map((r, idx) => (
                                    <GuestMobileCard
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
                                        handleViewDreamPass={handleViewDreamPass}
                                        isDreamPassDetailsFetching={isDreamPassDetailsFetching}
                                    />
                                ))}
                            </div>

                            <div ref={sentinelRef} style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isLoadingMore && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                            style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: '50%',
                                                border: '2px solid rgba(147,114,60,0.2)',
                                                borderTopColor: '#93723c',
                                            }}
                                        />
                                        <span style={{ fontSize: 12, color: '#9a8060', fontWeight: 500 }}>Loading more…</span>
                                    </div>
                                )}
                                {!isLoadingMore && currentPage >= lastPage && sortedReservations.length > 0 && (
                                    <p style={{ fontSize: 11, color: '#c4a87a', padding: '12px 0' }}>All {totalCount} records loaded</p>
                                )}
                            </div>

                            <AnimatePresence>
                                {isDreamPassDetailsFetching && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'rgba(253,248,243,0.8)',
                                            backdropFilter: 'blur(2px)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 14,
                                            zIndex: 10,
                                            borderRadius: 18,
                                        }}
                                    >
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                                            style={{
                                                width: 44,
                                                height: 44,
                                                borderRadius: '50%',
                                                border: '4px solid rgba(147,114,60,0.2)',
                                                borderTopColor: '#93723c',
                                            }}
                                        />
                                        <p style={{ fontSize: 14, fontWeight: 600, color: '#3d2c1a' }}>Loading DreamPass…</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isPanelOpen && selectedGuest && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="vg-panel-overlay"
                            onClick={() => setIsPanelOpen(false)}
                        />
                        <motion.div
                            initial={{ x: 460 }}
                            animate={{ x: 0 }}
                            exit={{ x: 460 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                            className="vg-panel vg-scrollbar"
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
                                onUnclearBills={() => {
                                    setActionGuest(selectedGuest);
                                    setIsUnclearBillsModalOpen(true);
                                }}
                                onClearHousekeeping={() => {
                                    setActionGuest(selectedGuest);
                                    setIsHousekeepingModalOpen(true);
                                }}
                                onUnclearHousekeeping={() => {
                                    setActionGuest(selectedGuest);
                                    setIsUnclearHousekeepingModalOpen(true);
                                }}
                                onClearBoth={() => {
                                    setActionGuest(selectedGuest);
                                    setIsClearBothModalOpen(true);
                                }}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isCheckOutModalOpen}
                onClose={() => setIsCheckOutModalOpen(false)}
                title="Check Out Guest"
                icon={<LogOut size={20} color="#902729" />}
                iconBg="rgba(144,39,41,0.1)"
                isSubmitting={isSubmitting}
                onConfirm={handleCheckOut}
                confirmLabel="Confirm Check-Out"
                confirmClass="vg-btn vg-btn-primary flex-1 justify-center"
            >
                {actionGuest && (
                    <div style={{ background: 'rgba(147,114,60,0.06)', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: '#3d2c1a' }}>{getGuestDisplayName(actionGuest)}</p>
                        <p style={{ fontSize: 12, color: '#9a8060', marginTop: 2 }}>Reservation #{actionGuest.reservation_number}</p>
                    </div>
                )}
                {actionGuest && !actionGuest.cleared_bills?.is_cleared && (
                    <div
                        style={{
                            background: 'rgba(217,119,6,0.08)',
                            border: '1px solid rgba(217,119,6,0.2)',
                            borderRadius: 10,
                            padding: '10px 14px',
                            marginBottom: 16,
                            display: 'flex',
                            gap: 10,
                            alignItems: 'flex-start',
                        }}
                    >
                        <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#92400e' }}>
                            Bills have not been cleared. Please ensure settlement before check-out.
                        </p>
                    </div>
                )}
            </ConfirmModal>

            <CommentModal
                isOpen={isClearBillsModalOpen}
                onClose={() => {
                    setIsClearBillsModalOpen(false);
                    setBillComment('');
                }}
                title="Clear Bills"
                icon={<Receipt size={20} color="#059669" />}
                iconBg="rgba(5,150,105,0.1)"
                subtitle={actionGuest ? getGuestDisplayName(actionGuest) : ''}
                comment={billComment}
                setComment={setBillComment}
                placeholder="Settlement notes, payment method, reference…"
                isSubmitting={isSubmitting}
                onConfirm={handleClearBills}
                confirmLabel="Mark as Cleared"
                confirmStyle={{ background: 'linear-gradient(135deg, #059669, #047857)', color: 'white' }}
            />

            <CommentModal
                isOpen={isHousekeepingModalOpen}
                onClose={() => {
                    setIsHousekeepingModalOpen(false);
                    setHousekeepingComment('');
                }}
                title="Housekeeping Clearance"
                icon={<Shield size={20} color="#93723c" />}
                iconBg="rgba(147,114,60,0.1)"
                subtitle={actionGuest ? getGuestDisplayName(actionGuest) : ''}
                comment={housekeepingComment}
                setComment={setHousekeepingComment}
                placeholder="Room condition, items returned, remarks…"
                isSubmitting={isSubmitting}
                onConfirm={handleClearHousekeeping}
                confirmLabel="Mark Cleared"
                confirmStyle={null}
                confirmClass="vg-btn vg-btn-gold flex-1 justify-center"
            />

            <CommentModal
                isOpen={isUnclearBillsModalOpen}
                onClose={() => {
                    setIsUnclearBillsModalOpen(false);
                    setUnclearBillsComment('');
                }}
                title="Mark Bills as Pending"
                icon={<Receipt size={20} color="#d97706" />}
                iconBg="rgba(217,119,6,0.1)"
                subtitle={actionGuest ? getGuestDisplayName(actionGuest) : ''}
                comment={unclearBillsComment}
                setComment={setUnclearBillsComment}
                placeholder="Reason for reverting clearance…"
                isSubmitting={isSubmitting}
                onConfirm={handleUnclearBills}
                confirmLabel="Mark as Pending"
                confirmStyle={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: 'white' }}
            />

            <CommentModal
                isOpen={isUnclearHousekeepingModalOpen}
                onClose={() => {
                    setIsUnclearHousekeepingModalOpen(false);
                    setUnclearHousekeepingComment('');
                }}
                title="Mark Housekeeping as Pending"
                icon={<Shield size={20} color="#93723c" />}
                iconBg="rgba(147,114,60,0.1)"
                subtitle={actionGuest ? getGuestDisplayName(actionGuest) : ''}
                comment={unclearHousekeepingComment}
                setComment={setUnclearHousekeepingComment}
                placeholder="Reason for reverting housekeeping clearance…"
                isSubmitting={isSubmitting}
                onConfirm={handleUnclearHousekeeping}
                confirmLabel="Mark as Pending"
                confirmStyle={null}
                confirmClass="vg-btn vg-btn-gold flex-1 justify-center"
            />

            <CommentModal
                isOpen={isClearBothModalOpen}
                onClose={() => {
                    setIsClearBothModalOpen(false);
                    setClearBothComment('');
                }}
                title="Clear Bills & Housekeeping"
                icon={<CheckCircle2 size={20} color="#059669" />}
                iconBg="rgba(5,150,105,0.1)"
                subtitle={actionGuest ? getGuestDisplayName(actionGuest) : ''}
                comment={clearBothComment}
                setComment={setClearBothComment}
                placeholder="Settlement notes, room condition, remarks…"
                isSubmitting={isSubmitting}
                onConfirm={handleClearBoth}
                confirmLabel="Clear Both"
                confirmStyle={{ background: 'linear-gradient(135deg, #059669, #047857)', color: 'white' }}
            />

            {isDreamPassModalOpen && dreamPassGuest && (
                <div
                    className="vg-modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsDreamPassModalOpen(false);
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        style={{ background: 'white', borderRadius: 20, maxWidth: 900, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
                    >
                        <CreateDreamPass
                            activeTab="create"
                            setActiveTab={() => {}}
                            onClose={() => setIsDreamPassModalOpen(false)}
                            onSuccess={() => {
                                setIsDreamPassModalOpen(false);
                                fetchReservations(1);
                            }}
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

            {isDreamPassDetailsModalOpen && viewingDreamPass && (
                <DreamPassDetailsModal
                    dreamPass={viewingDreamPass}
                    onClose={() => {
                        setIsDreamPassDetailsModalOpen(false);
                        setViewingDreamPass(null);
                    }}
                />
            )}
        </div>
    );
}

function ConfirmModal({ isOpen, onClose, title, icon, iconBg, isSubmitting, onConfirm, confirmLabel, confirmClass, children }: any) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="vg-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="vg-modal" initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: iconBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {icon}
                            </div>
                            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#1a0e06' }}>{title}</h3>
                        </div>
                        {children}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="vg-btn vg-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                                Cancel
                            </button>
                            <button
                                className={confirmClass || 'vg-btn vg-btn-primary flex-1 justify-center'}
                                style={{ flex: 1, justifyContent: 'center' }}
                                onClick={onConfirm}
                                disabled={isSubmitting}
                            >
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
                                    confirmLabel
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function CommentModal({
    isOpen,
    onClose,
    title,
    icon,
    iconBg,
    subtitle,
    comment,
    setComment,
    placeholder,
    isSubmitting,
    onConfirm,
    confirmLabel,
    confirmStyle,
    confirmClass,
}: any) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div className="vg-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <motion.div className="vg-modal" initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: iconBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {icon}
                            </div>
                            <div>
                                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#1a0e06' }}>
                                    {title}
                                </h3>
                                {subtitle && <p style={{ fontSize: 12, color: '#9a8060' }}>{subtitle}</p>}
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label
                                style={{
                                    fontSize: 10,
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
                            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={placeholder} className="vg-input" />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="vg-btn vg-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
                                Cancel
                            </button>
                            <button
                                className={confirmClass || 'vg-btn flex-1 justify-center'}
                                style={{ flex: 1, justifyContent: 'center', ...(confirmStyle || {}) }}
                                onClick={onConfirm}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? '…' : confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function GuestMobileCard({
    r,
    idx,
    onView,
    onCheckOut,
    onClearBills,
    onClearHousekeeping,
    handleOpenDreamPass,
    handleViewDreamPass,
    isDreamPassDetailsFetching,
}: any) {
    const overdue = isOverdue(r);
    const vip = isVIP(r);
    const name = getGuestDisplayName(r);
    const duration = getHoursSpent(r.entry_time, r.exit_time);
    const accommodation = isAccommodation(r.section);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            className="vg-mobile-card"
            style={{ borderLeft: overdue ? '3px solid #dc2626' : vip ? '3px solid #93723c' : '3px solid transparent' }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                        className="vg-avatar"
                        style={{
                            background: r.type === 'corporate' ? 'rgba(144,39,41,0.08)' : 'rgba(147,114,60,0.1)',
                            color: r.type === 'corporate' ? '#902729' : '#93723c',
                        }}
                    >
                        {vip ? <Star size={15} /> : getInitials(name)}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a0e06' }}>{name}</span>
                            {vip && (
                                <span
                                    style={{
                                        fontSize: 9,
                                        color: '#93723c',
                                        fontWeight: 800,
                                        background: 'rgba(147,114,60,0.1)',
                                        borderRadius: 4,
                                        padding: '1px 5px',
                                    }}
                                >
                                    VIP
                                </span>
                            )}
                            {overdue && (
                                <span
                                    style={{
                                        fontSize: 9,
                                        color: '#dc2626',
                                        fontWeight: 800,
                                        background: 'rgba(220,38,38,0.1)',
                                        borderRadius: 4,
                                        padding: '1px 5px',
                                    }}
                                >
                                    OVERDUE
                                </span>
                            )}
                        </div>
                        <p style={{ fontSize: 11, color: '#9a8060' }}>#{r.reservation_number}</p>
                    </div>
                </div>
                <button
                    onClick={onView}
                    style={{
                        padding: '6px 12px',
                        border: '1.5px solid rgba(147,114,60,0.22)',
                        borderRadius: 9,
                        background: 'white',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#93723c',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                    }}
                >
                    View
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                {[
                    { label: 'Section', value: `${getSectionIcon(r.section)} ${getSectionLabel(r.section)}` },
                    { label: 'Duration', value: formatDuration(duration) },
                    { label: 'Entry', value: formatDateTime(r.entry_time) },
                    { label: 'Check-Out', value: formatDate(r.check_out) },
                ].map((item, i) => (
                    <div key={i} style={{ background: 'rgba(147,114,60,0.04)', borderRadius: 8, padding: '7px 10px' }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: '#9a8060', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {item.label}
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#2d1f0e', marginTop: 1 }}>{item.value}</p>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span
                    className="vg-badge"
                    style={{
                        background: r.cleared_bills?.is_cleared ? 'rgba(5,150,105,0.1)' : 'rgba(217,119,6,0.1)',
                        color: r.cleared_bills?.is_cleared ? '#059669' : '#d97706',
                        border: `1px solid ${r.cleared_bills?.is_cleared ? 'rgba(5,150,105,0.2)' : 'rgba(217,119,6,0.2)'}`,
                    }}
                >
                    {r.cleared_bills?.is_cleared ? '✓ Bills' : '⏳ Bills'}
                </span>
                {accommodation && (
                    <span
                        className="vg-badge"
                        style={{
                            background: r.cleared_by_house_keeping?.is_cleared ? 'rgba(5,150,105,0.1)' : 'rgba(147,114,60,0.1)',
                            color: r.cleared_by_house_keeping?.is_cleared ? '#059669' : '#93723c',
                            border: `1px solid ${r.cleared_by_house_keeping?.is_cleared ? 'rgba(5,150,105,0.2)' : 'rgba(147,114,60,0.2)'}`,
                        }}
                    >
                        {r.cleared_by_house_keeping?.is_cleared ? '✓ HK' : '⏳ HK'}
                    </span>
                )}
                {!r.exit_time && (
                    <button
                        onClick={onCheckOut}
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#902729',
                            background: 'rgba(144,39,41,0.08)',
                            border: 'none',
                            borderRadius: 100,
                            padding: '3px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <LogOut size={10} /> Check Out
                    </button>
                )}
                {r.dream_pass_id ? (
                    <button
                        onClick={() => handleViewDreamPass(r.dream_pass_id)}
                        disabled={isDreamPassDetailsFetching}
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'white',
                            background: '#93723c',
                            border: 'none',
                            borderRadius: 100,
                            padding: '3px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                        }}
                    >
                        <Eye size={10} /> Pass
                    </button>
                ) : (
                    <button
                        onClick={() => handleOpenDreamPass(r)}
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: 'white',
                            background: '#902729',
                            border: 'none',
                            borderRadius: 100,
                            padding: '3px 10px',
                            cursor: 'pointer',
                        }}
                    >
                        + DreamPass
                    </button>
                )}
            </div>
        </motion.div>
    );
}

function GuestRow({
    r,
    idx,
    onView,
    onCheckOut,
    onClearBills,
    onUnclearBills,
    onClearHousekeeping,
    onUnclearHousekeeping,
    onClearBoth,
    handleOpenDreamPass,
    handleViewDreamPass,
    isDreamPassDetailsFetching,
}: {
    r: GuestReservation;
    idx: number;
    onView: () => void;
    onCheckOut: () => void;
    onClearBills: () => void;
    onUnclearBills: () => void;
    onClearHousekeeping: () => void;
    onUnclearHousekeeping: () => void;
    onClearBoth: () => void;
    handleOpenDreamPass: (r: GuestReservation) => void;
    handleViewDreamPass: (id: string) => void;
    isDreamPassDetailsFetching: boolean;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const overdue = isOverdue(r);
    const vip = isVIP(r);
    const name = getGuestDisplayName(r);
    const duration = getHoursSpent(r.entry_time, r.exit_time);
    const accommodation = isAccommodation(r.section);
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(idx * 0.015, 0.3) }}
            className="vg-row"
            style={{ background: overdue ? 'rgba(220,38,38,0.02)' : undefined }}
        >
            <td className="vg-td">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="vg-avatar" style={{ background: avatarColor.bg, color: avatarColor.color }}>
                        {vip ? <Star size={14} /> : getInitials(name)}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a0e06' }}>{name}</span>
                            {vip && (
                                <span
                                    style={{
                                        fontSize: 9,
                                        color: '#93723c',
                                        fontWeight: 800,
                                        background: 'rgba(147,114,60,0.1)',
                                        borderRadius: 4,
                                        padding: '1px 5px',
                                    }}
                                >
                                    VIP
                                </span>
                            )}
                        </div>
                        <p style={{ fontSize: 11, color: '#9a8060' }}>#{r.reservation_number}</p>
                        {r.phone_number && <p style={{ fontSize: 11, color: '#b0957a' }}>{r.phone_number}</p>}
                    </div>
                </div>
            </td>
            <td className="vg-td">
                <span className="vg-badge" style={{ background: typeColor.bg, color: typeColor.color, border: `1px solid ${typeColor.border}` }}>
                    {r.type === 'corporate' ? <Briefcase size={10} style={{ marginRight: 3 }} /> : <Sparkles size={10} style={{ marginRight: 3 }} />}
                    {r.type.toUpperCase()}
                </span>
            </td>
            <td className="vg-td">
                <span className="vg-section-tag">
                    {getSectionIcon(r.section)} {getSectionLabel(r.section)}
                </span>
            </td>
            <td className="vg-td">
                <div style={{ fontSize: 13, color: '#3d2c1a' }}>
                    <span style={{ fontWeight: 600 }}>{r.adults_count ?? 0}</span>
                    <span style={{ color: '#9a8060' }}> {r.adults_count > 1 ? 'Adults' : 'Adult'}</span>
                </div>
                {(r.kids_count ?? 0) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Baby size={10} color="#93723c" />
                        <span style={{ fontSize: 11, color: '#9a8060' }}>{r.kids_count} Kids</span>
                    </div>
                )}
            </td>
            <td className="vg-td">
                <span style={{ fontSize: 13, color: '#3d2c1a' }}>{formatDateTime(r.entry_time)}</span>
                {r.is_express_check_in && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <Zap size={10} color="#93723c" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#93723c' }}>Express</span>
                    </div>
                )}
                {r.entry_type === 'drive_in' && r.car_plate_number && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <Car size={10} color="#9a8060" />
                        <span style={{ fontSize: 11, color: '#9a8060' }}>{r.car_plate_number}</span>
                    </div>
                )}
            </td>
            <td className="vg-td">
                <div style={{ color: overdue ? '#dc2626' : '#3d2c1a', fontSize: 13 }}>
                    {formatDate(r.check_out)}
                    {overdue && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                            <AlertTriangle size={10} color="#dc2626" />
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626' }}>OVERDUE</span>
                        </div>
                    )}
                    {r.exit_time && <div style={{ fontSize: 11, color: '#9a8060', marginTop: 2 }}>Out: {formatDateTime(r.exit_time)}</div>}
                </div>
            </td>
            <td className="vg-td">
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={11} color="#93723c" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#3d2c1a' }}>{formatDuration(duration)}</span>
                </div>
            </td>
            <td className="vg-td">
                {r.dream_pass_id ? (
                    <button
                        className="vg-btn"
                        style={{ background: '#93723c', color: 'white', fontSize: 11, padding: '6px 12px', borderRadius: 9 }}
                        onClick={() => handleViewDreamPass(r.dream_pass_id!)}
                        disabled={isDreamPassDetailsFetching}
                    >
                        <Eye size={11} /> View
                    </button>
                ) : (
                    <button
                        className="vg-btn"
                        style={{ background: '#902729', color: 'white', fontSize: 11, padding: '6px 12px', borderRadius: 9 }}
                        onClick={() => handleOpenDreamPass(r)}
                    >
                        + Create
                    </button>
                )}
            </td>
            <td className="vg-td">
                <select
                    value={r.cleared_bills?.is_cleared ? 'cleared' : 'pending'}
                    onChange={(e) => {
                        if (e.target.value === 'cleared') onClearBills();
                        else onUnclearBills();
                    }}
                    disabled={!!r.exit_time}
                    className="vg-input vg-select"
                    style={{
                        width: 'auto',
                        padding: '4px 28px 4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        color: r.cleared_bills?.is_cleared ? '#059669' : '#d97706',
                        opacity: r.exit_time ? 0.5 : 1,
                        cursor: r.exit_time ? 'not-allowed' : 'pointer',
                    }}
                >
                    <option value="cleared">✓ Cleared</option>
                    <option value="pending">⏳ Pending</option>
                </select>
            </td>
            <td className="vg-td">
                {accommodation ? (
                    <select
                        value={r.cleared_by_house_keeping?.is_cleared ? 'cleared' : 'pending'}
                        onChange={(e) => {
                            if (e.target.value === 'cleared') onClearHousekeeping();
                            else onUnclearHousekeeping();
                        }}
                        disabled={!!r.exit_time}
                        className="vg-input vg-select"
                        style={{
                            width: 'auto',
                            padding: '4px 28px 4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: r.cleared_by_house_keeping?.is_cleared ? '#059669' : '#93723c',
                            opacity: r.exit_time ? 0.5 : 1,
                            cursor: r.exit_time ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <option value="cleared">✓ Cleared</option>
                        <option value="pending">⏳ Pending</option>
                    </select>
                ) : (
                    <span style={{ fontSize: 11, color: '#c4a87a' }}>N/A</span>
                )}
            </td>
            <td className="vg-td">
                <div className="vg-menu" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((o) => !o)}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 9,
                            border: '1.5px solid rgba(147,114,60,0.2)',
                            background: menuOpen ? 'rgba(147,114,60,0.06)' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9a8060',
                            fontSize: 16,
                            fontWeight: 700,
                        }}
                    >
                        ···
                    </button>
                    <AnimatePresence>
                        {menuOpen && (
                            <motion.div
                                className="vg-dropdown"
                                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                transition={{ duration: 0.13 }}
                            >
                                <button
                                    className="vg-menu-item"
                                    onClick={() => {
                                        onView();
                                        setMenuOpen(false);
                                    }}
                                >
                                    <User size={14} color="#93723c" /> View Profile
                                </button>
                                <button
                                    className="vg-menu-item"
                                    onClick={() => {
                                        onView();
                                        setMenuOpen(false);
                                    }}
                                >
                                    <History size={14} color="#93723c" /> Visit History
                                </button>
                                {!r.exit_time && !r.cleared_bills?.is_cleared && (
                                    <button
                                        className="vg-menu-item"
                                        onClick={() => {
                                            onClearBills();
                                            setMenuOpen(false);
                                        }}
                                    >
                                        <Receipt size={14} color="#d97706" /> Clear Bills
                                    </button>
                                )}
                                {!r.exit_time && accommodation && !r.cleared_by_house_keeping?.is_cleared && (
                                    <button
                                        className="vg-menu-item"
                                        onClick={() => {
                                            onClearHousekeeping();
                                            setMenuOpen(false);
                                        }}
                                    >
                                        <Shield size={14} color="#93723c" /> Housekeeping
                                    </button>
                                )}
                                {!r.exit_time && accommodation && (!r.cleared_bills?.is_cleared || !r.cleared_by_house_keeping?.is_cleared) && (
                                    <button
                                        className="vg-menu-item"
                                        onClick={() => {
                                            onClearBoth();
                                            setMenuOpen(false);
                                        }}
                                    >
                                        <CheckCircle2 size={14} color="#059669" /> Clear Bills & HK
                                    </button>
                                )}
                                {!r.exit_time && (
                                    <button
                                        className="vg-menu-item danger"
                                        onClick={() => {
                                            onCheckOut();
                                            setMenuOpen(false);
                                        }}
                                    >
                                        <LogOut size={14} /> Check Out
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
    onUnclearBills,
    onClearHousekeeping,
    onUnclearHousekeeping,
    onClearBoth,
}: {
    guest: GuestReservation;
    onClose: () => void;
    onCheckOut: () => void;
    onClearBills: () => void;
    onUnclearBills: () => void;
    onClearHousekeeping: () => void;
    onUnclearHousekeeping: () => void;
    onClearBoth: () => void;
}) {
    const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
    const [visitHistory, setVisitHistory] = useState<GuestReservation[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [historyFetched, setHistoryFetched] = useState(false);

    const name = getGuestDisplayName(guest);
    const duration = getHoursSpent(guest.entry_time, guest.exit_time);
    const overdue = isOverdue(guest);
    const vip = isVIP(guest);
    const totalPax = (guest.adults_count ?? 0) + (guest.kids_count ?? 0);
    const stayNights =
        guest.check_in && guest.check_out ? Math.ceil((new Date(guest.check_out).getTime() - new Date(guest.check_in).getTime()) / 86400000) : null;

    const fetchVisitHistory = useCallback(async () => {
        if (historyFetched) return;
        setIsHistoryLoading(true);
        try {
            const searchName = guest.contact?.institution || name;
            const { data } = await axios.get('/api/guest-reservations', { params: { search: searchName, per_page: 50, has_entry: '1' } });
            const all: GuestReservation[] = data.data ?? data;
            setVisitHistory(all.sort((a, b) => new Date(b.entry_time ?? b.created_at).getTime() - new Date(a.entry_time ?? a.created_at).getTime()));
            setHistoryFetched(true);
        } catch {
            toast.error('Failed to load visit history.');
        } finally {
            setIsHistoryLoading(false);
        }
    }, [guest, name, historyFetched]);

    useEffect(() => {
        if (activeTab === 'history') fetchVisitHistory();
    }, [activeTab, fetchVisitHistory]);

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ background: 'linear-gradient(135deg, #902729, #7a2124)', padding: '24px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: 14,
                                background: 'rgba(255,255,255,0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                                fontWeight: 700,
                                color: 'white',
                            }}
                        >
                            {vip ? <Star size={20} color="gold" /> : getInitials(name)}
                        </div>
                        <div>
                            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1.1 }}>
                                {name}
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 3 }}>#{guest.reservation_number}</p>
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
                        <X size={15} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {guest.exit_time ? (
                        <span
                            style={{
                                background: 'rgba(255,255,255,0.15)',
                                color: 'white',
                                borderRadius: 100,
                                padding: '3px 10px',
                                fontSize: 10,
                                fontWeight: 700,
                            }}
                        >
                            CHECKED OUT
                        </span>
                    ) : overdue ? (
                        <span
                            style={{ background: '#dc2626', color: 'white', borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 700 }}
                        >
                            ⚠ OVERDUE
                        </span>
                    ) : (
                        <span
                            style={{
                                background: 'rgba(34,197,94,0.28)',
                                color: '#4ade80',
                                borderRadius: 100,
                                padding: '3px 10px',
                                fontSize: 10,
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
                            padding: '3px 10px',
                            fontSize: 10,
                            fontWeight: 600,
                        }}
                    >
                        {guest.type.toUpperCase()}
                    </span>
                    {guest.is_express_check_in && (
                        <span
                            style={{
                                background: 'rgba(255,215,0,0.22)',
                                color: '#ffd700',
                                borderRadius: 100,
                                padding: '3px 10px',
                                fontSize: 10,
                                fontWeight: 700,
                            }}
                        >
                            ⚡ EXPRESS
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    {(
                        [
                            { id: 'profile', label: 'Profile' },
                            { id: 'history', label: 'Visit History' },
                        ] as const
                    ).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                fontSize: 13,
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                background: 'none',
                                color: activeTab === tab.id ? 'white' : 'rgba(255,255,255,0.5)',
                                borderBottom: activeTab === tab.id ? '2px solid white' : '2px solid transparent',
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 1,
                    background: 'rgba(147,114,60,0.1)',
                    borderBottom: '1px solid rgba(147,114,60,0.1)',
                }}
            >
                {[
                    { label: 'Time on Property', value: formatDuration(duration), icon: <Clock size={13} /> },
                    { label: 'Party Size', value: `${totalPax} pax`, icon: <Users size={13} /> },
                    {
                        label: stayNights ? 'Planned Stay' : 'Section',
                        value: stayNights ? `${stayNights}n` : getSectionLabel(guest.section),
                        icon: stayNights ? <Calendar size={13} /> : <MapPin size={13} />,
                    },
                ].map((s, i) => (
                    <div key={i} style={{ background: 'white', padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ color: '#93723c', display: 'flex', justifyContent: 'center', marginBottom: 3 }}>{s.icon}</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 700, color: '#902729' }}>{s.value}</div>
                        <div
                            style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: '#9a8060',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginTop: 1,
                            }}
                        >
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            {activeTab === 'profile' && (
                <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                        {!guest.exit_time && (
                            <button className="vg-btn vg-btn-primary" style={{ flex: '1 1 auto', justifyContent: 'center' }} onClick={onCheckOut}>
                                <LogOut size={13} /> Check Out
                            </button>
                        )}
                        {!guest.exit_time && !guest.cleared_bills?.is_cleared && (
                            <button className="vg-btn vg-btn-gold" style={{ flex: '1 1 auto', justifyContent: 'center' }} onClick={onClearBills}>
                                <Receipt size={13} /> Clear Bills
                            </button>
                        )}
                        {!guest.exit_time && isAccommodation(guest.section) && !guest.cleared_by_house_keeping?.is_cleared && (
                            <button
                                className="vg-btn vg-btn-outline"
                                style={{ flex: '1 1 auto', justifyContent: 'center' }}
                                onClick={onClearHousekeeping}
                            >
                                <Shield size={13} /> Housekeeping
                            </button>
                        )}
                        {!guest.exit_time &&
                            isAccommodation(guest.section) &&
                            (!guest.cleared_bills?.is_cleared || !guest.cleared_by_house_keeping?.is_cleared) && (
                                <button className="vg-btn vg-btn-green" style={{ flex: '1 1 auto', justifyContent: 'center' }} onClick={onClearBoth}>
                                    <CheckCircle2 size={13} /> Clear Both
                                </button>
                            )}
                    </div>

                    {[
                        {
                            title: 'Guest Information',
                            rows: [
                                { label: 'Full Name', value: name, icon: <User size={12} /> },
                                guest.contact?.institution
                                    ? { label: 'Institution', value: guest.contact.institution, icon: <Building2 size={12} /> }
                                    : null,
                                guest.contact_person?.email ? { label: 'Email', value: guest.contact_person.email, icon: <Phone size={12} /> } : null,
                                guest.phone_number ? { label: 'Phone', value: guest.phone_number, icon: <Phone size={12} /> } : null,
                                { label: 'Type', value: guest.type.charAt(0).toUpperCase() + guest.type.slice(1), icon: <Briefcase size={12} /> },
                                { label: 'Entry Method', value: guest.entry_type?.replace(/_/g, ' ') ?? '—', icon: <UserCheck size={12} /> },
                                guest.car_plate_number ? { label: 'Vehicle', value: guest.car_plate_number, icon: <Car size={12} /> } : null,
                                guest.dream_pass_code ? { label: 'DreamPass Code', value: guest.dream_pass_code, icon: <Star size={12} /> } : null,
                            ].filter(Boolean),
                        },
                    ].map((section: any, si) => (
                        <div key={si} style={{ marginBottom: 20 }}>
                            <h4
                                style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: '#1a0e06',
                                    marginBottom: 10,
                                    paddingBottom: 8,
                                    borderBottom: '2px solid rgba(147,114,60,0.12)',
                                }}
                            >
                                {section.title}
                            </h4>
                            {section.rows.map((row: any, i: number) => (
                                <div key={i} className="vg-info-row">
                                    <span className="vg-info-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ color: '#93723c' }}>{row.icon}</span>
                                        {row.label}
                                    </span>
                                    <span className="vg-info-val">{row.value}</span>
                                </div>
                            ))}
                        </div>
                    ))}

                    <div style={{ marginBottom: 20 }}>
                        <h4
                            style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#1a0e06',
                                marginBottom: 10,
                                paddingBottom: 8,
                                borderBottom: '2px solid rgba(147,114,60,0.12)',
                            }}
                        >
                            Visit Timeline
                        </h4>
                        <div style={{ position: 'relative', paddingLeft: 18 }}>
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 6,
                                    top: 8,
                                    bottom: 8,
                                    width: 2,
                                    background: 'linear-gradient(to bottom, #902729, #93723c, rgba(147,114,60,0.15))',
                                }}
                            />
                            {[
                                guest.check_in
                                    ? { time: formatDateTime(guest.check_in), label: 'Scheduled Check-In', color: '#1a5fa8', dot: '#1a5fa8' }
                                    : null,
                                guest.entry_time
                                    ? {
                                          time: formatDateTime(guest.entry_time),
                                          label: `Arrived${guest.is_express_check_in ? ' (Express)' : ''}`,
                                          color: '#059669',
                                          dot: '#059669',
                                      }
                                    : null,
                                !guest.exit_time && overdue
                                    ? { time: formatDate(guest.check_out), label: 'Scheduled Check-Out (OVERDUE)', color: '#dc2626', dot: '#dc2626' }
                                    : null,
                                !guest.exit_time && !overdue && guest.check_out
                                    ? { time: formatDate(guest.check_out), label: 'Scheduled Check-Out', color: '#d97706', dot: '#d97706' }
                                    : null,
                                guest.exit_time
                                    ? { time: formatDateTime(guest.exit_time), label: 'Checked Out', color: '#6b7280', dot: '#6b7280' }
                                    : null,
                            ]
                                .filter(Boolean)
                                .map((evt: any, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, paddingLeft: 14, position: 'relative' }}>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: -7,
                                                top: 4,
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                background: evt.dot,
                                                border: '2px solid white',
                                                boxShadow: `0 0 0 2px ${evt.dot}30`,
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

                    <div style={{ marginBottom: 20 }}>
                        <h4
                            style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#1a0e06',
                                marginBottom: 10,
                                paddingBottom: 8,
                                borderBottom: '2px solid rgba(147,114,60,0.12)',
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
                                icon: <Receipt size={14} />,
                                onClear: onClearBills,
                                onUnclear: onUnclearBills,
                                show: true,
                            },
                            {
                                title: 'Housekeeping',
                                cleared: guest.cleared_by_house_keeping?.is_cleared,
                                comments: guest.cleared_by_house_keeping?.comments,
                                clearedBy: guest.cleared_by_house_keeping_user?.name,
                                icon: <Shield size={14} />,
                                onClear: onClearHousekeeping,
                                onUnclear: onUnclearHousekeeping,
                                show: isAccommodation(guest.section),
                            },
                        ]
                            .filter((s) => s.show)
                            .map((s, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: s.cleared ? 'rgba(5,150,105,0.04)' : 'rgba(217,119,6,0.04)',
                                        border: `1px solid ${s.cleared ? 'rgba(5,150,105,0.16)' : 'rgba(217,119,6,0.16)'}`,
                                        borderRadius: 12,
                                        padding: '12px 14px',
                                        marginBottom: 10,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: s.cleared ? '#059669' : '#d97706' }}>
                                            {s.icon}
                                            <span style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</span>
                                        </div>
                                        <select
                                            value={s.cleared ? 'cleared' : 'pending'}
                                            onChange={(e) => {
                                                if (e.target.value === 'cleared') s.onClear();
                                                else s.onUnclear();
                                            }}
                                            disabled={!!guest.exit_time}
                                            className="vg-input vg-select"
                                            style={{
                                                width: 'auto',
                                                padding: '3px 26px 3px 9px',
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: s.cleared ? '#059669' : '#d97706',
                                                opacity: guest.exit_time ? 0.5 : 1,
                                                cursor: guest.exit_time ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            <option value="cleared">✓ Cleared</option>
                                            <option value="pending">⏳ Pending</option>
                                        </select>
                                    </div>
                                    {s.clearedBy && <p style={{ fontSize: 11, color: '#9a8060' }}>By: {s.clearedBy}</p>}
                                    {s.comments && (
                                        <p style={{ fontSize: 11, color: '#6a5030', marginTop: 4, fontStyle: 'italic' }}>"{s.comments}"</p>
                                    )}
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
                                    marginBottom: 10,
                                    paddingBottom: 8,
                                    borderBottom: '2px solid rgba(147,114,60,0.12)',
                                }}
                            >
                                Staff
                            </h4>
                            <div className="vg-info-row">
                                <span className="vg-info-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <UserCheck size={12} style={{ color: '#93723c' }} />
                                    Checked In By
                                </span>
                                <span className="vg-info-val">{guest.checked_in_by_user.name}</span>
                            </div>
                            <div className="vg-info-row">
                                <span className="vg-info-label">Reservation Created</span>
                                <span className="vg-info-val">{formatDateTime(guest.created_at)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div>
                            <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 700, color: '#1a0e06' }}>All Visits</h4>
                            <p style={{ fontSize: 12, color: '#9a8060', marginTop: 2 }}>Complete visit history for {name}</p>
                        </div>
                        {historyFetched && (
                            <div
                                style={{
                                    background: '#902729',
                                    color: 'white',
                                    borderRadius: 100,
                                    padding: '3px 12px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                }}
                            >
                                {visitHistory.length} visits
                            </div>
                        )}
                    </div>
                    {isHistoryLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: '50%',
                                    border: '3px solid rgba(147,114,60,0.18)',
                                    borderTopColor: '#93723c',
                                }}
                            />
                        </div>
                    ) : visitHistory.length === 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: 160,
                                gap: 8,
                            }}
                        >
                            <History size={36} opacity={0.3} color="#c4a87a" />
                            <p style={{ fontSize: 13, color: '#c4a87a' }}>No visit history found</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {visitHistory.map((visit, idx) => {
                                const isCurrentVisit = visit.id === guest.id;
                                const visitDuration = getHoursSpent(visit.entry_time, visit.exit_time);
                                const visitOverdue = isOverdue(visit);
                                return (
                                    <motion.div
                                        key={visit.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.04 }}
                                        className="vg-visit-card"
                                        style={{
                                            borderColor: isCurrentVisit ? 'rgba(144,39,41,0.3)' : undefined,
                                            background: isCurrentVisit ? 'rgba(144,39,41,0.03)' : undefined,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {isCurrentVisit && (
                                                    <span
                                                        style={{
                                                            fontSize: 9,
                                                            fontWeight: 800,
                                                            background: '#902729',
                                                            color: 'white',
                                                            borderRadius: 4,
                                                            padding: '2px 6px',
                                                        }}
                                                    >
                                                        CURRENT
                                                    </span>
                                                )}
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#1a0e06' }}>#{visit.reservation_number}</span>
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: visit.exit_time ? '#6b7280' : visitOverdue ? '#dc2626' : '#059669',
                                                    background: visit.exit_time
                                                        ? 'rgba(107,114,128,0.1)'
                                                        : visitOverdue
                                                          ? 'rgba(220,38,38,0.08)'
                                                          : 'rgba(5,150,105,0.1)',
                                                    borderRadius: 100,
                                                    padding: '2px 8px',
                                                }}
                                            >
                                                {visit.exit_time ? 'Completed' : visitOverdue ? 'Overdue' : 'Active'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                                            {[
                                                { label: 'Entry', value: formatDateTime(visit.entry_time) },
                                                { label: 'Exit', value: visit.exit_time ? formatDateTime(visit.exit_time) : '—' },
                                                { label: 'Duration', value: formatDuration(visitDuration) },
                                                { label: 'Section', value: getSectionLabel(visit.section) },
                                                { label: 'Party', value: `${(visit.adults_count ?? 0) + (visit.kids_count ?? 0)} guests` },
                                                {
                                                    label: 'Bills',
                                                    value: visit.cleared_bills?.is_cleared ? '✓ Cleared' : 'Pending',
                                                    color: visit.cleared_bills?.is_cleared ? '#059669' : '#d97706',
                                                },
                                            ].map((item: any, i) => (
                                                <div key={i}>
                                                    <p
                                                        style={{
                                                            fontSize: 10,
                                                            color: '#9a8060',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.06em',
                                                        }}
                                                    >
                                                        {item.label}
                                                    </p>
                                                    <p style={{ fontSize: 12, color: item.color ?? '#3d2c1a', fontWeight: 500 }}>{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {visit.dream_pass_code && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 5,
                                                    paddingTop: 8,
                                                    marginTop: 6,
                                                    borderTop: '1px solid rgba(147,114,60,0.08)',
                                                }}
                                            >
                                                <Star size={11} color="#93723c" />
                                                <span style={{ fontSize: 11, color: '#93723c', fontWeight: 600 }}>
                                                    DreamPass: {visit.dream_pass_code}
                                                </span>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
