import { useAuth } from '@/hooks/use-auth';
import { Opportunity } from '@/types/opportunity';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Eye, Filter, Search, Trash, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import OpportunityDetails from './OpportunityDetails';
import OpportunitySkeletonLoader from './OpportunitySkeletonLoader';
import { downloadExcel } from './ViewOpportunities';

const formatTimestampToDate = (date: Date | string, dateOnly?: boolean) => {
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return dateOnly
            ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString()}`
            : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)} ${d.getHours().toString().padStart(2, '0')}:${d
                  .getMinutes()
                  .toString()
                  .padStart(2, '0')}`;
    } catch (error) {
        return 'Invalid Date';
    }
};

interface ViewOpportunitiesProps {
    setEdit: (val: boolean) => void;
    setActiveTab: (tab: string) => void;
    activeTab: string;
    initialFilters?: {
        stage?: OpportunityStage;
        assistant_clerk?: string;
        dateFilter?: {
            field: 'lastActivity' | 'created_at' | 'close_date';
            range: 'last3Months' | 'last6Months' | 'lastYear' | 'custom';
            customStart?: string;
            customEnd?: string;
        };
        minAmount?: string;
        maxAmount?: string;
    };
}

enum OpportunityStage {
    Qualify = 'Qualify',
    MeetAndPresent = 'MeetAndPresent',
    Propose = 'Propose',
    Negotiate = 'Negotiate',
    ClosedWon = 'ClosedWon',
    ClosedLost = 'ClosedLost',
}

type SortField = keyof Opportunity | 'last_update.updated_at' | 'created_at';

