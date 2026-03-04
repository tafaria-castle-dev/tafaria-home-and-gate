import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import { ArrowDown, ArrowUp, Edit, MoreVertical, Plus, Search, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { formatMySQLDate } from '../utils/formatMYSQLDate';
import ViewContactOpportunities from './opportunities/ViewContactOpportunities';
import { formatTimestampToDate } from './opportunities/ViewOpportunities';
enum ContactType {
    INDIVIDUAL = 'INDIVIDUAL',
    INSTITUTION = 'INSTITUTION',
}
interface ContactPerson {
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    contactClerk: string;
    title: string;
}
interface Opportunity {
    id: string;
    last_update?: { updated_at: string };
}
interface Contact {
    id: string;
    type: ContactType;
    institution?: string;
    mobile?: string;
    contactPersons: ContactPerson[];
    opportunities: Opportunity[];
    created_at: string;
}
interface User {
    id: string;
    name: string;
    email: string;
}
export default function ContactManagement() {
    const { isAuthenticated, logout, user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
    const [showOpportunitiesModal, setShowOpportunitiesModal] = useState(false);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [selectedContactName, setSelectedContactName] = useState<string | null>(null);
    const [sortField, setSortField] = useState<keyof Contact>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [loadingContactId, setLoadingContactId] = useState<string | null>(null);
    const [expandedContact, setExpandedContact] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState<{
        type: ContactType;
        institution: string;
        mobile: string;
        contactPersons: ContactPerson[];
    }>({
        type: ContactType.INSTITUTION,
        institution: '',
        mobile: '',
        contactPersons: [
            {
                id: '',
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                contactClerk: '',
                title: '',
            },
        ],
    });
    const [editContactId, setEditContactId] = useState<string | null>(null);
    const [originalContactPersons, setOriginalContactPersons] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState<number>(0);
    const observer = useRef<IntersectionObserver | null>(null);
    const fetchContacts = useCallback(async () => {
        if (!hasMore || isLoading) return;
        setIsLoading(true);
        try {
            const response = await axios.get('/api/contacts', {
                params: {
                    searchQuery: debouncedSearchQuery,
                    page,
                    limit: 100,
                },
                paramsSerializer: (params) => {
                    const searchParams = new URLSearchParams();
                    for (const [key, value] of Object.entries(params)) {
                        if (value !== undefined && value !== null) {
                            searchParams.append(key, value.toString());
                        }
                    }
                    return searchParams.toString();
                },
            });
            const newContacts = response.data.results.map((contact: any) => ({
                ...contact,
                created_at: contact.created_at,
                contactPersons:
                    contact.contact_persons?.map((person: any) => ({
                        ...person,
                        first_name: person.first_name || '',
                        last_name: person.last_name || '',
                    })) || [],
                contact_persons: undefined,
            }));
            setFilteredContacts((prev) => {
                const existingIds = new Set(prev.map((contact) => contact.id));
                return [...prev, ...newContacts.filter((contact: Contact) => !existingIds.has(contact.id))];
            });
            setTotalCount(response.data.totalCount || 0);
            setHasMore(response.data.hasMore);
        } catch (error) {
            toast.error('Failed to fetch contacts');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearchQuery, page, hasMore]);
    const debouncedSearch = useCallback(
        debounce((value: string) => {
            setDebouncedSearchQuery(value);
            setPage(0);
            setFilteredContacts([]);
            setTotalCount(0);
            setHasMore(true);
        }, 500),
        [],
    );
    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchContacts();
        }
    }, [isAuthenticated, fetchContacts, debouncedSearchQuery]);
    const lastContactElementRef = useCallback(
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
        setFilteredContacts([]);
        setTotalCount(0);
        setHasMore(true);
    }, []);
    const handleSort = (field: keyof Contact) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };
    const sortedContacts = filteredContacts?.slice().sort((a, b) => {
        let valueA: any, valueB: any;
        switch (sortField) {
            case 'institution':
                valueA = a.institution ?? '';
                valueB = b.institution ?? '';
                return sortDirection === 'desc' ? valueB.localeCompare(valueA) : valueA.localeCompare(valueB);
            case 'created_at':
                valueA = new Date(a.created_at).getTime();
                valueB = new Date(b.created_at).getTime();
                return sortDirection === 'desc' ? valueB - valueA : valueA - valueB;
            default:
                return 0;
        }
    });
    const checkDuplicateContact = () => {
        if (formData.type === ContactType.INSTITUTION) {
            return filteredContacts?.some(
                (contact) => contact.type === ContactType.INSTITUTION && contact.institution?.toLowerCase() === formData.institution.toLowerCase(),
            );
        } else {
            return formData.contactPersons.some((person) =>
                filteredContacts?.some(
                    (contact) =>
                        contact.type === ContactType.INDIVIDUAL &&
                        contact.contactPersons.some((p) => (person.email && p.email === person.email) || (person.phone && p.phone === person.phone)),
                ),
            );
        }
    };
    const handleCreate = async () => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }
        if (formData.type === ContactType.INSTITUTION && !formData.institution.trim()) {
            toast.error('Institution name is required');
            return;
        }
        const hasValidContactPerson = formData.contactPersons.some(
            (person) => person.first_name.trim() || person.last_name.trim() || person.email.trim() || person.phone.trim(),
        );
        if (!hasValidContactPerson) {
            toast.error('At least one contact person with valid information is required');
            return;
        }
        if (checkDuplicateContact()) {
            toast.error(
                formData.type === ContactType.INSTITUTION ? 'Institution already exists' : 'A contact with this email or phone already exists',
            );
            return;
        }
        setIsSubmitting(true);
        const data = {
            type: formData.type,
            institution: formData.type === ContactType.INSTITUTION ? formData.institution : null,
            mobile: formData.type === ContactType.INSTITUTION ? formData.mobile : null,
            contactPersons: formData.contactPersons
                .filter((person) => person.first_name.trim() || person.last_name.trim() || person.email.trim() || person.phone.trim())
                .map((person) => ({
                    first_name: person.first_name,
                    last_name: person.last_name,
                    email: person.email,
                    phone: person.phone,
                    title: person.title,
                    contactClerk: user.name || '',
                })),
        };
        try {
            await axios.post('/api/contacts', data);
            toast.success('Contact created successfully');
            setShowCreateModal(false);
            resetForm();
            handleSearchClear();
            fetchContacts();
        } catch (error) {
            toast.error('Failed to create contact');
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleEdit = (contact: Contact) => {
        setEditContactId(contact.id);
        setOriginalContactPersons(contact.contactPersons.map((person) => person.id || ''));
        setFormData({
            type: contact.type,
            institution: contact.institution || '',
            mobile: contact.mobile || '',
            contactPersons: contact.contactPersons.map((person) => ({
                id: person.id || '',
                first_name: person.first_name || '',
                last_name: person.last_name || '',
                email: person.email || '',
                phone: person.phone || '',
                contactClerk: person.contactClerk || '',
                title: person.title || '',
            })),
        });
        setShowEditModal(true);
    };
    const handleUpdate = async () => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }
        if (formData.type === ContactType.INSTITUTION && !formData.institution.trim()) {
            toast.error('Institution name is required');
            return;
        }
        const hasValidContactPerson = formData.contactPersons.some(
            (person) => person.first_name.trim() || person.last_name.trim() || person.email.trim() || person.phone.trim(),
        );
        if (!hasValidContactPerson) {
            toast.error('At least one contact person with valid information is required');
            return;
        }
        setIsSubmitting(true);
        const currentContactPersonIds = formData.contactPersons.map((person) => person.id).filter((id) => id);
        const contactPersonsToDelete = originalContactPersons.filter((id) => !currentContactPersonIds.includes(id));
        const data = {
            type: formData.type,
            institution: formData.type === ContactType.INSTITUTION ? formData.institution : null,
            mobile: formData.type === ContactType.INSTITUTION ? formData.mobile : '',
            contactPersons: formData.contactPersons
                .filter(
                    (person) =>
                        person.first_name.trim() || person.last_name.trim() || person.email.trim() || person.phone.trim() || person.title.trim(),
                )
                .map((person) => ({
                    id: person.id || undefined,
                    first_name: person.first_name,
                    last_name: person.last_name,
                    email: person.email,
                    phone: person.phone,
                    title: person.title,
                    contactClerk: user.name || '',
                })),
            contactPersonsToDelete: contactPersonsToDelete.length > 0 ? contactPersonsToDelete : undefined,
        };
        try {
            await axios.put(`/api/contacts/${editContactId}`, data);
            toast.success('Contact updated successfully');
            setShowEditModal(false);
            resetForm();
            handleSearchClear();
            fetchContacts();
        } catch (error) {
            toast.error('Failed to update contact');
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleDelete = async (id: string) => {
        if (!isAuthenticated || !user) {
            toast.error('You must be logged in');
            return;
        }
        setLoadingContactId(id);
        try {
            await axios.delete(`/api/contacts/${id}`);
            toast.success('Contact deleted successfully');
            handleSearchClear();
            fetchContacts();
        } catch (error) {
            toast.error('Failed to delete contact');
        } finally {
            setLoadingContactId(null);
        }
    };
    const addContactPerson = () => {
        setFormData({
            ...formData,
            contactPersons: [
                ...formData.contactPersons,
                {
                    id: '',
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    contactClerk: '',
                    title: '',
                },
            ],
        });
    };
    const deleteContactPerson = (index: number) => {
        if (formData.contactPersons.length === 1) {
            toast.error('At least one contact person is required');
            return;
        }
        setFormData({
            ...formData,
            contactPersons: formData.contactPersons.filter((_, i) => i !== index),
        });
        toast.success('Contact person removed');
    };
    const resetForm = () => {
        setFormData({
            type: ContactType.INSTITUTION,
            institution: '',
            mobile: '',
            contactPersons: [
                {
                    id: '',
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    contactClerk: '',
                    title: '',
                },
            ],
        });
        setEditContactId(null);
        setOriginalContactPersons([]);
    };
    const formatContactPerson = (person: ContactPerson) => {
        const parts: string[] = [];
        if (person.first_name || person.last_name) {
            parts.push(`${person.first_name || ''} ${person.last_name || ''}`.trim());
        }
        if (person.email) parts.push(person.email);
        if (person.phone) parts.push(person.phone);
        return parts.join(' | ');
    };
    const handleViewOpportunities = (contact_id: string, contactName: string) => {
        setSelectedContactId(contact_id);
        setSelectedContactName(contactName);
        setShowOpportunitiesModal(true);
    };
    if (!isAuthenticated) {
        return null;
    }
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg bg-white p-4 shadow-md sm:p-6"
        >
            <div className="mb-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">Contacts 📇</h2>
                <div className="flex w-full items-center gap-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search by institution or contact person..."
                            className="w-full rounded-lg border p-2 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                        <Search size={20} className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
                        {searchQuery && (
                            <button
                                onClick={handleSearchClear}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                                aria-label="Clear search"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                    <button
                        className="flex shrink-0 items-center gap-2 rounded bg-blue-500 px-3 py-2 text-white"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={16} /> Add Contact
                    </button>
                </div>
            </div>
            <div className="mb-4 text-sm text-gray-600">
                {isLoading && page === 0 ? <span></span> : <span>Found {totalCount} matching contacts</span>}
            </div>
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">Create New Contact</h3>
                        <select
                            className="mb-4 w-full rounded border p-2"
                            value={formData.type}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    type: e.target.value as ContactType,
                                    institution: e.target.value === ContactType.INSTITUTION ? '' : formData.institution,
                                    contactPersons:
                                        e.target.value === ContactType.INDIVIDUAL ? [formData.contactPersons[0]] : formData.contactPersons,
                                })
                            }
                            disabled={isSubmitting}
                        >
                            <option value={ContactType.INSTITUTION}>Corporate</option>
                            <option value={ContactType.INDIVIDUAL}>Individual</option>
                        </select>
                        {formData.type === ContactType.INSTITUTION && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Institution Name"
                                    className="mb-4 w-full rounded border p-2"
                                    value={formData.institution}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            institution: e.target.value,
                                        })
                                    }
                                    disabled={isSubmitting}
                                />
                                <input
                                    type="tel"
                                    placeholder="Mobile"
                                    className="mb-6 w-full rounded border p-2"
                                    value={formData.mobile}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            mobile: e.target.value,
                                        })
                                    }
                                    disabled={isSubmitting}
                                />
                            </>
                        )}
                        {formData.contactPersons.map((person, index) => (
                            <div key={index} className="relative mb-4 rounded border p-4">
                                <h4 className="mb-2 font-medium">Contact Person {index + 1}</h4>
                                {formData.contactPersons.length > 1 && (
                                    <button
                                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                        onClick={() => deleteContactPerson(index)}
                                        disabled={isSubmitting}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        className="rounded border p-2"
                                        value={person.first_name}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].first_name = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        className="rounded border p-2"
                                        value={person.last_name}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].last_name = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Title"
                                        className="rounded border p-2"
                                        value={person.title}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].title = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        className="rounded border p-2"
                                        value={person.email}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].email = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Phone"
                                        className="mb-4 rounded border p-2"
                                        value={person.phone}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].phone = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        ))}
                        {formData.type === ContactType.INSTITUTION && (
                            <button
                                className="mb-4 w-full rounded bg-blue-200 p-2 transition-colors hover:bg-blue-300 disabled:cursor-not-allowed disabled:bg-gray-200"
                                onClick={addContactPerson}
                                disabled={isSubmitting}
                            >
                                Add Another Contact Person
                            </button>
                        )}
                        <div className="flex gap-4">
                            <button
                                className="flex-1 rounded bg-gray-300 p-2 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 rounded bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
                                onClick={handleCreate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                                        <svg
                                            className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
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
                                        Creating...
                                    </span>
                                ) : (
                                    'Create'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6">
                        <h3 className="mb-4 text-lg font-semibold">Edit Contact</h3>
                        <select
                            className="mb-4 w-full rounded border p-2"
                            value={formData.type}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    type: e.target.value as ContactType,
                                    institution: e.target.value === ContactType.INSTITUTION ? formData.institution : '',
                                    contactPersons:
                                        e.target.value === ContactType.INDIVIDUAL ? [formData.contactPersons[0]] : formData.contactPersons,
                                })
                            }
                            disabled={isSubmitting}
                        >
                            <option value={ContactType.INSTITUTION}>Corporate</option>
                            <option value={ContactType.INDIVIDUAL}>Individual</option>
                        </select>
                        {formData.type === ContactType.INSTITUTION && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Institution Name"
                                    className="mb-4 w-full rounded border p-2"
                                    value={formData.institution}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            institution: e.target.value,
                                        })
                                    }
                                    disabled={isSubmitting}
                                />
                                <input
                                    type="tel"
                                    placeholder="Mobile"
                                    className="mb-6 w-full rounded border p-2"
                                    value={formData.mobile}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            mobile: e.target.value,
                                        })
                                    }
                                    disabled={isSubmitting}
                                />
                            </>
                        )}
                        {formData.contactPersons.map((person, index) => (
                            <div key={index} className="relative mb-4 rounded border p-4">
                                <h4 className="mb-2 font-medium">Contact Person {index + 1}</h4>
                                {formData.contactPersons.length > 1 && (
                                    <button
                                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                        onClick={() => deleteContactPerson(index)}
                                        disabled={isSubmitting}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        className="rounded border p-2"
                                        value={person.first_name}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].first_name = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        className="rounded border p-2"
                                        value={person.last_name}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].last_name = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Title"
                                        className="rounded border p-2"
                                        value={person.title}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].title = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        className="rounded border p-2"
                                        value={person.email}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].email = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Phone"
                                        className="rounded border p-2"
                                        value={person.phone}
                                        onChange={(e) => {
                                            const newPersons = [...formData.contactPersons];
                                            newPersons[index].phone = e.target.value;
                                            setFormData({ ...formData, contactPersons: newPersons });
                                        }}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        ))}
                        {formData.type === ContactType.INSTITUTION && (
                            <button
                                className="mb-4 w-full rounded bg-blue-200 p-2 transition-colors hover:bg-blue-300 disabled:cursor-not-allowed disabled:bg-gray-200"
                                onClick={addContactPerson}
                                disabled={isSubmitting}
                            >
                                Add Another Contact Person
                            </button>
                        )}
                        <div className="flex gap-4">
                            <button
                                className="flex-1 rounded bg-gray-300 p-2 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={() => {
                                    setShowEditModal(false);
                                    resetForm();
                                }}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                className="flex-1 rounded bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
                                onClick={handleUpdate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center">
                                        <svg
                                            className="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
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
                                        Updating...
                                    </span>
                                ) : (
                                    'Update'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showOpportunitiesModal && selectedContactId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="max-w-8xl flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b px-6 py-4">
                            <h2 className="text-xl font-semibold text-gray-800">
                                <span className="text-bold text-2xl">{selectedContactName}'s </span>Opportunities
                            </h2>
                            <button
                                onClick={() => setShowOpportunitiesModal(false)}
                                className="rounded-full p-4 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            >
                                <X size={28} />
                            </button>
                        </div>
                        <div className="flex-grow overflow-auto p-6">
                            <ViewContactOpportunities setEdit={() => {}} setActiveTab={() => {}} activeTab="view" contact_id={selectedContactId} />
                        </div>
                    </div>
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
                    {filteredContacts?.length === 0 && !isLoading && <p>No contacts found for your search</p>}
                    {filteredContacts?.length > 0 && (
                        <>
                            <div className="hidden overflow-x-auto shadow-md sm:rounded-lg md:block">
                                <table className="min-w-full table-auto text-left text-sm text-gray-500">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('institution')}>
                                                <div className="flex items-center">
                                                    Institution{' '}
                                                    {sortField === 'institution' &&
                                                        (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                                </div>
                                            </th>
                                            <th className="px-4 py-2">Type</th>
                                            <th className="px-4 py-2">Contact Person(s)</th>
                                            <th className="px-4 py-2">Opportunities</th>
                                            <th className="px-4 py-2">Last Activity Date</th>
                                            <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('created_at')}>
                                                <div className="flex items-center">
                                                    Created At{' '}
                                                    {sortField === 'created_at' &&
                                                        (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                                </div>
                                            </th>
                                            <th className="px-4 py-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedContacts?.map((contact, index) => (
                                            <tr
                                                key={contact.id}
                                                className="border-b hover:bg-gray-100"
                                                ref={index === sortedContacts.length - 1 ? lastContactElementRef : null}
                                            >
                                                <td className="px-4 py-2">{contact.institution || 'N/A'}</td>
                                                <td className="px-4 py-2">{contact.type}</td>
                                                <td className="px-4 py-2">
                                                    {contact?.contactPersons?.map((person, index) => (
                                                        <div key={index} className="mb-1">
                                                            {formatContactPerson(person)}
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <button
                                                        className="rounded-full p-3 text-lg text-blue-600 transition-transform hover:scale-105 hover:text-green-900"
                                                        onClick={() =>
                                                            handleViewOpportunities(
                                                                contact.id,
                                                                contact.institution ||
                                                                    (contact.contactPersons
                                                                        ? `${contact.contactPersons[0]?.first_name}
                                                                    ${contact.contactPersons[0]?.last_name}`
                                                                        : ''),
                                                            )
                                                        }
                                                    >
                                                        {contact?.opportunities?.length}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2">
                                                    {contact.opportunities &&
                                                    contact.opportunities.length > 0 &&
                                                    contact.opportunities[0].last_update?.updated_at
                                                        ? formatTimestampToDate(contact.opportunities[0].last_update.updated_at)
                                                        : ''}
                                                </td>
                                                <td className="px-4 py-2">{formatMySQLDate(contact?.created_at)}</td>
                                                <td className="flex gap-2 px-4 py-2">
                                                    <button
                                                        className="rounded bg-green-500 px-3 py-1 text-sm text-white transition-colors hover:bg-green-600"
                                                        onClick={() => handleEdit(contact)}
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        className="rounded bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
                                                        onClick={() => handleDelete(contact.id)}
                                                        disabled={loadingContactId === contact.id}
                                                    >
                                                        {loadingContactId === contact.id ? 'Deleting...' : <Trash2 size={14} />}
                                                    </button>
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
                            {!hasMore && sortedContacts.length > 0 && <div className="py-4 text-center text-gray-500">No more contacts to load</div>}
                            <div className="space-y-4 md:hidden">
                                {sortedContacts?.map((contact, index) => (
                                    <div
                                        key={contact.id}
                                        className="rounded-lg border p-4 shadow-sm"
                                        ref={index === sortedContacts.length - 1 ? lastContactElementRef : null}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-medium text-gray-900">
                                                    {contact.institution ||
                                                        contact.contactPersons[0]?.first_name + ' ' + contact.contactPersons[0]?.last_name}
                                                </h3>
                                                <p className="text-sm text-gray-500">{contact.type}</p>
                                            </div>
                                            <button
                                                onClick={() => setExpandedContact(expandedContact === contact.id ? null : contact.id)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>
                                        {expandedContact === contact.id && (
                                            <div className="mt-3 space-y-2">
                                                {contact.institution && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-600">Institution:</span>
                                                        <span className="text-sm">{contact.institution}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Type:</span>
                                                    <span className="text-sm">{contact.type}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-600">Contact Persons:</span>
                                                    <div className="mt-1 text-sm">
                                                        {contact.contactPersons?.map((person, index) => (
                                                            <div key={index} className="mb-1">
                                                                {formatContactPerson(person)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Opportunities:</span>
                                                    <button
                                                        className="text-sm text-blue-600 hover:text-blue-800"
                                                        onClick={() =>
                                                            handleViewOpportunities(
                                                                contact.id,
                                                                contact.institution ||
                                                                    (contact.contactPersons
                                                                        ? `${contact.contactPersons[0]?.first_name}
                                                                    ${contact.contactPersons[0]?.last_name}`
                                                                        : ''),
                                                            )
                                                        }
                                                    >
                                                        {contact.opportunities.length}
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Created:</span>
                                                    <span className="text-sm">{formatMySQLDate(contact?.created_at)}</span>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        className="flex-1 rounded bg-blue-500 py-1 text-sm text-white"
                                                        onClick={() => handleEdit(contact)}
                                                    >
                                                        Edit Contact
                                                    </button>
                                                    <button
                                                        className="flex-1 rounded bg-red-500 py-1 text-sm text-white"
                                                        onClick={() => handleDelete(contact.id)}
                                                        disabled={loadingContactId === contact.id}
                                                    >
                                                        {loadingContactId === contact.id ? 'Deleting...' : 'Delete Contact'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
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
                            {!hasMore && sortedContacts.length > 0 && <div className="py-4 text-center text-gray-500">No more contacts to load</div>}
                        </>
                    )}
                </>
            )}
        </motion.div>
    );
}
