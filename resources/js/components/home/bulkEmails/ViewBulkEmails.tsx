import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ContactPerson {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    title: string;
}

interface Contact {
    id: string;
    type: 'INDIVIDUAL' | 'INSTITUTION';
    institution?: string;
    contactPersons: ContactPerson[];
}

interface BulkEmail {
    id: string;
    subject: string;
    description: string;
    recipients: Contact[];
    created_at: string;
    sent_by: string;
    created_by: User;
}

interface User {
    id: string;
    name?: string | null;
}

interface ViewBulkEmailsProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const ViewBulkEmails: React.FC<ViewBulkEmailsProps> = ({ activeTab, setActiveTab }) => {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filteredBulkEmails, setFilteredBulkEmails] = useState<BulkEmail[]>([]);
    const [sortField, setSortField] = useState<keyof BulkEmail>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [expandedBulkEmail, setExpandedBulkEmail] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const { isAuthenticated, logout, user } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated]);

    const fetchBulkEmails = useCallback(async (search: string = '') => {
        setIsFetching(true);
        try {
            const response = await axios.get(`/api/bulk-emails?search=${encodeURIComponent(search)}`);
            setFilteredBulkEmails(response.data.bulkEmails || []);
        } catch (error) {
            console.error('Error fetching bulk emails:', error);
        } finally {
            setIsFetching(false);
        }
    }, []);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            fetchBulkEmails(value);
        }, 300),
        [fetchBulkEmails],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        debouncedSearch(e.target.value);
    };

    const handleDelete = async (emailId: string) => {
        setIsFetching(true);
        try {
            await axios.delete(`/api/bulk-emails/${emailId}`);
            fetchBulkEmails(searchQuery);
        } catch (error) {
            console.error('Error deleting bulk email:', error);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchBulkEmails();
    }, [fetchBulkEmails]);

    const handleSort = (field: keyof BulkEmail) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedBulkEmails = filteredBulkEmails?.slice().sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const formatContactLabel = (contact: Contact) => {
        const person = contact.contactPersons.find((p) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email));
        const name = person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : 'Unknown';
        const institution = contact.institution ? `${contact.institution} - ` : '';
        return `${institution}${name} (${person?.email || 'No email'})`;
    };

    const truncateDescription = (description: { content: string } | string) => {
        const text = typeof description === 'string' ? description : description.content || '';
        const div = document.createElement('div');
        div.innerHTML = text;
        const plainText = div.textContent || div.innerText || '';
        return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
    };

    const toggleExpand = (emailId: string) => {
        setExpandedBulkEmail(expandedBulkEmail === emailId ? null : emailId);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <motion.div
                    className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg bg-white p-4 shadow-md sm:p-6"
        >
            <div className="mb-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">Bulk Emails 📧</h2>
                <div className="flex w-full items-center gap-4">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search by subject or description..."
                            className="w-full rounded-lg border p-2 pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            onChange={handleSearch}
                            value={searchQuery}
                        />
                        <Search size={20} className="absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400" />
                    </div>
                </div>
            </div>

            {isFetching && <p>Loading...</p>}
            {!isFetching && !filteredBulkEmails?.length && <p>No bulk emails found for your search</p>}
            {!isFetching && filteredBulkEmails?.length > 0 && (
                <>
                    <div className="hidden overflow-x-auto shadow-md sm:rounded-lg md:block">
                        <table className="min-w-full table-auto text-left text-sm text-gray-500">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('subject')}>
                                        <div className="flex items-center">
                                            Subject{' '}
                                            {sortField === 'subject' && (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                        </div>
                                    </th>
                                    <th className="px-4 py-2 hover:bg-gray-200">
                                        <div className="flex items-center">Sent By</div>
                                    </th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('created_at')}>
                                        <div className="flex items-center">
                                            Date Sent{' '}
                                            {sortField === 'created_at' &&
                                                (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                        </div>
                                    </th>
                                    <th className="cursor-pointer px-4 py-2 hover:bg-gray-200" onClick={() => handleSort('recipients')}>
                                        <div className="flex items-center">
                                            Recipients{' '}
                                            {sortField === 'recipients' &&
                                                (sortDirection === 'desc' ? <ArrowDown size={16} /> : <ArrowUp size={16} />)}
                                        </div>
                                    </th>
                                    <th className="px-4 py-2">Description</th>
                                    <th className="px-4 py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedBulkEmails?.map((email) => (
                                    <>
                                        <tr
                                            key={email.id}
                                            className="cursor-pointer border-b hover:bg-gray-100"
                                            onClick={() => toggleExpand(email.id)}
                                        >
                                            <td className="px-4 py-4">{email.subject}</td>
                                            <td className="px-4 py-4">{email.sent_by || email.created_by?.name}</td>
                                            <td className="px-4 py-4">{new Date(email.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-4">{email.recipients.length}</td>
                                            <td className="px-4 py-4">{truncateDescription(email.description)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    {expandedBulkEmail === email.id ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(email.id);
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedBulkEmail === email.id && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={6} className="px-4 py-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <h4 className="mb-2 font-medium">Recipients:</h4>
                                                            <ul className="list-disc space-y-1 pl-5">
                                                                {email.recipients.map((contact) => (
                                                                    <li key={contact.id}>{formatContactLabel(contact)}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <h4 className="mb-2 font-medium">Full Description:</h4>
                                                            <div
                                                                className="prose max-w-none text-sm text-gray-600"
                                                                dangerouslySetInnerHTML={{ __html: email.description }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-4 md:hidden">
                        {sortedBulkEmails?.map((email) => (
                            <div key={email.id} className="rounded-lg border p-4 shadow-sm">
                                <div className="flex cursor-pointer items-start justify-between" onClick={() => toggleExpand(email.id)}>
                                    <div>
                                        <h3 className="font-medium text-gray-900">{email.subject}</h3>
                                        <p className="text-sm text-gray-500">Sent: {new Date(email.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {expandedBulkEmail === email.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(email.id);
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {expandedBulkEmail === email.id && (
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Subject:</span>
                                            <span className="text-sm">{email.subject}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Date Sent:</span>
                                            <span className="text-sm">{new Date(email.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Recipients:</span>
                                            <span className="text-sm">{email.recipients.length}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-600">Description:</span>
                                            <div className="mt-1 text-sm">{truncateDescription(email.description)}</div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm text-gray-600">Recipients:</span>
                                            <div className="mt-1 text-sm">
                                                {email.recipients.length > 0 ? (
                                                    <ul className="list-disc pl-5">
                                                        {email.recipients.map((contact) => (
                                                            <li key={contact.id}>{formatContactLabel(contact)}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <span>No recipients</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </motion.div>
    );
};

export default ViewBulkEmails;
