import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';

interface FormErrors {
    email?: string;
    password?: string;
    password_confirmation?: string;
    token?: string;
}

interface PageProps {
    token: string;
    email: string;
    [key: string]: any;
}

export default function ResetPassword() {
    const { props } = usePage<PageProps>();
    console.log('Props', props);
    const { token, email } = props;

    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState<boolean>(false);
    const [passwordError, setPasswordError] = useState<string>('');
    const { data, setData, post, processing, errors } = useForm<{
        token: string;
        email: string;
        password: string;
        password_confirmation: string;
    }>({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const validatePassword = (password: string): boolean => {
        const minLength = 8;
        const hasNumber = /\d/.test(password);
        const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            setPasswordError('Password must be at least 8 characters long');
            return false;
        }
        if (!hasNumber) {
            setPasswordError('Password must contain at least one number');
            return false;
        }
        if (!hasSymbol) {
            setPasswordError('Password must contain at least one symbol');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const togglePasswordConfirmVisibility = () => {
        setShowPasswordConfirm(!showPasswordConfirm);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!validatePassword(data.password)) {
            return;
        }

        if (data.password !== data.password_confirmation) {
            setPasswordError('Passwords do not match');
            return;
        }

        post('/api/auth/reset-password', {
            onSuccess: () => {
                setPasswordError('');
                toast.success('Password reset successfully! Redirecting to login...');
            },
            onError: (error) => {
                setPasswordError('Something went wrong. Please try again.');
            },
        });
    };

    return (
        <>
            <Head title="Reset Password" />
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="relative p-6 text-center">
                            <h1 className="text-2xl font-bold text-black">Create New Password</h1>
                            <p className="mt-2 text-black">Enter and confirm your new password</p>
                        </div>
                        <div className="p-8">
                            {(errors.email || errors.password || errors.token || passwordError) && (
                                <div className="mb-6 flex items-start rounded-lg border border-red-200 bg-red-100 p-4 text-red-800">
                                    <div className="mr-3 flex-shrink-0">
                                        <svg
                                            className="h-5 w-5 text-red-500"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{errors.email || errors.password || errors.token || passwordError}</p>
                                    </div>
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <svg
                                                className="h-5 w-5 text-gray-400"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                            value={data.password}
                                            onChange={(e) => {
                                                setData('password', e.target.value);
                                                validatePassword(e.target.value);
                                            }}
                                            className="block w-full rounded-lg border border-gray-300 py-3 pr-10 pl-10 text-gray-800 placeholder-gray-400 shadow-sm transition-all focus:border-[#c3a57c] focus:ring-2 focus:ring-[#c3a57c] focus:outline-none"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            className="absolute top-1/2 right-3 -translate-y-1/2 transform"
                                            onClick={togglePasswordVisibility}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5 text-gray-500" /> : <Eye className="h-5 w-5 text-gray-500" />}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Password must be at least 8 characters with at least one number and one symbol
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <svg
                                                className="h-5 w-5 text-gray-400"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                        <input
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            type={showPasswordConfirm ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            className="block w-full rounded-lg border border-gray-300 py-3 pr-10 pl-10 text-gray-800 placeholder-gray-400 shadow-sm transition-all focus:border-[#c3a57c] focus:ring-2 focus:ring-[#c3a57c] focus:outline-none"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            className="absolute top-1/2 right-3 -translate-y-1/2 transform"
                                            onClick={togglePasswordConfirmVisibility}
                                            aria-label={showPasswordConfirm ? 'Hide password' : 'Show password'}
                                        >
                                            {showPasswordConfirm ? (
                                                <EyeOff className="h-5 w-5 text-gray-500" />
                                            ) : (
                                                <Eye className="h-5 w-5 text-gray-500" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={processing || !token}
                                    className={`flex w-full items-center justify-center rounded-lg px-4 py-3 font-medium text-white shadow-sm transition-all ${
                                        processing || !token ? 'cursor-not-allowed bg-[#101010]' : 'hover:bg-black-700 bg-[#101010] hover:shadow-md'
                                    }`}
                                >
                                    {processing ? (
                                        <>
                                            <svg
                                                className="mr-2 -ml-1 h-4 w-4 animate-spin text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Resetting...
                                        </>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </form>
                            <div className="mt-6 text-center">
                                <Link href="/" className="text-sm font-medium text-[#c3a57c] transition-colors">
                                    Remember your password? Sign in
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 text-center text-sm text-gray-500">
                        Need help?{' '}
                        <a href="#" className="font-medium text-[#c3a57c]">
                            Contact support
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
