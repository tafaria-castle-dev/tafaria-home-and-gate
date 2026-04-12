/* eslint-disable @typescript-eslint/no-explicit-any */
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import React, { useEffect } from 'react';
import { getDiscountPercentage } from '../utils/discountAsPercentage';
import { getTaxCode } from '../utils/getTaxCode';

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
        gap: 5,
    },
    statBox: {
        backgroundColor: '#f0f7ff',
        padding: 8,
        borderRadius: 4,
        minWidth: '18%',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 10,
        color: '#3b82f6',
        fontWeight: 'medium',
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e40af',
    },
    tableHeader: {
        width: '460px',
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
        paddingVertical: 5,
    },
    tableHeaderInvoice: {
        width: '520px',
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
        paddingVertical: 5,
    },
    headerCell: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 4,
        textAlign: 'left',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 5,
        alignItems: 'flex-start',
        width: '460px',
    },
    tableRowInvoice: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 5,
        alignItems: 'flex-start',
        width: '520px',
    },
    rowCell: {
        fontSize: 9,
        paddingHorizontal: 4,
        textAlign: 'left',
        alignItems: 'flex-start',
        alignContent: 'flex-start',
    },
    taxBreakdownContainer: {
        backgroundColor: '#f9fafb',
        padding: 10,
        marginTop: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    taxBreakdownHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    taxBreakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    summaryContainer: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 10,
    },
    summaryBox: {
        flex: 1,
        padding: 10,
        borderRadius: 4,
    },
    discountBox: {
        backgroundColor: '#fffbeb',
        borderColor: '#fcd34d',
        borderWidth: 1,
    },
    totalBox: {
        backgroundColor: '#eff6ff',
        borderColor: '#93c5fd',
        borderWidth: 1,
    },
    summaryTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    totalLabel: {
        fontSize: 10,
    },
    totalValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },

    colRoom: { width: '13%' },
    colRoomColumn1: { width: '22%' },
    colRoomInvoice: { width: '22%' },
    colRoomTotal: {
        width: '13%',
        fontWeight: 'bold',
        alignItems: 'flex-end',
        textAlign: 'right',
    },
    colRoomQuotationTax: {
        width: '13%',
        alignItems: 'flex-end',
        textAlign: 'right',
    },
    colRoomNoDiscount: { width: '16%' },
    colRoomColumn1NoDiscount: { width: '28%' },
    colRoomInvoiceNoDiscount: { width: '28%' },
    colRoomTotalNoDiscount: {
        width: '16%',
        fontWeight: 'bold',
        alignItems: 'flex-end',
        textAlign: 'right',
    },
    colRoomQuotationTaxNoDiscount: {
        width: '16%',
        alignItems: 'flex-end',
        textAlign: 'right',
    },
});

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
    taxes: Tax[];
    total: number;
    created_at: string;
    discounts: Discount[];
    room_type: string;
    nights?: number;
    updated_at: string;
    amount_ksh: number;
    board_type: string;
    description: string;
    taxable_amount: number;
    selectedDiscount: number | { rate: number } | null;
    holidaySupplement?: number;
    holidayNights?: number;
    holidayLabel?: string;
    isHolidayRow?: boolean;
    baseRatePerNight?: number;
    supplementPerNight?: number;
    baseTaxableAmount?: number;
}

interface TaxSummary {
    code: string;
    rate: number;
    amount: number;
    name: string;
    taxableAmount: number;
}

interface GrandTotals {
    totalAmount: number;
    totalTaxable: number;
    totalDiscount: number;
    totalTaxes: number;
    netDiscount: number;
}

interface PdfRoomTableProps {
    items: RoomItem[];
    formData: any;
    is_invoice_generated: boolean;
    onSummaryComputed?: (summary: { taxSummary: TaxSummary[]; grandTotals: GrandTotals }) => void;
}

