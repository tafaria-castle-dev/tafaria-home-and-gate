import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RoomSetUp from '../home/quotation/rooms/RoomSetUp';
import { Meal } from '../home/quotation/rooms/RoomSetUpKids';

const cutoffDate = new Date('2025-11-05T00:00:00');

const HOLIDAY_SUPPLEMENT = 4000;

function getEasterDates(year: number): { start: Date; end: Date } {
    const a = year % 19,
        b = Math.floor(year / 100),
        c = year % 100;
    const d = Math.floor(b / 4),
        e = b % 4,
        f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4),
        k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return {
        start: new Date(year, month, day - 2), // Good Friday
        end: new Date(year, month, day + 1), // Easter Monday
    };
}

function isHolidayDate(date: Date): boolean {
    const month = date.getMonth(),
        day = date.getDate(),
        year = date.getFullYear();
    if (month === 11 && day >= 24 && day <= 26) return true;
    const { start, end } = getEasterDates(year);
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function countHolidayNights(checkIn: string, checkOut: string): number {
    if (!checkIn || !checkOut) return 0;
    let count = 0;
    const current = new Date(checkIn);
    const end = new Date(checkOut);
    while (current < end) {
        if (isHolidayDate(current)) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
}

function getHolidayLabel(checkIn: string, checkOut: string): string {
    if (!checkIn || !checkOut) return '';
    let christmas = false,
        easter = false;
    const current = new Date(checkIn);
    const end = new Date(checkOut);
    while (current < end) {
        if (isHolidayDate(current)) {
            const m = current.getMonth(),
                d = current.getDate();
            if (m === 11 && d >= 24 && d <= 26) christmas = true;
            else easter = true;
        }
        current.setDate(current.getDate() + 1);
    }
    return [christmas && 'Christmas', easter && 'Easter'].filter(Boolean).join(' & ');
}

interface AdultRoomSelectionProps {
    formData: any;
    assignedKids: number[];
    onAddRoom: (room: any) => void;
    onEditRoom: (index: number, room: any) => void;
    adultsAllocated: number;
    totalAdults: number;
    adultRooms: any[];
    kidsRooms: any[];
    activeTab: string;
    editingRoomIndex: number | null;
    roomToEdit: any | null;
}

interface RoomSelectionExtended {
    roomType: string;
    selectedPackage: any;
    selectedDiscount?: any;

    pax: number;
    numberOfRooms: number;
}

const AdultRoomSelection: React.FC<AdultRoomSelectionProps> = ({
    formData,
    assignedKids,
    onAddRoom,
    onEditRoom,
    activeTab,
    totalAdults,
    adultRooms,
    kidsRooms,
    editingRoomIndex,
    roomToEdit,
}) => {
    const [adultRoomType, setAdultRoomType] = useState('single');
    const [boardType, setBoardType] = useState('');
    const [paxPerRoomAdult, setPaxPerRoomAdult] = useState(1);
    const [numberOfRooms, setNumberOfRooms] = useState(1);
    const [isSharingWithKids, setIsSharingWithKids] = useState(false);
    const [selectedKidsForSharing, setSelectedKidsForSharing] = useState<number[]>([]);
    const [selectedNights, setSelectedNights] = useState<number[]>([]);
    const [roomData, setRoomData] = useState<RoomSelectionExtended>({
        roomType: 'single',
        selectedPackage: null,
        selectedDiscount: null,
        pax: 1,
        numberOfRooms: 1,
    });
    const [meals, setMeals] = useState<Meal[]>([]);
    const [isMealsLoading, setIsMealsLoading] = useState<boolean>(true);

    const roomSetUpRef = useRef<{ reset: () => void }>(null);

    const holidayNights = useMemo(() => countHolidayNights(formData.checkIn, formData.checkOut), [formData.checkIn, formData.checkOut]);
    const holidayLabel = useMemo(() => getHolidayLabel(formData.checkIn, formData.checkOut), [formData.checkIn, formData.checkOut]);
    const hasHoliday = holidayNights > 0;

    const previewHolidaySupplement = useMemo(() => {
        if (!hasHoliday) return 0;
        return (HOLIDAY_SUPPLEMENT * paxPerRoomAdult + (HOLIDAY_SUPPLEMENT / 2) * selectedKidsForSharing.length) * holidayNights * numberOfRooms;
    }, [hasHoliday, paxPerRoomAdult, selectedKidsForSharing, holidayNights, numberOfRooms]);

    useMemo(() => {
        if (roomToEdit && editingRoomIndex !== null) {
            const roomType = roomToEdit.roomType?.split(' : ')[0] || 'single';
            setAdultRoomType(roomType);
            setBoardType(roomToEdit.boardType || '');
            setPaxPerRoomAdult(roomToEdit.paxPerRoom || roomToEdit.adults || 1);
            setNumberOfRooms(roomToEdit.numberOfRooms || 1);
            const kidsInRoom = roomToEdit?.kidsInRoom || roomToEdit?.kidIndices || [];
            const validKidsInRoom = kidsInRoom.filter(
                (index: number) => Number.isInteger(index) && index >= 0 && index < (formData.kids?.length || 0),
            );
            setIsSharingWithKids(validKidsInRoom.length > 0);
            setSelectedKidsForSharing(validKidsInRoom);
            setSelectedNights(roomToEdit.nights || []);
            setRoomData({
                roomType,
                selectedPackage: roomToEdit.room || null,
                selectedDiscount: roomToEdit.selectedDiscount ?? roomToEdit.discount ?? null,
                pax: roomToEdit.paxPerRoom || roomToEdit.adults || 1,
                numberOfRooms: roomToEdit.numberOfRooms || 1,
            });
        }
    }, [roomToEdit, editingRoomIndex, formData.kids]);

    const allocatedAdultsPerNight = useMemo(() => {
        const allocation: Record<number, number> = {};
        adultRooms.forEach((room, index) => {
            if (editingRoomIndex === null || index !== editingRoomIndex) {
                room.nights.forEach((night: number) => {
                    const adultsPerRoom = room.adults || room.paxPerRoom - (room.kidsInRoom?.length || 0) || 1;
                    const roomCount = room.numberOfRooms || 1;
                    allocation[night] = (allocation[night] || 0) + adultsPerRoom * roomCount;
                });
            }
        });
        return allocation;
    }, [adultRooms, editingRoomIndex]);

    const allocatedKidsPerNight = useMemo(() => {
        const allocation: Record<number, number> = {};
        [...adultRooms, ...kidsRooms].forEach((room, index) => {
            if (editingRoomIndex === null || index !== editingRoomIndex || !room.isKidsRoom) {
                const kidsCount = Array.isArray(room.kidsInRoom) ? room.kidsInRoom.length : 0;
                const roomCount = room.numberOfRooms || 1;
                (room.nights || []).forEach((night: number) => {
                    if (Number.isInteger(night) && night > 0) {
                        allocation[night] = (allocation[night] || 0) + kidsCount * roomCount;
                    }
                });
            }
        });
        return allocation;
    }, [adultRooms, kidsRooms, editingRoomIndex]);

    const kidsAssignedNights = useMemo(() => {
        const assigned: Record<number, number[]> = {};
        [...kidsRooms, ...adultRooms].forEach((room, index) => {
            if (editingRoomIndex === null || index !== editingRoomIndex || !room.isKidsRoom) {
                const kids = Array.isArray(room.kidsInRoom) ? room.kidsInRoom : [];
                const roomCount = room.numberOfRooms || 1;
                const totalKidsAssigned: any[] = [];
                for (let i = 0; i < roomCount; i++) totalKidsAssigned.push(...kids);
                (room.nights || []).forEach((night: number) => {
                    if (Number.isInteger(night) && night > 0) {
                        assigned[night] = [...(assigned[night] || []), ...totalKidsAssigned];
                    }
                });
            }
        });
        return assigned;
    }, [kidsRooms, adultRooms, editingRoomIndex]);

    const adjustedAssignedKids = useMemo(() => {
        const allKids = Array.from({ length: formData.kids?.length || 0 }, (_, i) => i);
        if (selectedNights.length === 0) {
            return allKids.filter((kidIndex) => !Object.values(kidsAssignedNights).every((nights) => nights.includes(kidIndex)));
        }
        return allKids.filter((kidIndex) => selectedNights.some((night) => !(kidsAssignedNights[night] || []).includes(kidIndex)));
    }, [formData.kids, kidsAssignedNights, selectedNights]);

    useEffect(() => {
        if (editingRoomIndex === null) {
            setPaxPerRoomAdult(1);
            setNumberOfRooms(1);
            setSelectedNights([]);
            setSelectedKidsForSharing([]);
            setIsSharingWithKids(false);
            setRoomData({ roomType: 'single', selectedPackage: null, selectedDiscount: null, pax: 1, numberOfRooms: 1 });
            if (roomSetUpRef.current) roomSetUpRef.current.reset();
        }
    }, [formData.adults, editingRoomIndex]);

    const totalNights = formData.numNights || 0;

    const remainingAdultsPerNight = useMemo(
        () =>
            Array.from({ length: totalNights }, (_, i) => {
                const night = i + 1;
                return { night, remainingAdults: Math.max(totalAdults - (allocatedAdultsPerNight[night] || 0), 0) };
            }),
        [totalNights, totalAdults, allocatedAdultsPerNight],
    );

    const remainingKidsPerNight = useMemo(
        () =>
            Array.from({ length: totalNights }, (_, i) => {
                const night = i + 1;
                return { night, remainingKids: Math.max(formData.kids?.length - (allocatedKidsPerNight[night] || 0), 0) };
            }),
        [totalNights, formData.kids, allocatedKidsPerNight],
    );

    const canAllocateAdults = useMemo(() => {
        const totalAdultsNeeded = paxPerRoomAdult * numberOfRooms;
        if (editingRoomIndex !== null && roomToEdit) {
            const originalAdults =
                (roomToEdit.adults || roomToEdit.paxPerRoom - (roomToEdit.kidsInRoom?.length || 0) || 1) * (roomToEdit.numberOfRooms || 1);
            const originalNights = roomToEdit.nights || [];
            const adultDifference = totalAdultsNeeded - originalAdults;
            return selectedNights.every((night) => {
                const currentlyAllocated = allocatedAdultsPerNight[night] || 0;
                if (originalNights.includes(night)) return currentlyAllocated + adultDifference <= totalAdults;
                return currentlyAllocated + totalAdultsNeeded <= totalAdults;
            });
        }
        return selectedNights.every((night) => (allocatedAdultsPerNight[night] || 0) + totalAdultsNeeded <= totalAdults);
    }, [allocatedAdultsPerNight, paxPerRoomAdult, numberOfRooms, selectedNights, totalAdults, editingRoomIndex, roomToEdit]);

    const canAllocateKids = useMemo(() => {
        const totalKidsNeeded = selectedKidsForSharing.length * numberOfRooms;
        if (editingRoomIndex !== null && roomToEdit) {
            const originalKidsCount = (roomToEdit.kidsInRoom?.length || 0) * (roomToEdit.numberOfRooms || 1);
            const kidsDifference = totalKidsNeeded - originalKidsCount;
            return selectedNights.every((night) => {
                const currentlyAllocated = allocatedKidsPerNight[night] || 0;
                if (roomToEdit.nights.includes(night)) return currentlyAllocated + kidsDifference <= formData.kids?.length;
                return currentlyAllocated + totalKidsNeeded <= formData.kids?.length;
            });
        }
        return selectedNights.every((night) => (allocatedKidsPerNight[night] || 0) + totalKidsNeeded <= formData.kids?.length);
    }, [allocatedKidsPerNight, selectedKidsForSharing, numberOfRooms, selectedNights, editingRoomIndex, roomToEdit, formData.kids]);

    const getDiscountValue = (discount: any) => {
        if (discount == null) return null;
        if (typeof discount === 'number') return discount;
        if (typeof discount === 'object' && 'rate' in discount) return discount.rate;
        return null;
    };

    const arraysEqual = (a: any[], b: any[]) => a.length === b.length && a.every((item, i) => item === b[i]);

    const hasChanges = useMemo(() => {
        if (!roomToEdit || editingRoomIndex === null) return true;
        const originalKids = (roomToEdit.kidsInRoom || roomToEdit.kidIndices || []).sort((a: number, b: number) => a - b);
        const originalNights = (roomToEdit.nights || []).sort((a: number, b: number) => a - b);
        const originalRoomType = roomToEdit.roomType?.split(' : ')[0] || 'single';
        const originalPackageId = roomToEdit.room?.id || null;
        const originalDiscount = getDiscountValue(roomToEdit.selectedDiscount ?? roomToEdit.discount ?? null);
        const originalPax = roomToEdit.paxPerRoom || roomToEdit.adults || 1;
        const originalNumberOfRooms = roomToEdit.numberOfRooms || 1;
        const currentKids = [...selectedKidsForSharing].sort((a, b) => a - b);
        const currentNights = [...selectedNights].sort((a, b) => a - b);
        return (
            roomData.roomType !== originalRoomType ||
            (roomData.selectedPackage?.id || null) !== originalPackageId ||
            getDiscountValue(roomData.selectedDiscount ?? null) !== originalDiscount ||
            !arraysEqual(currentNights, originalNights) ||
            !arraysEqual(currentKids, originalKids) ||
            (roomData.pax || 1) !== originalPax ||
            (roomData.numberOfRooms || 1) !== originalNumberOfRooms
        );
    }, [roomToEdit, editingRoomIndex, roomData, selectedNights, selectedKidsForSharing]);

    const isAddRoomDisabled =
        !roomData.selectedPackage ||
        selectedNights.length === 0 ||
        (editingRoomIndex === null && !canAllocateAdults) ||
        (editingRoomIndex !== null && !hasChanges && !canAllocateAdults) ||
        (isSharingWithKids && selectedKidsForSharing.length > 0 && !canAllocateKids);

    let buttonMessage = '';
    if (!roomData.selectedPackage) buttonMessage = 'Please select a room package';
    else if (selectedNights.length === 0) buttonMessage = 'Please select at least one night';
    else if (!canAllocateAdults) buttonMessage = 'Not enough adults remaining for selected nights';
    else if (!canAllocateKids && selectedKidsForSharing.length > 0) buttonMessage = 'Not enough kids remaining for selected nights';
    else if (editingRoomIndex !== null && !hasChanges) buttonMessage = 'No changes detected';
    else buttonMessage = editingRoomIndex !== null ? 'Update Room Configuration' : 'Add Room Configuration';

    const fetchMeals = async () => {
        setIsMealsLoading(true);
        try {
            const response = await axios.get('https://website-cms.tafaria.com/api/meals', { withCredentials: false });
            setMeals(response.data.data || []);
        } catch (error) {
            console.error('Error fetching meals:', error);
        } finally {
            setIsMealsLoading(false);
        }
    };

    useEffect(() => {
        fetchMeals();
    }, []);

    const calculateKidsCost = useCallback(
        (boardType: string, selectedKids: number[]) => {
            let kidsCost = 0;
            selectedKids.forEach((kidIndex) => {
                const kidAge = formData.kids?.[kidIndex]?.age;
                if (kidAge >= 4 && kidAge <= 11) {
                    const breakfast = meals.find((m) => m.name === 'Breakfast')?.child_rate_kshs || 0;
                    const lunch = meals.find((m) => m.name === 'Lunch')?.child_rate_kshs || 0;
                    const dinner = meals.find((m) => m.name === 'Dinner')?.child_rate_kshs || 0;
                    let perKidCost = 0;
                    if (activeTab === 'edit') {
                        const roomCreatedAt = new Date(adultRooms[0]?.room?.created_at);
                        if (roomCreatedAt < cutoffDate) {
                            if (boardType === 'Full Board') perKidCost = 6000;
                            else if (boardType === 'Half Board') perKidCost = 4600;
                            else if (boardType === 'Bed & Breakfast') perKidCost = 3000;
                        } else {
                            if (boardType === 'Full Board') perKidCost = breakfast + lunch + dinner;
                            else if (boardType === 'Half Board') perKidCost = breakfast + dinner;
                            else if (boardType === 'Bed & Breakfast') perKidCost = breakfast;
                            perKidCost += 2000;
                        }
                    } else {
                        if (boardType === 'Full Board') perKidCost = breakfast + lunch + dinner;
                        else if (boardType === 'Half Board') perKidCost = breakfast + dinner;
                        else if (boardType === 'Bed & Breakfast') perKidCost = breakfast;
                        perKidCost += 2000;
                    }
                    kidsCost += perKidCost;
                }
            });
            return kidsCost;
        },
        [formData.kids, roomData.selectedPackage, roomData.roomType, meals, activeTab, adultRooms],
    );

    const handleRoomSelectionChange = useCallback((data: RoomSelectionExtended) => {
        setRoomData(data);
        setAdultRoomType(
            data.selectedPackage
                ? `${data.roomType} : ${data.selectedPackage.name} : Ksh ${data.selectedPackage.amount_ksh}`
                : `${data.roomType} : No Package Selected`,
        );
        setBoardType(data.selectedPackage ? data.selectedPackage.board_type : 'No Package Selected');
        setPaxPerRoomAdult(data.pax);
        setNumberOfRooms(data.numberOfRooms);
    }, []);

    const handleNightSelection = (night: number) => {
        setSelectedNights((prev) => (prev.includes(night) ? prev.filter((n) => n !== night) : [...prev, night].sort((a, b) => a - b)));
    };

    const handleRoomSelection = () => {
        const roomRate = roomData.selectedPackage?.amount_ksh ?? 0;
        const kidsCost = calculateKidsCost(boardType, selectedKidsForSharing);
        const qualifyingKidsCount = selectedKidsForSharing.filter((idx) => {
            const age = formData.kids?.[idx]?.age;
            return age >= 4 && age <= 11;
        }).length;
        const holidaySupplementPerRoom = hasHoliday
            ? (HOLIDAY_SUPPLEMENT * paxPerRoomAdult + (HOLIDAY_SUPPLEMENT / 2) * qualifyingKidsCount) * holidayNights
            : 0;

        const totalCostPerRoom = (roomRate + kidsCost) * selectedNights.length + holidaySupplementPerRoom;

        const newRoom = {
            room: roomData.selectedPackage,
            discount: roomData.selectedDiscount,
            roomType: adultRoomType,
            boardType,
            paxPerRoom: paxPerRoomAdult + selectedKidsForSharing.length,
            adults: paxPerRoomAdult,
            kidsInRoom: [...selectedKidsForSharing],
            nights: [...selectedNights],
            numberOfRooms: 1,
            adultCost: roomRate * selectedNights.length,
            kidsCost: kidsCost * selectedNights.length,
            holidaySupplement: holidaySupplementPerRoom,
            holidayNights: hasHoliday ? holidayNights : undefined,
            holidayLabel: hasHoliday ? holidayLabel : undefined,
            holidayMessage: hasHoliday ? `Includes ${holidayLabel} supplement (KES ${holidaySupplementPerRoom.toLocaleString()})` : undefined,
            cost: totalCostPerRoom,
            isKidsRoom: false,
        };

        const totalAdultsAllocated = paxPerRoomAdult * numberOfRooms;
        const totalKidsAllocated = selectedKidsForSharing.length * numberOfRooms;

        selectedNights.forEach((night) => {
            allocatedAdultsPerNight[night] = (allocatedAdultsPerNight[night] || 0) + totalAdultsAllocated;
            if (selectedKidsForSharing.length > 0) {
                allocatedKidsPerNight[night] = (allocatedKidsPerNight[night] || 0) + totalKidsAllocated;
                kidsAssignedNights[night] = [...(kidsAssignedNights[night] || []), ...selectedKidsForSharing];
            }
        });

        if (editingRoomIndex !== null) {
            onEditRoom(editingRoomIndex, newRoom);
        } else {
            for (let i = 0; i < numberOfRooms; i++) onAddRoom({ ...newRoom });
        }

        setSelectedKidsForSharing([]);
        setSelectedNights([]);
        setAdultRoomType('single');
        setBoardType('');
        setPaxPerRoomAdult(1);
        setNumberOfRooms(1);
        setIsSharingWithKids(false);
        setRoomData({ roomType: 'single', selectedPackage: null, selectedDiscount: null, pax: 1, numberOfRooms: 1 });
        if (roomSetUpRef.current) roomSetUpRef.current.reset();
    };

    const isNightFullyAllocatedForAdults = (night: number) => (allocatedAdultsPerNight[night] || 0) >= totalAdults;
    const isNightFullyAllocatedForKids = (night: number) => (allocatedKidsPerNight[night] || 0) >= formData.kids?.length;

    return (
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 text-lg font-medium">{editingRoomIndex !== null ? 'Edit Adult Room' : 'Adult Room Selection'}</h3>

            {hasHoliday && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="font-semibold text-amber-800">🎄 {holidayLabel} Supplement Applies</p>
                    <p className="mt-1 text-sm text-amber-700">
                        KES {HOLIDAY_SUPPLEMENT.toLocaleString()} per person and KES {(HOLIDAY_SUPPLEMENT / 2).toLocaleString()} per qualifying child
                        (age 4–11) per night × <strong>{holidayNights}</strong> holiday night
                        {holidayNights > 1 ? 's' : ''}.
                    </p>
                    {roomData.selectedPackage && (
                        <p className="mt-1 text-sm font-medium text-amber-800">
                            Supplement for this config: KES {previewHolidaySupplement.toLocaleString()} ({paxPerRoomAdult * numberOfRooms} adult
                            {paxPerRoomAdult > 1 ? 's' : ''}
                            {selectedKidsForSharing.length > 0
                                ? ` + ${selectedKidsForSharing.length} kid${selectedKidsForSharing.length > 1 ? 's' : ''}`
                                : ''}
                            )
                        </p>
                    )}
                </div>
            )}

            <label className="block text-sm font-medium text-gray-700">Select Room Type for Adults</label>
            <RoomSetUp
                ref={roomSetUpRef}
                onSelectionChange={handleRoomSelectionChange}
                selectedKidsForSharing={selectedKidsForSharing}
                formData={formData}
                isMealsLoading={isMealsLoading}
                calculateKidsCost={calculateKidsCost}
                boardType={boardType}
                roomToEdit={roomToEdit}
                activeTab={activeTab}
            />

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Pax per Room for Adults: {paxPerRoomAdult}</label>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Number of Rooms: {numberOfRooms}</label>
                    <p className="text-sm text-gray-600">Total Adults: {paxPerRoomAdult * numberOfRooms}</p>
                </div>
            </div>

            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Select Nights for This Room Configuration</label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from({ length: totalNights }, (_, i) => i + 1).map((night) => (
                        <label key={night} className="inline-flex items-center">
                            <input
                                type="checkbox"
                                checked={selectedNights.includes(night)}
                                onChange={() => handleNightSelection(night)}
                                disabled={isNightFullyAllocatedForAdults(night)}
                                className="h-4 w-4 rounded text-blue-600"
                            />
                            <span className={`ml-2 text-sm ${isNightFullyAllocatedForAdults(night) ? 'text-gray-400' : ''}`}>
                                Night {night} {isNightFullyAllocatedForAdults(night) && '(fully allocated)'}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {numberOfRooms === 1 && (
                <>
                    <label className="mt-4 flex items-center text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={isSharingWithKids}
                            onChange={(e) => setIsSharingWithKids(e.target.checked)}
                            className="mr-2"
                        />
                        Are any kids sharing a room with adults?
                    </label>
                    {isSharingWithKids && (
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700">Select Kids to Share with Adults (per room)</label>
                            <p className="mb-2 text-sm text-gray-600">
                                These kids will be assigned to each of the {numberOfRooms} room{numberOfRooms > 1 ? 's' : ''}. Total kids needed:{' '}
                                {selectedKidsForSharing.length * numberOfRooms}
                            </p>
                            {formData.kids?.length > 0 && adjustedAssignedKids.length > 0 ? (
                                adjustedAssignedKids.map((index) => {
                                    const kid = formData.kids[index];
                                    if (kid?.age <= 12) {
                                        return (
                                            <div key={index} className="mt-2">
                                                <label className="flex items-center text-sm font-medium text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedKidsForSharing.includes(index)}
                                                        onChange={() => {
                                                            const updatedKids = [...selectedKidsForSharing];
                                                            if (updatedKids.includes(index)) updatedKids.splice(updatedKids.indexOf(index), 1);
                                                            else updatedKids.push(index);
                                                            setSelectedKidsForSharing(updatedKids);
                                                        }}
                                                        disabled={selectedNights.some(
                                                            (night) =>
                                                                (allocatedKidsPerNight[night] || 0) +
                                                                    selectedKidsForSharing.length * numberOfRooms +
                                                                    (selectedKidsForSharing.includes(index) ? 0 : numberOfRooms) >
                                                                formData.kids?.length,
                                                        )}
                                                        className="mr-2"
                                                    />
                                                    Kid {kid.id || index + 1} (Age: {kid.age === 0 ? 0 : kid.age || 'Unknown'}) -{' '}
                                                    {kid.age <= 3 ? 'Free' : '50% of meals'}
                                                </label>
                                            </div>
                                        );
                                    }
                                    return null;
                                })
                            ) : (
                                <p className="text-sm text-gray-600">
                                    {selectedNights.length > 0
                                        ? 'No kids available for the selected nights.'
                                        : 'Please select at least one night to assign kids.'}
                                </p>
                            )}
                            {remainingKidsPerNight.some((r) => r.remainingKids > 0) ? (
                                <p className="mt-2 text-sm text-blue-600">
                                    Kids remaining:{' '}
                                    {remainingKidsPerNight
                                        .filter((r) => r.remainingKids > 0)
                                        .map((r) => `Night ${r.night} (${r.remainingKids})`)
                                        .join(', ')}
                                </p>
                            ) : (
                                <p className="mt-2 text-sm text-green-600">All kids and nights have been allocated</p>
                            )}
                            {!canAllocateKids && selectedKidsForSharing.length > 0 && (
                                <p className="mt-2 text-sm text-red-600">
                                    Cannot allocate {selectedKidsForSharing.length * numberOfRooms} kid(s) to selected nights.
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}

            {remainingAdultsPerNight.some((r) => r.remainingAdults > 0) ? (
                <p className="mt-2 text-sm text-blue-600">
                    Adults remaining:{' '}
                    {remainingAdultsPerNight
                        .filter((r) => r.remainingAdults > 0)
                        .map((r) => `Night ${r.night} (${r.remainingAdults})`)
                        .join(', ')}
                </p>
            ) : (
                <p className="mt-2 text-sm text-green-600">All adults and nights have been allocated</p>
            )}

            <button
                onClick={handleRoomSelection}
                disabled={isAddRoomDisabled}
                className={`mt-6 w-full rounded-md p-2 transition ${
                    isAddRoomDisabled ? 'cursor-not-allowed bg-gray-400 text-gray-200' : 'bg-green-500 text-white hover:bg-green-600'
                }`}
            >
                {buttonMessage}
            </button>
        </div>
    );
};

export default AdultRoomSelection;
