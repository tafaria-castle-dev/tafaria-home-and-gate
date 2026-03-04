import { StyleSheet, Text, View } from '@react-pdf/renderer';
import React from 'react';
import TruncatedText from './TruncatedTextProps';

type TaxItem = {
    code: string;
    rate: number;
    amount: number;
    name: string;
    taxableAmount: number;
    totalDiscount?: number;
};

type Totals = {
    totalAmount: number;
    totalTaxable: number;
    totalDiscount: number;
    totalTaxes: number;
    netDiscount: number;
};

type TaxSummary = {
    taxBreakdown: TaxItem[];
    totals: Totals;
};

type Props = {
    notes: string;
    roomSummary: TaxSummary;
    serviceSummary: TaxSummary;
    is_invoice_generated: boolean;
    isCorporate: boolean;
};

const combineTaxSummaries = (roomSummary: TaxSummary | null | undefined, serviceSummary: TaxSummary | null | undefined): TaxSummary => {
    // Initialize with empty objects if null/undefined
    const safeRoomSummary = roomSummary || {
        taxBreakdown: [],
        totals: createEmptyTotals(),
    };
    const safeServiceSummary = serviceSummary || {
        taxBreakdown: [],
        totals: createEmptyTotals(),
    };

    const combinedMap = new Map<string, TaxItem>();

    const addOrUpdateItem = (item: TaxItem) => {
        if (!item) return;

        const existing = combinedMap.get(item.code);
        if (existing) {
            combinedMap.set(item.code, {
                ...existing,
                amount: (existing.amount || 0) + (item.amount || 0),
                taxableAmount: (existing.taxableAmount || 0) + (item.taxableAmount || 0),
                totalDiscount: (existing.totalDiscount || 0) + (item.totalDiscount || 0),
            });
        } else {
            combinedMap.set(item.code, {
                ...item,
                amount: item.amount || 0,
                taxableAmount: item.taxableAmount || 0,
                totalDiscount: item.totalDiscount || 0,
            });
        }
    };

    // Safely iterate over taxBreakdown arrays
    safeRoomSummary.taxBreakdown?.forEach(addOrUpdateItem);
    safeServiceSummary.taxBreakdown?.forEach(addOrUpdateItem);
    const combinedTaxBreakdown = Array.from(combinedMap.values());
    const calculatedTotalTaxes = combinedTaxBreakdown.reduce((sum, item) => sum + (item.amount || 0), 0);
    // Helper function to safely add numbers with null/undefined checks
    const safeAdd = (a: number | null | undefined, b: number | null | undefined) => (a || 0) + (b || 0);

    const combinedTotals: Totals = {
        totalAmount: safeAdd(safeRoomSummary.totals?.totalAmount, safeServiceSummary.totals?.totalAmount),
        totalTaxable: safeAdd(safeRoomSummary.totals?.totalTaxable, safeServiceSummary.totals?.totalTaxable),
        totalDiscount: safeAdd(safeRoomSummary.totals?.totalDiscount, safeServiceSummary.totals?.totalDiscount),
        totalTaxes: calculatedTotalTaxes,
        netDiscount: safeAdd(safeRoomSummary.totals?.netDiscount, safeServiceSummary.totals?.netDiscount),
    };

    return {
        taxBreakdown: Array.from(combinedMap.values()),
        totals: combinedTotals,
    };
};

// Helper function to create empty totals
function createEmptyTotals(): Totals {
    return {
        totalAmount: 0,
        totalTaxable: 0,
        totalDiscount: 0,
        totalTaxes: 0,
        netDiscount: 0,
    };
}

