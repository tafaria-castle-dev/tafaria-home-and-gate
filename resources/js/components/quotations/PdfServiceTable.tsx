/* eslint-disable @typescript-eslint/no-explicit-any */
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import React, { useEffect } from 'react';
import { getDiscountPercentage } from '../utils/discountAsPercentage';

const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
    },
    header: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#000',
        paddingBottom: 5,
        paddingHorizontal: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        width: '460px',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
        paddingVertical: 5,
    },
    tableHeaderInvoice: {
        flexDirection: 'row',
        width: '520px',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#d1d5db',
        paddingVertical: 5,
    },
    colRoomItem: { width: '12.2%' },
    colRoomColumn1: { width: '28%' },
    colRoom: { width: '12.2%' },
    colRoomInvoice: { width: '28%' },
    colRoomTotal: {
        width: '12.2%',
        alignItems: 'flex-end',
        fontWeight: 'bold',
        textAlign: 'right',
        paddingHorizontal: 4,
    },
    colRoomQuotationTax: {
        width: '12.2%',
        alignItems: 'flex-end',
        textAlign: 'right',
        paddingHorizontal: 4,
    },
    colRoomItemNoDiscount: { width: '15.2%' },
    colRoomColumn1NoDiscount: { width: '34%' },
    colRoomNoDiscount: { width: '15.2%' },
    colRoomInvoiceNoDiscount: { width: '34%' },
    colRoomTotalNoDiscount: {
        width: '15.2%',
        alignItems: 'flex-end',
        fontWeight: 'bold',
        textAlign: 'right',
        paddingHorizontal: 4,
    },
    colRoomQuotationTaxNoDiscount: {
        width: '15.2%',
        alignItems: 'flex-end',
        textAlign: 'right',
        paddingHorizontal: 4,
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
    },
    serviceName: {
        fontSize: 9,
        paddingHorizontal: 4,
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
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
    taxBox: {
        backgroundColor: '#f9fafb',
        borderColor: '#e5e7eb',
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
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        fontWeight: 'bold',
    },
    taxItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
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
    selectedDiscount?: number | { rate: number } | null;
}

type TaxBreakdownItem = {
    code: string;
    rate: number;
    amount: number;
    name: string;
    taxableAmount: number;
    totalDiscount: number;
};

type TaxBreakdown = TaxBreakdownItem[];

type Totals = {
    totalAmount: number;
    totalTaxable: number;
    totalDiscount: number;
    totalTaxes: number;
    netDiscount: number;
};

interface PdfServiceTableProps {
    services: ServiceItem[];
    is_invoice_generated: boolean;
    onSummaryReady?: (summary: { taxSummary: TaxBreakdown; grandTotals: Totals }) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-KE', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(value));
};

