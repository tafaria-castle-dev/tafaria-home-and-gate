import { useAuth } from '@/hooks/use-auth';
import { router } from '@inertiajs/react';
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, TimeScale, Title, Tooltip } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { toast } from 'react-hot-toast';
import { route } from 'ziggy-js';
import { getDiscountPercentage } from '../../../utils/discountAsPercentage';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Legend, CategoryScale);

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        padding: '20px',
    },
    filterContainer: {
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
    },
    select: {
        padding: '8px',
        fontSize: '14px',
    },
    input: {
        padding: '8px',
        fontSize: '14px',
    },
    chartContainer: {
        marginBottom: '40px',
    },
    summaryBox: {
        backgroundColor: '#f9fafb',
        padding: '15px',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        marginBottom: '20px',
    },
    summaryTitle: {
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '10px',
    },
    summaryItem: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '5px',
    },
    error: {
        color: 'red',
        marginBottom: '20px',
    },
    loading: {
        color: '#555',
        marginBottom: '20px',
    },
};

interface Tax {
    id: string;
    name: string;
    rate: number;
    tax_code: string;
    created_at: string;
    updated_at: string;
}

interface RoomItemCorporate {
    id: string;
    rooms: number;
    total: number;
    taxes: Tax[];
    taxable_amount: number;
    room_type: string;
    board_type: string;
    amount_ksh: number;
    selectedDiscount?: number | { rate: number } | null;
}

interface RoomItemLeisure {
    id: string;
    type: string;
    totalCost: number;
    nights?: number[];
    kids: number[];
    adultCost?: number;
    room: {
        taxes: Tax[];
        board_type: string;
        amount_ksh: number;
        taxable_amount: number;
    };
    selectedDiscount?: number | { rate: number } | null;
}

interface ServiceItem {
    id: string;
    name: string;
    type: string;
    taxes: Tax[];
    noofpax: number;
    numnights: number;
    amount_ksh: number;
    taxable_amount: number;
    selectedDiscount?: number | { rate: number } | null;
}

interface QuotationDetails {
    selectedType: 'Corporate' | 'Leisure';
    updatedRoomDetails?: RoomItemCorporate[];
    quotationLeisure?: { roomDetails: RoomItemLeisure[] };
    selectedAdditionalServices: ServiceItem[];
    numNights: number;
}

interface Quotation {
    id: string;
    status: string;
    created_at: Date;
    quotation_details: QuotationDetails | string;
}

interface TaxSummary {
    code: string;
    rate: number;
    amount: number;
    name: string;
    taxableAmount: number;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        maximumFractionDigits: 0,
    }).format(Math.round(value));
};

