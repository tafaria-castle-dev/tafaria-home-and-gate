/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { getDiscountPercentage } from '../utils/discountAsPercentage';
import { getTaxCode } from '../utils/getTaxCode';

interface Tax {
    id: string;
    name: string;
    rate: number;
    tax_code: string;
    created_at: string;
    updated_at: string;
}

interface Discount {
    id: string;
    name: string;
    rate: number;
    created_at: string;
    updated_at: string;
    discountCode: string;
}

interface RoomItem {
    id: string;
    pax: number;
    rooms: number;
    adults: number;
    kids: any;
    taxes: Tax[];
    type: string;
    room: any;
    total: number;
    totalCost: number;
    created_at: string;
    discounts: Discount[];
    room_type: string;
    updated_at: string;
    amount_ksh: number;
    board_type: string;
    description: string;
    taxable_amount: number;
    nights: number[];
    kidsCost: number;
    selectedDiscount?: number | { rate: number } | null;
    holidaySupplement?: number;
    holidayNights?: number;
    holidayLabel?: string;
    isHolidayRow?: boolean;
    displayNights?: number;
}

const RoomTableLeisure: React.FC<{
    items: RoomItem[];
    formData: any;
    onTotalChange?: (total: number) => void;
}> = ({ items, formData, onTotalChange }) => {
    const totalPax = parseInt(formData.adults) + (formData.kids?.length || 0);

    const displayRows: RoomItem[] = items.flatMap((originalItem) => {
        console.log('Processing item:', originalItem);
        const fullNights = originalItem.nights?.length > 0 ? originalItem.nights.length : formData?.numNights;
        const holidayNightsCount = originalItem.holidayNights ?? 0;
        const normalNightsCount = fullNights - holidayNightsCount;

        const hasHoliday = holidayNightsCount > 0;
        const hasNormal = normalNightsCount > 0;

        const rows: RoomItem[] = [];
        const supplementTotal = originalItem.holidaySupplement ?? 0;

        const baseCostPerNight = (originalItem.totalCost - supplementTotal) / fullNights;

        const createPartial = (nights: number, isHoliday: boolean): RoomItem => {
            const rowTotalCost = baseCostPerNight * nights + (isHoliday ? supplementTotal : 0);

            return {
                ...originalItem,
                displayNights: nights,
                totalCost: rowTotalCost,
                isHolidayRow: isHoliday,
            };
        };

        if (hasHoliday) rows.push(createPartial(holidayNightsCount, true));
        if (hasNormal) rows.push(createPartial(normalNightsCount, false));
        if (!hasHoliday && !hasNormal) {
            rows.push({ ...originalItem, isHolidayRow: false, displayNights: fullNights });
        }

        return rows;
    });

    const subtotal = displayRows.reduce((sum, row) => sum + row.totalCost, 0);

    let allTaxCodes: any[] = [];
    if (displayRows.length > 0) {
        allTaxCodes = Array.from(new Set(displayRows.flatMap((item) => item.room?.taxes?.map((tax: Tax) => getTaxCode(tax))))).sort();
    }

    const taxSummary = allTaxCodes.map((code) => {
        const itemsWithThisTax = displayRows.filter((item) => item?.room?.taxes?.some((tax: Tax) => getTaxCode(tax) === code));

        const totalDiscount = itemsWithThisTax.reduce((sum, item) => {
            if (item.selectedDiscount) {
                const itemDiscountAmount =
                    ((item?.room?.taxable_amount * item.totalCost) / item.room.amount_ksh) * (getDiscountPercentage(item.selectedDiscount) / 100);
                return sum + itemDiscountAmount;
            }
            return sum;
        }, 0);

        let taxableAmountForThisTax = itemsWithThisTax.reduce((sum, item) => {
            return sum + (item?.room?.taxable_amount * item.totalCost) / item.room.amount_ksh;
        }, 0);

        if (totalDiscount) {
            taxableAmountForThisTax = taxableAmountForThisTax - totalDiscount;
        }

        const rate = itemsWithThisTax[0]?.room.taxes.find((tax: Tax) => getTaxCode(tax) === code)?.rate || 0;
        const name = itemsWithThisTax[0]?.room.taxes.find((tax: Tax) => getTaxCode(tax) === code)?.name || '';
        const amount = taxableAmountForThisTax * (rate / 100);

        return {
            code,
            rate,
            amount,
            name,
            taxableAmount: taxableAmountForThisTax,
        };
    });

    const getItemTaxDisplay = (item: RoomItem) => {
        const taxes = item?.room?.taxes || [];
        const sortedTaxes = [...taxes].sort((a: Tax, b: Tax) => getTaxCode(a).localeCompare(getTaxCode(b)));
        const codes = sortedTaxes.map((t: Tax) => getTaxCode(t)).join('');
        const totalRate = sortedTaxes.reduce((sum: number, tax: Tax) => sum + tax.rate, 0);
        const taxableAmount = item.taxable_amount || 0;
        const totalAmount = sortedTaxes.reduce((sum: number, tax: Tax) => sum + taxableAmount * (tax.rate / 100), 0);

        return {
            codes,
            rate: totalRate,
            amount: totalAmount,
            details: sortedTaxes.map((tax: Tax) => ({
                code: getTaxCode(tax),
                rate: tax.rate,
                amount: taxableAmount * (tax.rate / 100),
                name: tax.name,
            })),
        };
    };

    interface ItemDetails {
        totalAmount: number;
        totalTaxable: number;
        totalRate: number;
        discountRate: number;
        discount: number;
        taxes: number;
        netDiscount: number;
        taxDisplay: any;
    }

    const getItemDetails = (item: RoomItem): ItemDetails => {
        const totalAmount = item.totalCost;

        let totalTaxable = (item?.room?.taxable_amount * item.totalCost) / item.room.amount_ksh;

        const totalRate = item?.room?.taxes?.reduce((sum: number, tax: Tax) => sum + tax.rate, 0) ?? 0;
        const discountRate = getDiscountPercentage(item.selectedDiscount) / 100 || 0;
        const netDiscount = totalTaxable * discountRate;
        totalTaxable = totalTaxable - netDiscount;
        const discount = Math.round(discountRate * totalAmount);
        const taxes = (totalRate / 100) * totalTaxable;
        const taxDisplay = getItemTaxDisplay(item);

        return {
            totalAmount,
            totalTaxable,
            totalRate,
            discountRate,
            discount,
            taxes,
            netDiscount,
            taxDisplay,
        };
    };

    const grandTotals = displayRows.reduce(
        (acc, item) => {
            const details = getItemDetails(item);
            return {
                totalAmount: acc.totalAmount + details.totalAmount,
                totalTaxable: acc.totalTaxable + details.totalTaxable,
                totalDiscount: acc.totalDiscount + details.discount,
                totalTaxes: acc.totalTaxes + details.taxes,
                netDiscount: acc.netDiscount + details.netDiscount,
            };
        },
        {
            totalAmount: 0,
            totalTaxable: 0,
            totalDiscount: 0,
            totalTaxes: 0,
            netDiscount: 0,
        },
    );

    React.useEffect(() => {
        if (onTotalChange) {
            const total = grandTotals.totalAmount - grandTotals.totalDiscount;
            onTotalChange(total);
        }
    }, [grandTotals.totalAmount, grandTotals.totalDiscount, onTotalChange]);

    return (
        <div className="mx-auto max-w-6xl rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-6 border-b pb-2 text-2xl font-bold text-gray-800">Room Booking leisure</h2>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
                <div />
                <div className="rounded-lg bg-purple-50 p-3 shadow-sm">
                    <div className="text-sm font-medium text-purple-600">Total Nights</div>
                    <div className="text-xl font-bold text-purple-800">{formData?.numNights}</div>
                </div>
                <div className="rounded-lg bg-green-50 p-3 shadow-sm">
                    <div className="text-sm font-medium text-green-600">Total Pax</div>
                    <div className="text-xl font-bold text-green-800">{totalPax}</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 shadow-sm">
                    <div className="text-sm font-medium text-purple-600">Subtotal</div>
                    <div className="text-xl font-bold text-purple-800">KSh {Math.round(subtotal).toLocaleString()}</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 shadow-sm">
                    <div className="text-sm font-medium text-amber-600">Taxable Amount</div>
                    <div className="text-xl font-bold text-amber-800">
                        KSh{' '}
                        {grandTotals.totalTaxable.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                        })}
                    </div>
                </div>
            </div>

            <div className="mb-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Room</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Pax</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Nights</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Rate</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Taxable</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Taxes</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Discount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {displayRows.map((item, index) => {
                            const itemDetails = getItemDetails(item);
                            const fullNights = item.nights?.length > 0 ? item.nights.length : formData?.numNights;
                            const ratePerNight = item.totalCost / (item.displayNights ?? fullNights);
                            console.log('Calculating details for item:', item);
                            const roomName = item.isHolidayRow
                                ? `${item.type} ${item.room.board_type} (${item.holidayLabel || 'Holiday'})`
                                : `${item.type} ${item.room.board_type}`;

                            return (
                                <tr key={`${item.id}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap text-gray-900 capitalize">{roomName}</td>
                                    <td className="px-4 py-3 text-left text-sm whitespace-nowrap text-gray-500">
                                        {item.adults === 0 ? item.kids.length : item.adults}
                                    </td>
                                    <td className="px-4 py-3 text-left text-sm whitespace-nowrap text-gray-500">
                                        {item.displayNights ?? fullNights}
                                    </td>
                                    <td className="px-4 py-3 text-left text-sm whitespace-nowrap text-gray-500">
                                        {Math.round(ratePerNight).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-left text-sm whitespace-nowrap text-gray-500">
                                        {itemDetails.totalTaxable.toLocaleString(undefined, {
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td className="px-4 py-3 text-left text-sm whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-medium">
                                                {itemDetails.taxDisplay.codes} ({itemDetails.taxDisplay.rate}%)
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                KSh{' '}
                                                {itemDetails.taxes.toLocaleString(undefined, {
                                                    maximumFractionDigits: 2,
                                                })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap text-gray-900">
                                        <div className="flex flex-col">
                                            <span className="font-medium">{getDiscountPercentage(item.selectedDiscount).toLocaleString()}%</span>
                                            <span className="text-xs text-gray-500">Kes {itemDetails.discount.toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap text-gray-900">
                                        {itemDetails.totalAmount.toLocaleString()}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mb-6 rounded-lg bg-gray-50 p-6">
                <h3 className="mb-4 text-lg font-bold text-gray-700">Tax Breakdown</h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="rounded border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="mb-2 text-sm text-gray-600">
                            <strong>Taxable Amount: </strong>
                            KSh {grandTotals.totalTaxable.toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded border border-gray-100 bg-white p-4 shadow-sm">
                        <ul className="space-y-2">
                            {taxSummary.map((tax) => (
                                <li key={tax.code} className="flex justify-between text-sm">
                                    <div>
                                        <span className="font-medium text-gray-700">{tax.name}</span> ({tax.code}) @ {tax.rate}%
                                    </div>
                                    <div className="text-right">
                                        KSh{' '}
                                        {tax.amount.toLocaleString(undefined, {
                                            maximumFractionDigits: 2,
                                        })}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-6">
                    <h3 className="mb-3 text-lg font-bold text-yellow-700">Discount Applied</h3>
                    {grandTotals.totalDiscount ? (
                        <div className="space-y-2">
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-gray-600">Amount:</span>
                                <span className="font-medium text-green-600">
                                    -KSh{' '}
                                    {grandTotals.totalDiscount.toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">No discount applied</p>
                    )}
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-blue-800">Total</span>
                        <span className="text-2xl font-bold text-blue-900">
                            KSh{' '}
                            {(grandTotals.totalAmount - grandTotals.totalDiscount).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                    <div className="mt-4 border-t border-blue-100 pt-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span>KSh {Math.round(subtotal).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 flex justify-between text-sm">
                            <span className="text-gray-600">Total Taxes:</span>
                            <span>
                                KSh{' '}
                                {taxSummary
                                    .reduce((sum, tax) => sum + tax.amount, 0)
                                    .toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                    })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomTableLeisure;
