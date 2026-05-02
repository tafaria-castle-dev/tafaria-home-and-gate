import { GuestChart } from '@/components/home/guests/GuestChart';
import { MetricCard } from '@/components/home/guests/MetricCard';
import { RecentActivity } from '@/components/home/guests/RecentActivity';
import axios from 'axios';
import {
    AlertTriangle,
    CalendarClock,
    ChevronDown,
    Clock3,
    Download,
    RefreshCw,
    Shield,
    UserCheck,
    UserMinus,
    UserPlus,
    Users,
    Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type Period = 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'last30Days' | 'thisMonth' | 'custom';

interface PeriodOption {
    value: Period;
    label: string;
    shortLabel: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
    { value: 'today', label: 'Today', shortLabel: 'Today' },
    { value: 'yesterday', label: 'Yesterday', shortLabel: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week', shortLabel: 'This Week' },
    { value: 'last7Days', label: 'Last 7 Days', shortLabel: '7 Days' },
    { value: 'last30Days', label: 'Last 30 Days', shortLabel: '30 Days' },
    { value: 'thisMonth', label: 'This Month', shortLabel: 'Month' },
    { value: 'custom', label: 'Custom Range', shortLabel: 'Custom' },
];

interface AggregationData {
    active: number;
    adults_active: number;
    kids_active: number;
    infants_active: number;
    overdue: number;
    check_ins_in_period: number;
    check_outs_in_period: number;
    corporate: number;
    leisure: number;
    avg_stay_hours: number;
    avg_stay_minutes: number;
    bills_pending: number;
    bills_cleared: number;
    housekeeping_pending: number;
    walk_in: number;
    drive_in: number;
    express: number;
    vip: number;
    section_breakdown: { section: string; count: number }[];
    daily_arrivals: { date: string; count: number }[];
    daily_departures: { date: string; count: number }[];
}

const CAPACITY = 200;

const EMPTY_DATA: AggregationData = {
    active: 0,
    adults_active: 0,
    kids_active: 0,
    infants_active: 0,
    overdue: 0,
    check_ins_in_period: 0,
    check_outs_in_period: 0,
    corporate: 0,
    leisure: 0,
    avg_stay_hours: 0,
    avg_stay_minutes: 0,
    bills_pending: 0,
    bills_cleared: 0,
    housekeeping_pending: 0,
    walk_in: 0,
    drive_in: 0,
    express: 0,
    vip: 0,
    section_breakdown: [],
    daily_arrivals: [],
    daily_departures: [],
};

function PeriodSelector({
    period,
    customStart,
    customEnd,
    onPeriodChange,
    onCustomStartChange,
    onCustomEndChange,
}: {
    period: Period;
    customStart: string;
    customEnd: string;
    onPeriodChange: (p: Period) => void;
    onCustomStartChange: (v: string) => void;
    onCustomEndChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = PERIOD_OPTIONS.find((o) => o.value === period)!;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="relative" ref={ref}>
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
                >
                    <span>{current.label}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <div className="absolute top-full left-0 z-300 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
                        {PERIOD_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    onPeriodChange(opt.value);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-stone-50 ${
                                    period === opt.value ? 'bg-rose-50 font-semibold text-[#902729]/80' : 'font-medium text-stone-500'
                                }`}
                            >
                                {opt.label}
                                {period === opt.value && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#902729]/75" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {period === 'custom' && (
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="date"
                        value={customStart}
                        onChange={(e) => onCustomStartChange(e.target.value)}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 shadow-sm transition-all focus:border-[#902729]/30 focus:ring-2 focus:ring-rose-100 focus:outline-none"
                    />
                    <span className="text-xs font-medium text-stone-400">to</span>
                    <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => onCustomEndChange(e.target.value)}
                        className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 shadow-sm transition-all focus:border-[#902729]/30 focus:ring-2 focus:ring-rose-100 focus:outline-none"
                    />
                </div>
            )}
        </div>
    );
}

function GlanceRow({
    icon: Icon,
    label,
    value,
    iconColor,
    iconBg,
    loading,
}: {
    icon: any;
    label: string;
    value: string | number;
    iconColor: string;
    iconBg: string;
    loading: boolean;
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl px-1 py-2.5 transition-colors hover:bg-stone-50">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
            </div>
            <span className="flex-1 text-xs text-stone-500">{label}</span>
            <span className={`font-serif text-base font-bold ${loading ? 'text-stone-200' : 'text-stone-800'}`}>{loading ? '-' : value}</span>
        </div>
    );
}

function GlancePanel({ data, period, loading }: { data: AggregationData; period: Period; loading: boolean }) {
    const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.shortLabel ?? period;

    const metrics = [
        {
            label: `Check-ins (${periodLabel})`,
            value: data.check_ins_in_period,
            icon: UserPlus,
            iconColor: 'text-[#902729]/75',
            iconBg: 'bg-rose-50',
        },
        {
            label: `Check-outs (${periodLabel})`,
            value: data.check_outs_in_period,
            icon: UserMinus,
            iconColor: 'text-amber-700',
            iconBg: 'bg-amber-50',
        },
        { label: 'Overdue guests', value: data.overdue, icon: AlertTriangle, iconColor: 'text-red-500', iconBg: 'bg-red-50' },
        { label: 'Avg dwell time', value: `${data.avg_stay_minutes}m`, icon: Clock3, iconColor: 'text-violet-600', iconBg: 'bg-violet-50' },
        { label: 'Express check-ins', value: data.express, icon: Zap, iconColor: 'text-sky-600', iconBg: 'bg-sky-50' },
        { label: 'Bills pending', value: data.bills_pending, icon: CalendarClock, iconColor: 'text-orange-600', iconBg: 'bg-orange-50' },
        {
            label: 'Corporate / Leisure',
            value: `${data.corporate} / ${data.leisure}`,
            icon: Shield,
            iconColor: 'text-emerald-700',
            iconBg: 'bg-emerald-50',
        },
        {
            label: 'Walk-in / Drive-in',
            value: `${data.walk_in} / ${data.drive_in}`,
            icon: UserCheck,
            iconColor: 'text-indigo-600',
            iconBg: 'bg-indigo-50',
        },
    ];

    return (
        <div className="h-full rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-stone-100 pb-4">
                <h3 className="font-serif text-base font-semibold text-stone-800">At a Glance</h3>
                <p className="mt-0.5 text-xs text-stone-400">{PERIOD_OPTIONS.find((o) => o.value === period)?.label} summary</p>
            </div>
            <div className="space-y-0.5">
                {metrics.map((m) => (
                    <GlanceRow
                        key={m.label}
                        icon={m.icon}
                        label={m.label}
                        value={m.value}
                        iconColor={m.iconColor}
                        iconBg={m.iconBg}
                        loading={loading}
                    />
                ))}
            </div>
        </div>
    );
}

export default function GuestsDashboard() {
    const [data, setData] = useState<AggregationData>(EMPTY_DATA);
    const [isFetching, setIsFetching] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());
    const [period, setPeriod] = useState<Period>('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const fetchStats = useCallback(async () => {
        if (period === 'custom' && (!customStart || !customEnd)) return;
        setIsFetching(true);
        try {
            const params: Record<string, string> = { dateRange: period };
            if (period === 'custom') {
                params.customStart = customStart;
                params.customEnd = customEnd;
            }
            const { data: agg } = await axios.get('/api/guest-reservations/aggregations', { params });
            setData(agg);
            setLastRefreshed(new Date());
        } finally {
            setIsFetching(false);
        }
    }, [period, customStart, customEnd]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const occupancyPct = Math.min(Math.round((data.active / CAPACITY) * 100), 100);
    const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
    const isToday = period === 'today';

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50/20 to-rose-50/10">
            <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#902729]/80 via-[#902729] to-stone-900 p-6 shadow-xl shadow-[#902729]/20">
                    <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="mb-1 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                                    <Users className="h-4 w-4 text-white" />
                                </div>
                                <span className="text-xs font-semibold tracking-widest text-[#902729]/10 uppercase">Guest Management</span>
                            </div>
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                {isToday ? "Today's Overview" : periodLabel}
                            </h1>
                            <p className="mt-1.5 text-sm text-[#902729]/20">
                                Live tracking · Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <PeriodSelector
                                period={period}
                                customStart={customStart}
                                customEnd={customEnd}
                                onPeriodChange={setPeriod}
                                onCustomStartChange={setCustomStart}
                                onCustomEndChange={setCustomEnd}
                            />
                            <button className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white active:scale-95">
                                <Download className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Export</span>
                            </button>
                            <button
                                onClick={fetchStats}
                                disabled={isFetching}
                                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white active:scale-95 disabled:opacity-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">{isFetching ? 'Loading…' : 'Refresh'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: 'On Property', value: isFetching ? '—' : data.active },
                            {
                                label: isToday ? 'Check-ins Today' : 'Check-ins',
                                value: isFetching ? '—' : data.check_ins_in_period,
                                sub: periodLabel,
                            },
                            {
                                label: isToday ? 'Check-outs Today' : 'Check-outs',
                                value: isFetching ? '—' : data.check_outs_in_period,
                                sub: periodLabel,
                            },
                            { label: 'Overdue', value: isFetching ? '—' : data.overdue, sub: 'past departure', alert: data.overdue > 0 },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className={`rounded-xl border p-4 backdrop-blur-sm transition-all ${s.alert && !isFetching ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-white/8'}`}
                            >
                                <p className="text-[10px] font-bold tracking-widest text-white/50 uppercase">{s.label}</p>
                                <p
                                    className={`mt-1 font-serif text-3xl leading-none font-bold ${s.alert && !isFetching ? 'text-amber-300' : 'text-white'}`}
                                >
                                    {s.value}
                                </p>
                                <p className="mt-1 text-[10px] text-white/40">{s.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <MetricCard
                        title="On Premises"
                        value={isFetching ? '—' : data.active}
                        subtitle="Currently on property"
                        icon={Users}
                        variant="primary"
                        breakdown={
                            !isFetching && data.active > 0
                                ? [
                                      { label: 'Adults', value: data.adults_active, color: 'bg-[#902729]/70' },
                                      { label: 'Kids', value: data.kids_active, color: 'bg-sky-500' },
                                      { label: 'Infants', value: data.infants_active, color: 'bg-violet-400' },
                                  ]
                                : undefined
                        }
                    />
                    <MetricCard
                        title={isToday ? 'Check-ins Today' : 'Check-ins'}
                        value={isFetching ? '—' : data.check_ins_in_period}
                        subtitle={isToday ? 'Since midnight' : `Arrivals in ${periodLabel}`}
                        icon={UserCheck}
                        variant="success"
                    />
                    <MetricCard
                        title={isToday ? 'Check-outs Today' : 'Check-outs'}
                        value={isFetching ? '—' : data.check_outs_in_period}
                        subtitle={isToday ? 'Departures today' : `Departures in ${periodLabel}`}
                        icon={UserMinus}
                        variant="secondary"
                    />
                    <MetricCard
                        title="Overdue Guests"
                        value={isFetching ? '—' : data.overdue}
                        subtitle="Past scheduled checkout"
                        icon={AlertTriangle}
                        variant={data.overdue > 0 ? 'warning' : 'default'}
                        pulse={data.overdue > 0}
                    />
                </div>

                {data.overdue > 0 && !isFetching && (
                    <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-amber-900">Action Required</p>
                            <p className="text-sm text-amber-700">
                                {data.overdue} guest{data.overdue !== 1 ? 's have' : ' has'} exceeded their scheduled departure. Please follow up.
                            </p>
                        </div>
                        <div className="shrink-0 font-serif text-3xl font-bold text-amber-600">{data.overdue}</div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        {
                            icon: Clock3,
                            label: 'Avg dwell',
                            value: isFetching ? '—' : `${data.avg_stay_minutes}m`,
                            sub: 'per visit',
                            iconColor: 'text-violet-600',
                            iconBg: 'bg-violet-50',
                        },
                        {
                            icon: Shield,
                            label: 'Walk-in / Drive',
                            value: isFetching ? '—' : `${data.walk_in} / ${data.drive_in}`,
                            sub: 'entry type split',
                            iconColor: 'text-indigo-600',
                            iconBg: 'bg-indigo-50',
                        },
                        {
                            icon: Zap,
                            label: 'Express',
                            value: isFetching ? '—' : data.express,
                            sub: 'express check-ins',
                            iconColor: 'text-sky-600',
                            iconBg: 'bg-sky-50',
                        },
                        {
                            icon: CalendarClock,
                            label: 'Bills pending',
                            value: isFetching ? '—' : data.bills_pending,
                            sub: 'awaiting clearance',
                            iconColor: 'text-orange-600',
                            iconBg: 'bg-orange-50',
                        },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="flex items-center gap-3 rounded-2xl border border-stone-200/60 bg-white px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                                <item.icon className={`h-4.5 w-4.5 ${item.iconColor}`} size={18} />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-[9px] font-bold tracking-[0.1em] text-stone-400 uppercase">{item.label}</p>
                                <p className="font-serif text-2xl leading-tight font-bold text-stone-800">{item.value}</p>
                                <p className="text-[10px] text-stone-400">{item.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <GuestChart period={period} customStart={customStart} customEnd={customEnd} />
                    </div>
                    <div className="lg:col-span-2">
                        <GlancePanel data={data} period={period} loading={isFetching} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                        <RecentActivity />
                    </div>
                    <div className="lg:col-span-2">
                        {data.section_breakdown.length > 0 && !isFetching && (
                            <div className="h-full rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
                                <div className="mb-5 border-b border-stone-100 pb-4">
                                    <h3 className="font-serif text-base font-semibold text-stone-800">Section Breakdown</h3>
                                    <p className="mt-0.5 text-xs text-stone-400">{periodLabel} · arrivals by section</p>
                                </div>
                                <div className="space-y-4">
                                    {data.section_breakdown.map((s, i) => {
                                        const max = data.section_breakdown[0]?.count ?? 1;
                                        const pct = Math.round((s.count / max) * 100);
                                        const total = data.section_breakdown.reduce((sum, x) => sum + x.count, 0);
                                        const sharePct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                                        return (
                                            <div key={s.section ?? i}>
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="text-sm font-semibold text-stone-700 capitalize">{s.section ?? 'Unknown'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-stone-400">{sharePct}%</span>
                                                        <span className="font-serif text-base font-bold text-stone-800">{s.count}</span>
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-[#902729]/75 to-[#902729]/50 transition-all duration-700"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
