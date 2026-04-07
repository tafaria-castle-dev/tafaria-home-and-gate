/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import CreateGuestReservation from './CreateReservation';
import ViewReservations from './ViewReservations';

const GuestReservations = () => {
    const [internalTab, setInternalTab] = useState('view');
    const [reservationId, setReservationId] = useState<string | null>(null);

    useEffect(() => {
        if (internalTab === 'view') {
            setReservationId(null);
        }
    }, [internalTab]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }} // Faster transition
            className="rounded-lg bg-white p-6 shadow-md"
        >
            <h2 className="text-2xl font-semibold text-gray-800">Reservations 📜</h2>
            <p className="mt-2 text-gray-600">Here you can view, create, and manage guest reservations!</p>

            <div className="mt-4 flex space-x-4 border-b pb-2">
                <button
                    onClick={() => {
                        setInternalTab('view');
                        setReservationId(null);
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'view' ? 'border-b-2 border-black text-black' : 'text-gray-500'
                    }`}
                >
                    View Reservations
                </button>
                <button
                    onClick={() => {
                        if (internalTab === 'edit') {
                            // Do nothing if already in edit mode
                        } else {
                            setInternalTab('create');
                        }
                    }}
                    className={`rounded-t-lg px-4 py-2 font-medium ${
                        internalTab === 'create' || internalTab === 'edit' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'
                    }`}
                >
                    {reservationId ? 'Edit Reservation' : 'Create Reservation'}
                </button>
            </div>

            {internalTab === 'view' ? (
                <ViewReservations activeTab={internalTab} setActiveTab={setInternalTab} setReservationId={setReservationId} />
            ) : (
                <CreateGuestReservation
                    reservationId={reservationId}
                    activeTab={internalTab}
                    setActiveTab={setInternalTab}
                    onSuccessfulSubmit={() => {}}
                    onCancel={() => {}}
                />
            )}
        </motion.div>
    );
};

export default GuestReservations;
