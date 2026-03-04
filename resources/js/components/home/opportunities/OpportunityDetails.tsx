import { useAuth } from '@/hooks/use-auth';
import { OpportunityDetailsProps } from '@/types/opportunity';
import { Accordion, AccordionDetails, AccordionSummary, List, ListItem, ListItemText, Typography } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronDown, ChevronUp, Edit, Eye, EyeOff, File, FileText, Mail, Phone, Save, Trash, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdExpandMore as ExpandMoreIcon } from 'react-icons/md';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

enum OpportunityStage {
    Qualify = 'Qualify',
    MeetAndPresent = 'MeetAndPresent',
    Propose = 'Propose',
    Negotiate = 'Negotiate',
    ClosedWon = 'ClosedWon',
    ClosedLost = 'ClosedLost',
}

const opportunityStages = [
    { title: OpportunityStage.Qualify, label: 'Qualify', probability: 10 },
    { title: OpportunityStage.MeetAndPresent, label: 'Meet & Present', probability: 25 },
    { title: OpportunityStage.Propose, label: 'Propose', probability: 50 },
    { title: OpportunityStage.Negotiate, label: 'Negotiate', probability: 75 },
    { title: OpportunityStage.ClosedWon, label: 'Closed Won', probability: 100 },
    { title: OpportunityStage.ClosedLost, label: 'Closed Lost', probability: 0 },
];

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

const QuillEditor: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
    return <ReactQuill value={value} onChange={onChange} modules={quillModules} />;
};

