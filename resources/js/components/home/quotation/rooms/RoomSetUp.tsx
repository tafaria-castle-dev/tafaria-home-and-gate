import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';

export interface Tax {
    id: string;
    name: string;
    rate: number;
    tax_code: string;
}

export interface RoomPackage {
    id: string;
    name: string;
    description: string;
    board_type: string;
    amount_ksh: number;
    room_type: 'single' | 'double' | 'triple' | 'quadra' | 'twin';

    taxes?: Tax[];
    created_at: string;
    discounts?: {
        id: string;
        name: string;
        rate: number;
        discountCode: string;
    }[];
}

export interface RoomSelection {
    roomType: 'single' | 'double' | 'triple' | 'quadra' | 'twin';

    selectedPackage: RoomPackage | null;
    selectedDiscount: number | null;
    pax: number;
    numberOfRooms: number;
}

interface RoomSetUpProps {
    onSelectionChange: (data: RoomSelection) => void;
    activeTab: string;
    isMealsLoading: boolean;
    selectedKidsForSharing?: number[];
    formData?: any;
    calculateKidsCost?: (boardType: string, selectedKids: number[]) => number;
    boardType?: string;
    roomToEdit?: any;
}

const RoomSetup = forwardRef<{ reset: () => void }, RoomSetUpProps>(
    (
        {
            onSelectionChange,
            activeTab,
            isMealsLoading,
            selectedKidsForSharing = [],
            formData = null,
            calculateKidsCost = null,
            boardType = '',
            roomToEdit = null,
        },
        ref,
    ) => {
        const [packages, setPackages] = useState<RoomPackage[]>([]);
        const [isLoading, setIsLoading] = useState<boolean>(true);
        const [selectedRoomType, setSelectedRoomType] = useState<RoomSelection['roomType']>('single');
        const [selectedPackage, setSelectedPackage] = useState<RoomPackage | null>(null);
        const [selectedDiscount, setSelectedDiscount] = useState<number | null>(null);
        const [discountAmount, setDiscountAmount] = useState<number | null>(null);
        const [pax, setPax] = useState<number>(1);
        const [numberOfRooms, setNumberOfRooms] = useState<number>(1);
        const { isAuthenticated } = useAuth();

        useImperativeHandle(ref, () => ({
            reset: () => {
                setSelectedRoomType('single');
                setSelectedPackage(null);
                setSelectedDiscount(null);
                setDiscountAmount(null);
                setPax(1);
                setNumberOfRooms(1);
                onSelectionChange({
                    roomType: 'single',
                    selectedPackage: null,
                    selectedDiscount: null,
                    pax: 1,
                    numberOfRooms: 1,
                });
            },
        }));

        const [adultRooms, setAdultRooms] = useState<any[]>([]);

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

                setAdultRooms((prev) => {
                    if (JSON.stringify(prev) !== JSON.stringify(newAdultRooms)) {
                        return newAdultRooms;
                    }
                    return prev;
                });
            }
        }, [formData.quotationLeisure, normalizeRoom]);
        const fetchPackages = async () => {
            setIsLoading(true);
            try {
                const endpoint = formData?.selectedType === 'Immersion' ? '/api/immersion-packages' : '/api/packages';
                const response = await axios.get(endpoint);
                setPackages(response.data || []);
            } catch (error) {
                console.error('Error fetching packages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        useEffect(() => {
            if (isAuthenticated) {
                fetchPackages();
            }
        }, [isAuthenticated, formData?.selectedType]);

        useEffect(() => {
            if (roomToEdit) {
                const roomType = (roomToEdit.roomType?.split(' : ')[0] as RoomSelection['roomType']) || 'single';
                setSelectedRoomType(roomType);
                const paxValue = roomToEdit.paxPerRoom || roomToEdit.adults || roomToEdit.kidsInRoom?.length || 1;
                setPax(paxValue);
                const pkg = packages.find((p) => p.id === roomToEdit.room?.id) || null;
                setSelectedPackage(pkg);
                const discount = roomToEdit.selectedDiscount ?? roomToEdit.discount ?? null;
                const discountValue = typeof discount === 'number' ? discount : (discount?.rate ?? null);
                setSelectedDiscount(discountValue);
                const roomsCount = roomToEdit.numberOfRooms || 1;
                setNumberOfRooms(roomsCount);
                if (discountValue !== null && pkg) {
                    const totalCost = calculateTotalCost(pkg);
                    const amount = (discountValue / 100) * totalCost;
                    setDiscountAmount(amount);
                }
            } else {
                setSelectedRoomType('single');
                setSelectedPackage(null);
                setSelectedDiscount(null);
                setDiscountAmount(null);
                setPax(1);
                setNumberOfRooms(1);
            }
        }, [roomToEdit, packages]);

        const calculateTotalCost = (pkg: RoomPackage | null = selectedPackage) => {
            if (!pkg) return 0;
            const packageCost = pkg.amount_ksh;
            let kidsCost = 0;
            if (calculateKidsCost && boardType) {
                kidsCost = calculateKidsCost(boardType, selectedKidsForSharing);
            }
            return packageCost + kidsCost;
        };

        const handleRoomTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const roomType = e.target.value as RoomSelection['roomType'];
            setSelectedRoomType(roomType);
            const paxMap: Record<RoomSelection['roomType'], number> = {
                single: 1,
                double: 2,
                triple: 3,
                quadra: 4,
                twin: 2,
            };
            setPax(paxMap[roomType] || 1);
            setSelectedPackage(null);
            setSelectedDiscount(null);
            setDiscountAmount(null);
        };

        const handlePackageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const selectedPkg = packages.find((pkg) => pkg.id === e.target.value) || null;
            setSelectedPackage(selectedPkg);
            setSelectedDiscount(null);
            setDiscountAmount(null);
        };

        const handleNumberOfRoomsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseInt(e.target.value);
            if (isNaN(value) || value < 1) {
                setNumberOfRooms(1);
            } else {
                setNumberOfRooms(value);
            }
        };

        const handleDiscountPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseFloat(e.target.value);
            if (isNaN(value) || value < 0 || value > 100) {
                setSelectedDiscount(null);
                setDiscountAmount(null);
            } else {
                setSelectedDiscount(value);
                const totalCost = calculateTotalCost();
                if (totalCost > 0) {
                    const amount = (value / 100) * totalCost;
                    setDiscountAmount(amount);
                }
            }
        };

        const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseFloat(e.target.value);
            const totalCost = calculateTotalCost();
            if (isNaN(value) || value < 0 || totalCost === 0 || value > totalCost) {
                setSelectedDiscount(null);
                setDiscountAmount(null);
            } else {
                setDiscountAmount(value);
                const percentage = (value / totalCost) * 100;
                setSelectedDiscount(percentage);
            }
        };

        const sortPackagesByType = (packages: RoomPackage[]) => {
            const packageTypeOrder = ['Superior', 'Executive', 'Deluxe', 'Standard'];
            const boardTypeOrder = ['Full Board', 'Half Board', 'Bed & Breakfast'];
            return packages.sort((a, b) => {
                const aType = packageTypeOrder.find((type) => a.name.includes(type)) || '';
                const bType = packageTypeOrder.find((type) => b.name.includes(type)) || '';
                const typeComparison = packageTypeOrder.indexOf(aType) - packageTypeOrder.indexOf(bType);

                if (typeComparison !== 0) {
                    return typeComparison;
                }

                const aBoardIndex = boardTypeOrder.indexOf(a.board_type);
                const bBoardIndex = boardTypeOrder.indexOf(b.board_type);
                return aBoardIndex - bBoardIndex;
            });
        };
        const cutoffDate = new Date('2025-11-05T00:00:00');

        const filteredPackages = sortPackagesByType(
            packages.filter((pkg) => {
                const matchesRoomType = selectedRoomType === 'twin' ? pkg.room_type === 'double' : pkg.room_type === selectedRoomType;

                if (!matchesRoomType) return false;

                const pkgCreatedAt = new Date(pkg.created_at);
                if (activeTab === 'edit') {
                    const roomCreatedAt = new Date(adultRooms[0]?.room?.created_at);

                    if (roomCreatedAt < cutoffDate) {
                        return pkgCreatedAt < cutoffDate;
                    } else {
                        return pkgCreatedAt >= cutoffDate;
                    }
                } else {
                    return pkgCreatedAt >= cutoffDate;
                }
            }),
        );

        useEffect(() => {
            const selectionData: RoomSelection = {
                roomType: selectedRoomType,
                selectedPackage,
                selectedDiscount,
                pax,
                numberOfRooms,
            };
            onSelectionChange(selectionData);
        }, [selectedRoomType, selectedPackage, selectedDiscount, pax, numberOfRooms, onSelectionChange]);

        const totalCost = calculateTotalCost();
        const totalCostForAllRooms = totalCost * numberOfRooms;

        if (!isAuthenticated) {
            return <div>Please log in to view room setup.</div>;
        }

        return (
            <div className="mx-auto">
                <div className="mt-4 overflow-x-auto">
                    {isLoading || isMealsLoading ? (
                        <p>Loading packages...</p>
                    ) : (
                        <div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Select Room Type</label>
                                    <select
                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                        value={selectedRoomType}
                                        onChange={handleRoomTypeChange}
                                    >
                                        <option value="single">Single Room</option>
                                        <option value="double">Double Room</option>
                                        <option value="triple">Triple Room</option>
                                        <option value="quadra">Quadra Room</option>

                                        <option value="twin">Twin Room</option>
                                    </select>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Pax per room: <span className="font-semibold">{pax}</span>
                                    </p>
                                </div>
                                {!roomToEdit && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Number of Rooms</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={numberOfRooms}
                                            onChange={handleNumberOfRoomsChange}
                                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                            placeholder="1"
                                        />
                                        <p className="mt-2 text-sm text-gray-600">
                                            Total pax: <span className="font-semibold">{pax * numberOfRooms}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <label className="mt-4 mb-1 block text-sm font-medium text-gray-700">Select Room Name</label>
                            <select
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                                value={selectedPackage?.id || ''}
                                onChange={handlePackageChange}
                            >
                                <option value="">-- Select Room Name --</option>
                                {filteredPackages.map((pkg) => (
                                    <option key={pkg.id} value={pkg.id}>
                                        {pkg.name} - {pkg.board_type} - {pkg.description} - Ksh {pkg.amount_ksh}
                                    </option>
                                ))}
                            </select>
                            {selectedPackage && (
                                <>
                                    <div className="mt-4 rounded-md bg-blue-50 p-3">
                                        <h3 className="text-sm font-medium text-gray-700">Cost Breakdown:</h3>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Package Cost per room: Ksh {selectedPackage.amount_ksh.toLocaleString()}
                                        </p>
                                        {selectedKidsForSharing.length > 0 && (
                                            <p className="text-sm text-gray-600">
                                                Kids Cost per room: Ksh{' '}
                                                {calculateKidsCost && boardType
                                                    ? calculateKidsCost(boardType, selectedKidsForSharing).toLocaleString()
                                                    : 0}
                                            </p>
                                        )}
                                        <p className="mt-1 border-t pt-1 text-sm text-gray-600">
                                            Total Cost per room: Ksh {totalCost.toLocaleString()}
                                        </p>
                                        <p className="text-sm font-medium text-gray-700">
                                            Total Cost for {numberOfRooms} room{numberOfRooms > 1 ? 's' : ''}: Ksh{' '}
                                            {totalCostForAllRooms.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">Discount Percentage (%)</label>
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step="0.001"
                                                    placeholder="0-100"
                                                    value={selectedDiscount !== null ? selectedDiscount : ''}
                                                    onChange={handleDiscountPercentageChange}
                                                    className="block w-full rounded-md border border-gray-300 p-2"
                                                />
                                                <span className="ml-2 text-gray-700">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-medium text-gray-700">Discount Amount per room (KSH)</label>
                                            <div className="flex items-center">
                                                <span className="mr-2 text-gray-700">Ksh</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={totalCost}
                                                    step="0.01"
                                                    placeholder={`0-${totalCost}`}
                                                    value={discountAmount !== null ? discountAmount : ''}
                                                    onChange={handleDiscountAmountChange}
                                                    className="block w-full rounded-md border border-gray-300 p-2"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {selectedDiscount !== null && (
                                        <div className="mt-4 rounded-md bg-gray-50 p-3">
                                            <h3 className="text-sm font-medium text-gray-700">Discount Summary:</h3>
                                            <p className="mt-1 text-sm text-gray-600">Percentage: {selectedDiscount.toFixed(3)}%</p>
                                            <p className="text-sm text-gray-600">
                                                Discount Amount per room: Ksh{' '}
                                                {discountAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })} per night
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Total Discount for {numberOfRooms} room{numberOfRooms > 1 ? 's' : ''}: Ksh{' '}
                                                {((discountAmount || 0) * numberOfRooms).toLocaleString(undefined, {
                                                    maximumFractionDigits: 2,
                                                })}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Original Total: Ksh {totalCostForAllRooms.toLocaleString()} per night
                                            </p>
                                            <p className="text-sm font-medium text-gray-700">
                                                Final Price: Ksh{' '}
                                                {(totalCostForAllRooms - (discountAmount || 0) * numberOfRooms).toLocaleString(undefined, {
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                                per night
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    },
);

export default RoomSetup;
