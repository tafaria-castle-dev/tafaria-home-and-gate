/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { useEffect, useRef, useState } from 'react';

import axios from 'axios';
import PdfRoomTable from '../../quotations/PdfRoomTable';
import PdfRoomTableLeisure from '../../quotations/PdfRoomTableLeisure';
import PdfServiceTable from '../../quotations/PdfServiceTable';
import CombinedTaxSummaryPdf from '../../quotations/PdfSummaryBreakdown';
import { AdditionalService } from '../AdditionalForm';

Font.register({
    family: 'Montserrat',
    fonts: [{ src: '/fonts/Montserrat-Regular.ttf' }, { src: '/fonts/Montserrat-Bold.ttf' }],
});

const styles = StyleSheet.create({
    page: {
        padding: 10,
        fontSize: 10,
        fontFamily: 'Montserrat',
        position: 'relative',
        height: '100%',
    },
    content: {
        flexGrow: 1,
        height: '100%',
        marginLeft: 20,
        marginRight: 20,
    },
    header: {
        textAlign: 'center',
        fontSize: 12,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    itemRowTotal: {
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingTop: 4,
    },
    section: {
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        textAlign: 'left',
        width: '460px',
        marginLeft: 'auto',
        marginRight: 'auto',
    },
    sectionInvoice: {
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        textAlign: 'left',
        width: '520px',
        marginLeft: 'auto',
        marginRight: 'auto',
    },

    sectionFooter: {
        paddingBottom: 10,
        borderBottomWidth: 1,
        marginLeft: 20,
        marginRight: 20,
        paddingLeft: 20,
        paddingRight: 20,
        textAlign: 'left',
    },
    main: {
        width: '80%',
        alignSelf: 'center',
    },

    labelNotesPreparedBy: {
        fontWeight: 'bold',
        fontSize: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#ccc',
        marginVertical: 5,
        width: '100%',
    },
    notes: {
        fontWeight: 'light',
        fontSize: 8,
    },

    fitCenter: {
        justifyContent: 'center',
        alignSelf: 'center',
        width: '90%',
    },
    pdfContainer: {
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    column: {
        flex: 1,
        padding: 4,
    },

    label: {
        fontWeight: 'bold',
        paddingVertical: 2,
    },

    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 2,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTextLeft: {
        fontSize: 10,
        textAlign: 'left',
        maxWidth: '50%',
        alignItems: 'flex-start',
    },
    headerTextRight: {
        fontSize: 10,
        textAlign: 'left',
        maxWidth: '30%',
        alignItems: 'flex-end',
    },
    imageLogo: {
        height: 100,
        width: 120,
        marginLeft: 50,
    },
    footerImage: {
        width: '100%',
        height: 80,
    },
    totalAmount: {
        fontSize: 10,
        textAlign: 'right',
        marginTop: 10,
    },
    imageEvent: {
        position: 'absolute',
        top: -94,
        left: 0,
        width: 65,
        height: 80,
        objectFit: 'contain',
        transform: 'scaleX(-1)',
    },
    footerText: {
        fontSize: 10,
        color: '#555',
        marginBottom: 5,
        paddingTop: 5,
    },
    notesSection: {
        borderWidth: 1,
        borderColor: '#000',
        padding: 8,
        borderRadius: 5,
        marginTop: 5,
        backgroundColor: '#f8f8f8',
    },
    footerBackground: {
        position: 'absolute',
        bottom: 0,
        objectFit: 'cover',
        left: 0,
        width: '100%',
        height: 80,
        filter: 'blur(5px)',
    },
    footerContainer: {
        padding: 10,
        marginTop: 20,
        backgroundColor: '#f8f8f8',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    backgroundImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },

    bulletPointContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    bulletPoint: {
        width: 10,
        fontSize: 10,
    },
    bulletText: {
        fontSize: 10,
        marginTop: 10,
        flex: 1,
    },
    backgroundContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
    },

    labelNotes: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    stampContainer: {
        position: 'relative',
        width: 100,
        height: 100,
        marginLeft: 20,
    },
    stampImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    signatureImage: {
        position: 'absolute',
        top: '25%',
        left: '65%',
        transform: 'translateX(-50%)',
        width: '60px',
        height: 'auto',
        objectFit: 'contain',
        zIndex: 1,
    },
    supplementImage: {
        width: '120px',
        height: '120px',
        objectFit: 'contain',
        zIndex: 50,
    },
    newYearImage: {
        width: '80px',
        height: '80px',
        objectFit: 'contain',
        zIndex: 50,
    },

    dateText: {
        position: 'absolute',
        top: '100%',
        left: '75%',
        transform: 'translate(-50%, -50%)',
        fontSize: 8,
        fontWeight: 'bold',
        color: '#5c5b8d',
    },
    preparedByContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        position: 'absolute',
        bottom: 35,
        left: -20,
        paddingLeft: 50,
        paddingRight: 50,
    },
    bullextText: {
        fontSize: 8,
        position: 'absolute',
        bottom: 10,
        left: 0,
        marginHorizontal: 20,
    },
    preparedByTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    preparedByText: {
        fontSize: 8,
        marginRight: 5,
    },
    preparedByValue: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    line: {
        position: 'absolute',
        bottom: 18,
        left: 0,
        width: '100%',
        height: 2,
        backgroundColor: 'black',
    },
    text: { flexGrow: 2 },
    value: { textAlign: 'right' },
    roomContainer: {
        paddingVertical: 2,
    },

    title: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },

    headerRow1: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    taxLabel1: {
        textAlign: 'right',
        flex: 1,

        fontSize: 8,
        fontWeight: 'bold',
        paddingVertical: 2,
        paddingRight: 10,
    },
    itemRow1: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    roomDetails1: {
        flex: 2,
    },
    amount1: {
        flex: 1,
        textAlign: 'right',
        paddingRight: 10,
    },
    taxValue1: {
        flex: 1,
        textAlign: 'right',
    },
    itemRowTotal1: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 5,
        marginTop: 5,
    },

    taxRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 8,
    },
    taxCell: {
        flex: 1,
        textAlign: 'right',
        paddingHorizontal: 4,
    },
    headerCell: {
        fontWeight: 'bold',
        backgroundColor: '#f5f5f5',
    },
    leftAlign: {
        textAlign: 'left',
        paddingLeft: 8,
    },
    boldText: {
        fontWeight: 'bold',
    },
    taxCodeCell: {
        fontWeight: 'bold',
        textAlign: 'left',
        paddingLeft: 8,
        flex: 0.8,
    },
    rateCell: {
        flex: 0.7,
    },
    taxableCell: {
        flex: 1.2,
    },
    smallDateText: {
        fontSize: 8,
    },
    institutionNameText: {
        fontSize: 9,
    },
    taxContainer: {
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        width: 260,
        borderRadius: 4,
        alignSelf: 'flex-end',
        marginRight: 86,
    },
    taxHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingVertical: 6,
    },
    taxDataRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 6,
    },

    taxRateCell: {
        flex: 0.7,
        textAlign: 'center',
    },
    taxNetCell: {
        flex: 1.2,
        textAlign: 'center',
        paddingRight: 8,
    },
    taxAmountCell: {
        flex: 1,
        textAlign: 'right',
        paddingRight: 8,
        fontWeight: 'bold',
    },
    taxTotalRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingTop: 6,
        marginTop: 4,
        marginBottom: 4,
    },
    taxTotalLabel: {
        flex: 2,
        textAlign: 'right',
        paddingRight: 8,
        fontWeight: 'bold',
    },
    taxTotalValue: {
        flex: 1,
        textAlign: 'right',
        paddingRight: 8,
        fontWeight: 'bold',
    },
});