const PdfRoomTable: React.FC<PdfRoomTableProps> = ({ items, formData, is_invoice_generated, onSummaryComputed }) => {
    const hasDiscount = items.some((item) => getDiscountPercentage(item.selectedDiscount) > 0);
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
                displayedRatePerNight = ratePerNight + supplementTotal / holidayNightsCount;
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
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'decimal',
            maximumFractionDigits: 2,
        }).format(Math.round(value));
    };

    const allTaxCodes = Array.from(new Set(displayRows.flatMap((item) => item.taxes.map((tax) => getTaxCode(tax))))).sort();

    const taxSummary = allTaxCodes.map((code) => {
        const itemsWithThisTax = displayRows.filter((item) => item.taxes.some((tax) => getTaxCode(tax) === code));

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

    const getItemDetails = (item: RoomItem, numNights: number) => {
        const nightsCount = item.nights ? item.nights : numNights;
        const totalAmount = item.total * (item.nights ? 1 : numNights);
        const totalDiscountableAmount = item.nights ? item.total - (item.holidaySupplement ?? 0) : item.total * numNights;

        const baseTaxable = item.baseTaxableAmount ?? item.taxable_amount;
        let totalTaxable = item.taxable_amount * item.rooms * nightsCount;
        const totalTaxableWithoutSupp = baseTaxable * item.rooms * nightsCount;

        const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
        const discountRate = getDiscountPercentage(item.selectedDiscount) / 100 || 0;
        const discount = Math.round(discountRate * totalDiscountableAmount);
        const netDiscount = totalTaxableWithoutSupp * discountRate;
        totalTaxable = totalTaxable - netDiscount;
        const taxes = (totalRate / 100) * totalTaxable;
        const taxDisplay = getItemTaxDisplay(item);

        return { totalAmount, totalTaxable, totalRate, discountRate, discount, taxes, netDiscount, taxDisplay };
    };

    const grandTotals = displayRows.reduce(
        (acc, item) => {
            const details = getItemDetails(item, formData.numNights);
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

    useEffect(() => {
        if (onSummaryComputed) {
            onSummaryComputed({
                taxSummary,
                grandTotals,
            });
        }
    }, [displayRows, formData, taxSummary, grandTotals, onSummaryComputed]);

    return (
        <View style={styles.container}>
            {/* Table Header */}
            {displayRows.length > 0 && (
                <View style={[!is_invoice_generated ? styles.tableHeader : styles.tableHeaderInvoice]}>
                    <Text
                        style={[
                            styles.headerCell,
                            !is_invoice_generated
                                ? hasDiscount
                                    ? styles.colRoomColumn1
                                    : styles.colRoomColumn1NoDiscount
                                : hasDiscount
                                  ? styles.colRoomInvoice
                                  : styles.colRoomInvoiceNoDiscount,
                        ]}
                    >
                        Room Details
                    </Text>
                    <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Rooms</Text>
                    <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Nights</Text>
                    <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Rate</Text>
                    {hasDiscount && <Text style={[styles.headerCell, styles.colRoom]}>Discount</Text>}
                    {is_invoice_generated && <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Net</Text>}
                    {is_invoice_generated && <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Tax</Text>}
                    <Text style={[styles.headerCell, hasDiscount ? styles.colRoomTotal : styles.colRoomTotalNoDiscount]}>Total</Text>
                    {!is_invoice_generated && (
                        <Text style={[styles.headerCell, hasDiscount ? styles.colRoomQuotationTax : styles.colRoomQuotationTaxNoDiscount]}>Tax</Text>
                    )}
                </View>
            )}

            {displayRows.map((item) => {
                const itemDetails = getItemDetails(item, formData.numNights);
                const roomName = item.isHolidayRow
                    ? `${item.room_type.charAt(0).toUpperCase() + item.room_type.slice(1)} ${item.board_type} (${item.holidayLabel || 'Holiday'})`
                    : `${item.room_type.charAt(0).toUpperCase() + item.room_type.slice(1)} ${item.board_type}`;
                return (
                    <View key={item.id} style={!is_invoice_generated ? styles.tableRow : styles.tableRowInvoice}>
                        <Text
                            style={[
                                styles.rowCell,
                                !is_invoice_generated
                                    ? hasDiscount
                                        ? styles.colRoomColumn1
                                        : styles.colRoomColumn1NoDiscount
                                    : hasDiscount
                                      ? styles.colRoomInvoice
                                      : styles.colRoomInvoiceNoDiscount,
                            ]}
                        >
                            {roomName}
                        </Text>
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>{item.rooms}</Text>
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>
                            {item.nights ? item.nights : formData.numNights}
                        </Text>
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>
                            {item.amount_ksh.toLocaleString()}
                        </Text>
                        {hasDiscount && <Text style={[styles.rowCell, styles.colRoom]}>{itemDetails.discount.toLocaleString()}</Text>}
                        {is_invoice_generated && (
                            <Text style={[styles.rowCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>
                                {formatCurrency(itemDetails.totalTaxable)}
                            </Text>
                        )}
                        {is_invoice_generated && (
                            <Text style={[styles.rowCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>
                                KSh {formatCurrency(itemDetails.taxes)}
                                {'\n'}
                                {itemDetails.taxDisplay.codes} ({itemDetails.taxDisplay.rate}%)
                            </Text>
                        )}
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoomTotal : styles.colRoomTotalNoDiscount]}>
                            {(itemDetails.totalAmount - itemDetails.discount).toLocaleString()}
                        </Text>
                        {!is_invoice_generated && (
                            <Text style={[styles.rowCell, hasDiscount ? styles.colRoomQuotationTax : styles.colRoomQuotationTaxNoDiscount]}>
                                {itemDetails.taxDisplay.codes}
                            </Text>
                        )}
                    </View>
                );
            })}
        </View>
    );
};

export default PdfRoomTable;
