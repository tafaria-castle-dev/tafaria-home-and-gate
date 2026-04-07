import { GuestChart } from '@/components/home/guests/GuestChart';
import { MetricCard } from '@/components/home/guests/MetricCard';
import { RecentActivity } from '@/components/home/guests/RecentActivity';
import axios from 'axios';
import { AlertTriangle, ArrowUpRight, CalendarClock, Clock3, Download, RefreshCw, Shield, UserCheck, UserMinus, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DashboardStats {
    currentGuests: number;
    checkInsToday: number;
    checkOutsToday: number;
    overdueGuests: number;
    awaitingCheckIn: number;
    avgDwellMinutes: number;
}

const CAPACITY = 200;

declare const Chart: any;

function OccupancyGauge({ current, capacity }: { current: number; capacity: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);
    const pct = Math.min(Math.round((current / capacity) * 100), 100);
    const color = pct > 80 ? '#e24b4a' : pct > 60 ? '#ef9f27' : 'hsl(359,58%,36%)';

    useEffect(() => {
        if (!canvasRef.current || typeof Chart === 'undefined') return;
        if (chartRef.current) {
            chartRef.current.destroy();
        }
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const emptyColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

        chartRef.current = new Chart(canvasRef.current, {
            type: 'doughnut',
            data: {
                datasets: [{ data: [pct, 100 - pct], backgroundColor: [color, emptyColor], borderWidth: 0, hoverOffset: 0 }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '76%',
                rotation: -120,
                circumference: 240,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                animation: { animateRotate: true, duration: 900, easing: 'easeInOutQuart' },
            },
        });
        return () => {
            chartRef.current?.destroy();
        };
    }, [pct, color]);

    const statusLabel = pct > 80 ? 'Near capacity' : pct > 60 ? 'Busy' : 'Normal';
    const statusColor = pct > 80 ? 'text-destructive' : pct > 60 ? 'text-amber-500' : 'text-emerald-600';

    return (
        <div className="animate-fade-in rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Occupancy</p>
                    <p className="font-serif text-base font-semibold text-foreground">Live Capacity</p>
                </div>
                <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="relative mx-auto" style={{ width: 160, height: 110 }}>
                <canvas ref={canvasRef} />
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 8 }}>
                    <span className="font-serif text-2xl leading-none font-bold" style={{ color }}>
                        {pct}%
                    </span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                        {current}/{capacity}
                    </span>
                </div>
            </div>
            <div className={`mt-1 text-center text-xs font-semibold ${statusColor}`}>{statusLabel}</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                {[
                    { label: 'Low', range: '< 60%', active: pct <= 60, c: 'text-emerald-700 bg-emerald-500/10' },
                    { label: 'Busy', range: '60–80%', active: pct > 60 && pct <= 80, c: 'text-amber-700 bg-amber-500/10' },
                    { label: 'Full', range: '> 80%', active: pct > 80, c: 'text-red-700 bg-red-500/10' },
                ].map((s) => (
                    <div key={s.label} className={`rounded-md py-1.5 font-semibold ${s.active ? s.c : 'bg-muted/40 text-muted-foreground'}`}>
                        <div>{s.label}</div>
                        <div className="opacity-70">{s.range}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WeeklyTrendChart() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        const fetchWeekly = async () => {
            setIsFetching(true);
            try {
                const { data } = await axios.get('/api/guest-reservations', { params: { per_page: 500 } });
                const all = data.data ?? data;
                const days = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    d.setHours(0, 0, 0, 0);
                    return d;
                });
                const labels = days.map((d) => d.toLocaleDateString([], { weekday: 'short' }));
                const checkIns = days.map((dayStart) => {
                    const dayEnd = new Date(dayStart);
                    dayEnd.setHours(23, 59, 59, 999);
                    return all.filter((r: any) => {
                        if (!r.entry_time) return false;
                        const t = new Date(r.entry_time).getTime();
                        return t >= dayStart.getTime() && t <= dayEnd.getTime();
                    }).length;
                });

                if (!canvasRef.current || typeof Chart === 'undefined') return;
                if (chartRef.current) chartRef.current.destroy();

                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
                const tickColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
                const tooltipBg = isDark ? '#1c1b1a' : '#ffffff';

                chartRef.current = new Chart(canvasRef.current, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [
                            {
                                label: 'Check-ins',
                                data: checkIns,
                                backgroundColor: checkIns.map((_, i) => (i === 6 ? 'hsl(359,58%,36%)' : 'hsla(359,58%,36%,0.35)')),
                                borderRadius: 5,
                                borderSkipped: false,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: tooltipBg,
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                borderWidth: 1,
                                titleColor: isDark ? '#e2e0d8' : '#1a1a18',
                                bodyColor: isDark ? '#9c9a92' : '#73726c',
                                cornerRadius: 8,
                                padding: 8,
                                titleFont: { size: 11, weight: '600' },
                                bodyFont: { size: 11 },
                            },
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11 } }, border: { display: false } },
                            y: {
                                grid: { color: gridColor, drawBorder: false },
                                ticks: { color: tickColor, font: { size: 10 }, stepSize: 1 },
                                border: { display: false },
                            },
                        },
                    },
                });
            } finally {
                setIsFetching(false);
            }
        };
        fetchWeekly();
        return () => {
            chartRef.current?.destroy();
        };
    }, []);

    return (
        <div className="animate-fade-in rounded-xl border border-border bg-card p-5">
            <div className="mb-3">
                <h3 className="font-serif text-base font-semibold">7-Day Trend</h3>
                <p className="text-xs text-muted-foreground">Daily check-ins this week</p>
            </div>
            {isFetching ? (
                <div className="flex h-[130px] items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <div style={{ position: 'relative', height: 130 }}>
                    <canvas ref={canvasRef} />
                </div>
            )}
        </div>
    );
}

