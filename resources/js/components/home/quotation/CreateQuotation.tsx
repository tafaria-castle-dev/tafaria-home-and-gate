/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAuth } from '@/hooks/use-auth';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { motion } from 'framer-motion';
import { BookmarkIcon, Calendar, FileText, LucideUsersRound, UserIcon } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdditionalForm, { AdditionalService } from '../AdditionalForm';
import AdditionalNotes from './AdditionalNotes';
import BookingSummary from './BookingSummary';
import PaxAdult from './pax/PaxAdult';
import PaxKids from './pax/PaxKids';
import RoomConfig from './RoomConfig';

interface CreateQuotationProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    formData: any;
}

interface Institution {
    id: string | number;
    name: string;
    contactPersons: any[];
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

interface OpportunityType {
    id: string;
    name: string;
}

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^(\+|00)?(\d{1,3})?[\s\-.]?\(?(\d{1,4})\)?[\s\-.]?(\d{1,4})[\s\-.]?(\d{1,4})[\s\-.]?(\d{1,4})$/;
    const cleaned = phone?.replace(/[\s\-+.()]/g, '');
    const digitCount = cleaned?.replace(/\D/g, '').length;
    return phoneRegex.test(phone) && digitCount >= 4 && digitCount <= 15;
};

const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query || query.length < 3) return text;
    const regex = new RegExp(`(${query?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
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

const filterOptions = (options: any[], query: string, getLabel: (option: any) => string) => {
    if (!query || query.length < 3) return options;
    return options
        .filter((option) => {
            const label = getLabel(option).toLowerCase();
            return label.includes(query.toLowerCase());
        })
        .slice(0, 10);
};

const CreateQuotation: React.FC<CreateQuotationProps> = ({ activeTab, setActiveTab, setFormData, formData }) => {
    const { isAuthenticated, user } = useAuth();
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [isLoadingAdditionals, setIsLoadingAdditionals] = useState(false);
    const [isLoadingOpportunityTypes, setIsLoadingOpportunityTypes] = useState(false);
    const [contactsData, setContactsData] = useState<any[]>([]);
    const [additionals, setAdditionals] = useState<any[]>([]);
    const [opportunityTypes, setOpportunityTypes] = useState<OpportunityType[]>([]);
    const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
    const [contactPersonSearchQuery, setContactPersonSearchQuery] = useState('');
    const [opportunityTypeSearchQuery, setOpportunityTypeSearchQuery] = useState('');
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [loadingQuotation, setLoadingQuotation] = useState(false);
    const [showInstitution, setShowInstitution] = useState(true);
    const [accommodationNotes, setAccommodationNotes] = useState<any[]>([]);
    const opportunityStages = [
        { title: 'Qualify', label: 'Qualify', probability: 10 },
        { title: 'MeetAndPresent', label: 'Meet & Present', probability: 25 },
        { title: 'Propose', label: 'Propose', probability: 50 },
        { title: 'Negotiate', label: 'Negotiate', probability: 75 },
        { title: 'ClosedWon', label: 'Closed Won', probability: 100 },
        { title: 'ClosedLost', label: 'Closed Lost', probability: 0 },
    ];

    const fetchContacts = useCallback(async () => {
        setIsLoadingContacts(true);
        try {
            const response = await axios.get('/api/contacts');
            const transformedContacts = response.data?.results?.map((contact) => ({
                ...contact,
                created_at: contact.created_at,
                contactPersons: contact.contact_persons.map((person) => ({
                    ...person,
                })),
                contact_persons: undefined,
            }));
            setContactsData(transformedContacts || []);
            setIsLoadingContacts(false);
        } catch (error) {
            toast.error('Failed to fetch contacts');
            setIsLoadingContacts(false);
        }
    }, []);

    const fetchAdditionals = useCallback(async () => {
        setIsLoadingAdditionals(true);
        try {
            const response = await axios.get('/api/additionals');
            setAdditionals(response.data || []);
            setIsLoadingAdditionals(false);
        } catch (error) {
            toast.error('Failed to fetch additionals');
            setIsLoadingAdditionals(false);
        }
    }, []);

    const fetchOpportunityTypes = useCallback(async () => {
        setIsLoadingOpportunityTypes(true);
        try {
            const response = await axios.get('/api/opportunity-names');
            setOpportunityTypes(response.data || []);
            setIsLoadingOpportunityTypes(false);
        } catch (error) {
            toast.error('Failed to fetch opportunity types');
            setIsLoadingOpportunityTypes(false);
        }
    }, []);

    const fetchAccommodationNotes = useCallback(async () => {
        try {
            const response = await axios.get('/api/accommodation-notes');
            setAccommodationNotes(response.data || []);
        } catch (error) {
            toast.error('Failed to fetch accommodation notes');
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchContacts();
            fetchAdditionals();
            fetchOpportunityTypes();
            fetchAccommodationNotes();
        }
    }, [isAuthenticated, fetchContacts, fetchAdditionals, fetchOpportunityTypes, fetchAccommodationNotes]);

    const institutions = React.useMemo((): Institution[] => {
        if (!contactsData) return [];
        return contactsData
            ?.filter((contact) => contact.type === 'INSTITUTION')
            ?.map((contact) => ({
                id: contact.id,
                name: contact.institution,
                contactPersons: contact.contactPersons,
            }));
    }, [contactsData]);

    const institutionContactPersons = React.useMemo(() => {
        if (!contactsData || !formData.institutionName) return [];
        const selectedInstitution = institutions.find((inst) => inst.name === formData.institutionName);
        return selectedInstitution?.contactPersons || [];
    }, [contactsData, formData.institutionName]);

    const allContactPersons = React.useMemo(() => {
        if (!contactsData) return [];
        return contactsData.flatMap((contact) =>
            contact?.contactPersons?.map((person: any) => ({
                ...person,
                institutionName: contact.institution,
            })),
        );
    }, [contactsData]);

    const resetForm = () => {
        localStorage.removeItem('quotationForm');
        setInstitutionSearchQuery('');
        setContactPersonSearchQuery('');
        setOpportunityTypeSearchQuery('');
    };

    const setAdults = (adults: number) => {
        saveLocally('adults', String(adults));
    };

    const setKids = (kids: { id: number; age: number }[]) => {
        setFormData((prev: any) => ({ ...prev, kids }));
        saveLocally('kids', kids);
    };

    useEffect(() => {
        if (!formData.notes && formData.selectedAdditionalServices) {
            const hasStudents = formData.selectedAdditionalServices.some(
                (service: AdditionalService) => service.name && /student|students/i.test(service.name),
            );
            const defaultNote = hasStudents
                ? accommodationNotes?.find((note) => note.name === 'educational')?.description
                : accommodationNotes?.find((note) => note.name === 'general')?.description;
            saveLocally('notes', defaultNote);
        }
    }, [formData.notes, formData.selectedAdditionalServices, accommodationNotes]);

    const saveLocally = (name: string, value: string | { id: number; age: number }[] | any) => {
        setFormData((prevFormData: any) => {
            const updatedFormData = { ...prevFormData, [name]: value };
            if (JSON.stringify(prevFormData[name]) === JSON.stringify(value)) {
                return prevFormData;
            }
            localStorage.setItem('quotationForm', JSON.stringify(updatedFormData));
            return updatedFormData;
        });
    };

    const capitalizeWords = (str: any) => {
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

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        const newValue = type === 'checkbox' ? (checked ? true : 0) : value;
        if (type === 'checkbox' && checked === false) {
            saveLocally('numNights', 1);
        }
        if (type === 'checkbox' && checked === true) {
            await saveLocally('checkOut', '');
            await saveLocally('checkIn', '');
            setFormData((prevData: any) => ({
                ...prevData,
                checkIn: '',
                checkOut: '',
            }));
        }
        setFormData((prev: any) => {
            const updatedFormData = {
                ...prev,
                [name]: name === 'institutionName' || name === 'name' ? capitalizeWords(newValue) : newValue,
            };
            localStorage.setItem('quotationForm', JSON.stringify(updatedFormData));
            return updatedFormData;
        });
    };

    const handleInstitutionAutocompleteChange = (event: any, newValue: any | null) => {
        let institutionName = '';
        let selectedInstitution: Institution | null = null;

        if (typeof newValue === 'string') {
            institutionName = newValue;
            selectedInstitution = institutions.find((inst) => inst.name === newValue) || null;
        } else if (newValue && typeof newValue === 'object') {
            institutionName = newValue.name || '';
            selectedInstitution = newValue;
        }

        if (institutionName && !selectedInstitution && institutionName.length >= 3) {
            toast.error('No matching institution found. Please create a new one.');
        }

        setFormData((prev: any) => ({
            ...prev,
            institutionName,
            name: '',
            phone: '',
            email: '',
            contact_person_id: '',
        }));
        setContactPersonSearchQuery('');
    };

    const handleContactPersonAutocompleteChange = (event: any, newValue: any | null) => {
        if (newValue) {
            let institutionName = '';
            if (formData.selectedType === 'Corporate') {
                const matchedInstitution = institutions.find((inst) => inst.contactPersons.some((person) => person.id === newValue.id));
                institutionName = matchedInstitution?.name || newValue.institutionName || '';
            }

            setFormData((prev: any) => ({
                ...prev,
                name: [newValue.first_name, newValue.last_name].filter(Boolean).join(' ').trim(),
                phone: newValue.phone || '',
                email: newValue.email || '',
                contact_person_id: newValue.id || '',
                ...(formData.selectedType === 'Corporate' && {
                    institutionName: institutionName,
                }),
                ...(formData.selectedType === 'Leisure' && {
                    institutionName: '',
                }),
            }));
        } else {
            setFormData((prev: any) => ({
                ...prev,
                name: '',
                phone: '',
                email: '',
                contact_person_id: '',
                ...(formData.selectedType === 'Leisure' && {
                    institutionName: '',
                }),
            }));
        }
    };

    const handleOpportunityTypeAutocompleteChange = (event: any, newValue: string | OpportunityType | null) => {
        const opportunityTypeValue = typeof newValue === 'object' && newValue ? newValue.name : newValue || '';
        setFormData((prev: any) => ({
            ...prev,
            opportunity_type: opportunityTypeValue,
        }));
    };

    useEffect(() => {
        if (user) {
            saveLocally('signature', user.signature || '');
            saveLocally('preparedBy', user.name?.split(',')[0]?.trim() || user.name);
        }
    }, [user]);

    useEffect(() => {
        const savedFormData = localStorage.getItem('quotationForm');
        if (savedFormData) {
            const parsedData = JSON.parse(savedFormData);
            setFormData({
                ...parsedData,
                opportunity_type: parsedData.opportunity_type || '',
                stage: parsedData.stage || 'Qualify',
                probability: parsedData.probability || 10,
                student_year: parsedData.student_year || '',
                is_school: parsedData.is_school || false,
            });
        }
    }, []);

    const updateRoomDetails = (
        updater:
            | ((prev: { [key: string]: { people: number; cost: number } }) => {
                  [key: string]: { people: number; cost: number };
              })
            | { [key: string]: { people: number; cost: number } },
    ) => {
        setFormData((prev: any) => {
            const newRoomDetails = typeof updater === 'function' ? updater(prev.roomDetails) : updater;
            saveLocally('roomDetails', newRoomDetails);
            return {
                ...prev,
                roomDetails: newRoomDetails,
            };
        });
    };

    const updateSelectedAdditionalServices = (updater: ((prev: AdditionalService[]) => AdditionalService[]) | AdditionalService[]) => {
        setFormData((prev: any) => {
            const currentSelected = prev.selectedAdditionalServices || [];
            const newSelectedAdditionalServices = typeof updater === 'function' ? updater(currentSelected) : updater;
            const uniqueDescriptions = [
                ...new Set(newSelectedAdditionalServices.map((service) => service.description).filter((desc) => desc && desc.trim() !== '')),
            ];

            const servicesNotes = uniqueDescriptions.join('\n');
            const updatedFormData = {
                ...prev,
                selectedAdditionalServices: newSelectedAdditionalServices,
                notes: servicesNotes,
            };
            localStorage.setItem('quotationForm', JSON.stringify(updatedFormData));
            return updatedFormData;
        });
    };

    const createOpportunity = async (contact_id: string, contact_person_id: string) => {
        if (!formData.name) {
            throw new Error('Please enter contact name');
        }
        if (!formData.opportunity_type) {
            throw new Error('Please enter opportunity type');
        }
        if (formData.phone && !validatePhoneNumber(formData.phone)) {
            throw new Error('Please enter a valid phone number (4-15 digits)');
        }
        if (formData.email && !validateEmail(formData.email)) {
            throw new Error('Please enter a valid email address');
        }

        const selectedStage = opportunityStages.find((stage) => stage.title === formData.stage) || opportunityStages[0];

        await axios.post('/api/opportunities', {
            name: formData.opportunity_type,
            description: null,
            stage: formData.stage || 'Qualify',
            probability: formData.probability || selectedStage.probability,
            close_date: new Date(),
            amount: localStorage.getItem('totalCost') ? parseFloat(localStorage.getItem('totalCost')!) : null,
            year: formData.is_school ? formData.student_year : null,
            contact_id,
            prepared_by: formData.preparedBy || user?.name?.split(',')[0]?.trim() || user?.name || '',
            contact_person_id,
            assistant_clerk_id: user?.id,
            created_by_id: user?.id,
        });
    };

    const updateOpportunity = async (contact_id: string, contact_person_id: string) => {
        if (!formData.name) {
            throw new Error('Please enter contact name');
        }
        if (!formData.opportunity_type) {
            throw new Error('Please enter opportunity type');
        }
        if (formData.phone && !validatePhoneNumber(formData.phone)) {
            throw new Error('Please enter a valid phone number (4-15 digits)');
        }
        if (formData.email && !validateEmail(formData.email)) {
            throw new Error('Please enter a valid email address');
        }

        const selectedStage = opportunityStages.find((stage) => stage.title === formData.stage) || opportunityStages[0];

        await axios.put(`/api/opportunities/${formData?.id}`, {
            name: formData.opportunity_type,
            description: formData.notes || null,
            stage: formData.stage || 'Qualify',
            probability: formData.probability || selectedStage.probability,
            amount: localStorage.getItem('totalCost') ? parseFloat(localStorage.getItem('totalCost')!) : null,
            year: formData.is_school ? formData.student_year : null,
            contact_id,
            prepared_by: formData.preparedBy || user?.name?.split(',')[0]?.trim() || user?.name || '',
            contact_person_id,
        });
    };

    const computeContactIds = () => {
        if (formData.contact_id) {
            return { contact_id: formData.contact_id, contact_person_id: formData.contact_person_id };
        }
        let contact_id = null;
        let contact_person_id = formData.contact_person_id;

        let existingContact: any = null;

        if (formData.selectedType === 'Corporate') {
            existingContact = contactsData?.find((contact) => contact.institution === formData.institutionName && contact.type === 'INSTITUTION');
        } else {
            const selectedContactPerson = allContactPersons.find((person) => person.id === contact_person_id);
            if (selectedContactPerson) {
                existingContact = contactsData?.find((contact) => contact.id === selectedContactPerson.contact_id);
            }
        }

        if (existingContact) {
            contact_id = existingContact.id;
        } else {
            throw new Error('Contact not found. Please select an existing contact.');
        }

        if (!contact_person_id) {
            throw new Error('Contact person not found. Please select a valid contact person.');
        }

        return { contact_id, contact_person_id };
    };

    const handleGenerateQuotation = async () => {
        if (!formData.name) {
            toast.error('Please enter client name');
            return;
        }
        if (!formData.phone && !formData.email) {
            toast.error('Please enter either a valid phone number or email address');
            return;
        }
        if (formData.email && !validateEmail(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (!formData.preparedBy) {
            toast.error('Please select a name for Prepared By');
            return;
        }
        if (!formData.opportunity_type && activeTab !== 'edit') {
            toast.error('Please enter opportunity type');
            return;
        }
        await handleAddQuotation();
    };

    const handleSaveAsDraft = async () => {
        if (!formData.name) {
            toast.error('Please enter client name');
            return;
        }
        if (!formData.phone && !formData.email) {
            toast.error('Please enter either a valid phone number or email address');
            return;
        }
        if (formData.email && !validateEmail(formData.email)) {
            toast.error('Enter valid email address');
            return;
        }
        if (!formData.preparedBy) {
            toast.error('Please select a name for Prepared By');
            return;
        }
        if (!formData.opportunity_type && activeTab !== 'edit') {
            toast.error('Please enter opportunity type');
            return;
        }
        setLoadingDraft(true);
        await handleDraftQuotation();
    };

    const handleAddQuotation = async () => {
        setLoadingQuotation(true);
        const timestamp = Date.now();
        const refNo = timestamp.toString();
        let contact_id: string | null = null;
        let contact_person_id: string = formData.contact_person_id;

        try {
            const { contact_id: computedContactId, contact_person_id: computedContactPersonId } = computeContactIds();
            contact_id = computedContactId;
            contact_person_id = computedContactPersonId;

            const payload = {
                user_id: user?.id,
                contact_id,
                contact_person_id,
                status: 'pending',
                no_accommodation: formData.no_accommodation || false,
                quotation_details: {
                    ...formData,
                    refNo: formData.refNo || refNo,
                    status: 'pending',
                },
            };

            if (activeTab === 'edit') {
                const id = localStorage.getItem('id');
                await axios.put(`/api/quotations/${id}`, {
                    contact_id,
                    contact_person_id,
                    status: 'pending',
                    no_accommodation: formData.no_accommodation || false,
                    quotation_details: {
                        ...formData,
                        refNo: formData.refNo,
                    },
                });
                // await updateOpportunity(contact_id, contact_person_id);
                toast.success('Quotation data updated!');
                setActiveTab('view');
                resetForm();
            } else {
                saveLocally('refNo', refNo);
                setFormData((prevFormData: any) => ({
                    ...prevFormData,
                    refNo: refNo,
                }));
                await axios.post('/api/quotations', payload);
                await createOpportunity(contact_id || '', contact_person_id || '');
                await axios.post('/api/admin/notification', {
                    refNo: refNo,
                    name: formData.name,
                    totalCost: localStorage.getItem('totalCost'),
                    institutionName: formData.institutionName || '',
                });
                toast.success('Quotation and Opportunity created!');
                setActiveTab('view');
                resetForm();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to create/update quotation and opportunity!');
        } finally {
            setLoadingQuotation(false);
        }
    };

    const handleDraftQuotation = async () => {
        setLoadingDraft(true);
        const timestamp = Date.now();
        const refNo = timestamp.toString();
        let contact_id: string | null = null;
        let contact_person_id: string = formData.contact_person_id;

        try {
            const { contact_id: computedContactId, contact_person_id: computedContactPersonId } = computeContactIds();
            contact_id = computedContactId;
            contact_person_id = computedContactPersonId;

            const payload = {
                user_id: user?.id,
                contact_id,
                contact_person_id,
                status: 'draft',
                no_accommodation: formData.no_accommodation || false,
                quotation_details: {
                    ...formData,
                    refNo: formData.refNo || refNo,
                },
            };

            if (activeTab === 'edit') {
                const id = localStorage.getItem('id');
                await axios.put(`/api/quotations/${id}`, {
                    contact_id,
                    contact_person_id,
                    status: 'draft',
                    no_accommodation: formData.no_accommodation || false,
                    quotation_details: {
                        ...formData,
                        refNo: formData.refNo || refNo,
                    },
                });
                toast.success('Saved as Draft');
                setActiveTab('view');
                resetForm();
            } else {
                saveLocally('refNo', refNo);
                setFormData((prevFormData: any) => ({
                    ...prevFormData,
                    refNo: refNo,
                }));
                await axios.post('/api/quotations', payload);
                await createOpportunity(contact_id || '', contact_person_id || '');
                await axios.post('/api/admin/draft-notification', {
                    refNo: refNo,
                    totalCost: localStorage.getItem('totalCost'),
                    institutionName: formData.institutionName || '',
                    name: formData.name,
                });
                toast.success('Draft and Opportunity saved!');
                setActiveTab('view');
                resetForm();
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to save draft and opportunity!');
        } finally {
            setLoadingDraft(false);
        }
    };

    const userNames = user?.name?.split(',').map((name) => name.trim()) || [];

    useEffect(() => {
        if (formData.checkIn && formData.checkOut) {
            const checkInDate = new Date(formData.checkIn);
            const checkOutDate = new Date(formData.checkOut);
            const diffTime = checkOutDate.getTime() - checkInDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
            saveLocally('numNights', String(diffDays > 0 ? diffDays : 0));
        }
    }, [formData.checkIn, formData.checkOut]);

    const handleDiscountChange = (val: string, newDiscount: any) => {
        setFormData((prev: any) => ({ ...prev, [val]: newDiscount }));
    };

    const numPeopleIncludingKids = () => {
        const adults = parseInt(formData.adults) || 0;
        const kidsOver3 = Array.isArray(formData.kids) ? formData.kids.filter((kid) => parseInt(kid.age) > 3).length : 0;
        return adults + kidsOver3;
    };

    const handleSelectChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        const newValue = type === 'checkbox' ? (checked ? true : 0) : value;
        if (type === 'checkbox' && checked === false) {
            saveLocally('numNights', 1);
        }
        if (type === 'checkbox' && checked === true) {
            await saveLocally('checkOut', '');
            await saveLocally('checkIn', '');
            setFormData((prevData: any) => ({
                ...prevData,
                checkIn: '',
                checkOut: '',
            }));
        }
        if (name === 'stage') {
            const selectedStage = opportunityStages.find((stage) => stage.title === value);
            setFormData((prev: any) => ({
                ...prev,
                stage: value,
                probability: selectedStage?.probability || 10,
            }));
            saveLocally('stage', value);
            saveLocally('probability', selectedStage?.probability || 10);
        } else {
            setFormData((prev: any) => {
                const updatedFormData = { ...prev, [name]: newValue };
                localStorage.setItem('quotationForm', JSON.stringify(updatedFormData));
                return updatedFormData;
            });
        }
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-6 p-6">
            <motion.div className="w-full rounded-lg border border-gray-300 bg-white">
                <div className="mb-4 flex items-center gap-2 border-b bg-gray-100 pb-4 pl-4">
                    <UserIcon className="mt-4 h-6 w-6 text-gray-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-700">Client Information</h3>
                </div>
                <div className="mb-4 flex flex-col gap-4 px-4 md:flex-row">
                    <div className="flex justify-between gap-2">
                        <div className="flex-1">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                animate={{
                                    backgroundColor: formData.selectedType === 'Corporate' ? '#22c55e' : '#d1d5db',
                                    color: formData.selectedType === 'Corporate' ? 'white' : 'black',
                                }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="w-full rounded-md px-6 py-3 font-semibold shadow-md"
                                onClick={() => {
                                    saveLocally('selectedType', 'Corporate');
                                    setShowInstitution(true);
                                }}
                            >
                                Corporate
                            </motion.button>
                        </div>
                        <div className="flex-1">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                animate={{
                                    backgroundColor: formData.selectedType === 'Leisure' ? '#22c55e' : '#d1d5db',
                                    color: formData.selectedType === 'Leisure' ? 'white' : 'black',
                                }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                className="w-full rounded-md px-6 py-3 font-semibold shadow-md"
                                onClick={() => {
                                    saveLocally('updatedRoomDetails', []);
                                    saveLocally('selectedType', 'Leisure');
                                    saveLocally('institutionName', '');
                                    setShowInstitution(false);
                                }}
                            >
                                Leisure
                            </motion.button>
                        </div>
                    </div>
                    {formData.selectedType === 'Corporate' && (
                        <div className="flex-1">
                            <Autocomplete<Institution>
                                options={filterOptions(institutions, institutionSearchQuery, (inst) => inst.name)}
                                value={institutions.find((inst) => inst.name === formData.institutionName) || null}
                                inputValue={institutionSearchQuery}
                                onInputChange={(event, newInputValue) => {
                                    setInstitutionSearchQuery(newInputValue);
                                }}
                                onChange={handleInstitutionAutocompleteChange}
                                loading={isLoadingContacts}
                                getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
                                renderOption={(props, option) => (
                                    <li {...props} key={option.id}>
                                        {highlightMatch(option.name, institutionSearchQuery)}
                                    </li>
                                )}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Institution Name"
                                        variant="outlined"
                                        placeholder="Type at least 3 characters to search institutions"
                                        InputProps={{
                                            ...params.InputProps,
                                            className: 'rounded-lg text-sm',
                                        }}
                                    />
                                )}
                                noOptionsText={institutionSearchQuery.length < 3 ? 'Type at least 3 characters' : 'No institutions found'}
                            />
                        </div>
                    )}
                    <div className="flex-1">
                        <Autocomplete
                            options={
                                formData.selectedType === 'Corporate' && formData.institutionName
                                    ? institutionContactPersons
                                    : filterOptions(
                                          allContactPersons,
                                          contactPersonSearchQuery,
                                          (person) => `${person.first_name || ''} ${person.last_name || ''}`,
                                      )
                            }
                            value={
                                (formData.selectedType === 'Corporate' && formData.institutionName
                                    ? institutionContactPersons.find((p) => `${p.first_name || ''} ${p.last_name || ''}`.trim() === formData.name)
                                    : allContactPersons.find((p) => `${p.first_name || ''} ${p.last_name || ''}`.trim() === formData.name)) || null
                            }
                            inputValue={contactPersonSearchQuery}
                            onInputChange={(event, newInputValue) => {
                                setContactPersonSearchQuery(newInputValue);
                            }}
                            onChange={handleContactPersonAutocompleteChange}
                            loading={isLoadingContacts}
                            getOptionLabel={(option) => `${option.first_name || ''} ${option.last_name || ''}`.trim()}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    <div>
                                        <div className="font-medium">
                                            {highlightMatch(`${option.first_name || ''} ${option.last_name || ''}`.trim(), contactPersonSearchQuery)}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {option.institutionName && `${option.institutionName} • `}
                                            {option.email}
                                        </div>
                                    </div>
                                </li>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Contact Person"
                                    variant="outlined"
                                    placeholder={
                                        formData.selectedType === 'Corporate' && !formData.institutionName
                                            ? 'Select an institution first'
                                            : 'Type at least 3 characters to search contact persons'
                                    }
                                    InputProps={{
                                        ...params.InputProps,
                                        className: 'rounded-lg text-sm',
                                    }}
                                />
                            )}
                            noOptionsText={
                                formData.selectedType === 'Corporate' && !formData.institutionName
                                    ? 'Select an institution first'
                                    : contactPersonSearchQuery.length < 3
                                      ? 'Type at least 3 characters'
                                      : 'No contact persons found'
                            }
                        />
                    </div>
                    <div className="flex-1">
                        <TextField
                            type="tel"
                            label="Phone Number"
                            variant="outlined"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            disabled
                            slotProps={{
                                input: {
                                    className: 'rounded-lg text-sm bg-gray-50',
                                },
                            }}
                        />
                    </div>
                    <div className="flex-1">
                        <TextField
                            name="email"
                            label="Email Address"
                            variant="outlined"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled
                            slotProps={{
                                input: {
                                    className: 'rounded-lg text-sm bg-gray-50',
                                },
                            }}
                        />
                    </div>
                    {userNames.length > 1 && (
                        <div className="flex-1">
                            <label className="mb-2 block text-sm text-gray-600">Prepared By</label>
                            <select
                                name="preparedBy"
                                value={formData.preparedBy || userNames[0]}
                                onChange={handleSelectChange}
                                className="flex-1 rounded-lg border p-2 focus:ring-2 focus:ring-blue-500"
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
                {formData.selectedType === 'Corporate' && (
                    <div className="mb-4 px-4">
                        {activeTab !== 'edit' && (
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
                        )}
                        {formData.is_school && activeTab !== 'edit' && (
                            <div className="mt-4">
                                <label className="mb-2 block text-lg font-medium text-gray-700">Year of Visiting Students</label>
                                <TextField
                                    variant="outlined"
                                    name="student_year"
                                    value={formData.student_year}
                                    onChange={handleChange}
                                    placeholder="e.g., Year 9"
                                    className="w-full"
                                    slotProps={{ input: { className: 'rounded-lg text-sm' } }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
            <div className="w-full">
                {activeTab !== 'edit' && (
                    <motion.div className="w-full rounded-lg border border-gray-300 bg-white">
                        <div className="mb-4 flex items-center gap-2 border-b bg-gray-100 pb-4 pl-4">
                            <FileText className="mt-4 h-6 w-6 text-gray-500" />
                            <h3 className="mt-4 text-lg font-semibold text-gray-700">Opportunity Details</h3>
                        </div>
                        <div className="mb-4 flex flex-col gap-4 px-4 md:flex-row">
                            <div className="flex-1">
                                <Autocomplete
                                    options={filterOptions(opportunityTypes, opportunityTypeSearchQuery, (opp) => opp.name)}
                                    value={formData.opportunity_type}
                                    inputValue={opportunityTypeSearchQuery}
                                    onInputChange={(event, newInputValue) => {
                                        setOpportunityTypeSearchQuery(newInputValue);
                                    }}
                                    onChange={handleOpportunityTypeAutocompleteChange}
                                    loading={isLoadingOpportunityTypes}
                                    getOptionLabel={(option) => (typeof option === 'string' ? option : option.name)}
                                    renderOption={(props, option) => (
                                        <li {...props} key={option.id}>
                                            {highlightMatch(option.name, opportunityTypeSearchQuery)}
                                        </li>
                                    )}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Opportunity Type"
                                            variant="outlined"
                                            placeholder="Type at least 3 characters to search opportunity types"
                                            InputProps={{
                                                ...params.InputProps,
                                                className: 'rounded-lg text-sm',
                                            }}
                                        />
                                    )}
                                    freeSolo
                                    noOptionsText={
                                        opportunityTypeSearchQuery.length < 3 ? 'Type at least 3 characters' : 'No opportunity types found'
                                    }
                                />
                            </div>
                            <div className="flex-1">
                                <label className="mb-2 block text-sm text-gray-600">Stage</label>
                                <select
                                    name="stage"
                                    value={formData.stage}
                                    onChange={handleSelectChange}
                                    className="w-full rounded-lg border p-2 focus:ring-2 focus:ring-blue-500"
                                >
                                    {opportunityStages.map((stage) => (
                                        <option key={stage.title} value={stage.title}>
                                            {stage.label} ({stage.probability}%)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            <motion.div className="w-full rounded-lg border border-gray-300 bg-white">
                <div className="mb-4 flex items-center gap-2 border-b bg-gray-100 pb-4 pl-4">
                    <Calendar className="mt-4 h-6 w-6 text-gray-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-700">Check-in Dates / Nights</h3>
                </div>
                <div className="mb-4 px-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            name="no_accommodation"
                            checked={formData.no_accommodation}
                            onChange={handleChange}
                            className="h-4 w-4"
                        />
                        No Accommodation Needed
                    </label>
                </div>
                <div className="mb-4 px-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" name="useNights" checked={formData.useNights} onChange={handleChange} className="h-4 w-4" />
                        Enter number of {formData.no_accommodation ? 'days' : 'nights'}
                    </label>
                </div>
                <div className="flex w-full flex-col gap-4 px-4 md:flex-row">
                    {!formData.useNights ? (
                        <>
                            <div className="mb-4 flex-1">
                                <label className="mb-2 block text-sm text-gray-600">Check-In</label>
                                <input
                                    type="date"
                                    name="checkIn"
                                    value={formData.checkIn}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border p-2 focus:ring-2 focus:ring-blue-500"
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="mb-2 block text-sm text-gray-600">Check-Out</label>
                                <input
                                    type="date"
                                    name="checkOut"
                                    value={formData.checkOut}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border p-2 focus:ring-2 focus:ring-blue-500"
                                    min={formData?.checkIn || new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="w-full">
                            <label className="mb-2 block text-sm text-gray-600">Number of {formData.no_accommodation ? 'days' : 'nights'}</label>
                            <input
                                type="number"
                                name="numNights"
                                value={formData.numNights}
                                onChange={handleChange}
                                min="1"
                                className="mb-5 rounded-lg border p-2 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                </div>
            </motion.div>
            <motion.div className="w-full rounded-lg border border-gray-300 bg-white">
                <div className="mb-4 flex items-center gap-2 border-b bg-gray-100 pb-4 pl-4">
                    <LucideUsersRound className="mt-4 h-6 w-6 text-gray-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-700">Guests</h3>
                </div>
                <div className="mb-8 flex w-full flex-row items-center gap-4 px-4">
                    <div className="w-auto">
                        <label className="mb-2 block text-sm text-gray-600">Pax {formData.adults}</label>
                        <PaxAdult selectedType={formData.selectedType} adults={formData.adults} setAdults={setAdults} />
                    </div>
                    {formData.selectedType === 'Leisure' && (
                        <div className="flex-1">
                            <label className="mb-2 block text-sm text-gray-600">Kids {formData.kids.length}</label>
                            <PaxKids kids={formData.kids} setKids={setKids} />
                        </div>
                    )}
                </div>
            </motion.div>
            {formData.numNights > 0 && !formData.no_accommodation && (
                <motion.div className="w-full rounded-lg border border-gray-300 bg-white">
                    <div className="mb-4 flex items-center gap-2 border-b bg-gray-100 pb-4 pl-4">
                        <LucideUsersRound className="mt-4 h-6 w-6 text-gray-500" />
                        <h3 className="mt-4 text-lg font-semibold text-gray-700">Room types</h3>
                    </div>
                    <div className="w-full flex-row items-center gap-4 px-4">
                        <div>
                            <RoomConfig
                                selectedType={formData.selectedType}
                                numNights={formData.numNights}
                                numOfPeople={formData.adults}
                                roomDetails={formData.roomDetails}
                                formData={formData}
                                setRoomDetails={updateRoomDetails}
                                setFormData={setFormData}
                                activeTab={activeTab}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
            <motion.div className="w-full rounded-lg border border-gray-300 bg-white">
                <div className="mb-4 flex items-center gap-2 border-b bg-gray-100 pb-4 pl-4">
                    <LucideUsersRound className="mt-4 h-6 w-6 text-gray-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-700">Tafaria experiences</h3>
                </div>
                <AdditionalForm
                    type={formData.selectedType}
                    numNights={formData.numNights > 0 ? formData.numNights : 1}
                    numPeople={numPeopleIncludingKids()}
                    setSelectedAdditionalServices={updateSelectedAdditionalServices}
                    selectedAdditionalServices={formData.selectedAdditionalServices}
                    additionals={additionals}
                    loading={isLoadingAdditionals}
                />
            </motion.div>
            <motion.div className="w-full rounded-lg border border-gray-300 bg-white">
                <div className="mb-4 flex items-center gap-2 border-b bg-gray-100 pb-4 pl-4">
                    <BookmarkIcon className="mt-4 h-6 w-6 text-gray-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-700">Quotation Summary</h3>
                </div>
                {formData.roomDetails && <BookingSummary setFormData={setFormData} formData={formData} onDiscountChange={handleDiscountChange} />}
            </motion.div>
            <motion.div className="w-full rounded-lg border border-gray-300 bg-white">
                <div className="mb-4 flex items-center gap-2 border-b bg-gray-100 pb-4 pl-4">
                    <LucideUsersRound className="mt-4 h-6 w-6 text-gray-500" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-700">Additional Notes</h3>
                </div>
                <div className="mb-8 flex w-full flex-row items-center gap-4 px-4">
                    <AdditionalNotes
                        value={formData.notes || ''}
                        onChange={(e) => {
                            setFormData({ ...formData, ['notes']: e.target.value });
                            saveLocally('notes', String(e.target.value));
                        }}
                    />
                </div>
            </motion.div>
            <div className="mt-4 flex items-center justify-center gap-4">
                <button
                    className={`rounded px-4 py-2 text-white transition-colors duration-300 ${
                        loadingDraft ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-500 hover:bg-blue-800'
                    }`}
                    onClick={handleSaveAsDraft}
                    disabled={loadingDraft}
                >
                    {loadingDraft ? 'Saving...' : 'Save as Draft'}
                </button>
                <button
                    type="submit"
                    disabled={loadingQuotation}
                    className="rounded bg-[#9b7b54] px-4 py-2 text-white hover:bg-[#9b7b54]"
                    onClick={handleGenerateQuotation}
                >
                    {loadingQuotation ? 'Creating...' : 'Create Quotation'}
                </button>
            </div>
        </div>
    );
};

export default CreateQuotation;
