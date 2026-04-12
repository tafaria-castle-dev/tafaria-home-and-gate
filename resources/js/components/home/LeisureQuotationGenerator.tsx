import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdultRoomSelection from '../quotations/AdultRoomSelection';
import KidsRoomSelection from '../quotations/KidsRoomSelection';
import QuotationSummary from '../quotations/QuotationSummary';
import { calculateQuotation, saveLocally } from '../quotations/quotationUtils';
import RoomList from '../quotations/RoomList';

interface LeisureQuotationGeneratorProps {
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    formData: any;
    activeTab: string;
}

const LeisureQuotationGenerator: React.FC<LeisureQuotationGeneratorProps> = ({ setFormData, formData, activeTab }) => {
    const [adultRooms, setAdultRooms] = useState<any[]>([]);
    const [kidsRooms, setKidsRooms] = useState<any[]>([]);
    const [editingAdultRoomIndex, setEditingAdultRoomIndex] = useState<number | null>(null);
    const [editingKidsRoomIndex, setEditingKidsRoomIndex] = useState<number | null>(null);
    const [adultRoomToEdit, setAdultRoomToEdit] = useState<any | null>(null);
    const [kidsRoomToEdit, setKidsRoomToEdit] = useState<any | null>(null);

    const normalizeRoom = useCallback(
        (room: any) => ({
            room: room.room,
            discount: room.selectedDiscount,
            roomType: room.room.room_type,
            boardType: room.room.board_type,
            paxPerRoom: room.adults > 0 ? room.adults : room.kids.length,
            kidsInRoom: room.kidIndices || [],
            nights: room.nights,
            adultCost: room.adultCost || 0,
            kidsCost: room.kidsCost || 0,
            cost: room.totalCost,
            isKidsRoom: room.adults === 0,
            holidayNights: room.holidayNights || 0,
            holidaySupplement: room.holidaySupplement || 0,
            holidayLabel: room.holidayLabel || 'Holiday Period',
        }),
        [],
    );
    useEffect(() => {
        if (formData.quotationLeisure?.roomDetails?.length > 0) {
            const rooms = formData.quotationLeisure.roomDetails;
            const newAdultRooms = rooms.filter((room: any) => room.adults > 0).map(normalizeRoom);
            const newKidsRooms = rooms.filter((room: any) => room.adults === 0 && room.kids.length > 0).map(normalizeRoom);

            setAdultRooms((prev) => {
                if (JSON.stringify(prev) !== JSON.stringify(newAdultRooms)) {
                    return newAdultRooms;
                }
                return prev;
            });
            setKidsRooms((prev) => {
                if (JSON.stringify(prev) !== JSON.stringify(newKidsRooms)) {
                    return newKidsRooms;
                }
                return prev;
            });
        }
    }, [formData.quotationLeisure, normalizeRoom]);

    const totalAdultsAllocated = useMemo(() => {
        return adultRooms.reduce((total, room) => total + (room.paxPerRoom || 0), 0);
    }, [adultRooms]);

    const totalKidsAllocated = useMemo(() => {
        return kidsRooms.reduce((total, room) => total + (room.paxPerRoom || 0), 0);
    }, [kidsRooms]);

    const assignedKids = useMemo(() => {
        const assigned: number[] = [];
        [...adultRooms, ...kidsRooms].forEach((room) => {
            if (room.kidsInRoom) {
                room.kidsInRoom.forEach((kidIndex: number) => {
                    assigned.push(kidIndex);
                });
            }
        });
        return assigned;
    }, [adultRooms, kidsRooms]);

    const handleAddAdultRoom = useCallback((newRoom: any) => {
        setAdultRooms((prev) => [...prev, newRoom]);
    }, []);

    const handleEditAdultRoom = useCallback((index: number, updatedRoom: any) => {
        setAdultRooms((prev) => {
            const updated = [...prev];
            updated[index] = updatedRoom;
            return updated;
        });
        setEditingAdultRoomIndex(null);
        setAdultRoomToEdit(null);
    }, []);

    const handleDeleteAdultRoom = useCallback(
        (index: number) => {
            setAdultRooms((prev) => prev.filter((_, i) => i !== index));
            if (editingAdultRoomIndex === index) {
                setEditingAdultRoomIndex(null);
                setAdultRoomToEdit(null);
            }
        },
        [editingAdultRoomIndex],
    );

    const handleAddKidsRoom = useCallback((newRoom: any) => {
        setKidsRooms((prev) => [...prev, newRoom]);
    }, []);

    const handleEditKidsRoom = useCallback((index: number, updatedRoom: any) => {
        setKidsRooms((prev) => {
            const updated = [...prev];
            updated[index] = updatedRoom;
            return updated;
        });
        setEditingKidsRoomIndex(null);
        setKidsRoomToEdit(null);
    }, []);

    const handleDeleteKidsRoom = useCallback(
        (index: number) => {
            setKidsRooms((prev) => prev.filter((_, i) => i !== index));
            if (editingKidsRoomIndex === index) {
                setEditingKidsRoomIndex(null);
                setKidsRoomToEdit(null);
            }
        },
        [editingKidsRoomIndex],
    );

    const handleEditRoom = useCallback(
        (index: number, isKidsRoom: boolean) => {
            if (isKidsRoom) {
                setEditingKidsRoomIndex(index);
                setEditingAdultRoomIndex(null);
                setKidsRoomToEdit(kidsRooms[index]);
                setAdultRoomToEdit(null);
            } else {
                setEditingAdultRoomIndex(index);
                setEditingKidsRoomIndex(null);
                setAdultRoomToEdit(adultRooms[index]);
                setKidsRoomToEdit(null);
            }
        },
        [adultRooms, kidsRooms],
    );

    useEffect(() => {
        const allRooms = [...adultRooms, ...kidsRooms].map((room) => ({
            type: room.roomType,
            room: room.room,
            adults: room.isKidsRoom ? 0 : room.paxPerRoom,
            kids: formData.kids ? room.kidsInRoom.map((idx: number) => formData.kids[idx].age) : [],
            kidIndices: room.kidsInRoom,
            nights: room.nights,
            adultCost: room.adultCost,
            kidsCost: room.kidsCost,
            holidayNights: room.holidayNights,
            holidaySupplement: room.holidaySupplement,
            holidayLabel: room.holidayLabel,
            totalCost: room.cost,
            selectedDiscount: room.discount,
        }));

        const quotation = calculateQuotation(adultRooms, kidsRooms, formData);

        setFormData((prev: any) => {
            const newData = {
                ...prev,
                quotationLeisure: {
                    ...quotation,
                    roomDetails: allRooms,
                },
                updatedRoomDetails: allRooms,
            };
            if (JSON.stringify(prev) !== JSON.stringify(newData)) {
                // saveLocally('quotationLeisure', newData.quotationLeisure, setFormData);
                return newData;
            }
            return prev;
        });
    }, [adultRooms, kidsRooms, formData, setFormData, calculateQuotation, saveLocally]);

    return (
        <div className="mx-auto rounded-lg bg-white shadow-lg">
            <div className="flex flex-wrap gap-4">
                <div className="flex-1 bg-blue-100 p-4">
                    <AdultRoomSelection
                        formData={formData}
                        assignedKids={assignedKids}
                        onAddRoom={handleAddAdultRoom}
                        onEditRoom={handleEditAdultRoom}
                        adultsAllocated={totalAdultsAllocated}
                        totalAdults={formData.adults || 0}
                        adultRooms={adultRooms}
                        kidsRooms={kidsRooms}
                        editingRoomIndex={editingAdultRoomIndex}
                        roomToEdit={adultRoomToEdit}
                        activeTab={activeTab}
                    />
                    <RoomList
                        title="Adult Rooms"
                        rooms={adultRooms}
                        formData={formData}
                        onDeleteRoom={handleDeleteAdultRoom}
                        onEditRoom={(index) => handleEditRoom(index, false)}
                    />
                </div>
                {formData.kids && formData.kids.length > 0 && (
                    <div className="flex-1 bg-blue-100 p-4">
                        <KidsRoomSelection
                            formData={formData}
                            assignedKids={assignedKids}
                            onAddRoom={handleAddKidsRoom}
                            onEditRoom={handleEditKidsRoom}
                            totalKids={formData.kids?.length || 0}
                            kidsRooms={kidsRooms}
                            adultRooms={adultRooms}
                            editingRoomIndex={editingKidsRoomIndex}
                            roomToEdit={kidsRoomToEdit}
                            activeTab={activeTab}
                        />
                        <RoomList
                            title="Kids Rooms"
                            rooms={kidsRooms}
                            formData={formData}
                            onDeleteRoom={handleDeleteKidsRoom}
                            onEditRoom={(index) => handleEditRoom(index, true)}
                            isKidsRoom={true}
                        />
                    </div>
                )}
            </div>
            <QuotationSummary formData={formData} />
        </div>
    );
};

export default LeisureQuotationGenerator;
