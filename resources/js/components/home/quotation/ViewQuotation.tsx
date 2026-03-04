import { useAuth } from '@/hooks/use-auth';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ChevronUp,
    Download,
    Eye,
    Filter,
    NotepadTextIcon,
    Pencil,
    Search,
    Share2Icon,
    Trash,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Quotation from './Quotation';

const formatTimestampToDate = (timestamp: string) => {
    try {
        const date = new Date(parseInt(timestamp));
        return `${date.getDate()}/${date.getMonth() + 1}/${date
            .getFullYear()
            .toString()
            .slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (error) {
        return 'Invalid Date';
    }
};

interface ViewQuotationsProps {
    setEdit: (val: boolean) => void;
    setActiveTab: (tab: string) => void;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    activeTab: string;
}

interface QuotationDetails {
    refNo?: string;
    phone?: string;
    adults?: string;
    kids?: string;
    institutionName?: string;
    name?: string;
    selectedType?: string;
    discount?: string;
    preparedBy?: string;
    [key: string]: unknown;
}

const ViewQuotations: React.FC<ViewQuotationsProps> = ({ setEdit, setActiveTab, setFormData, activeTab }) => {
    const { isAuthenticated, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<keyof QuotationDetails | 'status' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [isMobileView, setIsMobileView] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState<{
        created_by?: string;
        prepared_by?: string;
        dateFilter?: {
            field: 'created_at' | 'updated_at' | 'approved_on';
            range: 'last3Months' | 'last6Months' | 'lastYear' | 'custom';
            customStart?: string;
            customEnd?: string;
        };
        status?: string;
    }>({});
    const [tempFilters, setTempFilters] = useState<{
        prepared_by?: string;
        created_by?: string;
        dateFilter?: {
            field: 'created_at' | 'updated_at' | 'approved_on';
            range: 'last3Months' | 'last6Months' | 'lastYear' | 'custom';
            customStart?: string;
            customEnd?: string;
        };
        status?: string;
    }>({});
    const [isOpen, setIsOpen] = useState(false);
    const [is_invoice_generated, setIsInvoiceGenerated] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [selectedQuotation, setSelectedQuotation] = useState<{
        id: string;
        status?: any;
        data: any;
        contact?: any;
        contact_person?: any;
        is_invoice_generated: any;
        approved_on?: Date;
        updated_at: Date;
    }>();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);
    const [isStatusChanging, setIsStatusChanging] = useState(false);
    const [currentChangingId, setCurrentChangingId] = useState<string | null>(null);
    const [quotations, setQuotations] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isFetching, setIsFetching] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const fetchQuotations = useCallback(async () => {
        setIsFetching(true);
        try {
            const selectedUser = filters.created_by ? users.find((u) => u.id === filters.created_by) : null;
            const queryParams = new URLSearchParams({
                ...(user?.role === 'staff' ? { user_id: user?.id } : {}),
                ...(filters.created_by && { created_by: filters.created_by }),
                ...(filters.status && { status: filters.status }),
                ...(filters.dateFilter?.field && {
                    dateField: filters.dateFilter.field,
                    dateRange: filters.dateFilter.range,
                    ...(filters.dateFilter.range === 'custom' && {
                        customStart: filters.dateFilter.customStart || '',
                        customEnd: filters.dateFilter.customEnd || '',
                    }),
                }),
                ...(selectedUser?.role === 'super_staff' &&
                    selectedUser?.name && {
                        prepared_by: filters.prepared_by,
                    }),
            });
            const response = await axios.get(`/api/quotations?${queryParams.toString()}`);
            setQuotations(response.data);
            setTotalCount(response.data.length);
            setIsFetching(false);
        } catch (error) {
            toast.error('Failed to fetch quotations');
            setIsFetching(false);
        }
    }, [filters, user?.role, user?.id]);

    const fetchUsers = useCallback(async () => {
        setIsUsersLoading(true);
        try {
            const response = await axios.get('/api/users');
            const filteredUsers = response.data
                .filter((user: any) => {
                    if (user.role === 'super_staff') {
                        return user.name.includes('Laura');
                    }
                    return true;
                })
                .flatMap((user: any) => {
                    if (user.role === 'super_staff') {
                        return user.name.split(',').map((name: string) => ({
                            ...user,
                            name: name.trim(),
                        }));
                    }
                    return user;
                })
                .sort((a: any, b: any) => a.name?.localeCompare(b.name));
            setUsers(filteredUsers);
            setIsUsersLoading(false);
        } catch (error) {
            toast.error('Failed to fetch users');
            setIsUsersLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchUsers();
            fetchQuotations();
        }
    }, [isAuthenticated, fetchUsers, fetchQuotations, activeTab]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref');
        if (refParam) {
            setSearchQuery(refParam);
        }
        const checkIfMobile = () => {
            setIsMobileView(window.innerWidth < 768);
        };
        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const refParam = urlParams.get('ref');
        if (refParam && quotations.length > 0) {
            const quotation = quotations.find((q) => q.quotation_details.refNo === refParam);
            if (quotation) {
                handleOpenPDF(
                    {
                        ...quotation.quotation_details,
                        status: quotation.status,
                        contact: quotation.contact,
                        contact_person: quotation.contact_person,
                    },
                    quotation.id,
                    quotation.is_invoice_generated,
                    quotation.updated_at,
                    quotation.approved_on,
                );
                window.history.replaceState(null, '', window.location.pathname + `?tab=quotations`);
                setSearchQuery('');
            }
        }
    }, [quotations]);

    const filteredQuotations = useMemo(() => {
        if (!searchQuery.trim()) return quotations;
        const lowerQuery = searchQuery.toLowerCase().trim();
        return quotations.filter((q) => {
            const details = q.quotation_details || {};
            const values = Object.values(details)
                .filter(Boolean)
                .map((v: any) => v.toString().toLowerCase());
            return (
                values.some((v) => v.includes(lowerQuery)) ||
                (q.status && q.status.toLowerCase().includes(lowerQuery)) ||
                (q.user && q.user.name && q.user.name.toLowerCase().includes(lowerQuery))
            );
        });
    }, [quotations, searchQuery]);

    useEffect(() => {
        setTotalCount(filteredQuotations.length);
    }, [filteredQuotations]);

    const handleShare = (quotationId: string, institutionName: string | undefined, name: string | undefined) => {
        const baseUrl = window.location.origin;
        const quotationUrl = `${baseUrl}/quotations/${quotationId}?name=${encodeURIComponent(institutionName || name || '')}`;
        navigator.clipboard
            .writeText(quotationUrl)
            .then(() => {
                toast.success('Link copied to clipboard!');
            })
            .catch((err) => {
                console.error('Failed to copy link:', err);
                toast.error('Failed to copy link');
            });
    };

    const handleDownloadPDF = async (
        data: any,
        is_invoice_generated: boolean,
        updated_at: Date,
        approved_on?: Date,
        contact?: any,
        contact_person?: any,
    ) => {
        try {
            const doc = (
                <Quotation
                    formData={{ ...data, status: data.status, contact, contact_person }}
                    is_invoice_generated={is_invoice_generated}
                    updated_at={updated_at}
                    approved_on={approved_on}
                />
            );
            const asPdf = pdf(doc);
            const blob = await asPdf.toBlob();
            const fileName = contact
                ? contact?.institution || [contact_person?.first_name, contact_person?.last_name].filter(Boolean).join(' ').trim()
                : data.institutionName || data.name;
            saveAs(blob, fileName);
            toast.success(`${is_invoice_generated ? 'Invoice' : 'Quotation'} downloaded successfully!`);
        } catch (error) {
            console.error('Error generating PDF for download', error);
            toast.error('Failed to download PDF');
        }
    };

    const handleDelete = (quotationId: string) => {
        setQuotationToDelete(quotationId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!quotationToDelete) return;
        setCurrentChangingId(quotationToDelete);
        try {
            await axios.delete(`/api/quotations/${quotationToDelete}`);
            toast.success('Quotation deleted successfully!');
            fetchQuotations();
        } catch (error) {
            console.error('Error deleting quotation', error);
            toast.error('Failed to delete quotation');
        } finally {
            setCurrentChangingId(null);
            setIsDeleteModalOpen(false);
            setQuotationToDelete(null);
        }
    };

    const handleStatusChange = async (quotation: any, newStatus: string) => {
        setIsStatusChanging(true);
        setCurrentChangingId(quotation?.id);
        try {
            if (newStatus === 'invoice generated') {
                await axios.patch(`/api/quotations/${quotation.id}`, {
                    is_invoice_generated: true,
                });
                await axios.post('/api/admin/invoice-generate', {
                    refNo: quotation?.quotation_details?.refNo,
                    userId: quotation?.user_id,
                    institutionName: quotation?.quotation_details?.institutionName || '',
                    name: quotation?.quotation_details?.name,
                    totalCost: 0,
                });
                toast.success('Invoice generated successfully!');
                fetchQuotations();
            } else {
                if (newStatus === 'approved' && quotation?.user_id === user?.id) {
                    toast.error('You cannot approve your own quotation. Please ask another admin to approve it.');
                    return;
                }
                await axios.patch(`/api/quotations/${quotation.id}`, {
                    status: newStatus,
                    approved_on: newStatus === 'approved' ? new Date() : undefined,
                });
                if (newStatus === 'approved') {
                    await axios.post('/api/admin/approve-quotation', {
                        refNo: quotation?.quotation_details?.refNo,
                        userId: quotation?.user_id,
                        institutionName: quotation?.quotation_details?.institutionName || '',
                        name: quotation?.quotation_details?.name,
                        totalCost: 0,
                    });
                }
                toast.success('Quotation status updated successfully!');
                fetchQuotations();
            }
        } catch (error) {
            console.error('Error updating status', error);
            toast.error('Failed to update status');
        } finally {
            setIsStatusChanging(false);
            setCurrentChangingId(null);
        }
    };

    const openModal = () => setIsOpen(true);
    const closeModal = () => setIsOpen(false);

    const handleOpenPDF = (data: any, id: string, is_invoice_generated: boolean, updated_at: Date, approved_on?: Date) => {
        localStorage.setItem('roomSummary', null);
        localStorage.setItem('serviceSummary', null);

        openModal();
        setIsInvoiceGenerated(is_invoice_generated);
        setSelectedQuotation({
            id,
            status: data.status,
            data,
            is_invoice_generated,
            approved_on,
            updated_at,
        });
        setFormData(data);
    };

    const handleUpdate = (quotation: any) => {
        try {
            const details = quotation.quotation_details;
            let updatedDetails = { ...details };
            let institutionName = details.institutionName || '';
            let name = details.name || '';
            let phone = details.phone || '';
            let email = details.email || '';
            let contact_person_id = '';
            let selectedType = details.selectedType || 'Corporate';
            let contact_id = '';

            if (quotation.contact) {
                contact_id = quotation.contact.id;
                institutionName = quotation.contact.institution;
                if (quotation.contact_person) {
                    name = `${quotation.contact_person.first_name || ''} ${quotation.contact_person.last_name || ''}`.trim();
                    phone = quotation.contact_person.phone || '';
                    email = quotation.contact_person.email || '';
                    contact_person_id = quotation.contact_person.id;
                }
            }

            updatedDetails = {
                ...details,
                institutionName,
                name,
                phone,
                email,
                selectedType,
                contact_person_id,
                contact_id,
            };

            localStorage.removeItem('quotationForm');
            localStorage.setItem('quotationForm', JSON.stringify(updatedDetails));
            localStorage.setItem('id', quotation.id);
            setFormData(updatedDetails);
            setActiveTab('edit');
            setEdit(true);
        } catch (error) {
            console.error('Error updating quotation', error);
            toast.error('Failed to prepare quotation for editing');
        }
    };

    const handleSort = (field: string) => {
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
                  field?: 'created_at' | 'updated_at' | 'approved_on';
                  range?: 'last3Months' | 'last6Months' | 'lastYear' | 'custom';
                  customStart?: string;
                  customEnd?: string;
              }
            | undefined,
    ) => {
        setTempFilters((prev) => {
            if (key === 'dateFilter' && typeof value !== 'string' && value) {
                const currentDateFilter = prev.dateFilter || { field: 'created_at', range: 'last3Months' };
                return {
                    ...prev,
                    dateFilter: {
                        ...currentDateFilter,
                        ...value,
                    },
                };
            }
            if (key === 'created_by') {
                if (!value || value === '') {
                    const { prepared_by, created_by, ...rest } = prev;
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
                            created_by: selectedUser.id,
                            prepared_by: selectedUser.name,
                        };
                    } else {
                        return {
                            ...prev,
                            created_by: selectedUser.id,
                            prepared_by: selectedUser.name,
                        };
                    }
                }
            }
            return {
                ...prev,
                [key]: value,
            };
        });
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
            fetchQuotations();
            toast.success('Filters applied successfully!');
        } catch (error) {
            console.error('Error applying filters:', error);
            toast.error('Failed to apply filters.');
        }
    };

    const clearFilters = () => {
        setTempFilters({});
        setFilters({});
        fetchQuotations();
        toast.success('Filters cleared!');
    };

    const sortedQuotations = useMemo(() => {
        if (!sortField) return filteredQuotations;

        return [...filteredQuotations].sort((a, b) => {
            let valueA: unknown, valueB: unknown;

            switch (sortField) {
                case 'refNo':
                    valueA = parseInt(a.quotation_details.refNo || '0');
                    valueB = parseInt(b.quotation_details.refNo || '0');
                    return sortDirection === 'desc' ? (valueB as number) - (valueA as number) : (valueA as number) - (valueB as number);

                case 'phone':
                case 'institutionName':
                case 'name':
                case 'selectedType':
                    const getDisplayName = (quotation: any) => {
                        quotation.contact
                            ? quotation.contact?.institution ||
                              [quotation.contact_person?.first_name, quotation.contact_person?.last_name].filter(Boolean).join(' ').trim()
                            : quotation.quotation_details?.institutionName || quotation.quotation_details?.name;
                    };
                    if (sortField === 'institutionName') {
                        valueA = getDisplayName(a);
                        valueB = getDisplayName(b);
                    } else {
                        valueA = a.quotation_details[sortField] ?? '';
                        valueB = b.quotation_details[sortField] ?? '';
                    }
                    return sortDirection === 'desc'
                        ? (valueB as string).localeCompare(valueA as string)
                        : (valueA as string).localeCompare(valueB as string);

                case 'adults':
                    valueA = parseInt(a.quotation_details.adults || '0') + parseInt(a.quotation_details.kids || '0');
                    valueB = parseInt(b.quotation_details.adults || '0') + parseInt(b.quotation_details.kids || '0');
                    return sortDirection === 'desc' ? (valueB as number) - (valueA as number) : (valueA as number) - (valueB as number);

                case 'discount':
                    valueA = parseFloat(((a.quotation_details as any)?.discount ?? '0') as string);
                    valueB = parseFloat(((b.quotation_details as any)?.discount ?? '0') as string);
                    return sortDirection === 'desc' ? (valueB as number) - (valueA as number) : (valueA as number) - (valueB as number);

                case 'status':
                    valueA = a.status;
                    valueB = b.status;
                    return sortDirection === 'desc'
                        ? (valueB as string).localeCompare(valueA as string)
                        : (valueA as string).localeCompare(valueB as string);

                default:
                    return 0;
            }
        });
    }, [filteredQuotations, sortField, sortDirection]);

    const activeFilters = useMemo(() => {
        const filtersList: { label: string; value: string }[] = [];

        if (filters.status) {
            filtersList.push({
                label: 'Status',
                value: filters.status,
            });
        }

        if (filters.created_by) {
            const user = users.find((u) => u.id === filters.created_by);
            if (user?.role === 'super_staff' && filters.prepared_by) {
                filtersList.push({
                    label: 'Prepared By',
                    value: filters.prepared_by,
                });
            } else {
                filtersList.push({
                    label: 'Prepared By',
                    value: user?.name || filters.prepared_by,
                });
            }
        }

        if (filters.dateFilter?.field) {
            const fieldName = {
                created_at: 'Created At',
                updated_at: 'Updated At',
                approved_on: 'Approved On',
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

        return filtersList;
    }, [filters, users]);

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="mt-4 px-2 sm:px-4">
            <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row">
                <div className="relative flex-grow">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search ..."
                        className="block w-full rounded-md border border-gray-300 bg-white py-2 pr-10 pl-10 leading-5 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none sm:text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            aria-label="Clear search"
                        >
                            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
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
                <p className="ml-2">
                    <span className="font-2xl">{totalCount}</span> results
                </p>
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
                                    {activeFilters?.map((filter, index) => (
                                        <div key={index} className="flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                                            <span>
                                                {filter.label}: {filter.value}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    if (filter.label.includes('Date')) {
                                                        handleFilterChange('dateFilter', undefined);
                                                    } else if (filter.label === 'Status') {
                                                        handleFilterChange('status', undefined);
                                                    } else if (filter.label === 'Prepared By') {
                                                        handleFilterChange('created_by', undefined);
                                                        handleFilterChange('prepared_by', undefined);
                                                    }
                                                    setFilters((prev) => {
                                                        const updated = { ...prev };
                                                        if (filter.label.includes('Date')) {
                                                            delete updated.dateFilter;
                                                        } else if (filter.label === 'Status') {
                                                            delete updated.status;
                                                        } else if (filter.label === 'Prepared By') {
                                                            delete updated.created_by;
                                                            delete updated.prepared_by;
                                                        }
                                                        return updated;
                                                    });
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
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    value={tempFilters.status || ''}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="">All</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                </select>
                            </div>
                            {['admin', 'super_staff'].includes(user?.role || '') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Prepared By</label>
                                    <select
                                        value={tempFilters.prepared_by || ''}
                                        onChange={(e) => handleFilterChange('created_by', e.target.value)}
                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        disabled={isUsersLoading}
                                    >
                                        <option value="">All Users</option>
                                        {users?.map((user) => (
                                            <option key={`${user.id}-${user.name}`} value={user.name}>
                                                {user.name}
                                            </option>
                                        ))}
                                    </select>
                                    {isUsersLoading && <p className="mt-1 text-sm text-gray-500">Loading users...</p>}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date Filter</label>
                                <select
                                    value={tempFilters.dateFilter?.field || ''}
                                    onChange={(e) =>
                                        handleFilterChange('dateFilter', {
                                            field: e.target.value as 'created_at' | 'updated_at' | 'approved_on',
                                            range: tempFilters.dateFilter?.range || 'last3Months',
                                            customStart: tempFilters.dateFilter?.customStart,
                                            customEnd: tempFilters.dateFilter?.customEnd,
                                        })
                                    }
                                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="">Select Date Field</option>
                                    <option value="created_at">Created At</option>
                                    <option value="updated_at">Updated At</option>
                                    <option value="approved_on">Approved On</option>
                                </select>
                            </div>
                            {tempFilters.dateFilter?.field && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date Range</label>
                                    <select
                                        value={tempFilters.dateFilter?.range || ''}
                                        onChange={(e) =>
                                            handleFilterChange('dateFilter', {
                                                field: tempFilters.dateFilter?.field || 'created_at',
                                                range: e.target.value as 'last3Months' | 'last6Months' | 'lastYear' | 'custom',
                                                customStart: tempFilters.dateFilter?.customStart,
                                                customEnd: tempFilters.dateFilter?.customEnd,
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
                                                    field: tempFilters.dateFilter?.field || 'created_at',
                                                    range: tempFilters.dateFilter?.range || 'custom',
                                                    customStart: e.target.value,
                                                    customEnd: tempFilters.dateFilter?.customEnd,
                                                })
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                        <input
                                            type="date"
                                            value={tempFilters.dateFilter?.customEnd || ''}
                                            onChange={(e) =>
                                                handleFilterChange('dateFilter', {
                                                    field: tempFilters.dateFilter?.field || 'created_at',
                                                    range: tempFilters.dateFilter?.range || 'custom',
                                                    customStart: tempFilters.dateFilter?.customStart,
                                                    customEnd: e.target.value,
                                                })
                                            }
                                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
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

            {isFetching ? (
                <div className="flex min-h-[300px] items-center justify-center">
                    <motion.div
                        className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                        initial={{ rotate: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    />
                </div>
            ) : (
                <>
                    {isMobileView ? (
                        <div className="space-y-4">
                            {sortedQuotations?.map((quotation) => (
                                <div key={quotation.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">{quotation.quotation_details.refNo}</p>
                                            <p className="text-sm text-gray-500">{formatTimestampToDate(quotation.quotation_details.refNo)}</p>
                                        </div>
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                quotation.status === 'approved'
                                                    ? 'bg-green-100 text-green-700'
                                                    : quotation.status === 'saved'
                                                      ? 'bg-green-100 text-green-700'
                                                      : quotation.status === 'rejected'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-gray-200 text-gray-700'
                                            }`}
                                        >
                                            {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                                        </span>
                                    </div>
                                    <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-gray-500">Phone</p>
                                            <p>{quotation.contact ? quotation.contact_person?.phone : quotation.quotation_details.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Pax</p>
                                            <p>{quotation.quotation_details.adults}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Type</p>
                                            <p>{quotation.quotation_details.selectedType}</p>
                                        </div>
                                    </div>
                                    {user?.role === 'admin' && (
                                        <div className="mt-2 mb-3">
                                            <select
                                                className="w-full rounded border p-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                value={quotation.status}
                                                onChange={(e) => handleStatusChange(quotation, e.target.value)}
                                                disabled={isStatusChanging && currentChangingId === quotation.id}
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="pending">Pending</option>
                                                <option value="approved">Approved</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="mt-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {quotation.contact
                                                    ? quotation.contact?.institution ||
                                                      [quotation.contact_person.first_name, quotation.contact_person?.last_name]
                                                          .filter(Boolean)
                                                          .join(' ')
                                                          .trim()
                                                    : quotation.quotation_details?.institutionName || quotation.quotation_details?.name}
                                            </p>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() =>
                                                    handleOpenPDF(
                                                        { ...quotation.quotation_details, status: quotation.status, user: quotation.user },
                                                        quotation.id,
                                                        false,
                                                        quotation.updated_at,
                                                        quotation.approved_on,
                                                    )
                                                }
                                                className="rounded-full bg-blue-100 p-2 text-blue-600 transition hover:bg-blue-200"
                                                title="View"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleUpdate(quotation)}
                                                className="rounded-full bg-green-100 p-2 text-green-600 transition hover:bg-green-200"
                                                title="Edit"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() =>
                                                    handleShare(
                                                        quotation.id,
                                                        quotation.contact
                                                            ? quotation.contact.institution
                                                            : quotation.quotation_details.institutionName,

                                                        quotation.contact_person
                                                            ? [quotation.contact_person?.first_name, quotation.contact_person?.last_name]
                                                                  .filter(Boolean)
                                                                  .join(' ')
                                                                  .trim()
                                                            : quotation.quotation_details.name,
                                                    )
                                                }
                                                className="rounded-full bg-purple-100 p-2 text-purple-600 transition hover:bg-purple-200"
                                                title="Share"
                                            >
                                                <Share2Icon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-200 shadow-md sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('refNo')}
                                        >
                                            <div className="flex items-center">
                                                Date
                                                {sortField === 'refNo' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('refNo')}
                                        >
                                            <div className="flex items-center">
                                                RefNo
                                                {sortField === 'refNo' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('phone')}
                                        >
                                            <div className="flex items-center">
                                                Phone
                                                {sortField === 'phone' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('adults')}
                                        >
                                            <div className="flex items-center">
                                                Pax
                                                {sortField === 'adults' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('institutionName')}
                                        >
                                            <div className="flex items-center">
                                                Name/Institution
                                                {sortField === 'institutionName' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('selectedType')}
                                        >
                                            <div className="flex items-center">
                                                Type
                                                {sortField === 'selectedType' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        <th
                                            className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                            onClick={() => handleSort('status')}
                                        >
                                            <div className="flex items-center">
                                                Status
                                                {sortField === 'status' &&
                                                    (sortDirection === 'desc' ? (
                                                        <ArrowDown size={16} className="ml-1" />
                                                    ) : (
                                                        <ArrowUp size={16} className="ml-1" />
                                                    ))}
                                            </div>
                                        </th>
                                        {['admin', 'super_staff'].includes(user?.role || '') && (
                                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                <div className="flex items-center">Prepared by</div>
                                            </th>
                                        )}
                                        <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {sortedQuotations?.map((quotation) => (
                                        <tr key={quotation.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                {formatTimestampToDate(quotation.quotation_details.refNo)}
                                            </td>
                                            <td className="px-4 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                                                {quotation.quotation_details.refNo}
                                            </td>
                                            <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                {quotation.contact ? quotation.contact_person?.phone : quotation.quotation_details.phone}
                                            </td>
                                            <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                {quotation.quotation_details.adults}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-500">
                                                {quotation.contact
                                                    ? quotation.contact?.institution ||
                                                      [quotation.contact_person?.first_name, quotation.contact_person?.last_name]
                                                          .filter(Boolean)
                                                          .join(' ')
                                                          .trim()
                                                    : quotation.quotation_details?.institutionName || quotation.quotation_details?.name}
                                            </td>
                                            <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                {quotation.quotation_details.selectedType}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                                        quotation.status === 'approved'
                                                            ? 'bg-green-100 text-green-700'
                                                            : quotation.status === 'saved'
                                                              ? 'bg-green-100 text-green-700'
                                                              : quotation.status === 'rejected'
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-gray-200 text-gray-700'
                                                    }`}
                                                >
                                                    {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                                                </span>
                                            </td>
                                            {['admin', 'super_staff'].includes(user?.role || '') && (
                                                <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">
                                                    {quotation.quotation_details.preparedBy}
                                                </td>
                                            )}
                                            <td className="px-4 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {['admin'].includes(user?.role || '') && (
                                                        <select
                                                            className="rounded border px-4 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                            value={quotation.status}
                                                            onChange={(e) => handleStatusChange(quotation, e.target.value)}
                                                            disabled={isStatusChanging && currentChangingId === quotation.id}
                                                        >
                                                            {isStatusChanging && currentChangingId === quotation.id ? (
                                                                <option>Processing...</option>
                                                            ) : (
                                                                <>
                                                                    <option value="draft">Draft</option>
                                                                    <option value="pending">Pending</option>
                                                                    <option value="approved">Approved</option>
                                                                    {quotation.status === 'approved' && (
                                                                        <option value="invoice generated">Generate Invoice</option>
                                                                    )}
                                                                </>
                                                            )}
                                                        </select>
                                                    )}
                                                    {quotation.status === 'approved' && ['staff', 'super_staff'].includes(user?.role || '') && (
                                                        <button
                                                            onClick={() => handleStatusChange(quotation, 'invoice generated')}
                                                            disabled={
                                                                quotation.is_invoice_generated ||
                                                                (isStatusChanging && currentChangingId === quotation.id)
                                                            }
                                                            className={`flex items-center rounded-md px-3 py-1 text-xs font-medium transition ${
                                                                quotation.is_invoice_generated ||
                                                                (isStatusChanging && currentChangingId === quotation.id)
                                                                    ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                                            }`}
                                                            title={quotation.is_invoice_generated ? 'Invoice Already Generated' : 'Generate Invoice'}
                                                        >
                                                            {isStatusChanging && currentChangingId === quotation.id ? (
                                                                <>
                                                                    <span className="mr-2 animate-spin">⌀</span>
                                                                    Generating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <NotepadTextIcon className="mr-1 h-4 w-4" />
                                                                    {quotation.is_invoice_generated
                                                                        ? 'Invoice Already Generated'
                                                                        : 'Generate Invoice'}
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            handleOpenPDF(
                                                                {
                                                                    ...quotation.quotation_details,
                                                                    status: quotation.status,
                                                                    user: quotation.user,
                                                                    contact: quotation.contact,
                                                                    contact_person: quotation.contact_person,
                                                                },
                                                                quotation.id,
                                                                false,
                                                                quotation.updated_at,
                                                                quotation.approved_on,
                                                            )
                                                        }
                                                        className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-900"
                                                        title="View Quotation"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    {quotation.status === 'approved' && quotation.is_invoice_generated && (
                                                        <button
                                                            onClick={() =>
                                                                handleOpenPDF(
                                                                    {
                                                                        ...quotation.quotation_details,
                                                                        status: quotation.status,
                                                                        user: quotation.user,
                                                                        contact: quotation.contact,
                                                                        contact_person: quotation.contact_person,
                                                                    },
                                                                    quotation.id,
                                                                    true,
                                                                    quotation.updated_at,
                                                                    quotation.approved_on,
                                                                )
                                                            }
                                                            className="rounded-full p-2 text-green-600 transition hover:bg-green-50 hover:text-green-900"
                                                            title="View Invoice"
                                                        >
                                                            <NotepadTextIcon className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {quotation.status && (
                                                        <button
                                                            onClick={() => handleUpdate(quotation)}
                                                            className="rounded-full p-2 text-green-600 transition hover:bg-green-50 hover:text-green-900"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {quotation.status !== 'approved' && user?.role === 'admin' && (
                                                        <button
                                                            onClick={() => handleDelete(quotation.id)}
                                                            disabled={currentChangingId === quotation.id}
                                                            className={`rounded-full bg-red-100 p-2 text-red-600 transition hover:bg-red-200 ${
                                                                currentChangingId === quotation.id ? 'cursor-not-allowed opacity-50' : ''
                                                            }`}
                                                            title="Delete"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() =>
                                                            handleShare(
                                                                quotation.id,
                                                                quotation.quotation_details.institutionName,
                                                                quotation.quotation_details.name,
                                                            )
                                                        }
                                                        className="rounded-full p-2 text-purple-600 transition hover:bg-purple-50 hover:text-purple-900"
                                                        title="Share"
                                                    >
                                                        <Share2Icon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div
                        className={`w-full rounded-lg bg-white shadow-xl ${
                            isMobileView ? 'max-w-full' : 'max-w-6xl'
                        } flex max-h-screen flex-col overflow-hidden`}
                    >
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-sm font-semibold text-gray-800">
                                {selectedQuotation && (
                                    <>
                                        {is_invoice_generated ? 'Invoice ' : 'Quotation '}
                                        {selectedQuotation.data.refNo || ''}
                                    </>
                                )}
                            </h2>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() =>
                                        handleDownloadPDF(
                                            {
                                                ...selectedQuotation?.data,
                                                status: selectedQuotation?.status,
                                            },
                                            false,
                                            selectedQuotation?.updated_at || new Date(),
                                            selectedQuotation?.approved_on,
                                            selectedQuotation?.contact,
                                            selectedQuotation?.contact_person,
                                        )
                                    }
                                    className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-900"
                                    title="Download Quotation"
                                >
                                    <Download className="h-6 w-6" />
                                </button>
                                <button onClick={closeModal} className="rounded-full p-3 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-grow overflow-auto">
                            {selectedQuotation && (
                                <PDFViewer
                                    width="100%"
                                    height="100%"
                                    className={isMobileView ? 'h-[80vh] w-full' : 'h-[80vh]'}
                                    style={{
                                        transform: isMobileView ? 'scale(0.8)' : 'scale(1)',
                                    }}
                                >
                                    <Quotation
                                        formData={{
                                            ...selectedQuotation.data,
                                            status: selectedQuotation.status,
                                        }}
                                        is_invoice_generated={is_invoice_generated}
                                        updated_at={selectedQuotation.updated_at}
                                        approved_on={selectedQuotation.approved_on}
                                    />
                                </PDFViewer>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2 border-t px-6 py-3">
                            <button onClick={closeModal} className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300">
                                Close
                            </button>
                            {user?.role === 'admin' && selectedQuotation?.status !== 'approved' && (
                                <button
                                    onClick={() => handleStatusChange(selectedQuotation, 'approved')}
                                    className="rounded-md bg-green-600 px-6 py-2 text-white transition hover:bg-green-700"
                                    disabled={isStatusChanging}
                                >
                                    {isStatusChanging ? (
                                        <>
                                            <span className="mr-2 animate-spin">⌀</span>
                                            Approving...
                                        </>
                                    ) : isApproved ? (
                                        'Approved'
                                    ) : (
                                        'Approve'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {isDeleteModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-labelledby="delete-modal-title"
                    aria-modal="true"
                >
                    <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 id="delete-modal-title" className="text-lg font-semibold text-gray-800">
                                Confirm Deletion
                            </h2>
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setQuotationToDelete(null);
                                }}
                                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="px-6 py-4">
                            <p className="text-sm text-gray-600">
                                Are you sure you want to delete this quotation with Ref No:{' '}
                                {sortedQuotations.find((q) => q.id === quotationToDelete)?.quotation_details?.refNo || 'Unknown'} ? This action cannot
                                be undone.
                            </p>
                        </div>
                        <div className="flex justify-end space-x-2 border-t px-6 py-3">
                            <button
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setQuotationToDelete(null);
                                }}
                                className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
                                disabled={currentChangingId === quotationToDelete}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className={`flex items-center rounded-md bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 ${
                                    currentChangingId === quotationToDelete ? 'cursor-not-allowed opacity-50' : ''
                                }`}
                                disabled={currentChangingId === quotationToDelete}
                            >
                                {currentChangingId === quotationToDelete ? (
                                    <>
                                        <span className="mr-2 animate-spin">⌀</span>
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewQuotations;
