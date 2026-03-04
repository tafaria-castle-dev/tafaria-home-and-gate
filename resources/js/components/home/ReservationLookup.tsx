import { useAuth } from '@/hooks/use-auth';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import {
    ArrowDown,
    ArrowUp,
    Building,
    Calendar,
    Car,
    ChevronDown,
    ChevronUp,
    Edit,
    Eye,
    FileText,
    Filter,
    Hash,
    MoreVertical,
    Plus,
    Search,
    Trash2,
    User,
    Users,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { formatMySQLDate } from '../utils/formatMYSQLDate';
import { formatTimestampToDate } from './opportunities/ViewOpportunities';

enum ClearanceStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

interface ClearanceInfo {
    cleared_by?: string;
    cleared_date?: string;
    status?: ClearanceStatus;
    comments?: string;
}

interface Reservation {
    id: string;
    contact_id: string;
    contact_person_id: string;
    check_in_date?: string;
    check_out_date?: string;
    car_plate_number?: string;
    reservation_number?: string;
    id_or_passport_number?: string;
    id_or_passport_photo?: string | File;
    cleared_for_checkin?: ClearanceInfo;
    cleared_for_checkout?: ClearanceInfo;
    created_by_id?: string;
    created_at?: string;
    contact?: {
        id: string;
        name?: string;
        institution?: string;
    };
    contact_person?: {
        id: string;
        first_name?: string;
        last_name?: string;
    };
    created_by?: {
        id: string;
        name: string;
    };
}

interface Contact {
    id: string;
    institution?: string;
    type: string;
    contact_persons: ContactPerson[];
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface Filters {
    clearedForCheckin?: ClearanceStatus;
    clearedForCheckout?: ClearanceStatus;
    createdBy?: string;
    contact_id?: string;
    dateFilter?: {
        field: 'created_at' | 'check_in_date' | 'check_out_date';
        range: 'last3Months' | 'last6Months' | 'lastYear' | 'custom';
        customStart?: string;
        customEnd?: string;
    };
}

interface ContactPerson {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    contact_id: string;
    institution_name?: string;
    contact?: { institution: string };
}

export const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query || query.length < 3) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
        regex.test(part) ? (
            <span key={index} className="bg-yellow-200 font-semibold">
                {part}
            </span>
        ) : (
            part
        ),
    );
};

const filterOptions = <T,>(options: T[], query: string, getLabel: (option: T) => string): T[] => {
    if (!query || query.length < 3) return options;
    return options.filter((option) => getLabel(option).toLowerCase().includes(query.toLowerCase())).slice(0, 10);
};

