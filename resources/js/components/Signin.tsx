import { Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { route } from 'ziggy-js';

interface FormErrors {
    email?: string;
    password?: string;
}

export default function Signin() {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const { data, setData, post, processing, errors } = useForm<{
        email: string;
        password: string;
    }>({
        email: '',
        password: '',
    });

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const onSignin = (e: FormEvent) => {
        e.preventDefault();
        if (!data.email || !data.password) {
            toast.error('Please enter both email and password');
            return;
        }

        post(route('login.store'), {
            onSuccess: () => {
                toast.success('Login was successful!');
            },
            onError: (errors) => {
                if (errors.email) {
                    toast.error(errors.email);
                } else if (errors.password) {
                    toast.error(errors.password);
                } else {
                    toast.error('Signin failed. Please check your credentials.');
                }
            },
        });
    };

    return (
        <div className="flex justify-center">
            <div className="w-full max-w-md rounded-2xl bg-white">
                <p className="mt-2 text-gray-600">Welcome back! Please enter your details.</p>
                <form className="mt-6 flex flex-col space-y-5 text-left" onSubmit={onSignin}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className={`mt-1 w-full rounded-lg border p-3 text-gray-800 shadow-sm focus:ring-[#c3a57c] ${
                                errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#c3a57c]'
                            }`}
                            placeholder="you@example.com"
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>
                    <div className="relative">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className={`mt-1 w-full rounded-lg border p-3 pr-10 text-gray-800 shadow-sm focus:ring-[#c3a57c] ${
                                    errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-[#c3a57c]'
                                }`}
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
                        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                    </div>
                    <button
                        type="submit"
                        className="mt-4 w-full rounded-lg bg-[#101010] p-3 text-lg font-semibold text-white shadow-md transition hover:bg-[#000] hover:text-white"
                        disabled={processing}
                    >
                        {processing ? 'Signing In...' : 'Sign In'}
                    </button>
                    <p className="mt-4 text-center text-sm text-gray-500">
                        Forgot password?{' '}
                        <Link href="/forgot-password" className="text-[#c3a57c] hover:underline">
                            Click here
                        </Link>
                    </p>
                    <div className="relative mt-6 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative bg-white px-4 text-sm text-gray-500">Tafaria Booking v1.0.0</div>
                    </div>
                </form>
            </div>
        </div>
    );
}