const PdfServiceTable: React.FC<PdfServiceTableProps> = ({ services, is_invoice_generated, onSummaryReady }) => {
    const totalPax = services.reduce((sum, item) => sum + item.noofpax, 0);

    const hasDiscount = services.some((service) => getDiscountPercentage(service.selectedDiscount) > 0);
    const getTaxCode = (tax: any): string => {
        return tax.tax_code ?? tax.taxCode ?? '';
    };
    const allTaxCodes = Array.from(new Set(services.flatMap((item) => item.taxes.map((tax) => getTaxCode(tax))))).sort();

    const taxSummary = allTaxCodes.map((code) => {
        const itemsWithThisTax = services.filter((item) => item.taxes.some((tax) => getTaxCode(tax) === code));

        const totalDiscount = itemsWithThisTax.reduce((sum, item) => {
            if (!item.selectedDiscount) return sum;

            let itemTaxableAmount = 0;

            if (item.taxes.length > 0) {
                const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
                const unitAmount = item.amount_ksh;
                itemTaxableAmount = unitAmount / (1 + totalRate / 100);
            }

            const discountRate = getDiscountPercentage(item.selectedDiscount) / 100;
            const discountAmount = itemTaxableAmount * discountRate;

            return sum + discountAmount * (item.noofpax || 1) * (item.numnights || 1);
        }, 0);

        let taxableAmountForThisTax = itemsWithThisTax.reduce((sum, item) => {
            let itemTaxableAmount = 0;

            if (item.taxes.length > 0) {
                const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
                const unitAmount = item.amount_ksh;
                itemTaxableAmount = unitAmount / (1 + totalRate / 100);
            }

            return sum + itemTaxableAmount * (item.noofpax || 1) * (item.numnights || 1);
        }, 0);

        taxableAmountForThisTax = Math.max(0, taxableAmountForThisTax - totalDiscount);

        const rate = itemsWithThisTax[0]?.taxes.find((tax) => getTaxCode(tax) === code)?.rate || 0;
        const name = itemsWithThisTax[0]?.taxes.find((tax) => getTaxCode(tax) === code)?.name || '';

        const amount = taxableAmountForThisTax * (rate / 100);

        return {
            code,
            rate,
            amount,
            name,
            taxableAmount: taxableAmountForThisTax,
            totalDiscount,
        };
    });

    const totalTaxAmount = taxSummary.reduce((sum, tax) => sum + tax.amount, 0);

    const totalDiscount = services.reduce((sum, item) => {
        if (item.selectedDiscount) {
            const itemTotal = item.amount_ksh * (item.numnights || 1);
            return sum + itemTotal * (getDiscountPercentage(item.selectedDiscount) / 100);
        }
        return sum;
    }, 0);

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

    const getItemDetails = (item: ServiceItem) => {
        const totalAmount = item.amount_ksh * item.noofpax * item.numnights;
        const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
        const discountRate = getDiscountPercentage(item.selectedDiscount) / 100 || 0;
        const discount = Math.round(discountRate * totalAmount);
        let totalTaxable = 0;

        if (item.taxes.length > 0) {
            const totalRate = item.taxes.reduce((sum, tax) => sum + tax.rate, 0);
            const taxable_amount = totalAmount / (totalRate / 100 + 1);
            totalTaxable = taxable_amount;
        }

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

    useEffect(() => {
        if (onSummaryReady) {
            localStorage.setItem('serviceSummary', null);
            onSummaryReady({
                taxSummary,
                grandTotals,
            });
        }
    }, [services]);
    const wrapTextForPDF = (text: string, maxChars = 12): string => {
        if (!text) return '';

        const withSoftHyphens = text?.replace(/-/g, '\u00AD')?.replace(new RegExp(`([^\\s\\u00AD]{${maxChars}})`, 'g'), '$1\u00AD');

        return withSoftHyphens.split(' ').join('\u200B ');
    };
    return (
        <View style={styles.container}>
            <Text style={styles.header}>Tafaria Experience</Text>

            <View style={[is_invoice_generated ? styles.tableHeaderInvoice : styles.tableHeader]}>
                <Text
                    style={[
                        styles.headerCell,
                        is_invoice_generated
                            ? hasDiscount
                                ? styles.colRoomInvoice
                                : styles.colRoomInvoiceNoDiscount
                            : hasDiscount
                              ? styles.colRoomColumn1
                              : styles.colRoomColumn1NoDiscount,
                    ]}
                >
                    Service
                </Text>
                <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Pax</Text>
                <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Num</Text>
                <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Rate</Text>
                {hasDiscount && <Text style={[styles.headerCell, styles.colRoom]}>Discount</Text>}
                {is_invoice_generated && <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Net</Text>}
                {is_invoice_generated && <Text style={[styles.headerCell, hasDiscount ? styles.colRoom : styles.colRoomNoDiscount]}>Tax</Text>}
                <Text style={[styles.headerCell, hasDiscount ? styles.colRoomTotal : styles.colRoomTotalNoDiscount]}>Total</Text>
                {!is_invoice_generated && (
                    <Text style={[styles.headerCell, hasDiscount ? styles.colRoomQuotationTax : styles.colRoomQuotationTaxNoDiscount]}>Tax</Text>
                )}
            </View>

            {services.map((service) => {
                const itemDetails = getItemDetails(service);

                return (
                    <View key={service.id} style={[is_invoice_generated ? styles.tableRowInvoice : styles.tableRow]}>
                        <Text
                            style={[
                                styles.serviceName,
                                is_invoice_generated
                                    ? hasDiscount
                                        ? styles.colRoomInvoice
                                        : styles.colRoomInvoiceNoDiscount
                                    : hasDiscount
                                      ? styles.colRoomColumn1
                                      : styles.colRoomColumn1NoDiscount,
                            ]}
                        >
                            {wrapTextForPDF(service.name, 30)}
                        </Text>
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoomItem : styles.colRoomItemNoDiscount]}>{service.noofpax}</Text>
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoomItem : styles.colRoomItemNoDiscount]}>{service.numnights}</Text>
                        <Text style={[styles.rowCell, hasDiscount ? styles.colRoomItem : styles.colRoomItemNoDiscount]}>
                            {service.amount_ksh.toLocaleString()}
                        </Text>
                        {hasDiscount && <Text style={[styles.rowCell, styles.colRoomItem]}>{itemDetails.discount.toLocaleString()}</Text>}
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

export default PdfServiceTable;
