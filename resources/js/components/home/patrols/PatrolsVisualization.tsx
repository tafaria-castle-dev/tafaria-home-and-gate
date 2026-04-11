import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Hash,
    MapPin,
    Moon,
    Navigation,
    RefreshCw,
    ScanLine,
    Search,
    Shield,
    Sun,
    Timer,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface PatrolShift {
    id: number;
    name: string;
    start_time: string;
    end_time: string;
    formatted_start_time: string;
    formatted_end_time: string;
}

interface CheckpointScan {
    id: number;
    patrol_id: number;
    check_point_id: number;
    scanned_at: string;
    checkpoint: {
        id: number;
        point_name: string;
    };
}

interface Patrol {
    id: number;
    guard_id: string;
    shift_id: number;
    status: 'ongoing' | 'completed' | 'missed';
    started_at: string;
    ended_at: string | null;
    notes: string | null;
    duration_minutes: number | null;
    shift: PatrolShift;
    checkpoints: CheckpointScan[];
    guard: { id: string; name: string };
}

interface GuardWithPatrols {
    id: string;
    name: string;
    total_patrols: number;
    ongoing_patrols: number;
    completed_patrols: number;
    missed_patrols: number;
    patrols: Patrol[];
}

interface Aggregations {
    total: number;
    ongoing: number;
    completed: number;
    missed: number;
    total_checkpoints_scanned: number;
    guards_on_patrol: number;
}

const formatDateTime = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatTime = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (mins?: number | null) => {
    if (!mins || mins <= 0) return '—';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h === 0) return `${m} min${m !== 1 ? 's' : ''}`;
    if (m === 0) return `${h} hr${h !== 1 ? 's' : ''}`;
    return `${h} hr${h !== 1 ? 's' : ''}, ${m} min${m !== 1 ? 's' : ''}`;
};

const getInitials = (name: string) =>
    name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

const statusConfig = {
    ongoing: { label: 'Ongoing', color: '#059669', bg: 'rgba(5,150,105,0.09)', border: 'rgba(5,150,105,0.22)', dot: '#059669' },
    completed: { label: 'Completed', color: '#1a5fa8', bg: 'rgba(26,95,168,0.08)', border: 'rgba(26,95,168,0.2)', dot: '#1a5fa8' },
    missed: { label: 'Missed', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)', dot: '#dc2626' },
};