export default function ReservationManagement() {
    const { isAuthenticated, logout, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
    const [sortField, setSortField] = useState<keyof Reservation>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [loadingReservationId, setLoadingReservationId] = useState<string | null>(null);
    const [expandedReservation, setExpandedReservation] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewedReservation, setViewedReservation] = useState<Reservation | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'checkin' | 'checkout'>('general');
    const [formData, setFormData] = useState<Partial<Reservation>>({
        contact_id: '',
        contact_person_id: '',
        check_in_date: '',
        check_out_date: '',
        car_plate_number: '',
        reservation_number: '',
        id_or_passport_number: '',
        id_or_passport_photo: '',
        cleared_for_checkin: {
            cleared_by: '',
            cleared_date: '',
            status: ClearanceStatus.PENDING,
            comments: '',
        },
        cleared_for_checkout: {
            cleared_by: '',
            cleared_date: '',
            status: ClearanceStatus.PENDING,
            comments: '',
        },
    });
    const [editReservationId, setEditReservationId] = useState<string | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState<Filters>({});
    const [tempFilters, setTempFilters] = useState<Filters>({});
    const [selectedType, setSelectedType] = useState<'Institution' | 'Individual'>('Institution');
    const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
    const [contactPersonSearchQuery, setContactPersonSearchQuery] = useState('');
    const [selectedInstitution, setSelectedInstitution] = useState<Contact | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentDateTime = new Date().toISOString();

    const fetchReservations = useCallback(async () => {
        if (!hasMore || isLoading) return;
        setIsLoading(true);
        try {
            const response = await axios.get('/api/reservations', {
                params: {
                    searchQuery: debouncedSearchQuery,
                    page,
                    limit: 100,
                    filters: {
                        clearedForCheckin: filters.clearedForCheckin,
                        clearedForCheckout: filters.clearedForCheckout,
                        createdBy: filters.createdBy,
                        contact_id: filters.contact_id,
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
            setFilteredReservations((prev) => {
                const existingIds = new Set(prev.map((reservation) => reservation.id));
                return [...prev, ...response.data.results.filter((reservation: Reservation) => !existingIds.has(reservation.id))];
            });
            setTotalCount(response.data.totalCount || 0);
            setHasMore(response.data.hasMore);
        } catch (error) {
            toast.error('Failed to fetch reservations');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearchQuery, page, hasMore, filters]);

    const fetchContacts = useCallback(async () => {
        try {
            const response = await axios.get('/api/contacts');
            setContacts(response.data.results || []);
        } catch (error) {
            toast.error('Failed to fetch contacts');
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await axios.get('/api/users');
            setUsers(response.data);
        } catch (error) {
            toast.error('Failed to fetch users');
        }
    }, []);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setDebouncedSearchQuery(value);
            setPage(0);
            setFilteredReservations([]);
            setTotalCount(0);
            setHasMore(true);
        }, 500),
        [],
    );

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchReservations();
            fetchContacts();
            fetchUsers();
        }
    }, [isAuthenticated, fetchReservations, debouncedSearchQuery]);

    useEffect(() => {
        fetchReservations();
    }, [filters]);

    const lastReservationElementRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (isLoading || !hasMore) return;
            if (observer.current) observer.current.disconnect();
            observer.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting && hasMore && !isLoading) {
                        setPage((prevPage) => prevPage + 1);
                    }
                },
                {
                    threshold: 0.1,
                    rootMargin: '300px',
                },
            );
            if (node) observer.current.observe(node);
        },
        [isLoading, hasMore],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        debouncedSearch(e.target.value);
        setSearchQuery(e.target.value);
    };

    const handleSearchClear = useCallback(() => {
        setSearchQuery('');
        setDebouncedSearchQuery('');
        setPage(0);
        setFilteredReservations([]);
        setTotalCount(0);
        setHasMore(true);
    }, []);

    const handleSort = (field: keyof Reservation) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedReservations = filteredReservations?.slice().sort((a, b) => {
        let valueA: any, valueB: any;
        switch (sortField) {
            case 'reservation_number':
                valueA = a.reservation_number ?? '';
                valueB = b.reservation_number ?? '';
                return sortDirection === 'desc' ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
            case 'check_in_date':
                valueA = a.check_in_date ? new Date(a.check_in_date).getTime() : 0;
                valueB = b.check_in_date ? new Date(b.check_in_date).getTime() : 0;
                return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
            case 'created_at':
                valueA = new Date(a.created_at || '').getTime();
                valueB = new Date(b.created_at || '').getTime();
                return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
            default:
                return 0;
        }
    });

    const handleFilterChange = (
        key: keyof Filters,
        value: string | ClearanceStatus | { field?: string; range?: string; customStart?: string; customEnd?: string } | undefined,
    ) => {
        setTempFilters((prev) => {
            if (key === 'dateFilter' && typeof value !== 'string' && value) {
                return {
                    ...prev,
                    [key]: {
                        field: (value.field || prev.dateFilter?.field || 'created_at') as 'created_at' | 'check_in_date' | 'check_out_date',
                        range: (value.range || prev.dateFilter?.range || 'last3Months') as 'last3Months' | 'last6Months' | 'lastYear' | 'custom',
                        customStart: value.customStart !== undefined ? value.customStart : prev.dateFilter?.customStart,
                        customEnd: value.customEnd !== undefined ? value.customEnd : prev.dateFilter?.customEnd,
                    },
                };
            }
            return {
                ...prev,
                [key]: value || undefined,
            };
        });
    };

    const addFilters = useCallback(async () => {
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
            setFilteredReservations([]);
            setTotalCount(0);
            setHasMore(true);
            toast.success('Filters applied successfully!');
        } catch (error) {
            toast.error('Failed to apply filters.');
        }
    }, [tempFilters]);

    const clearFilters = () => {
        setTempFilters({});
        setFilters({});
        setPage(0);
        setFilteredReservations([]);
        setTotalCount(0);
        setHasMore(true);
        fetchReservations();
        toast.success('Filters cleared!');
    };

    const activeFilters = useMemo(() => {
        const filtersList: { label: string; value: string }[] = [];
        if (filters.clearedForCheckin) {
            filtersList.push({
                label: 'Check-in Status',
                value: filters.clearedForCheckin.toUpperCase(),
            });
        }
        if (filters.clearedForCheckout) {
            filtersList.push({
                label: 'Check-out Status',
                value: filters.clearedForCheckout.toUpperCase(),
            });
        }
        if (filters.createdBy) {
            const user = users.find((u) => u.id === filters.createdBy);
            filtersList.push({
                label: 'Created By',
                value: user?.name || filters.createdBy,
            });
        }
        if (filters.contact_id) {
            const contact = contacts.find((c) => c.id === filters.contact_id);
            filtersList.push({
                label: 'Contact',
                value: contact?.institution || filters.contact_id,
            });
        }
        if (filters.dateFilter?.field) {
            const fieldName = {
                created_at: 'Created At',
                check_in_date: 'Check-in Date',
                check_out_date: 'Check-out Date',
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
    }, [filters, users, contacts]);

    const removeFilter = useCallback((label: string) => {
        setFilters((prev) => {
            const newFilters = { ...prev };
            switch (label) {
                case 'Check-in Status':
                    delete newFilters.clearedForCheckin;
                    break;
                case 'Check-out Status':
                    delete newFilters.clearedForCheckout;
                    break;
                case 'Created By':
                    delete newFilters.createdBy;
                    break;
                case 'Contact':
                    delete newFilters.contact_id;
                    break;
                default:
                    if (label.includes('Date')) {
                        delete newFilters.dateFilter;
                    }
                    break;
            }
            setTempFilters(newFilters);
            setPage(0);
            setFilteredReservations([]);
            setTotalCount(0);
            setHasMore(true);
            fetchReservations();
            return newFilters;
        });
    }, []);

    const getContactName = (reservation: Reservation) => {
        return reservation.contact?.name || reservation.contact?.institution || 'N/A';
    };

    const getContactPersonName = (reservation: Reservation) => {
        return `${reservation.contact_person?.first_name || ''} ${reservation.contact_person?.last_name || ''}`.trim() || 'N/A';
    };

    const getStatusBadge = (clearance: ClearanceInfo | undefined) => {
        if (!clearance?.status)
            return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">Pending</span>;
        switch (clearance.status) {
            case ClearanceStatus.APPROVED:
                return <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">Approved</span>;
            case ClearanceStatus.REJECTED:
                return <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">Rejected</span>;
            default:
                return <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">Pending</span>;
        }
    };

    const handleView = (reservation: Reservation) => {
        setViewedReservation(reservation);
        setShowViewModal(true);
    };

    const handleCreate = async () => {
        if (
            !formData.contact_id ||
            !formData.contact_person_id ||
            !formData.reservation_number ||
            !formData.check_in_date ||
            !formData.check_out_date
        ) {
            toast.error('All required fields must be filled');
            return;
        }
        setIsSubmitting(true);

        const submitData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'cleared_for_checkin' || key === 'cleared_for_checkout') {
                const clearance = value as ClearanceInfo;
                Object.entries(clearance).forEach(([subKey, subValue]) => {
                    if (subValue !== undefined && subValue !== null && subValue !== '') {
                        submitData.append(`${key}[${subKey}]`, subValue as string);
                    }
                });
            } else if (value !== undefined && value !== null && value !== '') {
                submitData.append(key, value as string | Blob);
            }
        });
        submitData.append('created_by_id', user?.id || '');

        try {
            await axios.post('/api/reservations', submitData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Reservation created successfully');
            setShowCreateModal(false);
            resetForm();
            handleSearchClear();
            fetchReservations();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create reservation');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (reservation: Reservation) => {
        setEditReservationId(reservation.id);
        setFormData({
            ...reservation,
            cleared_for_checkin: reservation.cleared_for_checkin || {
                cleared_by: '',
                cleared_date: '',
                status: ClearanceStatus.PENDING,
                comments: '',
            },
            cleared_for_checkout: reservation.cleared_for_checkout || {
                cleared_by: '',
                cleared_date: '',
                status: ClearanceStatus.PENDING,
                comments: '',
            },
        });
        setActiveTab('general');
        setShowEditModal(true);
        setIsCreating(false);
        const contact = contacts.find((c) => c.id === reservation.contact_id);
        if (contact) {
            if (contact.type === 'INSTITUTION') {
                setSelectedType('Institution');
                setSelectedInstitution(contact);
                setInstitutionSearchQuery(contact.institution || '');
            } else {
                setSelectedType('Individual');
                setSelectedInstitution(null);
                setInstitutionSearchQuery('');
            }
        }
        const person = contact?.contact_persons.find((p) => p.id === reservation.contact_person_id);
        if (person) {
            setContactPersonSearchQuery(`${person.first_name} ${person.last_name}`.trim());
        }
    };

    const handleUpdate = async () => {
        if (!editReservationId) return;
        if (
            !formData.contact_id ||
            !formData.contact_person_id ||
            !formData.reservation_number ||
            !formData.check_in_date ||
            !formData.check_out_date
        ) {
            toast.error('All required fields must be filled');
            return;
        }
        setIsSubmitting(true);

        const submitData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'cleared_for_checkin' || key === 'cleared_for_checkout') {
                const clearance = value as ClearanceInfo;
                Object.entries(clearance).forEach(([subKey, subValue]) => {
                    if (subValue !== undefined && subValue !== null && subValue !== '') {
                        submitData.append(`${key}[${subKey}]`, subValue as string);
                    }
                });
            } else if (key === 'id_or_passport_photo') {
                if (value instanceof File) {
                    submitData.append(key, value);
                }
            } else if (value !== undefined && value !== null && value !== '' && typeof value === 'string') {
                submitData.append(key, value);
            }
        });
        submitData.append('_method', 'PUT');
        try {
            await axios.post(`/api/reservations/${editReservationId}`, submitData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Reservation updated successfully');
            setShowEditModal(false);
            resetForm();
            handleSearchClear();
            fetchReservations();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update reservation');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            updateFormField('id_or_passport_photo', file);
            toast.success('File selected');
        }
    };

    const handleDelete = async (id: string) => {
        setLoadingReservationId(id);
        try {
            await axios.delete(`/api/reservations/${id}`);
            toast.success('Reservation deleted successfully');
            handleSearchClear();
        } catch (error) {
            toast.error('Failed to delete reservation');
        } finally {
            setLoadingReservationId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            contact_id: '',
            contact_person_id: '',
            check_in_date: '',
            check_out_date: '',
            car_plate_number: '',
            reservation_number: '',
            id_or_passport_number: '',
            cleared_for_checkin: {
                cleared_by: '',
                cleared_date: '',
                status: ClearanceStatus.PENDING,
                comments: '',
            },
            cleared_for_checkout: {
                cleared_by: '',
                cleared_date: '',
                status: ClearanceStatus.PENDING,
                comments: '',
            },
        });
        setSelectedType('Institution');
        setInstitutionSearchQuery('');
        setContactPersonSearchQuery('');
        setSelectedInstitution(null);
        setEditReservationId(null);
        setActiveTab('general');
        setIsCreating(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const updateFormField = (field: keyof Partial<Reservation>, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const updateClearanceField = (type: 'checkin' | 'checkout', field: keyof ClearanceInfo, value: any) => {
        const currentClearance = formData[`cleared_for_${type}`] as ClearanceInfo;
        const updatedClearance = {
            ...currentClearance,
            [field]: value,
        };
        if (field === 'status' && value === ClearanceStatus.APPROVED) {
            updatedClearance.cleared_by = user?.name || '';
            updatedClearance.cleared_date = currentDateTime;
        }
        setFormData((prev) => ({
            ...prev,
            [`cleared_for_${type}`]: updatedClearance,
        }));
    };

    const institutions = useMemo(() => {
        return contacts?.filter((contact) => contact.type === 'INSTITUTION') as Contact[];
    }, [contacts]);

    const institutionContactPersons = useMemo(() => {
        return selectedInstitution?.contact_persons || [];
    }, [selectedInstitution]);

    const allContactPersons = useMemo(() => {
        return contacts.flatMap((contact) =>
            contact.contact_persons?.map((person) => ({
                ...person,
                institution_name: contact.institution || '',
            })),
        );
    }, [contacts]);

    const handleInstitutionAutocompleteChange = (event: any, newValue: string | Contact | null) => {
        let query = '';
        let selected: Contact | null = null;

        if (typeof newValue === 'string') {
            query = newValue;
            selected = institutions.find((inst) => inst.institution === newValue) || null;
        } else {
            query = newValue?.institution || '';
            selected = newValue;
        }

        setSelectedInstitution(selected);
        setInstitutionSearchQuery(query);
        updateFormField('contact_id', selected?.id || '');
        updateFormField('contact_person_id', '');
        setContactPersonSearchQuery('');
    };

    const handleContactPersonAutocompleteChange = (event: any, newValue: ContactPerson | null) => {
        if (newValue) {
            updateFormField('contact_person_id', newValue.id);
            updateFormField('contact_id', newValue.contact_id);
            setContactPersonSearchQuery(`${newValue.first_name} ${newValue.last_name}`.trim());
        } else {
            updateFormField('contact_person_id', '');
            updateFormField('contact_id', '');
            setContactPersonSearchQuery('');
        }
    };

    const showCheckoutTab = !isCreating && formData.cleared_for_checkin?.status === ClearanceStatus.APPROVED;

    if (!isAuthenticated) {
        return null;
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="min-h-screen">
            <div className="mx-auto rounded-lg bg-white p-4 shadow-md sm:p-6">
                <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                        <FileText size={28} className="text-blue-500" /> Reservations
                    </h2>
                    <div className="flex w-full items-center gap-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search by reservation number, contact, or plate..."
                                className="w-full rounded-lg border border-gray-300 p-3 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                                value={searchQuery}
                                onChange={handleSearch}
                            />
                            <Search size={20} className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
                            {searchQuery && (
                                <button
                                    onClick={handleSearchClear}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                    aria-label="Clear search"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex shrink-0 items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white shadow-lg hover:bg-blue-600"
                        >
                            <Filter size={18} />
                            Filters {isFilterOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <button
                            className="flex shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
                            onClick={() => {
                                resetForm();
                                setIsCreating(true);
                                setShowCreateModal(true);
                            }}
                        >
                            <Plus size={18} /> New Reservation
                        </button>
                    </div>
                </div>

                <motion.div
                    ref={filterRef}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: isFilterOpen ? 'auto' : 0, opacity: isFilterOpen ? 1 : 0 }}
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
                                        <button onClick={() => removeFilter(filter.label)} className="ml-2 text-blue-600 hover:text-blue-800">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Check-in Status</label>
                            <select
                                value={tempFilters.clearedForCheckin || ''}
                                onChange={(e) => handleFilterChange('clearedForCheckin', e.target.value as ClearanceStatus)}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="">All Status</option>
                                <option value={ClearanceStatus.PENDING}>Pending</option>
                                <option value={ClearanceStatus.APPROVED}>Approved</option>
                                <option value={ClearanceStatus.REJECTED}>Rejected</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Check-out Status</label>
                            <select
                                value={tempFilters.clearedForCheckout || ''}
                                onChange={(e) => handleFilterChange('clearedForCheckout', e.target.value as ClearanceStatus)}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="">All Status</option>
                                <option value={ClearanceStatus.PENDING}>Pending</option>
                                <option value={ClearanceStatus.APPROVED}>Approved</option>
                                <option value={ClearanceStatus.REJECTED}>Rejected</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Created By</label>
                            <select
                                value={tempFilters.createdBy || ''}
                                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="">All Users</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contact</label>
                            <Autocomplete
                                options={filterOptions(contacts, tempFilters.contact_id || '', (contact) => contact.institution || '')}
                                value={contacts.find((c) => c.id === tempFilters.contact_id) || null}
                                onChange={(event, newValue) =>
                                    handleFilterChange('contact_id', newValue && typeof newValue !== 'string' ? newValue.id : undefined)
                                }
                                getOptionLabel={(option) => (typeof option === 'string' ? option : option.institution || '')}
                                renderOption={(props, option) => (
                                    <li {...props} key={typeof option === 'string' ? option : option.id}>
                                        {highlightMatch(typeof option === 'string' ? option : option.institution || '', tempFilters.contact_id || '')}
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Search contacts"
                                        variant="outlined"
                                        className="mt-1"
                                        InputProps={{
                                            ...params.InputProps,
                                            className: 'rounded-md p-2',
                                        }}
                                    />
                                )}
                                freeSolo
                                noOptionsText="No contacts found"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date Field</label>
                            <select
                                value={tempFilters.dateFilter?.field || ''}
                                onChange={(e) =>
                                    handleFilterChange('dateFilter', {
                                        ...tempFilters.dateFilter,
                                        field: e.target.value as 'created_at' | 'check_in_date' | 'check_out_date',
                                    })
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                <option value="">Select Date Field</option>
                                <option value="created_at">Created At</option>
                                <option value="check_in_date">Check-in Date</option>
                                <option value="check_out_date">Check-out Date</option>
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
                            <div className="col-span-2">
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
                                        className="mt-1 block flex-1 rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                                        className="mt-1 block flex-1 rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="mt-4 flex justify-end gap-4">
                        <button onClick={clearFilters} className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300">
                            Clear Filters
                        </button>
                        <button onClick={addFilters} className="rounded-md bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700">
                            Add Filters
                        </button>
                    </div>
                </motion.div>

                <div className="mb-4 text-sm text-gray-600">{totalCount > 0 && <span>Found {totalCount} reservations</span>}</div>

                {(showCreateModal || showEditModal) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
                        >
                            <h3 className="mb-6 text-xl font-semibold text-gray-800">
                                {showCreateModal ? 'Create New Reservation' : 'Edit Reservation'}
                            </h3>
                            <div className="mb-6">
                                <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                                    <button
                                        onClick={() => setActiveTab('general')}
                                        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                            activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        General
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('checkin')}
                                        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                            activeTab === 'checkin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Check-in Clearance
                                    </button>
                                    {showCheckoutTab && (
                                        <button
                                            onClick={() => setActiveTab('checkout')}
                                            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                                activeTab === 'checkout' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            Check-out Clearance
                                        </button>
                                    )}
                                </div>
                            </div>

                            {activeTab === 'general' && (
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                        <div className="mb-4 flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-600" />
                                            <h3 className="text-base font-semibold text-gray-800">Contact Type</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`rounded-xl border-2 p-4 text-sm transition-all duration-200 ${
                                                    selectedType === 'Institution'
                                                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                                                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                                                }`}
                                                onClick={() => {
                                                    setSelectedType('Institution');
                                                    updateFormField('contact_id', '');
                                                    updateFormField('contact_person_id', '');
                                                    setSelectedInstitution(null);
                                                    setInstitutionSearchQuery('');
                                                    setContactPersonSearchQuery('');
                                                }}
                                            >
                                                <Building className="mx-auto mb-2 h-5 w-5" />
                                                <span className="font-medium">Institution</span>
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`rounded-xl border-2 p-4 text-sm transition-all duration-200 ${
                                                    selectedType === 'Individual'
                                                        ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                                                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                                                }`}
                                                onClick={() => {
                                                    setSelectedType('Individual');
                                                    updateFormField('contact_id', '');
                                                    updateFormField('contact_person_id', '');
                                                    setSelectedInstitution(null);
                                                    setInstitutionSearchQuery('');
                                                    setContactPersonSearchQuery('');
                                                }}
                                            >
                                                <Users className="mx-auto mb-2 h-5 w-5" />
                                                <span className="font-medium">Individual</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                    {selectedType === 'Institution' && (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Institution Name</label>
                                            <Autocomplete
                                                options={filterOptions(institutions, institutionSearchQuery, (inst) => inst.institution || '')}
                                                value={selectedInstitution}
                                                inputValue={institutionSearchQuery}
                                                onInputChange={(event, newInputValue) => {
                                                    setInstitutionSearchQuery(newInputValue);
                                                }}
                                                onChange={handleInstitutionAutocompleteChange}
                                                getOptionLabel={(option) => (typeof option === 'string' ? option : option?.institution || '')}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.id}>
                                                        {highlightMatch(option.institution || '', institutionSearchQuery)}
                                                    </li>
                                                )}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        variant="outlined"
                                                        placeholder="Type at least 3 characters to search institutions"
                                                        className="w-full"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            className: 'rounded-lg text-sm',
                                                        }}
                                                    />
                                                )}
                                                freeSolo
                                                noOptionsText={
                                                    institutionSearchQuery.length < 3 ? 'Type at least 3 characters' : 'No institutions found'
                                                }
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">
                                            Contact Person
                                            {selectedType === 'Institution' && selectedInstitution && (
                                                <span className="ml-2 text-xs text-gray-500">({institutionContactPersons.length} available)</span>
                                            )}
                                        </label>
                                        {selectedType === 'Institution' ? (
                                            <Autocomplete
                                                key={`institution-${selectedInstitution?.id || 'none'}`}
                                                options={institutionContactPersons}
                                                value={institutionContactPersons.find((p) => p.id === formData.contact_person_id) || null}
                                                inputValue={contactPersonSearchQuery}
                                                onInputChange={(event, newInputValue) => {
                                                    setContactPersonSearchQuery(newInputValue);
                                                }}
                                                onChange={handleContactPersonAutocompleteChange}
                                                disabled={!selectedInstitution}
                                                getOptionLabel={(option) => `${option.first_name} ${option.last_name}`.trim()}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.id}>
                                                        <div>
                                                            <div className="font-medium">{`${option.first_name} ${option.last_name}`.trim()}</div>
                                                            {option.email && <div className="text-sm text-gray-500">{option.email}</div>}
                                                        </div>
                                                    </li>
                                                )}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        variant="outlined"
                                                        placeholder={
                                                            !selectedInstitution
                                                                ? 'Select an institution first'
                                                                : institutionContactPersons.length === 0
                                                                  ? 'No contact persons available for this institution'
                                                                  : 'Select a contact person'
                                                        }
                                                        className="w-full"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            className: 'rounded-lg text-sm',
                                                        }}
                                                    />
                                                )}
                                                noOptionsText={
                                                    !selectedInstitution
                                                        ? 'Select an institution first'
                                                        : institutionContactPersons.length === 0
                                                          ? 'No contact persons found for this institution'
                                                          : 'No matches found'
                                                }
                                            />
                                        ) : (
                                            <Autocomplete
                                                options={filterOptions(
                                                    allContactPersons,
                                                    contactPersonSearchQuery,
                                                    (person) => `${person.first_name} ${person.last_name}`,
                                                )}
                                                value={allContactPersons.find((p) => p.id === formData.contact_person_id) || null}
                                                inputValue={contactPersonSearchQuery}
                                                onInputChange={(event, newInputValue) => {
                                                    setContactPersonSearchQuery(newInputValue);
                                                }}
                                                onChange={handleContactPersonAutocompleteChange}
                                                getOptionLabel={(option) => `${option.first_name} ${option.last_name}`.trim()}
                                                renderOption={(props, option) => (
                                                    <li {...props} key={option.id}>
                                                        <div>
                                                            <div className="font-medium">
                                                                {highlightMatch(
                                                                    `${option.first_name} ${option.last_name}`.trim(),
                                                                    contactPersonSearchQuery,
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {option.institution_name && `${option.institution_name} • `}
                                                                {option.email}
                                                            </div>
                                                        </div>
                                                    </li>
                                                )}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        variant="outlined"
                                                        placeholder="Type at least 3 characters to search contact persons"
                                                        className="w-full"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            className: 'rounded-lg text-sm',
                                                        }}
                                                    />
                                                )}
                                                noOptionsText={
                                                    contactPersonSearchQuery.length < 3 ? 'Type at least 3 characters' : 'No contact persons found'
                                                }
                                            />
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">Reservation Number *</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                value={formData.reservation_number || ''}
                                                onChange={(e) => updateFormField('reservation_number', e.target.value)}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">Car Plate Number</label>
                                            <div className="relative">
                                                <Car size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    className="w-full rounded-lg border border-gray-300 p-2 pl-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                    value={formData.car_plate_number || ''}
                                                    onChange={(e) => updateFormField('car_plate_number', e.target.value)}
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">Check-in Date *</label>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="date"
                                                    className="w-full rounded-lg border border-gray-300 p-2 pl-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                    value={formData.check_in_date || ''}
                                                    onChange={(e) => updateFormField('check_in_date', e.target.value)}
                                                    disabled={isSubmitting}
                                                    min={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">Check-out Date *</label>
                                            <div className="relative">
                                                <Calendar size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="date"
                                                    className="w-full rounded-lg border border-gray-300 p-2 pl-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                    value={formData.check_out_date || ''}
                                                    onChange={(e) => updateFormField('check_out_date', e.target.value)}
                                                    disabled={isSubmitting}
                                                    min={formData.check_in_date || new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">ID/Passport Number</label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                value={formData.id_or_passport_number || ''}
                                                onChange={(e) => updateFormField('id_or_passport_number', e.target.value)}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">ID/Passport Photo</label>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                                disabled={isSubmitting}
                                            />
                                            {formData.id_or_passport_photo && typeof formData.id_or_passport_photo === 'string' && (
                                                <img
                                                    src={formData.id_or_passport_photo}
                                                    alt="Preview"
                                                    className="mt-2 h-20 w-20 rounded object-cover"
                                                />
                                            )}
                                            {formData.id_or_passport_photo instanceof File && (
                                                <span className="mt-2 block text-sm text-green-600">New file selected</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'checkin' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                                        <div className="mt-2 flex items-center space-x-4">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="checkin-status"
                                                    value={ClearanceStatus.PENDING}
                                                    checked={formData.cleared_for_checkin?.status === ClearanceStatus.PENDING}
                                                    onChange={() => updateClearanceField('checkin', 'status', ClearanceStatus.PENDING)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                    disabled={isSubmitting}
                                                />
                                                <span className="text-sm font-medium text-gray-700">Pending</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="checkin-status"
                                                    value={ClearanceStatus.APPROVED}
                                                    checked={formData.cleared_for_checkin?.status === ClearanceStatus.APPROVED}
                                                    onChange={() => updateClearanceField('checkin', 'status', ClearanceStatus.APPROVED)}
                                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                                    disabled={isSubmitting}
                                                />
                                                <span className="text-sm font-medium text-gray-700">Approved</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="checkin-status"
                                                    value={ClearanceStatus.REJECTED}
                                                    checked={formData.cleared_for_checkin?.status === ClearanceStatus.REJECTED}
                                                    onChange={() => updateClearanceField('checkin', 'status', ClearanceStatus.REJECTED)}
                                                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                                                    disabled={isSubmitting}
                                                />
                                                <span className="text-sm font-medium text-gray-700">Rejected</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Cleared By</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-gray-300 p-2"
                                            value={formData.cleared_for_checkin?.cleared_by || ''}
                                            onChange={(e) => updateClearanceField('checkin', 'cleared_by', e.target.value)}
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Cleared Date</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-gray-300 p-2"
                                            value={
                                                formData.cleared_for_checkin?.cleared_date
                                                    ? formatTimestampToDate(formData.cleared_for_checkin?.cleared_date?.toString() || '')
                                                    : ''
                                            }
                                            onChange={(e) => updateClearanceField('checkin', 'cleared_date', e.target.value)}
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Comments</label>
                                        <textarea
                                            className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                            rows={3}
                                            value={formData.cleared_for_checkin?.comments || ''}
                                            onChange={(e) => updateClearanceField('checkin', 'comments', e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            )}
                            {activeTab === 'checkout' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                                        <div className="mt-2 flex items-center space-x-4">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="checkout-status"
                                                    value={ClearanceStatus.PENDING}
                                                    checked={formData.cleared_for_checkout?.status === ClearanceStatus.PENDING}
                                                    onChange={() => updateClearanceField('checkout', 'status', ClearanceStatus.PENDING)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                    disabled={isSubmitting}
                                                />
                                                <span className="text-sm font-medium text-gray-700">Pending</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="checkout-status"
                                                    value={ClearanceStatus.APPROVED}
                                                    checked={formData.cleared_for_checkout?.status === ClearanceStatus.APPROVED}
                                                    onChange={() => updateClearanceField('checkout', 'status', ClearanceStatus.APPROVED)}
                                                    className="h-4 w-4 text-green-600 focus:ring-green-500"
                                                    disabled={isSubmitting}
                                                />
                                                <span className="text-sm font-medium text-gray-700">Approved</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    name="checkout-status"
                                                    value={ClearanceStatus.REJECTED}
                                                    checked={formData.cleared_for_checkout?.status === ClearanceStatus.REJECTED}
                                                    onChange={() => updateClearanceField('checkout', 'status', ClearanceStatus.REJECTED)}
                                                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                                                    disabled={isSubmitting}
                                                />
                                                <span className="text-sm font-medium text-gray-700">Rejected</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Cleared By</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-gray-300 p-2"
                                            value={formData.cleared_for_checkout?.cleared_by || ''}
                                            onChange={(e) => updateClearanceField('checkout', 'cleared_by', e.target.value)}
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Cleared Date</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border border-gray-300 p-2"
                                            value={
                                                formData.cleared_for_checkout?.cleared_date
                                                    ? formatTimestampToDate(formData.cleared_for_checkout?.cleared_date?.toString() || '')
                                                    : ''
                                            }
                                            onChange={(e) => updateClearanceField('checkout', 'cleared_date', e.target.value)}
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Comments</label>
                                        <textarea
                                            className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                            rows={3}
                                            value={formData.cleared_for_checkout?.comments || ''}
                                            onChange={(e) => updateClearanceField('checkout', 'comments', e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="mt-6 flex gap-4">
                                <button
                                    className="flex-1 rounded-lg bg-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={showCreateModal ? handleCreate : handleUpdate}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center">
                                            <svg
                                                className="mr-2 h-5 w-5 animate-spin text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            {showCreateModal ? 'Creating...' : 'Updating...'}
                                        </span>
                                    ) : showCreateModal ? (
                                        'Create Reservation'
                                    ) : (
                                        'Update Reservation'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showViewModal && viewedReservation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white p-0 shadow-2xl"
                        >
                            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                                        <FileText size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">Reservation Details</h3>
                                        <p className="text-blue-100">#{viewedReservation.reservation_number}</p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        setShowViewModal(false);
                                        setViewedReservation(null);
                                    }}
                                    className="rounded-full bg-white/20 p-2 text-white transition-all hover:bg-white/30"
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            <div className="max-h-[calc(95vh-120px)] overflow-y-auto p-8">
                                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                                    <div className="space-y-6">
                                        <div className="space-y-6">
                                            <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
                                                <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                                    <Users size={20} className="text-blue-600" />
                                                    Contact Information
                                                </h4>
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                                            <Building size={16} className="text-blue-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-500">Organization</p>
                                                            <p className="text-lg font-semibold text-gray-900">{getContactName(viewedReservation)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                                                            <User size={16} className="text-green-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-500">Contact Person</p>
                                                            <p className="text-lg font-semibold text-gray-900">
                                                                {getContactPersonName(viewedReservation)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                                                    <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                                        <Car size={20} className="text-gray-600" />
                                                        Vehicle Details
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between">
                                                            <span className="text-sm font-medium text-gray-500">Plate Number</span>
                                                            <span className="text-lg font-semibold text-gray-900">
                                                                {viewedReservation.car_plate_number || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-sm font-medium text-gray-500">ID/Passport</span>
                                                            <span className="text-lg font-semibold text-gray-900">
                                                                {viewedReservation.id_or_passport_number || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {viewedReservation.id_or_passport_photo && typeof viewedReservation.id_or_passport_photo === 'string' && (
                                            <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                                                <img
                                                    src={viewedReservation.id_or_passport_photo}
                                                    alt="ID/Passport"
                                                    className="max-h-80 w-full rounded-lg object-contain"
                                                />
                                                <p className="mt-2 text-center text-sm text-gray-500">ID/Passport Document</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
                                            <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                                <Calendar size={20} className="text-emerald-600" />
                                                Stay Duration
                                            </h4>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="text-center">
                                                    <p className="text-3xl font-bold text-emerald-600">
                                                        {formatMySQLDate(viewedReservation.check_in_date)}
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium text-gray-500">Check-in</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-3xl font-bold text-emerald-600">
                                                        {formatMySQLDate(viewedReservation.check_out_date)}
                                                    </p>
                                                    <p className="mt-1 text-sm font-medium text-gray-500">Check-out</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                                <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                                    <Hash size={20} className="text-blue-600" />
                                                    Reservation Info
                                                </h4>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm font-medium text-gray-500">Reservation #</span>
                                                        <span className="text-lg font-semibold text-gray-900">
                                                            {viewedReservation.reservation_number}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-sm font-medium text-gray-500">Created By</span>
                                                        <span className="text-lg font-semibold text-gray-900">
                                                            {viewedReservation.created_by?.name || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-400">
                                                        <span>Created</span>
                                                        <span>{formatMySQLDate(viewedReservation.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="rounded-xl border bg-white p-6 shadow-sm">
                                                <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                                    <ArrowDown size={20} className="text-green-600" />
                                                    Check-in Status
                                                </h4>
                                                <div className="space-y-3">
                                                    {getStatusBadge(viewedReservation.cleared_for_checkin)}
                                                    {viewedReservation.cleared_for_checkin?.cleared_by && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Cleared By</span>
                                                            <span className="font-medium text-gray-900">
                                                                {viewedReservation.cleared_for_checkin.cleared_by}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {viewedReservation.cleared_for_checkin?.cleared_date && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Cleared Date</span>
                                                            <span className="font-medium text-gray-900">
                                                                {formatMySQLDate(viewedReservation.cleared_for_checkin.cleared_date)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border bg-white p-6 shadow-sm">
                                                <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                                    <ArrowUp size={20} className="text-red-600" />
                                                    Check-out Status
                                                </h4>
                                                <div className="space-y-3">
                                                    {getStatusBadge(viewedReservation.cleared_for_checkout)}
                                                    {viewedReservation.cleared_for_checkout?.cleared_by && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Cleared By</span>
                                                            <span className="font-medium text-gray-900">
                                                                {viewedReservation.cleared_for_checkout.cleared_by}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {viewedReservation.cleared_for_checkout?.cleared_date && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Cleared Date</span>
                                                            <span className="font-medium text-gray-900">
                                                                {formatMySQLDate(viewedReservation.cleared_for_checkout.cleared_date)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {(viewedReservation.cleared_for_checkin?.comments || viewedReservation.cleared_for_checkout?.comments) && (
                                    <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        {viewedReservation.cleared_for_checkin?.comments && (
                                            <div className="rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 p-6">
                                                <h4 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                                    <FileText size={18} className="text-yellow-600" />
                                                    Check-in Comments
                                                </h4>
                                                <p className="text-sm leading-relaxed text-gray-700">
                                                    {viewedReservation.cleared_for_checkin.comments}
                                                </p>
                                            </div>
                                        )}
                                        {viewedReservation.cleared_for_checkout?.comments && (
                                            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
                                                <h4 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
                                                    <FileText size={18} className="text-purple-600" />
                                                    Check-out Comments
                                                </h4>
                                                <p className="text-sm leading-relaxed text-gray-700">
                                                    {viewedReservation.cleared_for_checkout.comments}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {isLoading && page === 0 ? (
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
                        {filteredReservations.length === 0 && !isLoading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                                <p className="text-gray-500">No reservations found</p>
                            </motion.div>
                        )}
                        {filteredReservations.length > 0 && (
                            <>
                                <div className="hidden overflow-x-auto rounded-lg shadow-md md:block">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th
                                                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                                    onClick={() => handleSort('reservation_number')}
                                                >
                                                    <div className="flex items-center">
                                                        Reservation #{' '}
                                                        {sortField === 'reservation_number' &&
                                                            (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                                    </div>
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Contact
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Person
                                                </th>
                                                <th
                                                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                                    onClick={() => handleSort('check_in_date')}
                                                >
                                                    <div className="flex items-center">
                                                        Check-in{' '}
                                                        {sortField === 'check_in_date' &&
                                                            (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                                    </div>
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Plate
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Check-in Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Check-out Status
                                                </th>
                                                <th
                                                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                                                    onClick={() => handleSort('created_at')}
                                                >
                                                    <div className="flex items-center">
                                                        Created{' '}
                                                        {sortField === 'created_at' &&
                                                            (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                                    </div>
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {sortedReservations.map((reservation, index) => (
                                                <tr
                                                    key={reservation.id}
                                                    className="hover:bg-gray-50"
                                                    ref={index === sortedReservations.length - 1 ? lastReservationElementRef : null}
                                                >
                                                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                                                        <Hash size={16} className="mr-1 inline" />
                                                        {reservation.reservation_number || 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">{getContactName(reservation)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">{getContactPersonName(reservation)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {reservation.check_in_date ? formatMySQLDate(reservation.check_in_date) : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">{reservation.car_plate_number || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm">{getStatusBadge(reservation.cleared_for_checkin)}</td>
                                                    <td className="px-6 py-4 text-sm">{getStatusBadge(reservation.cleared_for_checkout)}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">{formatMySQLDate(reservation.created_at)}</td>
                                                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                                        <div className="flex gap-2">
                                                            <button
                                                                className="rounded-lg bg-green-100 px-2 py-1 text-green-700 transition-colors hover:bg-green-200"
                                                                onClick={() => handleView(reservation)}
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                            <button
                                                                className="rounded-lg bg-blue-100 px-2 py-1 text-blue-700 transition-colors hover:bg-blue-200"
                                                                onClick={() => handleEdit(reservation)}
                                                            >
                                                                <Edit size={14} />
                                                            </button>
                                                            <button
                                                                className="rounded-lg bg-red-100 px-2 py-1 text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
                                                                onClick={() => handleDelete(reservation.id)}
                                                                disabled={loadingReservationId === reservation.id}
                                                            >
                                                                {loadingReservationId === reservation.id ? (
                                                                    <span className="flex items-center">
                                                                        <svg
                                                                            className="mr-1 h-3 w-3 animate-spin"
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
                                                                        Deleting
                                                                    </span>
                                                                ) : (
                                                                    <Trash2 size={14} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {isLoading && page > 0 && (
                                    <div className="flex min-h-[100px] items-center justify-center">
                                        <motion.div
                                            className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                                            initial={{ rotate: 0 }}
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                        />
                                    </div>
                                )}

                                {!hasMore && sortedReservations.length > 0 && (
                                    <div className="py-6 text-center text-gray-500">No more reservations to load</div>
                                )}

                                <div className="space-y-4 md:hidden">
                                    {sortedReservations.map((reservation, index) => (
                                        <motion.div
                                            key={reservation.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                                            ref={index === sortedReservations.length - 1 ? lastReservationElementRef : null}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="mb-1 flex items-center gap-2">
                                                        <Hash size={18} className="text-blue-500" />
                                                        <h3 className="font-semibold text-gray-900">{reservation.reservation_number || 'N/A'}</h3>
                                                    </div>
                                                    <p className="mb-1 text-sm text-gray-600">{getContactName(reservation)}</p>
                                                    <p className="mb-2 text-sm text-gray-600">{getContactPersonName(reservation)}</p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {reservation.check_in_date ? formatMySQLDate(reservation.check_in_date) : 'N/A'}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Car size={12} />
                                                            {reservation.car_plate_number || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 flex gap-2">
                                                        <div>{getStatusBadge(reservation.cleared_for_checkin)}</div>
                                                        <div>{getStatusBadge(reservation.cleared_for_checkout)}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setExpandedReservation(expandedReservation === reservation.id ? null : reservation.id)
                                                    }
                                                    className="ml-4 text-gray-400 hover:text-gray-600"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>
                                            </div>
                                            {expandedReservation === reservation.id && (
                                                <div className="mt-4 border-t border-gray-200 pt-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="rounded-lg bg-green-100 px-3 py-1 text-sm text-green-700 hover:bg-green-200"
                                                            onClick={() => handleView(reservation)}
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            className="rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                                                            onClick={() => handleEdit(reservation)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="rounded-lg bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200 disabled:opacity-50"
                                                            onClick={() => handleDelete(reservation.id)}
                                                            disabled={loadingReservationId === reservation.id}
                                                        >
                                                            {loadingReservationId === reservation.id ? 'Deleting...' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );
}
