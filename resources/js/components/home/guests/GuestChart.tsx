import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

interface HourSlot {
    time: string;
    checkIns: number;
    checkOuts: number;
    net: number;
}

const HOURS = [
    { label: '6AM', hour: 6 },
    { label: '8AM', hour: 8 },
    { label: '10AM', hour: 10 },
    { label: '12PM', hour: 12 },
    { label: '2PM', hour: 14 },
    { label: '4PM', hour: 16 },
    { label: '6PM', hour: 18 },
    { label: '8PM', hour: 20 },
];

type ChartMode = 'flow' | 'net' | 'bar';

declare const Chart: any;

export function GuestChart() {
    const [data, setData] = useState<HourSlot[]>(HOURS.map((h) => ({ time: h.label, checkIns: 0, checkOuts: 0, net: 0 })));
    const [isFetching, setIsFetching] = useState(true);
    const [mode, setMode] = useState<ChartMode>('flow');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    const fetchData = useCallback(async () => {
        setIsFetching(true);
        try {
            const { data: res } = await axios.get('/api/guest-reservations', { params: { per_page: 500 } });
            const all = res.data ?? res;
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const slots = HOURS.map((h) => ({ time: h.label, checkIns: 0, checkOuts: 0, net: 0 }));
            for (const r of all) {
                const bump = (field: string, key: 'checkIns' | 'checkOuts') => {
                    if (!r[field]) return;
                    const d = new Date(r[field]);
                    if (d < todayStart) return;
                    const hour = d.getHours();
                    const idx = HOURS.findIndex((h, i) => {
                        const next = HOURS[i + 1];
                        return hour >= h.hour && (!next || hour < next.hour);
                    });
                    if (idx !== -1) slots[idx][key]++;
                };
                bump('entry_time', 'checkIns');
                bump('exit_time', 'checkOuts');
            }
            slots.forEach((s) => (s.net = s.checkIns - s.checkOuts));
            setData(slots);
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (isFetching || !canvasRef.current || typeof Chart === 'undefined') return;
        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        const labels = data.map((d) => d.time);
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const tickColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
        const tooltipBg = isDark ? '#1c1b1a' : '#ffffff';
        const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        const commonScales = {
            x: { grid: { color: gridColor, drawBorder: false }, ticks: { color: tickColor, font: { size: 11 } }, border: { display: false } },
            y: {
                grid: { color: gridColor, drawBorder: false },
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
            titleFont: { size: 12, weight: '600' },
            bodyFont: { size: 11 },
        };

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        if (mode === 'flow') {
            chartRef.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Check-ins',
                            data: data.map((d) => d.checkIns),
                            borderColor: 'hsl(359,58%,36%)',
                            backgroundColor: (ctx: any) => {
                                const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
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
                            data: data.map((d) => d.checkOuts),
                            borderColor: 'hsl(35,43%,40%)',
                            backgroundColor: (ctx: any) => {
                                const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
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
                    plugins: { legend: { display: false }, tooltip: { ...commonTooltip } },
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
                            data: data.map((d) => d.net),
                            backgroundColor: data.map((d) => (d.net >= 0 ? 'hsla(359,58%,36%,0.75)' : 'hsla(35,43%,40%,0.75)')),
                            borderColor: data.map((d) => (d.net >= 0 ? 'hsl(359,58%,36%)' : 'hsl(35,43%,40%)')),
                            borderWidth: 1.5,
                            borderRadius: 5,
                            borderSkipped: false,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { ...commonTooltip } },
                    scales: { ...commonScales, y: { ...commonScales.y, min: Math.min(...data.map((d) => d.net)) - 1 } },
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
                            data: data.map((d) => d.checkIns),
                            backgroundColor: 'hsla(359,58%,36%,0.8)',
                            borderColor: 'hsl(359,58%,36%)',
                            borderWidth: 1.5,
                            borderRadius: 5,
                            borderSkipped: false,
                        },
                        {
                            label: 'Check-outs',
                            data: data.map((d) => d.checkOuts),
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
                    plugins: { legend: { display: false }, tooltip: { ...commonTooltip } },
                    scales: commonScales,
                },
            });
        }

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [data, mode, isFetching]);

    const tabs: { mode: ChartMode; label: string }[] = [
        { mode: 'flow', label: 'Flow' },
        { mode: 'bar', label: 'Grouped' },
        { mode: 'net', label: 'Net' },
    ];
    const totalIn = data.reduce((s, d) => s + d.checkIns, 0);
    const totalOut = data.reduce((s, d) => s + d.checkOuts, 0);
    const peakHour = data.reduce((best, d) => (d.checkIns > best.checkIns ? d : best), data[0]);

    return (
        <div className="animate-fade-in rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-serif text-lg font-semibold">Guest Flow Today</h3>
                    <p className="text-sm text-muted-foreground">Check-in & check-out activity by hour</p>
                </div>
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
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                    { label: 'Total arrivals', value: totalIn, color: 'bg-primary' },
                    { label: 'Total departures', value: totalOut, color: 'bg-secondary' },
                    { label: 'Peak hour', value: peakHour?.time ?? '—', color: 'bg-muted-foreground/50' },
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
                    <span className="text-muted-foreground">Check-ins</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-6 rounded-full bg-secondary/70" />
                    <span className="text-muted-foreground">Check-outs</span>
                </div>
                {mode === 'net' && (
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Red = net outflow</span>
                    </div>
                )}
            </div>

            {isFetching ? (
                <div className="flex h-[240px] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <div style={{ position: 'relative', height: '240px' }}>
                    <canvas ref={canvasRef} />
                </div>
            )}
        </div>
    );
}
