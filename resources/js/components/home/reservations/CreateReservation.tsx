import { useAuth } from '@/hooks/use-auth';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Baby,
    Briefcase,
    Building2,
    CalendarCheck,
    CalendarX,
    Car,
    ChevronRight,
    ClipboardCheck,
    Footprints,
    MapPin,
    Phone,
    Receipt,
    RefreshCw,
    Save,
    Sparkles,
    Sunset,
    UserCheck,
    UserCog,
    Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
const generateReservationNumber = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};
type GuestReservationFormData = {
    guest_name: string;
    ref_no: string;
    visitor_type: string;
    section: string;
    check_in: string;
    check_out: string;
    contact_id: string;
    car_plate_number: string;
    reservation_number: string;
    contact_person_id: string;
    phone_number: string;
    kids_count: string;
    infants_count: string;
    adults_count: string;
    is_express_check_in: boolean;
    type: 'corporate' | 'leisure';
    entry_type: 'walk_in' | 'drive_in';
    checked_in_by_user_id: string;
    selectedContact: Contact | null;
    selectedContactPerson: ContactPerson | null;
    is_express_check_out: boolean;
    cleared_bills: boolean;
    cleared_bills_comments: string;
    cleared_bills_by_user_id: string;
    cleared_by_house_keeping: boolean;
    cleared_by_house_keeping_comments: string;
    cleared_by_house_keeping_user_id: string;
    entry_time: string;
    exit_time: string;
};

interface CreateGuestReservationProps {
    reservationId?: string | null;
    setActiveTab: (tab: string) => void;
    activeTab: string;
    onSuccessfulSubmit: () => void;
    onCancel?: () => void;
    initialData?: Partial<GuestReservationFormData> | null;
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

interface AppUser {
    id: string;
    name: string;
    email: string;
}

export const SECTIONS = [
    { value: 'office', label: 'Office', icon: '🏢' },
    { value: 'accommodation', label: 'Accommodation', icon: '👑' },
    { value: 'leisure_activities', label: 'Leisure Activities', icon: '🏖️' },
    { value: 'meals', label: 'Meals', icon: '🍽️' },
];
export const VISITOR_TYPES = [
    { value: 'Visitor', label: 'Visitor', icon: '👤' },
    { value: 'Contractor', label: 'Contractor', icon: '👷' },
    { value: 'Resident', label: 'Resident', icon: '🏠' },
];

const filterOptions = <T,>(options: T[], query: string, getLabel: (option: T) => string): T[] => {
    if (!query || query.length < 3) return options;
    return options.filter((option) => getLabel(option).toLowerCase().includes(query.toLowerCase())).slice(0, 10);
};

const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query || query.length < 3) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
        regex.test(part) ? (
            <span key={index} className="bg-[#93723c]/35 font-semibold text-[#93723c]/98">
                {part}
            </span>
        ) : (
            part
        ),
    );
};

const FieldLabel: React.FC<{ icon: React.ReactNode; label: string; required?: boolean }> = ({ icon, label, required }) => (
    <label className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-widest text-slate-500 uppercase">
        <span className="text-[#93723c]/300">{icon}</span>
        {label}
        {required && <span className="text-rose-400">*</span>}
    </label>
);

