/* eslint-disable @typescript-eslint/no-explicit-any */
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import React, { useEffect } from 'react';
import { getDiscountPercentage } from '../utils/discountAsPercentage';

const styles = StyleSheet.create({
    header: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#000',
        paddingBottom: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    statBox: {
        width: '30%',
        padding: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        marginBottom: 10,
    },
    statLabel: {
        fontSize: 10,
        color: '#4B5563',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    table: {
        width: '100%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
        display: 'flex',
        flexDirection: 'column',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 5,
        textAlign: 'left',
        alignItems: 'flex-start',
    },
    tableRowAlt: {
        backgroundColor: '#F9FAFB',
        textAlign: 'left',
        alignItems: 'flex-start',
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
    tableCell: {
        padding: 6,
        fontSize: 9,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        textAlign: 'center',
    },
    lastCell: {
        borderRightWidth: 0,
    },
    taxBreakdown: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    taxBox: {
        width: '48%',
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 4,
        marginRight: 10,
    },
    taxTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#374151',
    },
    taxItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 10,
        marginBottom: 4,
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryBox: {
        width: '48%',
        padding: 15,
        borderRadius: 4,
        marginBottom: 20,
    },
    discountBox: {
        backgroundColor: '#FEF3C7',
        borderColor: '#F59E0B',
    },
    totalBox: {
        backgroundColor: '#DBEAFE',
        borderColor: '#3B82F6',
    },
    summaryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 10,
        marginBottom: 4,
    },
    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 8,
        marginTop: 8,
        fontSize: 12,
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: 'bold',
    },

    colRoom: { width: '15%' },
    colRoomInvoice: { width: '30%' },
    colRoomColumn1: { width: '25%' },
    colRoomItem: { width: '15%' },
    colRoomTotal: {
        width: '15%',
        alignItems: 'flex-end',
        fontWeight: 'bold',
        textAlign: 'right',
    },
    colRoomQuotationTax: {
        width: '15%',
        alignItems: 'flex-end',
        textAlign: 'right',
    },

    colRoomNoDiscount: { width: '17%' },
    colRoomInvoiceNoDiscount: { width: '38%' },
    colRoomColumn1NoDiscount: { width: '35%' },
    colRoomItemNoDiscount: { width: '17%' },
    colRoomTotalNoDiscount: {
        width: '17%',
        alignItems: 'flex-end',
        fontWeight: 'bold',
        textAlign: 'right',
    },
    colRoomQuotationTaxNoDiscount: {
        width: '17%',
        alignItems: 'flex-end',
        textAlign: 'right',
    },
    rowCell: {
        fontSize: 9,
        paddingHorizontal: 4,
        textAlign: 'left',
        alignItems: 'flex-start',
        alignContent: 'flex-start',
    },
    headerCell: {
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 4,
        textAlign: 'left',
    },
    container: {
        marginBottom: 15,
    },
});

interface RoomTableLeisurePDFProps {
    items: any;
    formData: any;
    is_invoice_generated: boolean;
    onSummaryCalculated?: (summary: any) => void;
}