const QuotationsAnalysis: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const [filterType, setFilterType] = useState<string>('month');
    const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            router.visit(route('/login'));
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchQuotations = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(route('quotations.index') + `?startDate=${startDate}&endDate=${endDate}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch quotations');
                }
                const data = await response.json();
                setQuotations(
                    data.map((q: Quotation) => ({
                        ...q,
                        quotation_details: typeof q.quotation_details === 'string' ? JSON.parse(q.quotation_details) : q.quotation_details,
                    })),
                );
            } catch (err) {
                setError((err as Error).message);
                toast.error('Failed to fetch quotations');
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuotations();
    }, [startDate, endDate]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setFilterType(value);
        const now = new Date();
        if (value === 'month') {
            setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (value === '3months') {
            setStartDate(format(subMonths(startOfMonth(now), 2), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (value === '6months') {
            setStartDate(format(subMonths(startOfMonth(now), 5), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (value === 'year') {
            setStartDate(format(subMonths(startOfMonth(now), 11), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        }
    };

    const getPeriodLabel = () => {
        switch (filterType) {
            case 'month':
                return 'This Month';
            case '3months':
                return 'Last 3 Months';
            case '6months':
                return 'Last 6 Months';
            case 'year':
                return 'Last Year';
            case 'custom':
                return 'Custom Range';
            default:
                return 'Selected Period';
        }
    };

    const getChartData = () => {
        const statusByDate: { [date: string]: { [status: string]: number } } = {};
        const totalsByDate: { [date: string]: number } = {};
        const typeByDate: { [date: string]: { [type: string]: number } } = {};
        let totalAmountSum = 0;
        const statusTotals: { [status: string]: number } = {
            pending: 0,
            approved: 0,
            rejected: 0,
            draft: 0,
        };
        const typeTotals: { [type: string]: number } = { Corporate: 0, Leisure: 0 };

        quotations.forEach((q) => {
            const date = format(q.created_at, 'yyyy-MM-dd');
            const status = q.status;
            const quotation_details = q.quotation_details as QuotationDetails;
            const type = quotation_details.selectedType;

            if (!statusByDate[date]) {
                statusByDate[date] = { pending: 0, approved: 0, rejected: 0, draft: 0 };
                totalsByDate[date] = 0;
                typeByDate[date] = { Corporate: 0, Leisure: 0 };
            }

            statusByDate[date][status] = (statusByDate[date][status] || 0) + 1;
            typeByDate[date][type] = (typeByDate[date][type] || 0) + 1;
            statusTotals[status] = (statusTotals[status] || 0) + 1;
            typeTotals[type] = (typeTotals[type] || 0) + 1;

            let roomTotals = { totalAmount: 0, totalDiscount: 0, totalTaxes: 0 };

            if (quotation_details.selectedType === 'Corporate' && quotation_details.updatedRoomDetails) {
                roomTotals = quotation_details.updatedRoomDetails.reduce(
                    (acc, item) => {
                        const nights = quotation_details.numNights;
                        const totalAmount = item.total * nights;
                        let totalTaxable = item.taxable_amount * item.rooms * nights;
                        const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
                        const discountRate = getDiscountPercentage(item.selectedDiscount) / 100 || 0;
                        const discount = Math.round(discountRate * totalAmount);
                        const netDiscount = totalTaxable * discountRate;
                        totalTaxable = totalTaxable - netDiscount;
                        const taxes = (totalRate / 100) * totalTaxable;

                        return {
                            totalAmount: acc.totalAmount + totalAmount,
                            totalDiscount: acc.totalDiscount + discount,
                            totalTaxes: acc.totalTaxes + taxes,
                        };
                    },
                    { totalAmount: 0, totalDiscount: 0, totalTaxes: 0 },
                );
            } else if (quotation_details.selectedType === 'Leisure' && quotation_details.quotationLeisure?.roomDetails) {
                roomTotals = quotation_details.quotationLeisure.roomDetails.reduce(
                    (acc, item) => {
                        const nights = item?.nights?.length! > 0 ? 1 : quotation_details.numNights;
                        const totalAmount = item.totalCost * nights;
                        let totalTaxable = ((item.room.taxable_amount * item.totalCost) / item.room.amount_ksh) * nights;
                        const totalRate = item.room.taxes.reduce((sum, tax) => sum + tax.rate, 0);
                        const discountRate = getDiscountPercentage(item.selectedDiscount) / 100 || 0;
                        const discount = Math.round(discountRate * totalAmount);
                        const netDiscount = totalTaxable * discountRate;
                        totalTaxable = totalTaxable - netDiscount;
                        const taxes = (totalRate / 100) * totalTaxable;

                        return {
                            totalAmount: acc.totalAmount + totalAmount,
                            totalDiscount: acc.totalDiscount + discount,
                            totalTaxes: acc.totalTaxes + taxes,
                        };
                    },
                    { totalAmount: 0, totalDiscount: 0, totalTaxes: 0 },
                );
            }

            const serviceTotals = quotation_details.selectedAdditionalServices.reduce(
                (acc, item) => {
                    const totalAmount = item.amount_ksh * item.noofpax * item.numnights;
                    let totalTaxable = 0;
                    if (item.taxes.length > 0) {
                        const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
                        totalTaxable = totalAmount / (1 + totalRate / 100);
                    }
                    const discountRate = getDiscountPercentage(item.selectedDiscount) / 100 || 0;
                    const discount = Math.round(discountRate * totalAmount);
                    const netDiscount = totalTaxable * discountRate;
                    totalTaxable = totalTaxable - netDiscount;
                    const taxes = (item.taxes.reduce((sum, tax) => sum + tax.rate, 0) / 100) * totalTaxable;

                    return {
                        totalAmount: acc.totalAmount + totalAmount,
                        totalDiscount: acc.totalDiscount + discount,
                        totalTaxes: acc.totalTaxes + taxes,
                    };
                },
                { totalAmount: 0, totalDiscount: 0, totalTaxes: 0 },
            );

            const dateTotal = roomTotals.totalAmount + serviceTotals.totalAmount - roomTotals.totalDiscount - serviceTotals.totalDiscount;
            totalsByDate[date] += dateTotal;
            totalAmountSum += dateTotal;
        });

        const dates = Object.keys(statusByDate).sort();
        const statusChartData = {
            labels: dates,
            datasets: [
                {
                    label: `Pending (${statusTotals.pending})`,
                    data: dates.map((date) => statusByDate[date].pending || 0),
                    borderColor: '#3b82f6',
                    fill: false,
                },
                {
                    label: `Approved (${statusTotals.approved})`,
                    data: dates.map((date) => statusByDate[date].approved || 0),
                    borderColor: '#10b981',
                    fill: false,
                },
                {
                    label: `Draft (${statusTotals.draft})`,
                    data: dates.map((date) => statusByDate[date].draft || 0),
                    borderColor: '#6b7280',
                    fill: false,
                },
            ],
        };

        const totalsChartData = {
            labels: dates,
            datasets: [
                {
                    label: 'Total Amount (KSh)',
                    data: dates.map((date) => totalsByDate[date] || 0),
                    borderColor: '#8b5cf6',
                    fill: false,
                },
            ],
        };

        const typeChartData = {
            labels: dates,
            datasets: [
                {
                    label: `Corporate (${typeTotals.Corporate})`,
                    data: dates.map((date) => typeByDate[date].Corporate || 0),
                    borderColor: '#ef4444',
                    fill: false,
                },
                {
                    label: `Leisure (${typeTotals.Leisure})`,
                    data: dates.map((date) => typeByDate[date].Leisure || 0),
                    borderColor: '#3b82f6',
                    fill: false,
                },
            ],
        };

        return {
            statusChartData,
            totalsChartData,
            typeChartData,
            totalAmountSum,
            statusTotals,
            typeTotals,
        };
    };

    const { statusChartData, totalsChartData, typeChartData, totalAmountSum } = getChartData();
    const periodLabel = getPeriodLabel();

    return (
        <div style={styles.container} className="mt-5 rounded-lg bg-white p-4 shadow-md sm:p-6">
            <h2 className="text-lg font-semibold text-gray-700 sm:text-xl">Quotations Analysis</h2>
            {isLoading && <div style={styles.loading}>Loading...</div>}
            {error && <div style={styles.error}>Error: {error}</div>}
            <div style={styles.filterContainer}>
                <select style={styles.select} value={filterType} onChange={handleFilterChange}>
                    <option value="month">This Month</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="6months">Last 6 Months</option>
                    <option value="year">Last Year</option>
                    <option value="custom">Custom Range</option>
                </select>
                {filterType === 'custom' && (
                    <>
                        <input type="date" style={styles.input} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        <input type="date" style={styles.input} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </>
                )}
            </div>
            <div style={styles.chartContainer}>
                <h2>Quotations by Status for {periodLabel}</h2>
                <Line
                    data={statusChartData}
                    options={{
                        scales: {
                            x: { type: 'time', time: { unit: 'day' } },
                            y: { beginAtZero: true, title: { display: true, text: 'Count' } },
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: `Quotations by Status for ${periodLabel}`,
                            },
                        },
                    }}
                />
            </div>
            <div style={styles.chartContainer}>
                <h2>Quotations by Type for {periodLabel}</h2>
                <Line
                    data={typeChartData}
                    options={{
                        scales: {
                            x: { type: 'time', time: { unit: 'day' } },
                            y: { beginAtZero: true, title: { display: true, text: 'Count' } },
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: `Quotations by Type for ${periodLabel}`,
                            },
                        },
                    }}
                />
            </div>
            <div style={styles.chartContainer}>
                <h2>Total Amounts for {periodLabel}</h2>
                <Line
                    data={totalsChartData}
                    options={{
                        scales: {
                            x: { type: 'time', time: { unit: 'day' } },
                            y: { beginAtZero: true, title: { display: true, text: 'KSh' } },
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: `Total Amounts for ${periodLabel} (${formatCurrency(totalAmountSum)})`,
                            },
                        },
                    }}
                />
            </div>
        </div>
    );
};

export default QuotationsAnalysis;