const SectionCard: React.FC<{
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    delay?: number;
    accentClass?: string;
}> = ({ title, subtitle, icon, children, delay = 0, accentClass = 'from-[#93723c]/50 to-orange-500' }) => (
    <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
            <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} shadow-sm`}>
                    <span className="text-white">{icon}</span>
                </div>
                <div>
                    <h3 className="font-bold tracking-tight text-slate-800">{title}</h3>
                    {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                </div>
            </div>
        </div>
        <div className="p-6">{children}</div>
    </motion.div>
);

const ToggleSwitch: React.FC<{
    name: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label: string;
    description?: string;
    icon: React.ReactNode;
    activeColor?: string;
    activeIconColor?: string;
}> = ({ name, checked, onChange, label, description, icon, activeColor = 'bg-[#93723c]/50', activeIconColor = 'text-[#93723c]/300' }) => (
    <label className="flex cursor-pointer items-start gap-3">
        <div className="relative mt-0.5 flex-shrink-0">
            <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only" />
            <div className={`h-6 w-11 rounded-full transition-colors duration-200 ${checked ? activeColor : 'bg-slate-200'}`} />
            <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    checked ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
        </div>
        <div className="flex items-start gap-2">
            <span className={`mt-0.5 transition-colors ${checked ? activeIconColor : 'text-slate-400'}`}>{icon}</span>
            <div>
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
            </div>
        </div>
    </label>
);

const muiInputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        backgroundColor: '#f8fafc',
        fontSize: '14px',
        '& fieldset': { borderColor: '#e2e8f0' },
        '&:hover fieldset': { borderColor: '#fbbf24' },
        '&.Mui-focused fieldset': { borderColor: '#f59e0b', borderWidth: '2px' },
        '&.Mui-focused': { backgroundColor: '#ffffff' },
        '&.Mui-disabled': { backgroundColor: '#f1f5f9' },
    },
};

const UserAutocomplete: React.FC<{
    label: string;
    icon: React.ReactNode;
    users: AppUser[];
    value: string;
    onChange: (id: string) => void;
    query: string;
    onQueryChange: (q: string) => void;
    loading?: boolean;
    placeholder?: string;
}> = ({ label, icon, users, value, onChange, query, onQueryChange, loading, placeholder }) => {
    const selected = users.find((u) => u.id === value) || null;
    return (
        <div>
            <FieldLabel icon={icon} label={label} />
            <Autocomplete
                options={filterOptions(users, query, (u) => u.name)}
                value={selected}
                inputValue={query}
                onInputChange={(_, v) => onQueryChange(v)}
                onChange={(_, newVal) => onChange(newVal?.id || '')}
                loading={loading}
                getOptionLabel={(o) => o.name}
                renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                        <div>
                            <div className="font-medium">{highlightMatch(option.name, query)}</div>
                            <div className="text-xs text-slate-500">{option.email}</div>
                        </div>
                    </li>
                )}
                renderInput={(params) => (
                    <TextField {...params} variant="outlined" placeholder={placeholder || 'Type 3+ characters to search'} sx={muiInputSx} />
                )}
                noOptionsText={query.length < 3 ? 'Type at least 3 characters' : 'No users found'}
            />
        </div>
    );
};

const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all duration-200 focus:border-[#93723c]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#902729]/50';

const selectClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 transition-all duration-200 focus:border-[#93723c]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#902729]/50 appearance-none cursor-pointer';

const CreateGuestReservation: React.FC<CreateGuestReservationProps> = ({ reservationId, onSuccessfulSubmit, onCancel, initialData }) => {
    const { isAuthenticated, user } = useAuth();
    const isEditMode = !!reservationId;
    const [formData, setFormData] = useState<GuestReservationFormData>({
        guest_name: '',
        ref_no: '',
        visitor_type: 'Visitor',
        section: '',
        check_in: '',
        check_out: '',
        contact_id: '',
        car_plate_number: '',
        reservation_number: generateReservationNumber(),
        contact_person_id: '',
        phone_number: '',
        kids_count: '',
        infants_count: '0',
        adults_count: '',
        is_express_check_in: false,
        type: 'corporate',
        entry_type: 'walk_in',
        checked_in_by_user_id: '',
        selectedContact: null,
        selectedContactPerson: null,
        is_express_check_out: false,
        cleared_bills: false,
        cleared_bills_comments: '',
        cleared_bills_by_user_id: '',
        cleared_by_house_keeping: false,
        cleared_by_house_keeping_comments: '',
        cleared_by_house_keeping_user_id: '',
        entry_time: '',
        exit_time: '',
    });
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [allContactPersons, setAllContactPersons] = useState<ContactPerson[]>([]);
    const [appUsers, setAppUsers] = useState<AppUser[]>([]);

    const [contactSearchQuery, setContactSearchQuery] = useState('');
    const [contactPersonSearchQuery, setContactPersonSearchQuery] = useState('');
    const [checkedInByQuery, setCheckedInByQuery] = useState('');
    const [clearedBillsByQuery, setClearedBillsByQuery] = useState('');
    const [houseKeepingUserQuery, setHouseKeepingUserQuery] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isContactsLoading, setIsContactsLoading] = useState(false);
    const [isUsersLoading, setIsUsersLoading] = useState(false);
    const [isFetchingReservation, setIsFetchingReservation] = useState(false);

    const handleTypeChange = useCallback((newType: 'corporate' | 'leisure') => {
        setFormData((prev) => ({
            ...prev,
            type: newType,
            // Resetting contact fields
            contact_id: '',
            contact_person_id: '',
            phone_number: '',
            guest_name: '',
            selectedContact: null,
            selectedContactPerson: null,
        }));
        setContactSearchQuery('');
        setContactPersonSearchQuery('');
    }, []);
    useEffect(() => {
        if (!isAuthenticated) window.location.href = '/login';
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchData = async () => {
            setIsContactsLoading(true);
            setIsUsersLoading(true);
            try {
                const [contactsRes, contactPersonsRes, usersRes] = await Promise.all([
                    axios.get('/api/contacts'),
                    axios.get('/api/contact-persons'),
                    axios.get('/api/users'),
                ]);
                const transformed = contactsRes.data?.results?.map((c: any) => ({
                    ...c,
                    contactPersons: c.contact_persons?.map((p: any) => ({ ...p })),
                    contact_persons: undefined,
                }));
                setContacts(transformed || []);
                setAllContactPersons(contactPersonsRes.data || []);
                setAppUsers(usersRes.data || []);
            } catch {
                toast.error('Failed to load form data.');
            } finally {
                setIsContactsLoading(false);
                setIsUsersLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!isEditMode || appUsers.length === 0 || contacts.length === 0 || allContactPersons.length === 0) return;
        const fetchReservation = async () => {
            setIsFetchingReservation(true);
            try {
                const { data } = await axios.get(`/api/guest-reservations/${reservationId}`);
                const guestData = data.data;
                const foundContact = contacts.find((c) => c.id === guestData.contact_id) || null;
                const foundContactPerson = allContactPersons.find((p) => p.id === guestData.contact_person_id) || null;

                setFormData((prev) => ({
                    ...prev,
                    guest_name: guestData.guest_name || '',
                    visitor_type: guestData.visitor_type || 'Visitor',
                    section: guestData.section || '',
                    check_in: guestData.check_in ? guestData.check_in.substring(0, 10) : '',
                    check_out: guestData.check_out ? guestData.check_out.substring(0, 10) : '',
                    contact_id: guestData.contact_id || '',
                    car_plate_number: guestData.car_plate_number || '',
                    reservation_number: guestData.reservation_number || prev.reservation_number,
                    contact_person_id: guestData.contact_person_id || '',
                    phone_number: guestData.phone_number || '',
                    kids_count: guestData.kids_count?.toString() || '',
                    adults_count: guestData.adults_count?.toString() || '',
                    infants_count: guestData.infants_count?.toString() || '',
                    is_express_check_in: guestData.is_express_check_in || false,
                    type: guestData.type || 'corporate',
                    entry_type: guestData.entry_type || 'walk_in',
                    checked_in_by_user_id: guestData.checked_in_by_user_id || '',
                    is_express_check_out: guestData.is_express_check_out || false,
                    cleared_bills: !!guestData.cleared_bills?.is_cleared,
                    cleared_bills_comments: guestData.cleared_bills?.comments || '',
                    cleared_bills_by_user_id: guestData.cleared_bills_by_user_id || '',
                    cleared_by_house_keeping: !!guestData.cleared_by_house_keeping?.is_cleared,
                    cleared_by_house_keeping_comments: guestData.cleared_by_house_keeping?.comments || '',
                    cleared_by_house_keeping_user_id: guestData.cleared_by_house_keeping_user_id || '',
                    entry_time: guestData.entry_time ? guestData.entry_time.substring(0, 16) : '',
                    exit_time: guestData.exit_time ? guestData.exit_time.substring(0, 16) : '',
                    selectedContact: foundContact,
                    selectedContactPerson: foundContactPerson,
                }));

                if (guestData.contact_id) {
                    setContactSearchQuery(foundContact?.institution || '');
                }
                if (foundContactPerson) {
                    setContactPersonSearchQuery([foundContactPerson.first_name, foundContactPerson.last_name].filter(Boolean).join(' ').trim());
                }
                if (guestData.checked_in_by_user_id) {
                    const foundUser = appUsers.find((u) => u.id === guestData.checked_in_by_user_id);
                    if (foundUser) setCheckedInByQuery(foundUser.name);
                }
                if (guestData.cleared_bills_by_user_id) {
                    const foundUser = appUsers.find((u) => u.id === guestData.cleared_bills_by_user_id);
                    if (foundUser) setClearedBillsByQuery(foundUser.name);
                }
                if (guestData.cleared_by_house_keeping_user_id) {
                    const foundUser = appUsers.find((u) => u.id === guestData.cleared_by_house_keeping_user_id);
                    if (foundUser) setHouseKeepingUserQuery(foundUser.name);
                }
            } catch {
                toast.error('Failed to load reservation details.');
            } finally {
                setIsFetchingReservation(false);
            }
        };
        fetchReservation();
    }, [reservationId, isEditMode, appUsers.length, contacts.length, allContactPersons.length]);

    useEffect(() => {
        if (!initialData || isEditMode) return;
        setFormData((prev) => ({
            ...prev,
            guest_name: initialData.guest_name || '',
            ref_no: initialData.ref_no || '',
            visitor_type: initialData.visitor_type || 'Visitor',
            check_in: initialData.check_in || '',
            check_out: initialData.check_out || '',
            contact_id: initialData.contact_id || '',
            contact_person_id: initialData.contact_person_id || '',
            phone_number: initialData.phone_number || '',
            adults_count: initialData.adults_count || '',
            kids_count: initialData.kids_count || '',
            type: initialData.type || 'corporate',
            selectedContact: initialData.selectedContact || null,
            selectedContactPerson: initialData.selectedContactPerson || null,
        }));
        if (initialData.selectedContact?.institution) {
            setContactSearchQuery(initialData.selectedContact.institution);
        }
        if (initialData.selectedContactPerson) {
            setContactPersonSearchQuery(
                [initialData.selectedContactPerson.first_name, initialData.selectedContactPerson.last_name].filter(Boolean).join(' ').trim(),
            );
        }
    }, [initialData]);
    useEffect(() => {
        if (formData.is_express_check_in && user?.id) {
            setFormData((prev) => ({ ...prev, checked_in_by_user_id: user.id }));
            const foundUser = appUsers.find((u) => u.id === user.id);
            if (foundUser) setCheckedInByQuery(foundUser.name);
        } else if (!formData.is_express_check_in) {
            setFormData((prev) => ({ ...prev, checked_in_by_user_id: '' }));
            setCheckedInByQuery('');
        }
    }, [formData.is_express_check_in, user?.id, appUsers]);

    const institutionContacts = React.useMemo(() => contacts.filter((c) => c.type === 'INSTITUTION'), [contacts]);

    const contactPersonsForSelected = React.useMemo(() => {
        if (!formData.selectedContact) return [];
        return formData.selectedContact.contactPersons || [];
    }, [formData.selectedContact]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }, []);

    const handleContactChange = (_: any, newValue: Contact | null) => {
        setFormData((prev) => ({
            ...prev,
            selectedContact: newValue,
            contact_id: newValue?.id || '',
            contact_person_id: '',
            phone_number: '',
            selectedContactPerson: null,
        }));
        setContactPersonSearchQuery('');
    };

    const handleContactPersonChange = (_: any, newValue: ContactPerson | null) => {
        setFormData((prev) => ({
            ...prev,
            selectedContactPerson: newValue,
            contact_person_id: newValue?.id || '',
            phone_number: newValue?.phone || '',
            guest_name: newValue ? [newValue.first_name, newValue.last_name].filter(Boolean).join(' ').trim() : '',
        }));
    };

    const resetForm = () => {
        setFormData({
            guest_name: '',
            ref_no: '',
            visitor_type: '',
            section: '',
            check_in: '',
            check_out: '',
            contact_id: '',
            car_plate_number: '',
            reservation_number: generateReservationNumber(),
            contact_person_id: '',
            phone_number: '',
            kids_count: '',
            infants_count: '',
            adults_count: '',
            is_express_check_in: false,
            type: 'corporate',
            entry_type: 'walk_in',
            checked_in_by_user_id: '',
            selectedContact: null,
            selectedContactPerson: null,
            is_express_check_out: false,
            cleared_bills: false,
            cleared_bills_comments: '',
            cleared_bills_by_user_id: '',
            cleared_by_house_keeping: false,
            cleared_by_house_keeping_comments: '',
            cleared_by_house_keeping_user_id: '',
            entry_time: '',
            exit_time: '',
        });
        setContactSearchQuery('');
        setContactPersonSearchQuery('');
        setCheckedInByQuery('');
        setClearedBillsByQuery('');
        setHouseKeepingUserQuery('');
    };

    const handleSubmit = async () => {
        if (!formData.guest_name.trim()) {
            toast.error('Guest name is required.');
            return;
        }
        if (!formData.section) {
            toast.error('Please select a section.');
            return;
        }
        if (!formData.check_in) {
            toast.error('Check-in date is required.');
            return;
        }
        if (!formData.check_out) {
            toast.error('Check-out date is required.');
            return;
        }
        if (formData.check_out < formData.check_in) {
            toast.error('Check-out must be after check-in.');
            return;
        }
        if (!formData.adults_count || parseInt(formData.adults_count) < 1) {
            toast.error('At least 1 adult is required.');
            return;
        }

        const payload: Record<string, any> = {
            guest_name: formData.guest_name,
            visitor_type: formData.visitor_type,
            ref_no: formData.ref_no || null,
            section: formData.section,
            check_in: formData.check_in,
            check_out: formData.check_out,
            contact_id: formData.contact_id || null,
            car_plate_number: formData.entry_type === 'drive_in' ? formData.car_plate_number || null : null,
            reservation_number: formData.reservation_number,
            contact_person_id: formData.contact_person_id || null,
            phone_number: formData.phone_number || null,
            kids_count: formData.kids_count ? parseInt(formData.kids_count) : 0,
            infants_count: formData.infants_count ? parseInt(formData.infants_count) : 0,
            adults_count: formData.adults_count ? parseInt(formData.adults_count) : 1,
            is_express_check_in: formData.is_express_check_in,
            is_express_check_out: formData.is_express_check_out,
            type: formData.type,
            entry_type: formData.entry_type,
            checked_in_by_user_id: formData.is_express_check_in ? formData.checked_in_by_user_id || null : null,
            created_by_user_id: user?.id,
            entry_time: formData.entry_time || null,
            exit_time: formData.exit_time || null,
            cleared_bills: {
                is_cleared: formData.cleared_bills,
                comments: formData.cleared_bills_comments || null,
            },
            cleared_bills_by_user_id: formData.cleared_bills_by_user_id || null,
            cleared_by_house_keeping: {
                is_cleared: formData.cleared_by_house_keeping,
                comments: formData.cleared_by_house_keeping_comments || null,
            },
            cleared_by_house_keeping_user_id: formData.cleared_by_house_keeping_user_id || null,
        };

        if (!isEditMode) {
            delete payload.is_express_check_out;
        }

        try {
            setIsLoading(true);
            if (isEditMode) {
                await axios.put(`/api/guest-reservations/${reservationId}`, payload);
                toast.success('Reservation updated successfully!');
            } else {
                await axios.post('/api/guest-reservations', payload);
                toast.success('Reservation created successfully!');
                resetForm();
            }
            onSuccessfulSubmit();
        } catch {
            toast.error(`Failed to ${isEditMode ? 'update' : 'create'} reservation.`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) return null;

    if (isFetchingReservation) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="h-10 w-10 rounded-full border-4 border-[#93723c]/50 border-t-transparent"
                />
            </div>
        );
    }

    const nightCount =
        formData.check_in && formData.check_out && formData.check_out >= formData.check_in
            ? Math.ceil((new Date(formData.check_out).getTime() - new Date(formData.check_in).getTime()) / (1000 * 60 * 60 * 24))
            : null;

    return (
        <div
            className="min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8"
            style={{
                background: 'radial-gradient(ellipse at 20% 0%, #fef9ee 0%, #f8fafc 40%, #f1f5f9 100%)',
                fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
            }}
        >
            <div className="mx-auto w-full">
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1
                                className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl"
                                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                            >
                                {isEditMode ? 'Update Reservation' : 'Guest Reservation'}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {isEditMode
                                    ? `Editing reservation #${formData.reservation_number}`
                                    : 'Complete the form to register a new guest stay'}
                            </p>
                        </div>

                        {!isEditMode && (
                            <div className="hidden sm:block">
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                    <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">Reservation #</p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="font-mono text-xl font-black text-slate-800">{formData.reservation_number}</span>
                                        {!isEditMode && (
                                            <button
                                                onClick={() => setFormData((prev) => ({ ...prev, reservation_number: generateReservationNumber() }))}
                                                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#93723c]/300"
                                                title="Regenerate"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <SectionCard
                        title="Contact Information"
                        icon={<Building2 className="h-4 w-4" />}
                        delay={0.05}
                        accentClass="from-violet-400 to-purple-500"
                    >
                        <div className="space-y-5">
                            {' '}
                            <div>
                                <p className="mb-3 text-sm font-semibold tracking-widest text-slate-500 uppercase">Reservation Type</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['corporate', 'leisure'] as const).map((t) => (
                                        <motion.button
                                            key={t}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.97 }}
                                            type="button"
                                            onClick={() => handleTypeChange(t)}
                                            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
                                                formData.type === t
                                                    ? 'border-[#93723c]/50 bg-gradient-to-b from-[#93723c]/30 to-orange-50 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            {t === 'corporate' ? (
                                                <Briefcase className={`h-5 w-5 ${formData.type === t ? 'text-[#93723c]' : 'text-slate-400'}`} />
                                            ) : (
                                                <Sunset className={`h-5 w-5 ${formData.type === t ? 'text-[#93723c]' : 'text-slate-400'}`} />
                                            )}
                                            <span
                                                className={`text-sm font-semibold capitalize ${formData.type === t ? 'text-[#93723c]/90' : 'text-slate-500'}`}
                                            >
                                                {t}
                                            </span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                            {formData.type === 'corporate' && (
                                <div>
                                    <FieldLabel icon={<Building2 className="h-3.5 w-3.5" />} label="Institution / Contact" />
                                    <Autocomplete
                                        options={filterOptions(institutionContacts, contactSearchQuery, (c) => c.institution)}
                                        value={formData.selectedContact}
                                        inputValue={contactSearchQuery}
                                        onInputChange={(_, v) => setContactSearchQuery(v)}
                                        onChange={handleContactChange}
                                        loading={isContactsLoading}
                                        getOptionLabel={(o) => o.institution}
                                        renderOption={(props, option) => (
                                            <li {...props} key={option.id}>
                                                <div className="font-medium">{highlightMatch(option.institution, contactSearchQuery)}</div>
                                            </li>
                                        )}
                                        renderInput={(params) => (
                                            <TextField {...params} variant="outlined" placeholder="Type 3+ characters to search" sx={muiInputSx} />
                                        )}
                                        noOptionsText={contactSearchQuery.length < 3 ? 'Type at least 3 characters' : 'No contacts found'}
                                    />
                                </div>
                            )}
                            <div>
                                <FieldLabel icon={<UserCog className="h-3.5 w-3.5" />} label="Contact Person" required />
                                <Autocomplete
                                    options={filterOptions(
                                        formData.selectedContact ? contactPersonsForSelected : allContactPersons,
                                        contactPersonSearchQuery,
                                        (p) => `${p.first_name || ''} ${p.last_name || ''}`,
                                    )}
                                    value={formData.selectedContactPerson}
                                    inputValue={contactPersonSearchQuery}
                                    onInputChange={(_, v) => setContactPersonSearchQuery(v)}
                                    onChange={handleContactPersonChange}
                                    getOptionLabel={(o) => `${o.first_name || ''} ${o.last_name || ''}`}
                                    renderOption={(props, option) => (
                                        <li {...props} key={option.id}>
                                            <div>
                                                <div className="font-medium">
                                                    {highlightMatch(`${option.first_name || ''} ${option.last_name || ''}`, contactPersonSearchQuery)}
                                                </div>
                                                {option.contact?.institution && (
                                                    <div className="text-xs text-slate-500">{option.contact.institution}</div>
                                                )}
                                            </div>
                                        </li>
                                    )}
                                    renderInput={(params) => (
                                        <TextField {...params} variant="outlined" placeholder="Type 3+ characters to search" sx={muiInputSx} />
                                    )}
                                    noOptionsText={contactPersonSearchQuery.length < 3 ? 'Type at least 3 characters' : 'No contact persons found'}
                                />
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Guest Information" icon={<UserCheck className="h-4 w-4" />} delay={0.1}>
                        <div className="space-y-5">
                            <div>
                                <p className="mb-3 text-sm font-semibold tracking-widest text-slate-500 uppercase">Entry Type</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {(
                                        [
                                            { value: 'walk_in', label: 'Walk In', icon: <Footprints className="h-5 w-5" /> },
                                            { value: 'drive_in', label: 'Drive In', icon: <Car className="h-5 w-5" /> },
                                        ] as const
                                    ).map((et) => (
                                        <label
                                            key={et.value}
                                            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
                                                formData.entry_type === et.value
                                                    ? 'border-[#93723c]/50 bg-gradient-to-b from-[#93723c]/30 to-orange-50 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="entry_type"
                                                value={et.value}
                                                checked={formData.entry_type === et.value}
                                                onChange={handleChange}
                                                className="sr-only"
                                            />
                                            <span className={formData.entry_type === et.value ? 'text-[#93723c]' : 'text-slate-400'}>{et.icon}</span>
                                            <span
                                                className={`text-sm font-semibold ${formData.entry_type === et.value ? 'text-[#93723c]/90' : 'text-slate-500'}`}
                                            >
                                                {et.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel icon={<Users className="h-3.5 w-3.5" />} label="Adults" required />
                                    <input
                                        type="number"
                                        name="adults_count"
                                        value={formData.adults_count}
                                        onChange={handleChange}
                                        min={1}
                                        placeholder="1"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <FieldLabel icon={<Baby className="h-3.5 w-3.5" />} label="Kids(Age 4-11)" />
                                    <input
                                        type="number"
                                        name="kids_count"
                                        value={formData.kids_count}
                                        onChange={handleChange}
                                        min={0}
                                        placeholder="0"
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <FieldLabel icon={<Baby className="h-3.5 w-3.5" />} label="Infants(Age 0-3)" />
                                    <input
                                        type="number"
                                        name="infants_count"
                                        value={formData.infants_count}
                                        onChange={handleChange}
                                        min={0}
                                        placeholder="0"
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                            <div>
                                <FieldLabel icon={<Phone className="h-3.5 w-3.5" />} label="Phone Number" />
                                <input
                                    type="text"
                                    name="phone_number"
                                    disabled
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    placeholder="+254 700 000 000"
                                    className={inputClass}
                                />
                            </div>
                            <AnimatePresence>
                                {formData.entry_type === 'drive_in' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="overflow-hidden"
                                    >
                                        <FieldLabel icon={<Car className="h-3.5 w-3.5" />} label="Car Plate Number" />
                                        <input
                                            type="text"
                                            name="car_plate_number"
                                            value={formData.car_plate_number}
                                            onChange={handleChange}
                                            placeholder="KAA 000A"
                                            className={inputClass}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </SectionCard>

                    <SectionCard
                        title="Stay Details"
                        subtitle="Dates & Location"
                        icon={<CalendarCheck className="h-4 w-4" />}
                        delay={0.15}
                        accentClass="from-sky-400 to-blue-500"
                    >
                        <div className="space-y-5">
                            <div>
                                <FieldLabel icon={<MapPin className="h-3.5 w-3.5" />} label="Section" required />
                                <div className="relative">
                                    <select name="section" value={formData.section} onChange={handleChange} className={selectClass}>
                                        <option value="">Select a section</option>
                                        {SECTIONS.map((s) => (
                                            <option key={s.value} value={s.value}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronRight className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <FieldLabel icon={<MapPin className="h-3.5 w-3.5" />} label="Visitor Type" required />
                                <div className="relative">
                                    <select name="visitor_type" value={formData.visitor_type} onChange={handleChange} className={selectClass}>
                                        <option value="">Select a visitor type</option>
                                        {VISITOR_TYPES.map((vt) => (
                                            <option key={vt.value} value={vt.value}>
                                                {vt.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronRight className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <FieldLabel icon={<CalendarCheck className="h-3.5 w-3.5" />} label="Check In" required />
                                    <input type="date" name="check_in" value={formData.check_in} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <FieldLabel icon={<CalendarX className="h-3.5 w-3.5" />} label="Check Out" required />
                                    <input type="date" name="check_out" value={formData.check_out} onChange={handleChange} className={inputClass} />
                                </div>
                            </div>

                            {nightCount !== null && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700"
                                >
                                    <Sparkles className="h-4 w-4 text-sky-500" />
                                    {nightCount} night{nightCount !== 1 ? 's' : ''} stay
                                </motion.div>
                            )}
                        </div>
                    </SectionCard>

                    {/* <SectionCard
                        title="Check-In Options"
                        icon={<ShieldCheck className="h-4 w-4" />}
                        delay={0.2}
                        accentClass="from-emerald-400 to-teal-500"
                    >
                        <div className="space-y-5">
                            <div className="space-y-4">
                                <ToggleSwitch
                                    name="is_express_check_in"
                                    checked={formData.is_express_check_in}
                                    onChange={handleChange}
                                    label="Express Check-In"
                                    description="Fast-track the guest check-in process"
                                    icon={<Zap className="h-4 w-4" />}
                                    activeColor="bg-emerald-400"
                                    activeIconColor="text-emerald-500"
                                />

                                {isEditMode && (
                                    <ToggleSwitch
                                        name="is_express_check_out"
                                        checked={formData.is_express_check_out}
                                        onChange={handleChange}
                                        label="Express Check-Out"
                                        description="Fast-track the guest check-out process"
                                        icon={<LogOut className="h-4 w-4" />}
                                        activeColor="bg-rose-400"
                                        activeIconColor="text-rose-500"
                                    />
                                )}
                            </div>
                        </div>
                    </SectionCard> */}

                    {isEditMode && (
                        <SectionCard
                            title="Billing Clearance"
                            subtitle="Financial sign-off"
                            icon={<Receipt className="h-4 w-4" />}
                            delay={0.25}
                            accentClass="from-rose-400 to-pink-500"
                        >
                            <div className="space-y-5">
                                <ToggleSwitch
                                    name="cleared_bills"
                                    checked={formData.cleared_bills}
                                    onChange={handleChange}
                                    label="Bills Cleared"
                                    description="All outstanding bills have been settled"
                                    icon={<Receipt className="h-4 w-4" />}
                                    activeColor="bg-rose-400"
                                    activeIconColor="text-rose-500"
                                />

                                <AnimatePresence>
                                    {!formData.cleared_bills && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-4 rounded-xl border border-rose-100 bg-rose-50 p-4">
                                                <div>
                                                    <FieldLabel icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Comments" />
                                                    <textarea
                                                        name="cleared_bills_comments"
                                                        value={formData.cleared_bills_comments}
                                                        onChange={handleChange}
                                                        placeholder="Add comments about billing status..."
                                                        rows={3}
                                                        className={`${inputClass} resize-none`}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {formData.cleared_bills && (
                                    <UserAutocomplete
                                        label="Cleared By"
                                        icon={<UserCheck className="h-3.5 w-3.5" />}
                                        users={appUsers}
                                        value={formData.cleared_bills_by_user_id}
                                        onChange={(id) => setFormData((prev) => ({ ...prev, cleared_bills_by_user_id: id }))}
                                        query={clearedBillsByQuery}
                                        onQueryChange={setClearedBillsByQuery}
                                        loading={isUsersLoading}
                                        placeholder="Search user who cleared bills"
                                    />
                                )}
                            </div>
                        </SectionCard>
                    )}

                    {isEditMode && (
                        <SectionCard
                            title="Housekeeping"
                            subtitle="Room clearance status"
                            icon={<ClipboardCheck className="h-4 w-4" />}
                            delay={0.3}
                            accentClass="from-indigo-400 to-blue-500"
                        >
                            <div className="space-y-5">
                                <ToggleSwitch
                                    name="cleared_by_house_keeping"
                                    checked={formData.cleared_by_house_keeping}
                                    onChange={handleChange}
                                    label="Housekeeping Cleared"
                                    description="Room has been inspected and cleared"
                                    icon={<ClipboardCheck className="h-4 w-4" />}
                                    activeColor="bg-indigo-400"
                                    activeIconColor="text-indigo-500"
                                />

                                <AnimatePresence>
                                    {!formData.cleared_by_house_keeping && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                                                <div>
                                                    <FieldLabel icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Comments" />
                                                    <textarea
                                                        name="cleared_by_house_keeping_comments"
                                                        value={formData.cleared_by_house_keeping_comments}
                                                        onChange={handleChange}
                                                        placeholder="Add housekeeping notes..."
                                                        rows={3}
                                                        className={`${inputClass} resize-none`}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {formData.cleared_by_house_keeping && (
                                    <UserAutocomplete
                                        label="Cleared By"
                                        icon={<UserCheck className="h-3.5 w-3.5" />}
                                        users={appUsers}
                                        value={formData.cleared_by_house_keeping_user_id}
                                        onChange={(id) => setFormData((prev) => ({ ...prev, cleared_by_house_keeping_user_id: id }))}
                                        query={houseKeepingUserQuery}
                                        onQueryChange={setHouseKeepingUserQuery}
                                        loading={isUsersLoading}
                                        placeholder="Search housekeeping user"
                                    />
                                )}
                            </div>
                        </SectionCard>
                    )}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35 }}
                    className="mt-6 flex items-center justify-end gap-3"
                >
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#93723c]/50 to-orange-500 px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-[#93723c]/300 hover:to-orange-600 disabled:opacity-60"
                    >
                        {isLoading ? (
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                                className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                            />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isEditMode ? 'Update Reservation' : 'Create Reservation'}
                    </motion.button>
                </motion.div>
            </div>
        </div>
    );
};

export default CreateGuestReservation;