const PdfRoomTableLeisure: React.FC<RoomTableLeisurePDFProps> = ({ items, formData, is_invoice_generated, onSummaryCalculated }) => {
    const getTaxCode = (tax: any): string => {
        return tax.tax_code ?? tax.taxCode ?? '';
    };

    const getGroupingKey = (item: any) => {
        const taxCodes =
            item.room?.taxes
                ?.map((tax: any) => getTaxCode(tax))
                .sort()
                .join(',') || '';
        const kidsArray = item.kids?.sort().join(',') || '';
        const nightsArray = item.nights?.sort().join(',') || '';
        const discountRate = getDiscountPercentage(item.selectedDiscount);

        return `${item.type}_${item.room?.board_type || ''}_${kidsArray}_${nightsArray}_${item.totalCost}_${taxCodes}_${discountRate}`;
    };

    const groupedItems = items.reduce((acc: any, item: any) => {
        const key = getGroupingKey(item);
        if (!acc[key]) {
            acc[key] = {
                ...item,
                count: 1,
                originalItems: [item],
            };
        } else {
            acc[key].count += 1;
            acc[key].originalItems.push(item);
        }
        return acc;
    }, {});

    const groupedItemsArray: any[] = Object.values(groupedItems);

    const groupedDisplayRows: any[] = groupedItemsArray.flatMap((groupedItem: any) => {
        const fullNights = groupedItem.nights?.length > 0 ? groupedItem.nights.length : formData?.numNights;
        const holidayNightsCount = groupedItem.holidayNights ?? 0;
        const normalNightsCount = fullNights - holidayNightsCount;

        const hasHoliday = holidayNightsCount > 0;
        const hasNormal = normalNightsCount > 0;

        const baseCostPerNight = (groupedItem.totalCost - (groupedItem.holidaySupplement ?? 0)) / fullNights;

        const createPartialGrouped = (nights: number, isHoliday: boolean): any => {
            const supplementTotal = groupedItem.holidaySupplement ?? 0;
            const rowTotalCost = baseCostPerNight * nights + (isHoliday ? supplementTotal : 0);

            return {
                ...groupedItem,
                totalCost: rowTotalCost,
                displayNights: nights,
                isHolidayRow: isHoliday,
            };
        };

        const rows: any[] = [];
        if (hasHoliday) rows.push(createPartialGrouped(holidayNightsCount, true));
        if (hasNormal) rows.push(createPartialGrouped(normalNightsCount, false));
        if (!hasHoliday && !hasNormal) {
            rows.push({ ...groupedItem, isHolidayRow: false, displayNights: fullNights });
        }

        return rows;
    });

    const hasDiscount = items.some((item: any) => getDiscountPercentage(item.selectedDiscount) > 0);

    const subtotal = groupedDisplayRows.reduce((sum: number, row: any) => {
        return sum + row.totalCost * row.count;
    }, 0);

    const allTaxCodes = Array.from(new Set(groupedDisplayRows.flatMap((item: any) => item.room?.taxes?.map((tax: any) => getTaxCode(tax)) || [])))
        .filter(Boolean)
        .sort();

    const taxSummary = allTaxCodes.map((code: any) => {
        const rowsWithThisTax = groupedDisplayRows.filter((item: any) => item?.room?.taxes?.some((tax: any) => getTaxCode(tax) === code));

        const totalDiscount = rowsWithThisTax.reduce((sum: number, item: any) => {
            if (item.selectedDiscount) {
                const itemDiscountAmount =
                    ((item?.room?.taxable_amount * item.totalCost) / item.room.amount_ksh) *
                    (getDiscountPercentage(item.selectedDiscount) / 100) *
                    item.count;
                return sum + itemDiscountAmount;
            }
            return sum;
        }, 0);

        let taxableAmountForThisTax = rowsWithThisTax.reduce((sum: number, item: any) => {
            return sum + ((item?.room?.taxable_amount * item.totalCost) / item.room.amount_ksh) * item.count;
        }, 0);

        if (totalDiscount) {
            taxableAmountForThisTax = taxableAmountForThisTax - totalDiscount;
        }

        const rate = rowsWithThisTax[0]?.room.taxes.find((tax: any) => getTaxCode(tax) === code)?.rate || 0;
        const name = rowsWithThisTax[0]?.room.taxes.find((tax: any) => getTaxCode(tax) === code)?.name || '';
        const amount = taxableAmountForThisTax * (rate / 100);

        return {
            code,
            rate,
            amount,
            name,
            taxableAmount: taxableAmountForThisTax,
        };
    });

    const getItemTaxDisplay = (item: any) => {
        const sortedTaxes = [...(item.room?.taxes || [])].sort((a: any, b: any) => getTaxCode(a).localeCompare(getTaxCode(b)));
        const codes = sortedTaxes.map((t: any) => getTaxCode(t)).join('');
        const totalRate = sortedTaxes.reduce((sum: number, tax: any) => sum + tax.rate, 0);
        const totalAmount = sortedTaxes.reduce((sum: number, tax: any) => sum + item.taxable_amount * (tax.rate / 100), 0);

        return {
            codes,
            rate: totalRate,
            amount: totalAmount,
            details: sortedTaxes.map((tax: any) => ({
                code: getTaxCode(tax),
                rate: tax.rate,
                amount: item.taxable_amount * (tax.rate / 100),
                name: tax.name,
            })),
        };
    };

    const getGroupedItemDetails = (groupedItem: any) => {
        const count = groupedItem.count;
        const totalAmount = groupedItem.totalCost * count;

        let totalTaxable = ((groupedItem?.room?.taxable_amount * groupedItem.totalCost) / groupedItem.room.amount_ksh) * count;

        const totalRate = groupedItem.room?.taxes?.reduce((sum: number, tax: any) => sum + tax.rate, 0) ?? 0;
        const discountRate = getDiscountPercentage(groupedItem.selectedDiscount) / 100 || 0;
        const discount = Math.round(discountRate * totalAmount);
        const netDiscount = totalTaxable * discountRate;
        totalTaxable = totalTaxable - netDiscount;
        const taxes = (totalRate / 100) * totalTaxable;
        const taxDisplay = getItemTaxDisplay(groupedItem);

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

    const getItemDetails = (item: any) => {
        const totalAmount = item.totalCost;

        let totalTaxable = (item?.room?.taxable_amount * item.totalCost) / item.room.amount_ksh;

        const totalRate = item.room?.taxes?.reduce((sum: number, tax: any) => sum + tax.rate, 0) ?? 0;
        const discountRate = getDiscountPercentage(item.selectedDiscount) / 100 || 0;
        const discount = Math.round(discountRate * totalAmount);
        const netDiscount = totalTaxable * discountRate;
        totalTaxable = totalTaxable - netDiscount;
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

    const grandTotals = groupedDisplayRows.reduce(
        (acc: any, item: any) => {
            const details = getGroupedItemDetails(item);
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'decimal',
            maximumFractionDigits: 0,
        }).format(Math.round(value));
    };

    useEffect(() => {
        if (onSummaryCalculated) {
            onSummaryCalculated({
                subtotal,
                taxSummary,
                grandTotals,
            });
        }
    }, [items, formData, subtotal, taxSummary, grandTotals, onSummaryCalculated]);

    if (!formData) {
        return (
            <View>
                <Text>Loading quotation details...</Text>
            </View>
        );
    }

    const getOrdinalSuffix = (num: number) => {
        const j = num % 10,
            k = num % 100;
        if (j === 1 && k !== 11) return num + 'st';
        if (j === 2 && k !== 12) return num + 'nd';
        if (j === 3 && k !== 13) return num + 'rd';
        return num + 'th';
    };

    return (
        <View style={[styles.container, !is_invoice_generated ? { width: '460px' } : { width: '520px' }]}>
            {groupedDisplayRows.length > 0 && (
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

            {groupedDisplayRows.map((groupedItem: any, index: number) => {
                const itemDetails = getGroupedItemDetails(groupedItem);
                const displayName = `${groupedItem.type}`
                    ?.replace(/: Ksh \d+$|:/g, '')
                    .trim()
                    ?.replace(/^\w/, (c: string) => c.toUpperCase());

                const fullNights = groupedItem.nights?.length > 0 ? groupedItem.nights.length : formData?.numNights;
                const ratePerNight = groupedItem.totalCost / (groupedItem.displayNights ?? fullNights);

                const nightsLabel = groupedItem.displayNights ?? fullNights;

                const rowDisplayName = groupedItem.isHolidayRow
                    ? `${displayName} ${groupedItem.room?.board_type || ''} (${groupedItem.holidayLabel || 'Holiday'})`
                    : `${displayName} ${groupedItem.room?.board_type || ''}`;

                return (
                    <View key={index} style={[styles.tableRow]}>
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
                            {groupedItem.count > 1 ? <Text style={{ fontWeight: 'bold' }}>{`${groupedItem.count}x `}</Text> : ''}
                            {rowDisplayName}
                            {groupedItem.kids?.length > 0 &&
                                `(${groupedItem?.adultCost > 0 ? 'Sharing with ' : ''}${
                                    groupedItem.kids.length === 1
                                        ? groupedItem?.adultCost > 0
                                            ? 'kid'
                                            : 'Kid'
                                        : groupedItem?.adultCost > 0
                                          ? 'kids'
                                          : 'Kids'
                                }: age ${groupedItem.kids
                                    .sort((a: number, b: number) => a - b)
                                    .map((kid: number) => kid)
                                    .join(', ')})`}
                        </Text>
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoomItem : styles.colRoomItemNoDiscount]}>
                            {nightsLabel === formData?.numNights
                                ? (formData?.numNights ?? 'N/A')
                                : nightsLabel === 1
                                  ? getOrdinalSuffix(groupedItem.nights?.[0] ?? 1)
                                  : nightsLabel}
                        </Text>
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoomItem : styles.colRoomItemNoDiscount]}>
                            {formatCurrency(ratePerNight)}
                        </Text>
                        {hasDiscount && <Text style={[styles.rowCell, styles.colRoomItem]}>{formatCurrency(itemDetails.discount)}</Text>}
                        {is_invoice_generated && (
                            <Text style={[styles.rowCell, hasDiscount ? styles.colRoomItem : styles.colRoomItemNoDiscount]}>
                                {formatCurrency(itemDetails.totalTaxable)}
                            </Text>
                        )}
                        {is_invoice_generated && (
                            <Text style={[styles.rowCell, hasDiscount ? styles.colRoomItem : styles.colRoomItemNoDiscount]}>
                                {formatCurrency(itemDetails.taxes)}
                                {'\n'}
                                {itemDetails.taxDisplay.codes} ({itemDetails.taxDisplay.rate}%)
                            </Text>
                        )}
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoomTotal : styles.colRoomTotalNoDiscount]}>
                            {formatCurrency(itemDetails.totalAmount - itemDetails.discount)}
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

export default PdfRoomTableLeisure;
