import { router, usePage } from '@inertiajs/react';
import { route } from 'ziggy-js';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    signature?: string;
}

interface AuthData {
    user: User | null;
}

interface PageProps {
    auth: AuthData;
    [key: string]: any;
}

export function useAuth() {
    const { props } = usePage<PageProps>();

    const logout = () => {
        router.post(
            route('logout'),
            {},
            {
                onSuccess: () => {
                    router.visit(route('/login'));
                },
                onError: (errors) => {
                    console.error('Logout failed:', errors);
                },
            },
        );
    };

    const redirectToLogin = () => {
        router.visit(route('/login'));
    };

    const redirectToDashboard = () => {
        router.visit(route('dashboard'));
    };

    return {
        user: props.auth.user,
        isAuthenticated: !!props.auth.user,
        isGuest: !props.auth.user,
        logout,
        redirectToLogin,
        redirectToDashboard,
    };
}