function GlancePanel({ stats, loading }: { stats: DashboardStats; loading: boolean }) {
    const rows = [
        { label: 'Total arrivals today', value: loading ? '—' : stats.checkInsToday, color: 'bg-primary', Icon: UserPlus },
        { label: 'Total departures today', value: loading ? '—' : stats.checkOutsToday, color: 'bg-[#93723c]', Icon: UserMinus },
        { label: 'Currently on-site', value: loading ? '—' : stats.currentGuests, color: 'bg-sky-500', Icon: Users },
        { label: 'Overdue guests', value: loading ? '—' : stats.overdueGuests, color: 'bg-amber-500', Icon: AlertTriangle },
        { label: 'Avg dwell time', value: loading ? '—' : `${stats.avgDwellMinutes}m`, color: 'bg-violet-500', Icon: Clock3 },
        { label: 'Awaiting check-in', value: loading ? '—' : stats.awaitingCheckIn, color: 'bg-emerald-500', Icon: CalendarClock },
    ];
    const pct = Math.min(Math.round((stats.currentGuests / CAPACITY) * 100), 100);

    return (
        <div className="animate-fade-in rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="font-serif text-base font-semibold">Today at a Glance</h3>
                    <p className="text-xs text-muted-foreground">Full summary</p>
                </div>
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
            <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Capacity utilisation</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">
                    {pct > 80
                        ? 'Approaching capacity — consider managing new arrivals.'
                        : pct > 60
                          ? 'Moderately busy. Monitor closely.'
                          : 'Well within capacity.'}
                </p>
            </div>
        </div>
    );
}

