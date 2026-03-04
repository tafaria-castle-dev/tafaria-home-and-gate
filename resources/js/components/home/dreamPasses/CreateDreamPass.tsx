import { useAuth } from '@/hooks/use-auth';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { format, isAfter, isBefore, startOfToday } from 'date-fns';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserIcon, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface Activity {
    voucher_count: number;
    name: string;
    validFrom: string;
    validTo: string;
}

interface SouvenirItem {
    name: string;
    checked: boolean;
}

interface Souvenir {
    discount: string;
    validFrom: string;
    validTo: string;
    items: SouvenirItem[];
}

export interface FormData {
    roomNumber: string;
    name: string;
    guest_name: string;
    checkIn: string;
    checkOut: string;
    activities: Activity[];
    souvenir: Souvenir;
}

const activitiesList = ['Carriage Ride', 'Horse Ride', 'Mini Golf', 'Archery', 'Shop'];

const defaultSouvenirItems = ['T-Shirt', 'Mug', 'Keychain', 'Cap', 'Postcard', 'Magnet', 'Sticker Pack'];

const generatePassCode = (): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const CreateDreamPass: React.FC<{ activeTab: string; setActiveTab: (tab: string) => void }> = ({ activeTab, setActiveTab }) => {
    const { isAuthenticated } = useAuth();
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const today = format(startOfToday(), 'yyyy-MM-dd');

    const [isDayVisit, setIsDayVisit] = useState(false);
    const [passCode, setPassCode] = useState('');

    const [bulkData, setBulkData] = useState({
        period: 'christmas',
        checkIn: '',
        checkOut: '',
        activities: [] as string[],
    });
    const [isBulkDayVisit, setIsBulkDayVisit] = useState(false);
    const [bulkPassCount, setBulkPassCount] = useState(15);
    const [formData, setFormData] = useState<FormData>({
        roomNumber: '',
        name: '',
        guest_name: '',
        checkIn: '',
        checkOut: '',
        activities: [],
        souvenir: {
            discount: '',
            validFrom: '',
            validTo: '',
            items: defaultSouvenirItems.map((name) => ({ name, checked: false })),
        },
    });

    const fetchData = useCallback(async () => {}, []);

    useEffect(() => {
        if (!isAuthenticated) {
            window.location.href = '/login';
        } else {
            fetchData();
        }
    }, [isAuthenticated, fetchData]);

    useEffect(() => {
        if (activeTab === 'edit') {
            const saved = localStorage.getItem('editingDreamPass');
            const storedDayVisit = localStorage.getItem('dayVisit') == 'true';
            if (saved) {
                const parsed = JSON.parse(saved);
                setFormData(parsed);
                const isActuallyDayVisit = storedDayVisit || parsed.day_visit || false;
                setIsDayVisit(isActuallyDayVisit);

                if (isActuallyDayVisit) {
                    const existingPassCode = parsed.roomNumber || '';
                    setPassCode(existingPassCode);
                } else {
                    setPassCode('');
                }
            } else {
                toast.error('No data found for editing');
                setActiveTab('view');
            }
        } else {
            localStorage.removeItem('editingDreamPass');
            localStorage.removeItem('editingDreamPassId');
        }
    }, [activeTab]);

    useEffect(() => {
        if (bulkData.period === 'christmas') {
            setBulkData((prev) => ({
                ...prev,
                checkIn: '2025-12-25',
                checkOut: '2025-12-26',
            }));
        } else if (bulkData.period === 'newyear') {
            setBulkData((prev) => ({
                ...prev,
                checkIn: '2025-12-31',
                checkOut: '2026-01-01',
            }));
        }
    }, [bulkData.period]);

    useEffect(() => {
        if (isDayVisit) {
            if (activeTab !== 'edit') {
                const code = generatePassCode();
                setPassCode(code);
            }
            const day = formData.checkIn || today;
            setFormData((prev) => ({
                ...prev,
                checkIn: day,
                checkOut: day,
                activities: prev.activities.map((act) => ({
                    ...act,
                    validFrom: day,
                    validTo: day,
                })),
                souvenir: {
                    ...prev.souvenir,
                    validFrom: day,
                    validTo: day,
                },
            }));
        } else {
            if (activeTab !== 'edit') {
                setPassCode('');
            }
        }
    }, [isDayVisit, formData.checkIn, today]);

    const handleCheckInChange = (value: string) => {
        if (isDayVisit) return;
        setFormData((prev) => ({
            ...prev,
            checkIn: value,
            activities: prev.activities.map((act) => ({ ...act, validFrom: act.validFrom || value })),
            souvenir: { ...prev.souvenir, validFrom: prev.souvenir.validFrom || value },
        }));
    };

    const generateAndDownloadDayVisitPDF = (passCodes: string[], date: string) => {
        const doc = new jsPDF();

        const formattedDate = format(new Date(date), 'dd MMMM yyyy');
        doc.setFontSize(20);
        doc.text(`Day Visit Passes`, 105, 20, { align: 'center' });
        doc.setFontSize(16);
        doc.text(`${formattedDate}`, 105, 30, { align: 'center' });

        const columns = 5;
        const cellWidth = 35;
        const cellHeight = 15;
        const startX = 20;
        const startY = 50;
        const fontSize = 14;

        doc.setFontSize(fontSize);

        passCodes.forEach((code, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const x = startX + col * cellWidth;
            const y = startY + row * cellHeight;

            doc.setDrawColor(150);
            doc.setLineWidth(0.5);
            doc.rect(x, y, cellWidth - 5, cellHeight - 5);

            const textWidth = doc.getTextWidth(code);
            const textX = x + (cellWidth - 5 - textWidth) / 2;
            const textY = y + (cellHeight - 5) / 2 + 3;

            doc.text(code, textX, textY);
        });

        doc.save(`Day-Visit-Passes-${formattedDate}.pdf`);
    };
    const handleCheckOutChange = (value: string) => {
        if (isDayVisit) return;
        setFormData((prev) => ({
            ...prev,
            checkOut: value,
            activities: prev.activities.map((act) => ({ ...act, validTo: act.validTo || value })),
            souvenir: { ...prev.souvenir, validTo: prev.souvenir.validTo || value },
        }));
    };

    const allActivitiesSelected = formData.activities.length === activitiesList.length;

    const toggleAllActivities = () => {
        if (allActivitiesSelected) {
            setFormData((prev) => ({ ...prev, activities: [] }));
        } else {
            const day = isDayVisit ? formData.checkIn || today : '';
            setFormData((prev) => ({
                ...prev,
                activities: activitiesList.map((name) => ({
                    voucher_count: 1,
                    name,
                    validFrom: day || prev.checkIn || '',
                    validTo: day || prev.checkOut || '',
                })),
            }));
        }
    };

    const toggleActivity = (activityName: string) => {
        setFormData((prev) => {
            const exists = prev.activities.find((act) => act.name === activityName);
            const day = isDayVisit ? formData.checkIn || today : '';
            if (exists) {
                return { ...prev, activities: prev.activities.filter((act) => act.name !== activityName) };
            } else {
                return {
                    ...prev,
                    activities: [
                        ...prev.activities,
                        {
                            name: activityName,
                            validFrom: day || prev.checkIn || '',
                            voucher_count: 1,
                            validTo: day || prev.checkOut || '',
                        },
                    ],
                };
            }
        });
    };

    const handleActivityDateChange = (index: number, field: 'validFrom' | 'validTo', value: string) => {
        if (isDayVisit) return;
        setFormData((prev) => {
            const updated = [...prev.activities];
            updated[index][field] = value;
            return { ...prev, activities: updated };
        });
    };

    const handleActivityVoucherCountChange = (index: number, value: number) => {
        setFormData((prev) => {
            const updated = [...prev.activities];
            updated[index]['voucher_count'] = value;
            return { ...prev, activities: updated };
        });
    };

    const toggleSouvenirItem = (index: number) => {
        setFormData((prev) => {
            const updatedItems = [...prev.souvenir.items];
            updatedItems[index].checked = !updatedItems[index].checked;
            return { ...prev, souvenir: { ...prev.souvenir, items: updatedItems } };
        });
    };

    const allSouvenirItemsSelected = formData.souvenir.items.every((item) => item.checked);

    const toggleAllSouvenirItems = () => {
        setFormData((prev) => {
            const newCheckedState = !allSouvenirItemsSelected;
            const updatedItems = prev.souvenir.items.map((item) => ({ ...item, checked: newCheckedState }));
            return { ...prev, souvenir: { ...prev.souvenir, items: updatedItems } };
        });
    };

    const addCustomSouvenirItem = (name: string) => {
        if (name.trim() && !formData.souvenir.items.some((item) => item.name.toLowerCase() === name.trim().toLowerCase())) {
            setFormData((prev) => ({
                ...prev,
                souvenir: {
                    ...prev.souvenir,
                    items: [...prev.souvenir.items, { name: name.trim(), checked: true }],
                },
            }));
        }
    };

    const removeSouvenirItem = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            souvenir: { ...prev.souvenir, items: prev.souvenir.items.filter((_, i) => i !== index) },
        }));
    };

    const validateForm = () => {
        if (isDayVisit && isBulkDayVisit) {
            if (bulkPassCount < 1) {
                toast.error('Number of passes must be at least 1');
                return false;
            }
        }
        if (isDayVisit) {
            if (!passCode) {
                toast.error('Pass code generation failed');
                return false;
            }
        } else {
            if (!formData.roomNumber.trim()) {
                toast.error('Please enter room number');
                return false;
            }
        }
        if (!formData.checkIn) {
            toast.error('Please select check-in date');
            return false;
        }
        if (isBefore(new Date(formData.checkIn), startOfToday())) {
            toast.error('Check-in date cannot be before today');
            return false;
        }
        if (!formData.checkOut) {
            toast.error('Please select check-out date');
            return false;
        }
        if (isBefore(new Date(formData.checkOut), new Date(formData.checkIn))) {
            toast.error('Check-out date cannot be before check-in date');
            return false;
        }
        if (formData.activities.length === 0) {
            toast.error('Please select at least one activity');
            return false;
        }
        for (const act of formData.activities) {
            if (!act.validFrom || isBefore(new Date(act.validFrom), new Date(formData.checkIn))) {
                toast.error(`Activity "${act.name}" valid from must be on or after check-in`);
                return false;
            }
            if (!act.validTo || isAfter(new Date(act.validTo), new Date(formData.checkOut))) {
                toast.error(`Activity "${act.name}" valid to must be on or before check-out`);
                return false;
            }
        }
        if (formData.souvenir.discount) {
            const checkedItems = formData.souvenir.items.filter((item) => item.checked);
            if (checkedItems.length === 0) {
                toast.error('Please select at least one souvenir item for the discount');
                return false;
            }
            if (!formData.souvenir.validFrom || !formData.souvenir.validTo) {
                toast.error('Please set validity dates for souvenir discount');
                return false;
            }
            if (
                isBefore(new Date(formData.souvenir.validFrom), new Date(formData.checkIn)) ||
                isAfter(new Date(formData.souvenir.validTo), new Date(formData.checkOut))
            ) {
                toast.error('Souvenir validity must be within stay dates');
                return false;
            }
        }
        return true;
    };
    const bulkCreateDailyVisits = async (status: 'draft' | 'pending') => {
        if (!validateForm()) return;

        setLoadingSubmit(true);

        let successCount = 0;
        let failCount = 0;
        const createdIds: string[] = [];
        const createdPassCodes: string[] = [];

        try {
            for (let i = 0; i < bulkPassCount; i++) {
                const passCode = generatePassCode();
                const payload = {
                    room_number: passCode,
                    guest_name: '',
                    check_in_date: formData.checkIn,
                    check_out_date: formData.checkOut,
                    activities: formData.activities.map((act) => ({
                        activity_name: act.name,
                        valid_from: act.validFrom,
                        voucher_count: act.voucher_count,
                        valid_to: act.validTo,
                    })),
                    souvenir_discount: formData.souvenir.discount
                        ? {
                              discount_percentage: parseFloat(formData.souvenir.discount),
                              valid_from: formData.souvenir.validFrom,
                              valid_to: formData.souvenir.validTo,
                              applicable_items: formData.souvenir.items.filter((item) => item.checked).map((item) => item.name),
                          }
                        : null,
                    status,
                    day_visit: true,
                };

                try {
                    const response = await axios.post('/api/dream-passes', payload);
                    createdIds.push(response.data.id);
                    createdPassCodes.push(passCode);
                    successCount++;
                } catch (error: any) {
                    failCount++;
                    console.error(`Failed to create pass ${passCode}:`, error);
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} day visit passes created successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
                if (createdPassCodes.length > 0) {
                    generateAndDownloadDayVisitPDF(createdPassCodes, formData.checkIn);
                }
            } else {
                toast.error('All bulk creations failed');
            }
            await axios.post('/api/admin/create-dream-pass', {
                refNo: `${101}-${178}`,
                roomNumber: 'day-visit-bulk',
                activityCount: formData.activities.length.toString(),
                checkInDate: formData.checkIn,
            });
            setFormData({
                roomNumber: '',
                name: '',
                guest_name: '',
                checkIn: '',
                checkOut: '',
                activities: [],
                souvenir: {
                    discount: '',
                    validFrom: '',
                    validTo: '',
                    items: defaultSouvenirItems.map((name) => ({ name, checked: false })),
                },
            });
            setIsDayVisit(false);
            setIsBulkDayVisit(false);
            setBulkPassCount(15);
            setPassCode('');
            setActiveTab('view');
        } catch (error) {
            toast.error('Bulk day visit creation failed');
        } finally {
            setLoadingSubmit(false);
        }
    };
    const handleSubmit = async (status: 'draft' | 'pending') => {
        if (!validateForm()) return;

        status === 'draft' ? setLoadingDraft(true) : setLoadingSubmit(true);

        try {
            const effectiveRoomNumber = isDayVisit ? passCode : formData.roomNumber;

            const payload = {
                room_number: effectiveRoomNumber,
                guest_name: formData.guest_name,
                check_in_date: formData.checkIn,
                check_out_date: formData.checkOut,
                activities: formData.activities.map((act) => ({
                    activity_name: act.name,
                    valid_from: act.validFrom,
                    voucher_count: act.voucher_count,
                    valid_to: act.validTo,
                })),
                souvenir_discount: formData.souvenir.discount
                    ? {
                          discount_percentage: parseFloat(formData.souvenir.discount),
                          valid_from: formData.souvenir.validFrom,
                          valid_to: formData.souvenir.validTo,
                          applicable_items: formData.souvenir.items.filter((item) => item.checked).map((item) => item.name),
                      }
                    : null,
                status,
                day_visit: isDayVisit,
            };
            let passId = '';
            if (activeTab === 'edit') {
                const id = localStorage.getItem('editingDreamPassId');
                passId = id || '';
                await axios.put(`/api/dream-passes/${id}`, payload);
                toast.success('DreamPass updated successfully');
            } else {
                const response = await axios.post('/api/dream-passes', payload);
                passId = response.data.id;
                toast.success('DreamPass created successfully');
            }
            await axios.post('/api/admin/create-dream-pass', {
                refNo: `${effectiveRoomNumber}-${passId}`,
                roomNumber: effectiveRoomNumber,
                activityCount: formData.activities.length.toString(),
                checkInDate: formData.checkIn || '',
            });
            localStorage.removeItem('id');
            setActiveTab('view');
            setFormData({
                roomNumber: '',
                name: '',
                guest_name: '',
                checkIn: '',
                checkOut: '',
                activities: [],
                souvenir: {
                    discount: '',
                    validFrom: '',
                    validTo: '',
                    items: defaultSouvenirItems.map((name) => ({ name, checked: false })),
                },
            });
            setIsDayVisit(false);
            setPassCode('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            status === 'draft' ? setLoadingDraft(false) : setLoadingSubmit(false);
        }
    };

    const handleBulkCreate = async () => {
        if (!bulkData.checkIn || !bulkData.checkOut) {
            toast.error('Please set check-in and check-out dates');
            return;
        }
        if (bulkData.activities.length === 0) {
            toast.error('Please select at least one activity');
            return;
        }

        setBulkLoading(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (let room = 101; room <= 178; room++) {
                try {
                    const payload = {
                        room_number: room.toString(),
                        guest_name: '',
                        check_in_date: bulkData.checkIn,
                        check_out_date: bulkData.checkOut,
                        activities: bulkData.activities.map((actName) => ({
                            activity_name: actName,
                            valid_from: bulkData.checkIn,
                            voucher_count: 3,
                            valid_to: bulkData.checkOut,
                        })),
                        souvenir_discount: null,
                        status: 'pending',
                        day_visit: false,
                    };

                    await axios.post('/api/dream-passes', payload);

                    successCount++;
                } catch (error) {
                    failCount++;
                    console.error(`Failed for room ${room}:`, error);
                }
            }

            await axios.post('/api/admin/create-dream-pass', {
                refNo: `${101}-${178}`,
                roomNumber: '101 - 178',
                activityCount: bulkData.activities.length.toString(),
                checkInDate: bulkData.checkIn,
            });
            toast.success(`Bulk creation complete: ${successCount} passes created, ${failCount} failed`);
            setShowBulkModal(false);
            setBulkData({
                period: 'christmas',
                checkIn: '',
                checkOut: '',
                activities: [],
            });
            setActiveTab('view');
        } catch (error) {
            toast.error('Bulk creation failed');
        } finally {
            setBulkLoading(false);
        }
    };

    const toggleBulkActivity = (activityName: string) => {
        setBulkData((prev) => {
            const exists = prev.activities.includes(activityName);
            if (exists) {
                return { ...prev, activities: prev.activities.filter((a) => a !== a) };
            } else {
                return { ...prev, activities: [...prev.activities, activityName] };
            }
        });
    };

    const allBulkActivitiesSelected = bulkData.activities.length === activitiesList.length;

    const toggleAllBulkActivities = () => {
        if (allBulkActivitiesSelected) {
            setBulkData((prev) => ({ ...prev, activities: [] }));
        } else {
            setBulkData((prev) => ({ ...prev, activities: [...activitiesList] }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
                >
                    <div className="bg-gradient-to-r from-[#902729] to-[#7e1a1c] px-8 py-6 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <UserIcon className="h-8 w-8" />
                                <h2 className="text-2xl font-bold">{activeTab === 'edit' ? 'Edit DreamPass' : 'Create DreamPass'}</h2>
                            </div>
                            {activeTab !== 'edit' && (
                                <button
                                    onClick={() => setShowBulkModal(true)}
                                    className="rounded-lg bg-white px-4 py-2 font-medium text-indigo-700 transition hover:bg-gray-100"
                                >
                                    Create Bulk Passes
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-8 p-8">
                        <div className="mb-6">
                            <label className="flex cursor-pointer items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={isDayVisit}
                                    onChange={(e) => setIsDayVisit(e.target.checked)}
                                    className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-lg font-medium text-gray-800">Day Visit DreamPass</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {!isDayVisit ? (
                                <TextField
                                    label="Room Number"
                                    value={formData.roomNumber}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, roomNumber: e.target.value }))}
                                    fullWidth
                                    required
                                    variant="outlined"
                                    type="text"
                                />
                            ) : (
                                <TextField label="Pass Number (Auto-generated)" value={passCode} disabled fullWidth variant="outlined" />
                            )}

                            {isDayVisit && (
                                <>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="flex cursor-pointer items-center space-x-3">
                                            <input
                                                type="checkbox"
                                                checked={isBulkDayVisit}
                                                onChange={(e) => {
                                                    setIsBulkDayVisit(e.target.checked);
                                                    if (!e.target.checked) {
                                                        setBulkPassCount(15);
                                                    }
                                                }}
                                                className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-lg font-medium text-gray-800">Bulk Create Day Visit Passes</span>
                                        </label>
                                    </div>

                                    {!isBulkDayVisit ? (
                                        <TextField
                                            label="Guest Name"
                                            value={formData.guest_name}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, guest_name: e.target.value }))}
                                            fullWidth
                                            required
                                            variant="outlined"
                                        />
                                    ) : (
                                        <TextField
                                            label="Number of Passes"
                                            type="number"
                                            value={bulkPassCount}
                                            onChange={(e) => setBulkPassCount(Math.max(1, parseInt(e.target.value) || 1))}
                                            fullWidth
                                            required
                                            variant="outlined"
                                            inputProps={{ min: 1 }}
                                        />
                                    )}

                                    <TextField
                                        label="Day Visit Date"
                                        type="date"
                                        value={formData.checkIn}
                                        onChange={(e) => {
                                            const day = e.target.value;
                                            setFormData((prev) => ({
                                                ...prev,
                                                checkIn: day,
                                                checkOut: day,
                                                activities: prev.activities.map((act) => ({
                                                    ...act,
                                                    validFrom: day,
                                                    validTo: day,
                                                })),
                                                souvenir: {
                                                    ...prev.souvenir,
                                                    validFrom: day,
                                                    validTo: day,
                                                },
                                            }));
                                            if (!isBulkDayVisit && activeTab !== 'edit') {
                                                const code = generatePassCode();
                                                setPassCode(code);
                                            }
                                        }}
                                        InputLabelProps={{ shrink: true }}
                                        inputProps={{ min: today }}
                                        fullWidth
                                        required
                                        disabled={isDayVisit}
                                        variant="outlined"
                                    />
                                </>
                            )}

                            {!isDayVisit && (
                                <>
                                    <TextField
                                        label="Check-In Date"
                                        type="date"
                                        value={formData.checkIn}
                                        onChange={(e) => handleCheckInChange(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        inputProps={{ min: today }}
                                        fullWidth
                                        required
                                        variant="outlined"
                                    />
                                    <TextField
                                        label="Check-Out Date"
                                        type="date"
                                        value={formData.checkOut}
                                        onChange={(e) => handleCheckOutChange(e.target.value)}
                                        InputLabelProps={{ shrink: true }}
                                        inputProps={{ min: formData.checkIn || today }}
                                        fullWidth
                                        required
                                        variant="outlined"
                                    />
                                </>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-800">Select Activities</h3>
                                <label className="flex cursor-pointer items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={allActivitiesSelected}
                                        onChange={toggleAllActivities}
                                        className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="font-medium text-gray-700">Select All Activities</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {activitiesList.map((activity) => (
                                    <label
                                        key={activity}
                                        className="flex cursor-pointer items-center space-x-3 rounded-lg bg-gray-50 p-4 transition hover:bg-gray-100"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.activities.some((act) => act.name === activity)}
                                            onChange={() => toggleActivity(activity)}
                                            className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="font-medium text-gray-800">{activity}</span>
                                    </label>
                                ))}
                            </div>

                            {formData.activities.length > 0 && (
                                <div className="mt-6 space-y-4">
                                    <h4 className="text-lg font-medium text-gray-700">Activity Validity Dates</h4>
                                    {formData.activities.map((act, index) => (
                                        <div key={index} className="flex items-end gap-4 rounded-lg bg-blue-50 p-4">
                                            <TextField label="Activity" value={act.name} disabled fullWidth variant="filled" />
                                            <TextField
                                                label="Number of Vouchers"
                                                value={act.voucher_count}
                                                onChange={(e) => handleActivityVoucherCountChange(index, parseInt(e.target.value) || 1)}
                                                fullWidth
                                                required
                                                variant="outlined"
                                                type="number"
                                                inputProps={{ min: 1 }}
                                            />
                                            <TextField
                                                label="Valid From"
                                                type="date"
                                                value={act.validFrom}
                                                onChange={(e) => handleActivityDateChange(index, 'validFrom', e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                inputProps={{ min: formData.checkIn, max: formData.checkOut }}
                                                fullWidth
                                                variant="outlined"
                                                disabled={isDayVisit}
                                            />
                                            <TextField
                                                label="Valid To"
                                                type="date"
                                                value={act.validTo}
                                                onChange={(e) => handleActivityDateChange(index, 'validTo', e.target.value)}
                                                InputLabelProps={{ shrink: true }}
                                                inputProps={{ min: act.validFrom || formData.checkIn, max: formData.checkOut }}
                                                fullWidth
                                                variant="outlined"
                                                disabled={isDayVisit}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {isBulkDayVisit && (
                            <div className="text-red-600">
                                Note: In bulk day visit creation, Passes are downloaded as a PDF automatically after creation.
                            </div>
                        )}
                        <div className="flex justify-end gap-4 border-t pt-6">
                            <button
                                onClick={() => (isDayVisit && isBulkDayVisit ? bulkCreateDailyVisits('draft') : handleSubmit('draft'))}
                                disabled={loadingDraft || loadingSubmit}
                                className="rounded-lg bg-gray-200 px-6 py-3 font-medium text-gray-800 transition hover:bg-gray-300 disabled:opacity-50"
                            >
                                {loadingDraft ? 'Saving...' : 'Save as Draft'}
                            </button>
                            <button
                                onClick={() => (isDayVisit && isBulkDayVisit ? bulkCreateDailyVisits('pending') : handleSubmit('pending'))}
                                disabled={loadingDraft || loadingSubmit}
                                className="rounded-lg bg-[#7e1a1c] px-6 py-3 font-medium text-white transition hover:bg-[#902729] disabled:opacity-50"
                            >
                                {loadingSubmit
                                    ? 'Creating...'
                                    : isDayVisit && isBulkDayVisit
                                      ? `Create ${bulkPassCount} Passes`
                                      : 'Submit for Approval'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b bg-gradient-to-r from-[#902729] to-[#7e1a1c] px-6 py-4 text-white">
                            <h3 className="text-xl font-bold">Create Bulk Passes (Rooms 101-178)</h3>
                            <button onClick={() => setShowBulkModal(false)} className="rounded-lg p-1 hover:bg-white/20">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-6 p-6">
                            <div className="space-y-3">
                                <label className="text-lg font-semibold text-gray-800">Select Period</label>
                                <div className="space-y-2">
                                    <label className="flex cursor-pointer items-center space-x-3 rounded-lg bg-gray-50 p-4 transition hover:bg-gray-100">
                                        <input
                                            type="radio"
                                            name="period"
                                            value="christmas"
                                            checked={bulkData.period === 'christmas'}
                                            onChange={(e) => setBulkData((prev) => ({ ...prev, period: e.target.value }))}
                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="font-medium text-gray-800">Christmas (Dec 25-26)</span>
                                    </label>
                                    <label className="flex cursor-pointer items-center space-x-3 rounded-lg bg-gray-50 p-4 transition hover:bg-gray-100">
                                        <input
                                            type="radio"
                                            name="period"
                                            value="newyear"
                                            checked={bulkData.period === 'newyear'}
                                            onChange={(e) => setBulkData((prev) => ({ ...prev, period: e.target.value }))}
                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="font-medium text-gray-800">New Year (Dec 31 - Jan 1)</span>
                                    </label>
                                    <label className="flex cursor-pointer items-center space-x-3 rounded-lg bg-gray-50 p-4 transition hover:bg-gray-100">
                                        <input
                                            type="radio"
                                            name="period"
                                            value="easter"
                                            checked={bulkData.period === 'easter'}
                                            onChange={(e) => setBulkData((prev) => ({ ...prev, period: e.target.value }))}
                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="font-medium text-gray-800">Easter (Custom Dates)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <TextField
                                    label="Check-In Date"
                                    type="date"
                                    value={bulkData.checkIn}
                                    onChange={(e) => setBulkData((prev) => ({ ...prev, checkIn: e.target.value }))}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ min: today }}
                                    fullWidth
                                    variant="outlined"
                                    disabled={bulkData.period !== 'easter'}
                                />
                                <TextField
                                    label="Check-Out Date"
                                    type="date"
                                    value={bulkData.checkOut}
                                    onChange={(e) => setBulkData((prev) => ({ ...prev, checkOut: e.target.value }))}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                    variant="outlined"
                                    disabled={bulkData.period !== 'easter'}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-lg font-semibold text-gray-800">Select Activities</label>
                                    <label className="flex cursor-pointer items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={allBulkActivitiesSelected}
                                            onChange={toggleAllBulkActivities}
                                            className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Select All</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {activitiesList.map((activity) => (
                                        <label
                                            key={activity}
                                            className="flex cursor-pointer items-center space-x-3 rounded-lg bg-gray-50 p-3 transition hover:bg-gray-100"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={bulkData.activities.includes(activity)}
                                                onChange={() => toggleBulkActivity(activity)}
                                                className="h-5 w-5 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="font-medium text-gray-800">{activity}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 border-t pt-4">
                                <button
                                    onClick={() => setShowBulkModal(false)}
                                    disabled={bulkLoading}
                                    className="rounded-lg bg-gray-200 px-6 py-2 font-medium text-gray-800 transition hover:bg-gray-300 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkCreate}
                                    disabled={bulkLoading}
                                    className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {bulkLoading ? 'Creating Passes...' : 'Create All Passes'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default CreateDreamPass;
