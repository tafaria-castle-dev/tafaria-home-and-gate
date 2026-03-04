/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import CreateQuotation from './quotation/CreateQuotation';
import ViewQuotations from './quotation/ViewQuotation';

const Quotations = () => {
    const [internalTab, setInternalTab] = useState('view');
    const [edit, setEdit] = useState(false);

    const [formData, setFormData] = useState<{
        signature: string;
        name: string | any;
        phone: string;
        email: string;
        selectedType: string;
        useNights: boolean;
        no_accommodation: boolean;
        checkIn: string;
        checkOut: string;
        numNights: number;
        kids: { id: number; age: number }[];
        adults: number;
        packageId: string;
        currency: string;
        numPeople: number;
        shared: boolean;
        notes: string;
        roomDetails: { [key: string]: { people: number; cost: number } };
        selectedAdditionalServices: any;
        discount: number;
        institutionName: string;
        preparedBy: string;
        user: {
            id: string;
            name: string;
            signature: string;
        };
        contact?: {
            id: string;
            institution: string;
        };
        contact_person?: {
            id: string;
            first_name?: string;
            last_name?: string;
            phone?: string;
            email?: string;
        };
        contact_person_id?: string;
        contact_id?: string;
        updatedRoomDetails: {
            cost: number;
            type: string;
            rooms: number;
            pax: number;
        }[];
        quotationLeisure: any;
        refNo: string;
    }>({
        signature: '',
        name: '',
        phone: '',
        email: '',
        selectedType: 'Corporate',
        useNights: false,
        no_accommodation: false,
        checkIn: '',
        checkOut: '',
        numNights: 0,
        kids: [],
        adults: 0,
        packageId: '',
        currency: '',
        numPeople: 0,
        shared: false,
        notes: '',
        roomDetails: {},
        selectedAdditionalServices: [],
        discount: 0,
        institutionName: '',
        preparedBy: '',
        updatedRoomDetails: [],
        quotationLeisure: {},
        refNo: '',
        user: {
            id: '',
            signature: '',
            name: '',
        },
        contact: { id: '', institution: '' },
        contact_person: { id: '', first_name: '', last_name: '', phone: '', email: '' },
        contact_person_id: '',
        contact_id: '',
    });

    useEffect(() => {
        if (internalTab === 'view') {
            setEdit(false);
        }
    }, [internalTab]);

    // Faster transition handler
    const handleSuccessfulSubmit = () => {
        setInternalTab('view');
        setEdit(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }} // Faster transition
            className="rounded-lg bg-white p-6 shadow-md"
        >
            <h2 className="text-2xl font-semibold text-gray-800">Quotations 📜</h2>
            <p className="mt-2 text-gray-600">Here you can view analytics, stats, and more!</p>

            {/* Tabs for Quotations */}
            <div className="mt-4 flex space-x-4 border-b pb-2">
                <button
                    onClick={() => {
                        setInternalTab('view');
                        setEdit(false);
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'view' ? 'border-b-2 border-black text-black' : 'text-gray-500'
                    }`}
                >
                    View Quotations
                </button>
                <button
                    onClick={() => {
                        if (internalTab === 'edit') {
                            // Do nothing if already in edit mode
                        } else {
                            setInternalTab('create');
                            setFormData({
                                signature: '',
                                name: '',
                                phone: '',
                                email: '',
                                selectedType: 'Corporate',
                                useNights: false,
                                no_accommodation: false,
                                checkIn: '',
                                checkOut: '',
                                numNights: 0,
                                kids: [],
                                adults: 0,
                                packageId: '',
                                currency: '',
                                numPeople: 0,
                                shared: false,
                                notes: '',
                                roomDetails: {},
                                selectedAdditionalServices: [],
                                discount: 0,
                                institutionName: '',
                                preparedBy: '',
                                updatedRoomDetails: [],
                                quotationLeisure: {},
                                refNo: '',
                                user: {
                                    id: '',
                                    signature: '',
                                    name: '',
                                },
                            });
                            localStorage.removeItem('quotationForm');
                        }
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'create' || internalTab === 'edit' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                    }`}
                >
                    {edit ? 'Edit Quotation' : 'Create Quotation'}
                </button>
            </div>

            {internalTab === 'view' ? (
                <ViewQuotations activeTab={internalTab} setActiveTab={setInternalTab} setEdit={setEdit} setFormData={setFormData} />
            ) : (
                <CreateQuotation activeTab={internalTab} setActiveTab={setInternalTab} setFormData={setFormData} formData={formData} />
            )}
        </motion.div>
    );
};

export default Quotations;
