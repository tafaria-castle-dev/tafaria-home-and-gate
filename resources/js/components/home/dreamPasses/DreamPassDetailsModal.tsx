import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, X, XCircle } from 'lucide-react';

export interface DreamPassRedemption {
    id: string;
    redeemed_at: string;
    redeemed_by?: string;
}

export interface DreamPassActivity {
    id: string;
    activity_name: string;
    voucher_count: number;
    valid_from: string;
    valid_to: string;
    redemptions?: DreamPassRedemption[];
}

export interface DreamPassSouvenirDiscount {
    discount_percentage: number;
    valid_from: string;
    valid_to: string;
    applicable_items?: string[];
}

export type DreamPassStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface DreamPass {
    id: string;
    room_number: string;
    guest_name?: string;
    check_in_date: string;
    check_out_date: string;
    day_visit: boolean;
    status: DreamPassStatus;
    activities: DreamPassActivity[];
    souvenir_discount?: DreamPassSouvenirDiscount | null;
    created_at: string;
    updated_at?: string;
}

interface DreamPassDetailsModalProps {
    dreamPass: DreamPass;
    onClose: () => void;
}

function getStatusIcon(status: DreamPassStatus) {
    switch (status) {
        case 'approved':
            return <CheckCircle2 className="h-6 w-6 text-green-500" />;
        case 'rejected':
            return <XCircle className="h-6 w-6 text-red-500" />;
        case 'pending':
            return <Clock className="h-6 w-6 text-yellow-500" />;
        case 'draft':
        default:
            return <Clock className="h-6 w-6 text-gray-400" />;
    }
}

export default function DreamPassDetailsModal({ dreamPass, onClose }: DreamPassDetailsModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="shadow-3xl max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white"
            >
                <div className="flex max-h-[95vh] flex-col">
                    <div className="border-b border-gray-200 bg-gradient-to-r from-[#902729] to-[#7e1a1c] px-6 py-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold">DreamPass Details</h2>
                                <p className="mt-1 text-indigo-100">
                                    {dreamPass.day_visit ? 'Pass' : 'Room'} {dreamPass.room_number}
                                </p>
                            </div>
                            <button onClick={onClose} className="rounded-full p-3 transition hover:bg-white/20">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="rounded-2xl bg-gray-50 p-5">
                                <p className="text-sm font-medium text-gray-600">{dreamPass.day_visit ? 'Pass' : 'Room'} Number</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">{dreamPass.room_number}</p>
                                {dreamPass.guest_name && (
                                    <p className="mt-5 text-xl font-semibold text-gray-600">Guest Name: {dreamPass.guest_name}</p>
                                )}
                            </div>

                            <div className="rounded-2xl bg-gray-50 p-5">
                                <p className="text-sm font-medium text-gray-600">Approval Status</p>
                                <div className="mt-3 flex items-center gap-3">
                                    {getStatusIcon(dreamPass.status)}
                                    <span className="text-2xl font-bold text-gray-900 capitalize">{dreamPass.status}</span>
                                </div>
                            </div>
                        </div>

                        {!dreamPass.day_visit && (
                            <div className="mb-8 rounded-2xl bg-gray-50 p-5">
                                <p className="text-sm font-medium text-gray-600">Stay Period</p>
                                <p className="mt-2 text-lg font-semibold text-gray-900">
                                    {format(new Date(dreamPass.check_in_date), 'dd MMMM yyyy')}
                                    <span className="mx-2 text-gray-500">→</span>
                                    {format(new Date(dreamPass.check_out_date), 'dd MMMM yyyy')}
                                </p>
                            </div>
                        )}

                        <section className="mb-10">
                            <h3 className="mb-5 text-xl font-bold text-gray-800">Activities</h3>
                            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                                {dreamPass.activities.map((act) => {
                                    const todayStr = new Date().toISOString().slice(0, 10);
                                    const redeemedToday = act.redemptions?.filter((r) => r.redeemed_at.slice(0, 10) === todayStr).length ?? 0;
                                    const remaining = (act.voucher_count || 1) - redeemedToday;
                                    const isFullyRedeemedToday = remaining === 0 && (act.voucher_count || 1) > 0;

                                    return (
                                        <motion.div
                                            key={act.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`relative overflow-hidden rounded-2xl border-4 p-6 shadow-md transition-all ${
                                                isFullyRedeemedToday ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'
                                            }`}
                                        >
                                            {isFullyRedeemedToday && (
                                                <div className="absolute top-2 right-2 rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white shadow-md sm:top-4 sm:right-4 sm:px-4 sm:py-2 sm:text-sm">
                                                    <CheckCircle2 className="inline h-4 w-4 sm:h-5 sm:w-5" /> Fully Redeemed
                                                </div>
                                            )}

                                            <h4 className="mb-4 text-xl font-bold text-gray-900">{act.activity_name}</h4>

                                            <div className="mb-5 grid grid-cols-3 gap-3">
                                                <div className="rounded-xl bg-gray-100 p-3 text-center">
                                                    <p className="text-xs text-gray-600">Total</p>
                                                    <p className="text-2xl font-extrabold text-gray-900">{act.voucher_count || 1}</p>
                                                </div>
                                                <div className="rounded-xl bg-red-50 p-3 text-center">
                                                    <p className="text-xs text-red-700">Redeemed</p>
                                                    <p className="text-2xl font-extrabold text-red-800">{redeemedToday}</p>
                                                </div>
                                                <div className="rounded-xl bg-green-50 p-3 text-center">
                                                    <p className="text-xs text-green-700">Remaining</p>
                                                    <p className="text-2xl font-extrabold text-green-800">{remaining}</p>
                                                </div>
                                            </div>

                                            <div className="text-sm">
                                                <p className="text-gray-600">
                                                    Valid:{' '}
                                                    {!dreamPass.day_visit && (
                                                        <>
                                                            <span className="font-semibold">{format(new Date(act.valid_from), 'dd MMM yyyy')}</span>
                                                            {' → '}
                                                        </>
                                                    )}
                                                    <span className="font-semibold">{format(new Date(act.valid_to), 'dd MMM yyyy')}</span>
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </section>

                        {dreamPass.souvenir_discount && (
                            <section>
                                <h3 className="mb-5 text-xl font-bold text-gray-800">Souvenir Discount</h3>
                                <div className="rounded-2xl bg-gradient-to-br from-[#902729] to-[#7e1a1c] p-6">
                                    <div className="grid grid-cols-1 gap-6 text-start md:grid-cols-3">
                                        <div>
                                            <p className="text-sm font-medium text-indigo-700">Discount</p>
                                            <p className="mt-2 text-4xl font-extrabold text-indigo-800">
                                                {dreamPass.souvenir_discount.discount_percentage}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-indigo-700">Valid Period</p>
                                            <p className="mt-2 text-lg font-semibold text-gray-800">
                                                {format(new Date(dreamPass.souvenir_discount.valid_from), 'dd MMM yyyy')} →{' '}
                                                {format(new Date(dreamPass.souvenir_discount.valid_to), 'dd MMM yyyy')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-indigo-700">Applicable On</p>
                                            <p className="mt-2 text-base font-semibold text-gray-800">
                                                {dreamPass.souvenir_discount.applicable_items?.length
                                                    ? dreamPass.souvenir_discount.applicable_items.join(', ')
                                                    : 'All Souvenir Items'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
