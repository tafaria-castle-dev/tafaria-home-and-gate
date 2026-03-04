import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import LeisureQuotationGenerator from '../LeisureQuotationGenerator';
import PriceInput from './PriceInput';
import PriceSummary from './PriceSummary';
import RoomConfigLeisure from './RoomConfigLeisure';

interface RoomConfigProps {
    selectedType: string;
    numNights: number;
    numOfPeople: number;
    formData: any;
    roomDetails: { [key: string]: { people: number; cost: number } };
    setRoomDetails: React.Dispatch<React.SetStateAction<{ [key: string]: { people: number; cost: number } }>>;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    activeTab: string;
}

const RoomConfig: React.FC<RoomConfigProps> = ({ selectedType, numNights, formData, setRoomDetails, setFormData, activeTab }) => {
    const [roomSettings, setRoomSettings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRooms, setSelectedRooms] = useState(formData.updatedRoomDetails || []);
    const [totalGuestNights, setTotalGuestNights] = useState(0);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const boardTypeOrder = {
        'Full Board': 1,
        'Half Board': 2,
        'Bed and Breakfast': 3,
    };

    const sortedRoomSettings = [...roomSettings].sort((a, b) => {
        const orderA = boardTypeOrder[a.board_type] || 4;
        const orderB = boardTypeOrder[b.board_type] || 4;
        return orderA - orderB;
    });

    const roomPrices: { [key: string]: number } = {
        single: 16500,
        double: 24000,
        triple: 12000,
        quadra: 8000,

        twin: 24000,
    };

    const paxMultiplier: Record<string, number> = {
        single: 1,
        double: 2,
        triple: 3,
        quadra: 4,

        twin: 2,
    };

    const fetchRoomSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/corporate-room-settings');
            setRoomSettings(response.data || []);
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to fetch room settings:', error);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRoomSettings();
    }, [fetchRoomSettings]);

    const openModal = (room: string) => {
        setSelectedRoom(room);
        setError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setError(null);
    };

    const updateSelectedRooms = (newRooms: any[]) => {
        if (!Array.isArray(newRooms)) return;
        setSelectedRooms(newRooms);
        setFormData((prevFormData: any) => ({
            ...prevFormData,
            updatedRoomDetails: newRooms,
        }));
        const newGuestNights = newRooms.reduce((sum, r) => {
            const roomMultiplier = paxMultiplier[r.room_type?.toLowerCase()] || 1;
            return sum + roomMultiplier * r.rooms * r.nights;
        }, 0);
        setTotalGuestNights(newGuestNights);
    };

    const handleDeleteRoom = (roomId: string) => {
        const updatedSelected = selectedRooms.filter((room) => room.id !== roomId);
        updateSelectedRooms(updatedSelected);
    };

    useEffect(() => {
        if (formData.updatedRoomDetails && Array.isArray(formData.updatedRoomDetails)) {
            setSelectedRooms(formData.updatedRoomDetails);
            const initialGuestNights = formData.updatedRoomDetails.reduce((sum, r) => {
                const roomMultiplier = paxMultiplier[r.room_type?.toLowerCase()] || 1;
                return sum + roomMultiplier * r.rooms * r.nights;
            }, 0);
            setTotalGuestNights(initialGuestNights);
        }
    }, [formData.updatedRoomDetails]);

    const calculateRoomStats = (roomType: string) => {
        const roomsOfType = selectedRooms.filter((room) => room.room_type === roomType);
        if (roomsOfType.length === 0) return null;
        const totalRooms = roomsOfType.reduce((sum, room) => sum + room.rooms, 0);
        const totalCost = roomsOfType.reduce((sum, room) => sum + room.total, 0);
        const totalPax = roomsOfType.reduce((sum, room) => sum + (room.pax || 0), 0);
        const totalNights = roomsOfType.reduce((sum, room) => sum + room.nights, 0);
        return {
            totalRooms,
            totalCost,
            totalPax,
            totalNights,
            configurations: roomsOfType.length,
        };
    };

    const displayRoomTypeDetails = (roomType: string) => {
        const stats = calculateRoomStats(roomType);
        if (!stats) return null;
        return (
            <div className="mt-2 space-y-1 text-xs">
                <p className="text-blue-600">
                    <strong>KES {stats.totalCost.toLocaleString()}</strong>
                </p>
                <p className="text-gray-600">
                    {stats.configurations} Config{stats.configurations > 1 ? 's' : ''}
                </p>
            </div>
        );
    };

    const calculateBookingProgress = () => {
        const totalRequiredGuestNights = formData.adults * formData.numNights;
        const remainingGuestNights = totalRequiredGuestNights - totalGuestNights;
        return {
            totalAllocatedGuestNights: totalGuestNights,
            totalRequiredGuestNights,
            remainingGuestNights,
            isComplete: remainingGuestNights === 0,
            isOverbooked: remainingGuestNights < 0,
        };
    };

    const bookingProgress = calculateBookingProgress();

    return (
        <div className="w-full p-6">
            {isLoading && (
                <div className="flex min-h-[200px] items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
            )}
            {!isLoading && (
                <>
                    {selectedType === 'Leisure' && <LeisureQuotationGenerator formData={formData} setFormData={setFormData} activeTab={activeTab} />}
                    {selectedType === 'Corporate' && (
                        <div className="space-y-6">
                            <div className="rounded-lg border bg-white p-6 shadow-sm">
                                <h3 className="mb-4 text-lg font-semibold text-gray-800">Booking Progress</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                                    <div className="rounded-md bg-gray-50 p-3">
                                        <span className="text-gray-600">Total Guests</span>
                                        <p className="font-semibold">{formData.adults}</p>
                                    </div>
                                    <div className="rounded-md bg-gray-50 p-3">
                                        <span className="text-gray-600">Total Nights</span>
                                        <p className="font-semibold">{formData.numNights}</p>
                                    </div>
                                    <div className="rounded-md bg-gray-50 p-3">
                                        <span className="text-gray-600">Required Guest-Nights</span>
                                        <p className="font-semibold">{bookingProgress.totalRequiredGuestNights}</p>
                                    </div>
                                    <div className="rounded-md bg-gray-50 p-3">
                                        <span className="text-gray-600">Remaining Guest-Nights</span>
                                        <p
                                            className={`font-semibold ${
                                                bookingProgress.isOverbooked
                                                    ? 'text-red-600'
                                                    : bookingProgress.isComplete
                                                      ? 'text-green-600'
                                                      : 'text-blue-600'
                                            }`}
                                        >
                                            {bookingProgress.remainingGuestNights}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                                {Object.keys(roomPrices).map((room, index) => (
                                    <div key={index} className="space-y-2">
                                        <button
                                            onClick={() => openModal(room)}
                                            className="w-full rounded-lg border bg-white p-4 text-center font-medium shadow-sm transition hover:bg-gray-100"
                                        >
                                            <div className="text-lg font-semibold">{room.charAt(0).toUpperCase() + room.slice(1)}</div>
                                            {displayRoomTypeDetails(room)}
                                        </button>
                                        <div className="rounded-lg border bg-gray-50 p-4">
                                            <PriceSummary
                                                selectedRooms={selectedRooms.filter((roomin) => roomin.room_type === room)}
                                                onDeleteRoom={handleDeleteRoom}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {selectedRooms.length > 0 && (
                                <div className="rounded-lg border bg-white p-6 shadow-sm">
                                    <h3 className="mb-4 text-lg font-semibold text-gray-800">Complete Booking Summary</h3>
                                    <PriceSummary selectedRooms={selectedRooms} onDeleteRoom={handleDeleteRoom} />
                                </div>
                            )}
                        </div>
                    )}
                    {isModalOpen && selectedRoom && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                            <div className="relative mx-4 max-h-[90vh] max-w-6xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-xl font-semibold">
                                        {selectedRoom.charAt(0).toUpperCase() + selectedRoom.slice(1)} Room Configuration
                                    </h3>
                                    <button onClick={closeModal} className="text-2xl text-gray-400 transition hover:text-gray-600">
                                        ✕
                                    </button>
                                </div>
                                {selectedType === 'Leisure' && (
                                    <RoomConfigLeisure
                                        type={selectedRoom.charAt(0).toUpperCase() + selectedRoom.slice(1)}
                                        numNights={numNights}
                                        onClose={closeModal}
                                        activeTab={activeTab}
                                        onUpdate={(selections) => {
                                            setRoomDetails((prev) => ({
                                                ...prev,
                                                [selectedRoom]: {
                                                    details: selections,
                                                    people: selections.reduce((sum, item) => sum + item.pax, 0),
                                                    cost: selections.reduce((sum, item) => sum + item.total, 0),
                                                },
                                            }));
                                        }}
                                    />
                                )}
                                {selectedType === 'Corporate' && (
                                    <div>
                                        <PriceInput
                                            onUpdateRooms={updateSelectedRooms}
                                            selectedRooms={selectedRooms}
                                            roomType={selectedRoom}
                                            roomSettings={sortedRoomSettings.filter((room) =>
                                                selectedRoom === 'twin' ? room.room_type === 'double' : room.room_type === selectedRoom,
                                            )}
                                            formData={formData}
                                        />
                                        <div className="mt-6 flex justify-end space-x-3">
                                            <button
                                                onClick={closeModal}
                                                className="rounded-lg bg-gray-200 px-7 py-2 text-gray-700 transition hover:bg-gray-300"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RoomConfig;
