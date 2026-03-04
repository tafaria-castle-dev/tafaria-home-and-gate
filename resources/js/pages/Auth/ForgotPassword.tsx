import { Head, Link, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
interface FormErrors {
    email?: string;
}

export default function ForgotPassword() {
    const [message, setMessage] = useState<string>('');
    const [isError, setIsError] = useState<boolean>(false);
    const { data, setData, post, processing, errors } = useForm<{
        email: string;
    }>({
        email: '',
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsError(false);
        setMessage('');

        post('/api/auth/forgot-password', {
            onSuccess: () => {
                setMessage('Password reset link sent to your email!');
            },
            onError: () => {
                setIsError(true);
                setMessage('Something went wrong. Please try again.');
            },
        });
    };

    return (
        <>
            <Head title="Reset Password" />
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="overflow-hidden rounded-2xl bg-white pt-6 shadow-xl">
                        <div className="relative text-center">
                            <h1 className="text-2xl font-bold text-black">Reset Your Password</h1>
                            <p className="mt-2 text-black">Enter your email to receive a reset link</p>
                        </div>
                        <div className="p-8">
                            {message && (
                                <div
                                    className={`mb-6 flex items-start rounded-lg p-4 ${
                                        isError
                                            ? 'border border-red-200 bg-red-100 text-red-800'
                                            : 'border border-green-200 bg-green-100 text-green-800'
                                    }`}
                                >
                                    <div className="mr-3 flex-shrink-0">
                                        {isError ? (
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
                                        ) : (
                                            <svg
                                                className="h-5 w-5 text-green-500"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{message}</p>
                                    </div>
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <svg
                                                className="h-5 w-5 text-gray-400"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                            </svg>
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            className="block w-full rounded-lg border border-gray-300 py-3 pr-3 pl-10 text-gray-800 placeholder-gray-400 shadow-sm transition-all focus:border-[#c3a57c] focus:ring-2 focus:ring-[#c3a57c] focus:outline-none"
                                            placeholder="your@email.com"
                                        />
                                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#101010] p-3 text-lg font-semibold text-white shadow-md transition hover:bg-[#000] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processing && <Loader2 className="h-5 w-5 animate-spin" />}
                                    {processing ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </form>
                            <div className="mt-6 text-center">
                                <Link href="/" className="text-[#c3a57c] hover:underline">
                                    Remember your password? Sign in
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 text-center text-sm text-gray-500">
                        Need help?{' '}
                        <a href="#" className="text-[#c3a57c] hover:underline">
                            Contact support
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}
