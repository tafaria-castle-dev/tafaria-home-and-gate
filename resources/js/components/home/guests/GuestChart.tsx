import axios from 'axios';
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
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

Chart.register(LineElement, BarElement, PointElement, LineController, BarController, CategoryScale, LinearScale, Filler, Tooltip, Legend);

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
    return { hour, label: hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM` };
});

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

            const gridColor = 'rgba(0,0,0,0.04)';
            const tickColor = 'rgba(0,0,0,0.28)';
            const tooltipBg = '#ffffff';
            const tooltipBorder = 'rgba(0,0,0,0.07)';

            const primaryRed = '#902729';
            const primaryRedAlpha = 'rgba(144,39,41,0.12)';
            const goldBrown = '#93723c';
            const goldBrownAlpha = 'rgba(147,114,60,0.12)';

            const commonScales = {
                x: {
                    grid: { display: false },
                    ticks: { color: tickColor, font: { size: 10, family: 'DM Sans, sans-serif' } },
                    border: { display: false },
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: tickColor, font: { size: 10, family: 'DM Sans, sans-serif' }, stepSize: 1, precision: 0 },
                    border: { display: false },
                },
            };

            const commonTooltip = {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderWidth: 1,
                titleColor: '#1c1208',
                bodyColor: '#6b5c45',
                padding: 12,
                cornerRadius: 12,
                titleFont: { size: 12, weight: 'bold' as const, family: 'DM Sans, sans-serif' },
                bodyFont: { size: 11, family: 'DM Sans, sans-serif' },
                boxPadding: 5,
                boxWidth: 10,
                boxHeight: 10,
                usePointStyle: true,
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
                                    borderColor: primaryRed,
                                    backgroundColor: (c: any) => {
                                        const g = c.chart.ctx.createLinearGradient(0, 0, 0, c.chart.height);
                                        g.addColorStop(0, 'rgba(144,39,41,0.15)');
                                        g.addColorStop(1, 'rgba(144,39,41,0)');
                                        return g;
                                    },
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.4,
                                    pointRadius: 3,
                                    pointHoverRadius: 5,
                                    pointBackgroundColor: primaryRed,
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 2,
                                },
                                {
                                    label: 'Check-outs',
                                    data: hourlyData.map((d) => d.checkOuts),
                                    borderColor: goldBrown,
                                    backgroundColor: (c: any) => {
                                        const g = c.chart.ctx.createLinearGradient(0, 0, 0, c.chart.height);
                                        g.addColorStop(0, 'rgba(147,114,60,0.12)');
                                        g.addColorStop(1, 'rgba(147,114,60,0)');
                                        return g;
                                    },
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.4,
                                    pointRadius: 3,
                                    pointHoverRadius: 5,
                                    pointBackgroundColor: goldBrown,
                                    pointBorderColor: '#ffffff',
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
                                    backgroundColor: hourlyData.map((d) => (d.net >= 0 ? 'rgba(144,39,41,0.75)' : 'rgba(147,114,60,0.75)')),
                                    borderColor: hourlyData.map((d) => (d.net >= 0 ? primaryRed : goldBrown)),
                                    borderWidth: 1.5,
                                    borderRadius: 6,
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
                                    backgroundColor: 'rgba(144,39,41,0.8)',
                                    borderColor: primaryRed,
                                    borderWidth: 1.5,
                                    borderRadius: 6,
                                    borderSkipped: false,
                                },
                                {
                                    label: 'Check-outs',
                                    data: hourlyData.map((d) => d.checkOuts),
                                    backgroundColor: 'rgba(147,114,60,0.8)',
                                    borderColor: goldBrown,
                                    borderWidth: 1.5,
                                    borderRadius: 6,
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
                                backgroundColor: 'rgba(144,39,41,0.8)',
                                borderColor: primaryRed,
                                borderWidth: 1.5,
                                borderRadius: 5,
                                borderSkipped: false,
                            },
                            {
                                label: 'Departures',
                                data: dailyData.map((d) => d.departures),
                                backgroundColor: 'rgba(147,114,60,0.8)',
                                borderColor: goldBrown,
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
        };
        render();
        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [hourlyData, dailyData, mode, isFetching, isToday]);

    const totalIn = isToday ? hourlyData.reduce((s, d) => s + d.checkIns, 0) : dailyData.reduce((s, d) => s + d.arrivals, 0);
    const totalOut = isToday ? hourlyData.reduce((s, d) => s + d.checkOuts, 0) : dailyData.reduce((s, d) => s + d.departures, 0);
    const peakLabel = isToday
        ? (hourlyData.reduce((best, d) => (d.checkIns > best.checkIns ? d : best), hourlyData[0])?.time ?? '—')
        : dailyData.reduce((best, d) => (d.arrivals > best.arrivals ? d : best), dailyData[0])
          ? formatDateLabel(dailyData.reduce((best, d) => (d.arrivals > best.arrivals ? d : best), dailyData[0]).date)
          : '—';

    const netTrend = totalIn - totalOut;

    return (
        <div className="h-full rounded-2xl border border-stone-200/60 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-serif text-lg font-semibold text-stone-800">Guest Flow</h3>
                    <p className="mt-0.5 text-xs text-stone-400">
                        {isToday ? 'Hourly check-in & check-out activity' : 'Daily arrivals & departures'}
                    </p>
                </div>
                {isToday && (
                    <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
                        {(
                            [
                                { mode: 'flow', label: 'Flow' },
                                { mode: 'bar', label: 'Grouped' },
                                { mode: 'net', label: 'Net' },
                            ] as { mode: ChartMode; label: string }[]
                        ).map((t) => (
                            <button
                                key={t.mode}
                                onClick={() => setMode(t.mode)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                                    mode === t.mode ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                    {
                        label: isToday ? 'Arrivals' : 'Total arrivals',
                        value: totalIn,
                        dotColor: 'bg-rose-700',
                    },
                    {
                        label: isToday ? 'Departures' : 'Total departures',
                        value: totalOut,
                        dotColor: 'bg-amber-700',
                    },
                    {
                        label: isToday ? 'Peak hour' : 'Peak day',
                        value: peakLabel,
                        dotColor: 'bg-stone-400',
                        extra:
                            netTrend !== 0 ? (
                                <div
                                    className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${netTrend > 0 ? 'text-emerald-600' : 'text-rose-500'}`}
                                >
                                    {netTrend > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                    {Math.abs(netTrend)} net
                                </div>
                            ) : null,
                    },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-3">
                        <div className="mb-1.5 flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dotColor}`} />
                            <span className="text-[9px] font-bold tracking-[0.1em] text-stone-400 uppercase">{s.label}</span>
                        </div>
                        <p className="font-serif text-2xl font-bold text-stone-800">{s.value}</p>
                        {'extra' in s && s.extra}
                    </div>
                ))}
            </div>

            <div className="mb-4 flex items-center gap-5">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-4 rounded-sm bg-rose-700/70" />
                    <span className="text-xs text-stone-400">{isToday ? 'Check-ins' : 'Arrivals'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-4 rounded-sm bg-amber-700/70" />
                    <span className="text-xs text-stone-400">{isToday ? 'Check-outs' : 'Departures'}</span>
                </div>
                {isToday && mode === 'net' && <span className="text-xs text-stone-400 italic">Amber = net outflow</span>}
            </div>

            {isFetching ? (
                <div className="flex h-[220px] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-rose-100 border-t-rose-700" />
                </div>
            ) : dailyData.length === 0 && !isToday ? (
                <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-stone-400">
                    <span className="text-3xl">📊</span>
                    <span className="text-sm font-medium">No data for this period</span>
                </div>
            ) : (
                <div style={{ position: 'relative', height: '220px' }}>
                    <canvas ref={canvasRef} />
                </div>
            )}
        </div>
    );
}
