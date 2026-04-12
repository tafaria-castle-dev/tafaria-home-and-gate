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
    nights?: number;
    taxes: Tax[];
    total: number;
    created_at: string;
    discounts: Discount[];
    room_type: string;
    updated_at: string;
    amount_ksh: number;
    board_type: string;
    description: string;
    taxable_amount: number;
    selectedDiscount?: number | { rate: number } | null;
    holidaySupplement?: number;
    holidayNights?: number;
    holidayLabel?: string;
    isHolidayRow?: boolean;
    baseRatePerNight?: number;
    supplementPerNight?: number;
    baseTaxableAmount?: number;
}

const RoomTable: React.FC<{
    items: RoomItem[];
    formData: any;
    onTotalChange?: (total: number) => void;
}> = ({ items, formData, onTotalChange }) => {
    const displayRows = items.flatMap((originalItem) => {
        console.log('Original item:', originalItem);
        const fullNights = originalItem.nights ?? formData.numNights;
        const holidayNightsCount = originalItem.holidayNights ?? 0;
        const normalNightsCount = fullNights - holidayNightsCount;

        const hasHoliday = holidayNightsCount > 0;
        const hasNormal = normalNightsCount > 0;

        const rows: RoomItem[] = [];

        const createPartial = (nights: number, isHoliday: boolean): RoomItem => {
            const ratePerNight = originalItem.amount_ksh;
            const supplementTotal = originalItem.holidaySupplement ?? 0;

            let displayedRatePerNight = ratePerNight;
            let rowTotalBeforeDiscount = ratePerNight * originalItem.rooms * nights;

            if (isHoliday) {
                displayedRatePerNight = ratePerNight + supplementTotal / holidayNightsCount / originalItem.rooms;
                rowTotalBeforeDiscount = ratePerNight * originalItem.rooms * nights + supplementTotal;
            }

            const portionTaxable = originalItem.taxable_amount;

            return {
                ...originalItem,
                nights,
                amount_ksh: Math.round(displayedRatePerNight),
                total: rowTotalBeforeDiscount,
                taxable_amount: (portionTaxable / ratePerNight) * displayedRatePerNight,
                baseTaxableAmount: portionTaxable,
                isHolidayRow: isHoliday,
            };
        };

        if (hasHoliday) {
            rows.push(createPartial(holidayNightsCount, true));
        }

        if (hasNormal) {
            rows.push(createPartial(normalNightsCount, false));
        }

        if (!hasHoliday && !hasNormal) {
            rows.push({ ...originalItem, isHolidayRow: false });
        }

        return rows;
    });
    const subtotal = displayRows.reduce((sum, row) => sum + row.total, 0);
    //   const totalTaxableAmount = items.reduce((sum, item) => sum + item.taxable_amount, 0);

    const allTaxCodes = Array.from(new Set(displayRows.flatMap((item) => item.taxes?.map((tax) => getTaxCode(tax))))).sort();

    const taxSummary = allTaxCodes.map((code) => {
        const itemsWithThisTax = displayRows?.filter((item) => item.taxes?.some((tax) => getTaxCode(tax) === code));

        const totalDiscount = itemsWithThisTax.reduce((sum, item) => {
            if (item.selectedDiscount) {
                const baseTaxable = item.baseTaxableAmount ?? item.taxable_amount;
                const itemDiscountAmount =
                    baseTaxable *
                    (getDiscountPercentage(item.selectedDiscount) / 100) *
                    item.rooms *
                    (item.nights ? item.nights : formData.numNights);
                return sum + itemDiscountAmount;
            }
            return sum;
        }, 0);

        let taxableAmountForThisTax = itemsWithThisTax.reduce(
            (sum, item) => sum + item.taxable_amount * item.rooms * (item.nights ? item.nights : formData.numNights),
            0,
        );

        if (totalDiscount) {
            taxableAmountForThisTax = taxableAmountForThisTax - totalDiscount;
        }

        const rate = itemsWithThisTax[0]?.taxes.find((tax) => getTaxCode(tax) === code)?.rate || 0;
        const name = itemsWithThisTax[0]?.taxes.find((tax) => getTaxCode(tax) === code)?.name || '';
        const amount = taxableAmountForThisTax * (rate / 100);

        return { code, rate, amount, name, taxableAmount: taxableAmountForThisTax };
    });

    const getItemTaxDisplay = (item: RoomItem) => {
        const sortedTaxes = [...item.taxes].sort((a, b) => getTaxCode(a).localeCompare(getTaxCode(b)));
        const codes = sortedTaxes.map((t) => getTaxCode(t)).join('');
        const totalRate = sortedTaxes.reduce((sum, tax) => sum + tax.rate, 0);
        const totalAmount = sortedTaxes.reduce((sum, tax) => sum + item.taxable_amount * (tax.rate / 100), 0);

        return {
            codes,
            rate: totalRate,
            amount: totalAmount,
            details: sortedTaxes.map((tax) => ({
                code: getTaxCode(tax),
                rate: tax.rate,
                amount: item.taxable_amount * (tax.rate / 100),
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
        taxDisplay: ReturnType<typeof getItemTaxDisplay>;
    }

    const getItemDetails = (item: RoomItem): ItemDetails => {
        const totalAmount = item.nights ? item.total : item.total * formData.numNights;
        const totalDiscountableAmount = item.nights ? item.total - (item.holidaySupplement ?? 0) : item.total * formData.numNights;

        const nightsCount = item.nights ? item.nights : formData.numNights;

        let totalTaxable = item.taxable_amount * item.rooms * nightsCount;

        const baseTaxable = item.baseTaxableAmount ?? item.taxable_amount;
        const totalTaxableWithoutSupp = baseTaxable * item.rooms * nightsCount;
        const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
        const discountRate = getDiscountPercentage(item.selectedDiscount) / 100 || 0;
        const discount = Math.round(discountRate * totalDiscountableAmount);
        const netDiscount = totalTaxableWithoutSupp * discountRate;
        totalTaxable = totalTaxable - netDiscount;
        console.log('totalTaxable', totalTaxable);
        console.log('totalTaxable', totalTaxableWithoutSupp);
        console.log('totalA', totalDiscountableAmount);
        console.log('totalAmount', totalAmount);
        console.log('Discount', discount);
        console.log('Net Discount', netDiscount);
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
            <h2 className="mb-6 border-b pb-2 text-2xl font-bold text-gray-800">Room Booking</h2>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-5">
                {/* <div className="bg-blue-50 p-3 rounded-lg shadow-sm">
          <div className="text-blue-600 text-sm font-medium">Total Rooms</div>
          <div className="text-xl font-bold text-blue-800">{totalRooms}</div>
        </div> */}
                <div></div>
                <div className="rounded-lg bg-purple-50 p-3 shadow-sm">
                    <div className="text-sm font-medium text-purple-600">Total Nights</div>
                    <div className="text-xl font-bold text-purple-800">{formData?.numNights}</div>
                </div>
                <div className="rounded-lg bg-green-50 p-3 shadow-sm">
                    <div className="text-sm font-medium text-green-600">Total Pax</div>
                    <div className="text-xl font-bold text-green-800">{formData?.adults}</div>
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
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Rooms</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Guests</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Nights</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Rate</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Taxable</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Taxes</th>
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Discount</th>
                            {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Discount
              </th> */}
                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {displayRows.map((item, index) => {
                            const itemDetails = getItemDetails(item);

                            const roomName = item.isHolidayRow
                                ? `${item.room_type} ${item.board_type} (${item.holidayLabel || 'Holiday'})`
                                : `${item.room_type} ${item.board_type}`;

                            return (
                                <tr key={`${item.id}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap text-gray-900 capitalize">{roomName}</td>
                                    <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">{item.rooms}</td>
                                    <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">{item.pax}</td>
                                    <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">{item.nights}</td>
                                    <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">{item.amount_ksh.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
                                        {itemDetails.totalTaxable.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-medium">
                                                {itemDetails.taxDisplay.codes} ({itemDetails.taxDisplay.rate}%)
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                KSh {itemDetails.taxes.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900">
                                        {/* discount – same logic */}
                                        <div className="flex flex-col">
                                            <span className="font-medium">{getDiscountPercentage(item.selectedDiscount).toLocaleString()}%</span>
                                            <span className="text-xs text-gray-500">Kes {itemDetails.discount.toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900">
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
                            <strong> Taxable Amount: </strong>
                            KSh {grandTotals.totalTaxable.toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded border border-gray-100 bg-white p-4 shadow-sm">
                        <ul className="space-y-2">
                            {taxSummary.map((tax, index) => (
                                <li key={index} className="flex justify-between text-sm">
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
                            KSh {(grandTotals.totalAmount - grandTotals.totalDiscount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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

export default RoomTable;
