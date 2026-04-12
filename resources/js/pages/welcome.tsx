import { useAuth } from '@/hooks/use-auth';
import { Head } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Signin from '../components/Signin';
import Signup from '../components/Signup';

interface AuthUser {
    user: {
        id: number;
        name: string;
        email: string;
    };
}

interface WelcomeProps {
    auth: AuthUser | null;
}

export default function Welcome({ auth }: WelcomeProps) {
    const [isSignUp, setIsSignUp] = useState<boolean>(false);
    const { isAuthenticated } = useAuth();
    useEffect(() => {
        if (isAuthenticated) {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectTo = urlParams.get('redirect') || sessionStorage.getItem('intendedDestination');

            sessionStorage.removeItem('intendedDestination');

            window.location.href = redirectTo || '/home';
        }
    }, [isAuthenticated]);

    return (
        <>
            <main className="flex flex-col justify-center bg-cover bg-center" style={{ backgroundImage: "url('/tafaria.jpg')" }}>
                <div className="absolute bg-cover bg-center"></div>
                <div className="flex flex-col items-center justify-center gap-12 px-4 pb-16 text-white">
                    <>
                        <Head title="Welcome to Wheel of Fortune" />
                        <Toaster position="top-right" />
                        <div className="relative flex min-h-screen items-center justify-center p-4 md:p-10">
                            <div className="relative w-full max-w-md overflow-hidden rounded-xl bg-white shadow-lg md:max-w-2xl">
                                <div className="relative z-10 flex flex-col justify-center p-6 text-[#FFD700] md:p-10">
                                    <div
                                        className="min-h-24 bg-contain bg-center bg-no-repeat md:min-h-32"
                                        style={{ backgroundImage: "url('/logo.png')" }}
                                    ></div>
                                    <motion.h1
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 1 }}
                                        className="text-center text-2xl font-bold text-gray-900 md:text-4xl"
                                    >
                                        Welcome to Wheel of Fortune
                                    </motion.h1>
                                    <p className="mt-3 text-center text-sm text-gray-400 opacity-80 md:mt-4 md:text-lg">
                                        Experience the elegance of our luxury hotel with seamless booking and management solutions.
                                    </p>
                                    <div className="mt-6 rounded-lg bg-white p-4 shadow-md md:mt-10 md:p-6">
                                        <div className="mb-4 flex justify-center md:mb-6">
                                            <button
                                                className={`px-3 py-1 text-sm font-semibold md:px-4 md:py-2 md:text-base ${
                                                    !isSignUp ? 'border-b-2 border-black text-black' : 'text-gray-500'
                                                }`}
                                                onClick={() => setIsSignUp(false)}
                                            >
                                                Sign In
                                            </button>
                                            {/* <button
                                                className={`px-3 py-1 text-sm font-semibold md:px-4 md:py-2 md:text-base ${
                                                    isSignUp ? 'border-b-2 border-black text-black' : 'text-gray-500'
                                                }`}
                                                onClick={() => setIsSignUp(true)}
                                            >
                                                Sign Up
                                            </button> */}
                                        </div>
                                        {isSignUp ? (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                                                <Signup />
                                            </motion.div>
                                        ) : (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                                                <Signin />
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                </div>
            </main>
        </>
    );
}
