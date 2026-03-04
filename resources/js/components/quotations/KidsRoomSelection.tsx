import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RoomSetUpKids, { Meal, RoomSelection } from '../home/quotation/rooms/RoomSetUpKids';

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
    return { start: new Date(year, month, day - 2), end: new Date(year, month, day + 1) };
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

interface KidsRoomSelectionProps {
    formData: any;
    assignedKids: number[];
    onAddRoom: (room: any) => void;
    onEditRoom: (index: number, room: any) => void;
    totalKids: number;
    kidsRooms: any[];
    adultRooms: any[];
    activeTab: string;
    editingRoomIndex: number | null;
    roomToEdit: any | null;
}

interface RoomSelectionExtended {
    roomType: string;
    selectedPackage: any;
    selectedDiscount: number | null;
    pax: number;
}

const KidsRoomSelection: React.FC<KidsRoomSelectionProps> = ({
    formData,
    assignedKids,
    onAddRoom,
    onEditRoom,
    totalKids,
    activeTab,
    kidsRooms,
    adultRooms,
    editingRoomIndex,
    roomToEdit,
}) => {
    const [kidsRoomType, setKidsRoomType] = useState('single');
    const [boardType, setBoardType] = useState('');
    const [paxPerRoomKids, setPaxPerRoomKids] = useState(1);
    const [selectedKidsForKidsRoom, setSelectedKidsForKidsRoom] = useState<number[]>([]);
    const [selectedNights, setSelectedNights] = useState<number[]>([]);
    const [roomData, setRoomData] = useState<RoomSelectionExtended>({
        roomType: 'single',
        selectedPackage: null,
        selectedDiscount: null,
        pax: 1,
    });
    const [meals, setMeals] = useState<Meal[]>([]);
    const [isMealsLoading, setIsMealsLoading] = useState<boolean>(true);

    const roomSetUpKidsRef = useRef<{ reset: () => void }>(null);

    const holidayNights = useMemo(() => countHolidayNights(formData.checkIn, formData.checkOut), [formData.checkIn, formData.checkOut]);
    const holidayLabel = useMemo(() => getHolidayLabel(formData.checkIn, formData.checkOut), [formData.checkIn, formData.checkOut]);
    const hasHoliday = holidayNights > 0;

    const previewHolidaySupplement = useMemo(() => {
        if (!hasHoliday) return 0;
        const qualifyingKids = selectedKidsForKidsRoom.filter((idx) => {
            const age = formData.kids?.[idx]?.age;
            return age >= 4 && age <= 11;
        }).length;
        return (HOLIDAY_SUPPLEMENT / 2) * qualifyingKids * holidayNights;
    }, [hasHoliday, selectedKidsForKidsRoom, holidayNights, formData.kids]);

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

    useMemo(() => {
        if (roomToEdit && editingRoomIndex !== null) {
            const roomType = roomToEdit.roomType?.split(' : ')[0] || 'single';
            setKidsRoomType(roomType);
            setBoardType(roomToEdit.boardType || '');
            setPaxPerRoomKids(roomToEdit.paxPerRoom || roomToEdit.kidsInRoom?.length || 1);
            const kidsInRoom = roomToEdit.kidsInRoom || roomToEdit.kidIndices || [];
            const validKidsInRoom = kidsInRoom.filter(
                (index: number) => Number.isInteger(index) && index >= 0 && index < (formData.kids?.length || 0),
            );
            setSelectedKidsForKidsRoom(validKidsInRoom);
            setSelectedNights(roomToEdit.nights || []);
            setRoomData({
                roomType,
                selectedPackage: roomToEdit.room || null,
                selectedDiscount: roomToEdit.selectedDiscount ?? roomToEdit.discount ?? null,
                pax: roomToEdit.paxPerRoom || roomToEdit.kidsInRoom?.length || 1,
            });
        }
    }, [roomToEdit, editingRoomIndex, formData.kids]);

    const allocatedKidsPerNight = useMemo(() => {
        const allocation: Record<number, number> = {};
        [...kidsRooms, ...adultRooms].forEach((room, index) => {
            if (editingRoomIndex === null || index !== editingRoomIndex || room.isKidsRoom) {
                const kidsCount = Array.isArray(room.kidsInRoom) ? room.kidsInRoom.length : 0;
                (room.nights || []).forEach((night: number) => {
                    if (Number.isInteger(night) && night > 0) allocation[night] = (allocation[night] || 0) + kidsCount;
                });
            }
        });
        return allocation;
    }, [kidsRooms, adultRooms, editingRoomIndex]);

    const totalNights = formData.numNights || 0;

    const remainingKidsPerNight = useMemo(
        () =>
            Array.from({ length: totalNights }, (_, i) => {
                const night = i + 1;
                return { night, remainingKids: Math.max(totalKids - (allocatedKidsPerNight[night] || 0), 0) };
            }),
        [totalNights, totalKids, allocatedKidsPerNight],
    );

    const kidsAssignedNights = useMemo(() => {
        const assigned: Record<number, number[]> = {};
        [...kidsRooms, ...adultRooms].forEach((room, index) => {
            if (editingRoomIndex === null || index !== editingRoomIndex || room.isKidsRoom) {
                const kids = Array.isArray(room.kidsInRoom) ? room.kidsInRoom : [];
                (room.nights || []).forEach((night: number) => {
                    if (Number.isInteger(night) && night > 0) assigned[night] = [...(assigned[night] || []), ...kids];
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

    const canAllocateKids = useMemo(() => {
        if (editingRoomIndex !== null && roomToEdit) {
            const originalKidsCount = roomToEdit.kidsInRoom?.length || roomToEdit.paxPerRoom || 1;
            const kidsDifference = selectedKidsForKidsRoom.length - originalKidsCount;
            return selectedNights.every((night) => {
                const currentlyAllocated = allocatedKidsPerNight[night] || 0;
                if (roomToEdit.nights.includes(night)) return currentlyAllocated + kidsDifference <= totalKids;
                return currentlyAllocated + selectedKidsForKidsRoom.length <= totalKids;
            });
        }
        return selectedNights.every((night) => (allocatedKidsPerNight[night] || 0) + selectedKidsForKidsRoom.length <= totalKids);
    }, [allocatedKidsPerNight, selectedKidsForKidsRoom, selectedNights, editingRoomIndex, roomToEdit, totalKids]);

    const arraysEqual = (a: any[], b: any[]) => a.length === b.length && a.every((item, i) => item === b[i]);

    const hasChanges = useMemo(() => {
        if (!roomToEdit || editingRoomIndex === null) return true;
        const originalKids = (roomToEdit.kidsInRoom || roomToEdit.kidIndices || []).sort();
        const originalNights = (roomToEdit.nights || []).sort();
        const originalRoomType = roomToEdit.roomType?.split(' : ')[0] || 'single';
        const originalPackageId = roomToEdit.room?.id || null;
        const originalDiscount = roomToEdit.selectedDiscount ?? roomToEdit.discount ?? null;
        const originalPax = roomToEdit.paxPerRoom || roomToEdit.kidsInRoom?.length || 1;
        return (
            roomData.roomType !== originalRoomType ||
            (roomData.selectedPackage?.id || null) !== originalPackageId ||
            (roomData.selectedDiscount ?? null) !== originalDiscount ||
            !arraysEqual([...selectedNights].sort(), originalNights) ||
            !arraysEqual([...selectedKidsForKidsRoom].sort(), originalKids) ||
            (roomData.pax || 1) !== originalPax
        );
    }, [roomToEdit, editingRoomIndex, roomData, selectedNights, selectedKidsForKidsRoom]);

    const isAddRoomDisabled =
        !roomData.selectedPackage ||
        selectedNights.length === 0 ||
        selectedKidsForKidsRoom.length === 0 ||
        (editingRoomIndex === null && !canAllocateKids) ||
        (editingRoomIndex !== null && !hasChanges && !canAllocateKids);

    let buttonMessage = '';
    if (!roomData.selectedPackage) buttonMessage = 'Please select a room package';
    else if (selectedNights.length === 0) buttonMessage = 'Please select at least one night';
    else if (selectedKidsForKidsRoom.length === 0) buttonMessage = 'Please select at least one kid';
    else if (!canAllocateKids) buttonMessage = 'Not enough kids remaining for selected nights';
    else if (editingRoomIndex !== null && !hasChanges) buttonMessage = 'No changes detected';
    else buttonMessage = editingRoomIndex !== null ? 'Update Room Configuration' : 'Add Room Configuration';

    const handleRoomSelectionKidsChange = useCallback((data: RoomSelection) => {
        data.holidayLabel = getHolidayLabel(formData.checkIn, formData.checkOut);
        data.holidayNights = countHolidayNights(formData.checkIn, formData.checkOut);
        data.holidaySupplement = data.holidayNights > 0 ? HOLIDAY_SUPPLEMENT : 0;
        setRoomData(data);
        setKidsRoomType(
            data.selectedPackage
                ? `${data.roomType} : ${data.selectedPackage.name} : Ksh ${data.selectedPackage.amount_ksh}`
                : `${data.roomType} : No Package Selected`,
        );
        setBoardType(data.selectedPackage ? data.selectedPackage.board_type : 'No Package Selected');
        setPaxPerRoomKids(data.pax);
    }, []);

    const handleNightSelection = (night: number) => {
        setSelectedNights((prev) => (prev.includes(night) ? prev.filter((n) => n !== night) : [...prev, night].sort((a, b) => a - b)));
    };

    const handleKidsRoomSelection = () => {
        console.log('Selected room data for kids room:', roomData);
        const packageCost = roomData.selectedPackage?.amount_ksh * 0.8 || 0;
        let kidsMealCost = 0;
        const cutoffDate = new Date('2025-11-05T00:00:00');

        if ((roomData.roomType === 'double' || roomData.roomType === 'twin') && selectedKidsForKidsRoom.length === 3) {
            const breakfast = meals?.find((m: any) => m.name === 'Breakfast')?.child_rate_kshs || 0;
            const lunch = meals?.find((m: any) => m.name === 'Lunch')?.child_rate_kshs || 0;
            const dinner = meals?.find((m: any) => m.name === 'Dinner')?.child_rate_kshs || 0;
            const isEdit = activeTab === 'edit';
            const roomCreatedAt = isEdit && kidsRooms[0]?.room?.created_at ? new Date(kidsRooms[0].room.created_at) : new Date();
            if (isEdit && roomCreatedAt < cutoffDate) {
                if (roomData.selectedPackage?.board_type === 'Full Board') kidsMealCost = 6000;
                else if (roomData.selectedPackage?.board_type === 'Half Board') kidsMealCost = 4600;
                else if (roomData.selectedPackage?.board_type === 'Bed & Breakfast') kidsMealCost = 3000;
            } else {
                if (roomData.selectedPackage?.board_type === 'Full Board') kidsMealCost = breakfast + lunch + dinner;
                else if (roomData.selectedPackage?.board_type === 'Half Board') kidsMealCost = breakfast + dinner;
                else if (roomData.selectedPackage?.board_type === 'Bed & Breakfast') kidsMealCost = breakfast;
                kidsMealCost += 2000;
            }
        }

        const qualifyingKidsCount = selectedKidsForKidsRoom.filter((idx) => {
            const age = formData.kids?.[idx]?.age;
            return age >= 4 && age <= 11;
        }).length;
        const holidaySupplementTotal = hasHoliday ? (HOLIDAY_SUPPLEMENT / 2) * qualifyingKidsCount * holidayNights : 0;

        const totalCostPerNight = packageCost + kidsMealCost;
        const kidRoomCost = totalCostPerNight * selectedNights.length;
        const kidTotalRoomCost = totalCostPerNight * selectedNights.length + holidaySupplementTotal;

        const newRoom = {
            room: roomData.selectedPackage,
            discount: roomData.selectedDiscount,
            roomType: kidsRoomType,
            boardType,
            paxPerRoom: selectedKidsForKidsRoom.length,
            adults: 0,
            kidsInRoom: selectedKidsForKidsRoom,
            nights: selectedNights,
            kidsCost: kidRoomCost,
            adultCost: 0,
            cost: kidTotalRoomCost,
            isKidsRoom: true,
            holidayNights,
            holidaySupplement: holidaySupplementTotal,
            holidayLabel,
        };
        if (editingRoomIndex !== null) {
            onEditRoom(editingRoomIndex, newRoom);
        } else {
            onAddRoom(newRoom);
            if (roomSetUpKidsRef.current) roomSetUpKidsRef.current.reset();
        }

        setSelectedKidsForKidsRoom([]);
        setSelectedNights([]);
        setKidsRoomType('single');
        setBoardType('');
        setPaxPerRoomKids(1);
        setRoomData({ roomType: 'single', selectedPackage: null, selectedDiscount: null, pax: 1 });
    };

    const isNightFullyAllocated = (night: number) => (allocatedKidsPerNight[night] || 0) >= totalKids;

    return (
        <div className="mt-6 rounded-lg bg-[#c9f6da] p-4">
            <h3 className="mb-2 text-lg font-medium">{editingRoomIndex !== null ? 'Edit Kids Room' : 'Kids Room Selection'}</h3>

            {hasHoliday && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="font-semibold text-amber-800">🎄 {holidayLabel} Supplement Applies</p>
                    <p className="mt-1 text-sm text-amber-700">
                        KES {(HOLIDAY_SUPPLEMENT / 2).toLocaleString()} per qualifying child (age 4–11) per night × <strong>{holidayNights}</strong>{' '}
                        holiday night{holidayNights > 1 ? 's' : ''}.
                    </p>
                    {selectedKidsForKidsRoom.length > 0 && (
                        <p className="mt-1 text-sm font-medium text-amber-800">
                            Supplement for this config: KES {previewHolidaySupplement.toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            <label className="block text-sm font-medium text-gray-700">Select Room Type for Kids</label>
            <RoomSetUpKids
                ref={roomSetUpKidsRef}
                onSelectionChange={handleRoomSelectionKidsChange}
                roomToEdit={roomToEdit}
                activeTab={activeTab}
                formData={formData}
            />
            <label className="mt-4 block text-sm font-medium text-gray-700">Pax per Room for Kids: {paxPerRoomKids}</label>
            {roomData.selectedDiscount !== null && (
                <p className="mt-2 text-sm text-blue-600">Selected Discount: {roomData.selectedDiscount.toFixed(3)}%</p>
            )}

            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Select Nights for This Room Configuration</label>
                <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from({ length: totalNights }, (_, i) => i + 1).map((night) => (
                        <label key={night} className="inline-flex items-center">
                            <input
                                type="checkbox"
                                checked={selectedNights.includes(night)}
                                onChange={() => handleNightSelection(night)}
                                disabled={isNightFullyAllocated(night)}
                                className="h-4 w-4 rounded text-blue-600"
                            />
                            <span className={`ml-2 text-sm ${isNightFullyAllocated(night) ? 'text-gray-400' : ''}`}>
                                Night {night} {isNightFullyAllocated(night) && '(fully allocated)'}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <label className="mt-4 block text-sm font-medium text-gray-700">Select Kids for This Room</label>
            {formData.kids?.length > 0 && adjustedAssignedKids.length > 0 ? (
                adjustedAssignedKids.map((index) => {
                    const kid = formData.kids[index];
                    if (kid?.age <= 12) {
                        const kidPosition = selectedKidsForKidsRoom.indexOf(index);
                        const isThirdKid =
                            kidPosition === 2 &&
                            selectedKidsForKidsRoom.length === 3 &&
                            (roomData.roomType === 'double' || roomData.roomType === 'twin');
                        const isFirstOrSecondKid =
                            (kidPosition === 0 || kidPosition === 1) &&
                            selectedKidsForKidsRoom.length >= 1 &&
                            (roomData.roomType === 'double' || roomData.roomType === 'twin');
                        const willBeThirdKid =
                            !selectedKidsForKidsRoom.includes(index) &&
                            selectedKidsForKidsRoom.length === 2 &&
                            (roomData.roomType === 'double' || roomData.roomType === 'twin');

                        const breakfast = meals?.find((m: any) => m.name === 'Breakfast')?.child_rate_kshs || 0;
                        const lunch = meals?.find((m: any) => m.name === 'Lunch')?.child_rate_kshs || 0;
                        const dinner = meals?.find((m: any) => m.name === 'Dinner')?.child_rate_kshs || 0;
                        const cutoffDate = new Date('2025-11-05T00:00:00');
                        const isEdit = activeTab === 'edit';
                        const roomCreatedAt = isEdit && kidsRooms[0]?.room?.created_at ? new Date(kidsRooms[0].room.created_at) : new Date();
                        let mealLabel = '80% of room rate';

                        if (isThirdKid || willBeThirdKid) {
                            let cost = 0;
                            if (isEdit && roomCreatedAt < cutoffDate) {
                                if (roomData.selectedPackage?.board_type === 'Full Board') cost = 6000;
                                else if (roomData.selectedPackage?.board_type === 'Half Board') cost = 4600;
                                else if (roomData.selectedPackage?.board_type === 'Bed & Breakfast') cost = 3000;
                            } else {
                                if (roomData.selectedPackage?.board_type === 'Full Board') cost = breakfast + lunch + dinner + 2000;
                                else if (roomData.selectedPackage?.board_type === 'Half Board') cost = breakfast + dinner + 2000;
                                else if (roomData.selectedPackage?.board_type === 'Bed & Breakfast') cost = breakfast + 2000;
                            }
                            mealLabel = `Meals plus bed = Ksh ${cost}`;
                        }

                        const isQualifyingAge = kid.age >= 4 && kid.age <= 11;
                        const holidayNote =
                            hasHoliday && isQualifyingAge
                                ? ` + KES ${((HOLIDAY_SUPPLEMENT / 2) * holidayNights).toLocaleString()} ${holidayLabel} supp.`
                                : '';

                        return (
                            <div key={index} className="mt-2">
                                <label className="flex items-center text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={selectedKidsForKidsRoom.includes(index)}
                                        onChange={() => {
                                            const updatedKids = [...selectedKidsForKidsRoom];
                                            if (updatedKids.includes(index)) updatedKids.splice(updatedKids.indexOf(index), 1);
                                            else updatedKids.push(index);
                                            setSelectedKidsForKidsRoom(updatedKids);
                                            setPaxPerRoomKids(updatedKids.length);
                                            setRoomData((prev) => ({ ...prev, pax: updatedKids.length }));
                                        }}
                                        disabled={selectedNights.some(
                                            (night) =>
                                                (allocatedKidsPerNight[night] || 0) +
                                                    selectedKidsForKidsRoom.length +
                                                    (selectedKidsForKidsRoom.includes(index) ? 0 : 1) >
                                                totalKids,
                                        )}
                                        className="mr-2"
                                    />
                                    Kid {kid.id || index + 1} (Age: {kid.age === 0 ? 0 : kid.age || 'Unknown'}) –{' '}
                                    <span className="text-blue-600">
                                        {isThirdKid || willBeThirdKid ? mealLabel : isFirstOrSecondKid ? '80% of room rate' : '80% of room rate'}
                                    </span>
                                    {holidayNote && <span className="ml-1 text-amber-700">{holidayNote}</span>}
                                </label>
                            </div>
                        );
                    }
                    return null;
                })
            ) : (
                <p className="text-sm text-gray-600">
                    {selectedNights.length > 0 ? 'No kids available for the selected nights.' : 'Please select at least one night to assign kids.'}
                </p>
            )}

            {remainingKidsPerNight.some((r) => r.remainingKids > 0) ? (
                <>
                    <p className="mt-2 text-sm text-blue-600">
                        Kids remaining:{' '}
                        {remainingKidsPerNight
                            .filter((r) => r.remainingKids > 0)
                            .map((r) => `Night ${r.night} (${r.remainingKids})`)
                            .join(', ')}
                    </p>
                    {!canAllocateKids && selectedKidsForKidsRoom.length > 0 && (
                        <p className="mt-2 text-sm text-red-600">Cannot allocate {selectedKidsForKidsRoom.length} kid(s) to selected nights.</p>
                    )}
                </>
            ) : (
                <p className="mt-2 text-sm text-green-600">All kids and nights have been allocated</p>
            )}

            <button
                onClick={handleKidsRoomSelection}
                disabled={isAddRoomDisabled}
                className={`mt-6 w-full rounded-md p-2 transition ${
                    isAddRoomDisabled ? 'cursor-not-allowed bg-gray-400 text-gray-200' : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
            >
                {buttonMessage}
            </button>
        </div>
    );
};

export default KidsRoomSelection;