const CombinedTaxSummaryPdf: React.FC<Props> = ({ notes, roomSummary, serviceSummary, is_invoice_generated, isCorporate }) => {
    const finalSummary = combineTaxSummaries(roomSummary, serviceSummary);

    console.log('whats the service summary', serviceSummary);
    console.log('whats the room summary', roomSummary);
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'decimal', // Changed from "currency" to "decimal" to remove KES symbol
            maximumFractionDigits: 0, // No decimal places
            minimumFractionDigits: 0, // No decimal places
        }).format(Math.round(value)); // Round to nearest whole number
    };
    return (
        <View style={styles.parent}>
            {!is_invoice_generated && (
                <View>
                    <View style={[styles.section, styles.notesSection, { paddingRight: '20px' }]}>
                        {/* <Image src="/easter.jpeg" style={styles.imageEvent} /> */}
                        <Text style={{ width: '300px', fontSize: '10px', paddingRight: '20px' }}>
                            <TruncatedText text={notes} maxLength={1300} />
                        </Text>
                    </View>
                </View>
            )}

            <View style={[styles.container, !is_invoice_generated ? { marginRight: '28px' } : { marginRight: '-5px' }]}>
                <View>
                    <View style={[styles.totalRow]}>
                        <Text style={styles.grandTotalLabel}>Total payable:</Text>
                        <Text style={styles.grandTotalValue}>
                            {formatCurrency(finalSummary.totals.totalAmount - finalSummary.totals.totalDiscount)}
                        </Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={[styles.grandTotalLabel, { paddingVertical: '10px' }]}>Net taxable:</Text>
                        <Text style={[styles.grandTotalValue, { paddingVertical: '10px' }]}>{formatCurrency(finalSummary.totals.totalTaxable)}</Text>
                    </View>
                    <Text style={styles.heading}>Tax Breakdown</Text>

                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={styles.colName}>Tax</Text>
                            <Text style={styles.colRate}>Rate</Text>
                            <Text style={styles.colAmount}>Amount</Text>
                        </View>

                        {finalSummary.taxBreakdown.map((item, index) => (
                            <View style={styles.tableRow} key={index}>
                                <Text style={styles.colName}>
                                    ({item.name.charAt(0).toUpperCase()}) {item.name}
                                </Text>

                                <Text style={styles.colRate}>{item.rate}%</Text>

                                <Text style={styles.colAmount}>{formatCurrency(item.amount)}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.totalsContainer}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Taxes:</Text>
                            <Text style={styles.totalValue}>{formatCurrency(finalSummary.totals.totalTaxes)}</Text>
                        </View>
                        {/* <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount:</Text>
            <Text style={styles.totalValue}>
              -{formatCurrency(finalSummary.totals.totalDiscount)}
            </Text>
          </View> */}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    parent: {
        width: '100%',
        paddingRight: '24px',
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        paddingVertical: 5,
        textAlign: 'left',
        alignItems: 'flex-start',
    },
    container: {
        right: 15,
        width: 200,
        marginLeft: 'auto',
        padding: 8,
        borderRadius: 4,
        fontSize: 8,
    },
    heading: {
        fontSize: 8,
        fontWeight: 'bold',
        marginBottom: 6,
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 4,
        padding: 5,
        marginTop: 10,
    },
    table: {
        width: '100%',
        marginBottom: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottom: '1 solid #333',
        paddingBottom: 4,
        marginBottom: 4,
    },
    // tableRow: {
    //   flexDirection: "row",
    //   paddingVertical: 2,
    // },
    colName: {
        width: '50%',
        fontSize: 8,
        paddingRight: 2,
    },
    colRate: {
        width: '20%',
        textAlign: 'right',
        fontSize: 8,
        paddingRight: 4,
    },
    colAmount: {
        width: '30%',
        textAlign: 'right',
        fontSize: 8,
    },
    totalsContainer: {
        width: '100%',
        borderTop: '1 solid #333',
        paddingTop: 6,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    totalLabel: {
        fontSize: 8,
    },
    totalValue: {
        fontSize: 8,
    },
    grandTotalRow: {},
    grandTotalLabel: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    grandTotalValue: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    //for the notes
    notes: {
        fontWeight: 'light',
        fontSize: 6,
    },
    labelNotes: {
        fontSize: 12,
        fontWeight: 'bold',
        paddingBottom: '10px',
    },
    section: {
        marginLeft: 66,
        marginRight: 20,
        paddingBottom: 5,
        // borderBottomWidth: 1,
        // borderBottomColor: "#ddd",
    },
    notesSection: {
        padding: 8, // Space inside the box
        marginTop: 5, // Spacing above the box
    },
});

export default CombinedTaxSummaryPdf;