interface RoomDetail {
    people: number;
    cost: number;
}

const Quotation = ({
    formData,
    is_invoice_generated,
    updated_at,
    approved_on,
}: {
    formData: any;
    is_invoice_generated: boolean;
    updated_at: Date;
    approved_on?: Date;
}) => {
    const additionalServices = formData?.selectedAdditionalServices || [];
    const roomDetailsCorporate = formData?.updatedRoomDetails || ({} as Record<string, RoomDetail>);

    let totalRoomCostCorporate = formData.updatedRoomDetails?.reduce((sum, room) => sum + room.total, 0);

    totalRoomCostCorporate = totalRoomCostCorporate * formData.numNights;
    const totalRoomCostLeisure = formData.quotationLeisure.totalChargeForNights;

    const additionalServicesArray = Array.isArray(additionalServices) ? additionalServices : [];

    const totalAdditionalServicesCost = additionalServicesArray.reduce(
        (sum: number, service: any) => sum + (service?.amount_ksh || 0) * (service?.noofpax || 1) * (service?.numNights || 1),
        0,
    );
    const [filteredFiles, setFilteredFiles] = useState<FileUpload[]>([]);

    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const query = '?category=supplements';
                const response = await axios.get(`/api/file-uploads${query}`);
                setFilteredFiles(response.data);
            } catch (error) {
            } finally {
            }
        };

        fetchFiles();
    }, []);
    const wrapTextForPDF = (text: string, maxChars = 12): string => {
        if (!text) return '';

        const withSoftHyphens = text?.replace(/-/g, '\u00AD')?.replace(new RegExp(`([^\\s\\u00AD]{${maxChars}})`, 'g'), '$1\u00AD');

        return withSoftHyphens.split(' ').join('\u200B ');
    };
    let totalBeforeDiscount = 0;

    if (formData.selectedType === 'Corporate') {
        totalBeforeDiscount = totalRoomCostCorporate + totalAdditionalServicesCost;
    } else if (formData.selectedType === 'Leisure') {
        totalBeforeDiscount = totalRoomCostLeisure + totalAdditionalServicesCost;
    }

    let discountAmount = 0;
    if (formData.discount) {
        discountAmount = (formData.discount / 100) * totalBeforeDiscount;
    } else if (formData.discountAmount) {
        discountAmount = formData.discountAmount;
    }

    const formatDate = (date: Date): string => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj
            .toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
            .toUpperCase();
    };

    const [summaryReady, setSummaryReady] = useState(false);
    const renderCheckRef = useRef(false);
    const [imagesReady, setImagesReady] = useState(false);
    const [supplementImageData, setSupplementImageData] = useState<string | null>(null);

    useEffect(() => {
        const checkInterval = setInterval(() => {
            const room = localStorage.getItem('roomSummary');
            const service = localStorage.getItem('serviceSummary');

            if (room && service && !renderCheckRef.current) {
                renderCheckRef.current = true;
                setSummaryReady(true);
                clearInterval(checkInterval);
            }
        }, 100);

        return () => clearInterval(checkInterval);
    }, []);
    const formatValue = (text: string) => {
        return text?.replace(/\\n/g, '\n')?.replace(/\\t/g, '\t');
    };

    const isNewYearPeriod = (checkInDate: string | Date): boolean => {
        if (!checkInDate) return false;

        const date = new Date(checkInDate);
        const day = date.getDate();
        const month = date.getMonth();

        return (month === 11 && day >= 29) || (month === 0 && day <= 5);
    };
    const [newYearImageData, setNewYearImageData] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndPrepareImages = async () => {
            try {
                const query = '?category=supplements';
                const response = await axios.get(`/api/file-uploads${query}`);
                setFilteredFiles(response.data);

                const supplementServices = formData.selectedAdditionalServices.filter(
                    (service: AdditionalService) => service.name && /Supplement|supplement/i.test(service.name),
                );

                if (supplementServices.length > 0) {
                    const firstService = supplementServices[0];
                    const supplementType = firstService.supplementType || 'Christmas';
                    const matchingFile = response.data.find((file: FileUpload) =>
                        file.category?.toLowerCase().includes(supplementType.toLowerCase()),
                    );

                    if (matchingFile) {
                        const imageResponse = await axios.get(matchingFile.file_path, {
                            responseType: 'arraybuffer',
                        });
                        const base64 = btoa(new Uint8Array(imageResponse.data).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                        setSupplementImageData(`data:image/png;base64,${base64}`);
                    }
                } else if (isNewYearPeriod(formData.checkIn)) {
                    const matchingFile = response.data.find((file: FileUpload) => file.category?.toLowerCase().includes('new year'));

                    if (matchingFile) {
                        const imageResponse = await axios.get(matchingFile.file_path, {
                            responseType: 'arraybuffer',
                        });
                        const base64 = btoa(new Uint8Array(imageResponse.data).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                        setNewYearImageData(`data:image/png;base64,${base64}`);
                    }
                }

                setImagesReady(true);
            } catch (error) {
                console.error('Error loading images:', error);
                setImagesReady(true);
            }
        };

        fetchAndPrepareImages();
    }, [formData.selectedAdditionalServices, formData.checkIn]);

    return (
        <Document title={formData.institutionName || formData.name}>
            <Page size="A4" style={styles.page}>
                <View style={styles.content}>
                    <View style={styles.backgroundContainer}>
                        <Image src="/watermark.png" style={styles.backgroundImage} />
                    </View>
                    <View style={styles.headerContainer}>
                        <View style={styles.headerTextLeft}>
                            <Text>Tafaria Castle</Text>
                            <Text>& Center for the Arts</Text>
                            <Text>0700151480</Text>
                            <Text>info@tafaria.com</Text>
                            {is_invoice_generated && <Text style={{ marginVertical: '5px' }}>PIN# P051324602O</Text>}
                        </View>
                        <Image src="/logo.jpeg" style={styles.imageLogo} />
                        <View style={styles.headerTextRight}>
                            <Text>1910 Park Rise</Text>
                            <Text>Off Asunder Road</Text>
                            <Text>on Deighton Downs Avenue</Text>
                            <Text>Off Nyeri/Nyahururu Road</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />
                    <View>
                        <Text style={styles.header}>{is_invoice_generated ? 'Proforma Invoice' : 'Quotation'}</Text>
                    </View>
                    <View style={[is_invoice_generated ? styles.sectionInvoice : styles.section]}>
                        <View style={[styles.row]}>
                            <View style={styles.column}>
                                <Text style={styles.label}>Ref:</Text>
                                <Text>{formData?.refNo}</Text>
                            </View>
                            {(formData.contact?.institution || formData?.institutionName) && (
                                <View style={styles.column}>
                                    <Text style={styles.label}>Name:</Text>
                                    <Text style={styles.institutionNameText}>
                                        {wrapTextForPDF(formData?.contact?.institution || formData.institutionName)}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.column}>
                                <Text style={styles.label}>Attention:</Text>
                                <Text>
                                    {wrapTextForPDF(
                                        [formData.contact_person?.first_name, formData.contact_person?.last_name].filter(Boolean).join(' ').trim() ||
                                            formData?.name ||
                                            'N/A',
                                    )}
                                </Text>
                            </View>
                            <View style={styles.column}>
                                <Text style={styles.label}>Contacts:</Text>
                                <Text>{formData.contact_person?.phone || formData?.phone || 'N/A'}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.row}>
                            <View style={styles.column}>
                                <Text style={styles.label}>Check-in:</Text>
                                <Text style={styles.smallDateText}>
                                    {formData?.checkIn
                                        ? new Date(formData.checkIn)
                                              .toLocaleDateString('en-US', {
                                                  year: 'numeric',
                                                  month: 'short',
                                                  day: '2-digit',
                                              })
                                              .toUpperCase()
                                        : 'TBC'}
                                </Text>
                            </View>
                            <View style={styles.column}>
                                <Text style={styles.label}>Check-out:</Text>
                                <Text style={styles.smallDateText}>
                                    {formData?.checkOut
                                        ? new Date(formData.checkOut)
                                              .toLocaleDateString('en-US', {
                                                  year: 'numeric',
                                                  month: 'short',
                                                  day: '2-digit',
                                              })
                                              .toUpperCase()
                                        : 'TBC'}
                                </Text>
                            </View>
                            <View style={styles.column}>
                                <Text style={styles.label}> {formData?.no_accommodation ? 'Days' : 'Nights'}:</Text>
                                <Text>
                                    {formData.checkIn && formData.checkIn === formData.checkOut ? 0 : formData.numNights ? formData.numNights : 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.column}>
                                <Text style={styles.label}>Pax:</Text>
                                <Text>{formData?.adults || 'N/A'}</Text>
                            </View>
                            {formData.selectedType === 'Leisure' && (
                                <View style={styles.column}>
                                    <Text style={styles.label}>Kids:</Text>
                                    <Text>{formData?.kids?.length || 'N/A'}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.main}>
                        <View style={styles.pdfContainer}>
                            {formData.selectedType === 'Corporate' && (
                                <PdfRoomTable
                                    items={formData.updatedRoomDetails}
                                    is_invoice_generated={is_invoice_generated}
                                    formData={formData}
                                    onSummaryComputed={({ taxSummary, grandTotals }) => {
                                        localStorage.setItem(
                                            'roomSummary',
                                            JSON.stringify({
                                                taxBreakdown: taxSummary,
                                                totals: grandTotals,
                                            }),
                                        );
                                    }}
                                />
                            )}

                            {formData.selectedType === 'Leisure' && formData.quotationLeisure?.roomDetails?.length > 0 && (
                                <PdfRoomTableLeisure
                                    items={formData.quotationLeisure.roomDetails}
                                    formData={formData}
                                    is_invoice_generated={is_invoice_generated}
                                    onSummaryCalculated={(summary) => {
                                        localStorage.setItem(
                                            'roomSummary',
                                            JSON.stringify({
                                                taxBreakdown: summary?.taxSummary || {},
                                                totals: summary?.grandTotals || {},
                                            }),
                                        );
                                    }}
                                />
                            )}

                            {formData.selectedAdditionalServices.length > 0 && (
                                <PdfServiceTable
                                    is_invoice_generated={is_invoice_generated}
                                    services={formData.selectedAdditionalServices}
                                    onSummaryReady={({ taxSummary, grandTotals }) => {
                                        localStorage.setItem(
                                            'serviceSummary',
                                            JSON.stringify({
                                                taxBreakdown: taxSummary,
                                                totals: grandTotals,
                                            }),
                                        );
                                    }}
                                />
                            )}

                            <View style={{ width: '600px' }}>
                                <CombinedTaxSummaryPdf
                                    notes={formatValue(formData.notes || '')}
                                    isCorporate={formData.selectedType === 'Corporate'}
                                    is_invoice_generated={is_invoice_generated}
                                    roomSummary={JSON.parse(localStorage.getItem('roomSummary') || '{}')}
                                    serviceSummary={JSON.parse(localStorage.getItem('serviceSummary') || '{}')}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.preparedByContainer}>
                        <View style={styles.preparedByTextContainer}>
                            <Text style={styles.preparedByText}>Prepared By:</Text>
                            <Text style={styles.preparedByValue}>{formData?.preparedBy}</Text>
                            {(formData.status === 'approved' || is_invoice_generated) && (
                                <View style={styles.stampContainer}>
                                    <Image src="/stamp.png" style={styles.stampImage} />
                                    <Image src={formData.user?.signature} style={styles.signatureImage} />
                                    <Text style={styles.dateText}>{approved_on ? formatDate(approved_on) : formatDate(updated_at)}</Text>
                                </View>
                            )}
                        </View>

                        {(newYearImageData || supplementImageData) && imagesReady && (
                            <View>
                                <Image
                                    src={newYearImageData || supplementImageData || ''}
                                    style={newYearImageData ? styles.newYearImage : styles.supplementImage}
                                />
                            </View>
                        )}

                        <View style={styles.line} />
                    </View>

                    <Text style={styles.bullextText}>
                        Accepted mode of payment: Tafaria Limited, Absa Bank, Muthaiga Branch A/C no 2025898497, Mpesa Paybill No 973210 account name
                        is {formData.institutionName || formData.name} Booking confirmed upon receipt of 50% deposit, Cancellation Policy: Any
                        cancellation (including reductions) 20 days prior to arrival attracts 50% of the stated quote while cancelations 7days before
                        arrival attract 100% of applicable cost. Valid for 14 days
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

export default Quotation;
