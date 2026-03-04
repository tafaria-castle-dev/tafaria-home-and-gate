import { useAuth } from '@/hooks/use-auth';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Building, Calendar, FileText, UserIcon, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface CreateOpportunityProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onSuccessfulSubmit: () => void;
}

interface Contact {
    id: string;
    institution: string;
    type: string;
    contactPersons: ContactPerson[];
}

interface ContactPerson {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    contact_id: string;
    contact?: { institution: string };
}

export interface OpportunityType {
    id: string;
    name: string;
}

const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^(\+|00)?(\d{1,3})?[\s\-.]?\(?(\d{1,4})\)?[\s\-.]?(\d{1,4})[\s\-.]?(\d{1,4})[\s\-.]?(\d{1,4})$/;
    const cleaned = phone.replace(/[\s\-+.()]/g, '');
    const digitCount = cleaned.replace(/\D/g, '').length;
    return phoneRegex.test(phone) && digitCount >= 4 && digitCount <= 15;
};

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

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

const CreateOpportunity: React.FC<CreateOpportunityProps> = ({ setActiveTab, onSuccessfulSubmit }) => {
    const opportunityStages = [
        { title: 'Qualify', label: 'Qualify', probability: 10 },
        { title: 'MeetAndPresent', label: 'Meet & Present', probability: 25 },
        { title: 'Propose', label: 'Propose', probability: 50 },
        { title: 'Negotiate', label: 'Negotiate', probability: 75 },
        { title: 'ClosedWon', label: 'Closed Won', probability: 100 },
        { title: 'ClosedLost', label: 'Closed Lost', probability: 0 },
    ];

    const { isAuthenticated, logout, user } = useAuth();

    const [formData, setFormData] = useState({
        selectedType: 'Institution',
        institution_name: '',
        selectedInstitution: null as Contact | null,
        name: '',
        phone: '',
        email: '',
        opportunity_type: '',
        description: '',
        stage: 'Qualify',
        probability: 10,
        close_date: '',
        amount: '',
        prepared_by: '',
        contact_person_id: '',
        is_school: false,
        student_year: '',
    });

    const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
    const [contactPersonSearchQuery, setContactPersonSearchQuery] = useState('');
    const [opportunityTypeSearchQuery, setOpportunityTypeSearchQuery] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
    const [opportunityTypes, setOpportunityTypes] = useState<OpportunityType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isContactsLoading, setIsContactsLoading] = useState(false);
    const [isContactPersonsLoading, setIsContactPersonsLoading] = useState(false);
    const [isOpportunityTypesLoading, setIsOpportunityTypesLoading] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        }
    }, [isAuthenticated]);

    useEffect(() => {
        const savedFormData = localStorage.getItem('opportunityForm');
        if (savedFormData) {
            const parsedData = JSON.parse(savedFormData);
            setFormData({
                selectedType: parsedData.selectedType || 'Institution',
                institution_name: parsedData.institution_name || '',
                selectedInstitution: null,
                name: parsedData.name || '',
                phone: parsedData.phone || '',
                email: parsedData.email || '',
                opportunity_type: parsedData.opportunity_type || '',
                description: parsedData.description || '',
                stage: parsedData.stage || 'Qualify',
                probability: parsedData.probability || 10,
                close_date: parsedData.close_date || '',
                amount: parsedData.amount || '',
                prepared_by: parsedData.prepared_by || user?.name?.split(',')[0]?.trim() || user?.name || '',
                contact_person_id: parsedData.contact_person_id || '',
                is_school: parsedData.is_school,
                student_year: parsedData.student_year,
            });
        } else {
            setFormData((prev) => ({
                ...prev,
                selectedType: 'Institution',
                prepared_by: user?.name?.split(',')[0]?.trim() || user?.name || '',
                contact_person_id: '',
            }));
        }
    }, [user?.name]);

    useEffect(() => {
        const fetchData = async () => {
            setIsContactsLoading(true);
            setIsContactPersonsLoading(true);
            setIsOpportunityTypesLoading(true);

            try {
                const [contactsResponse, contactPersonsResponse, opportunityTypesResponse] = await Promise.all([
                    axios.get('/api/contacts'),
                    axios.get('/api/contact-persons'),
                    axios.get('/api/opportunity-names'),
                ]);
                const transformedContacts = contactsResponse.data?.results?.map((contact) => ({
                    ...contact,
                    created_at: contact.created_at,
                    contactPersons: contact.contact_persons?.map((person) => ({
                        ...person,
                    })),
                    contact_persons: undefined,
                }));

                setContacts(transformedContacts);
                setContactPersons(contactPersonsResponse.data);
                setOpportunityTypes(opportunityTypesResponse.data);
            } catch (error) {
                toast.error('Failed to fetch data.');
            } finally {
                setIsContactsLoading(false);
                setIsContactPersonsLoading(false);
                setIsOpportunityTypesLoading(false);
            }
        };

        fetchData();
    }, []);

    const institutions = React.useMemo(() => {
        return contacts?.filter((contact) => contact.type === 'INSTITUTION') as Contact[];
    }, [contacts]);

    const institutionContactPersons = React.useMemo(() => {
        if (!formData.selectedInstitution) return [];
        return formData.selectedInstitution.contactPersons || [];
    }, [formData.selectedInstitution]);

    const allContactPersons = React.useMemo(() => {
        return contactPersons.map((person) => ({
            ...person,
            institution_name: person.contact?.institution || '',
        }));
    }, [contactPersons]);

    const saveLocally = (name: string, value: any) => {
        setFormData((prev) => {
            const updatedFormData = { ...prev, [name]: value };
            if (JSON.stringify(prev[name]) !== JSON.stringify(value)) {
                localStorage.setItem('opportunityForm', JSON.stringify(updatedFormData));
            }
            return updatedFormData;
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const updatedFormData = {
                ...prev,
                [name]: name === 'stage' ? value : value,
            };
            if (name === 'stage') {
                const selectedStage = opportunityStages.find((stage) => stage.title === value);
                updatedFormData.probability = selectedStage?.probability || 0;
            }
            localStorage.setItem('opportunityForm', JSON.stringify(updatedFormData));
            return updatedFormData;
        });
    };

    const handleInstitutionAutocompleteChange = (event: any, newValue: string | Contact | null) => {
        let institution_name = '';
        let selectedInstitution: Contact | null = null;

        if (typeof newValue === 'string') {
            institution_name = newValue;
            selectedInstitution = institutions.find((inst) => inst.institution === newValue) || null;
        } else {
            institution_name = newValue?.institution || '';
            selectedInstitution = newValue;
        }

        if (institution_name && !selectedInstitution && institution_name.length >= 3) {
            toast.error('No matching institution found. Please create a new one.');
        }

        setFormData((prev) => ({
            ...prev,
            institution_name,
            selectedInstitution,
            name: '',
            phone: '',
            email: '',
            contact_person_id: '',
        }));

        setContactPersonSearchQuery('');
    };

    const handleContactPersonAutocompleteChange = (event: any, newValue: ContactPerson | null) => {
        if (newValue) {
            let institution_name = '';
            if (formData.selectedType === 'Individual') {
                institution_name = '';
            }
            setFormData((prev) => ({
                ...prev,
                name: `${newValue.first_name || ''} ${newValue.last_name || ''}`.trim(),
                phone: newValue.phone || '',
                email: newValue.email || '',
                contact_person_id: newValue.id || '',
                ...(formData.selectedType === 'Individual' && { institution_name }),
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                name: '',
                phone: '',
                email: '',
                contact_person_id: '',
                ...(formData.selectedType === 'Individual' && { institution_name: '' }),
            }));
        }
    };

    const handleOpportunityTypeAutocompleteChange = (event: any, newValue: string | OpportunityType | null) => {
        const opportunityTypeValue = typeof newValue === 'object' && newValue ? newValue.name : newValue || '';
        setFormData((prev) => ({
            ...prev,
            opportunity_type: opportunityTypeValue,
        }));
    };

    const resetForm = () => {
        localStorage.removeItem('opportunityForm');
        setFormData({
            selectedType: 'Institution',
            institution_name: '',
            selectedInstitution: null,
            name: '',
            phone: '',
            email: '',
            opportunity_type: '',
            description: '',
            stage: 'Qualify',
            probability: 0,
            close_date: '',
            amount: '',
            prepared_by: '',
            contact_person_id: '',
            is_school: false,
            student_year: '',
        });
        setInstitutionSearchQuery('');
        setContactPersonSearchQuery('');
        setOpportunityTypeSearchQuery('');
    };

    const handleCreateOpportunity = async () => {
        if (!formData.name) {
            toast.error('Please enter contact name');
            return;
        }
        if (!formData.opportunity_type) {
            toast.error('Please enter opportunity type');
            return;
        }
        if (!formData.close_date) {
            toast.error('Please select a close date');
            return;
        }
        if (formData.phone && !validatePhoneNumber(formData.phone)) {
            toast.error('Please enter a valid phone number (4-15 digits)');
            return;
        }
        if (formData.email && !validateEmail(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        try {
            setIsLoading(true);
            let contact_id = null;
            let contact_person_id = formData.contact_person_id;

            let existingContact: any = null;

            if (formData.selectedType === 'Institution') {
                existingContact = contacts?.find((contact) => contact.institution === formData.institution_name && contact.type === 'INSTITUTION');
            } else {
                const selectedContactPerson = allContactPersons.find((person) => person.id === contact_person_id);
                if (selectedContactPerson) {
                    existingContact = contacts?.find((contact) => contact.id === selectedContactPerson.contact_id);
                }
            }

            if (existingContact) {
                contact_id = existingContact.id;
            } else {
                toast.error('Contact not found. Please select an existing contact.');
                return;
            }

            if (!contact_person_id) {
                toast.error('Contact person not found. Please select a valid contact person.');
                return;
            }

            await axios.post('/api/opportunities', {
                name: formData.opportunity_type,
                description: formData.description || null,
                stage: formData.stage,
                probability: formData.probability,
                close_date: new Date(formData.close_date),
                amount: formData.amount ? parseFloat(formData.amount) : null,
                year: formData.is_school ? formData.student_year : null,
                contact_id: contact_id,
                contact_person_id,
                assistant_clerk_id: user?.id,
                created_by_id: user?.id,
            });

            toast.success('Opportunity created successfully!');
            resetForm();
            setActiveTab('view');
            onSuccessfulSubmit();
        } catch (error) {
            toast.error('Failed to create opportunity. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const userNames = user?.name?.split(',').map((name) => name.trim()) || [];

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
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                        <UserIcon className="h-6 w-6 text-white sm:h-8 sm:w-8" />
                        <h2 className="truncate text-xl font-bold text-white sm:text-2xl">Create New Opportunity</h2>
                    </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                        <div className="w-full space-y-6 lg:w-1/2">
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-base font-semibold text-gray-800 sm:text-lg">Contact Type</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`rounded-xl border-2 p-4 text-sm transition-all duration-200 sm:text-base ${
                                            formData.selectedType === 'Institution'
                                                ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                                        }`}
                                        onClick={() => {
                                            saveLocally('selectedType', 'Institution');
                                            setFormData((prev) => ({
                                                ...prev,
                                                institution_name: '',
                                                selectedInstitution: null,
                                                name: '',
                                                phone: '',
                                                email: '',
                                                contact_person_id: '',
                                            }));
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
                                        className={`rounded-xl border-2 p-4 text-sm transition-all duration-200 sm:text-base ${
                                            formData.selectedType === 'Individual'
                                                ? 'border-blue-600 bg-blue-600 text-white shadow-lg'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                                        }`}
                                        onClick={() => {
                                            saveLocally('selectedType', 'Individual');
                                            setFormData((prev) => ({
                                                ...prev,
                                                institution_name: '',
                                                selectedInstitution: null,
                                                name: '',
                                                phone: '',
                                                email: '',
                                                contact_person_id: '',
                                            }));
                                            setInstitutionSearchQuery('');
                                            setContactPersonSearchQuery('');
                                        }}
                                    >
                                        <Users className="mx-auto mb-2 h-5 w-5" />
                                        <span className="font-medium">Individual</span>
                                    </motion.button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {formData.selectedType === 'Institution' && (
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Institution Name</label>
                                        <Autocomplete
                                            options={filterOptions(institutions, institutionSearchQuery, (inst) => inst.institution)}
                                            value={formData.selectedInstitution}
                                            inputValue={institutionSearchQuery}
                                            onInputChange={(event, newInputValue) => {
                                                setInstitutionSearchQuery(newInputValue);
                                            }}
                                            onChange={handleInstitutionAutocompleteChange}
                                            loading={isContactsLoading}
                                            getOptionLabel={(option) => (typeof option === 'string' ? option : option?.institution || '')}
                                            renderOption={(props, option) => (
                                                <li {...props} key={option.id}>
                                                    {highlightMatch(option.institution, institutionSearchQuery)}
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
                                            noOptionsText={institutionSearchQuery.length < 3 ? 'Type at least 3 characters' : 'No institutions found'}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">
                                        Contact Person
                                        {formData.selectedType === 'Institution' && formData.selectedInstitution && (
                                            <span className="ml-2 text-xs text-gray-500">({institutionContactPersons.length} available)</span>
                                        )}
                                    </label>
                                    {formData.selectedType === 'Institution' ? (
                                        <Autocomplete
                                            key={`institution-${formData.selectedInstitution?.id || 'none'}`}
                                            options={institutionContactPersons}
                                            value={
                                                institutionContactPersons.find(
                                                    (p) => `${p.first_name || ''} ${p.last_name || ''}`.trim() === formData.name,
                                                ) || null
                                            }
                                            inputValue={contactPersonSearchQuery}
                                            onInputChange={(event, newInputValue) => {
                                                setContactPersonSearchQuery(newInputValue);
                                            }}
                                            onChange={handleContactPersonAutocompleteChange}
                                            loading={isContactsLoading}
                                            disabled={!formData.selectedInstitution}
                                            getOptionLabel={(option) => `${option.first_name || ''} ${option.last_name || ''}`.trim()}
                                            renderOption={(props, option) => (
                                                <li {...props} key={option.id}>
                                                    <div>
                                                        <div className="font-medium">
                                                            {`${option.first_name || ''} ${option.last_name || ''}`.trim()}
                                                        </div>
                                                        {option.email && <div className="text-sm text-gray-500">{option.email}</div>}
                                                    </div>
                                                </li>
                                            )}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    variant="outlined"
                                                    placeholder={
                                                        !formData.selectedInstitution
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
                                                !formData.selectedInstitution
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
                                            value={allContactPersons.find((p) => `${p.first_name} ${p.last_name}`.trim() === formData.name) || null}
                                            inputValue={contactPersonSearchQuery}
                                            onInputChange={(event, newInputValue) => {
                                                setContactPersonSearchQuery(newInputValue);
                                            }}
                                            onChange={handleContactPersonAutocompleteChange}
                                            loading={isContactPersonsLoading}
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
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Phone Number</label>
                                        <TextField
                                            type="tel"
                                            variant="outlined"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="Phone number"
                                            className="w-full"
                                            disabled
                                            slotProps={{ input: { className: 'rounded-lg text-sm bg-gray-50' } }}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Email Address</label>
                                        <TextField
                                            name="email"
                                            variant="outlined"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Email address"
                                            className="w-full"
                                            disabled
                                            slotProps={{ input: { className: 'rounded-lg text-sm bg-gray-50' } }}
                                        />
                                    </div>
                                </div>
                                {formData.selectedInstitution && (
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="is_school"
                                                name="is_school"
                                                checked={formData.is_school}
                                                onChange={(e) => {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        is_school: e.target.checked,
                                                        student_year: e.target.checked ? prev.student_year : '',
                                                    }));
                                                    saveLocally('is_school', e.target.checked);
                                                    if (!e.target.checked) {
                                                        saveLocally('student_year', '');
                                                    }
                                                }}
                                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="is_school" className="ml-2 block text-lg font-medium text-gray-700">
                                                Is this a school?
                                            </label>
                                        </div>
                                        {formData.is_school && (
                                            <div>
                                                <label className="mb-2 block text-lg font-medium text-gray-700">Year of Visiting Students</label>
                                                <TextField
                                                    variant="outlined"
                                                    name="student_year"
                                                    value={formData.student_year}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        saveLocally('student_year', e.target.value);
                                                    }}
                                                    placeholder="e.g., Year 9"
                                                    className="w-full"
                                                    slotProps={{ input: { className: 'rounded-lg text-sm' } }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-full space-y-6 lg:w-1/2">
                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:p-6">
                                <div className="mb-4 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-green-600" />
                                    <h3 className="text-base font-semibold text-gray-800 sm:text-lg">Opportunity Details</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Opportunity Type</label>
                                        <Autocomplete
                                            options={filterOptions(opportunityTypes, opportunityTypeSearchQuery, (opp) => opp.name)}
                                            value={formData.opportunity_type}
                                            inputValue={opportunityTypeSearchQuery}
                                            onInputChange={(event, newInputValue) => {
                                                setOpportunityTypeSearchQuery(newInputValue);
                                            }}
                                            onChange={handleOpportunityTypeAutocompleteChange}
                                            loading={isOpportunityTypesLoading}
                                            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                                            renderOption={(props, option) => (
                                                <li {...props} key={option.id}>
                                                    {highlightMatch(option.name, opportunityTypeSearchQuery)}
                                                </li>
                                            )}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    variant="outlined"
                                                    placeholder="Type at least 3 characters to search opportunity types"
                                                    className="w-full"
                                                    InputProps={{
                                                        ...params.InputProps,
                                                        className: 'rounded-lg text-sm py-1',
                                                    }}
                                                />
                                            )}
                                            freeSolo
                                            noOptionsText={
                                                opportunityTypeSearchQuery.length < 3 ? 'Type at least 3 characters' : 'No opportunity types found'
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            placeholder="Enter opportunity description (optional)"
                                            className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                            rows={4}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                                <Calendar className="mr-1 inline h-4 w-4" />
                                                Close Date
                                            </label>
                                            <TextField
                                                type="date"
                                                variant="outlined"
                                                name="close_date"
                                                value={formData.close_date}
                                                onChange={handleChange}
                                                className="w-full"
                                                required
                                                slotProps={{
                                                    inputLabel: { shrink: true },
                                                    input: { className: 'rounded-lg text-sm' },
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Amount (KSh)</label>
                                            <TextField
                                                type="number"
                                                variant="outlined"
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleChange}
                                                placeholder="Optional"
                                                className="w-full"
                                                slotProps={{ input: { className: 'rounded-lg text-sm' } }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Stage</label>
                                        <select
                                            name="stage"
                                            value={formData.stage}
                                            onChange={handleChange}
                                            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                                        >
                                            {opportunityStages.map((stage) => (
                                                <option key={stage.title} value={stage.title}>
                                                    {stage.label} ({stage.probability}%)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {userNames.length > 1 && (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-gray-700">Prepared By</label>
                                            <select
                                                name="prepared_by"
                                                value={formData.prepared_by || userNames[0]}
                                                onChange={handleChange}
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
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end sm:mt-8">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-full rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white shadow-md transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto sm:px-10 sm:py-3 sm:text-base"
                            onClick={handleCreateOpportunity}
                            disabled={isLoading}
                        >
                            {isLoading ? (
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
                                    Creating...
                                </span>
                            ) : (
                                'Create'
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CreateOpportunity;
