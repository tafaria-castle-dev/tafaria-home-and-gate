import { useAuth } from '@/hooks/use-auth';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { BarChart3, ChevronDown, ChevronUp, DollarSign, Filter, TrendingUp, Users, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, Cell, LabelProps, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { route } from 'ziggy-js';
import ViewDashboardOpportunities from './opportunities/ViewDashboardOpportunities';
interface User {
    id: string;
    name: string;
    role: string;
}

interface Opportunity {
    id: string;
    name: string;
    stage: string;
    amount: number;
    close_date: Date;
    last_update: { updated_at: Date };
    created_at: Date;
    assistant_clerk: User;
    prepared_by?: string;
}

interface OpportunityStage {
    key: string;
    label: string;
    color: string;
}

interface Filters {
    timeRange: string;
    dateType: string;
    minAmount: string;
    maxAmount: string;
    assistantClerk: string;
    prepared_by_clerk?: string;
    stage: string;
    customStart: string;
    customEnd: string;
}

interface ChartDataItem {
    stage: string;
    [key: string]: string | number;
}

interface UserChartDataItem {
    user: string;
    [key: string]: string | number;
}

interface StageCountData {
    stage: string;
    count: number;
    color: string;
}

const generateUserColors = (users: User[]) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#64748B', '#A855F7'];
    return users.reduce((acc: Record<string, string>, user, index) => {
        acc[user.id] = colors[index % colors.length];
        return acc;
    }, {});
};
interface BarLabelProps {
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
}
const SalesForceDashboard: React.FC = () => {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [allUsers, setAllUsers] = useState<{ id: string; name: string; role: string }[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const fetchOpportunities = async () => {
        setIsFetching(true);
        try {
            const response = await axios.get('/api/opportunities', {
                params: {
                    ...filters,
                },
            });

            setOpportunities(response.data.results);
        } catch (error) {
            toast.error('Failed to fetch opportunities');
        } finally {
            setIsFetching(false);
        }
    };
    const fetchUsers = async () => {
        setIsUsersLoading(true);
        try {
            const response = await axios.get('/api/users');
            const filteredUsers = response.data
                .filter((user: any) => {
                    if (!user.assistant_clerk_opportunities || user.assistant_clerk_opportunities.length === 0) {
                        return false;
                    }
                    if (user.role === 'super_staff') {
                        return user.name.includes('Laura');
                    }
                    return true;
                })
                .flatMap((user: any) => {
                    if (user.role === 'super_staff') {
                        return user.name.split(',').map((name: string) => {
                            const trimmedName = name.trim();
                            return {
                                ...user,
                                name: trimmedName,
                                id: trimmedName.includes('Francis') ? 'cmcakep27000cxy0rd6mmi0na' : user.id,
                            };
                        });
                    }
                    return user;
                })
                .sort((a: any, b: any) => a.name.localeCompare(b.name));
            setAllUsers(filteredUsers);
        } catch (error) {
            toast.error('Failed to fetch users');
        } finally {
            setIsUsersLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchOpportunities();
    }, []);
    const { user, isAuthenticated } = useAuth();
    const users = useMemo(() => {
        return allUsers ?? [];
    }, [allUsers]);
    const [viewType, setViewType] = useState<'by-stage' | 'by-user'>('by-stage');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState<Filters>({
        timeRange: 'all',
        dateType: 'close_date',
        minAmount: '',
        maxAmount: '',
        assistantClerk: user?.role === 'admin' ? 'all' : user?.id || 'all',
        prepared_by_clerk: '',
        stage: '',
        customStart: '',
        customEnd: '',
    });
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [modalFilters, setModalFilters] = useState<any>({});
    const filterRef = useRef<HTMLDivElement>(null);

    const userColors = generateUserColors(users);

    const opportunityStages: OpportunityStage[] = [
        { key: 'Qualify', label: 'Qualify', color: '#F59E0B' },
        { key: 'MeetAndPresent', label: 'Meet & Present', color: '#3B82F6' },
        { key: 'Propose', label: 'Propose', color: '#8B5CF6' },
        { key: 'Negotiate', label: 'Negotiate', color: '#10B981' },
        { key: 'ClosedWon', label: 'Closed Won', color: '#059669' },
        { key: 'ClosedLost', label: 'Closed Lost', color: '#EF4444' },
    ];

    const getFilteredOpportunities = (): Opportunity[] => {
        let filtered = [...opportunities];

        if (filters.stage) {
            filtered = filtered.filter((opp) => opp.stage === filters.stage);
        }

        if (filters.assistantClerk && filters.assistantClerk !== 'all') {
            const selectedUser = users.find((u) => u.id === filters.assistantClerk);

            if (selectedUser) {
                if (selectedUser.role === 'super_staff' || selectedUser.id === 'cmcakep27000cxy0rd6mmi0na') {
                    if (filters.assistantClerk === 'cmcakep27000cxy0rd6mmi0na') {
                        // Francis
                        filtered = filtered.filter((opp) => opp.assistant_clerk.role === 'super_staff' && opp.prepared_by?.includes('Francis'));
                    } else {
                        filtered = filtered.filter(
                            (opp) =>
                                (opp.assistant_clerk.role === 'super_staff' && (!opp.prepared_by || opp.prepared_by === '')) ||
                                opp.prepared_by?.includes('Laura'),
                        );
                    }
                } else {
                    filtered = filtered.filter((opp) => opp.assistant_clerk.id === filters.assistantClerk);
                }
            }
        }

        if (filters.timeRange !== 'all' && filters.dateType) {
            const now = new Date();
            let startDate: Date | null = null;
            let endDate: Date = now;

            if (filters.timeRange === 'custom' && filters.customStart && filters.customEnd) {
                startDate = new Date(filters.customStart);
                endDate = new Date(filters.customEnd);
                endDate.setHours(23, 59, 59, 999);
            } else if (filters.timeRange !== 'custom') {
                switch (filters.timeRange) {
                    case 'last3Months':
                        startDate = new Date(now);
                        startDate.setMonth(startDate.getMonth() - 3);
                        break;
                    case 'last6Months':
                        startDate = new Date(now);
                        startDate.setMonth(startDate.getMonth() - 6);
                        break;
                    case 'lastYear':
                        startDate = new Date(now);
                        startDate.setFullYear(startDate.getFullYear() - 1);
                        break;
                }
            }

            if (startDate) {
                filtered = filtered.filter((opp) => {
                    let dateToCheck: Date;

                    if (filters.dateType === 'last_update') {
                        dateToCheck = new Date(opp.last_update?.updated_at || opp.created_at);
                    } else if (filters.dateType === 'created_at') {
                        dateToCheck = new Date(opp.created_at);
                    } else {
                        dateToCheck = new Date(opp.close_date);
                    }

                    return dateToCheck >= startDate! && dateToCheck <= endDate;
                });
            }
        }

        if (filters.minAmount) {
            filtered = filtered.filter((opp) => opp.amount >= parseFloat(filters.minAmount));
        }

        if (filters.maxAmount) {
            filtered = filtered.filter((opp) => opp.amount <= parseFloat(filters.maxAmount));
        }

        return filtered;
    };

    const handleBarClick = (data: any, user?: User, stage?: string) => {
        const newFilters: any = {};

        if (filters.stage && !stage) {
            newFilters.stage = filters.stage;
        } else if (stage) {
            newFilters.stage = stage;
        }

        if (filters.timeRange !== 'all') {
            newFilters.dateFilter = {
                field: filters.dateType === 'last_update' ? 'lastActivity' : filters.dateType,
                range: filters.timeRange,
            };

            if (filters.timeRange === 'custom') {
                newFilters.dateFilter.customStart = filters.customStart;
                newFilters.dateFilter.customEnd = filters.customEnd;
            }
        }

        if (filters.minAmount) {
            newFilters.minAmount = filters.minAmount;
        }

        if (filters.maxAmount) {
            newFilters.maxAmount = filters.maxAmount;
        }

        if (user) {
            newFilters.assistant_clerk = user.id;
        } else if (filters.assistantClerk !== 'all') {
            newFilters.assistant_clerk = filters.assistantClerk;
        }

        if (data && data.activeLabel && !stage) {
            if (viewType === 'by-stage') {
                const stageKey = opportunityStages.find((s) => s.label === data.activeLabel)?.key;
                if (stageKey) {
                    newFilters.stage = stageKey;
                }
            }
        }

        setModalFilters(newFilters);
        setIsViewModalOpen(true);
    };

    const getStageByUserData = (): ChartDataItem[] => {
        const filteredOpps = getFilteredOpportunities();
        const data: ChartDataItem[] = [];

        opportunityStages.forEach((stage) => {
            const stageData: ChartDataItem = { stage: stage.label };
            let total = 0;

            if (user?.role === 'admin') {
                users.forEach((user) => {
                    const count = filteredOpps.filter(
                        (opp) =>
                            opp.stage === stage.key &&
                            (opp.assistant_clerk.id === user.id ||
                                (user.name.includes('Francis') &&
                                    opp.assistant_clerk.role === 'super_staff' &&
                                    opp.prepared_by?.includes('Francis'))),
                    ).length;
                    stageData[user.name] = count;
                    total += count;
                });
            } else {
                const count = filteredOpps.filter((opp) => opp.stage === stage.key).length;
                stageData['count'] = count;
                total = count;
            }

            stageData.total = total;
            data.push(stageData);
        });

        return data;
    };

    const getUserByStageData = (): UserChartDataItem[] => {
        const filteredOpps = getFilteredOpportunities();
        const data: UserChartDataItem[] = [];

        users.forEach((user) => {
            const userData: UserChartDataItem = { user: user.name };
            let total = 0;

            opportunityStages.forEach((stage) => {
                const count = filteredOpps.filter(
                    (opp) =>
                        (opp.assistant_clerk.id === user.id ||
                            (user.name.includes('Francis') && opp.assistant_clerk.role === 'super_staff' && opp.prepared_by?.includes('Francis'))) &&
                        opp.stage === stage.key,
                ).length;
                userData[stage.label] = count;
                total += count;
            });

            userData.total = total;
            data.push(userData);
        });

        return data;
    };

    const handleFilterChange = (filterType: keyof Filters, value: string) => {
        if (filterType === 'assistantClerk') {
            if (typeof value === 'string') {
                const selectedUser = users.find((u) => u.name === value);
                if (!selectedUser) {
                    return;
                }

                if (selectedUser.role === 'super_staff' && selectedUser.name) {
                    setFilters((prev) => ({ ...prev, assistantClerk: selectedUser.id, prepared_by_clerk: selectedUser.name }));
                } else {
                    setFilters((prev) => ({ ...prev, assistantClerk: selectedUser.id, prepared_by_clerk: '' }));
                }
            }
        } else {
            setFilters((prev) => ({ ...prev, [filterType]: value }));
        }
    };

    const resetFilters = () => {
        setFilters({
            timeRange: 'all',
            dateType: 'close_date',
            minAmount: '',
            maxAmount: '',
            assistantClerk: user?.role === 'admin' ? 'all' : user?.id || 'all',
            stage: '',
            customStart: '',
            customEnd: '',
        });
    };

    const getStageColor = (stage: string): string => {
        const stageConfig = opportunityStages.find((s) => s.key === stage);
        return stageConfig ? stageConfig.color : '#6B7280';
    };

    const getTotalOpportunities = (): number => {
        return getFilteredOpportunities().length;
    };

    const getTotalValue = (): number => {
        return getFilteredOpportunities()
            .filter((opp) => opp.stage === 'ClosedWon')
            .reduce((sum, opp) => sum + (opp.amount || 0), 0);
    };

    const getWonOpportunities = (): number => {
        return getFilteredOpportunities().filter((opp) => opp.stage === 'ClosedWon').length;
    };

    const getRemainingAmount = (): number => {
        return getFilteredOpportunities()
            .filter((opp) => opp.stage !== 'ClosedWon' && opp.stage !== 'ClosedLost')
            .reduce((sum, opp) => sum + (opp.amount || 0), 0);
    };

    const activeFilters = useMemo(() => {
        const filtersList: { label: string; value: string }[] = [];

        if (filters.stage) {
            filtersList.push({
                label: 'Stage',
                value: opportunityStages.find((s) => s.key === filters.stage)?.label || filters.stage,
            });
        }

        if (filters.assistantClerk && filters.assistantClerk !== 'all') {
            const user = users.find((u: User) => u.id === filters.assistantClerk);
            filtersList.push({
                label: 'Opportunity Clerk',
                value: user?.name || filters.assistantClerk,
            });
        }

        if (filters.dateType) {
            const fieldName = {
                last_update: 'Last Activity',
                created_at: 'Created At',
                close_date: 'Close Date',
            }[filters.dateType];

            let displayValue: string;
            if (filters.timeRange === 'custom') {
                displayValue = `${filters.customStart || 'N/A'} - ${filters.customEnd || 'N/A'}`;
            } else {
                displayValue =
                    {
                        all: 'All Time',
                        last3Months: 'Last 3 Months',
                        last6Months: 'Last 6 Months',
                        lastYear: 'Last Year',
                        custom: 'Custom Range',
                    }[filters.timeRange] || 'N/A';
            }

            filtersList.push({
                label: `Date (${fieldName})`,
                value: displayValue,
            });
        }

        if (filters.minAmount) {
            filtersList.push({
                label: 'Min Amount',
                value: `Ksh ${parseFloat(filters.minAmount).toLocaleString()}`,
            });
        }

        if (filters.maxAmount) {
            filtersList.push({
                label: 'Max Amount',
                value: `Ksh ${parseFloat(filters.maxAmount).toLocaleString()}`,
            });
        }

        return filtersList;
    }, [filters, users]);

    const SkeletonLoader = () => (
        <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 rounded bg-gray-200"></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 rounded-lg bg-gray-200"></div>
                ))}
            </div>
            <div className="h-96 rounded-lg bg-gray-200"></div>
        </div>
    );

    if (!isAuthenticated) {
        router.visit(route('/login'));
        return null;
    }

    if (isFetching) {
        return (
            <div className="min-h-screen w-full bg-gray-50 p-6">
                <div className="mx-auto max-w-7xl">
                    <SkeletonLoader />
                </div>
            </div>
        );
    }

    const renderCustomBarLabel = ({ x, y, width, height, value }: LabelProps) => {
        const xPos = typeof x === 'number' ? x : parseFloat(x || '0');
        const yPos = typeof y === 'number' ? y : parseFloat(y || '0');
        const barWidth = typeof width === 'number' ? width : parseFloat(width || '0');
        const barHeight = typeof height === 'number' ? height : parseFloat(height || '0');
        const displayValue = typeof value === 'number' ? value : parseFloat(value || '0');

        return (
            <text x={xPos + barWidth / 2} y={yPos} fill="#666" textAnchor="middle" dy={barHeight < 0 ? 16 : -6}>
                {`${displayValue}`}
            </text>
        );
    };

    return (
        <div className="min-h-screen w-full bg-gray-50 p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto max-w-7xl">
                <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                    <div className="mb-4 flex items-center gap-3">
                        <BarChart3 className="h-8 w-8" />
                        <h1 className="text-3xl font-bold">Opportunity Dashboard</h1>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="rounded-lg bg-white/20 p-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                <span className="text-sm font-medium">Total Opportunities</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold">{getTotalOpportunities()}</p>
                        </div>
                        <div className="rounded-lg bg-white/20 p-4">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                <span className="text-sm font-medium">Total Won Value</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold">Ksh {getTotalValue().toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg bg-white/20 p-4">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                <span className="text-sm font-medium">Won Opportunities</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold">{getWonOpportunities()}</p>
                        </div>
                        <div className="rounded-lg bg-white/20 p-4">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                <span className="text-sm font-medium">Remaining Amount</span>
                            </div>
                            <p className="mt-1 text-2xl font-bold">Ksh {getRemainingAmount().toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 rounded-xl bg-white p-6 shadow-lg">
                    <div className="mb-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Filter className="h-5 w-5 text-blue-600" />
                                <span className="font-semibold text-gray-800">Filters</span>
                            </div>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
                            >
                                <Filter className="mr-2 h-5 w-5" />
                                Filters
                                {isFilterOpen ? <ChevronUp className="ml-2 h-5 w-5" /> : <ChevronDown className="ml-2 h-5 w-5" />}
                            </button>
                        </div>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div
                                    ref={filterRef}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-4"
                                >
                                    {activeFilters.length > 0 && (
                                        <div className="mb-4">
                                            <h3 className="mb-2 text-sm font-medium text-gray-700">Active Filters</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {activeFilters.map((filter, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                                                    >
                                                        <span>
                                                            {filter.label}: {filter.value}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                if (filter.label.includes('Date')) {
                                                                    handleFilterChange('dateType', 'close_date');
                                                                    handleFilterChange('timeRange', 'all');
                                                                    handleFilterChange('customStart', '');
                                                                    handleFilterChange('customEnd', '');
                                                                } else if (filter.label === 'Stage') {
                                                                    handleFilterChange('stage', '');
                                                                } else if (filter.label === 'Opportunity Clerk') {
                                                                    handleFilterChange(
                                                                        'assistantClerk',
                                                                        user?.role === 'admin' ? 'all' : user?.id || 'all',
                                                                    );
                                                                } else if (filter.label === 'Min Amount') {
                                                                    handleFilterChange('minAmount', '');
                                                                } else if (filter.label === 'Max Amount') {
                                                                    handleFilterChange('maxAmount', '');
                                                                }
                                                            }}
                                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Stage</label>
                                            <select
                                                value={filters.stage}
                                                onChange={(e) => handleFilterChange('stage', e.target.value)}
                                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            >
                                                <option value="">All Stages</option>
                                                {opportunityStages.map((stage) => (
                                                    <option key={stage.key} value={stage.key}>
                                                        {stage.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {user?.role === 'admin' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Opportunity Clerk</label>
                                                <select
                                                    value={filters.assistantClerk}
                                                    onChange={(e) => handleFilterChange('assistantClerk', e.target.value)}
                                                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                >
                                                    <option value="all">All Users</option>
                                                    {users.map((user) => (
                                                        <option key={`${user.id}-${user.name}`} value={user.name}>
                                                            {user.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Date Type</label>
                                            <select
                                                value={filters.dateType}
                                                onChange={(e) => handleFilterChange('dateType', e.target.value)}
                                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            >
                                                <option value="close_date">Close Date</option>
                                                <option value="last_update">Last Activity</option>
                                                <option value="created_at">Created Date</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Time Range</label>
                                            <select
                                                value={filters.timeRange}
                                                onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            >
                                                <option value="all">All Time</option>
                                                <option value="last3Months">Last 3 Months</option>
                                                <option value="last6Months">Last 6 Months</option>
                                                <option value="lastYear">Last Year</option>
                                                <option value="custom">Custom Range</option>
                                            </select>
                                        </div>
                                        {filters.timeRange === 'custom' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Custom Date Range</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="date"
                                                        value={filters.customStart}
                                                        onChange={(e) => handleFilterChange('customStart', e.target.value)}
                                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                    <input
                                                        type="date"
                                                        value={filters.customEnd}
                                                        onChange={(e) => handleFilterChange('customEnd', e.target.value)}
                                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Min Amount</label>
                                            <input
                                                type="number"
                                                value={filters.minAmount}
                                                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                                                placeholder="0"
                                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Max Amount</label>
                                            <input
                                                type="number"
                                                value={filters.maxAmount}
                                                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                                                placeholder="∞"
                                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button
                                            onClick={resetFilters}
                                            className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="mb-6 flex gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`rounded-lg px-6 py-3 font-semibold transition-all ${
                                viewType === 'by-stage' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            onClick={() => setViewType('by-stage')}
                        >
                            View by Stage
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`rounded-lg px-6 py-3 font-semibold transition-all ${
                                viewType === 'by-user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            onClick={() => setViewType('by-user')}
                        >
                            View by User
                        </motion.button>
                    </div>

                    {viewType === 'by-stage' ? (
                        <div className="space-y-8">
                            <h2 className="mb-6 text-2xl font-bold text-gray-800">Opportunities by Stage</h2>
                            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                                {opportunityStages
                                    .filter((stage) => !filters.stage || stage.key === filters.stage)
                                    .map((stage) => {
                                        const stageOpps = getFilteredOpportunities().filter((opp) => opp.stage === stage.key);

                                        const belongsToUser = (opp: Opportunity, targetUser: User): boolean => {
                                            if (targetUser.name.includes('Francis')) {
                                                return (
                                                    (opp.assistant_clerk.role === 'super_staff' && !!opp.prepared_by?.includes('Francis')) ||
                                                    opp.assistant_clerk.id === targetUser.id
                                                );
                                            }
                                            if (targetUser.name.includes('Laura') || targetUser.role === 'super_staff') {
                                                return (
                                                    opp.assistant_clerk.role === 'super_staff' &&
                                                    (!opp.prepared_by || opp.prepared_by === '' || opp.prepared_by?.includes('Laura'))
                                                );
                                            }
                                            return opp.assistant_clerk.id === targetUser.id;
                                        };

                                        const data =
                                            user?.role === 'admin'
                                                ? users.map((u) => ({
                                                      name: u.name,
                                                      count: stageOpps.filter((opp) => belongsToUser(opp, u)).length,
                                                  }))
                                                : [
                                                      {
                                                          name: 'You',
                                                          count: stageOpps.length,
                                                      },
                                                  ];

                                        const totalForStage = data.reduce((sum, item) => sum + (item.count || 0), 0);

                                        return (
                                            <motion.div
                                                key={stage.key}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    duration: 0.5,
                                                    delay: opportunityStages.indexOf(stage) * 0.1,
                                                }}
                                                className="rounded-xl border border-gray-200 bg-gray-50 p-6"
                                            >
                                                <div className="mb-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: stage.color }} />
                                                        <h3 className="text-lg font-semibold text-gray-800">{stage.label}</h3>
                                                    </div>
                                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                                                        {totalForStage} total
                                                    </span>
                                                </div>

                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="name" height={80} angle={-45} textAnchor="end" />
                                                            <YAxis />
                                                            <Bar
                                                                dataKey="count"
                                                                cursor="pointer"
                                                                fill={stage.color}
                                                                label={renderCustomBarLabel}
                                                                radius={[4, 4, 0, 0]}
                                                                onClick={(payload) => {
                                                                    const clickedUser = users.find((u) => u.name === payload.name);
                                                                    handleBarClick(payload, clickedUser, stage.key);
                                                                }}
                                                            />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <h2 className="mb-6 text-2xl font-bold text-gray-800">Opportunities by User</h2>
                            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                                {users
                                    .filter((u) => filters.assistantClerk === 'all' || u.id === filters.assistantClerk)
                                    .map((currentUser) => {
                                        const belongsToThisUser = (opp: Opportunity): boolean => {
                                            if (currentUser.name.includes('Francis')) {
                                                return (
                                                    (opp.assistant_clerk.role === 'super_staff' && !!opp.prepared_by?.includes('Francis')) ||
                                                    opp.assistant_clerk.id === currentUser.id
                                                );
                                            }
                                            if (currentUser.name.includes('Laura') || currentUser.role === 'super_staff') {
                                                return (
                                                    opp.assistant_clerk.role === 'super_staff' &&
                                                    (!opp.prepared_by || opp.prepared_by === '' || opp.prepared_by?.includes('Laura'))
                                                );
                                            }
                                            return opp.assistant_clerk.id === currentUser.id;
                                        };

                                        const userOpps = getFilteredOpportunities().filter(belongsToThisUser);

                                        const stageCounts: StageCountData[] = opportunityStages
                                            .filter((stage) => !filters.stage || stage.key === filters.stage)
                                            .map((stage) => ({
                                                stage: stage.label,
                                                count: userOpps.filter((opp) => opp.stage === stage.key).length,
                                                color: stage.color,
                                            }));

                                        const totalForUser = stageCounts.reduce((sum, s) => sum + s.count, 0);

                                        return (
                                            <motion.div
                                                key={currentUser.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    duration: 0.5,
                                                    delay: users.indexOf(currentUser) * 0.1,
                                                }}
                                                className="rounded-xl border border-gray-200 bg-gray-50 p-6"
                                            >
                                                <div className="mb-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="h-4 w-4 rounded-full"
                                                            style={{ backgroundColor: userColors[currentUser.id] }}
                                                        />
                                                        <h3 className="text-lg font-semibold text-gray-800">{currentUser.name}</h3>
                                                    </div>
                                                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                                        {totalForUser} total
                                                    </span>
                                                </div>

                                                <div className="h-64">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={stageCounts} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                                            <CartesianGrid strokeDasharray="3 3" />
                                                            <XAxis dataKey="stage" angle={-45} textAnchor="end" height={80} />
                                                            <YAxis />
                                                            <Bar
                                                                dataKey="count"
                                                                cursor="pointer"
                                                                radius={[4, 4, 0, 0]}
                                                                label={renderCustomBarLabel}
                                                                onClick={(data, index) => {
                                                                    const clicked = stageCounts[index];
                                                                    if (!clicked) return;
                                                                    const stageKey = opportunityStages.find((s) => s.label === clicked.stage)?.key;
                                                                    if (stageKey) {
                                                                        handleBarClick(
                                                                            { ...data, activeLabel: clicked.stage },
                                                                            currentUser,
                                                                            stageKey,
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                {stageCounts.map((entry, idx) => (
                                                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                                                ))}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {isViewModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-w-8xl flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-xl font-semibold text-gray-800">View Opportunities</h2>
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="rounded-full p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-grow overflow-auto p-6">
                            <ViewDashboardOpportunities setEdit={() => {}} setActiveTab={() => {}} activeTab="view" initialFilters={modalFilters} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesForceDashboard;
