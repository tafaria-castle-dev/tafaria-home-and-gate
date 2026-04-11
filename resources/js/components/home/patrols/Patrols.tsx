/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { useState } from 'react';

import CheckPoints from './Checkpoints';
import PatrolIncidents from './PatrolIncidents';
import PatrolVisualization from './PatrolsVisualization';

const Patrols = () => {
    const [internalTab, setInternalTab] = useState('view');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }} // Faster transition
            className="rounded-lg bg-white p-6 shadow-md"
        >
            <h2 className="text-2xl font-semibold text-gray-800">Patrols 📜</h2>
            <p className="mt-2 text-gray-600">Welcome back. View and manage patrols</p>

            <div className="mt-4 flex space-x-4 border-b pb-2">
                <button
                    onClick={() => {
                        setInternalTab('view');
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'view' ? 'border-b-2 border-black text-black' : 'text-gray-500'
                    }`}
                >
                    View Patrols
                </button>
                <button
                    onClick={() => {
                        setInternalTab('checkpoints');
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'checkpoints' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                    }`}
                >
                    CheckPoints
                </button>
                <button
                    onClick={() => {
                        setInternalTab('incidents');
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'incidents' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                    }`}
                >
                    Patrol Incidents
                </button>
            </div>

            {internalTab === 'view' ? <PatrolVisualization /> : internalTab === 'checkpoints' ? <CheckPoints /> : <PatrolIncidents />}
        </motion.div>
    );
};

export default Patrols;
