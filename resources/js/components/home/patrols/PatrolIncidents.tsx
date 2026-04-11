import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Camera, CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin, RefreshCw, Search, Shield, User, X, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface Incident {
    id: number;
    patrol_id: number;
    guard_id: string;
    check_point_id: number | null;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'resolved';
    reported_at: string;
    resolved_at: string | null;
    resolution_notes: string | null;
    photos: string[] | null;
    patrol_guard: { id: string; name: string };
    patrol: { id: number; shift: { name: string; formatted_start_time: string; formatted_end_time: string } };
    checkpoint: { id: number; point_name: string; location: string } | null;
    resolved_by: { id: string; name: string } | null;
}

interface Aggregations {
    total: number;
    open: number;
    investigating: number;
    resolved: number;
    critical: number;
    high: number;
}

const severityConfig = {
    low: { label: 'Low', color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)', dot: '#059669' },
    medium: { label: 'Medium', color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)', dot: '#d97706' },
    high: { label: 'High', color: '#ea580c', bg: 'rgba(234,88,12,0.08)', border: 'rgba(234,88,12,0.2)', dot: '#ea580c' },
    critical: { label: 'Critical', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)', dot: '#dc2626' },
};

const statusConfig = {
    open: { label: 'Open', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)' },
    investigating: { label: 'Investigating', color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)' },
    resolved: { label: 'Resolved', color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)' },
};

const formatDateTime = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name: string) =>
    name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

