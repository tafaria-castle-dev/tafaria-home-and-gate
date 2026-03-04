import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import SendBulkEmail from './SendBulkEmail';
import ViewBulkEmails from './ViewBulkEmails';

const BulkEmails = () => {
    const [internalTab, setInternalTab] = useState('view');
    const [edit, setEdit] = useState(false);

    useEffect(() => {
        if (internalTab === 'view') {
            setEdit(false);
        }
    }, [internalTab]);

    const handleSuccessfulSubmit = () => {
        setInternalTab('view');
        setEdit(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg bg-white p-6 shadow-md"
        >
            <h2 className="text-2xl font-semibold text-gray-800">Bulk Emails 📧</h2>
            <p className="mt-2 text-gray-600">Here you can view and send out bulk emails</p>

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
                    View Bulk Emails
                </button>
                <button
                    onClick={() => {
                        setInternalTab(edit ? 'edit' : 'create');
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'create' || internalTab === 'edit' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                    }`}
                >
                    Send Bulk Email
                </button>
            </div>

            {internalTab === 'view' ? (
                <ViewBulkEmails setActiveTab={setInternalTab} activeTab={internalTab} />
            ) : (
                <SendBulkEmail activeTab={internalTab} setActiveTab={setInternalTab} onSuccessfulSubmit={handleSuccessfulSubmit} />
            )}
        </motion.div>
    );
};

export default BulkEmails;
