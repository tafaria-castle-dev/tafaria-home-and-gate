import { useAuth } from '@/hooks/use-auth';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Search, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';

const quillModules = {
    toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        [{ align: [] }],
        ['clean'],
    ],
};

const QuillEditor = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
    return <ReactQuill value={value} onChange={onChange} modules={quillModules} />;
};

interface Agent {
    id: string;
    name: string;
    email: string | null;
    phone_number: string | null;
    created_at: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    description: string;
}

interface Recipient {
    type: 'user' | 'agent';
    id: string;
    email: string;
}

interface RatesEmail {
    id: string;
    subject: string;
    description: string;
    description_json: any;
    created_at: string;
    recipients: Array<{
        recipient_type: string;
        recipient_id: string;
        recipient_email: string;
    }>;
    attachments: Array<{
        file_name: string;
        file_path: string;
    }>;
    users?: User[];
    agents?: Agent[];
    created_by?: User;
}

const SendRatesNotificationEmail = () => {
    const { isAuthenticated, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'send' | 'view'>('send');

    const [emailForm, setEmailForm] = useState({
        subject: '',
        description: '',
        template_id: '',
        attachments: [] as File[],
    });

    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [selectedAgents, setSelectedAgents] = useState<Agent[]>([]);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isFetchingUsers, setIsFetchingUsers] = useState(false);
    const [isFetchingAgents, setIsFetchingAgents] = useState(false);
    const [selectAllUsers, setSelectAllUsers] = useState(false);
    const [selectAllAgents, setSelectAllAgents] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const [ratesEmails, setRatesEmails] = useState<RatesEmail[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredEmails, setFilteredEmails] = useState<RatesEmail[]>([]);
    const [sortField, setSortField] = useState<keyof RatesEmail>('created_at');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
    const [isFetchingEmails, setIsFetchingEmails] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingTemplates(true);
            setIsFetchingUsers(true);
            setIsFetchingAgents(true);
            try {
                const [templatesRes, usersRes, agentsRes] = await Promise.all([
                    axios.get('/api/email-templates'),
                    axios.get('/api/users'),
                    axios.get('/api/agents'),
                ]);
                setEmailTemplates(templatesRes.data);
                setUsers(usersRes.data);
                setAgents(agentsRes.data);
            } catch (error) {
                toast.error('Failed to load required data');
            } finally {
                setIsLoadingTemplates(false);
                setIsFetchingUsers(false);
                setIsFetchingAgents(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (selectAllUsers) {
            setSelectedUsers(users.filter((u) => validateEmail(u.email)));
        } else if (!inputValue) {
            setSelectedUsers([]);
        }
    }, [selectAllUsers, users]);

    useEffect(() => {
        if (selectAllAgents) {
            setSelectedAgents(agents.filter((a) => validateEmail(a.email || '')));
        } else if (!inputValue) {
            setSelectedAgents([]);
        }
    }, [selectAllAgents, agents]);

    const fetchRatesEmails = useCallback(async (search: string = '') => {
        setIsFetchingEmails(true);
        try {
            const res = await axios.get(`/api/rates-emails?search=${encodeURIComponent(search)}`);
            setRatesEmails(res.data);
            setFilteredEmails(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsFetchingEmails(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'view') {
            fetchRatesEmails();
        }
    }, [activeTab, fetchRatesEmails]);

    const debouncedSearch = useCallback(
        debounce((value: string) => {
            const filtered = ratesEmails.filter(
                (e) => e.subject.toLowerCase().includes(value.toLowerCase()) || e.description.toLowerCase().includes(value.toLowerCase()),
            );
            setFilteredEmails(filtered);
        }, 300),
        [ratesEmails],
    );

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchQuery(val);
        debouncedSearch(val);
    };

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');

    const handleEmailTemplateChange = (event: any, newValue: string | null) => {
        if (!newValue) {
            setEmailForm((prev) => ({ ...prev, subject: '', description: '', template_id: '' }));
            return;
        }
        const tmpl = emailTemplates.find((t) => t.name === newValue);
        if (!tmpl) return;
        let desc = tmpl.description || '';
        desc = desc.replace(/Warm regards,?\s*/gi, `Warm regards,<br><br><strong>${user?.name}</strong>`);
        setEmailForm({
            subject: tmpl.subject || '',
            description: desc,
            template_id: tmpl.id || '',
            attachments: [],
        });
    };

    const handleSendEmail = async () => {
        if (!emailForm.subject || !emailForm.description) {
            toast.error('Subject and description are required');
            return;
        }
        const recipients: Recipient[] = [
            ...selectedUsers.filter((u) => validateEmail(u.email)).map((u) => ({ type: 'user' as const, id: u.id.toString(), email: u.email })),
            ...selectedAgents.filter((a) => validateEmail(a.email || '')).map((a) => ({ type: 'agent' as const, id: a.id, email: a.email! })),
        ];
        if (recipients.length === 0) {
            toast.error('No valid recipients selected');
            return;
        }

        const formData = new FormData();
        formData.append('subject', emailForm.subject);
        formData.append('description', emailForm.description);
        formData.append('recipients', JSON.stringify(recipients));
        if (emailForm.template_id) formData.append('template_id', emailForm.template_id);
        emailForm.attachments.forEach((f) => formData.append('attachments[]', f));

        setIsSendingEmail(true);
        try {
            await axios.post('/api/rates-emails', formData);
            toast.success(`Email queued for ${recipients.length} recipients`);
            setEmailForm({ subject: '', description: '', template_id: '', attachments: [] });
            setSelectedUsers([]);
            setSelectedAgents([]);
            setSelectAllUsers(false);
            setSelectAllAgents(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to send');
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await axios.delete(`/api/rates-emails/${id}`);
            fetchRatesEmails(searchQuery);
            toast.success('Email deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    const handleSort = (field: keyof RatesEmail) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedEmails = [...filteredEmails].sort((a, b) => {
        const aVal = a[sortField] as any;
        const bVal = b[sortField] as any;
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const truncate = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        const text = div.textContent || '';
        return text.length > 100 ? text.substring(0, 100) + '...' : text;
    };

    if (!isAuthenticated) return null;

    return (
        <div className="mx-auto w-full p-4">
            <div className="mb-6 flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('send')}
                    className={`px-6 py-3 font-medium transition-colors ${
                        activeTab === 'send' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Send Email
                </button>
                <button
                    onClick={() => setActiveTab('view')}
                    className={`px-6 py-3 font-medium transition-colors ${
                        activeTab === 'view' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    View Sent Emails
                </button>
            </div>

            {activeTab === 'send' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 rounded-lg bg-white p-6 shadow-md">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Recipients</label>
                        <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center">
                                <Checkbox checked={selectAllUsers} onChange={(e) => setSelectAllUsers(e.target.checked)} />
                                <span className="text-sm font-medium text-gray-700">
                                    Select All Users ({users.filter((u) => validateEmail(u.email)).length})
                                </span>
                            </div>
                            <div className="flex items-center">
                                <Checkbox checked={selectAllAgents} onChange={(e) => setSelectAllAgents(e.target.checked)} />
                                <span className="text-sm font-medium text-gray-700">
                                    Select All Agents ({agents.filter((a) => validateEmail(a.email || '')).length})
                                </span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="mb-2 block text-xs font-medium text-gray-600">Individual Users</label>
                            <Autocomplete
                                multiple
                                loading={isFetchingUsers}
                                options={users}
                                value={selectedUsers}
                                inputValue={inputValue}
                                onInputChange={(_, v, r) => r === 'input' && setInputValue(v)}
                                onChange={(_, newValue) => {
                                    setSelectedUsers(newValue);
                                    if (selectAllUsers) setSelectAllUsers(false);
                                }}
                                getOptionLabel={(o) => `${o.name} (${o.email})`}
                                renderOption={(props, option) => (
                                    <li {...props}>
                                        <Checkbox checked={selectedUsers.some((u) => u.id === option.id)} />
                                        <ListItemText primary={`${option.name} (${option.email})`} />
                                    </li>
                                )}
                                renderInput={(params) => <TextField {...params} label="Search Users" placeholder="Type to search..." />}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="mb-2 block text-xs font-medium text-gray-600">Individual Agents</label>
                            <Autocomplete
                                multiple
                                loading={isFetchingAgents}
                                options={agents}
                                value={selectedAgents}
                                inputValue={inputValue}
                                onInputChange={(_, v, r) => r === 'input' && setInputValue(v)}
                                onChange={(_, newValue) => {
                                    setSelectedAgents(newValue);
                                    if (selectAllAgents) setSelectAllAgents(false);
                                }}
                                getOptionLabel={(o) => `${o.name} (${o.email || 'No email'})`}
                                renderOption={(props, option) => (
                                    <li {...props}>
                                        <Checkbox checked={selectedAgents.some((a) => a.id === option.id)} />
                                        <ListItemText primary={`${option.name} (${option.email || 'No email'})`} />
                                    </li>
                                )}
                                renderInput={(params) => <TextField {...params} label="Search Agents" placeholder="Type to search..." />}
                            />
                        </div>

                        {(selectedUsers.length > 0 || selectedAgents.length > 0) && (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="font-medium">Selected Recipients ({selectedUsers.length + selectedAgents.length})</span>
                                    <button
                                        onClick={() => {
                                            setSelectedUsers([]);
                                            setSelectedAgents([]);
                                            setSelectAllUsers(false);
                                            setSelectAllAgents(false);
                                        }}
                                        className="text-sm text-red-600 hover:text-red-800"
                                    >
                                        Clear All
                                    </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {selectedUsers.map((u) => (
                                        <div key={u.id} className="flex items-center justify-between border-b py-1">
                                            <div>
                                                <div className="text-sm">{u.name}</div>
                                                <div className="text-xs text-gray-600">{u.email}</div>
                                            </div>
                                            <button onClick={() => setSelectedUsers((p) => p.filter((x) => x.id !== u.id))}>
                                                <X className="h-4 w-4 text-red-500" />
                                            </button>
                                        </div>
                                    ))}
                                    {selectedAgents.map((a) => (
                                        <div key={a.id} className="flex items-center justify-between border-b py-1">
                                            <div>
                                                <div className="text-sm">{a.name}</div>
                                                <div className="text-xs text-gray-600">{a.email || 'No email'}</div>
                                            </div>
                                            <button onClick={() => setSelectedAgents((p) => p.filter((x) => x.id !== a.id))}>
                                                <X className="h-4 w-4 text-red-500" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Template (optional)</label>
                        <Autocomplete
                            options={emailTemplates.map((t) => t.name)}
                            onChange={handleEmailTemplateChange}
                            renderInput={(params) => <TextField {...params} placeholder="Choose template" variant="outlined" />}
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
                        <TextField
                            fullWidth
                            value={emailForm.subject}
                            onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))}
                            placeholder="Email subject"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">Message</label>
                        <QuillEditor value={emailForm.description} onChange={(v) => setEmailForm((p) => ({ ...p, description: v }))} />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSendEmail}
                        disabled={isSendingEmail}
                        className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white disabled:bg-indigo-400"
                    >
                        {isSendingEmail ? 'Sending...' : 'Send Bulk Email'}
                    </motion.button>
                </motion.div>
            )}

            {activeTab === 'view' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-white p-6 shadow-md">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-800">Sent Rates Emails</h2>
                        <div className="relative w-80">
                            <input
                                type="text"
                                placeholder="Search subject or content..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full rounded-lg border py-2 pr-4 pl-10 focus:border-indigo-500 focus:outline-none"
                            />
                            <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={20} />
                        </div>
                    </div>

                    {isFetchingEmails && <p>Loading...</p>}
                    {!isFetchingEmails && filteredEmails.length === 0 && <p>No emails found</p>}

                    {filteredEmails.length > 0 && (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th
                                                onClick={() => handleSort('subject')}
                                                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                                            >
                                                Subject{' '}
                                                {sortField === 'subject' &&
                                                    (sortDirection === 'asc' ? (
                                                        <ArrowUp className="inline" size={14} />
                                                    ) : (
                                                        <ArrowDown className="inline" size={14} />
                                                    ))}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                Recipients
                                            </th>
                                            <th
                                                onClick={() => handleSort('created_at')}
                                                className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                                            >
                                                Sent{' '}
                                                {sortField === 'created_at' &&
                                                    (sortDirection === 'asc' ? (
                                                        <ArrowUp className="inline" size={14} />
                                                    ) : (
                                                        <ArrowDown className="inline" size={14} />
                                                    ))}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                Preview
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {sortedEmails.map((email) => (
                                            <React.Fragment key={email.id}>
                                                <tr
                                                    className="cursor-pointer hover:bg-gray-50"
                                                    onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                                                >
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{email.subject}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {email.recipients.length} recipient{email.recipients.length > 1 ? 's' : ''}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(email.created_at).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{truncate(email.description)}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <div className="flex items-center gap-3">
                                                            {expandedEmail === email.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(email.id);
                                                                }}
                                                            >
                                                                <Trash2 className="text-red-500 hover:text-red-700" size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedEmail === email.id && (
                                                    <tr>
                                                        <td colSpan={5} className="bg-gray-50 px-6 py-4">
                                                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                                                <div>
                                                                    <h4 className="mb-2 font-semibold">Recipients</h4>
                                                                    <div className="max-h-60 overflow-y-auto rounded border bg-white p-3">
                                                                        {email.recipients.map((r, i) => (
                                                                            <div key={i} className="border-b py-1 text-sm">
                                                                                {r.recipient_email} ({r.recipient_type})
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 className="mb-2 font-semibold">Full Message</h4>
                                                                    <div
                                                                        className="prose max-h-96 overflow-y-auto rounded border bg-white p-4 text-sm"
                                                                        dangerouslySetInnerHTML={{ __html: email.description }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="space-y-4 md:hidden">
                                {sortedEmails.map((email) => (
                                    <div key={email.id} className="rounded-lg border p-4 shadow-sm">
                                        <div
                                            className="flex cursor-pointer items-center justify-between"
                                            onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                                        >
                                            <div>
                                                <h3 className="font-medium text-gray-900">{email.subject}</h3>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(email.created_at).toLocaleString()} • {email.recipients.length} recipients
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {expandedEmail === email.id ? <ChevronUp /> : <ChevronDown />}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(email.id);
                                                    }}
                                                >
                                                    <Trash2 className="text-red-500" size={20} />
                                                </button>
                                            </div>
                                        </div>
                                        {expandedEmail === email.id && (
                                            <div className="mt-4 space-y-4 border-t pt-4">
                                                <div>
                                                    <span className="font-medium">Preview:</span>
                                                    <p className="mt-1 text-sm text-gray-600">{truncate(email.description)}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium">Recipients:</span>
                                                    <div className="mt-1 max-h-40 overflow-y-auto text-sm">
                                                        {email.recipients.map((r, i) => (
                                                            <div key={i}>
                                                                {r.recipient_email} ({r.recipient_type})
                                                            </div>
                                                        ))}
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
            )}
        </div>
    );
};

export default SendRatesNotificationEmail;
