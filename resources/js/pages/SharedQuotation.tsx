'use client';
import Quotation from '@/components/home/quotation/Quotation';
import { usePage } from '@inertiajs/react';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ name?: string }>;
}

interface QuotationDetails {
    refNo?: string;
    phone?: string;
    adults?: string;
    kids?: string;
    institutionName?: string;
    name?: string;
    selectedType?: string;
    discount?: string;
    [key: string]: string | undefined;
}

interface QuotationData {
    quotation_details: QuotationDetails;
    is_invoice_generated: boolean;
    updated_at: Date;
    approved_on?: Date;
    status: string;
}

interface FilesViewProps {
    id: string;
    name?: string;
    [key: string]: any;
}

const SharedQuotationPage = () => {
    const { props } = usePage<FilesViewProps>();
    const { id, name } = props;
    const [isOpen, setIsOpen] = useState(true);
    const [quotationData, setQuotationData] = useState<any>();
    const [isFetching, setIsFetching] = useState(false);

    const fetchQuotation = async () => {
        setIsFetching(true);
        try {
            const response = await axios.get(`/api/quotations/${id}`);
            console.log(response.data);
            setQuotationData(response.data);
        } catch (error) {
            toast.error('An error occured!');
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchQuotation();
    }, []);

    const handleDownloadPDF = async (data: QuotationDetails, isInvoiceGenerated: boolean, updatedAt: Date, approvedOn?: Date) => {
        try {
            const doc = (
                <Quotation
                    formData={{ ...data, status: quotationData?.status }}
                    is_invoice_generated={isInvoiceGenerated}
                    updated_at={updatedAt}
                    approved_on={approvedOn}
                />
            );
            const asPdf = pdf(doc);
            const blob = await asPdf.toBlob();

            const fileName = data.institutionName || data.name || 'Quotation';
            saveAs(blob, `${fileName}.pdf`);

            toast.success(`${isInvoiceGenerated ? 'Invoice' : 'Quotation'} downloaded successfully!`);
        } catch (error) {
            console.error('Error generating PDF for download', error);
            toast.error('Failed to download PDF');
        }
    };

    const closeModal = () => {
        setIsOpen(false);
        window.history.back();
    };

    const isQuotationDataValid = (data: any): data is QuotationData => {
        return (
            data &&
            typeof data === 'object' &&
            'quotation_details' in data &&
            'is_invoice_generated' in data &&
            'updated_at' in data &&
            'status' in data
        );
    };

    if (isFetching) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="flex min-h-[300px] items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                </div>
            </div>
        );
    }

    if (!isOpen) {
        return null;
    }

    if (!quotationData || !isQuotationDataValid(quotationData)) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="flex min-h-[300px] items-center justify-center">
                    <div className="text-center">
                        <p className="text-gray-600">No quotation data available</p>
                        <button onClick={() => window.history.back()} className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="flex max-h-screen w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            {quotationData.is_invoice_generated ? 'Invoice' : 'Quotation'} -{' '}
                            {name || quotationData.quotation_details.refNo || 'Quotation'}
                        </h2>
                        <div className="flex space-x-2">
                            <button
                                onClick={() =>
                                    handleDownloadPDF(
                                        quotationData.quotation_details,
                                        quotationData.is_invoice_generated,
                                        quotationData.updated_at,
                                        quotationData.approved_on,
                                    )
                                }
                                className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-900"
                                title="Download Quotation"
                            >
                                <Download className="h-6 w-6" />
                            </button>
                            <button
                                onClick={closeModal}
                                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Close modal"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-auto">
                        <PDFViewer width="100%" height="100%" className="h-[80vh]">
                            <Quotation
                                formData={{
                                    ...(quotationData.quotation_details || {}),
                                    status: quotationData.status,
                                }}
                                is_invoice_generated={quotationData.is_invoice_generated}
                                updated_at={quotationData.updated_at}
                                approved_on={quotationData.approved_on}
                            />
                        </PDFViewer>
                    </div>
                    <div className="flex justify-end border-t px-6 py-3">
                        <button onClick={closeModal} className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SharedQuotationPage;
