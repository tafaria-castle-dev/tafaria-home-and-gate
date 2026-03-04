import { StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';

interface Tax {
    tax_code: string;
    rate: number;
    name: string;
}

interface RoomDetail {
    total: number;
    taxable_amount: number;
    taxes: Tax[];
    pax: number;
}

interface AdditionalService {
    amount_ksh: number;
    noofpax?: number;
    numnights?: number;
    taxes: Tax[];
    taxable_amount: number;
}

interface Props {
    roomDetailsCorporate: RoomDetail[];
    additionalServices: AdditionalService[];
    numNights: number;
    discountAmount: number;
}

const styles = StyleSheet.create({
    table: {
        width: '250px',
        marginVertical: 8,
        fontSize: 12,
        marginHorizontal: 138,
        alignSelf: 'flex-start',
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
});

export const formatCurrency = (amount: number): string => {
    return parseFloat(amount.toString()).toLocaleString('en-US', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
    });
};

const TaxSummaryPDF: React.FC<Props> = ({ roomDetailsCorporate, additionalServices, numNights, discountAmount }) => {
    const taxMap: Record<string, { tax_code: string; rate: number; name: string; amount: number }> = {};

    let totalGross = 0;
    const items: { total: number; taxes: Tax[] }[] = [];

    let netTaxable = 0;
    // Step 1: Calculate total from rooms
    roomDetailsCorporate.forEach((item) => {
        console.log('item it is', item);
        if (item.taxable_amount) {
            netTaxable += item.taxable_amount * numNights * item.pax;
        }
        const amount = item.total * numNights;
        totalGross += amount;
        items.push({ total: amount, taxes: item.taxes });
    });

    // Step 2: Add additional services
    additionalServices
        .filter((service) => service.taxes && service.taxes.length > 0)
        .forEach((service) => {
            console.log('service it is', service);
            const pax = service.noofpax || 1;
            const nights = service.numnights || numNights || 1;
            const amount = service.amount_ksh * pax * nights;
            totalGross += amount;
            items.push({ total: amount, taxes: service.taxes });

            // Calculate taxable amount for services the same way as rooms
            if (service.taxable_amount) {
                netTaxable += service.taxable_amount * nights * pax;
            }
        });

    // Step 3: Apply discount
    const grossAfterDiscount = totalGross - discountAmount;

    // Step 4: Calculate tax from discounted totals
    // let totalTax = 0;

    items.forEach((item) => {
        // const discountShare = (item.total / totalGross) * discountAmount;
        // const discountedTotal = item.total - discountShare;

        item.taxes.forEach((tax) => {
            const taxAmount = (tax.rate / 100) * netTaxable;
            // totalTax += taxAmount;

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

    // const netTaxable = grossAfterDiscount - totalTax;
    const taxValues = Object.values(taxMap).sort((a, b) => b.amount - a.amount);

    return (
        <View>
            <View style={styles.summary}>
                {/* Gross = Total Payable */}
                <View style={styles.itemRow}>
                    <Text>Total Payable (KES):</Text>
                    <Text>{formatCurrency(grossAfterDiscount)}</Text>
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
                        <Text style={{ ...styles.cell, fontWeight: 'bold' }}>{formatCurrency(grossAfterDiscount)}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default TaxSummaryPDF;
