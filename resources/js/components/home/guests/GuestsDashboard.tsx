/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { useState } from 'react';

import GuestsDashboardComponent from './GuestsDashboardComponent';
import ViewGuests from './ViewGuests';

const GuestsDashboard = () => {
    const [internalTab, setInternalTab] = useState('dashboard');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }} // Faster transition
            className="rounded-lg bg-white p-6 shadow-md"
        >
            <h2 className="text-2xl font-semibold text-gray-800">Guests 📜</h2>
            <p className="mt-2 text-gray-600">Welcome back. Here's what's happening at Tafaria Castle today.</p>

            <div className="mt-4 flex space-x-4 border-b pb-2">
                <button
                    onClick={() => {
                        setInternalTab('dashboard');
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'dashboard' ? 'border-b-2 border-black text-black' : 'text-gray-500'
                    }`}
                >
                    Guests Dashboard
                </button>
                <button
                    onClick={() => {
                        setInternalTab('view');
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'view' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                    }`}
                >
                    View Guests
                </button>
            </div>

            {internalTab === 'dashboard' ? <GuestsDashboardComponent /> : <ViewGuests />}
        </motion.div>
    );
};

export default GuestsDashboard;