const opportunityStages = [
    { title: OpportunityStage.Qualify, label: 'Qualify', probability: 10 },
    { title: OpportunityStage.MeetAndPresent, label: 'Meet & Present', probability: 25 },
    { title: OpportunityStage.Propose, label: 'Propose', probability: 50 },
    { title: OpportunityStage.Negotiate, label: 'Negotiate', probability: 75 },
    { title: OpportunityStage.ClosedWon, label: 'Closed Won', probability: 100 },
    { title: OpportunityStage.ClosedLost, label: 'Closed Lost', probability: 0 },
];

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const ViewDashboardOpportunities: React.FC<ViewOpportunitiesProps> = ({ setEdit, setActiveTab, activeTab, initialFilters = {} }) => {
    const { isAuthenticated, user, logout } = useAuth();
    const [searchField, setSearchField] = useState<string>('name');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isMobileView, setIsMobileView] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [opportunityToDelete, setOpportunityToDelete] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [editingOpportunityId, setEditingOpportunityId] = useState<string | null>(null);
    const [filters, setFilters] = useState<{
        contact_person?: string;
        dateRange?: { start: string; end: string };
        month?: string;
        assistant_clerk?: string;
        prepared_by?: string;
        prepared_by_clerk?: string;
        stage?: OpportunityStage;
        dateFilter?: {
            field: 'lastActivity' | 'created_at' | 'close_date';
            range: 'last3Months' | 'last6Months' | 'lastYear' | 'custom';
            customStart?: string;
            customEnd?: string;
        };
        minAmount?: string;
        maxAmount?: string;
    }>(initialFilters);
    const [tempFilters, setTempFilters] = useState<{
        contact_person?: string;
        dateRange?: { start: string; end: string };
        month?: string;
        assistant_clerk?: string;
        prepared_by?: string;
        prepared_by_clerk?: string;
        stage?: OpportunityStage;
        dateFilter?: {
            field: 'lastActivity' | 'created_at' | 'close_date';
            range: 'last3Months' | 'last6Months' | 'lastYear' | 'custom';
            customStart?: string;
            customEnd?: string;
        };
        minAmount?: string;
        maxAmount?: string;
    }>(initialFilters);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === sortedOpportunities.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sortedOpportunities.map((o) => o.id)));
        }
    };
    const downloadSelected = () => {
        const toExport = sortedOpportunities.filter((o) => selectedIds.has(o.id));
        downloadExcel(toExport);
    };

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingOpportunity, setIsUpdatingOpportunity] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const observer = useRef<IntersectionObserver | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const [editedBy, setEditedBy] = useState('');
    const userNames = user?.name?.split(',').map((name) => name.trim()) || [];

    const fetchOpportunities = async () => {
        setIsFetching(true);
        try {
            const response = await axios.get('/api/opportunities', {
                params: {
                    searchQuery: searchQuery,
                    filters: {
                        stage: filters.stage,
                        assistantClerk: filters.assistant_clerk,
                        preparedByClerk: filters.prepared_by_clerk,
                        dateFilter: filters.dateFilter
                            ? {
                                  field: filters.dateFilter.field,
                                  range: filters.dateFilter.range,
                                  customStart: filters.dateFilter.customStart,
                                  customEnd: filters.dateFilter.customEnd,
                              }
                            : undefined,
                    },
                },
                paramsSerializer: (params) => {
                    const searchParams = new URLSearchParams();
                    for (const [key, value] of Object.entries(params)) {
                        if (key === 'filters' && value) {
                            for (const [filterKey, filterValue] of Object.entries(value)) {
                                if (filterKey === 'dateFilter' && filterValue && typeof filterValue === 'object') {
                                    for (const [dateKey, dateValue] of Object.entries(filterValue)) {
                                        if (dateValue) {
                                            searchParams.append(`filters[dateFilter][${dateKey}]`, dateValue.toString());
                                        }
                                    }
                                } else if (filterValue && typeof filterValue === 'string') {
                                    searchParams.append(`filters[${filterKey}]`, filterValue);
                                }
                            }
                        } else if (value !== undefined && value !== null) {
                            searchParams.append(key, value.toString());
                        }
                    }
                    return searchParams.toString();
                },
            });
            setTotalCount(response.data.totalCount);
            setOpportunities((prev) => {
                if (page === 0) {
                    return response.data.results;
                }
                const existingIds = new Set(prev.map((opp) => opp.id));
                const newOpportunities = response.data.results.filter((opp) => !existingIds.has(opp.id));
                return [...prev, ...newOpportunities];
            });
            setHasMore(response.data.hasMore);
        } catch (error) {
            toast.error('Failed to fetch opportunities');
        } finally {
            setIsFetching(false);
        }
    };

    const fetchUsers = async () => {
        setIsUsersLoading(true);
        try {
            const response = await axios.get('/api/users', {
                params: {
                    createdOpportunities: true,
                },
            });
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
            setUsers(filteredUsers);
        } catch (error) {
            toast.error('Failed to fetch users');
        } finally {
            setIsUsersLoading(false);
        }
    };

    const updateLastUpdate = async (opportunity: Opportunity) => {
        await axios.post(`/api/last-updates`, {
            updated_at: new Date().toISOString(),
            super_staff: editedBy,
            updated_by_id: user?.id,
            opportunity_id: opportunity.id,
        });
    };
    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const nameParam = urlParams.get('name');
        if (nameParam) {
            setSearchField('name');
            setSearchQuery(nameParam);
            window.history.replaceState(null, '', window.location.pathname + `?tab=opportunities`);
        }
        const checkIfMobile = () => {
            setIsMobileView(window.innerWidth < 768);
        };
        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        return () => {
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'view') {
            setPage(0);
            setOpportunities([]);
            fetchOpportunities();
        }
    }, [activeTab, searchQuery, searchField, filters]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const sortedOpportunities = useMemo(() => {
        if (!sortField) return opportunities;
        return [...opportunities].sort((a, b) => {
            let valueA: any, valueB: any;
            switch (sortField) {
                case 'name':
                case 'stage':
                    valueA = a[sortField] ?? '';
                    valueB = b[sortField] ?? '';
                    return sortDirection === 'desc' ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
                case 'amount':
                    valueA = a.amount ?? 0;
                    valueB = b.amount ?? 0;
                    return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
                case 'close_date':
                case 'created_at':
                    valueA = new Date(a[sortField]).getTime();
                    valueB = new Date(b[sortField]).getTime();
                    return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
                case 'last_update.updated_at':
                    valueA = a.last_update?.updated_at ? new Date(a.last_update.updated_at).getTime() : 0;
                    valueB = b.last_update?.updated_at ? new Date(b.last_update.updated_at).getTime() : 0;
                    return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
                default:
                    return 0;
            }
        });
    }, [opportunities, sortField, sortDirection]);

    const [isOpen, setIsOpen] = useState(false);
    const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);

    const handleOpenDetails = (opportunity: Opportunity) => {
        setSelectedOpportunity(opportunity);
        openModal();
    };

    const handleDelete = async () => {
        if (!opportunityToDelete) return;
        setIsDeleting(true);
        try {
            await axios.delete(`/api/opportunities/${opportunityToDelete}`);
            toast.success('Opportunity deleted successfully');
            setIsDeleteModalOpen(false);
            setOpportunityToDelete(null);
            setPage(0);
            setOpportunities([]);
            fetchOpportunities();
        } catch (error) {
            toast.error('Failed to delete opportunity');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleFilterChange = (
        key: keyof typeof tempFilters,
        value:
            | string
            | {
                  field?: 'lastActivity' | 'created_at' | 'close_date';
                  range?: 'last3Months' | 'last6Months' | 'lastYear' | 'custom';
                  customStart?: string;
                  customEnd?: string;
              }
            | undefined,
    ) => {
        setTempFilters((prev) => {
            if (key === 'dateFilter' && typeof value !== 'string' && value) {
                return {
                    ...prev,
                    [key]: {
                        field: value.field || prev.dateFilter?.field || 'lastActivity', // Default to 'lastActivity' if undefined
                        range: value.range || prev.dateFilter?.range || 'last3Months', // Default to 'last3Months' if undefined
                        customStart: value.customStart !== undefined ? value.customStart : prev.dateFilter?.customStart,
                        customEnd: value.customEnd !== undefined ? value.customEnd : prev.dateFilter?.customEnd,
                    },
                };
            }
            if (key === 'assistant_clerk') {
                if (!value || value === '') {
                    const { assistant_clerk, ...rest } = prev;
                    return rest;
                }

                if (typeof value === 'string') {
                    const selectedUser = users.find((u) => u.name === value);

                    if (!selectedUser) {
                        return prev;
                    }

                    if (selectedUser.role === 'super_staff' && selectedUser.name) {
                        return {
                            ...prev,
                            assistant_clerk: selectedUser.id,
                            prepared_by_clerk: selectedUser.name,
                        };
                    } else {
                        return {
                            ...prev,
                            assistant_clerk: selectedUser.id,
                        };
                    }
                }
            }

            return {
                ...prev,
                [key]: value || undefined,
            };
        });
    };

    const clearFilters = () => {
        setTempFilters({});
        setFilters({});
        setPage(0);
        fetchOpportunities();
        toast.success('Filters cleared!');
    };

    const getProbabilityStyle = (probability: number) => {
        if (probability >= 75) return 'bg-green-100 text-green-700';
        if (probability >= 50) return 'bg-blue-100 text-blue-700';
        if (probability >= 25) return 'bg-yellow-100 text-yellow-700';
        if (probability > 0) return 'bg-orange-100 text-orange-700';
        return 'bg-red-100 text-red-700';
    };

    const formatStageText = (stage: string) => {
        return stage.replace(/([A-Z])/g, ' $1').trim();
    };

    const handleStageChange = async (opportunity: Opportunity, newValue: string | null) => {
        if (newValue && Object.values(OpportunityStage).includes(newValue as OpportunityStage)) {
            setEditingOpportunityId(opportunity.id);
            setIsUpdatingOpportunity(true);
            try {
                await axios.put(`/api/opportunities/${opportunity.id}`, {
                    stage: newValue,
                    probability: opportunityStages.find((stage) => stage.title === newValue)!.probability,
                    last_update: {
                        updated_at: new Date(),
                        super_staff: editedBy,
                        updatedById: user?.id,
                    },
                });
                toast.success('Opportunity stage updated successfully');
                await updateLastUpdate(opportunity);
                fetchOpportunities();
            } catch (error) {
                toast.error('Failed to update opportunity stage');
            } finally {
                setEditingOpportunityId(null);
                setIsUpdatingOpportunity(false);
            }
        }
    };

    const addFilters = async () => {
        if (
            tempFilters.dateFilter?.range === 'custom' &&
            tempFilters.dateFilter?.field &&
            (!tempFilters.dateFilter.customStart || !tempFilters.dateFilter.customEnd)
        ) {
            toast.error('Please provide both start and end dates for custom range.');
            return;
        }
        try {
            setFilters(tempFilters);
            setPage(0);
            await fetchOpportunities();
            toast.success('Filters applied successfully!');
        } catch (error) {
            toast.error('Failed to apply filters.');
        }
    };

    const activeFilters = useMemo(() => {
        const filtersList: { label: string; value: string }[] = [];
        if (filters.stage) {
            filtersList.push({
                label: 'Stage',
                value: formatStageText(filters.stage),
            });
        }
        if (filters.assistant_clerk) {
            const user = users.find((u) => u.id === filters.assistant_clerk);

            if (user?.role === 'super_staff' && filters.prepared_by) {
                filtersList.push({
                    label: 'Opportunity Clerk',
                    value: filters.prepared_by_clerk || '',
                });
            } else {
                filtersList.push({
                    label: 'Opportunity Clerk',
                    value: user?.name || filters.prepared_by_clerk || '',
                });
            }
        }

        if (filters.dateFilter?.field) {
            const fieldName = {
                lastActivity: 'Last Activity',
                created_at: 'Created At',
                close_date: 'Close Date',
            }[filters.dateFilter.field];
            let displayValue: string;
            if (filters.dateFilter.range === 'custom') {
                displayValue = `${filters.dateFilter.customStart || 'N/A'} - ${filters.dateFilter.customEnd || 'N/A'}`;
            } else {
                displayValue =
                    {
                        last3Months: 'Last 3 Months',
                        last6Months: 'Last 6 Months',
                        lastYear: 'Last Year',
                        custom: 'Custom Range',
                    }[filters.dateFilter.range] || 'N/A';
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

    const lastOpportunityElementRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (isFetching) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting && hasMore) {
                        setPage((prevPage) => prevPage + 1);
                    }
                },
                { threshold: 0.1 },
            );
            if (node) observer.current.observe(node);
        },
        [isFetching, hasMore],
    );

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="mt-4 px-2 sm:px-4">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex flex-grow items-center">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(0);
                            setOpportunities([]);
                        }}
                        placeholder="Search by opportunity type, institution, or contact person"
                        className="block w-full rounded-md border border-gray-300 py-2 pr-10 pl-10 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setPage(0);
                                setOpportunities([]);
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                            aria-label="Clear search"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
                <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
                >
                    <Filter className="mr-2 h-5 w-5" />
                    Filters
                    {isFilterOpen ? <ChevronUp className="ml-2 h-5 w-5" /> : <ChevronDown className="ml-2 h-5 w-5" />}
                </button>
                {selectedIds.size > 0 && (
                    <button
                        onClick={downloadSelected}
                        className="flex items-center rounded-md bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
                    >
                        <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                        Download ({selectedIds.size})
                    </button>
                )}
                {userNames.length > 1 && (
                    <div className="flex">
                        <label className="mx-2 block text-sm font-medium text-gray-700">Edited By</label>
                        <select
                            name="editedBy"
                            value={editedBy || userNames[0]}
                            onChange={(e) => setEditedBy(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        >
                            {userNames.map((name, index) => (
                                <option key={index} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            <AnimatePresence>
                {isFilterOpen && (
                    <motion.div
                        ref={filterRef}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                    >
                        {activeFilters.length > 0 && (
                            <div className="mb-4">
                                <h3 className="mb-2 text-sm font-medium text-gray-700">Active Filters</h3>
                                <div className="flex flex-wrap gap-2">
                                    {activeFilters.map((filter, index) => (
                                        <div key={index} className="flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                                            <span>
                                                {filter.label}: {filter.value}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    if (filter.label.includes('Date')) {
                                                        handleFilterChange('dateFilter', undefined);
                                                    } else if (filter.label === 'Stage') {
                                                        handleFilterChange('stage', undefined);
                                                    } else if (filter.label === 'Opportunity Clerk') {
                                                        handleFilterChange('assistant_clerk', undefined);
                                                    } else if (filter.label === 'Min Amount') {
                                                        handleFilterChange('minAmount', undefined);
                                                    } else if (filter.label === 'Max Amount') {
                                                        handleFilterChange('maxAmount', undefined);
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
                        {isFilterOpen && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Stage</label>
                                    <select
                                        value={tempFilters.stage || ''}
                                        onChange={(e) => handleFilterChange('stage', e.target.value as OpportunityStage)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="">All Stages</option>
                                        {Object.values(OpportunityStage).map((stage) => (
                                            <option key={stage} value={stage}>
                                                {formatStageText(stage)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Opportunity Clerk</label>
                                    <select
                                        value={tempFilters.prepared_by_clerk || ''}
                                        onChange={(e) => handleFilterChange('assistant_clerk', e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        disabled={isUsersLoading}
                                    >
                                        <option value="">All Users</option>
                                        {users.map((user) => (
                                            <option key={`${user.id}-${user.name}`} value={user.name}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                    {isUsersLoading && <p className="mt-1 text-sm text-gray-500">Loading users...</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date Filter</label>
                                    <select
                                        value={tempFilters.dateFilter?.field || ''}
                                        onChange={(e) =>
                                            handleFilterChange('dateFilter', {
                                                ...tempFilters.dateFilter,
                                                field: e.target.value as 'lastActivity' | 'created_at' | 'close_date',
                                            })
                                        }
                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select Date Field</option>
                                        <option value="lastActivity">Last Activity</option>
                                        <option value="created_at">Created At</option>
                                        <option value="close_date">Close Date</option>
                                    </select>
                                </div>
                                {tempFilters.dateFilter?.field && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date Range</label>
                                        <select
                                            value={tempFilters.dateFilter?.range || ''}
                                            onChange={(e) =>
                                                handleFilterChange('dateFilter', {
                                                    ...tempFilters.dateFilter,
                                                    range: e.target.value as 'last3Months' | 'last6Months' | 'lastYear' | 'custom',
                                                })
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        >
                                            <option value="">Select Range</option>
                                            <option value="last3Months">Last 3 Months</option>
                                            <option value="last6Months">Last 6 Months</option>
                                            <option value="lastYear">Last Year</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                    </div>
                                )}
                                {tempFilters.dateFilter?.range === 'custom' && tempFilters.dateFilter?.field && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Custom Date Range</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                value={tempFilters.dateFilter?.customStart || ''}
                                                onChange={(e) =>
                                                    handleFilterChange('dateFilter', {
                                                        ...tempFilters.dateFilter,
                                                        customStart: e.target.value,
                                                    })
                                                }
                                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <input
                                                type="date"
                                                value={tempFilters.dateFilter?.customEnd || ''}
                                                onChange={(e) =>
                                                    handleFilterChange('dateFilter', {
                                                        ...tempFilters.dateFilter,
                                                        customEnd: e.target.value,
                                                    })
                                                }
                                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Min Amount</label>
                                    <input
                                        type="number"
                                        value={tempFilters.minAmount || ''}
                                        onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                                        placeholder="0"
                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Max Amount</label>
                                    <input
                                        type="number"
                                        value={tempFilters.maxAmount || ''}
                                        onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                                        placeholder="∞"
                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="mt-4 flex justify-end">
                            <button onClick={addFilters} className="mr-4 rounded-md bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700">
                                Add Filters
                            </button>
                            <button onClick={clearFilters} className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300">
                                Clear Filters
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="mb-4 text-sm text-gray-600">
                {isFetching && page === 0 ? <span></span> : <span>Found {totalCount} matching opportunities</span>}
            </div>
            {isFetching && page === 0 ? (
                <OpportunitySkeletonLoader isMobileView={isMobileView} />
            ) : (
                <>
                    {isMobileView ? (
                        <AnimatePresence>
                            <div className="space-y-4">
                                {sortedOpportunities.map((opportunity: Opportunity, index) => (
                                    <motion.div
                                        key={opportunity.id}
                                        variants={itemVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        ref={index === sortedOpportunities.length - 1 ? lastOpportunityElementRef : null}
                                        className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">{opportunity.name}</p>
                                            <p className="text-sm text-gray-500">{formatTimestampToDate(opportunity.close_date, true)}</p>
                                        </div>
                                        <div className="mt-2">
                                            {editingOpportunityId === opportunity.id ? (
                                                <div className="flex items-center">
                                                    <Autocomplete
                                                        options={opportunityStages.map((s) => s.title)}
                                                        value={opportunity.stage as OpportunityStage}
                                                        onChange={(event, newValue) => handleStageChange(opportunity, newValue)}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                variant="outlined"
                                                                className="w-full"
                                                                InputProps={{
                                                                    ...params.InputProps,
                                                                    className: 'rounded-lg text-sm',
                                                                }}
                                                            />
                                                        )}
                                                        disabled={isUpdatingOpportunity || editingOpportunityId !== null}
                                                        sx={{ width: '200px' }}
                                                    />
                                                    {isUpdatingOpportunity && (
                                                        <svg
                                                            className="ml-2 h-5 w-5 animate-spin text-blue-600"
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <circle
                                                                className="opacity-25"
                                                                cx="12"
                                                                cy="12"
                                                                r="10"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                            ></circle>
                                                            <path
                                                                className="opacity-75"
                                                                fill="currentColor"
                                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                            ></path>
                                                        </svg>
                                                    )}
                                                </div>
                                            ) : (
                                                <Autocomplete
                                                    options={opportunityStages.map((s) => s.title)}
                                                    value={opportunity.stage as OpportunityStage}
                                                    onChange={(event, newValue) => handleStageChange(opportunity, newValue)}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            variant="outlined"
                                                            className="w-full"
                                                            InputProps={{
                                                                ...params.InputProps,
                                                                className: 'rounded-lg text-sm',
                                                            }}
                                                        />
                                                    )}
                                                    disabled={isUpdatingOpportunity || editingOpportunityId !== null}
                                                    sx={{ width: '200px' }}
                                                />
                                            )}
                                        </div>
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-semibold ${getProbabilityStyle(opportunity.probability)}`}
                                        >
                                            {opportunity.probability}%
                                        </span>
                                        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <p className="text-gray-500">Contact</p>
                                                <p>
                                                    {opportunity.contact.institution ||
                                                        (opportunity.contact.contactPersons?.[0]
                                                            ? `${opportunity.contact.contactPersons[0].first_name} ${opportunity.contact.contactPersons[0].last_name}`
                                                            : '')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Amount</p>
                                                <p>{opportunity.amount ? `Ksh ${opportunity.amount.toLocaleString()}` : ''}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Last Activity</p>
                                                <p>
                                                    {opportunity.last_update?.updated_at
                                                        ? formatTimestampToDate(opportunity.last_update.updated_at)
                                                        : ''}
                                                    {user?.role === 'admin' && opportunity.last_update?.updated_by && (
                                                        <p className="text-sm text-gray-500">
                                                            By{' '}
                                                            {opportunity.last_update?.updated_by?.role === 'super_staff'
                                                                ? opportunity.last_update?.super_staff || 'Laura'
                                                                : opportunity.last_update?.updated_by?.name}
                                                        </p>
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Opportunity Clerk</p>
                                                <p>
                                                    {opportunity.assistant_clerk.role === 'super_staff'
                                                        ? opportunity.prepared_by || 'Laura'
                                                        : opportunity.assistant_clerk.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleOpenDetails(opportunity)}
                                                className="rounded-full bg-blue-100 p-2 text-blue-600 transition hover:bg-blue-200"
                                                title="View"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {isAuthenticated && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setOpportunityToDelete(opportunity.id);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                        className="rounded-full bg-red-100 p-2 text-red-600 transition hover:bg-red-200"
                                                        title="Delete"
                                                        disabled={isDeleting}
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </AnimatePresence>
                    ) : (
                        <div className="overflow-x-auto border border-gray-200 shadow-md sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === sortedOpportunities.length && sortedOpportunities.length > 0}
                                                onChange={toggleSelectAll}
                                                className="rounded border-gray-300"
                                            />
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center">
                                                Opportunity Type
                                                {sortField === 'name' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th className="w-48 max-w-48 px-4 py-3 text-left text-xs font-medium tracking-wider whitespace-normal text-gray-500 uppercase hover:bg-gray-100">
                                            <div className="flex items-center">Name/Institution</div>
                                        </th>
                                        <th
                                            className="w-[200px] cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('stage')}
                                        >
                                            <div className="flex items-center">
                                                Stage
                                                {sortField === 'stage' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('probability')}
                                        >
                                            <div className="flex items-center">
                                                Probability
                                                {sortField === 'probability' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('amount')}
                                        >
                                            <div className="flex items-center">
                                                Amount(Ksh)
                                                {sortField === 'amount' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('last_update.updated_at')}
                                        >
                                            <div className="flex items-center">
                                                Last Activity
                                                {sortField === 'last_update.updated_at' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('created_at')}
                                        >
                                            <div className="flex items-center">
                                                Created At
                                                {sortField === 'created_at' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('close_date')}
                                        >
                                            <div className="flex items-center">
                                                Close Date
                                                {sortField === 'close_date' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100">
                                            <div className="flex items-center">Opportunity Clerk</div>
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                {sortedOpportunities.length === 0 ? (
                                    <AnimatePresence>
                                        <motion.h1
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            style={{
                                                marginTop: '40px',
                                                padding: '20px',
                                                textAlign: 'center',
                                                fontSize: '1.6rem',
                                            }}
                                        >
                                            No opportunities to show!
                                        </motion.h1>
                                    </AnimatePresence>
                                ) : (
                                    <AnimatePresence>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {sortedOpportunities.map((opportunity: Opportunity, index) => (
                                                <motion.tr
                                                    key={opportunity.id}
                                                    variants={itemVariants}
                                                    initial="hidden"
                                                    animate="visible"
                                                    exit="exit"
                                                    className="hover:bg-gray-50"
                                                    ref={index === sortedOpportunities.length - 1 ? lastOpportunityElementRef : null}
                                                >
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(opportunity.id)}
                                                            onChange={() => toggleSelect(opportunity.id)}
                                                            className="rounded border-gray-300"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-4 text-sm font-medium whitespace-normal text-gray-900">
                                                        {opportunity.name}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm whitespace-normal text-gray-500">
                                                        {opportunity.contact.institution ||
                                                            (opportunity.contact_person
                                                                ? `${opportunity.contact_person?.first_name} ${opportunity.contact_person?.last_name}`
                                                                : '')}
                                                    </td>
                                                    <td className="w-[200px] px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                        {editingOpportunityId === opportunity.id ? (
                                                            <div className="flex items-center">
                                                                <Autocomplete
                                                                    options={opportunityStages.map((s) => s.title)}
                                                                    value={opportunity.stage as OpportunityStage}
                                                                    size="small"
                                                                    onChange={(event, newValue) => handleStageChange(opportunity, newValue)}
                                                                    renderInput={(params) => (
                                                                        <TextField
                                                                            {...params}
                                                                            variant="outlined"
                                                                            className="w-full"
                                                                            size="small"
                                                                            InputProps={{
                                                                                ...params.InputProps,
                                                                                className: 'rounded-lg text-sm',
                                                                            }}
                                                                        />
                                                                    )}
                                                                    disabled={isUpdatingOpportunity || editingOpportunityId !== null}
                                                                    sx={{ width: '180px' }}
                                                                />
                                                                {isUpdatingOpportunity && (
                                                                    <svg
                                                                        className="ml-2 h-5 w-5 animate-spin text-blue-600"
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        fill="none"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <circle
                                                                            className="opacity-25"
                                                                            cx="12"
                                                                            cy="12"
                                                                            r="10"
                                                                            stroke="currentColor"
                                                                            strokeWidth="4"
                                                                        ></circle>
                                                                        <path
                                                                            className="opacity-75"
                                                                            fill="currentColor"
                                                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                        ></path>
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <Autocomplete
                                                                options={opportunityStages.map((s) => s.title)}
                                                                value={opportunity.stage as OpportunityStage}
                                                                onChange={(event, newValue) => handleStageChange(opportunity, newValue)}
                                                                renderInput={(params) => (
                                                                    <TextField
                                                                        {...params}
                                                                        variant="outlined"
                                                                        className="w-full"
                                                                        InputProps={{
                                                                            ...params.InputProps,
                                                                            className: 'rounded-lg text-sm',
                                                                        }}
                                                                    />
                                                                )}
                                                                disabled={isUpdatingOpportunity || editingOpportunityId !== null}
                                                                sx={{ width: '180px' }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                        <span
                                                            className={`rounded-full px-2 py-1 text-xs font-semibold ${getProbabilityStyle(
                                                                opportunity.probability,
                                                            )}`}
                                                        >
                                                            {opportunity.probability}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                        {opportunity.amount ? `${opportunity.amount.toLocaleString()}` : ''}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                        <div className="flex-col items-center">
                                                            {opportunity.last_update?.updated_at
                                                                ? formatTimestampToDate(opportunity.last_update.updated_at)
                                                                : ''}
                                                            {user?.role === 'admin' && opportunity.last_update?.updated_by && (
                                                                <p className="text-sm text-gray-500">
                                                                    By{' '}
                                                                    {opportunity.last_update?.updated_by?.role === 'super_staff'
                                                                        ? opportunity.last_update?.super_staff || 'Laura'
                                                                        : opportunity.last_update?.updated_by?.name}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                        {formatTimestampToDate(opportunity.created_at, true)}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                        {formatTimestampToDate(opportunity.close_date, true)}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                        {opportunity.assistant_clerk.role === 'super_staff'
                                                            ? opportunity.prepared_by || 'Laura'
                                                            : opportunity.assistant_clerk.name}
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <button
                                                                onClick={() => handleOpenDetails(opportunity)}
                                                                className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-900"
                                                                title="View Opportunity"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                            {isAuthenticated && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setOpportunityToDelete(opportunity.id);
                                                                            setIsDeleteModalOpen(true);
                                                                        }}
                                                                        className="rounded-full p-2 text-red-600 transition hover:bg-red-50 hover:text-red-900"
                                                                        title="Delete"
                                                                        disabled={isDeleting}
                                                                    >
                                                                        <Trash className="h-4 w-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </AnimatePresence>
                                )}
                            </table>
                        </div>
                    )}
                    {isFetching && page > 0 && <OpportunitySkeletonLoader isMobileView={isMobileView} isFirstPage={false} />}
                    {!hasMore && sortedOpportunities.length > 0 && (
                        <div className="py-4 text-center text-gray-500">No more opportunities to load</div>
                    )}
                </>
            )}
            {isOpen && selectedOpportunity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="flex max-h-screen w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-xl font-semibold text-gray-800">Opportunity: {selectedOpportunity.name}</h2>
                            <button onClick={closeModal} className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-grow overflow-auto p-6">
                            <OpportunityDetails opportunity={selectedOpportunity} />
                        </div>
                        <div className="flex justify-end border-t px-6 py-3">
                            <button onClick={closeModal} className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-lg font-semibold text-gray-800">Confirm Deletion</h2>
                        <p className="mb-6 text-sm text-gray-600">Are you sure you want to delete this opportunity? This action cannot be undone.</p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewDashboardOpportunities;