export default function PatrolIncidents() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [aggregations, setAggregations] = useState<Aggregations | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [isFetching, setIsFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [activeQuickFilter, setActiveQuickFilter] = useState('open');
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [resolveTarget, setResolveTarget] = useState<Incident | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const fetchIncidents = useCallback(
        async (page = 1) => {
            setIsFetching(true);
            try {
                const params: Record<string, string> = { page: page.toString(), per_page: '20' };
                if (filterSeverity) params.severity = filterSeverity;
                if (filterStatus) params.status = filterStatus;
                if (filterDate) params.date = filterDate;
                if (searchQuery.trim()) params.search = searchQuery.trim();

                const [incRes, aggRes] = await Promise.all([
                    axios.get('/api/patrol-incidents', { params }),
                    axios.get('/api/patrol-incidents/aggregations', { params }),
                ]);
                const data = incRes.data;
                setIncidents(data.data ?? data);
                setTotalCount(data.total ?? (data.data ?? data).length);
                setCurrentPage(data.current_page ?? 1);
                setLastPage(data.last_page ?? 1);
                setAggregations(aggRes.data);
            } catch {
                toast.error('Failed to load incidents.');
            } finally {
                setIsFetching(false);
            }
        },
        [filterSeverity, filterStatus, filterDate, searchQuery],
    );

    useEffect(() => {
        fetchIncidents(1);
    }, [fetchIncidents]);

    const handleQuickFilter = (key: string, status: string) => {
        setActiveQuickFilter(key);
        setFilterStatus(status);
    };

    const handleUpdateStatus = async (incident: Incident, status: string) => {
        try {
            await axios.patch(`/api/patrol-incidents/${incident.id}/status`, { status });
            toast.success(`Status updated to ${status}.`);
            fetchIncidents(currentPage);
            if (selectedIncident?.id === incident.id) {
                setSelectedIncident((p) => (p ? { ...p, status: status as any } : p));
            }
        } catch {
            toast.error('Failed to update status.');
        }
    };

    const handleResolve = async () => {
        if (!resolveTarget) return;
        setIsSubmitting(true);
        try {
            const res = await axios.patch(`/api/patrol-incidents/${resolveTarget.id}/resolve`, {
                resolved_by_user_id: resolveTarget.guard_id,
                resolution_notes: resolutionNotes,
            });
            toast.success('Incident marked as resolved.');
            setIsResolveModalOpen(false);
            setResolutionNotes('');
            fetchIncidents(currentPage);
            if (selectedIncident?.id === resolveTarget.id) setSelectedIncident(res.data);
        } catch {
            toast.error('Failed to resolve incident.');
        } finally {
            setIsSubmitting(false);
            setResolveTarget(null);
        }
    };

    const sortedIncidents = useMemo(() => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return [...incidents].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
    }, [incidents]);

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
                .inc-row { transition: background 0.15s; border-bottom: 1px solid rgba(147,114,60,0.08); cursor: pointer; }
                .inc-row:hover { background: rgba(147,114,60,0.04); }
                .action-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; padding: 7px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: all 0.15s; cursor: pointer; border: none; }
                .btn-primary { background: linear-gradient(135deg, #902729, #b83a3c); color: white; }
                .btn-primary:hover { box-shadow: 0 4px 12px rgba(144,39,41,0.35); transform: translateY(-1px); }
                .btn-gold { background: linear-gradient(135deg, #93723c, #b8914d); color: white; }
                .btn-gold:hover { box-shadow: 0 4px 12px rgba(147,114,60,0.35); transform: translateY(-1px); }
                .btn-green { background: linear-gradient(135deg, #059669, #047857); color: white; }
                .btn-green:hover { box-shadow: 0 4px 12px rgba(5,150,105,0.35); transform: translateY(-1px); }
                .btn-outline { background: white; color: #5a4a3a; border: 1.5px solid rgba(147,114,60,0.25); }
                .btn-outline:hover { border-color: #93723c; color: #93723c; }
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
                .modal-box { background: white; border-radius: 20px; padding: 28px; width: 480px; max-width: 92vw; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
                .input-styled { width: 100%; border-radius: 10px; border: 1.5px solid rgba(147,114,60,0.2); background: white; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #2d1f0e; outline: none; transition: border 0.15s; box-sizing: border-box; }
                .input-styled:focus { border-color: #93723c; box-shadow: 0 0 0 3px rgba(147,114,60,0.1); }
                .select-styled { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2393723c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
                .th-cell { padding: 13px 16px; text-align: left; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.85); white-space: nowrap; }
                .td-cell { padding: 14px 16px; vertical-align: middle; }
                .badge-pill { display: inline-flex; align-items: center; gap: 4px; border-radius: 100px; padding: 3px 10px; font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; }
                .filter-pill { border-radius: 100px; border: 1.5px solid rgba(147,114,60,0.25); background: white; transition: all 0.15s; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 6px 14px; color: #5a4a3a; }
                .filter-pill:hover { border-color: #93723c; color: #93723c; }
                .filter-pill.active { background: #93723c; border-color: #93723c; color: white; }
                .filter-pill.active-red { background: #902729; border-color: #902729; color: white; }
                .filter-pill.active-amber { background: #d97706; border-color: #d97706; color: white; }
                .side-panel { position: fixed; right: 0; top: 0; height: 100vh; width: 440px; background: white; box-shadow: -8px 0 40px rgba(0,0,0,0.12); z-index: 100; overflow-y: auto; border-left: 1px solid rgba(147,114,60,0.15); }
                .panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 99; backdrop-filter: blur(2px); }
                .info-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid rgba(147,114,60,0.08); gap: 12px; }
                .info-label { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: #9a8060; flex-shrink: 0; }
                .info-value { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #2d1f0e; text-align: right; }
                .pag-btn { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1.5px solid rgba(147,114,60,0.2); background: white; cursor: pointer; transition: all 0.15s; color: #6a5030; }
                .pag-btn:hover:not(:disabled) { border-color: #93723c; color: #93723c; }
                .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .pag-btn.active { background: #93723c; border-color: #93723c; color: white; }
                .status-btn { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; border: 1.5px solid transparent; cursor: pointer; transition: all 0.14s; }
                .photo-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 10px; border: 1.5px solid rgba(147,114,60,0.15); cursor: pointer; transition: transform 0.15s; }
                .photo-thumb:hover { transform: scale(1.05); }
                textarea.input-styled { resize: vertical; min-height: 80px; }
                .scrollbar-thin::-webkit-scrollbar { width: 4px; } .scrollbar-thin::-webkit-scrollbar-track { background: transparent; } .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(147,114,60,0.3); border-radius: 2px; }
                .critical-pulse { animation: cpulse 2s infinite; }
                @keyframes cpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.3); } 50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); } }
            `}</style>

            <div className="mx-auto w-full px-6 py-8">
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 flex items-center gap-3">
                                <div className="brand-grad flex h-10 w-10 items-center justify-center rounded-xl">
                                    <AlertTriangle size={20} color="white" />
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
                                    Incident Management
                                </h1>
                            </div>
                            <p className="dm ml-1 text-sm text-stone-500">Review, investigate and resolve patrol incidents</p>
                        </div>
                        <button className="action-btn btn-outline" onClick={() => fetchIncidents(currentPage)}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
                >
                    {[
                        { label: 'Total', value: aggregations?.total ?? 0, icon: <Shield size={16} />, color: '#902729', bg: 'rgba(144,39,41,0.07)' },
                        {
                            label: 'Open',
                            value: aggregations?.open ?? 0,
                            icon: <AlertTriangle size={16} />,
                            color: '#dc2626',
                            bg: 'rgba(220,38,38,0.07)',
                        },
                        {
                            label: 'Investigating',
                            value: aggregations?.investigating ?? 0,
                            icon: <Zap size={16} />,
                            color: '#d97706',
                            bg: 'rgba(217,119,6,0.07)',
                        },
                        {
                            label: 'Resolved',
                            value: aggregations?.resolved ?? 0,
                            icon: <CheckCircle2 size={16} />,
                            color: '#059669',
                            bg: 'rgba(5,150,105,0.07)',
                        },
                        {
                            label: 'Critical',
                            value: aggregations?.critical ?? 0,
                            icon: <AlertTriangle size={16} />,
                            color: '#dc2626',
                            bg: 'rgba(220,38,38,0.07)',
                        },
                        {
                            label: 'High',
                            value: aggregations?.high ?? 0,
                            icon: <AlertTriangle size={16} />,
                            color: '#ea580c',
                            bg: 'rgba(234,88,12,0.07)',
                        },
                    ].map((card, i) => (
                        <div key={i} className="stat-card flex flex-col gap-2 p-4">
                            <div className="flex items-center justify-between">
                                <span className="dm text-xs font-semibold tracking-wider text-stone-400 uppercase">{card.label}</span>
                                <div style={{ color: card.color, background: card.bg, borderRadius: 8, padding: 5 }}>{card.icon}</div>
                            </div>
                            <div
                                style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 28, lineHeight: 1, color: card.color }}
                            >
                                {card.value}
                            </div>
                        </div>
                    ))}
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="mb-4 flex flex-wrap gap-2">
                    {[
                        { key: 'open', label: '🔴 Open', status: 'open', cls: 'active-red' },
                        { key: 'investigating', label: '🟡 Investigating', status: 'investigating', cls: 'active-amber' },
                        { key: 'resolved', label: '✅ Resolved', status: 'resolved', cls: 'active' },
                        { key: 'all', label: 'All Incidents', status: '', cls: 'active' },
                    ].map((q) => (
                        <button
                            key={q.key}
                            onClick={() => handleQuickFilter(q.key, q.status)}
                            className={`filter-pill ${activeQuickFilter === q.key ? q.cls : ''}`}
                        >
                            {q.label}
                        </button>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-5 flex flex-wrap gap-3"
                >
                    <div className="relative flex-1" style={{ maxWidth: 320 }}>
                        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9a8060' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search incidents…"
                            className="input-styled"
                            style={{ paddingLeft: 32 }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute',
                                    right: 9,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    color: '#9a8060',
                                }}
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        className="input-styled select-styled"
                        style={{ width: 150 }}
                    >
                        <option value="">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>

                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="input-styled"
                        style={{ width: 165 }}
                    />

                    {filterDate && (
                        <button onClick={() => setFilterDate('')} className="filter-pill flex items-center gap-1.5">
                            <X size={11} /> Clear Date
                        </button>
                    )}
                </motion.div>

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
                    ) : sortedIncidents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: 280, color: '#c4a87a' }}>
                            <AlertTriangle size={44} opacity={0.25} />
                            <p className="dm text-sm font-medium" style={{ color: '#c4a87a' }}>
                                No incidents found
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'linear-gradient(135deg, #902729, #7a2124)' }}>
                                        {['Severity', 'Incident', 'Guard', 'Location', 'Patrol Shift', 'Reported', 'Status', 'Actions'].map(
                                            (h, i) => (
                                                <th key={i} className="th-cell">
                                                    {h}
                                                </th>
                                            ),
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedIncidents.map((inc, idx) => {
                                        const sev = severityConfig[inc.severity];
                                        const sta = statusConfig[inc.status];
                                        return (
                                            <motion.tr
                                                key={inc.id}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.025 }}
                                                className="inc-row"
                                                style={{
                                                    background:
                                                        inc.severity === 'critical' && inc.status !== 'resolved'
                                                            ? 'rgba(220,38,38,0.025)'
                                                            : undefined,
                                                }}
                                                onClick={() => {
                                                    setSelectedIncident(inc);
                                                    setIsPanelOpen(true);
                                                }}
                                            >
                                                <td className="td-cell">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            style={{ width: 10, height: 10, borderRadius: '50%', background: sev.dot, flexShrink: 0 }}
                                                            className={
                                                                inc.severity === 'critical' && inc.status !== 'resolved' ? 'critical-pulse' : ''
                                                            }
                                                        />
                                                        <span
                                                            className="badge-pill"
                                                            style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}
                                                        >
                                                            {sev.label.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="td-cell" style={{ maxWidth: 260 }}>
                                                    <p className="dm text-sm font-semibold" style={{ color: '#1a0e06' }}>
                                                        {inc.title}
                                                    </p>
                                                    <p
                                                        className="dm mt-0.5 text-xs"
                                                        style={{
                                                            color: '#9a8060',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: 240,
                                                        }}
                                                    >
                                                        {inc.description}
                                                    </p>
                                                    {inc.photos && inc.photos.length > 0 && (
                                                        <div className="mt-1 flex items-center gap-1">
                                                            <Camera size={10} color="#93723c" />
                                                            <span className="dm" style={{ fontSize: 10, color: '#93723c', fontWeight: 600 }}>
                                                                {inc.photos.length} photo{inc.photos.length > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="td-cell">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 10,
                                                                background: 'rgba(144,39,41,0.08)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: 11,
                                                                fontWeight: 700,
                                                                fontFamily: "'DM Sans', sans-serif",
                                                                color: '#902729',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {getInitials(inc.patrol_guard?.name ?? '?')}
                                                        </div>
                                                        <span className="dm text-sm font-medium" style={{ color: '#3d2c1a' }}>
                                                            {inc.patrol_guard?.name ?? '—'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="td-cell">
                                                    {inc.checkpoint ? (
                                                        <div>
                                                            <p className="dm text-sm font-semibold" style={{ color: '#3d2c1a' }}>
                                                                {inc.checkpoint.point_name}
                                                            </p>
                                                            <div className="mt-0.5 flex items-center gap-1">
                                                                <MapPin size={10} color="#93723c" />
                                                                <span className="dm text-xs" style={{ color: '#9a8060' }}>
                                                                    {inc.checkpoint.location}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="dm text-xs" style={{ color: '#c4a87a' }}>
                                                            No checkpoint
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="td-cell">
                                                    <span className="dm text-sm" style={{ color: '#3d2c1a' }}>
                                                        {inc.patrol?.shift?.name ?? '—'}
                                                    </span>
                                                    {inc.patrol?.shift && (
                                                        <p className="dm text-xs" style={{ color: '#9a8060' }}>
                                                            {inc.patrol.shift.formatted_start_time} – {inc.patrol.shift.formatted_end_time}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="td-cell">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock size={11} color="#93723c" />
                                                        <span className="dm text-sm" style={{ color: '#3d2c1a' }}>
                                                            {formatDateTime(inc.reported_at)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="td-cell">
                                                    <span
                                                        className="badge-pill"
                                                        style={{ background: sta.bg, color: sta.color, border: `1px solid ${sta.border}` }}
                                                    >
                                                        {sta.label.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="td-cell" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-2">
                                                        {inc.status === 'open' && (
                                                            <button
                                                                className="action-btn btn-gold"
                                                                style={{ padding: '5px 10px', fontSize: 11 }}
                                                                onClick={() => handleUpdateStatus(inc, 'investigating')}
                                                            >
                                                                Investigate
                                                            </button>
                                                        )}
                                                        {inc.status !== 'resolved' && (
                                                            <button
                                                                className="action-btn btn-green"
                                                                style={{ padding: '5px 10px', fontSize: 11 }}
                                                                onClick={() => {
                                                                    setResolveTarget(inc);
                                                                    setIsResolveModalOpen(true);
                                                                }}
                                                            >
                                                                Resolve
                                                            </button>
                                                        )}
                                                        {inc.status === 'resolved' && (
                                                            <span className="dm text-xs" style={{ color: '#059669', fontWeight: 600 }}>
                                                                ✓ Done
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!isFetching && lastPage > 1 && (
                        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid rgba(147,114,60,0.1)' }}>
                            <span className="dm text-xs text-stone-400">
                                Page <strong>{currentPage}</strong> of <strong>{lastPage}</strong> &bull; <strong>{totalCount}</strong> records
                            </span>
                            <div className="flex gap-1">
                                <button className="pag-btn" disabled={currentPage <= 1} onClick={() => fetchIncidents(currentPage - 1)}>
                                    <ChevronLeft size={14} />
                                </button>
                                {Array.from({ length: Math.min(5, lastPage) }, (_, i) => {
                                    const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                                    if (page < 1 || page > lastPage) return null;
                                    return (
                                        <button
                                            key={page}
                                            className={`pag-btn dm text-xs font-semibold ${page === currentPage ? 'active' : ''}`}
                                            onClick={() => fetchIncidents(page)}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                                <button className="pag-btn" disabled={currentPage >= lastPage} onClick={() => fetchIncidents(currentPage + 1)}>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            <AnimatePresence>
                {isPanelOpen && selectedIncident && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="panel-overlay"
                            onClick={() => setIsPanelOpen(false)}
                        />
                        <motion.div
                            initial={{ x: 440 }}
                            animate={{ x: 0 }}
                            exit={{ x: 440 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="side-panel scrollbar-thin"
                        >
                            <IncidentDetailPanel
                                incident={selectedIncident}
                                onClose={() => setIsPanelOpen(false)}
                                onInvestigate={() => {
                                    handleUpdateStatus(selectedIncident, 'investigating');
                                    setIsPanelOpen(false);
                                }}
                                onResolve={() => {
                                    setResolveTarget(selectedIncident);
                                    setIsResolveModalOpen(true);
                                }}
                                onPhotoClick={(url) => setPhotoPreview(url)}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isResolveModalOpen && resolveTarget && (
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
                                    <CheckCircle2 size={20} color="#059669" />
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 700, color: '#1a0e06' }}>
                                        Resolve Incident
                                    </h3>
                                    <p className="dm text-xs text-stone-400">{resolveTarget.title}</p>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(147,114,60,0.05)', borderRadius: 12, padding: '10px 14px', marginBottom: 18 }}>
                                <p className="dm text-xs font-semibold" style={{ color: '#6a5030' }}>
                                    Reported by <strong>{resolveTarget.patrol_guard?.name}</strong>
                                </p>
                                <p className="dm text-xs" style={{ color: '#9a8060', marginTop: 2 }}>
                                    {formatDateTime(resolveTarget.reported_at)}
                                </p>
                            </div>
                            <div className="mb-5">
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
                                    Resolution Notes
                                </label>
                                <textarea
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    placeholder="Describe how the incident was resolved, actions taken…"
                                    className="input-styled"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    className="action-btn btn-outline flex-1 justify-center"
                                    onClick={() => {
                                        setIsResolveModalOpen(false);
                                        setResolutionNotes('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button className="action-btn btn-green flex-1 justify-center" onClick={handleResolve} disabled={isSubmitting}>
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
                                        <CheckCircle2 size={14} />
                                    )}
                                    Mark Resolved
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {photoPreview && (
                    <motion.div
                        className="modal-overlay"
                        style={{ zIndex: 300 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPhotoPreview(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.85 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.85 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ position: 'relative' }}
                        >
                            <img
                                src={photoPreview}
                                alt="Incident"
                                style={{ maxWidth: '88vw', maxHeight: '82vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                            />
                            <button
                                onClick={() => setPhotoPreview(null)}
                                style={{
                                    position: 'absolute',
                                    top: -12,
                                    right: -12,
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                }}
                            >
                                <X size={14} color="#1a0e06" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function IncidentDetailPanel({
    incident,
    onClose,
    onInvestigate,
    onResolve,
    onPhotoClick,
}: {
    incident: Incident;
    onClose: () => void;
    onInvestigate: () => void;
    onResolve: () => void;
    onPhotoClick: (url: string) => void;
}) {
    const sev = severityConfig[incident.severity];
    const sta = statusConfig[incident.status];

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ background: `linear-gradient(135deg, ${sev.dot}, ${sev.dot}cc)`, padding: '24px 20px 20px' }}>
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                borderRadius: 14,
                                background: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <AlertTriangle size={22} color="white" />
                        </div>
                        <div>
                            <h2
                                style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    fontSize: 20,
                                    fontWeight: 700,
                                    color: 'white',
                                    lineHeight: 1.2,
                                    maxWidth: 280,
                                }}
                            >
                                {incident.title}
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 3 }}>Patrol #{incident.patrol_id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            background: 'rgba(255,255,255,0.18)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            flexShrink: 0,
                        }}
                    >
                        <X size={15} />
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span
                        style={{
                            background: 'rgba(255,255,255,0.22)',
                            color: 'white',
                            borderRadius: 100,
                            padding: '4px 12px',
                            fontSize: 11,
                            fontWeight: 700,
                        }}
                    >
                        {sev.label.toUpperCase()} SEVERITY
                    </span>
                    <span
                        style={{
                            background: sta.bg,
                            color: sta.color,
                            borderRadius: 100,
                            padding: '4px 12px',
                            fontSize: 11,
                            fontWeight: 700,
                            border: `1px solid ${sta.border}`,
                        }}
                    >
                        {sta.label.toUpperCase()}
                    </span>
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 1,
                    background: 'rgba(147,114,60,0.1)',
                    borderBottom: '1px solid rgba(147,114,60,0.12)',
                }}
            >
                {[
                    { label: 'Reported', value: formatDateTime(incident.reported_at), icon: <Clock size={13} /> },
                    { label: 'Guard', value: incident.patrol_guard?.name ?? '—', icon: <User size={13} /> },
                ].map((s, i) => (
                    <div key={i} style={{ background: 'white', padding: '13px 14px', textAlign: 'center' }}>
                        <div style={{ color: '#93723c', display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 700, color: '#902729', lineHeight: 1.2 }}>
                            {s.value}
                        </div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#9a8060',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginTop: 3,
                            }}
                        >
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ padding: 20 }}>
                {incident.status !== 'resolved' && (
                    <div className="mb-5 flex flex-wrap gap-2">
                        {incident.status === 'open' && (
                            <button className="action-btn btn-gold flex-1 justify-center" onClick={onInvestigate}>
                                <Zap size={13} /> Start Investigation
                            </button>
                        )}
                        <button className="action-btn btn-green flex-1 justify-center" onClick={onResolve}>
                            <CheckCircle2 size={13} /> Resolve
                        </button>
                    </div>
                )}

                <SectionHeader title="Incident Details" />
                <div className="mb-5">
                    <div
                        style={{
                            background: 'rgba(147,114,60,0.05)',
                            borderRadius: 12,
                            padding: '14px 16px',
                            border: '1px solid rgba(147,114,60,0.12)',
                            marginBottom: 12,
                        }}
                    >
                        <p className="dm text-sm" style={{ color: '#3d2c1a', lineHeight: 1.6 }}>
                            {incident.description}
                        </p>
                    </div>
                    {[
                        {
                            label: 'Severity',
                            value: (
                                <span className="badge-pill" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
                                    {sev.label}
                                </span>
                            ),
                        },
                        {
                            label: 'Status',
                            value: (
                                <span className="badge-pill" style={{ background: sta.bg, color: sta.color, border: `1px solid ${sta.border}` }}>
                                    {sta.label}
                                </span>
                            ),
                        },
                        { label: 'Patrol Shift', value: incident.patrol?.shift?.name ?? '—' },
                        incident.checkpoint && { label: 'Checkpoint', value: incident.checkpoint.point_name },
                        incident.checkpoint && { label: 'Location', value: incident.checkpoint.location },
                    ]
                        .filter(Boolean)
                        .map((row: any, i) => (
                            <div key={i} className="info-row">
                                <span className="info-label">{row.label}</span>
                                <span className="info-value">{row.value}</span>
                            </div>
                        ))}
                </div>

                {incident.photos && incident.photos.length > 0 && (
                    <div className="mb-5">
                        <SectionHeader title="Photos" />
                        <div className="mt-3 flex flex-wrap gap-2">
                            {incident.photos.map((photo, i) => (
                                <img key={i} src={photo} alt={`Evidence ${i + 1}`} className="photo-thumb" onClick={() => onPhotoClick(photo)} />
                            ))}
                        </div>
                    </div>
                )}

                {incident.status === 'resolved' && (
                    <div className="mb-5">
                        <SectionHeader title="Resolution" />
                        <div
                            style={{
                                background: 'rgba(5,150,105,0.05)',
                                borderRadius: 12,
                                padding: '14px 16px',
                                border: '1px solid rgba(5,150,105,0.15)',
                                marginTop: 12,
                            }}
                        >
                            {incident.resolved_by && (
                                <p className="dm mb-1 text-xs font-semibold" style={{ color: '#059669' }}>
                                    Resolved by {incident.resolved_by.name}
                                </p>
                            )}
                            <p className="dm text-xs" style={{ color: '#9a8060', marginBottom: 6 }}>
                                {formatDateTime(incident.resolved_at ?? undefined)}
                            </p>
                            {incident.resolution_notes && (
                                <p className="dm text-sm" style={{ color: '#3d2c1a', lineHeight: 1.6, fontStyle: 'italic' }}>
                                    "{incident.resolution_notes}"
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SectionHeader({ title }: { title: string }) {
    return (
        <h4
            style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 16,
                fontWeight: 700,
                color: '#1a0e06',
                marginBottom: 4,
                paddingBottom: 8,
                borderBottom: '2px solid rgba(147,114,60,0.15)',
            }}
        >
            {title}
        </h4>
    );
}
