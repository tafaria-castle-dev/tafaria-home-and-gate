import { motion } from 'framer-motion';
import { Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

export interface AdditionalService {
    id: string;
    name: string;
    amount_ksh: number;
    description: string;
    type?: string;
    resident: string;
    dynamic: string;
    numnights?: number;
    noofpax?: number;
    selectedDiscount?: number | null;
    supplementType?: string;
    cakeWeight?: number;
}

interface AdditionalFormProps {
    numNights: number;
    type: string;
    numPeople: number;
    setSelectedAdditionalServices: React.Dispatch<React.SetStateAction<AdditionalService[]>>;
    selectedAdditionalServices: AdditionalService[];
    additionals: AdditionalService[];
    loading: boolean;
}

const AdditionalForm: React.FC<AdditionalFormProps> = ({
    numNights,
    type,
    numPeople,
    selectedAdditionalServices = [],
    setSelectedAdditionalServices,
    additionals = [],
    loading = false,
}) => {
    const [priceModal, setPriceModal] = useState<{
        open: boolean;
        service?: AdditionalService;
        customPrice?: number;
        numnights?: number;
        noofpax?: number;
        selectedDiscount?: number | null;
        discountAmount?: number | null;
        isEditing?: boolean;
        supplementType?: string;
        cakeWeight?: number;
    }>({ open: false });
    const [searchQuery, setSearchQuery] = useState('');

    const totalPrice =
        selectedAdditionalServices?.length > 0
            ? selectedAdditionalServices.reduce((sum, item) => {
                  const basePrice = (item.amount_ksh || 0) * (item.numnights || 1) * (item.noofpax || 1);
                  const discount = item.selectedDiscount || 0;
                  const discountMultiplier = 1 - discount / 100;
                  return sum + basePrice * discountMultiplier;
              }, 0)
            : 0;

    const noDiscountServices = ['Extra Meals', 'Leisure Package', 'Birthday Cake', 'Birthday Package'];

    const isDiscountRestricted = (serviceName: string) =>
        noDiscountServices.some((restricted) => serviceName.toLowerCase().includes(restricted.toLowerCase()));

    const handleSelect = (additional: AdditionalService) => {
        const existingService = selectedAdditionalServices.find((item) => item.id === additional.id);

        if (existingService) {
            const basePrice = (existingService.amount_ksh || 0) * (existingService.numnights || 1) * (existingService.noofpax || 1);
            const discountAmount = existingService.selectedDiscount ? (existingService.selectedDiscount / 100) * basePrice : null;

            setPriceModal({
                open: true,
                service: existingService,
                customPrice: existingService.amount_ksh,
                numnights: existingService.numnights,
                noofpax: existingService.noofpax,
                selectedDiscount: existingService.selectedDiscount,
                discountAmount: discountAmount,
                isEditing: true,
                supplementType: existingService.supplementType || 'Christmas',
                cakeWeight: (existingService as any).cakeWeight || 1,
            });
        } else {
            setPriceModal({
                open: true,
                service: additional,
                customPrice: additional.amount_ksh,
                numnights: additional.name.includes('Leisure') || additional.name.includes('goDream') ? 1 : numNights,
                noofpax: 0,
                selectedDiscount: isDiscountRestricted(additional.name) ? null : null,
                discountAmount: null,
                isEditing: false,
                supplementType: 'Christmas',
                cakeWeight: 1,
            });
        }
    };

    const handleRemoveService = () => {
        if (!priceModal.service) return;

        const updatedSelection = selectedAdditionalServices.filter((item) => item.id !== priceModal.service!.id);
        setSelectedAdditionalServices(updatedSelection);
        saveFormDataToStorage(updatedSelection);
        setPriceModal({ open: false });
    };

    const handleDiscountPercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (isNaN(value) || value < 0 || value > 100) {
            setPriceModal((prev) => ({
                ...prev,
                selectedDiscount: null,
                discountAmount: null,
            }));
        } else {
            const basePrice = (priceModal.customPrice || 0) * (priceModal.numnights || 1) * (priceModal.noofpax || 1);
            const amount = (value / 100) * basePrice;
            setPriceModal((prev) => ({
                ...prev,
                selectedDiscount: value,
                discountAmount: amount,
            }));
        }
    };

    const handleDiscountAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        const basePrice = (priceModal.customPrice || 0) * (priceModal.numnights || 1) * (priceModal.noofpax || 1);

        if (isNaN(value) || value < 0 || value > basePrice) {
            setPriceModal((prev) => ({
                ...prev,
                selectedDiscount: null,
                discountAmount: null,
            }));
        } else {
            const percentage = basePrice > 0 ? (value / basePrice) * 100 : 0;
            setPriceModal((prev) => ({
                ...prev,
                selectedDiscount: percentage,
                discountAmount: value,
            }));
        }
    };

    const handleDynamicPriceConfirm = () => {
        if (!priceModal.service) return;

        if (priceModal.service.name.toLowerCase().includes('cake') && !priceModal.cakeWeight) {
            toast.error('Please select cake weight before confirming');
            return;
        }

        let serviceName = priceModal.service.name;
        if (priceModal.service.name.toLowerCase().includes('cake') && priceModal.cakeWeight) {
            const baseServiceName = priceModal.service.name.replace(/\s*\(.*?\)\s*$/, '');
            serviceName = `${baseServiceName} (${priceModal.cakeWeight}kg)`;
        }

        const serviceWithCustomPrice = {
            ...priceModal.service,
            name: serviceName,
            amount_ksh: priceModal.customPrice || 0,
            numnights: priceModal.numnights,
            noofpax: priceModal.noofpax,
            selectedDiscount: isDiscountRestricted(priceModal.service.name) ? null : priceModal.selectedDiscount || null,
            supplementType: priceModal.service.name.toLowerCase().includes('supplement') ? priceModal.supplementType : undefined,
            cakeWeight: priceModal.service.name.toLowerCase().includes('cake') ? priceModal.cakeWeight : undefined,
        };

        setSelectedAdditionalServices((prev) => {
            const exists = prev.some((item) => item.id === serviceWithCustomPrice.id);
            const updatedSelection = exists
                ? prev.map((item) => (item.id === serviceWithCustomPrice.id ? serviceWithCustomPrice : item))
                : [...prev, serviceWithCustomPrice];

            saveFormDataToStorage(updatedSelection);
            return updatedSelection;
        });

        setPriceModal({ open: false });
    };

    const saveFormDataToStorage = (updatedSelection: AdditionalService[]) => {
        const savedFormData = JSON.parse(localStorage.getItem('quotationForm') || '{}');
        const updatedFormData = {
            ...savedFormData,
            selectedAdditionalServices: updatedSelection,
        };
        localStorage.setItem('quotationForm', JSON.stringify(updatedFormData));
    };

    const disableNightsInput = numNights === 0 || numNights === 1 || Number(numNights) === 0;

    const basePrice = (priceModal.customPrice || 0) * (priceModal.numnights || 1) * (priceModal.noofpax || 1);
    const modalPrice = Math.round(basePrice * (1 - (priceModal.selectedDiscount || 0) / 100));

    const typeAdditionals = additionals.filter((additional) => additional.type?.toLowerCase() === type?.toLowerCase());
    const filteredAdditionals = typeAdditionals.filter((additional) => additional.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const formatValue = (text: string) => {
        return text?.replace(/\\n/g, '\n')?.replace(/\\t/g, '\t');
    };
    return (
        <div className="w-full p-4">
            {loading && <p>Loading...</p>}
            {priceModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="relative max-h-[90vh] w-96 overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-semibold">
                            {priceModal.isEditing ? 'Edit Service: ' : 'Add Service: '}
                            {priceModal.service?.name}
                        </h2>
                        <button onClick={() => setPriceModal({ open: false })} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
                            <X size={24} />
                        </button>

                        <h2 className="mb-4 text-xl font-semibold">Enter amount</h2>
                        <input
                            type="number"
                            min={1}
                            disabled={priceModal.service?.dynamic === 'false'}
                            value={priceModal.customPrice || ''}
                            onChange={(e) =>
                                setPriceModal((prev) => ({
                                    ...prev,
                                    customPrice: Number(e.target.value),
                                }))
                            }
                            placeholder="Enter amount in KSH"
                            className="mb-4 w-full rounded-md border px-3 py-2"
                        />

                        <h2 className="mb-4 text-xl font-semibold">Enter number of Pax</h2>
                        <input
                            type="number"
                            value={priceModal.noofpax || ''}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                if (value <= numPeople) {
                                    setPriceModal((prev) => ({
                                        ...prev,
                                        noofpax: value,
                                    }));
                                } else {
                                    toast.error('Number of Pax cannot be more than the number of people in the group');
                                }
                            }}
                            placeholder="Enter no. of Pax"
                            className="mb-4 w-full rounded-md border px-3 py-2"
                        />

                        <h2 className="mb-4 text-xl font-semibold">
                            {priceModal.service?.name.includes('goDream') || priceModal.service?.name.includes('Leisure') ? 'Number' : 'Enter number'}{' '}
                            of nights/days/number
                        </h2>
                        <input
                            type="number"
                            value={priceModal.numnights || 1}
                            disabled={
                                disableNightsInput || priceModal.service?.name.includes('goDream') || priceModal.service?.name.includes('Leisure')
                            }
                            onChange={(e) =>
                                setPriceModal((prev) => ({
                                    ...prev,
                                    numnights: Number(e.target.value),
                                }))
                            }
                            max={numNights}
                            min={1}
                            placeholder="Enter number of nights"
                            className="mb-4 w-full rounded-md border px-3 py-2"
                        />

                        {priceModal.service?.name.toLowerCase().includes('supplement') && (
                            <div>
                                <label className="mb-2 block text-lg font-semibold">Supplement Type</label>
                                <div className="mb-4 flex gap-2">
                                    {['Christmas', "New Year's Eve", 'Easter'].map((type) => (
                                        <label key={type} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="supplementType"
                                                value={type}
                                                checked={priceModal.supplementType === type}
                                                onChange={(e) =>
                                                    setPriceModal((prev) => ({
                                                        ...prev,
                                                        supplementType: e.target.value,
                                                    }))
                                                }
                                                disabled={false}
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {priceModal.service?.name.toLowerCase().includes('cake') && (
                            <div>
                                <label className="mb-2 block text-lg font-semibold">Cake Weight: {priceModal.cakeWeight} kg</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="10"
                                    step="0.5"
                                    value={priceModal.cakeWeight || 1}
                                    onChange={(e) =>
                                        setPriceModal((prev) => ({
                                            ...prev,
                                            cakeWeight: Number(e.target.value),
                                        }))
                                    }
                                    className="mb-4 w-full"
                                />
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>0.5 kg</span>
                                    <span>10 kg</span>
                                </div>
                            </div>
                        )}

                        {priceModal.service && !isDiscountRestricted(priceModal.service.name) && (
                            <>
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
                                                value={priceModal.selectedDiscount !== null ? priceModal.selectedDiscount : ''}
                                                onChange={handleDiscountPercentageChange}
                                                className="w-full rounded-md border px-3 py-2"
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
                                                max={basePrice}
                                                step="0.001"
                                                placeholder={`0-${basePrice}`}
                                                value={priceModal.discountAmount !== null ? priceModal.discountAmount : ''}
                                                onChange={handleDiscountAmountChange}
                                                className="w-full rounded-md border px-3 py-2"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {priceModal.selectedDiscount !== null && (
                                    <div className="mt-4 rounded-md bg-gray-50 p-3">
                                        <h3 className="text-sm font-medium text-gray-700">Discount Summary:</h3>
                                        <p className="mt-1 text-sm text-gray-600">Base Price: Ksh {basePrice.toLocaleString()}</p>
                                        <p className="text-sm text-gray-600">Percentage: {priceModal.selectedDiscount?.toFixed(3)}%</p>
                                        <p className="text-sm text-gray-600">
                                            Discount Amount: Ksh{' '}
                                            {priceModal.discountAmount?.toLocaleString(undefined, {
                                                maximumFractionDigits: 2,
                                            })}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        <h2 className="mt-4 mb-4 text-xl font-semibold">Final Price: Ksh {modalPrice.toLocaleString()}</h2>
                        <div className="flex items-center justify-between">
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setPriceModal({ open: false })}
                                    className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button onClick={handleDynamicPriceConfirm} className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
                                    {priceModal.isEditing ? 'Update' : 'Add'}
                                </button>
                            </div>

                            {priceModal.isEditing && (
                                <button
                                    onClick={handleRemoveService}
                                    className="flex items-center space-x-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                                >
                                    <Trash2 size={16} />
                                    <span>Remove</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search additional services..."
                    className="w-full rounded-md border border-gray-300 px-3 py-3 text-lg focus:outline-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm text-gray-600">Number of Pax: {numPeople}</label>
                <label className="block text-sm text-gray-600">Total Price: Ksh {totalPrice.toLocaleString()}</label>

                {filteredAdditionals.length > 0 &&
                    filteredAdditionals.map((additional) => (
                        <motion.button
                            key={additional.id}
                            whileTap={{ scale: 0.9 }}
                            animate={{
                                backgroundColor: selectedAdditionalServices.some((item) => item.id === additional.id)
                                    ? 'rgb(34, 197, 94)'
                                    : 'rgb(209, 213, 219)',
                                color: selectedAdditionalServices.some((item) => item.id === additional.id) ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)',
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            className="rounded-md px-4 py-2 text-center font-semibold shadow-md"
                            onClick={() => handleSelect(additional)}
                        >
                            {additional.name} {additional.supplementType ? `(${additional.supplementType})` : ''} - (
                            {formatValue(additional?.description)} - Kes.
                            {additional.dynamic === 'true' ? 'Custom' : additional.amount_ksh})
                        </motion.button>
                    ))}
            </div>
        </div>
    );
};

export default AdditionalForm;
