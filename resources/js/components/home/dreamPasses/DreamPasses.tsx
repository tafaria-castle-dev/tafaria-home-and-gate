import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import CreateDreamPass from './CreateDreamPass';
import DreamPassReports from './DreamPassReport';
import ViewDreamPass from './ViewDreamPass';

const DreamPasses = () => {
    const [internalTab, setInternalTab] = useState('view');
    const [edit, setEdit] = useState(false);

    useEffect(() => {
        if (internalTab === 'view') {
            setEdit(false);
        }
    }, [internalTab]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-lg bg-white p-4 shadow-md sm:p-6"
        >
            <h2 className="text-xl font-semibold text-gray-800 sm:text-2xl">DreamPass 🎟️</h2>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">Manage room-based activity vouchers and souvenir discounts</p>

            <div className="mt-4 border-b pb-2">
                <div className="flex gap-2 overflow-x-auto sm:space-x-4">
                    <button
                        onClick={() => {
                            setInternalTab('view');
                            setEdit(false);
                        }}
                        className={`rounded-t-lg px-3 py-2 text-sm font-medium whitespace-nowrap sm:px-4 sm:text-base ${
                            internalTab === 'view' ? 'border-b-2 border-black text-black' : 'text-gray-500'
                        }`}
                    >
                        View DreamPasses
                    </button>
                    <button
                        onClick={() => {
                            setInternalTab(edit ? 'edit' : 'create');
                        }}
                        className={`rounded-t-lg px-3 py-2 text-sm font-medium whitespace-nowrap sm:px-4 sm:text-base ${
                            internalTab === 'create' || internalTab === 'edit' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                        }`}
                    >
                        {edit ? 'Edit DreamPass' : 'Create DreamPass'}
                    </button>
                    <button
                        onClick={() => {
                            setInternalTab('report');
                            setEdit(false);
                        }}
                        className={`rounded-t-lg px-3 py-2 text-sm font-medium whitespace-nowrap sm:px-4 sm:text-base ${
                            internalTab === 'report' ? 'border-b-2 border-black text-black' : 'text-gray-500'
                        }`}
                    >
                        DreamPass Reports
                    </button>
                </div>
            </div>

            <div className="mt-4">
                {internalTab === 'view' ? (
                    <ViewDreamPass setEdit={setEdit} setActiveTab={setInternalTab} activeTab={internalTab} />
                ) : internalTab === 'report' ? (
                    <DreamPassReports />
                ) : (
                    <CreateDreamPass activeTab={internalTab} setActiveTab={setInternalTab} />
                )}
            </div>
        </motion.div>
    );
};

export default DreamPasses;