function CheckpointTimeline({ checkpoints, status }: { checkpoints: CheckpointScan[]; status: string }) {
    if (checkpoints.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 0' }}>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'rgba(147,114,60,0.07)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <MapPin size={20} color="rgba(147,114,60,0.35)" />
                </div>
                <p className="dm" style={{ fontSize: 12, color: '#c4a87a', fontWeight: 500 }}>
                    No checkpoints scanned yet
                </p>
            </div>
        );
    }

    const accentColor = status === 'ongoing' ? '#059669' : status === 'missed' ? '#dc2626' : '#1a5fa8';

    return (
        <div>
            <div
                className="dm"
                style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#9a8060',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                }}
            >
                <ScanLine size={11} color="#93723c" />
                {checkpoints.length} Checkpoint{checkpoints.length !== 1 ? 's' : ''} Scanned
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {checkpoints.map((scan, i) => {
                    const isFirst = i === 0;
                    const isLast = i === checkpoints.length - 1;
                    const isMid = !isFirst && !isLast;

                    return (
                        <motion.div
                            key={scan.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                                <div
                                    style={{
                                        width: 2,
                                        flex: isFirst ? 0 : 1,
                                        background: isFirst ? 'transparent' : `linear-gradient(to bottom, ${accentColor}33, ${accentColor}22)`,
                                        minHeight: 8,
                                    }}
                                />
                                <div
                                    style={{
                                        width: isFirst || isLast ? 14 : 10,
                                        height: isFirst || isLast ? 14 : 10,
                                        borderRadius: '50%',
                                        background: isFirst ? accentColor : isLast ? `${accentColor}bb` : 'white',
                                        border: `2px solid ${accentColor}`,
                                        boxShadow: isFirst ? `0 0 0 3px ${accentColor}22` : 'none',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {isFirst && <Navigation size={6} color="white" />}
                                </div>
                                <div
                                    style={{
                                        width: 2,
                                        flex: isLast ? 0 : 1,
                                        background: `linear-gradient(to bottom, ${accentColor}22, ${accentColor}11)`,
                                        minHeight: 8,
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    flex: 1,
                                    margin: '4px 0 4px 8px',
                                    padding: '8px 12px',
                                    borderRadius: 10,
                                    background: isFirst ? `${accentColor}08` : 'rgba(255,255,255,0.6)',
                                    border: `1px solid ${isFirst ? `${accentColor}20` : 'rgba(147,114,60,0.1)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 8,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                                    <div
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 6,
                                            background: `${accentColor}12`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <MapPin size={12} color={accentColor} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <p
                                            className="dm"
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: '#1a0e06',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {scan.checkpoint?.point_name ?? 'Unknown'}
                                        </p>
                                        <p className="dm" style={{ fontSize: 10, color: '#9a8060', marginTop: 1 }}>
                                            Stop #{i + 1}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div className="dm" style={{ fontSize: 12, fontWeight: 700, color: accentColor }}>
                                        {formatTime(scan.scanned_at)}
                                    </div>
                                    {i > 0 &&
                                        (() => {
                                            const prev = new Date(checkpoints[i - 1].scanned_at);
                                            const curr = new Date(scan.scanned_at);
                                            const diffMins = Math.round((curr.getTime() - prev.getTime()) / 60000);
                                            if (diffMins > 0) {
                                                return (
                                                    <div className="dm" style={{ fontSize: 10, color: '#b8956a', marginTop: 1 }}>
                                                        +{diffMins}m gap
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

function PatrolCard({ patrol }: { patrol: Patrol }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = statusConfig[patrol.status];
    const isDay = patrol.shift?.name?.toLowerCase().includes('day');
    const progress = patrol.status === 'ongoing' ? Math.min(100, ((patrol.duration_minutes ?? 0) / 720) * 100) : 100;

    return (
        <div style={{ borderRadius: 14, border: `1.5px solid ${cfg.border}`, background: cfg.bg, overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
            <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded((e) => !e)}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: isDay ? 'rgba(217,119,6,0.12)' : 'rgba(99,102,241,0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            {isDay ? <Sun size={16} color="#d97706" /> : <Moon size={16} color="#6366f1" />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="dm text-sm font-bold" style={{ color: '#1a0e06' }}>
                                    {patrol.shift?.name ?? 'Unknown Shift'}
                                </span>
                                <span
                                    className="dm"
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: cfg.color,
                                        background: cfg.bg,
                                        border: `1px solid ${cfg.border}`,
                                        borderRadius: 100,
                                        padding: '2px 8px',
                                    }}
                                >
                                    {cfg.label.toUpperCase()}
                                </span>
                                {patrol.status === 'ongoing' && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                        <motion.div
                                            animate={{ scale: [1, 1.4, 1] }}
                                            transition={{ repeat: Infinity, duration: 1.4 }}
                                            style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669' }}
                                        />
                                        <span className="dm" style={{ fontSize: 10, fontWeight: 700, color: '#059669' }}>
                                            LIVE
                                        </span>
                                    </span>
                                )}
                            </div>
                            <p className="dm mt-0.5 text-xs" style={{ color: '#9a8060' }}>
                                {formatTime(patrol.started_at)}
                                {patrol.shift ? ` · ${patrol.shift.formatted_start_time} – ${patrol.shift.formatted_end_time}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                        <div style={{ textAlign: 'right' }}>
                            <div className="dm" style={{ fontSize: 13, fontWeight: 700, color: '#902729' }}>
                                {patrol.checkpoints.length} <span style={{ fontSize: 11, fontWeight: 600, color: '#9a8060' }}>scans</span>
                            </div>
                            <div className="dm text-xs" style={{ color: '#9a8060' }}>
                                {formatDuration(patrol.duration_minutes)}
                            </div>
                        </div>
                        {expanded ? <ChevronUp size={14} color="#9a8060" /> : <ChevronDown size={14} color="#9a8060" />}
                    </div>
                </div>

                {patrol.status === 'ongoing' && (
                    <div style={{ marginTop: 10, height: 4, borderRadius: 100, background: 'rgba(5,150,105,0.15)', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{ height: '100%', borderRadius: 100, background: 'linear-gradient(90deg, #059669, #34d399)' }}
                        />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${cfg.border}` }}>
                            <div className="mt-4 mb-5 grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Started', value: formatTime(patrol.started_at), icon: <Clock size={11} /> },
                                    { label: 'Ended', value: patrol.ended_at ? formatTime(patrol.ended_at) : '—', icon: <Timer size={11} /> },
                                    { label: 'Duration', value: formatDuration(patrol.duration_minutes), icon: <Timer size={11} /> },
                                ].map((s, i) => (
                                    <div
                                        key={i}
                                        style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}
                                    >
                                        <div style={{ color: '#93723c', display: 'flex', justifyContent: 'center', marginBottom: 3 }}>{s.icon}</div>
                                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 700, color: '#902729' }}>
                                            {s.value}
                                        </div>
                                        <div
                                            className="dm"
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                color: '#9a8060',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            }}
                                        >
                                            {s.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <CheckpointTimeline checkpoints={patrol.checkpoints} status={patrol.status} />

                            {patrol.notes && (
                                <div
                                    style={{
                                        marginTop: 14,
                                        background: 'rgba(255,255,255,0.7)',
                                        borderRadius: 10,
                                        padding: '8px 12px',
                                        borderLeft: '3px solid #93723c',
                                    }}
                                >
                                    <p
                                        className="dm"
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: '#6a5030',
                                            marginBottom: 3,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                        }}
                                    >
                                        Notes
                                    </p>
                                    <p className="dm" style={{ fontSize: 12, color: '#5a4a3a', fontStyle: 'italic', lineHeight: 1.5 }}>
                                        {patrol.notes}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function GuardCard({ guard }: { guard: GuardWithPatrols }) {
    const [collapsed, setCollapsed] = useState(false);
    const hasOngoing = guard.ongoing_patrols > 0;
    const completionRate = guard.total_patrols > 0 ? Math.round((guard.completed_patrols / guard.total_patrols) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'white',
                borderRadius: 18,
                border: '1px solid rgba(147,114,60,0.14)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                overflow: 'hidden',
            }}
        >
            <div
                style={{ padding: '18px 20px', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid rgba(147,114,60,0.09)' }}
                onClick={() => setCollapsed((c) => !c)}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            style={{
                                width: 46,
                                height: 46,
                                borderRadius: 14,
                                background: hasOngoing ? 'rgba(5,150,105,0.1)' : 'rgba(144,39,41,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                                fontWeight: 700,
                                fontFamily: "'DM Sans', sans-serif",
                                color: hasOngoing ? '#059669' : '#902729',
                                position: 'relative',
                                flexShrink: 0,
                            }}
                        >
                            {getInitials(guard.name)}
                            {hasOngoing && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: -3,
                                        right: -3,
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        background: '#059669',
                                        border: '2px solid white',
                                    }}
                                />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="dm text-sm font-bold" style={{ color: '#1a0e06' }}>
                                    {guard.name}
                                </h3>
                                {hasOngoing && (
                                    <span
                                        className="dm"
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: '#059669',
                                            background: 'rgba(5,150,105,0.09)',
                                            borderRadius: 100,
                                            padding: '2px 7px',
                                        }}
                                    >
                                        ON PATROL
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
                                <p className="dm" style={{ fontSize: 11, color: '#9a8060' }}>
                                    {guard.total_patrols} patrol{guard.total_patrols !== 1 ? 's' : ''}
                                </p>
                                <span style={{ color: '#d4b896', fontSize: 10 }}>·</span>
                                <div className="dm" style={{ fontSize: 11, color: '#9a8060', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <Hash size={9} color="#93723c" />
                                    <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#b8956a' }}>{guard.id}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden gap-3 sm:flex">
                            {[
                                { label: 'Done', value: guard.completed_patrols, color: '#1a5fa8' },
                                { label: 'Missed', value: guard.missed_patrols, color: '#dc2626' },
                            ].map((s, i) => (
                                <div key={i} style={{ textAlign: 'center' }}>
                                    <div
                                        style={{
                                            fontFamily: "'Cormorant Garamond', serif",
                                            fontSize: 20,
                                            fontWeight: 700,
                                            color: s.color,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {s.value}
                                    </div>
                                    <div
                                        className="dm"
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 700,
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
                            <div style={{ textAlign: 'center', minWidth: 40 }}>
                                <div
                                    style={{
                                        fontFamily: "'Cormorant Garamond', serif",
                                        fontSize: 20,
                                        fontWeight: 700,
                                        color: completionRate >= 80 ? '#059669' : completionRate >= 50 ? '#d97706' : '#dc2626',
                                        lineHeight: 1,
                                    }}
                                >
                                    {completionRate}%
                                </div>
                                <div
                                    className="dm"
                                    style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: '#9a8060',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        marginTop: 2,
                                    }}
                                >
                                    Rate
                                </div>
                            </div>
                        </div>
                        {collapsed ? <ChevronDown size={16} color="#9a8060" /> : <ChevronUp size={16} color="#9a8060" />}
                    </div>
                </div>

                {!collapsed && guard.total_patrols > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 3, height: 5, borderRadius: 100, overflow: 'hidden' }}>
                        {guard.completed_patrols > 0 && <div style={{ flex: guard.completed_patrols, background: '#1a5fa8', borderRadius: 100 }} />}
                        {guard.ongoing_patrols > 0 && <div style={{ flex: guard.ongoing_patrols, background: '#059669', borderRadius: 100 }} />}
                        {guard.missed_patrols > 0 && <div style={{ flex: guard.missed_patrols, background: '#dc2626', borderRadius: 100 }} />}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {guard.patrols.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-6" style={{ color: '#c4a87a' }}>
                                    <Shield size={28} opacity={0.3} />
                                    <p className="dm text-xs font-medium" style={{ color: '#c4a87a' }}>
                                        No patrols in selected range
                                    </p>
                                </div>
                            ) : (
                                guard.patrols.map((patrol) => <PatrolCard key={patrol.id} patrol={patrol} />)
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function PatrolVisualization() {
    const [guards, setGuards] = useState<GuardWithPatrols[]>([]);
    const [aggregations, setAggregations] = useState<Aggregations | null>(null);
    const [shifts, setShifts] = useState<PatrolShift[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterGuardId, setFilterGuardId] = useState('');
    const [filterShift, setFilterShift] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterMinScans, setFilterMinScans] = useState('');

    const fetchData = async () => {
        setIsFetching(true);
        try {
            const params: Record<string, string> = {};
            if (filterDate) params.date = filterDate;
            if (filterShift) params.shift_id = filterShift;
            if (filterStatus) params.status = filterStatus;

            const [guardsRes, aggRes, shiftsRes] = await Promise.all([
                axios.get('/api/patrols/by-guard', { params }),
                axios.get('/api/patrols/aggregations', { params }),
                axios.get('/api/patrol-shifts'),
            ]);
            setGuards(guardsRes.data);
            setAggregations(aggRes.data);
            setShifts(shiftsRes.data);
        } catch {
            toast.error('Failed to load patrol data.');
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterDate, filterShift, filterStatus]);

    const guardIdOptions = useMemo(() => {
        return [...new Set(guards.map((g) => g.id))].sort();
    }, [guards]);

    const filteredGuards = useMemo(() => {
        let result = guards;

        if (searchQuery.trim()) {
            result = result.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (filterGuardId) {
            result = result.filter((g) => g.id === filterGuardId);
        }

        if (filterMinScans) {
            const minScans = parseInt(filterMinScans, 10);
            result = result.filter((g) => g.patrols.some((p) => p.checkpoints.length >= minScans));
        }

        return result;
    }, [guards, searchQuery, filterGuardId, filterMinScans]);

    const today = new Date().toISOString().split('T')[0];
    const activeFilterCount = [searchQuery, filterGuardId, filterShift, filterStatus, filterMinScans].filter(Boolean).length;

    const clearAllFilters = () => {
        setSearchQuery('');
        setFilterGuardId('');
        setFilterShift('');
        setFilterStatus('');
        setFilterMinScans('');
        setFilterDate(today);
    };

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
                .action-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 10px; padding: 7px 16px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: all 0.15s; cursor: pointer; border: none; }
                .btn-primary { background: linear-gradient(135deg, #902729, #b83a3c); color: white; }
                .btn-primary:hover { box-shadow: 0 4px 12px rgba(144,39,41,0.35); transform: translateY(-1px); }
                .btn-outline { background: white; color: #5a4a3a; border: 1.5px solid rgba(147,114,60,0.25); }
                .btn-outline:hover { border-color: #93723c; color: #93723c; }
                .input-styled { border-radius: 10px; border: 1.5px solid rgba(147,114,60,0.2); background: white; padding: 9px 14px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #2d1f0e; outline: none; transition: border 0.15s; }
                .input-styled:focus { border-color: #93723c; box-shadow: 0 0 0 3px rgba(147,114,60,0.1); }
                .select-styled { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2393723c' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
                .stat-number { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; line-height: 1; }
                .filter-chip { display: inline-flex; align-items: center; gap: 5px; border-radius: 100px; border: 1.5px solid rgba(147,114,60,0.22); background: white; padding: 5px 13px; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; color: #5a4a3a; cursor: pointer; transition: all 0.14s; }
                .filter-chip:hover { border-color: #93723c; color: #93723c; }
                .filter-chip.active { background: #93723c; border-color: #93723c; color: white; }
                .filter-chip.active-red { background: #902729; border-color: #902729; color: white; }
                .filter-chip.active-green { background: #059669; border-color: #059669; color: white; }
                .filter-section { background: white; border-radius: 16px; border: 1px solid rgba(147,114,60,0.12); padding: 16px 20px; box-shadow: 0 1px 8px rgba(0,0,0,0.04); }
            `}</style>

            <div className="mx-auto w-full px-6 py-8">
                <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 flex items-center gap-3">
                                <div className="brand-grad flex h-10 w-10 items-center justify-center rounded-xl">
                                    <Shield size={20} color="white" />
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
                                    Patrol Tracking
                                </h1>
                            </div>
                            <p className="dm ml-1 text-sm text-stone-500">Live and historical guard patrol visualization</p>
                        </div>
                        <div className="flex gap-2">
                            {activeFilterCount > 0 && (
                                <button
                                    className="action-btn btn-outline"
                                    onClick={clearAllFilters}
                                    style={{ color: '#902729', borderColor: 'rgba(144,39,41,0.3)' }}
                                >
                                    <X size={13} />
                                    <span>
                                        Clear {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                                    </span>
                                </button>
                            )}
                            <button className="action-btn btn-outline" onClick={fetchData}>
                                <RefreshCw size={14} />
                                <span>Refresh</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
                >
                    {[
                        {
                            label: 'Total Patrols',
                            value: aggregations?.total ?? 0,
                            icon: <Shield size={16} />,
                            color: '#902729',
                            bg: 'rgba(144,39,41,0.07)',
                        },
                        {
                            label: 'Ongoing',
                            value: aggregations?.ongoing ?? 0,
                            icon: <Zap size={16} />,
                            color: '#059669',
                            bg: 'rgba(5,150,105,0.07)',
                        },
                        {
                            label: 'Completed',
                            value: aggregations?.completed ?? 0,
                            icon: <CheckCircle2 size={16} />,
                            color: '#1a5fa8',
                            bg: 'rgba(26,95,168,0.07)',
                        },
                        {
                            label: 'Missed',
                            value: aggregations?.missed ?? 0,
                            icon: <AlertTriangle size={16} />,
                            color: '#dc2626',
                            bg: 'rgba(220,38,38,0.07)',
                        },
                        {
                            label: 'Scans Today',
                            value: aggregations?.total_checkpoints_scanned ?? 0,
                            icon: <MapPin size={16} />,
                            color: '#93723c',
                            bg: 'rgba(147,114,60,0.07)',
                        },
                        {
                            label: 'Guards Active',
                            value: aggregations?.guards_on_patrol ?? 0,
                            icon: <Users size={16} />,
                            color: '#7c3aed',
                            bg: 'rgba(124,58,237,0.07)',
                        },
                    ].map((card, i) => (
                        <div key={i} className="stat-card flex flex-col gap-2 p-4">
                            <div className="flex items-center justify-between">
                                <span className="dm text-xs font-semibold tracking-wider text-stone-400 uppercase">{card.label}</span>
                                <div style={{ color: card.color, background: card.bg, borderRadius: 8, padding: 5 }}>{card.icon}</div>
                            </div>
                            <div className="stat-number" style={{ fontSize: 28, color: card.color }}>
                                {card.value}
                            </div>
                        </div>
                    ))}
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="filter-section mb-5">
                    <div
                        className="dm"
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#9a8060',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginBottom: 12,
                        }}
                    >
                        Filters
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        <div className="relative">
                            <Search
                                size={14}
                                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9a8060' }}
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name…"
                                className="input-styled"
                                style={{ paddingLeft: 32, width: 190 }}
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

                        <div className="relative">
                            <Hash size={12} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9a8060' }} />
                            <select
                                value={filterGuardId}
                                onChange={(e) => setFilterGuardId(e.target.value)}
                                className="input-styled select-styled"
                                style={{ paddingLeft: 28, width: 175 }}
                            >
                                <option value="">All Guards</option>
                                {guardIdOptions.map((id) => {
                                    const guard = guards.find((g) => g.id === id);
                                    return (
                                        <option key={id} value={id}>
                                            {guard ? `${guard.name}` : ''}
                                        </option>
                                    );
                                })}
                            </select>
                            {filterGuardId && (
                                <button
                                    onClick={() => setFilterGuardId('')}
                                    style={{
                                        position: 'absolute',
                                        right: 28,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        color: '#9a8060',
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="input-styled"
                            style={{ width: 165 }}
                        />

                        <select
                            value={filterShift}
                            onChange={(e) => setFilterShift(e.target.value)}
                            className="input-styled select-styled"
                            style={{ width: 165 }}
                        >
                            <option value="">All Shifts</option>
                            {shifts.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} ({s.formatted_start_time})
                                </option>
                            ))}
                        </select>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[
                                { key: '', label: 'All' },
                                { key: 'ongoing', label: '● Ongoing', cls: 'active-green' },
                                { key: 'completed', label: 'Completed', cls: 'active' },
                                { key: 'missed', label: '⚠ Missed', cls: 'active-red' },
                            ].map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilterStatus(f.key)}
                                    className={`filter-chip ${filterStatus === f.key ? (f.cls ?? 'active') : ''}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {filterDate && filterDate !== today && (
                            <button onClick={() => setFilterDate(today)} className="filter-chip" style={{ borderColor: '#93723c', color: '#93723c' }}>
                                <RefreshCw size={11} /> Today
                            </button>
                        )}
                    </div>
                </motion.div>

                {isFetching ? (
                    <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
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
                ) : filteredGuards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: 300, color: '#c4a87a' }}>
                        <Shield size={48} opacity={0.25} />
                        <p className="dm text-sm font-medium" style={{ color: '#c4a87a' }}>
                            No patrol data found for the selected filters
                        </p>
                        {activeFilterCount > 0 && (
                            <button className="action-btn btn-outline" onClick={clearAllFilters} style={{ marginTop: 4, fontSize: 12 }}>
                                <X size={12} /> Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="dm" style={{ fontSize: 12, color: '#9a8060', fontWeight: 500 }}>
                            Showing <strong style={{ color: '#5a4a3a' }}>{filteredGuards.length}</strong> guard
                            {filteredGuards.length !== 1 ? 's' : ''}
                            {filteredGuards.length !== guards.length ? ` (filtered from ${guards.length})` : ''}
                        </div>
                        {filteredGuards.map((guard) => (
                            <GuardCard key={guard.id} guard={guard} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
