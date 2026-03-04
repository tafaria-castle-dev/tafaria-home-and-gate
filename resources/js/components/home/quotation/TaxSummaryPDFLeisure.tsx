import { StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';

interface Tax {
    tax_code: string;
    rate: number;
    name: string;
}

interface RoomDetail {
    totalCost: number;
    taxes: Tax[];
}

interface AdditionalService {
    amount_ksh: number;
    noofpax?: number;
    numnights?: number;
    taxes: Tax[];
}

interface Props {
    roomDetailsCorporate: RoomDetail[];
    additionalServices: AdditionalService[];
    numNights: number;
    discountAmount: number;
}

const styles = StyleSheet.create({
    table: {
        width: '220px',
        marginVertical: 8,
        fontSize: 12,
        marginHorizontal: 188,
    },
    summary: {
        marginHorizontal: 74,
    },
    row: {
        flexDirection: 'row',
        minHeight: 20,
    },
    cellHeader: {
        flex: 1,
        fontWeight: 'bold',
        padding: 4,
        backgroundColor: '#eee',
        borderColor: '#eee',
        fontSize: 9,
        textAlign: 'center',
    },
    cell: {
        flex: 1,
        paddingRight: 0,
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
        borderBottomWidth: 0.5,
        borderColor: '#eee',
        fontSize: 10,
        textAlign: 'right',
    },
    itemRow: {
        flexDirection: 'row',
        fontWeight: 'bold',
        justifyContent: 'space-between',
        width: '100%',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginVertical: 4,
    },
    summaryText: {
        fontSize: 10,
        textAlign: 'right',
    },
});

const formatCurrency = (amount: number): string => {
    return parseFloat(amount.toString()).toLocaleString('en-US', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
    });
};

const TaxSummaryPDFLeisure: React.FC<Props> = ({ roomDetailsCorporate, additionalServices, numNights, discountAmount }) => {
    const taxMap: Record<string, { tax_code: string; rate: number; name: string; amount: number }> = {};
    let totalGross = 0;
    const items: { total: number; taxes: Tax[] }[] = [];

    // Calculate total from rooms
    roomDetailsCorporate.forEach((item) => {
        const amount = item.totalCost * numNights;
        totalGross += amount;
        items.push({ total: amount, taxes: item.taxes || [] });
    });

    // Add additional services
    additionalServices
        .filter((service) => service.taxes && service.taxes.length > 0)
        .forEach((service) => {
            const pax = service.noofpax || 1;
            const nights = service.numnights || 1;
            const amount = service.amount_ksh * pax * nights;
            totalGross += amount;
            items.push({ total: amount, taxes: service.taxes });
        });

    // Apply proportional discount to each item
    items.forEach((item) => {
        const discountShare = (item.total / totalGross) * discountAmount;
        const discountedTotal = item.total - discountShare;

        item.taxes.forEach((tax) => {
            const taxAmount = (tax.rate / 100) * discountedTotal;
            const key = tax.tax_code;

            if (!taxMap[key]) {
                taxMap[key] = {
                    tax_code: tax.tax_code,
                    rate: tax.rate,
                    name: tax.name,
                    amount: 0,
                };
            }

            taxMap[key].amount += taxAmount;
        });
    });

    const taxValues = Object.values(taxMap).sort((a, b) => b.amount - a.amount);
    const totalTax = taxValues.reduce((acc, tax) => acc + (tax?.amount ?? 0), 0);

    // Now, calculate Total Payable
    const totalPayable = discountAmount > 0 ? totalGross - discountAmount : totalGross;

    // Net Taxable: totalPayable - totalTax
    const netTaxable = Math.max(totalPayable - totalTax, 0);

    return (
        <View style={styles.summary}>
            {/* Total Payable */}
            <View style={styles.itemRow}>
                <Text>Total Payable (KES):</Text>
                <Text>{formatCurrency(totalPayable)}</Text>
            </View>

            <View style={styles.table}>
                <View style={styles.row}>
                    <Text style={styles.cellHeader}>TAX BREAKDOWN (KES)</Text>
                </View>

                {/* Net Taxable */}
                <View style={styles.row}>
                    <Text style={styles.cell}>Net Taxable</Text>
                    <Text style={styles.cell}>{formatCurrency(netTaxable)}</Text>
                </View>

                {/* Taxes */}
                {taxValues.map((tax) => (
                    <View style={styles.row} key={tax.tax_code}>
                        <Text style={styles.cell}>{`${tax.name} (${tax.tax_code}) (${tax.rate}%)`}</Text>
                        <Text style={styles.cell}>{formatCurrency(tax.amount)}</Text>
                    </View>
                ))}

                {/* Total Payable (Final) */}
                <View style={styles.row}>
                    <Text style={{ ...styles.cell, fontWeight: 'bold' }}>Total (KES)</Text>
                    <Text style={{ ...styles.cell, fontWeight: 'bold' }}>{formatCurrency(totalPayable)}</Text>
                </View>
            </View>
        </View>
    );
};

export default TaxSummaryPDFLeisure;
