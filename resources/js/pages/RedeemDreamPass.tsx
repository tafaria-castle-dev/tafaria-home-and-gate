import { useAuth } from '@/hooks/use-auth';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
    <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 right-4 z-100 flex items-center gap-3 rounded-xl px-6 py-4 text-white shadow-2xl ${
            type === 'success' ? 'bg-[#9c7833]' : 'bg-[#902729]'
        }`}
    >
        {type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        <span className="text-xl font-bold">{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-80">
            <X className="h-5 w-5" />
        </button>
    </motion.div>
);

const RedemptionModal = ({
    activity,
    voucherCount,
    setVoucherCount,
    passcode,
    setPasscode,
    showPasscode,
    setShowPasscode,
    redeeming,
    onRedeem,
    onClose,
    isDayVisit,
}: {
    activity: any;
    voucherCount: number;
    setVoucherCount: (n: number) => void;
    passcode: string;
    setPasscode: (s: string) => void;
    showPasscode: boolean;
    setShowPasscode: (b: boolean) => void;
    redeeming: boolean;
    onRedeem: () => void;
    onClose: () => void;
    isDayVisit: boolean;
}) => {
    const remaining = activity
        ? Math.max(
              0,
              (activity.voucher_count || 0) -
                  (activity.redemptions?.filter((r: any) => r.redeemed_at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length || 0),
          )
        : 0;
    const prevPasscodeLength = useRef(passcode.length);

    useEffect(() => {
        if (prevPasscodeLength.current < 4 && passcode.length === 4 && !redeeming) {
            onRedeem();
        }
        prevPasscodeLength.current = passcode.length;
    }, [passcode, redeeming, onRedeem]);
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between bg-[#902729] px-6 py-4">
                    <h3 className="text-xl font-bold text-white">Redeem: {activity?.activity_name}</h3>
                    <button onClick={onClose} className="rounded-full p-2 text-white hover:bg-[#902729]/30">
                        <X className="h-10 w-10" />
                    </button>
                </div>

                <div className="space-y-6 p-6">
                    <div>
                        <label className="mb-4 block text-sm font-semibold text-black">Number of DreamPasses</label>
                        <div className="grid grid-cols-6 gap-3">
                            {Array.from({ length: remaining }, (_, i) => i + 1).map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setVoucherCount(num)}
                                    className={`rounded-xl border-2 py-4 text-xl font-bold transition-all ${
                                        voucherCount === num
                                            ? 'scale-105 border-[#9c7833] bg-[#902729] text-white shadow-lg'
                                            : 'border-gray-300 bg-white text-black hover:border-[#9c7833] hover:bg-[#9c7833]/10'
                                    }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-black">Your Passcode</label>
                        <div className="relative">
                            <input
                                type={showPasscode ? 'text' : 'password'}
                                value={passcode}
                                onChange={(e) => setPasscode(e.target.value)}
                                placeholder="Enter your passcode"
                                className="w-full rounded-xl border-2 border-gray-300 px-4 py-4 pr-12 text-lg focus:border-[#9c7833] focus:ring-4 focus:ring-[#9c7833]/20 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasscode(!showPasscode)}
                                className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showPasscode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    {redeeming && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-[#902729]">
                            <Loader2 className="animate-spin" size={20} />
                            <span>Redeeming...</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

const AttendantVoucherRedemption = () => {
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        if (!isAuthenticated || !user) {
            const currentUrl = window.location.pathname + window.location.search;
            sessionStorage.setItem('intendedDestination', currentUrl);
            router.visit('/');
            return;
        }
    }, []);
    const [roomNumber, setRoomNumber] = useState('');
    const [dreamPass, setDreamPass] = useState<any>(null);
    const [searching, setSearching] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
    const [voucherCount, setVoucherCount] = useState(1);
    const [passcode, setPasscode] = useState('');
    const [showPasscode, setShowPasscode] = useState(false);
    const [redeeming, setRedeeming] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
    const roomInputRef = useRef<HTMLInputElement>(null);
    const [isDayVisit, setIsDayVisit] = useState(false);
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const handleSearch = async () => {
        if (!roomNumber.trim()) {
            showToast('Please enter a room/pass number', 'error');
            return;
        }

        setSearching(true);
        setSelectedActivity(null);
        setPasscode('');
        setVoucherCount(1);

        try {
            const response = await fetch(`/api/dream-passes?room_number=${encodeURIComponent(roomNumber.trim())}`);

            if (!response.ok) throw new Error('Failed to fetch dream passes');

            const data = await response.json();
            const passes = data.data || [];

            if (passes.length === 0) {
                showToast('No DreamPass found for your search', 'error');
                setDreamPass(null);
                return;
            }
            const approvedPass = passes.find((p: any) => p.status === 'approved');
            if (!approvedPass) {
                showToast('No approved DreamPass found for your search!', 'error');
                setDreamPass(null);
                return;
            }
            setDreamPass(approvedPass);
            showToast('DreamPass loaded!', 'success');
            setTimeout(() => {
                roomInputRef.current?.blur();
            }, 300);
        } catch (error) {
            showToast('Failed to fetch DreamPass', 'error');
            setDreamPass(null);
        } finally {
            setSearching(false);
        }
    };

    const getRedemptionsToday = (activity: any) => {
        const today = new Date().toISOString().slice(0, 10);
        return activity.redemptions?.filter((r: any) => r.redeemed_at.slice(0, 10) === today).length || 0;
    };

    const getRemainingVouchers = (activity: any) => {
        const redeemedToday = getRedemptionsToday(activity);
        const voucherCount = activity.voucher_count || 0;
        return Math.max(0, voucherCount - redeemedToday);
    };

    useEffect(() => {
        if (searchTimer) clearTimeout(searchTimer);

        if (roomNumber.trim()) {
            const timer = setTimeout(handleSearch, 500);
            setSearchTimer(timer);
        } else {
            setDreamPass(null);
            setSelectedActivity(null);
        }

        return () => {
            if (searchTimer) clearTimeout(searchTimer);
        };
    }, [roomNumber]);

    const handleActivitySelect = (activityId: string) => {
        setSelectedActivity(activityId);
        setVoucherCount(1);
        setPasscode('');
        setShowPasscode(false);
    };

    const handleCloseModal = () => {
        setSelectedActivity(null);
        setVoucherCount(1);
        setPasscode('');
    };

    const handleRedeem = async () => {
        if (!passcode.trim()) {
            showToast('Please enter staff passcode', 'error');
            return;
        }

        const activity = dreamPass.activities.find((a: any) => a.id === selectedActivity);
        if (!activity) return;

        const remaining = getRemainingVouchers(activity);
        if (voucherCount < 1 || voucherCount > remaining) {
            showToast(`Please enter a valid number (1-${remaining})`, 'error');
            return;
        }

        setRedeeming(true);

        try {
            const today = new Date().toISOString().slice(0, 10);
            await axios.post('/api/dream-passes/redeem-activity', {
                room_number: dreamPass.room_number,
                activity_name: activity.activity_name,
                redemption_date: today,
                staff_passcode: passcode,
                count: voucherCount,
            });

            showToast(`Successfully redeemed ${voucherCount} dreamPass(es)!`, 'success');

            const detailResponse = await fetch(`/api/dream-passes/${dreamPass.id}`);
            if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                setDreamPass(detailData);
            }

            handleCloseModal();
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || 'Redemption failed';
            showToast(message, 'error');
        } finally {
            setRedeeming(false);
        }
    };

    const selectedActivityData = dreamPass?.activities.find((a: any) => a.id === selectedActivity);

    return (
        <div className="min-h-screen bg-white px-12 py-15">
            <AnimatePresence>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                {selectedActivityData && (
                    <RedemptionModal
                        activity={selectedActivityData}
                        voucherCount={voucherCount}
                        setVoucherCount={setVoucherCount}
                        passcode={passcode}
                        setPasscode={setPasscode}
                        showPasscode={showPasscode}
                        setShowPasscode={setShowPasscode}
                        redeeming={redeeming}
                        onRedeem={handleRedeem}
                        onClose={handleCloseModal}
                        isDayVisit={isDayVisit}
                    />
                )}
            </AnimatePresence>

            <div className="mx-auto max-w-6xl">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
                    <div className="min-h-40 bg-contain bg-center bg-no-repeat md:min-h-40" style={{ backgroundImage: "url('/logo.png')" }}></div>
                    <h1 className="my-2 text-5xl font-bold text-black">DreamPass</h1>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="dayVisit"
                            checked={isDayVisit}
                            onChange={(e) => setIsDayVisit(e.target.checked)}
                            className="h-7 w-7 rounded border-gray-300 text-[#902729] focus:ring-[#9c7833]"
                        />
                        <label htmlFor="dayVisit" className="cursor-pointer text-2xl font-semibold text-black">
                            Day Visit
                        </label>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-xl"
                >
                    <div className="flex items-center justify-between bg-[#902729] px-6 py-4">
                        <h2 className="text-lg font-semibold text-white">Enter{isDayVisit ? ' DreamPass Code' : ' Room number'} </h2>{' '}
                    </div>

                    <div className="p-6">
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <div className="relative flex-1">
                                {' '}
                                <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    ref={roomInputRef}
                                    value={roomNumber}
                                    onChange={(e) => setRoomNumber(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder={`${isDayVisit ? 'Enter DreamPass code...' : 'Enter room number...'}`}
                                    className="w-full rounded-xl border-2 border-gray-300 py-4 pr-4 pl-12 text-lg transition focus:border-[#9c7833] focus:ring-4 focus:ring-[#9c7833]/20 focus:outline-none"
                                />
                                {roomNumber && (
                                    <button
                                        onClick={() => {
                                            setRoomNumber('');
                                            setDreamPass(null);
                                            setSelectedActivity(null);
                                        }}
                                        className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                                    >
                                        <X className="h-9 w-9" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {dreamPass && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-8"
                        >
                            <div className="overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-xl">
                                <div className="bg-[#902729] px-6 py-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <h2 className="text-lg font-semibold text-white">Room {dreamPass.room_number}</h2>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="mb-4 text-xl font-bold text-black">Available DreamPasses</h3>
                                    <p className="mb-6 text-lg text-gray-700">Click on a DreamPass activity to redeem</p>

                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {dreamPass.activities.map((activity: any) => {
                                            const remaining = getRemainingVouchers(activity);
                                            const isFullyRedeemed = remaining === 0;
                                            const isSelected = selectedActivity === activity.id;

                                            return (
                                                <motion.button
                                                    key={activity.id}
                                                    onClick={() => !isFullyRedeemed && handleActivitySelect(activity.id)}
                                                    disabled={isFullyRedeemed}
                                                    whileHover={!isFullyRedeemed ? { scale: 1.02 } : {}}
                                                    whileTap={!isFullyRedeemed ? { scale: 0.98 } : {}}
                                                    className={`relative overflow-hidden rounded-2xl border-4 p-6 text-left transition-all ${
                                                        isFullyRedeemed
                                                            ? 'cursor-not-allowed border-gray-300 bg-gray-100 opacity-60'
                                                            : isSelected
                                                              ? 'border-[#9c7833] bg-[#9c7833]/5 shadow-lg'
                                                              : 'border-gray-200 bg-white hover:border-[#902729] hover:shadow-md'
                                                    }`}
                                                >
                                                    {isFullyRedeemed && (
                                                        <div className="absolute right-3 bottom-3 rounded-full bg-[#902729] px-3 py-1 text-xs font-bold text-white">
                                                            Redeemed
                                                        </div>
                                                    )}

                                                    <h4 className="mb-4 pr-12 text-lg font-bold text-black">{activity.activity_name}</h4>
                                                    <p className={`text-2xl font-bold ${remaining > 0 ? 'text-[#902729]' : 'text-gray-600'}`}>
                                                        {remaining}
                                                    </p>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!dreamPass && !searching && roomNumber && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-2xl border-2 border-gray-200 bg-white p-12 text-center shadow-lg"
                    >
                        <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-full bg-gray-100 p-6">
                            <Search className="h-12 w-12 text-gray-400" />
                        </div>
                        <p className="text-lg text-gray-600">No approved DreamPass found for this room</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default AttendantVoucherRedemption;