export default function GuestsDashboard() {
    const [stats, setStats] = useState<DashboardStats>({
        currentGuests: 0,
        checkInsToday: 0,
        checkOutsToday: 0,
        overdueGuests: 0,
        awaitingCheckIn: 0,
        avgDwellMinutes: 0,
    });
    const [isFetching, setIsFetching] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    const fetchStats = useCallback(async () => {
        setIsFetching(true);
        try {
            const { data } = await axios.get('/api/guest-reservations', { params: { per_page: 500 } });
            const all = data.data ?? data;
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const now = Date.now();

            const currentGuests = all.filter((r: any) => !!r.entry_time && !r.exit_time).length;
            const checkInsToday = all.filter((r: any) => r.entry_time && new Date(r.entry_time) >= todayStart).length;
            const checkOutsToday = all.filter((r: any) => r.exit_time && new Date(r.exit_time) >= todayStart).length;
            const overdueGuests = all.filter((r: any) => r.entry_time && !r.exit_time && r.check_out && new Date(r.check_out).getTime() < now).length;
            const awaitingCheckIn = all.filter((r: any) => !r.entry_time && r.check_in && new Date(r.check_in) >= todayStart).length;
            const dwellSamples = all.filter((r: any) => r.entry_time && r.exit_time && new Date(r.entry_time) >= todayStart);
            const avgDwellMinutes = dwellSamples.length
                ? Math.round(
                      dwellSamples.reduce((sum: number, r: any) => sum + (new Date(r.exit_time).getTime() - new Date(r.entry_time).getTime()), 0) /
                          dwellSamples.length /
                          60000,
                  )
                : 0;

            setStats({ currentGuests, checkInsToday, checkOutsToday, overdueGuests, awaitingCheckIn, avgDwellMinutes });
            setLastRefreshed(new Date());
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const occupancyPct = Math.round((stats.currentGuests / CAPACITY) * 100);

    return (
        <div className="space-y-6 rounded-lg bg-background p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-foreground">Guest Management</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Live overview · Refreshed at {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
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

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="On Premises"
                    value={isFetching ? '—' : stats.currentGuests}
                    subtitle={`${occupancyPct}% of capacity`}
                    icon={Users}
                    variant="primary"
                    trend={{ value: 12, isPositive: true }}
                />
                <MetricCard
                    title="Check-ins Today"
                    value={isFetching ? '—' : stats.checkInsToday}
                    subtitle="Since midnight"
                    icon={UserCheck}
                    variant="success"
                    trend={{ value: 8, isPositive: true }}
                />
                <MetricCard
                    title="Awaiting Arrival"
                    value={isFetching ? '—' : stats.awaitingCheckIn}
                    subtitle="Expected today"
                    icon={CalendarClock}
                    variant="default"
                />
                <MetricCard
                    title="Overdue Guests"
                    value={isFetching ? '—' : stats.overdueGuests}
                    subtitle="Past checkout time"
                    icon={AlertTriangle}
                    variant={stats.overdueGuests > 0 ? 'warning' : 'default'}
                    pulse={stats.overdueGuests > 0}
                />
            </div>

            {stats.overdueGuests > 0 && !isFetching && (
                <div className="animate-fade-in flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-500/6 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/12">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">Action Required</p>
                        <p className="truncate text-sm text-muted-foreground">
                            {stats.overdueGuests} guest{stats.overdueGuests !== 1 ? 's have' : ' has'} exceeded their scheduled departure time.
                        </p>
                    </div>
                    <button className="flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-amber-600 hover:underline">
                        Review <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    { icon: Clock3, label: 'Avg dwell time', value: isFetching ? '—' : `${stats.avgDwellMinutes}m`, sub: 'per visit today' },
                    { icon: UserMinus, label: 'Checked out', value: isFetching ? '—' : stats.checkOutsToday, sub: 'departures today' },
                    { icon: Shield, label: 'Patrol progress', value: '75%', sub: 'evening round' },
                    {
                        icon: Users,
                        label: 'Net today',
                        value: isFetching ? '—' : stats.checkInsToday - stats.checkOutsToday,
                        sub: 'check-ins minus outs',
                    },
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
                    <GuestChart />
                </div>
                {/* <div className="space-y-4 lg:col-span-2">
                    <OccupancyGauge current={stats.currentGuests} capacity={CAPACITY} />
                    <WeeklyTrendChart />
                </div> */}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <RecentActivity />
                </div>
                <div className="lg:col-span-2">
                    <GlancePanel stats={stats} loading={isFetching} />
                </div>
            </div>
        </div>
    );
}