const OpportunityDetails: React.FC<OpportunityDetailsProps> = ({ opportunity }) => {
    const { isAuthenticated, user } = useAuth();
    const otherContactPersons = opportunity.contact.contactPersons?.filter((person) => person.id !== opportunity.contact_person?.id) || [];
    const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
    const [emailTemplates, setEmailTemplates] = useState<{ id: string; name: string; subject: string; description: string }[]>([]);
    const [emailActivities, setEmailActivities] = useState<any[]>([]);
    const [callLogs, setCallLogs] = useState<any[]>([]);
    const [opportunityNames, setOpportunityNames] = useState<{ id: string; title: string }[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isLoadingOpportunityNames, setIsLoadingOpportunityNames] = useState(false);
    const [isUploadingFiles, setIsUploadingFiles] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isCreatingEmail, setIsCreatingEmail] = useState(false);
    const [isCreatingCall, setIsCreatingCall] = useState(false);
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [isUpdatingCall, setIsUpdatingCall] = useState(false);
    const [isUpdatingOpportunity, setIsUpdatingOpportunity] = useState(false);
    const [isDeletingCall, setIsDeletingCall] = useState(false);
    const [deletingFilePath, setDeletingFilePath] = useState<string | null>(null);
    const [deletingEmailId, setDeletingEmailId] = useState<string | null>(null);
    const [fileForm, setFileForm] = useState({
        files: [] as File[],
        fileLinks: [] as string[],
        newLink: '',
    });
    const [emailForm, setEmailForm] = useState({
        subject: '',
        description: '',
        type: 'sent' as 'sent' | 'received',
        template_id: '',
        attachments: [] as File[],
    });
    const [callForm, setCallForm] = useState({
        subject: '',
        description: '',
    });
    const [editingEmail, setEditingEmail] = useState<string | null>(null);
    const [editingCall, setEditingCall] = useState<string | null>(null);
    const [isEditingOpportunity, setIsEditingOpportunity] = useState(false);
    const [opportunityData, setOpportunityData] = useState({
        ...opportunity,
        files: opportunity.files || [],
    });
    const [opportunityForm, setOpportunityForm] = useState({
        name: opportunity.name,
        year: opportunity.year,
        description: opportunity.description || '',
        amount: opportunity.amount?.toString() || '',
        close_date: new Date(opportunity.close_date).toISOString().split('T')[0],
        stage: opportunity.stage,
        institutionName: opportunity.contact.institution || '',
        contact_person: opportunity.contact_person
            ? {
                  id: opportunity.contact_person.id,
                  first_name: opportunity.contact_person.first_name,
                  last_name: opportunity.contact_person.last_name,
                  phone: opportunity.contact_person.phone || '',
                  email: opportunity.contact_person.email || '',
                  institutionId: opportunity.contact.id,
                  institutionName: opportunity.contact.institution || '',
                  title: opportunity.contact_person.title,
              }
            : null,
        phone: opportunity.contact_person?.phone || '',
        email: opportunity.contact_person?.email || '',
        created_by_id: opportunity.created_by.id,
        assistantClerkId: opportunity.assistant_clerk?.id,
    });
    const [activeEmailTab, setActiveEmailTab] = useState('send');
    const [expandedItems, setExpandedItems] = useState<{
        emails: string[];
        calls: string[];
        files: string[];
    }>({
        emails: [],
        calls: [],
        files: [],
    });
    const [expandedSections, setExpandedSections] = useState({
        files: false,
        emails: false,
        calls: false,
    });
    const [emailPassword, setEmailPassword] = useState('');
    const [isSavingConfiguration, setIsSavingConfiguration] = useState(false);
    const [emailConfigSaved, setIsEmailConfigSaved] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const userNames = user?.name?.split(',').map((name: string) => name.trim()) || [];
    const [editedBy, setEditedBy] = useState(userNames.length > 1 ? userNames[0] : '');

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoadingUsers(true);
            try {
                const response = await axios.get('/api/users');
                const filteredUsers = response.data
                    .filter((user: any) => {
                        if (user.role === 'super_staff') {
                            return user.name.includes('Laura');
                        }
                        return true;
                    })
                    .map((user: any) => {
                        if (user.role === 'super_staff') {
                            return { ...user, name: 'Laura' };
                        }
                        return user;
                    })
                    .sort((a: any, b: any) => a.name.localeCompare(b.name));
                setUsers(filteredUsers);
            } catch (error) {
                toast.error('Failed to fetch users');
            } finally {
                setIsLoadingUsers(false);
            }
        };

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

        const fetchEmailActivities = async () => {
            try {
                const response = await axios.get(`/api/email-activities?opportunity_id=${opportunity.id}`);
                setEmailActivities(response.data);
            } catch (error) {
                toast.error('Failed to fetch email activities');
            }
        };

        const fetchCallLogs = async () => {
            try {
                const response = await axios.get(`/api/call-logs?opportunity_id=${opportunity.id}`);
                setCallLogs(response.data);
            } catch (error) {
                toast.error('Failed to fetch call logs');
            }
        };

        const fetchOpportunityNames = async () => {
            setIsLoadingOpportunityNames(true);
            try {
                const response = await axios.get('/api/opportunity-names');
                setOpportunityNames(
                    response.data.map((opp: any) => ({
                        id: opp.id,
                        title: opp.name,
                    })),
                );
            } catch (error) {
                toast.error('Failed to fetch opportunity names');
            } finally {
                setIsLoadingOpportunityNames(false);
            }
        };

        const fetchEmailConfig = async () => {
            try {
                const response = await axios.get(`/api/users/${user?.id}`);
                if (response.data.email_password !== null && response.data.email_password !== '') {
                    setIsEmailConfigSaved(true);
                }
            } catch (error) {
                console.error('Error fetching email config:', error);
            }
        };

        fetchUsers();
        fetchEmailTemplates();
        fetchEmailActivities();
        fetchCallLogs();
        fetchOpportunityNames();
        fetchEmailConfig();
    }, [opportunity.id]);

    const handleTogglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    const toggleSection = (section: 'files' | 'emails' | 'calls') => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const toggleExpand = (type: 'emails' | 'calls' | 'files', id: string) => {
        setExpandedItems((prev) => ({
            ...prev,
            [type]: prev[type].includes(id) ? prev[type].filter((item) => item !== id) : [...prev[type], id],
        }));
    };

    const handleRemoveFile = (index: number) => {
        setEmailForm((prev) => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index),
        }));
    };

    const handleRemoveOpportunityFile = (index: number) => {
        setFileForm((prev) => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index),
        }));
    };

    const handleRemoveOpportunityLink = (index: number) => {
        setFileForm((prev) => ({
            ...prev,
            fileLinks: prev.fileLinks.filter((_, i) => i !== index),
        }));
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEmailForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleCallChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCallForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileLinkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { value } = e.target;
        setFileForm((prev) => ({ ...prev, newLink: value }));
    };

    const handleAddFileLink = () => {
        if (!fileForm.newLink) {
            toast.error('Please enter a file link');
            return;
        }
        try {
            new URL(fileForm.newLink);
            setFileForm((prev) => ({
                ...prev,
                fileLinks: [...prev.fileLinks, prev.newLink],
                newLink: '',
            }));
        } catch {
            toast.error('Please enter a valid URL');
        }
    };

    const handleOpportunityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setOpportunityForm((prev) => ({
            ...prev,
            [name]: name === 'institutionName' ? capitalizeWords(value) : value,
        }));
    };

    const capitalizeWords = (str: string) => {
        if (!str) return str;
        return str
            .split(' ')
            .map((word) => {
                if (word.match(/^[A-Z]{2,}$/) || word.match(/^[A-Z]\.[A-Z]$/)) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
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
            toast.error('Selected template not found');
            return;
        }
        const contact_person = opportunityForm.contact_person;
        const salutation = contact_person
            ? contact_person.title
                ? contact_person.title
                : `${contact_person.first_name} ${contact_person.last_name}`
            : 'Sir/Madam';
        let description = selectedTemplate.description?.toString() || '';
        description = description.replace(/Dear Sir\/Madam/g, `Dear ${salutation}`);
        const userName = editedBy || user?.name || 'Tafaria Castle';
        description = description.replace(/Warm regards,?\s*/gi, `Warm regards,<br><br><strong>${userName}</strong>`);
        setEmailForm({
            subject: selectedTemplate.subject || '',
            description: description || '',
            type: 'sent' as 'sent' | 'received',
            template_id: selectedTemplate.id || '',
            attachments: [] as File[],
        });
    };

    const handleStageChange = (event: React.SyntheticEvent, newValue: string | null) => {
        if (newValue && isOpportunityStage(newValue)) {
            setOpportunityForm((prev) => ({
                ...prev,
                stage: newValue,
            }));
        }
    };

    const isOpportunityStage = (value: string): value is OpportunityStage => {
        return Object.values(OpportunityStage).includes(value as OpportunityStage);
    };

    const handleOpportunityNameAutocompleteChange = (event: any, newValue: string | null) => {
        setOpportunityForm((prev) => ({
            ...prev,
            name: newValue || '',
        }));
    };

    const handleOpportunityNameBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        if (inputValue && !opportunityNames.some((p) => p.title.trim() === inputValue.trim())) {
            toast.error('No matching opportunity names. Please create a new one.');
        }
    };

    const validatePhoneNumber = (phone: string): boolean => {
        const phoneRegex = /^(\+|00)?(\d{1,3})?[\s\-.]?\(?(\d{1,4})\)?[\s\-.]?(\d{1,4})[\s\-.]?(\d{1,4})[\s\-.]?(\d{1,4})$/;
        if (!phoneRegex.test(phone)) {
            return false;
        }
        const cleaned = phone.replace(/[\s\-+.()]/g, '');
        const digitCount = cleaned.replace(/\D/g, '').length;
        return digitCount >= 4 && digitCount <= 15;
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const updateLastUpdate = async () => {
        const response = await axios.post(`/api/last-updates`, {
            updated_at: new Date().toISOString(),
            super_staff: editedBy,
            updated_by_id: user?.id,
            opportunity_id: opportunity.id,
        });
        setOpportunityData((prev) => ({
            ...prev,
            last_update: response.data.updated_at,
        }));
    };

    const handleDeleteFile = async (file: { name: string; path: string; type: string }) => {
        setDeletingFilePath(file.path);
        try {
            if (file.type === 'opportunity') {
                const updatedFiles = (opportunityData.files || []).filter((f) => f.file_path !== file.path);
                await axios.put(`/api/opportunities/${opportunityData.id}`, {
                    files: updatedFiles,
                });
                setOpportunityData((prev) => ({
                    ...prev,
                    files: updatedFiles,
                }));
                toast.success('File deleted successfully');
                await updateLastUpdate();
            }
        } catch (error) {
            toast.error('Failed to delete file');
        } finally {
            setDeletingFilePath(null);
        }
    };

    const handleUploadFiles = async () => {
        if (fileForm.files.length === 0 && fileForm.fileLinks.length === 0) {
            toast.error('Please add at least one file or link');
            return;
        }
        try {
            setIsUploadingFiles(true);
            let updatedFiles = [...(opportunityData.files || []), ...fileForm.fileLinks];

            if (fileForm.files.length > 0) {
                const formData = new FormData();
                formData.append('opportunity_id', opportunity.id);
                fileForm.files.forEach((file) => {
                    formData.append('files[]', file);
                });
                await axios.post('/api/opportunity-files', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            const updatedOpportunity = await axios.put(`/api/opportunities/${opportunityData.id}`, {
                files: updatedFiles,
            });
            setOpportunityData({
                ...updatedOpportunity.data,
                files: updatedOpportunity.data.files || [],
            });
            setFileForm({ files: [], fileLinks: [], newLink: '' });
            toast.success('Files uploaded successfully');
            await updateLastUpdate();
        } catch (error) {
            toast.error('Failed to upload files');
        } finally {
            setIsUploadingFiles(false);
        }
    };

    const handleSaveOpportunity = async () => {
        if (!opportunityForm.name) {
            toast.error('Please enter an opportunity name');
            return;
        }
        if (!opportunityForm.close_date) {
            toast.error('Please enter a close date');
            return;
        }
        if (opportunityForm.phone && !validatePhoneNumber(opportunityForm.phone)) {
            toast.error('Please enter a valid phone number (4-15 digits)');
            return;
        }
        if (opportunityForm.email && !validateEmail(opportunityForm.email)) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (!opportunityForm.contact_person) {
            toast.error('Please select a contact person');
            return;
        }
        try {
            setIsUpdatingOpportunity(true);
            const updatedOpportunity = await axios.put(`/api/opportunities/${opportunityData.id}`, {
                name: opportunityForm.name,
                description: opportunityForm.description,
                amount: opportunityForm.amount ? parseFloat(opportunityForm.amount) : null,
                close_date: new Date(opportunityForm.close_date).toISOString(),
                stage: opportunityForm.stage,
                probability: opportunityStages.find((stage) => stage.title === opportunityForm.stage)?.probability,
                year: opportunityForm.year,

                contact_person_id: opportunityForm.contact_person.id,
                assistant_clerk_id: opportunityForm.assistantClerkId,
            });
            setOpportunityData({
                ...updatedOpportunity.data,
                files: updatedOpportunity.data.files || [],
            });
            setOpportunityForm({
                name: updatedOpportunity.data.name,
                year: updatedOpportunity.data.year,
                description: updatedOpportunity.data.description || '',
                amount: updatedOpportunity.data.amount?.toString() || '',
                close_date: new Date(updatedOpportunity.data.close_date).toISOString().split('T')[0],
                stage: updatedOpportunity.data.stage,
                institutionName: updatedOpportunity.data.contact.institution || '',
                contact_person: updatedOpportunity.data.contact_person
                    ? {
                          id: updatedOpportunity.data.contact_person.id,
                          first_name: updatedOpportunity.data.contact_person.first_name,
                          last_name: updatedOpportunity.data.contact_person.last_name,
                          phone: updatedOpportunity.data.contact_person.phone || '',
                          email: updatedOpportunity.data.contact_person.email || '',
                          institutionId: updatedOpportunity.data.contact.id,
                          institutionName: updatedOpportunity.data.contact.institution || '',
                          title: updatedOpportunity.data.contact_person.title,
                      }
                    : null,
                phone: updatedOpportunity.data.contact_person?.phone || '',
                email: updatedOpportunity.data.contact_person?.email || '',
                created_by_id: updatedOpportunity.data.created_by.id,
                assistantClerkId: updatedOpportunity.data.assistant_clerk?.id,
            });
            toast.success('Opportunity updated successfully');
            setIsEditingOpportunity(false);
            await updateLastUpdate();
        } catch (error) {
            toast.error('Failed to update opportunity');
        } finally {
            setIsUpdatingOpportunity(false);
        }
    };

    const handleCancelEditOpportunity = () => {
        setOpportunityForm({
            name: opportunityData.name,
            year: opportunityData.year,
            description: opportunityData.description || '',
            amount: opportunityData.amount?.toString() || '',
            close_date: new Date(opportunityData.close_date).toISOString().split('T')[0],
            stage: opportunityData.stage,
            institutionName: opportunityData.contact.institution || '',
            contact_person: opportunityData.contact_person
                ? {
                      id: opportunityData.contact_person.id,
                      first_name: opportunityData.contact_person.first_name,
                      last_name: opportunityData.contact_person.last_name,
                      phone: opportunityData.contact_person.phone || '',
                      email: opportunityData.contact_person.email || '',
                      institutionId: opportunityData.contact.id,
                      institutionName: opportunityData.contact.institution || '',
                      title: opportunityData.contact_person.title,
                  }
                : null,
            phone: opportunityData.contact_person?.phone || '',
            email: opportunityData.contact_person?.email || '',
            created_by_id: opportunity.created_by.id,
            assistantClerkId: opportunity.assistant_clerk?.id,
        });
        setIsEditingOpportunity(false);
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
        if (!opportunityForm.email) {
            toast.error('Please provide a recipient email address');
            return;
        }
        if (!validateEmail(opportunityForm.email)) {
            toast.error("This contact doesn't have a valid email address. Please edit the contact to include a valid email.");
            return;
        }
        try {
            setIsSendingEmail(true);
            const formData = new FormData();
            formData.append('subject', emailForm.subject);
            formData.append('description', emailForm.description);
            formData.append('recipient', opportunityForm.email);
            formData.append('sentBy', editedBy || user?.name || '');
            formData.append('opportunity_id', opportunityData.id);
            emailForm.attachments.forEach((file, index) => {
                formData.append('attachments[]', file, file.name);
            });
            const response = await axios.post('/api/opportunities/send-emails', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setEmailActivities((prev) => [response.data, ...prev]);
            setEmailForm({
                subject: '',
                description: '',
                type: 'sent',
                template_id: '',
                attachments: [],
            });
            toast.success(editingEmail ? 'Email updated successfully' : 'Email sent and logged successfully');
            await updateLastUpdate();
            setEditingEmail(null);
        } catch (error: any) {
            toast.error(editingEmail ? 'Failed to update email' : `Failed to send and log email: ${error.message}`);
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleLogEmail = async () => {
        if (!emailForm.subject) {
            toast.error('Please enter an email subject');
            return;
        }
        if (!emailForm.description) {
            toast.error('Please enter an email description');
            return;
        }
        try {
            setIsCreatingEmail(true);
            if (editingEmail) {
                const response = await axios.put(`/api/email-activities/${editingEmail}`, {
                    subject: emailForm.subject,
                    description: emailForm.description,
                    type: emailForm.type,
                    super_staff: editedBy,
                    template_id: emailForm.template_id || null,
                });
                setEmailActivities((prev) => prev.map((email) => (email.id === editingEmail ? response.data : email)));
                toast.success('Email updated successfully');
                setEditingEmail(null);
            } else {
                const response = await axios.post('/api/email-activities', {
                    subject: emailForm.subject,
                    description: emailForm.description,
                    type: emailForm.type,
                    super_staff: editedBy,
                    opportunity_id: opportunityData.id,
                    created_by_id: user?.id,
                    template_id: emailForm.template_id || null,
                });
                setEmailActivities((prev) => [response.data, ...prev]);
                toast.success('Email logged successfully');
            }
            setEmailForm({
                subject: '',
                description: '',
                type: 'sent',
                template_id: '',
                attachments: [],
            });
            await updateLastUpdate();
        } catch (error) {
            toast.error(editingEmail ? 'Failed to update email' : 'Failed to log email');
        } finally {
            setIsCreatingEmail(false);
        }
    };

    const handleEditEmail = (email: any) => {
        setEditingEmail(email.id);
        setEmailForm({
            subject: email.subject,
            description: email.description,
            type: email.type,
            template_id: email.template_id || '',
            attachments: email.attachments || [],
        });
        setActiveEmailTab(email.type === 'sent' ? 'send' : 'log');
    };

    const handleEditCall = (call: any) => {
        setEditingCall(call.id);
        setCallForm({
            subject: call.subject,
            description: call.description,
        });
    };

    const handleDeleteEmail = async (emailId: string) => {
        setDeletingEmailId(emailId);
        try {
            await axios.delete(`/api/email-activities/${emailId}`);
            setEmailActivities((prev) => prev.filter((email) => email.id !== emailId));
            toast.success('Email activity deleted');
            await updateLastUpdate();
        } catch (error) {
            toast.error('Failed to delete email activity');
        } finally {
            setDeletingEmailId(null);
        }
    };

    const handleDeleteCall = async (callId: string) => {
        setIsDeletingCall(true);
        try {
            await axios.delete(`/api/call-logs/${callId}`);
            setCallLogs((prev) => prev.filter((call) => call.id !== callId));
            toast.success('Call log deleted');
            await updateLastUpdate();
        } catch (error) {
            toast.error('Failed to delete call log');
        } finally {
            setIsDeletingCall(false);
        }
    };

    const handleLogCall = async () => {
        if (!callForm.subject) {
            toast.error('Please enter a call subject');
            return;
        }
        if (!callForm.description) {
            toast.error('Please enter a call description');
            return;
        }
        try {
            setIsCreatingCall(true);
            if (editingCall) {
                const response = await axios.put(`/api/call-logs/${editingCall}`, {
                    subject: callForm.subject,
                    description: callForm.description,
                    super_staff: editedBy,
                });
                setCallLogs((prev) => prev.map((call) => (call.id === editingCall ? response.data : call)));
                toast.success('Call updated successfully');
                setEditingCall(null);
            } else {
                const response = await axios.post('/api/call-logs', {
                    subject: callForm.subject,
                    description: callForm.description,
                    super_staff: editedBy,
                    opportunity_id: opportunityData.id,
                    created_by_id: user?.id,
                });
                setCallLogs((prev) => [response.data, ...prev]);
                toast.success('Call logged successfully');
            }
            setCallForm({ subject: '', description: '' });
            await updateLastUpdate();
        } catch (error) {
            toast.error(editingCall ? 'Failed to update call' : 'Failed to log call');
        } finally {
            setIsCreatingCall(false);
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

    const getProgressWidth = () => {
        const currentStageIndex = opportunityStages.findIndex((s) => s.title === opportunityData.stage);
        if (currentStageIndex === -1) return '0%';
        if (opportunityData.stage === OpportunityStage.ClosedWon) return '100%';
        if (opportunityData.stage === OpportunityStage.ClosedLost) return '0%';
        const activeStageCount = opportunityStages.length - 3;
        return `${(currentStageIndex / activeStageCount) * 100}%`;
    };

    const allFiles = [
        ...(opportunityData.files?.map((file) => ({
            name: file.original_name,
            path: file.file_path,
            type: 'opportunity',
        })) || []),
        ...(emailActivities?.flatMap(
            (email) =>
                email.attachments?.map((attachment) => ({
                    name: attachment.fileName,
                    path: attachment.filePath,
                    type: 'email',
                })) || [],
        ) || []),
    ];

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen w-full bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mx-auto w-full max-w-7xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
            >
                <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-white sm:h-8 sm:w-8" />
                        <h2 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">Opportunity: {opportunityData.name}</h2>
                    </div>
                </div>
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="mb-6 sm:mb-8">
                        <h3 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">Opportunity Stage</h3>
                        <div className="flex flex-wrap justify-between gap-2">
                            {opportunityStages.map((stage, index) => {
                                const currentStageIndex = opportunityStages.findIndex((s) => s.title === opportunityData.stage);
                                const isClosedLost = opportunityData.stage === OpportunityStage.ClosedLost;
                                const isPassed = isClosedLost ? false : index <= currentStageIndex && stage.title !== OpportunityStage.ClosedLost;
                                const isCurrent = index === currentStageIndex && !isClosedLost;
                                const isNotReached = index > currentStageIndex && !isClosedLost;

                                let bgColor = 'bg-gray-300';
                                if (isPassed) bgColor = 'bg-green-500';
                                if (isCurrent) bgColor = 'bg-blue-500';
                                if (stage.title === OpportunityStage.ClosedLost && isClosedLost) bgColor = 'bg-red-500';

                                let textColor = 'text-gray-600';
                                if (isPassed || isCurrent || (stage.title === OpportunityStage.ClosedLost && isClosedLost)) textColor = 'text-white';

                                return (
                                    <div key={stage.title} className="relative flex w-[14%] min-w-[60px] flex-col items-center sm:min-w-[80px]">
                                        <motion.div
                                            className={`relative flex h-12 w-12 items-center justify-center sm:h-16 sm:w-16 ${bgColor} ${textColor} rounded-lg text-xs font-semibold shadow-md sm:text-base`}
                                            whileHover={{ scale: 1.1 }}
                                            title={`${stage.label} (${stage.probability}%)`}
                                        >
                                            <span className="">
                                                {stage.title === OpportunityStage.ClosedLost ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : index + 1}
                                            </span>
                                            {index < opportunityStages.length - 1 && (
                                                <div
                                                    className={`absolute -right-3 h-0 w-0 border-t-[10px] border-b-[10px] border-l-[15px] border-t-transparent border-b-transparent sm:-right-4 sm:border-t-[12px] sm:border-b-[12px] sm:border-l-[18px] ${bgColor}`}
                                                />
                                            )}
                                        </motion.div>
                                        <p className="mt-2 truncate text-xs font-medium text-gray-800 sm:text-sm">{stage.label}</p>
                                        <p className="text-xs text-gray-500">{stage.probability}%</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                        <div className="w-full space-y-6 lg:w-1/2">
                            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                                <div className="mb-4 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-indigo-600" />
                                        <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Opportunity Details</h3>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        onClick={() => setIsEditingOpportunity(!isEditingOpportunity)}
                                        className="text-indigo-600 hover:text-indigo-800"
                                    >
                                        {isEditingOpportunity ? <X className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                                    </motion.button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Opportunity Name</label>
                                        {isEditingOpportunity ? (
                                            <Autocomplete
                                                options={opportunityNames.map((opp) => opp.title)}
                                                value={opportunityForm.name}
                                                onChange={handleOpportunityNameAutocompleteChange}
                                                onBlur={handleOpportunityNameBlur}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        variant="outlined"
                                                        placeholder="Enter opportunity name"
                                                        className="w-full"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            className: 'rounded-lg text-sm',
                                                        }}
                                                    />
                                                )}
                                                freeSolo
                                            />
                                        ) : (
                                            <TextField
                                                variant="outlined"
                                                value={opportunityData.name}
                                                className="w-full"
                                                disabled
                                                InputProps={{
                                                    className: 'bg-gray-50 rounded-lg text-sm',
                                                }}
                                            />
                                        )}
                                    </div>
                                    {opportunity.year && (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Year</label>
                                            {isEditingOpportunity ? (
                                                <TextField
                                                    name="year"
                                                    type="text"
                                                    variant="outlined"
                                                    value={opportunityForm.year}
                                                    onChange={handleOpportunityChange}
                                                    placeholder="Enter year"
                                                    className="w-full"
                                                    InputProps={{
                                                        className: 'rounded-lg text-sm',
                                                    }}
                                                />
                                            ) : (
                                                <TextField
                                                    variant="outlined"
                                                    value={opportunityData.year}
                                                    className="w-full"
                                                    disabled
                                                    InputProps={{
                                                        className: 'bg-gray-50 rounded-lg text-sm',
                                                    }}
                                                />
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                                        {isEditingOpportunity ? (
                                            <textarea
                                                name="description"
                                                value={opportunityForm.description}
                                                onChange={handleOpportunityChange}
                                                className="w-full rounded-lg border border-gray-300 p-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                                rows={4}
                                            />
                                        ) : (
                                            <textarea
                                                value={opportunityData.description || 'N/A'}
                                                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"
                                                rows={4}
                                                disabled
                                            />
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                                <Calendar className="mr-1 inline h-4 w-4" />
                                                Close Date
                                            </label>
                                            {isEditingOpportunity ? (
                                                <TextField
                                                    name="close_date"
                                                    type="date"
                                                    variant="outlined"
                                                    value={opportunityForm.close_date}
                                                    onChange={handleOpportunityChange}
                                                    className="w-full"
                                                    InputProps={{
                                                        className: 'rounded-lg text-sm',
                                                    }}
                                                />
                                            ) : (
                                                <TextField
                                                    variant="outlined"
                                                    value={new Date(opportunityData.close_date).toISOString().split('T')[0]}
                                                    className="w-full"
                                                    disabled
                                                    InputProps={{
                                                        className: 'bg-gray-50 rounded-lg text-sm',
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Amount (Ksh)</label>
                                            {isEditingOpportunity ? (
                                                <TextField
                                                    name="amount"
                                                    type="number"
                                                    variant="outlined"
                                                    value={opportunityForm.amount}
                                                    onChange={handleOpportunityChange}
                                                    placeholder="Enter amount"
                                                    className="w-full"
                                                    InputProps={{
                                                        className: 'rounded-lg text-sm',
                                                    }}
                                                />
                                            ) : (
                                                <TextField
                                                    variant="outlined"
                                                    value={opportunityData.amount ? `Ksh ${opportunityData.amount.toLocaleString()}` : 'N/A'}
                                                    className="w-full"
                                                    disabled
                                                    InputProps={{
                                                        className: 'bg-gray-50 rounded-lg text-sm',
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Stage</label>
                                        {isEditingOpportunity ? (
                                            <Autocomplete
                                                options={opportunityStages.map((s) => s.title)}
                                                value={opportunityForm.stage as OpportunityStage}
                                                onChange={handleStageChange}
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
                                            />
                                        ) : (
                                            <TextField
                                                variant="outlined"
                                                value={
                                                    opportunityStages.find((s) => s.title === opportunityData.stage)?.label || opportunityData.stage
                                                }
                                                className="w-full"
                                                disabled
                                                InputProps={{
                                                    className: 'bg-gray-50 rounded-lg text-sm',
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Last Updated</label>
                                        <TextField
                                            variant="outlined"
                                            value={
                                                opportunityData.last_update?.updated_at
                                                    ? new Date(opportunityData.last_update.updated_at).toLocaleString()
                                                    : ''
                                            }
                                            className="w-full"
                                            disabled
                                            InputProps={{
                                                className: 'bg-gray-50 rounded-lg text-sm',
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Opportunity Assistant Clerk</label>
                                        {isEditingOpportunity ? (
                                            <Autocomplete
                                                options={
                                                    users?.map((user) => ({
                                                        id: user.id,
                                                        label: user.name,
                                                    })) || []
                                                }
                                                getOptionLabel={(option) => option.label}
                                                value={
                                                    users?.find((user) => user.id === opportunityForm.assistantClerkId)
                                                        ? {
                                                              id: opportunityForm.assistantClerkId,
                                                              label: users.find((user) => user.id === opportunityForm.assistantClerkId)?.name || '',
                                                          }
                                                        : null
                                                }
                                                onChange={(event, newValue) => {
                                                    setOpportunityForm((prev) => ({
                                                        ...prev,
                                                        assistantClerkId: newValue?.id || '',
                                                    }));
                                                }}
                                                loading={isLoadingUsers}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        variant="outlined"
                                                        placeholder="Select user"
                                                        className="w-full"
                                                        InputProps={{
                                                            ...params.InputProps,
                                                            className: 'rounded-lg text-sm',
                                                        }}
                                                    />
                                                )}
                                            />
                                        ) : (
                                            <TextField
                                                variant="outlined"
                                                value={
                                                    opportunityData.assistant_clerk?.role === 'super_staff'
                                                        ? opportunityData.prepared_by || 'Laura'
                                                        : opportunityData.assistant_clerk?.name
                                                }
                                                className="w-full"
                                                disabled
                                                InputProps={{
                                                    className: 'bg-gray-50 rounded-lg text-sm',
                                                }}
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Created By</label>
                                        <TextField
                                            variant="outlined"
                                            value={
                                                opportunityData.created_by.role === 'super_staff'
                                                    ? opportunityData.prepared_by || 'Laura'
                                                    : opportunityData.created_by.name
                                            }
                                            className="w-full"
                                            disabled
                                            InputProps={{
                                                className: 'bg-gray-50 rounded-lg text-sm',
                                            }}
                                        />
                                    </div>
                                    {isEditingOpportunity && (
                                        <div className="flex flex-col gap-3 sm:flex-row">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleSaveOpportunity}
                                                disabled={isUpdatingOpportunity}
                                                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:px-6 sm:py-3"
                                            >
                                                {isUpdatingOpportunity ? (
                                                    <span className="flex items-center justify-center">
                                                        <svg
                                                            className="mr-2 -ml-1 h-4 w-4 animate-spin text-white sm:h-5 sm:w-5"
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
                                                        Saving...
                                                    </span>
                                                ) : (
                                                    <>
                                                        <Save className="mr-1 inline h-4 w-4" />
                                                        Save
                                                    </>
                                                )}
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleCancelEditOpportunity}
                                                className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:px-6 sm:py-3"
                                            >
                                                <X className="mr-1 inline h-4 w-4" />
                                                Cancel
                                            </motion.button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="w-full space-y-6 lg:w-1/2">
                            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-600" />
                                    <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Contact Details</h3>
                                </div>
                                <div className="space-y-4">
                                    {opportunityData.contact.type === 'INSTITUTION' && (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Institution Name</label>
                                            <TextField
                                                variant="outlined"
                                                value={opportunityData.contact.institution || 'N/A'}
                                                className="w-full"
                                                disabled
                                                InputProps={{
                                                    className: 'bg-gray-50 rounded-lg text-sm',
                                                }}
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Contact Person</label>
                                        <TextField
                                            variant="outlined"
                                            value={
                                                opportunityForm.contact_person
                                                    ? `${opportunityForm.contact_person.first_name || ''} ${opportunityForm.contact_person.last_name || ''}`
                                                    : 'N/A'
                                            }
                                            className="w-full"
                                            disabled
                                            InputProps={{
                                                className: 'bg-gray-50 rounded-lg text-sm',
                                            }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Phone Number</label>
                                            <TextField
                                                variant="outlined"
                                                value={opportunityForm.contact_person?.phone || 'N/A'}
                                                className="w-full"
                                                disabled
                                                InputProps={{
                                                    className: 'bg-gray-50 rounded-lg text-sm',
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Email Address</label>
                                            <TextField
                                                variant="outlined"
                                                value={opportunityForm.contact_person?.email || 'N/A'}
                                                className="w-full"
                                                disabled
                                                InputProps={{
                                                    className: 'bg-gray-50 rounded-lg text-sm',
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                {otherContactPersons.length > 0 && (
                                    <Accordion className="mt-5">
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon size={22} />}
                                            aria-controls="other-contact-persons-content"
                                            id="other-contact-persons-header"
                                        >
                                            <Typography>Other Contact Persons</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <List>
                                                {otherContactPersons.map((person) => (
                                                    <ListItem key={person.id}>
                                                        <ListItemText
                                                            primary={`${person.first_name || ''} ${person.last_name || ''}`}
                                                            secondary={
                                                                <>
                                                                    {person.email && <Typography>Email: {person.email}</Typography>}
                                                                    {person.phone && <Typography>Phone: {person.phone}</Typography>}
                                                                    {person.title && <Typography>Title: {person.title}</Typography>}
                                                                </>
                                                            }
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </AccordionDetails>
                                    </Accordion>
                                )}
                            </div>
                            <div className="space-y-6">
                                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                                    <motion.div
                                        className="flex cursor-pointer items-center justify-between p-4 sm:p-6"
                                        onClick={() => toggleSection('files')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <File className="h-5 w-5 text-indigo-600" />
                                            <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Files</h3>
                                        </div>
                                        {expandedSections.files ? (
                                            <ChevronUp className="h-5 w-5 text-gray-600" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-gray-600" />
                                        )}
                                    </motion.div>
                                    <AnimatePresence>
                                        {expandedSections.files && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="px-4 pb-4 sm:px-6 sm:pb-6"
                                            >
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-gray-700">Upload Files</label>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            onChange={(e) => {
                                                                const files = Array.from(e.target.files || []);
                                                                setFileForm((prev) => ({
                                                                    ...prev,
                                                                    files: files,
                                                                }));
                                                            }}
                                                            className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                                                        />
                                                        {fileForm.files.length > 0 && (
                                                            <div className="mt-2">
                                                                <p className="text-sm text-gray-600">Selected Files:</p>
                                                                <ul className="list-disc pl-5 text-sm text-gray-600">
                                                                    {fileForm.files.map((file, index) => (
                                                                        <li key={index} className="flex items-center gap-2">
                                                                            <span>{file.name}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveOpportunityFile(index)}
                                                                                className="text-red-500 hover:text-red-700"
                                                                            >
                                                                                <Trash className="h-4 w-4" />
                                                                            </button>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="mb-2 block text-sm font-medium text-gray-700">Add File Link</label>
                                                        <div className="flex flex-col gap-2 sm:flex-row">
                                                            <TextField
                                                                name="newLink"
                                                                variant="outlined"
                                                                value={fileForm.newLink}
                                                                onChange={handleFileLinkChange}
                                                                placeholder="Enter file URL"
                                                                className="w-full sm:flex-1"
                                                                InputProps={{
                                                                    className: 'rounded-lg text-sm',
                                                                }}
                                                            />
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={handleAddFileLink}
                                                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                                                            >
                                                                Add Link
                                                            </motion.button>
                                                        </div>
                                                        {fileForm.fileLinks.length > 0 && (
                                                            <div className="mt-2">
                                                                <p className="text-sm text-gray-600">Added Links:</p>
                                                                <ul className="list-disc pl-5 text-sm text-gray-600">
                                                                    {fileForm.fileLinks.map((link, index) => (
                                                                        <li key={index} className="flex items-center gap-2">
                                                                            <a
                                                                                href={link}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="truncate text-indigo-600 hover:underline"
                                                                            >
                                                                                {link}
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveOpportunityLink(index)}
                                                                                className="text-red-500 hover:text-red-700"
                                                                            >
                                                                                <Trash className="h-4 w-4" />
                                                                            </button>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={handleUploadFiles}
                                                        disabled={isUploadingFiles}
                                                        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:px-6 sm:py-3"
                                                    >
                                                        {isUploadingFiles ? (
                                                            <span className="flex items-center justify-center">
                                                                <svg
                                                                    className="mr-2 -ml-1 h-4 w-4 animate-spin text-white sm:h-5 sm:w-5"
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
                                                                Uploading...
                                                            </span>
                                                        ) : (
                                                            'Upload Files'
                                                        )}
                                                    </motion.button>
                                                </div>
                                                <div className="mt-6">
                                                    <h4 className="mb-2 text-sm font-medium text-gray-700">File History</h4>
                                                    {allFiles.length ? (
                                                        <ul className="space-y-2">
                                                            {allFiles.map((file, index) => (
                                                                <motion.li
                                                                    key={index}
                                                                    className="rounded-lg bg-gray-50 p-4 shadow-sm"
                                                                    initial={{ opacity: 1 }}
                                                                    animate={{ opacity: 1 }}
                                                                    exit={{ opacity: 0 }}
                                                                >
                                                                    <div className="flex cursor-pointer flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                                                                        <div>
                                                                            <a
                                                                                href={file.path}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="truncate text-sm font-medium text-indigo-600 hover:underline"
                                                                            >
                                                                                {file.name}
                                                                            </a>
                                                                            <p className="text-xs text-gray-500">
                                                                                {file.type === 'email' ? 'From email attachment' : 'Opportunity file'}
                                                                            </p>
                                                                        </div>
                                                                        {file.type === 'opportunity' && (
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.1 }}
                                                                                onClick={() => handleDeleteFile(file)}
                                                                                className="text-red-600 hover:text-red-800"
                                                                                disabled={deletingFilePath === file.path}
                                                                            >
                                                                                {deletingFilePath === file.path ? (
                                                                                    <svg
                                                                                        className="h-4 w-4 animate-spin text-red-600"
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
                                                                                ) : (
                                                                                    <Trash className="h-4 w-4" />
                                                                                )}
                                                                            </motion.button>
                                                                        )}
                                                                    </div>
                                                                </motion.li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">No files recorded.</p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                                    <motion.div
                                        className="flex cursor-pointer items-center justify-between p-4 sm:p-6"
                                        onClick={() => toggleSection('emails')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-5 w-5 text-indigo-600" />
                                            <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Email History</h3>
                                        </div>
                                        {expandedSections.emails ? (
                                            <ChevronUp className="h-5 w-5 text-gray-600" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-gray-600" />
                                        )}
                                    </motion.div>
                                    <AnimatePresence>
                                        {expandedSections.emails && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="px-4 pb-4 sm:px-6 sm:pb-6"
                                            >
                                                {emailActivities?.length ? (
                                                    <ul className="space-y-2">
                                                        {emailActivities.map((email) => (
                                                            <motion.li
                                                                key={email.id}
                                                                className="rounded-lg bg-gray-50 p-4 shadow-sm"
                                                                initial={{ opacity: 1 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                            >
                                                                <div
                                                                    className="flex cursor-pointer flex-col items-start justify-between gap-2 sm:flex-row sm:items-center"
                                                                    onClick={() => toggleExpand('emails', email.id)}
                                                                >
                                                                    <div>
                                                                        <p className="truncate text-sm font-medium text-gray-800">
                                                                            {email.subject}{' '}
                                                                            <span className="text-xs text-gray-500">({email.type})</span>
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            {new Date(email.created_at).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                    {expandedItems.emails.includes(email.id) ? (
                                                                        <ChevronUp className="h-4 w-4 text-gray-600" />
                                                                    ) : (
                                                                        <ChevronDown className="h-4 w-4 text-gray-600" />
                                                                    )}
                                                                </div>
                                                                <AnimatePresence>
                                                                    {expandedItems.emails.includes(email.id) && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            transition={{ duration: 0.3 }}
                                                                            className="mt-2"
                                                                        >
                                                                            <div
                                                                                className="prose max-w-none text-sm text-gray-600"
                                                                                dangerouslySetInnerHTML={{
                                                                                    __html: email.description,
                                                                                }}
                                                                            />
                                                                            {email.attachments?.length > 0 && (
                                                                                <div className="mt-2">
                                                                                    <p className="text-sm text-gray-600">Attachments:</p>
                                                                                    <ul className="list-disc pl-5 text-sm text-gray-600">
                                                                                        {email.attachments?.map((file: any, index: number) => (
                                                                                            <li key={index}>
                                                                                                <a
                                                                                                    href={file.filePath}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="text-indigo-600 hover:underline"
                                                                                                >
                                                                                                    {file.fileName}
                                                                                                </a>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            )}
                                                                            <p className="mt-2 text-sm text-gray-600">
                                                                                Created by: {email.super_staff || email.created_by?.name || 'N/A'}
                                                                            </p>
                                                                            <div className="mt-2 flex gap-2">
                                                                                <motion.button
                                                                                    whileHover={{ scale: 1.1 }}
                                                                                    onClick={() => handleEditEmail(email)}
                                                                                    className="text-indigo-600 hover:text-indigo-800"
                                                                                >
                                                                                    <Edit className="h-4 w-4" />
                                                                                </motion.button>
                                                                                <motion.button
                                                                                    whileHover={{ scale: 1.1 }}
                                                                                    onClick={() => handleDeleteEmail(email.id)}
                                                                                    className="text-red-600 hover:text-red-800"
                                                                                    disabled={deletingEmailId === email.id}
                                                                                >
                                                                                    {deletingEmailId === email.id ? (
                                                                                        <svg
                                                                                            className="h-4 w-4 animate-spin text-red-600"
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
                                                                                    ) : (
                                                                                        <Trash className="h-4 w-4" />
                                                                                    )}
                                                                                </motion.button>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </motion.li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-gray-500">No email activities recorded.</p>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                                    <motion.div
                                        className="flex cursor-pointer items-center justify-between p-4 sm:p-6"
                                        onClick={() => toggleSection('calls')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-5 w-5 text-indigo-600" />
                                            <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Call History</h3>
                                        </div>
                                        {expandedSections.calls ? (
                                            <ChevronUp className="h-5 w-5 text-gray-600" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-gray-600" />
                                        )}
                                    </motion.div>
                                    <AnimatePresence>
                                        {expandedSections.calls && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="px-4 pb-4 sm:px-6 sm:pb-6"
                                            >
                                                {callLogs?.length ? (
                                                    <ul className="space-y-2">
                                                        {callLogs.map((call) => (
                                                            <motion.li
                                                                key={call.id}
                                                                className="rounded-lg bg-gray-50 p-4 shadow-sm"
                                                                initial={{ opacity: 1 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                            >
                                                                <div
                                                                    className="flex cursor-pointer flex-col items-start justify-between gap-2 sm:flex-row sm:items-center"
                                                                    onClick={() => toggleExpand('calls', call.id)}
                                                                >
                                                                    <div>
                                                                        <p className="truncate text-sm font-medium text-gray-800">{call.subject}</p>
                                                                        <p className="text-xs text-gray-500">
                                                                            {new Date(call.created_at).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                    {expandedItems.calls.includes(call.id) ? (
                                                                        <ChevronUp className="h-4 w-4 text-gray-600" />
                                                                    ) : (
                                                                        <ChevronDown className="h-4 w-4 text-gray-600" />
                                                                    )}
                                                                </div>
                                                                <AnimatePresence>
                                                                    {expandedItems.calls.includes(call.id) && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            transition={{ duration: 0.3 }}
                                                                            className="mt-2"
                                                                        >
                                                                            <p className="text-sm text-gray-600">{call.description}</p>
                                                                            <p className="mt-2 text-sm text-gray-600">
                                                                                Created by: {call.super_staff || call.created_by?.name || 'N/A'}
                                                                            </p>
                                                                            <div className="mt-2 flex gap-2">
                                                                                <motion.button
                                                                                    whileHover={{ scale: 1.1 }}
                                                                                    onClick={() => handleEditCall(call)}
                                                                                    className="text-indigo-600 hover:text-indigo-800"
                                                                                >
                                                                                    <Edit className="h-4 w-4" />
                                                                                </motion.button>
                                                                                <motion.button
                                                                                    whileHover={{ scale: 1.1 }}
                                                                                    onClick={() => handleDeleteCall(call.id)}
                                                                                    className="text-red-600 hover:text-red-800"
                                                                                    disabled={isDeletingCall}
                                                                                >
                                                                                    {isDeletingCall ? (
                                                                                        <svg
                                                                                            className="h-4 w-4 animate-spin text-red-600"
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
                                                                                    ) : (
                                                                                        <Trash className="h-4 w-4" />
                                                                                    )}
                                                                                </motion.button>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </motion.li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-gray-500">No call logs recorded.</p>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 sm:mt-8">
                        {userNames.length > 1 && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">Edited By</label>
                                <select
                                    name="editedBy"
                                    value={editedBy}
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
                        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <Mail className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Email Activities</h3>
                            </div>
                            <Tabs
                                value={activeEmailTab}
                                onChange={(e, newValue) => {
                                    setActiveEmailTab(newValue);
                                    setEmailForm({
                                        subject: '',
                                        description: '',
                                        type: 'sent' as 'sent' | 'received',
                                        template_id: '',
                                        attachments: [] as File[],
                                    });
                                }}
                                sx={{ marginBottom: 2 }}
                                variant="fullWidth"
                                centered
                            >
                                <Tab label="Send" value="send" />
                                <Tab label="Log" value="log" />
                            </Tabs>
                            <div className="space-y-4">
                                {activeEmailTab === 'send' && (
                                    <>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Email Template</label>
                                            <Autocomplete
                                                options={emailTemplates?.map((t) => t.name) || []}
                                                value={
                                                    emailForm.template_id
                                                        ? emailTemplates?.find((t) => t.id === emailForm.template_id)?.name || ''
                                                        : ''
                                                }
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
                                            {!validateEmail(opportunityForm.email) ? (
                                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
                                                    This contact doesn't have a valid email address. Please edit the contact to include a valid email.
                                                </div>
                                            ) : (
                                                <QuillEditor
                                                    value={emailForm.description}
                                                    onChange={(value) =>
                                                        setEmailForm((prev) => ({
                                                            ...prev,
                                                            description: value,
                                                        }))
                                                    }
                                                />
                                            )}
                                        </div>
                                        <>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                                    Email Password{emailConfigSaved && '(Saved)'}
                                                </label>
                                                <TextField
                                                    name="subject"
                                                    variant="outlined"
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={emailPassword}
                                                    onChange={(e) => setEmailPassword(e.target.value)}
                                                    placeholder="Enter your email password"
                                                    className="w-full"
                                                    slotProps={{
                                                        input: {
                                                            className: 'rounded-lg text-sm',
                                                            endAdornment: (
                                                                <InputAdornment position="end">
                                                                    <IconButton
                                                                        onClick={handleTogglePasswordVisibility}
                                                                        edge="end"
                                                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                                    >
                                                                        {showPassword ? (
                                                                            <EyeOff className="h-5 w-5 text-gray-500" />
                                                                        ) : (
                                                                            <Eye className="h-5 w-5 text-gray-500" />
                                                                        )}
                                                                    </IconButton>
                                                                </InputAdornment>
                                                            ),
                                                        },
                                                    }}
                                                />
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
                                                        Saving...
                                                    </span>
                                                ) : (
                                                    'Save email password'
                                                )}
                                            </motion.button>
                                        </>
                                        {/* )} */}
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
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveFile(index)}
                                                                    className="ml-2 text-red-500 hover:text-red-700"
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleSendEmail}
                                            disabled={isCreatingEmail || isUpdatingEmail || isSendingEmail || !validateEmail(opportunityForm.email)}
                                            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:px-6 sm:py-3"
                                        >
                                            {isCreatingEmail || isUpdatingEmail || isSendingEmail ? (
                                                <span className="flex items-center justify-center">
                                                    <svg
                                                        className="mr-2 -ml-1 h-4 w-4 animate-spin text-white sm:h-5 sm:w-5"
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
                                                    {editingEmail ? 'Updating...' : 'Sending...'}
                                                </span>
                                            ) : editingEmail ? (
                                                'Update Email'
                                            ) : (
                                                'Send Email'
                                            )}
                                        </motion.button>
                                    </>
                                )}
                                {activeEmailTab === 'log' && (
                                    <>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Email Type</label>
                                            <select
                                                name="type"
                                                value={emailForm.type}
                                                onChange={handleEmailChange}
                                                className="w-full rounded-lg border border-gray-300 p-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="sent">Sent</option>
                                                <option value="received">Received</option>
                                            </select>
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
                                                InputProps={{
                                                    className: 'rounded-lg text-sm',
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                                            <QuillEditor
                                                value={emailForm.description}
                                                onChange={(value) =>
                                                    setEmailForm((prev) => ({
                                                        ...prev,
                                                        description: value,
                                                    }))
                                                }
                                            />
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleLogEmail}
                                            disabled={isCreatingEmail || isUpdatingEmail}
                                            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:px-6 sm:py-3"
                                        >
                                            {isCreatingEmail || isUpdatingEmail ? (
                                                <span className="flex items-center justify-center">
                                                    <svg
                                                        className="mr-2 -ml-1 h-4 w-4 animate-spin text-white sm:h-5 sm:w-5"
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
                                                    {editingEmail ? 'Updating...' : 'Logging...'}
                                                </span>
                                            ) : editingEmail ? (
                                                'Update Email'
                                            ) : (
                                                'Log Email'
                                            )}
                                        </motion.button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 sm:mt-8">
                        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                            <div className="mb-4 flex items-center gap-2">
                                <Phone className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-base font-semibold text-gray-900 sm:text-lg">Call Logs</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
                                    <TextField
                                        name="subject"
                                        variant="outlined"
                                        value={callForm.subject}
                                        onChange={handleCallChange}
                                        placeholder="Enter call subject"
                                        className="w-full"
                                        InputProps={{
                                            className: 'rounded-lg text-sm',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                        name="description"
                                        value={callForm.description}
                                        onChange={handleCallChange}
                                        placeholder="Enter call details"
                                        className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                                        rows={4}
                                    />
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleLogCall}
                                    disabled={isCreatingCall || isUpdatingCall}
                                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:px-6 sm:py-3"
                                >
                                    {isCreatingCall || isUpdatingCall ? (
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
                                            {editingCall ? 'Updating...' : 'Processing...'}
                                        </span>
                                    ) : editingCall ? (
                                        'Update Call'
                                    ) : (
                                        'Log Call'
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default OpportunityDetails;
