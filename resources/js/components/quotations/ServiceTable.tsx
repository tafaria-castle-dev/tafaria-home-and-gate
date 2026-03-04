/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trash2 } from 'lucide-react';
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

interface ServiceItem {
    id: string;
    name: string;
    type: string;
    taxes: Tax[];
    dynamic: string;
    noofpax: number;
    resident: string;
    created_at: string;
    numnights: number;
    updated_at: string;
    amount_ksh: number;
    description: string;
    taxable_amount: number;
    selectedDiscount?: any;
}

const ServiceTable: React.FC<{
    services: ServiceItem[];
    onTotalChange?: (total: number) => void;
    onDeleteService?: (serviceId: string) => void;
}> = ({ services, onTotalChange, onDeleteService }) => {
    // Calculate totals
    const totalPax = services.reduce((sum, item) => sum + item.noofpax, 0);

    // Get all unique tax codes
    const allTaxCodes = Array.from(new Set(services.flatMap((item) => item.taxes.map((tax) => getTaxCode(tax))))).sort();

    // Calculate tax summary
    const taxSummary = allTaxCodes.map((code) => {
        // Find all items that have this tax code
        const itemsWithThisTax = services.filter((item) => item.taxes.some((tax) => getTaxCode(tax) === code));

        // Calculate total discount for items with this tax code
        const totalDiscount = itemsWithThisTax.reduce((sum, item) => {
            if (!item.selectedDiscount) return sum;

            let itemTaxableAmount = 0;

            if (item.taxes.length > 0 && item.taxable_amount > 0) {
                // Case 1: taxable_amount is provided
                itemTaxableAmount = item.taxable_amount;
            } else if (item.taxes.length > 0) {
                // Case 2: calculate taxable_amount from total amount and tax rates
                const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
                const unitAmount = item.amount_ksh;
                itemTaxableAmount = unitAmount / (1 + totalRate / 100);
            }

            // Calculate discount amount (applied before quantity multipliers)
            const discountRate = item.selectedDiscount / 100;
            const discountAmount = itemTaxableAmount * discountRate;

            // Apply quantity multipliers (pax and nights) to the discounted amount
            return sum + discountAmount * (item.noofpax || 1) * (item.numnights || 1);
        }, 0);

        // Calculate taxable amount for these items (after discounts)
        let taxableAmountForThisTax = itemsWithThisTax.reduce((sum, item) => {
            let itemTaxableAmount = 0;

            // if (item.taxes.length > 0 && item.taxable_amount > 0) {
            //   itemTaxableAmount = item.taxable_amount;
            // }
            // else
            if (item.taxes.length > 0) {
                const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
                const unitAmount = item.amount_ksh;
                itemTaxableAmount = unitAmount / (1 + totalRate / 100);
            }

            // Apply quantity multipliers
            return sum + itemTaxableAmount * (item.noofpax || 1) * (item.numnights || 1);
        }, 0);

        // Apply total discount to the taxable amount
        taxableAmountForThisTax = Math.max(0, taxableAmountForThisTax - totalDiscount);

        // Get tax rate and name
        const rate = itemsWithThisTax[0]?.taxes.find((tax) => getTaxCode(tax) === code)?.rate || 0;
        const name = itemsWithThisTax[0]?.taxes.find((tax) => getTaxCode(tax) === code)?.name || '';

        // Calculate final tax amount
        const amount = taxableAmountForThisTax * (rate / 100);

        return {
            code,
            rate,
            amount,
            name,
            taxableAmount: taxableAmountForThisTax,
            totalDiscount, // Optional: include discount info for reference
        };
    });

    const totalTaxAmount = taxSummary.reduce((sum, tax) => sum + tax.amount, 0);

    // Calculate discounts if any
    const totalDiscount = services.reduce((sum, item) => {
        if (item.selectedDiscount) {
            const itemTotal = item.amount_ksh * (item.numnights || 1);
            return sum + itemTotal * (item.selectedDiscount / 100);
        }
        return sum;
    }, 0);
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
    const getItemTaxDisplay = (item: ServiceItem) => {
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
    const getItemDetails = (item: ServiceItem): ItemDetails => {
        const totalAmount = item.amount_ksh * item.noofpax * item.numnights;
        const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
        const discountRate = getDiscountPercentage(item.selectedDiscount) / 100 || 0;
        const discount = discountRate * totalAmount;
        let totalTaxable = 0;

        console.log('item is ', item);
        // if(item.taxes.length >0){
        //    totalTaxable = item.taxable_amount * item.noofpax *item.numnights;
        //    console.log("totalTaxable before is ", totalTaxable,item.taxable_amount)

        // }else{
        if (item.taxes.length > 0) {
            const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
            const taxable_amount = totalAmount / (totalRate / 100 + 1);

            console.log('totalTaxable after is ', totalTaxable);

            //find the taxable_amount
            totalTaxable = taxable_amount;
        }

        // }
        const netDiscount = totalTaxable * discountRate;

        if (discountRate > 0) {
            totalTaxable = totalTaxable - netDiscount;
        }
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

    const grandTotals = services.reduce(
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
            <h2 className="mb-6 border-b pb-2 text-2xl font-bold text-gray-800">Tafaria experiences</h2>

            {/* Services Table */}
            <div className="mb-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Service</th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Pax</th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Nights</th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Rate </th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"> Taxable</th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Taxes</th>
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Discount</th>
                            {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Discount</th> */}
                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Amount (KSh)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {services.map((service, index) => {
                            const itemDetails = getItemDetails(service);

                            return (
                                <tr key={service.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">{service.name}</td>
                                    <td className="px-6 py-4 text-center text-sm whitespace-nowrap text-gray-500">{service.noofpax}</td>
                                    <td className="px-6 py-4 text-center text-sm whitespace-nowrap text-gray-500">{service.numnights}</td>
                                    <td className="px-6 py-4 text-left text-sm whitespace-nowrap text-gray-500">
                                        {service.amount_ksh.toLocaleString(undefined, {
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm whitespace-nowrap text-gray-500">
                                        {itemDetails.totalTaxable.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-left text-sm whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-medium">
                                                {itemDetails.taxDisplay.codes} ({itemDetails.taxDisplay.rate}%)
                                            </span>
                                            <span className="text-xs text-gray-500">KSh {itemDetails.taxes.toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-left text-sm whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="font-medium"> {service.selectedDiscount ? `(${service.selectedDiscount}%)` : '-'}</span>
                                            <span className="text-xs text-gray-500">KSh {itemDetails.discount.toLocaleString()}</span>
                                        </div>
                                    </td>

                                    {/* <td className="px-4 py-3 whitespace-nowrap text-sm text-left">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">{itemDetails.netDiscount.toLocaleString()}</span>
                    </div>
                  </td> */}
                                    <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap text-gray-900">
                                        {itemDetails.totalAmount.toLocaleString(undefined, {
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm whitespace-nowrap">
                                        <button
                                            onClick={() => onDeleteService?.(service.id)}
                                            className="text-red-600 hover:text-red-800"
                                            title="Delete Service"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary Section */}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                {/* Tax Breakdown */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-4 text-lg font-bold text-gray-700">Tax Breakdown</h3>

                    <div className="mb-4">
                        <div className="flex justify-between border-b py-2">
                            <span className="text-sm text-gray-600">Taxable Amount:</span>
                            <span className="text-sm font-medium">
                                KSh{' '}
                                {grandTotals.totalTaxable.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                })}
                            </span>
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
                    <div className="flex justify-between border-t border-gray-300 py-2 font-semibold">
                        <span>Total Taxes:</span>
                        <span>
                            KSh{' '}
                            {totalTaxAmount.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                            })}
                        </span>
                    </div>
                </div>

                {/* Totals */}
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
                    <h3 className="mb-4 text-lg font-bold text-gray-700">Summary</h3>
                    <div className="mb-4">
                        <div className="flex justify-between border-b py-2">
                            <span className="text-sm text-gray-600">Subtotal:</span>
                            <span className="text-sm font-medium">
                                KSh{' '}
                                {grandTotals.totalAmount.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between border-b py-2">
                                <span className="text-sm text-gray-600">Discounts:</span>
                                <span className="text-sm font-medium text-red-600">
                                    - KSh{' '}
                                    {grandTotals.totalDiscount.toLocaleString(undefined, {
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between border-t border-gray-300 py-3 text-lg font-bold">
                        <span>Total:</span>
                        <span>
                            KSh {(grandTotals.totalAmount - grandTotals.totalDiscount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="mt-4 border-t pt-4 text-sm text-gray-500">
                        <p>Total Pax: {totalPax}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceTable;
