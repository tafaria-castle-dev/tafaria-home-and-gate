import { GuestChart } from '@/components/home/guests/GuestChart';
import { MetricCard } from '@/components/home/guests/MetricCard';
import { RecentActivity } from '@/components/home/guests/RecentActivity';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowUpRight,
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
                    className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-border/60 hover:bg-muted/40"
                >
                    <span>{current.label}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <div className="absolute top-full left-0 z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                        {PERIOD_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    onPeriodChange(opt.value);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/60 ${period === opt.value ? 'bg-muted/40 font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {period === 'custom' && (
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={customStart}
                        onChange={(e) => onCustomStartChange(e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => onCustomEndChange(e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                </div>
            )}
        </div>
    );
}

function GlancePanel({ data, period, loading }: { data: AggregationData; period: Period; loading: boolean }) {
    const periodLabel = PERIOD_OPTIONS.find((o) => o.value === period)?.shortLabel ?? period;
    const rows = [
        { label: `Check-ins (${periodLabel})`, value: loading ? '—' : data.check_ins_in_period, color: 'bg-primary', Icon: UserPlus },
        { label: `Check-outs (${periodLabel})`, value: loading ? '—' : data.check_outs_in_period, color: 'bg-[#93723c]', Icon: UserMinus },
        { label: 'Currently on-site', value: loading ? '—' : data.active, color: 'bg-sky-500', Icon: Users },
        { label: 'Overdue guests', value: loading ? '—' : data.overdue, color: 'bg-amber-500', Icon: AlertTriangle },
        { label: 'Avg dwell time', value: loading ? '—' : `${data.avg_stay_minutes}m`, color: 'bg-violet-500', Icon: Clock3 },
        { label: 'Corporate / Leisure', value: loading ? '—' : `${data.corporate} / ${data.leisure}`, color: 'bg-emerald-500', Icon: Shield },
    ];
    const pct = Math.min(Math.round((data.active / CAPACITY) * 100), 100);

    return (
        <div className="animate-fade-in rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
                <h3 className="font-serif text-base font-semibold">At a Glance</h3>
                <p className="text-xs text-muted-foreground">{PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period} summary</p>
            </div>
            <div className="space-y-2.5">
                {rows.map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${row.color}/10`}>
                            <row.Icon className={`h-3.5 w-3.5 ${row.color.replace('bg-', 'text-')}`} />
                        </div>
                        <span className="flex-1 text-xs text-muted-foreground">{row.label}</span>
                        <span className="font-serif text-base font-bold text-foreground">{row.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

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
        <div className="space-y-6 rounded-lg bg-background p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground">Guest Management</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Live overview · Refreshed at {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <button className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
                        <Download className="h-3.5 w-3.5" /> Export
                    </button>
                    <button
                        onClick={fetchStats}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <MetricCard
                    title="On Premises"
                    value={isFetching ? '—' : data.active}
                    subtitle={``}
                    icon={Users}
                    variant="primary"
                    breakdown={
                        !isFetching && data.active > 0
                            ? [
                                  { label: 'Adults', value: data.adults_active, color: 'bg-primary' },
                                  { label: 'Kids', value: data.kids_active, color: 'bg-sky-500' },
                                  { label: 'Infants', value: data.infants_active, color: 'bg-violet-400' },
                              ]
                            : undefined
                    }
                />
                <MetricCard
                    title={isToday ? 'Check-ins Today' : `Check-ins (${periodLabel})`}
                    value={isFetching ? '—' : data.check_ins_in_period}
                    subtitle={isToday ? 'Since midnight' : `Arrivals in period`}
                    icon={UserCheck}
                    variant="success"
                />
                <MetricCard
                    title={isToday ? 'Check-outs Today' : `Check-outs (${periodLabel})`}
                    value={isFetching ? '—' : data.check_outs_in_period}
                    subtitle={isToday ? 'Departures today' : 'Departures in period'}
                    icon={UserMinus}
                    variant="warning"
                />
                <MetricCard
                    title="Overdue Guests"
                    value={isFetching ? '—' : data.overdue}
                    subtitle="Past checkout time"
                    icon={AlertTriangle}
                    variant={data.overdue > 0 ? 'warning' : 'default'}
                    pulse={data.overdue > 0}
                />
            </div>

            {data.overdue > 0 && !isFetching && (
                <div className="animate-fade-in flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/6 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">Action Required</p>
                        <p className="truncate text-sm text-muted-foreground">
                            {data.overdue} guest{data.overdue !== 1 ? 's have' : ' has'} exceeded their scheduled departure time.
                        </p>
                    </div>
                    <button className="flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-amber-600 hover:underline">
                        Review <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    { icon: Clock3, label: 'Avg dwell', value: isFetching ? '—' : `${data.avg_stay_minutes}m`, sub: 'per visit' },
                    {
                        icon: Shield,
                        label: 'Walk-in / Drive',
                        value: isFetching ? '—' : `${data.walk_in} / ${data.drive_in}`,
                        sub: 'entry type split',
                    },
                    { icon: UserPlus, label: 'Express', value: isFetching ? '—' : data.express, sub: 'express check-ins' },
                    { icon: CalendarClock, label: 'Bills pending', value: isFetching ? '—' : data.bills_pending, sub: 'awaiting clearance' },
                ].map((item) => (
                    <div key={item.label} className="animate-fade-in flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <item.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-[10px] font-bold tracking-wide text-muted-foreground uppercase">{item.label}</p>
                            <p className="font-serif text-xl leading-tight font-bold text-foreground">{item.value}</p>
                            <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <GuestChart period={period} customStart={customStart} customEnd={customEnd} />
                </div>
                <div className="lg:col-span-2">
                    <GlancePanel data={data} period={period} loading={isFetching} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <RecentActivity />
                </div>
                <div className="lg:col-span-2">
                    {data.section_breakdown.length > 0 && !isFetching && (
                        <div className="animate-fade-in rounded-xl border border-border bg-card p-5">
                            <div className="mb-4">
                                <h3 className="font-serif text-base font-semibold">Section Breakdown</h3>
                                <p className="text-xs text-muted-foreground">{periodLabel} — arrivals by section</p>
                            </div>
                            <div className="space-y-2.5">
                                {data.section_breakdown.map((s, i) => {
                                    const max = data.section_breakdown[0]?.count ?? 1;
                                    const pct = Math.round((s.count / max) * 100);
                                    return (
                                        <div key={s.section ?? i}>
                                            <div className="mb-1 flex items-center justify-between text-xs">
                                                <span className="font-medium text-foreground capitalize">{s.section ?? 'Unknown'}</span>
                                                <span className="font-bold text-foreground">{s.count}</span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary/70 transition-all duration-700"
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
    );
}
