import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

interface HourSlot {
    time: string;
    checkIns: number;
    checkOuts: number;
    net: number;
}

interface DailySlot {
    date: string;
    arrivals: number;
    departures: number;
}

type ChartMode = 'flow' | 'net' | 'bar';
type Period = 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'last30Days' | 'thisMonth' | 'custom';

interface GuestChartProps {
    period: Period;
    customStart?: string;
    customEnd?: string;
}

const HOURS = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 6;
    return {
        hour,
        label: hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`,
    };
});

import {
    BarController,
    BarElement,
    CategoryScale,
    Chart,
    Filler,
    Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    Tooltip,
} from 'chart.js';

Chart.register(LineElement, BarElement, PointElement, LineController, BarController, CategoryScale, LinearScale, Filler, Tooltip, Legend);

function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function GuestChart({ period, customStart, customEnd }: GuestChartProps) {
    const [hourlyData, setHourlyData] = useState<HourSlot[]>(HOURS.map((h) => ({ time: h.label, checkIns: 0, checkOuts: 0, net: 0 })));
    const [dailyData, setDailyData] = useState<DailySlot[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [mode, setMode] = useState<ChartMode>('flow');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    const isToday = period === 'today';

    const buildAggParams = useCallback(() => {
        const p: Record<string, string> = { dateRange: period };
        if (period === 'custom' && customStart && customEnd) {
            p.customStart = customStart;
            p.customEnd = customEnd;
        }
        return p;
    }, [period, customStart, customEnd]);

    const fetchData = useCallback(async () => {
        setIsFetching(true);
        try {
            const params = buildAggParams();

            const { data: agg } = await axios.get('/api/guest-reservations/aggregations', { params });

            const arrivals: { date: string; count: number }[] = agg.daily_arrivals ?? [];
            const departures: { date: string; count: number }[] = agg.daily_departures ?? [];

            const allDates = Array.from(new Set([...arrivals.map((a) => a.date), ...departures.map((d) => d.date)])).sort();
            const daily: DailySlot[] = allDates.map((date) => ({
                date,
                arrivals: arrivals.find((a) => a.date === date)?.count ?? 0,
                departures: departures.find((d) => d.date === date)?.count ?? 0,
            }));
            setDailyData(daily);

            if (isToday) {
                const { data: res } = await axios.get('/api/guest-reservations', {
                    params: { dateField: 'entry_time', dateRange: 'today', per_page: 500 },
                });
                const all = res.data ?? res;
                const slots = HOURS.map((h) => ({ time: h.label, checkIns: 0, checkOuts: 0, net: 0 }));

                for (const r of all) {
                    const bump = (field: string, key: 'checkIns' | 'checkOuts') => {
                        if (!r[field]) return;
                        const hour = new Date(r[field]).getHours();
                        const idx = HOURS.findIndex((h) => h.hour === hour);
                        if (idx !== -1) slots[idx][key]++;
                    };
                    bump('entry_time', 'checkIns');
                    bump('exit_time', 'checkOuts');
                }
                slots.forEach((s) => (s.net = s.checkIns - s.checkOuts));
                setHourlyData(slots);
            }
        } finally {
            setIsFetching(false);
        }
    }, [buildAggParams, isToday]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (isFetching) return;

        const render = async () => {
            if (!canvasRef.current) return;

            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }

            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
            const tickColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
            const tooltipBg = isDark ? '#1c1b1a' : '#ffffff';
            const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

            const commonScales = {
                x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 11 } }, border: { display: false } },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: tickColor, font: { size: 11 }, stepSize: 1, precision: 0 },
                    border: { display: false },
                },
            };
            const commonTooltip = {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                titleColor: isDark ? '#e2e0d8' : '#1a1a18',
                bodyColor: isDark ? '#9c9a92' : '#73726c',
                padding: 10,
                cornerRadius: 8,
                titleFont: { size: 12, weight: 'bold' as const },
                bodyFont: { size: 11 },
            };

            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            if (isToday) {
                const labels = hourlyData.map((d) => d.time);

                if (mode === 'flow') {
                    chartRef.current = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: 'Check-ins',
                                    data: hourlyData.map((d) => d.checkIns),
                                    borderColor: 'hsl(359,58%,36%)',
                                    backgroundColor: (c: any) => {
                                        const g = c.chart.ctx.createLinearGradient(0, 0, 0, c.chart.height);
                                        g.addColorStop(0, 'hsla(359,58%,36%,0.22)');
                                        g.addColorStop(1, 'hsla(359,58%,36%,0)');
                                        return g;
                                    },
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.45,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    pointBackgroundColor: 'hsl(359,58%,36%)',
                                    pointBorderColor: tooltipBg,
                                    pointBorderWidth: 2,
                                },
                                {
                                    label: 'Check-outs',
                                    data: hourlyData.map((d) => d.checkOuts),
                                    borderColor: 'hsl(35,43%,40%)',
                                    backgroundColor: (c: any) => {
                                        const g = c.chart.ctx.createLinearGradient(0, 0, 0, c.chart.height);
                                        g.addColorStop(0, 'hsla(35,43%,40%,0.18)');
                                        g.addColorStop(1, 'hsla(35,43%,40%,0)');
                                        return g;
                                    },
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.45,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    pointBackgroundColor: 'hsl(35,43%,40%)',
                                    pointBorderColor: tooltipBg,
                                    pointBorderWidth: 2,
                                },
                            ],
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: 'index', intersect: false },
                            plugins: { legend: { display: false }, tooltip: commonTooltip },
                            scales: commonScales,
                        },
                    });
                } else if (mode === 'net') {
                    chartRef.current = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: 'Net flow',
                                    data: hourlyData.map((d) => d.net),
                                    backgroundColor: hourlyData.map((d) => (d.net >= 0 ? 'hsla(359,58%,36%,0.75)' : 'hsla(35,43%,40%,0.75)')),
                                    borderColor: hourlyData.map((d) => (d.net >= 0 ? 'hsl(359,58%,36%)' : 'hsl(35,43%,40%)')),
                                    borderWidth: 1.5,
                                    borderRadius: 5,
                                    borderSkipped: false,
                                },
                            ],
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false }, tooltip: commonTooltip },
                            scales: { ...commonScales, y: { ...commonScales.y, min: Math.min(...hourlyData.map((d) => d.net)) - 1 } },
                        },
                    });
                } else {
                    chartRef.current = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels,
                            datasets: [
                                {
                                    label: 'Check-ins',
                                    data: hourlyData.map((d) => d.checkIns),
                                    backgroundColor: 'hsla(359,58%,36%,0.8)',
                                    borderColor: 'hsl(359,58%,36%)',
                                    borderWidth: 1.5,
                                    borderRadius: 5,
                                    borderSkipped: false,
                                },
                                {
                                    label: 'Check-outs',
                                    data: hourlyData.map((d) => d.checkOuts),
                                    backgroundColor: 'hsla(35,43%,40%,0.8)',
                                    borderColor: 'hsl(35,43%,40%)',
                                    borderWidth: 1.5,
                                    borderRadius: 5,
                                    borderSkipped: false,
                                },
                            ],
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: 'index', intersect: false },
                            plugins: { legend: { display: false }, tooltip: commonTooltip },
                            scales: commonScales,
                        },
                    });
                }
            } else {
                const labels = dailyData.map((d) => formatDateLabel(d.date));
                chartRef.current = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [
                            {
                                label: 'Arrivals',
                                data: dailyData.map((d) => d.arrivals),
                                backgroundColor: 'hsla(359,58%,36%,0.8)',
                                borderColor: 'hsl(359,58%,36%)',
                                borderWidth: 1.5,
                                borderRadius: 4,
                                borderSkipped: false,
                            },
                            {
                                label: 'Departures',
                                data: dailyData.map((d) => d.departures),
                                backgroundColor: 'hsla(35,43%,40%,0.8)',
                                borderColor: 'hsl(35,43%,40%)',
                                borderWidth: 1.5,
                                borderRadius: 4,
                                borderSkipped: false,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: { legend: { display: false }, tooltip: commonTooltip },
                        scales: commonScales,
                    },
                });
            }
        };

        render();

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [hourlyData, dailyData, mode, isFetching, isToday]);

    const tabs: { mode: ChartMode; label: string }[] = [
        { mode: 'flow', label: 'Flow' },
        { mode: 'bar', label: 'Grouped' },
        { mode: 'net', label: 'Net' },
    ];

    const totalIn = isToday ? hourlyData.reduce((s, d) => s + d.checkIns, 0) : dailyData.reduce((s, d) => s + d.arrivals, 0);
    const totalOut = isToday ? hourlyData.reduce((s, d) => s + d.checkOuts, 0) : dailyData.reduce((s, d) => s + d.departures, 0);
    const peakLabel = isToday
        ? (hourlyData.reduce((best, d) => (d.checkIns > best.checkIns ? d : best), hourlyData[0])?.time ?? '—')
        : dailyData.reduce((best, d) => (d.arrivals > best.arrivals ? d : best), dailyData[0])
          ? formatDateLabel(dailyData.reduce((best, d) => (d.arrivals > best.arrivals ? d : best), dailyData[0]).date)
          : '—';

    return (
        <div className="animate-fade-in rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-serif text-lg font-semibold">Guest Flow</h3>
                    <p className="text-sm text-muted-foreground">
                        {isToday ? 'Check-in & check-out activity by hour' : 'Daily arrivals & departures'}
                    </p>
                </div>
                {isToday && (
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
                        {tabs.map((t) => (
                            <button
                                key={t.mode}
                                onClick={() => setMode(t.mode)}
                                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${mode === t.mode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                    { label: 'Total arrivals', value: totalIn, color: 'bg-primary' },
                    { label: 'Total departures', value: totalOut, color: 'bg-[hsl(35,43%,40%)]' },
                    { label: isToday ? 'Peak hour' : 'Peak day', value: peakLabel, color: 'bg-muted-foreground/50' },
                ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-muted/40 px-3 py-2.5">
                        <div className="mb-0.5 flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${s.color}`} />
                            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{s.label}</span>
                        </div>
                        <p className="font-serif text-xl font-bold text-foreground">{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="mb-3 flex items-center gap-5 text-xs">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-6 rounded-full bg-primary/70" />
                    <span className="text-muted-foreground">Arrivals</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-6 rounded-full" style={{ backgroundColor: 'hsla(35,43%,40%,0.7)' }} />
                    <span className="text-muted-foreground">Departures</span>
                </div>
                {isToday && mode === 'net' && <span className="text-muted-foreground">Brown = net outflow</span>}
            </div>

            {isFetching ? (
                <div className="flex h-[240px] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : dailyData.length === 0 && !isToday ? (
                <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-muted-foreground">
                    <span className="text-2xl">📊</span>
                    <span className="text-sm">No data for this period</span>
                </div>
            ) : (
                <div style={{ position: 'relative', height: '240px' }}>
                    <canvas ref={canvasRef} />
                </div>
            )}
        </div>
    );
}
