import { useAuth } from '@/hooks/use-auth';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Trash, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
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

const QuillEditor = ({ value, onChange }) => {
    return <ReactQuill value={value} onChange={onChange} modules={quillModules} />;
};

interface SendBulkEmailProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onSuccessfulSubmit: () => void;
}

const SendBulkEmail: React.FC<SendBulkEmailProps> = ({ activeTab, setActiveTab, onSuccessfulSubmit }) => {
    const { isAuthenticated, logout, user } = useAuth();
    const [emailForm, setEmailForm] = useState({
        subject: '',
        description: '',
        type: 'sent' as 'sent' | 'received',
        template_id: '',
        attachments: [] as File[],
    });
    const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailPassword, setEmailPassword] = useState('');
    const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);
    const [emailConfigSaved, setIsEmailConfigSaved] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isFetchingContacts, setIsFetchingContacts] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchEmailTemplates = async () => {
            setIsLoadingTemplates(true);
            try {
                const response = await axios.get('/api/email-templates');
                setEmailTemplates(response.data);
            } catch (error) {
                toast.error('Failed to fetch email templates');
            } finally {
                setIsLoadingTemplates(false);
            }
        };

        const fetchContacts = async () => {
            setIsFetchingContacts(true);
            try {
                const response = await axios.get('/api/contacts');
                const transformedContacts = response.data.map((contact) => ({
                    ...contact,
                    created_at: contact.created_at,
                    contactPersons: contact.contact_persons.map((person) => ({
                        ...person,
                    })),
                    contact_persons: undefined,
                }));
                setContacts(transformedContacts);
            } catch (error) {
                toast.error('Failed to fetch contacts');
            } finally {
                setIsFetchingContacts(false);
            }
        };

        const fetchEmailConfig = async () => {
            try {
                const response = await axios.get(`/api/users/${user?.id}`);
                console.log('Email config response:', response.data.email_password);
                if (response.data.email_password !== null && response.data.email_password !== '') {
                    setIsEmailConfigSaved(true);
                }
            } catch (error) {
                console.error('Error fetching email config:', error);
            }
        };

        fetchEmailTemplates();
        fetchContacts();
        fetchEmailConfig();
    }, []);

    const validateEmail = (email?: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
    };

    const highlightText = (text: string, query: string) => {
        if (!query.trim()) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, index) =>
            regex.test(part) ? (
                <mark key={index} style={{ backgroundColor: '#fef08a', padding: '0 2px', borderRadius: '2px' }}>
                    {part}
                </mark>
            ) : (
                part
            ),
        );
    };

    const formatContactLabel = (contact: Contact, query?: string) => {
        const person = contact.contactPersons.find((p) => validateEmail(p.email || ''));
        const name = person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : 'Unknown';
        const institution = contact.institution ? `${contact.institution} - ` : '';
        const fullLabel = `${institution}${name} (${person?.email || 'No email'})`;
        return query ? highlightText(fullLabel, query) : fullLabel;
    };

    const getFilteredContacts = () => {
        if (!inputValue.trim() || !contacts) return contacts;
        return contacts.filter((contact) => {
            const person = contact.contactPersons?.find((p) => validateEmail(p.email || ''));
            const searchText =
                `${contact.institution || ''} ${person?.first_name || ''} ${person?.last_name || ''} ${person?.email || ''}`.toLowerCase();
            return searchText.includes(inputValue.toLowerCase());
        });
    };

    const getMatchingContacts = () => {
        if (!inputValue.trim() || !contacts) return [];
        return getFilteredContacts() || [];
    };

    const selectAllMatching = () => {
        const matchingContacts = getMatchingContacts();
        const existingIds = new Set(selectedContacts.map((c) => c.id));
        const newContacts = matchingContacts.filter((c) => !existingIds.has(c.id));
        const newSelected = [...selectedContacts, ...newContacts];
        setSelectedContacts(newSelected);
        setInputValue('');
    };

    const removeContact = (contactToRemove: Contact) => {
        setSelectedContacts((prev) => prev.filter((contact) => contact.id !== contactToRemove.id));
    };

    const getSelectedEmails = () => {
        return selectedContacts
            .flatMap((contact) => contact.contactPersons)
            .filter((person) => validateEmail(person.email))
            .map((person) => person.email);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEmailForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSendEmail = async () => {
        if (!emailForm.subject) {
            toast.error('Please enter an email subject');
            return;
        }
        if (!emailForm.description) {
            toast.error('Please enter an email description');
            return;
        }
        if (selectedContacts.length === 0) {
            toast.error('Please select at least one recipient');
            return;
        }

        const validEmails = getSelectedEmails();
        if (validEmails.length === 0) {
            toast.error('No valid email addresses selected');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('subject', emailForm.subject);
            formData.append('description', emailForm.description);
            formData.append('recipients', JSON.stringify(validEmails));
            formData.append('sent_by', user?.name || '');
            formData.append('created_by_id', user?.id || '');
            if (emailForm.template_id) {
                formData.append('template_id', emailForm.template_id);
            }
            emailForm.attachments.forEach((file, index) => {
                formData.append('attachments[]', file, file.name);
            });

            setIsSendingEmail(true);
            const response = await axios.post('/api/bulk-emails', formData);
            if (response.status === 200 || response.status === 201) {
                toast.success(`Emails sent to ${validEmails.length} recipients`);
                setEmailForm({
                    subject: '',
                    description: '',
                    type: 'sent',
                    template_id: '',
                    attachments: [],
                });
                setSelectedContacts([]);
                setSearchQuery('');
                setInputValue('');
                onSuccessfulSubmit();
            }
        } catch (error: any) {
            toast.error(`Failed to send emails: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsSendingEmail(false);
        }
    };

    const saveEmailConfig = async () => {
        setIsSavingConfiguration(true);
        try {
            const response = await axios.put(`/api/users/${user?.id}`, { email_password: emailPassword });
            if (response.status === 200 || response.status === 201) {
                toast.success('Email password saved successfully');
                setEmailPassword('');
                setIsEmailConfigSaved(true);
            }
        } catch (error: any) {
            toast.error(`Error: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsSavingConfiguration(false);
        }
    };
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleEmailTemplateChange = (event: any, newValue: string | null) => {
        if (!newValue) {
            setEmailForm({
                subject: '',
                description: '',
                type: 'sent',
                template_id: '',
                attachments: [],
            });
            return;
        }
        const selectedTemplate = emailTemplates?.find((t) => t.name === newValue);
        if (!selectedTemplate) {
            console.error('Selected template not found');
            return;
        }
        let description = selectedTemplate.description?.toString() || '';
        description = description.replace(/Warm regards,?\s*/gi, `Warm regards,<br><br><strong>${user?.name}</strong>`);
        setEmailForm({
            subject: selectedTemplate.subject || '',
            description: description || '',
            type: 'sent',
            template_id: selectedTemplate.id || '',
            attachments: [],
        });
    };

    const handleRemoveFile = (index: number) => {
        setEmailForm((prev) => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index),
        }));
    };

    const userNames = user?.name?.split(',').map((name) => name.trim()) || [];
    const [userName, setUserName] = useState(userNames?.length > 0 ? userNames[0] : user?.name || '');

    const matchingContacts = getMatchingContacts();

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Recipients</label>
                {inputValue && matchingContacts.length > 0 && (
                    <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700">
                                Found {matchingContacts.length} matching contact{matchingContacts.length !== 1 ? 's' : ''}
                            </span>
                            <button
                                type="button"
                                onClick={selectAllMatching}
                                className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
                            >
                                Select All Matching
                            </button>
                        </div>
                    </div>
                )}
                <Autocomplete
                    multiple
                    loading={isFetchingContacts}
                    options={getFilteredContacts() || []}
                    value={[]}
                    inputValue={inputValue}
                    onChange={(event, newValue) => {
                        if (newValue.length > 0) {
                            const newContact = newValue[newValue.length - 1];
                            const existingIds = new Set(selectedContacts.map((c) => c.id));
                            if (!existingIds.has(newContact.id)) {
                                setSelectedContacts((prev) => [...prev, newContact]);
                            }
                            setInputValue('');
                        }
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                        if (reason === 'input') {
                            setInputValue(newInputValue);
                        }
                    }}
                    getOptionLabel={(option) => {
                        const person = option.contactPersons?.find((p) => validateEmail(p.email));
                        const name = person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : 'Unknown';
                        const institution = option.institution ? `${option.institution} - ` : '';
                        return `${institution}${name} (${person?.email || 'No email'})`;
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Search Recipients"
                            className="w-full"
                            InputProps={{
                                ...params.InputProps,
                                className: 'rounded-lg text-sm',
                            }}
                            placeholder="Search and select email recipients"
                        />
                    )}
                    renderOption={(props, option, { selected }) => {
                        const isSelected = selectedContacts.some((c) => c.id === option.id);
                        return (
                            <li {...props}>
                                <Checkbox checked={isSelected} style={{ marginRight: 8 }} />
                                <ListItemText primary={formatContactLabel(option, inputValue)} style={{ overflow: 'hidden' }} />
                            </li>
                        );
                    }}
                    disableCloseOnSelect
                    filterOptions={(options) => options}
                />
                {selectedContacts.length > 0 && (
                    <div className="mt-3">
                        <div className="mb-2 flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Selected Recipients ({selectedContacts.length})</label>
                            <button type="button" onClick={() => setSelectedContacts([])} className="text-sm text-red-600 hover:text-red-800">
                                Clear All
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
                            {selectedContacts.map((contact) => {
                                const person = contact.contactPersons.find((p) => validateEmail(p.email));
                                const name = person ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : 'Unknown';
                                const institution = contact.institution ? `${contact.institution} - ` : '';
                                const email = person?.email || 'No email';
                                return (
                                    <div key={contact.id} className="flex items-center justify-between border-b border-gray-200 py-1 last:border-b-0">
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm text-gray-900">
                                                {institution}
                                                {name}
                                            </div>
                                            <div className="truncate text-xs text-gray-600">{email}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeContact(contact)}
                                            className="ml-2 flex-shrink-0 text-red-500 hover:text-red-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-2 text-xs text-gray-600">Total emails: {getSelectedEmails().length}</div>
                    </div>
                )}
            </div>
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Email Template</label>
                <Autocomplete
                    options={emailTemplates?.map((t) => t.name) || []}
                    value={emailForm.template_id ? emailTemplates?.find((t) => t.id === emailForm.template_id)?.name || '' : ''}
                    onChange={handleEmailTemplateChange}
                    loading={isLoadingTemplates}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            variant="outlined"
                            placeholder="Select an email template (optional)"
                            className="w-full"
                            InputProps={{
                                ...params.InputProps,
                                className: 'rounded-lg text-sm',
                            }}
                        />
                    )}
                />
            </div>
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
                <TextField
                    name="subject"
                    variant="outlined"
                    value={emailForm.subject}
                    onChange={handleEmailChange}
                    placeholder="Enter email subject"
                    className="w-full"
                    slotProps={{
                        input: {
                            className: 'rounded-lg text-sm',
                        },
                    }}
                />
            </div>
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                {selectedContacts.length === 0 ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
                        Please select at least one recipient with a valid email address.
                    </div>
                ) : (
                    <QuillEditor value={emailForm.description} onChange={(value) => setEmailForm((prev) => ({ ...prev, description: value }))} />
                )}
            </div>
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Email Password{emailConfigSaved && ' (Saved)'}</label>
                <div className="relative">
                    <TextField
                        type="password"
                        variant="outlined"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="Enter your email password"
                        className="w-full"
                        slotProps={{
                            input: {
                                className: 'rounded-lg text-sm',
                            },
                        }}
                    />
                    <button
                        type="button"
                        className="absolute top-1/2 right-3 -translate-y-1/2 transform"
                        onClick={togglePasswordVisibility}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? <EyeOff className="h-5 w-5 text-gray-500" /> : <Eye className="h-5 w-5 text-gray-500" />}
                    </button>
                </div>
            </div>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={saveEmailConfig}
                disabled={isSavingConfiguration}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:px-6 sm:py-3"
            >
                {isSavingConfiguration ? (
                    <span className="flex items-center justify-center">
                        <svg
                            className="mr-2 -ml-1 h-4 w-4 animate-spin text-white sm:h-5 sm:w-5"
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
                        Saving...
                    </span>
                ) : (
                    'Save email password'
                )}
            </motion.button>
            <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Attachments</label>
                <input
                    type="file"
                    multiple
                    onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setEmailForm((prev) => ({
                            ...prev,
                            attachments: files,
                        }));
                    }}
                    className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {emailForm.attachments.length > 0 && (
                    <div className="mt-2">
                        <p className="text-sm text-gray-600">Selected Files:</p>
                        <ul className="list-disc pl-5 text-sm text-gray-600">
                            {emailForm.attachments.map((file, index) => (
                                <li key={index}>
                                    <span>{file.name}</span>
                                    <button type="button" onClick={() => handleRemoveFile(index)} className="ml-2 text-red-500 hover:text-red-700">
                                        <Trash className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            {userNames.length > 1 && (
                <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Sent By</label>
                    <select
                        name="preparedBy"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
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
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:px-6 sm:py-3"
            >
                {isSendingEmail ? (
                    <span className="flex items-center justify-center">
                        <svg
                            className="mr-2 -ml-1 h-4 w-4 animate-spin text-white sm:h-5 sm:w-5"
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
                        Sending...
                    </span>
                ) : (
                    'Send Bulk Email'
                )}
            </motion.button>
        </div>
    );
};

export default SendBulkEmail;
