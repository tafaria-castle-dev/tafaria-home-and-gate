/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { isHolidayDate } from '@/components/utils/holidayDates';
import { useEffect, useState } from 'react';
import PriceSummary from './PriceSummary';

interface RoomConfiguration {
    id: string;
    baseRoomId: string;
    nights: number;
    discount: number;
    discountKsh: number;
    pax: number;
    boardType: string;
    amount: number;
    total: number;
    discountedTotal: number;
    roomType: string;
    holidaySupplement: number;
    holidayNights?: number;
    holidayLabel?: string;
}

const HOLIDAY_SUPPLEMENT_PER_PERSON_PER_NIGHT = 4000;

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
    let christmas = false;
    let easter = false;
    const current = new Date(checkIn);
    const end = new Date(checkOut);
    while (current < end) {
        if (isHolidayDate(current)) {
            const m = current.getMonth();
            const d = current.getDate();
            if (m === 11 && d >= 24 && d <= 26) christmas = true;
            else easter = true;
        }
        current.setDate(current.getDate() + 1);
    }
    const labels: string[] = [];
    if (christmas) labels.push('Christmas');
    if (easter) labels.push('Easter');
    return labels.join(' & ');
}

const PriceInput = ({
    selectedRooms,
    roomSettings,
    roomType,
    formData,
    onUpdateRooms,
}: {
    selectedRooms: any[];
    roomSettings: any[];
    roomType: any;
    formData: any;
    onUpdateRooms: any;
}) => {
    const [roomConfigurations, setRoomConfigurations] = useState<RoomConfiguration[]>([]);
    const [currentConfig, setCurrentConfig] = useState<{
        [roomId: string]: {
            pax: number;
            nights: number;
            discount: number;
            discountKsh: number;
        };
    }>({});

    const paxMultiplier: Record<string, number> = {
        single: 1,
        double: 2,
        triple: 3,
        quadra: 4,
        twin: 2,
    };

    const holidayNights = countHolidayNights(formData.checkIn, formData.checkOut);
    const holidayLabel = getHolidayLabel(formData.checkIn, formData.checkOut);
    const hasHoliday = holidayNights > 0;

    const computeHolidaySupplement = (numPeople: number): number => {
        if (!hasHoliday) return 0;
        return HOLIDAY_SUPPLEMENT_PER_PERSON_PER_NIGHT * numPeople * holidayNights;
    };

    useEffect(() => {
        const existingConfigs = selectedRooms.filter((room) => room.room_type === roomType);
        if (existingConfigs.length > 0) {
            const mappedConfigs = existingConfigs.map((room) => {
                const peopleCount = room.rooms * (paxMultiplier[room.room_type.toLowerCase()] || 1);
                const holidaySupp = computeHolidaySupplement(peopleCount);
                console.log('Room', room);
                return {
                    id: room.id,
                    baseRoomId: room.baseRoomId || room.id,
                    nights: room.nights,
                    discount: room.selectedDiscount || 0,
                    discountKsh: Math.round((room.selectedDiscount / 100) * (room.total - room.holidaySupplement)),
                    pax: peopleCount,
                    boardType: room.board_type,
                    amount: room.amount_ksh,
                    total: room.total,
                    discountedTotal: Math.round((room.total - room.holidaySupplement) * (1 - room.selectedDiscount / 100)),
                    roomType: room.room_type,
                    holidaySupplement: holidaySupp,
                };
            });
            setRoomConfigurations(mappedConfigs);
        } else {
            setRoomConfigurations([]);
        }
    }, [selectedRooms, roomType, holidayNights]);

    useEffect(() => {
        const initialConfig = roomSettings.reduce(
            (acc, room) => {
                acc[room.id] = {
                    pax: currentConfig[room.id]?.pax || 0,
                    nights: currentConfig[room.id]?.nights || 1,
                    discount: currentConfig[room.id]?.discount || 0,
                    discountKsh: currentConfig[room.id]?.discountKsh || 0,
                };
                return acc;
            },
            {} as { [roomId: string]: { pax: number; nights: number; discount: number; discountKsh: number } },
        );
        setCurrentConfig(initialConfig);
    }, [roomSettings]);

    const handleConfigChange = (roomId: string, field: 'pax' | 'nights' | 'discount' | 'discountKsh', value: number) => {
        setCurrentConfig((prev) => {
            const newConfig = {
                ...prev,
                [roomId]: { ...prev[roomId], [field]: value },
            };
            if (field === 'discount') {
                const baseTotal = prev[roomId].pax * roomSettings.find((r) => r.id === roomId).amount_ksh * prev[roomId].nights;
                newConfig[roomId].discountKsh = Math.round((value / 100) * baseTotal);
            } else if (field === 'discountKsh') {
                const baseTotal = prev[roomId].pax * roomSettings.find((r) => r.id === roomId).amount_ksh * prev[roomId].nights;
                newConfig[roomId].discount = Math.min((value / baseTotal) * 100, 100);
            }
            return newConfig;
        });
    };

    const addRoomConfiguration = (roomId: string) => {
        const room = roomSettings.find((r) => r.id === roomId);
        if (!room) return;

        const config = currentConfig[roomId];
        if (!config || config.pax <= 0 || config.nights <= 0) {
            alert('Please enter valid room count and nights');
            return;
        }

        const multiplier = paxMultiplier[roomType.toLowerCase()] || 1;
        const guestNightsNeeded = multiplier * config.pax * config.nights;

        const totalAllocatedGuestNights =
            selectedRooms.reduce((sum, r) => {
                const roomMultiplier = paxMultiplier[r.room_type?.toLowerCase()] || 1;
                return sum + roomMultiplier * r.rooms * r.nights;
            }, 0) + guestNightsNeeded;

        const totalRequiredGuestNights = formData.adults * formData.numNights;

        if (totalAllocatedGuestNights > totalRequiredGuestNights) {
            alert(
                `Cannot add configuration. This would require ${totalAllocatedGuestNights} guest-nights, but only ${totalRequiredGuestNights} are needed (${formData.adults} guests × ${formData.numNights} nights).`,
            );
            return;
        }

        const baseTotal = room.amount_ksh * config.pax * config.nights;
        const discountMultiplier = 1 - config.discount / 100;
        const discountedTotal = Math.round(baseTotal * discountMultiplier);

        const numPeople = config.pax * multiplier;
        const holidaySupp = computeHolidaySupplement(numPeople);

        const newConfiguration: RoomConfiguration = {
            id: `${roomId}-${Date.now()}`,
            baseRoomId: roomId,
            nights: config.nights,
            discount: config.discount,
            discountKsh: config.discountKsh,
            pax: numPeople,
            boardType: room.board_type,
            amount: room.amount_ksh,
            discountedTotal: discountedTotal + holidaySupp,
            total: baseTotal + holidaySupp,
            roomType: roomType,
            holidaySupplement: holidaySupp,
            holidayNights: hasHoliday ? holidayNights : undefined,
            holidayLabel: hasHoliday ? holidayLabel : undefined,
        };

        const updatedConfigs = [...roomConfigurations, newConfiguration];
        setRoomConfigurations(updatedConfigs);

        const updatedRooms = [
            ...selectedRooms.filter((r) => r.room_type !== roomType),
            ...updatedConfigs.map((cfg) => ({
                ...roomSettings.find((r) => r.id === cfg.baseRoomId),
                id: cfg.id,
                baseRoomId: cfg.baseRoomId,
                rooms: cfg.pax / (paxMultiplier[cfg.roomType.toLowerCase()] || 1),
                nights: cfg.nights,
                total: cfg.total,
                pax: cfg.pax,
                selectedDiscount: cfg.discount,
                amount_ksh: cfg.amount,
                room_type: cfg.roomType,
                board_type: cfg.boardType,
                holidaySupplement: cfg.holidaySupplement,
                holidayNights: hasHoliday ? holidayNights : undefined,
                holidayLabel: hasHoliday ? holidayLabel : undefined,
            })),
        ];

        onUpdateRooms(updatedRooms);

        setCurrentConfig((prev) => ({
            ...prev,
            [roomId]: { pax: 0, nights: 1, discount: 0, discountKsh: 0 },
        }));
    };

    const removeConfiguration = (configId: string) => {
        const updatedConfigs = roomConfigurations.filter((config) => config.id !== configId);
        setRoomConfigurations(updatedConfigs);

        const updatedRooms = [
            ...selectedRooms.filter((r) => r.room_type !== roomType),
            ...updatedConfigs.map((cfg) => ({
                ...roomSettings.find((r) => r.id === cfg.baseRoomId),
                id: cfg.id,
                baseRoomId: cfg.baseRoomId,
                rooms: cfg.pax / (paxMultiplier[cfg.roomType.toLowerCase()] || 1),
                nights: cfg.nights,
                total: cfg.total,
                pax: cfg.pax,
                selectedDiscount: cfg.discount,
                amount_ksh: cfg.amount,
                room_type: cfg.roomType,
                board_type: cfg.boardType,
                holidaySupplement: cfg.holidaySupplement,
                holidayNights: hasHoliday ? holidayNights : undefined,
                holidayLabel: hasHoliday ? holidayLabel : undefined,
            })),
        ];
        onUpdateRooms(updatedRooms);
    };

    const totalAllocatedGuestNights = selectedRooms.reduce((sum, r) => {
        const roomMultiplier = paxMultiplier[r.room_type?.toLowerCase()] || 1;
        return sum + roomMultiplier * r.rooms * r.nights;
    }, 0);

    const totalRequiredGuestNights = formData.adults * formData.numNights;
    const remainingGuestNights = totalRequiredGuestNights - totalAllocatedGuestNights;

    return (
        <div className="space-y-6">
            {hasHoliday && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm">
                    <p className="font-semibold text-amber-800">🎄 {holidayLabel} Supplement Applies</p>
                    <p className="mt-1 text-sm text-amber-700">
                        A supplement of <strong>KES {HOLIDAY_SUPPLEMENT_PER_PERSON_PER_NIGHT.toLocaleString()}</strong> per person per night applies
                        for <strong>{holidayNights}</strong> holiday night{holidayNights > 1 ? 's' : ''}.
                    </p>
                </div>
            )}

            <div className="rounded-lg bg-blue-50 p-4 shadow-sm">
                <h4 className="mb-3 font-semibold text-gray-800">Booking Summary</h4>
                <p className="mb-3 text-sm">
                    <span className="mr-6 inline-block">
                        Total Guests: <strong>{formData.adults}</strong>
                    </span>
                    <span className="mr-6 inline-block">
                        Total Nights: <strong>{formData.numNights}</strong>
                    </span>
                    <span className="inline-block">
                        Required Guest-Nights: <strong>{totalRequiredGuestNights}</strong>
                    </span>
                </p>
                <p className="text-sm">
                    <span className="mr-6 inline-block">
                        Allocated Guest-Nights: <strong>{totalAllocatedGuestNights}</strong>
                    </span>
                    <span className="inline-block">
                        Remaining:{' '}
                        <strong>
                            <span
                                className={`font-semibold ${
                                    remainingGuestNights < 0 ? 'text-red-600' : remainingGuestNights === 0 ? 'text-green-600' : 'text-blue-600'
                                }`}
                            >
                                {remainingGuestNights}
                            </span>
                        </strong>
                    </span>
                </p>
            </div>

            <div className="rounded-lg bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-800">Add Room Configuration for {roomType}</h3>

                <div className="mb-2 flex w-full max-w-5xl gap-2 text-sm font-semibold text-gray-700">
                    <span className="min-w-[135px]">Board Type</span>
                    <span className="min-w-[80px]">Amount</span>
                    <span className="min-w-[60px]">Rooms</span>
                    <span className="min-w-[60px]">Nights</span>
                    <span className="min-w-[80px]">Discount %</span>
                    <span className="min-w-[80px]">Discount KES</span>
                    {hasHoliday && <span className="min-w-[110px] text-amber-700">Holiday Supp.</span>}
                    <span className="min-w-[80px]">Total</span>
                    <span className="min-w-[80px]">Action</span>
                </div>

                {roomSettings.map((room) => {
                    const config = currentConfig[room.id] || { pax: 0, nights: 1, discount: 0, discountKsh: 0 };
                    const multiplier = paxMultiplier[roomType.toLowerCase()] || 1;
                    const numPeople = config.pax * multiplier;
                    const baseTotal = config.pax * room.amount_ksh * config.nights;
                    const discountMultiplier = 1 - config.discount / 100;
                    const discountedBase = Math.round(baseTotal * discountMultiplier);
                    const holidaySupp = computeHolidaySupplement(numPeople);
                    const grandTotal = discountedBase + holidaySupp;

                    return (
                        <div key={room.id} className="mb-2 flex w-full max-w-5xl items-center gap-2">
                            <span className="min-w-[135px] rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
                                {room.board_type}
                            </span>

                            <span className="min-w-[80px] border-y border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-700">
                                KES {room.amount_ksh.toLocaleString()}
                            </span>

                            <input
                                type="number"
                                min={0}
                                placeholder="Rooms"
                                value={config.pax}
                                onChange={(e) => handleConfigChange(room.id, 'pax', parseInt(e.target.value) || 0)}
                                className="w-[60px] rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                            />

                            <input
                                type="number"
                                min={1}
                                max={formData.numNights}
                                placeholder="Nights"
                                value={config.nights}
                                onChange={(e) => handleConfigChange(room.id, 'nights', parseInt(e.target.value) || 1)}
                                className="w-[60px] rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                            />

                            <input
                                type="number"
                                min={0}
                                max={100}
                                step="0.001"
                                placeholder="0-100%"
                                value={config.discount}
                                onChange={(e) => handleConfigChange(room.id, 'discount', parseFloat(e.target.value) || 0)}
                                className="w-[80px] rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                            />

                            <input
                                type="number"
                                min={0}
                                max={baseTotal}
                                placeholder="KES"
                                value={config.discountKsh}
                                onChange={(e) => handleConfigChange(room.id, 'discountKsh', parseFloat(e.target.value) || 0)}
                                className="w-[80px] rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                            />

                            {hasHoliday && (
                                <span className="min-w-[110px] text-sm font-medium text-amber-700">+ KES {holidaySupp.toLocaleString()}</span>
                            )}

                            <span className="min-w-[80px] text-sm font-semibold text-gray-700">KES {grandTotal.toLocaleString()}</span>

                            <button
                                onClick={() => addRoomConfiguration(room.id)}
                                disabled={config.pax <= 0 || config.nights <= 0}
                                className="min-w-[80px] rounded bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                                Add
                            </button>
                        </div>
                    );
                })}
            </div>

            {roomConfigurations.length > 0 && (
                <div className="rounded-lg border bg-white p-4 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold text-gray-800">Added Configurations ({roomType})</h3>

                    <div className="space-y-2">
                        {roomConfigurations.map((config) => {
                            const roomCount = config.pax / (paxMultiplier[config.roomType.toLowerCase()] || 1);
                            return (
                                <div
                                    key={config.id}
                                    className="flex items-center justify-between rounded border bg-gray-50 p-3 transition hover:bg-gray-100"
                                >
                                    <div className="flex-1">
                                        <span className="font-medium">{config.boardType}</span>
                                        <span className="ml-2 text-gray-600">
                                            {roomCount} room{roomCount > 1 ? 's' : ''} × {config.nights} night{config.nights > 1 ? 's' : ''}
                                            {config.discount > 0 && (
                                                <span className="ml-1 text-green-600">({config.discount.toFixed(2)}% discount)</span>
                                            )}
                                        </span>
                                        {config.holidaySupplement > 0 && (
                                            <span className="ml-2 text-sm font-medium text-amber-700">
                                                + KES {config.holidaySupplement.toLocaleString()} {holidayLabel} supplement
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-medium text-gray-700">
                                            KES {(config.holidaySupplement + config.discountedTotal).toLocaleString()}
                                        </span>
                                        <button
                                            onClick={() => removeConfiguration(config.id)}
                                            className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 hover:text-red-800"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 space-y-1 border-t pt-4">
                        {hasHoliday && (
                            <div className="flex items-center justify-between text-sm text-amber-700">
                                <span>Total {holidayLabel} Supplement:</span>
                                <span className="font-semibold">
                                    KES {roomConfigurations.reduce((sum, c) => sum + c.holidaySupplement, 0).toLocaleString()}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-800">
                                Total: KES {roomConfigurations.reduce((sum, c) => sum + c.discountedTotal + c.holidaySupplement, 0).toLocaleString()}
                            </span>
                            <div />
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6">
                <h2 className="mb-4 text-xl font-bold text-gray-800">All Selected Rooms Summary</h2>
                <PriceSummary selectedRooms={selectedRooms} />
            </div>
        </div>
    );
};

export default PriceInput;
