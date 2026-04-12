import { useAuth } from '@/hooks/use-auth';
import axios from 'axios';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';

export interface RoomPackage {
    id: string;
    name: string;
    description: string;
    board_type: string;
    amount_ksh: number;
    room_type: 'single' | 'double' | 'triple' | 'quadra' | 'twin';
    created_at: string;
    taxes?: { id: string; name: string; rate: number; tax_code: string }[];
    discounts?: {
        id: string;
        name: string;
        rate: number;
        discountCode: string;
    }[];
}

export interface RoomSelection {
    roomType: 'single' | 'double' | 'twin' | 'triple' | 'quadra';
    selectedPackage: RoomPackage | null;
    selectedDiscount: number | null;
    holidayNights?: number;
    holidaySupplement?: number;
    holidayLabel?: string;
    pax: number;
}
export interface Meal {
    id: string;
    name: string;
    description: string;
    child_rate_kshs: number;
    created_at: string;
    updated_at: string;
}
interface RoomSetUpProps {
    onSelectionChange: (data: RoomSelection) => void;
    activeTab: string;
    formData?: any;
    roomToEdit?: any;
}

interface PaxOption {
    value: number;
    label: string;
}

const RoomSetUpKids = forwardRef<{ reset: () => void }, RoomSetUpProps>(({ onSelectionChange, activeTab, formData, roomToEdit = null }, ref) => {
    const [packages, setPackages] = useState<RoomPackage[]>([]);
    const [meals, setMeals] = useState<Meal[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isMealsLoading, setIsMealsLoading] = useState<boolean>(true);
    const { isAuthenticated } = useAuth();

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
        if (isAuthenticated) {
            fetchPackages();
            fetchMeals();
        }
    }, [isAuthenticated, formData?.selectedType]);
    const [kidsRooms, setKidsRooms] = useState<any[]>([]);

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
        }),
        [],
    );
    useEffect(() => {
        if (formData.quotationLeisure?.roomDetails?.length > 0) {
            const rooms = formData.quotationLeisure.roomDetails;
            const newKidsRooms = rooms.filter((room: any) => room.adults === 0 && room.kids.length > 0).map(normalizeRoom);

            setKidsRooms((prev) => {
                if (JSON.stringify(prev) !== JSON.stringify(newKidsRooms)) {
                    return newKidsRooms;
                }
                return prev;
            });
        }
    }, [formData.quotationLeisure, normalizeRoom]);
    const [selectedRoomType, setSelectedRoomType] = useState<RoomSelection['roomType']>('single');
    const [selectedPackage, setSelectedPackage] = useState<RoomPackage | null>(null);
    const [selectedDiscount, setSelectedDiscount] = useState<number | null>(null);
    const [discountAmount, setDiscountAmount] = useState<number | null>(null);
    const [pax, setPax] = useState<number>(1);

    useImperativeHandle(ref, () => ({
        reset: () => {
            setSelectedRoomType('single');
            setSelectedPackage(null);
            setSelectedDiscount(null);
            setDiscountAmount(null);
            setPax(1);
            onSelectionChange({
                roomType: 'single',
                selectedPackage: null,
                holidayNights: 0,
                holidaySupplement: 0,
                holidayLabel: '',
                selectedDiscount: null,
                pax: 1,
            });
        },
    }));

    useEffect(() => {
        if (roomToEdit) {
            const roomType = (roomToEdit.roomType?.split(' : ')[0] as RoomSelection['roomType']) || 'single';
            setSelectedRoomType(roomType);
            const paxValue = roomToEdit.paxPerRoom || roomToEdit.kidsInRoom?.length || 1;
            setPax(paxValue);
            const pkg = packages.find((p) => p.id === roomToEdit.room?.id) || null;
            setSelectedPackage(pkg);
            const discount = roomToEdit.selectedDiscount ?? roomToEdit.discount ?? null;
            setSelectedDiscount(discount);
            if (discount !== null && pkg) {
                const totalCost = calculateTotalCost(pkg, paxValue);
                const amount = (discount / 100) * totalCost;
                setDiscountAmount(amount);
            }
        } else {
            setSelectedRoomType('single');
            setSelectedPackage(null);
            setSelectedDiscount(null);
            setDiscountAmount(null);
            setPax(1);
        }
    }, [roomToEdit, packages]);
    const cutoffDate = new Date('2025-11-05T00:00:00');
    const calculateTotalCost = (pkg: RoomPackage | null = selectedPackage, paxCount: number = pax) => {
        if (!pkg) return 0;
        const packageCost = pkg.amount_ksh * 0.8;
        let kidsMealCost = 0;

        if ((selectedRoomType === 'double' || selectedRoomType === 'twin') && paxCount === 3) {
            const breakfast = meals.find((m) => m.name === 'Breakfast')?.child_rate_kshs || 0;
            const lunch = meals.find((m) => m.name === 'Lunch')?.child_rate_kshs || 0;
            const dinner = meals.find((m) => m.name === 'Dinner')?.child_rate_kshs || 0;
            if (activeTab === 'edit') {
                const roomCreatedAt = new Date(kidsRooms[0]?.room?.created_at);
                if (roomCreatedAt < cutoffDate) {
                    if (pkg.board_type === 'Full Board') {
                        kidsMealCost += 6000;
                    } else if (pkg.board_type === 'Half Board') {
                        kidsMealCost += 4600;
                    } else if (pkg.board_type === 'Bed & Breakfast') {
                        kidsMealCost += 3000;
                    }
                } else {
                    if (pkg.board_type === 'Full Board') {
                        kidsMealCost = breakfast + lunch + dinner;
                    } else if (pkg.board_type === 'Half Board') {
                        kidsMealCost = breakfast + dinner;
                    } else if (pkg.board_type === 'Bed & Breakfast') {
                        kidsMealCost = breakfast;
                    }
                    kidsMealCost += 2000;
                }
            } else {
                if (pkg.board_type === 'Full Board') {
                    kidsMealCost = breakfast + lunch + dinner;
                } else if (pkg.board_type === 'Half Board') {
                    kidsMealCost = breakfast + dinner;
                } else if (pkg.board_type === 'Bed & Breakfast') {
                    kidsMealCost = breakfast;
                }
                kidsMealCost += 2000;
            }
        }

        return packageCost + kidsMealCost;
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
        const newPax = paxMap[roomType] || 1;
        setPax(newPax);
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

    const handlePaxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newPax = parseInt(e.target.value);
        setPax(newPax);
        setSelectedDiscount(null);
        setDiscountAmount(null);
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

    const sortedFilteredArray = sortPackagesByType(
        packages.filter((pkg) => {
            const matchesRoomType = selectedRoomType === 'twin' ? pkg.room_type === 'double' : pkg.room_type === selectedRoomType;

            if (!matchesRoomType) return false;

            const pkgCreatedAt = new Date(pkg.created_at);
            if (activeTab === 'edit') {
                const roomCreatedAt = new Date(kidsRooms[0]?.room?.created_at);
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
        onSelectionChange({
            roomType: selectedRoomType,
            selectedPackage,
            selectedDiscount,
            pax,
        });
    }, [selectedRoomType, selectedPackage, selectedDiscount, pax, onSelectionChange]);

    const totalCost = calculateTotalCost();
    const packageCost = selectedPackage ? selectedPackage.amount_ksh * 0.8 : 0;

    let kidsMealCost = 0;

    if ((selectedRoomType === 'double' || selectedRoomType === 'twin') && pax === 3) {
        const breakfast = meals.find((m) => m.name === 'Breakfast')?.child_rate_kshs || 0;
        const lunch = meals.find((m) => m.name === 'Lunch')?.child_rate_kshs || 0;
        const dinner = meals.find((m) => m.name === 'Dinner')?.child_rate_kshs || 0;
        if (activeTab === 'edit') {
            const roomCreatedAt = new Date(kidsRooms[0]?.room?.created_at);
            if (roomCreatedAt < cutoffDate) {
                if (selectedPackage?.board_type === 'Full Board') {
                    kidsMealCost += 6000;
                } else if (selectedPackage?.board_type === 'Half Board') {
                    kidsMealCost += 4600;
                } else if (selectedPackage?.board_type === 'Bed & Breakfast') {
                    kidsMealCost += 3000;
                }
            } else {
                if (selectedPackage?.board_type === 'Full Board') {
                    kidsMealCost = breakfast + lunch + dinner;
                } else if (selectedPackage?.board_type === 'Half Board') {
                    kidsMealCost = breakfast + dinner;
                } else if (selectedPackage?.board_type === 'Bed & Breakfast') {
                    kidsMealCost = breakfast;
                }
                kidsMealCost += 2000;
            }
        } else {
            if (selectedPackage?.board_type === 'Full Board') {
                kidsMealCost = breakfast + lunch + dinner;
            } else if (selectedPackage?.board_type === 'Half Board') {
                kidsMealCost = breakfast + dinner;
            } else if (selectedPackage?.board_type === 'Bed & Breakfast') {
                kidsMealCost = breakfast;
            }
            kidsMealCost += 2000;
        }
    }
    const getPaxOptions = (): PaxOption[] => {
        const options: PaxOption[] = [];
        if (selectedRoomType === 'double' || selectedRoomType === 'twin') {
            options.push({ value: 2, label: '2 Kids' });
            options.push({ value: 3, label: '3 Kids (2 in bed + 1 extra)' });
        } else if (selectedRoomType === 'single') {
            options.push({ value: 1, label: '1 Kid' });
        } else if (selectedRoomType === 'triple') {
            options.push({ value: 3, label: '3 Kids' });
        } else if (selectedRoomType === 'quadra') {
            options.push({ value: 4, label: '4 Kids' });
        }
        return options;
    };

    return (
        <div className="mx-auto">
            <div className="mt-4 overflow-x-auto">
                {isLoading || isMealsLoading ? (
                    <p>Loading packages...</p>
                ) : (
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Select Room Type</label>
                        <select
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={selectedRoomType}
                            onChange={handleRoomTypeChange}
                        >
                            <option value="single">Single Room</option>
                            <option value="double">Double Room</option>
                            <option value="twin">Twin Room</option>
                            <option value="triple">Triple Room</option>
                            <option value="quadra">Quadra Room</option>
                        </select>

                        {(selectedRoomType === 'double' || selectedRoomType === 'twin') && (
                            <div className="mt-4">
                                <label className="mb-1 block text-sm font-medium text-gray-700">Number of Kids</label>
                                <select className="mt-1 block w-full rounded-md border border-gray-300 p-2" value={pax} onChange={handlePaxChange}>
                                    {getPaxOptions().map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <p className="mt-2 text-sm text-gray-600">
                            Pax: <span className="font-semibold">{pax}</span>
                        </p>
                        <label className="mt-4 block text-sm font-medium text-gray-700">Select Room Name</label>
                        <select
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={selectedPackage?.id || ''}
                            onChange={handlePackageChange}
                        >
                            <option value="">-- Select Room Name --</option>
                            {sortedFilteredArray.map((pkg) => (
                                <option key={pkg.id} value={pkg.id}>
                                    {pkg.name} - {pkg.board_type} - {pkg.description} - Ksh {pkg.amount_ksh}
                                </option>
                            ))}
                        </select>
                        {selectedPackage && (
                            <>
                                <div className="mt-4 rounded-md bg-blue-50 p-3">
                                    <h3 className="text-sm font-medium text-gray-700">Cost Breakdown:</h3>
                                    <p className="mt-1 text-sm text-gray-600">Kids Room Base Cost (80%): Ksh {packageCost.toLocaleString()}</p>
                                    {(selectedRoomType === 'double' || selectedRoomType === 'twin') && pax === 3 && (
                                        <p className="mt-1 text-sm text-gray-600">
                                            Third Kid (Bed + Meals, {selectedPackage.board_type}): Ksh {kidsMealCost.toLocaleString()}
                                        </p>
                                    )}
                                    <p className="mt-1 border-t pt-1 text-sm font-medium text-gray-700">
                                        Total Cost: Ksh {totalCost.toLocaleString()}
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
                                                pattern="^\d*(\.\d{0,3})?$"
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
                                        <label className="mb-1 block text-sm font-medium text-gray-700">Discount Amount (KSH)</label>
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
                                            Discount Amount: Ksh{' '}
                                            {discountAmount?.toLocaleString(undefined, {
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            per night
                                        </p>
                                        <p className="text-sm text-gray-600">Original Total: Ksh {totalCost.toLocaleString()} per night</p>
                                        <p className="text-sm font-medium text-gray-700">
                                            Final Price: Ksh{' '}
                                            {(totalCost - (discountAmount || 0)).toLocaleString(undefined, {
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
});

export default RoomSetUpKids;
