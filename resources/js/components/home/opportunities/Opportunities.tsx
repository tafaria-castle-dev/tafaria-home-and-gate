'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import CreateOpportunity from './CreateOpportunity';
import ViewOpportunities from './ViewOpportunities';

const Opportunities = () => {
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
            <h2 className="text-2xl font-semibold text-gray-800">Opportunities 📜</h2>
            <p className="mt-2 text-gray-600">Here you can view analytics, status, and more! Easily create and manage new sales opportunities</p>

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
                    View Opportunities
                </button>
                <button
                    onClick={() => {
                        setInternalTab(edit ? 'edit' : 'create');
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'create' || internalTab === 'edit' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                    }`}
                >
                    {edit ? 'Edit Opportunity' : 'Create Opportunity'}
                </button>
            </div>

            {internalTab === 'view' ? (
                <ViewOpportunities setEdit={setEdit} setActiveTab={setInternalTab} activeTab={internalTab} />
            ) : (
                <CreateOpportunity activeTab={internalTab} setActiveTab={setInternalTab} onSuccessfulSubmit={handleSuccessfulSubmit} />
            )}
        </motion.div>
    );
};

export default Opportunities;
