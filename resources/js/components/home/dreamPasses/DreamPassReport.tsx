import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Filter, Search, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Redemption {
    redeemed_at: string;
}

interface Activity {
    id: string;
    activity_name: string;
    voucher_count: number;
    valid_from: string;
    valid_to: string;
    redemptions: Redemption[];
}

interface DreamPass {
    id: string;
    room_number: string;
    status: string;
    check_in_date: string;
    check_out_date: string;
    created_at: string;
    activities: Activity[];
}

const DreamPassReports: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
    const [tempFilters, setTempFilters] = useState<{ dateFrom?: string; dateTo?: string }>({});
    const [filters, setFilters] = useState<{ dateFrom?: string; dateTo?: string }>({});
    const [dreamPasses, setDreamPasses] = useState<DreamPass[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    const { minDate, maxDate } = useMemo(() => {
        if (dreamPasses.length === 0) return { minDate: '', maxDate: '' };
        const allCheckIns = dreamPasses.map((p) => parseISO(p.check_in_date));
        const allCheckOuts = dreamPasses.map((p) => parseISO(p.check_out_date));
        const overallMin = new Date(Math.min(...allCheckIns.map((d) => d.getTime())));
        const overallMax = new Date(Math.max(...allCheckOuts.map((d) => d.getTime())));
        return {
            minDate: format(overallMin, 'yyyy-MM-dd'),
            maxDate: format(overallMax, 'yyyy-MM-dd'),
        };
    }, [dreamPasses]);

    const fetchDreamPasses = useCallback(async () => {
        setIsFetching(true);
        try {
            const response = await axios.get('/api/dream-passes');
            setDreamPasses(response.data.data || []);
        } catch (error) {
            toast.error('Failed to fetch data');
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchDreamPasses();
        }
    }, [isAuthenticated, fetchDreamPasses]);

    const activityReports = useMemo(() => {
        const activityMap: Map<string, Map<string, number>> = new Map();
        const dateFrom = filters.dateFrom ? parseISO(filters.dateFrom) : undefined;
        const dateTo = filters.dateTo ? parseISO(filters.dateTo) : undefined;

        const toStartOfDay = (date: Date): Date => {
            const normalized = new Date(date);
            normalized.setHours(0, 0, 0, 0);
            return normalized;
        };

        dreamPasses.forEach((pass) => {
            const passStart = toStartOfDay(parseISO(pass.check_in_date));
            const passEnd = toStartOfDay(parseISO(pass.check_out_date));

            pass.activities.forEach((activity) => {
                const validFrom = toStartOfDay(parseISO(activity.valid_from));
                const validTo = toStartOfDay(parseISO(activity.valid_to));

                activity.redemptions.forEach((redemption) => {
                    const redeemDateStr = redemption.redeemed_at.slice(0, 10);
                    const redeemDate = toStartOfDay(parseISO(redeemDateStr));

                    console.log(
                        'Redeem Date:',
                        redeemDateStr,
                        'Pass Start:',
                        pass.check_in_date,
                        'Pass End:',
                        pass.check_out_date,
                        'Valid From:',
                        activity.valid_from,
                        'Valid To:',
                        activity.valid_to,
                    );

                    const withinPassStay = redeemDate >= passStart && redeemDate <= passEnd;

                    const withinActivityValidity = redeemDate >= validFrom && redeemDate <= validTo;

                    const withinFilter = (!dateFrom || redeemDate >= toStartOfDay(dateFrom)) && (!dateTo || redeemDate <= toStartOfDay(dateTo));

                    if (withinPassStay && withinActivityValidity && withinFilter) {
                        if (!activityMap.has(activity.activity_name)) {
                            activityMap.set(activity.activity_name, new Map());
                        }
                        const dateMap = activityMap.get(activity.activity_name)!;
                        dateMap.set(redeemDateStr, (dateMap.get(redeemDateStr) || 0) + 1);
                    }
                });
            });
        });

        return Array.from(activityMap.entries()).map(([name, dateCounts]) => {
            const sortedDates = Array.from(dateCounts.keys()).sort();
            const total = Array.from(dateCounts.values()).reduce((sum, count) => sum + count, 0);
            return {
                name,
                dateCounts,
                sortedDates,
                data: sortedDates.map((date) => dateCounts.get(date) || 0),
                total,
            };
        });
    }, [dreamPasses, filters]);

    const filteredReports = useMemo(() => {
        const lowerQuery = searchQuery.toLowerCase().trim();
        return activityReports.filter((report) => report.name.toLowerCase().includes(lowerQuery)).sort((a, b) => b.total - a.total);
    }, [activityReports, searchQuery]);

    const applyFilters = () => {
        setFilters(tempFilters);
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        setTempFilters({});
        setFilters({});
        setIsFilterOpen(false);
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: { mode: 'index' as const, intersect: false },
        },
        scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } },
            x: { ticks: { maxRotation: 45, minRotation: 0 } },
        },
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
                >
                    <div className="bg-gradient-to-r from-[#902729] to-[#7e1a1c] px-6 py-5 text-white sm:px-8 sm:py-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-xl font-bold sm:text-2xl">Redemptions Report</h2>
                                <p className="mt-1 text-sm opacity-90 sm:text-base">{filteredReports.length} activities</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-8">
                        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by activity..."
                                    className="w-full rounded-lg border border-gray-300 py-3 pr-10 pl-10 focus:border-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-5 py-3 text-white hover:bg-gray-900"
                            >
                                <Filter className="h-5 w-5" />
                                Filters
                                <ChevronDown className={`h-5 w-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
                                        <h3 className="mb-4 text-base font-semibold sm:text-lg">Filter by Date Range</h3>
                                        {minDate && maxDate && (
                                            <p className="mb-4 text-sm text-gray-600">
                                                Allowed range: {format(parseISO(minDate), 'dd MMM yyyy')} – {format(parseISO(maxDate), 'dd MMM yyyy')}
                                            </p>
                                        )}
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">From Date</label>
                                                <input
                                                    type="date"
                                                    min={minDate}
                                                    max={tempFilters.dateTo || maxDate}
                                                    value={tempFilters.dateFrom || ''}
                                                    onChange={(e) => setTempFilters({ ...tempFilters, dateFrom: e.target.value })}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">To Date</label>
                                                <input
                                                    type="date"
                                                    min={tempFilters.dateFrom || minDate}
                                                    max={maxDate}
                                                    value={tempFilters.dateTo || ''}
                                                    onChange={(e) => setTempFilters({ ...tempFilters, dateTo: e.target.value })}
                                                    className="mt-1 w-full rounded-lg border border-gray-300 p-2"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                            <button
                                                onClick={clearFilters}
                                                className="order-2 rounded-lg bg-gray-200 px-5 py-2 text-gray-700 hover:bg-gray-300 sm:order-1"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                onClick={applyFilters}
                                                className="order-1 rounded-lg bg-indigo-600 px-6 py-2 text-white hover:bg-indigo-700 sm:order-2"
                                            >
                                                Apply Filters
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {isFetching ? (
                            <div className="flex items-center justify-center py-20">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                    className="h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent"
                                />
                            </div>
                        ) : filteredReports.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">No reports found</div>
                        ) : (
                            <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                                {filteredReports.map((report) => (
                                    <motion.div
                                        key={report.name}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
                                    >
                                        <div className="mb-4 flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="truncate text-lg font-bold text-gray-900 sm:text-xl">{report.name}</h3>
                                            </div>
                                            <div className="ml-4 text-right">
                                                <p className="text-sm text-gray-600">Total</p>
                                                <p className="text-2xl font-bold text-gray-900">{report.total}</p>
                                            </div>
                                        </div>

                                        <div className="h-64 w-full">
                                            <Bar
                                                options={chartOptions}
                                                data={{
                                                    labels: report.sortedDates.map((d) => format(parseISO(d), 'dd MMM')),
                                                    datasets: [
                                                        {
                                                            label: 'Redemptions',
                                                            data: report.data,
                                                            backgroundColor: '#93723c',
                                                            borderColor: '#7e1a1c',
                                                            borderWidth: 1,
                                                        },
                                                    ],
                                                }}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default DreamPassReports;
