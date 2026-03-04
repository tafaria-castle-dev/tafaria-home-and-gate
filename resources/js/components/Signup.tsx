import { Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { route } from 'ziggy-js';
import SignatureCapture from './SignatureCapture';

interface FormErrors {
    name?: string;
    email?: string;
    phone_number?: string;
    password?: string;
    signature?: string;
    role?: string;
}

export default function Signup() {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [passwordError, setPasswordError] = useState<string>('');
    const { data, setData, post, processing, errors } = useForm<{
        name: string;
        email: string;
        phone_number: string;
        password: string;
        signature: string;
        role: string;
    }>({
        name: '',
        email: '',
        phone_number: '',
        password: '',
        signature: '',
        role: 'staff',
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

    const handleSignatureChange = (signatureData: string) => {
        setData('signature', signatureData);
    };

    const onSignup = (e: FormEvent) => {
        e.preventDefault();

        if (!data.signature) {
            toast.error('Please provide a signature before signing up.');
            return;
        }

        if (!validatePassword(data.password)) {
            return;
        }

        post(route('register'), {
            onSuccess: () => {
                toast.success('Registration successful!');
            },
            onError: (errors: FormErrors) => {
                if (errors.email && errors.email.includes('taken')) {
                    toast.error('User already exists');
                } else {
                    toast.error('An error occurred during registration');
                }
            },
        });
    };

    return (
        <div className="flex items-center justify-center">
            <div className="w-full max-w-md bg-white">
                <p className="mt-2 text-gray-600">Join Tafaria Castle! Fill in your details below.</p>
                <form className="mt-6 flex flex-col space-y-5 text-left" onSubmit={onSignup}>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Full Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-gray-800 shadow-sm focus:border-[#c3a57c] focus:ring-[#c3a57c]"
                            placeholder="John Doe"
                            required
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-gray-800 shadow-sm focus:border-[#c3a57c] focus:ring-[#c3a57c]"
                            placeholder="you@example.com"
                            required
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>
                    <div>
                        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                            Phone Number
                        </label>
                        <input
                            id="phone_number"
                            type="text"
                            value={data.phone_number}
                            onChange={(e) => setData('phone_number', e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-gray-800 shadow-sm focus:border-[#c3a57c] focus:ring-[#c3a57c]"
                            placeholder="+123 456 7890"
                            required
                        />
                        {errors.phone_number && <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>}
                    </div>
                    <SignatureCapture onSignatureChange={handleSignatureChange} />
                    <div className="relative">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => {
                                    setData('password', e.target.value);
                                    validatePassword(e.target.value);
                                }}
                                className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-gray-800 shadow-sm focus:border-[#c3a57c] focus:ring-[#c3a57c]"
                                placeholder="••••••••"
                                required
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
                        {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
                        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                        <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters with at least one number and one symbol</p>
                    </div>
                    <button
                        type="submit"
                        className="mt-4 w-full rounded-lg bg-black p-3 text-lg font-semibold text-white shadow-md transition hover:bg-yellow-400 hover:text-black"
                        disabled={processing}
                    >
                        {processing ? 'Signing Up...' : 'Sign Up'}
                    </button>
                    <p className="mt-4 text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link href="/" className="text-[#c3a57c] hover:underline">
                            Sign in here
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
