import DreamPasses from '@/components/home/dreamPasses/DreamPasses';
import GuestsDashboard from '@/components/home/guests/GuestsDashboard';
import Opportunities from '@/components/home/opportunities/Opportunities';
import Patrols from '@/components/home/patrols/Patrols';
import GuestReservations from '@/components/home/reservations/GuestReservations';
import { useAuth } from '@/hooks/use-auth';
import { router } from '@inertiajs/react';
import {
    BookOpenIcon,
    CalendarSearch,
    FileText,
    Home,
    Inbox,
    Loader2Icon,
    LogOut,
    Menu,
    Phone,
    Radar,
    Settings2,
    ShoppingBag,
    Users,
    X,
} from 'lucide-react';
import { ReactNode, Suspense, useEffect, useState } from 'react';
import BulkEmails from '../components/home/bulkEmails/BulkEmails';
import ContactManagement from '../components/home/Contacts';
import Dashboard from '../components/home/Dashboard';
import Quotations from '../components/home/Quotations';
import Settings from '../components/home/Settings';
import UserManagement from '../components/home/Users';

interface NavItemProps {
    icon: ReactNode;
    text: string;
    active: boolean;
    expanded: boolean;
    onClick: () => void;
}
export default function Layout() {
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('quotations');
    const { isAuthenticated, logout, user } = useAuth();

    useEffect(() => {
        if (!isAuthenticated || !user) {
            const currentUrl = window.location.pathname + window.location.search;
            sessionStorage.setItem('intendedDestination', currentUrl);
            router.visit('/');
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');

        if (
            tab &&
            [
                'dashboard',
                'quotations',
                'users',
                'settings',
                'contacts',
                'opportunities',
                'dream-passes',
                'bulk-emails',
                'reservations',
                'guests',
                'patrols',
            ].includes(tab)
        ) {
            setActiveTab(tab);
        } else {
            setActiveTab('quotations');
            router.visit('/home?tab=quotations', {
                preserveScroll: true,
                replace: true,
            });
        }
    }, [isAuthenticated, user]);

    if (!isAuthenticated || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    const NavItems = [
        { icon: <Home className="h-5 w-5" />, text: 'Dashboard', tab: 'dashboard' },
        {
            icon: <FileText className="h-5 w-5" />,
            text: 'Quotations',
            tab: 'quotations',
        },
        {
            icon: <ShoppingBag className="h-5 w-5" />,
            text: 'DreamPasses',
            tab: 'dream-passes',
        },
        { icon: <Users className="h-5 w-5" />, text: 'Users', tab: 'users' },
        { icon: <Phone className="h-5 w-5" />, text: 'Contacts', tab: 'contacts' },
        {
            icon: <BookOpenIcon className="h-5 w-5" />,
            text: 'Opportunities',
            tab: 'opportunities',
        },
        {
            icon: <Inbox className="h-5 w-5" />,
            text: 'Bulk Emails',
            tab: 'bulk-emails',
        },
        {
            icon: <CalendarSearch className="h-5 w-5" />,
            text: 'Guests ',
            tab: 'guests',
        },
        {
            icon: <CalendarSearch className="h-5 w-5" />,
            text: 'Reservations ',
            tab: 'reservations',
        },
        {
            icon: <Radar className="h-5 w-5" />,
            text: 'Patrols ',
            tab: 'patrols',
        },

        {
            icon: <Settings2 className="h-5 w-5" />,
            text: 'Settings',
            tab: 'settings',
        },
    ];

    const handleLogout = () => {
        router.post(
            '/logout',
            {},
            {
                onSuccess: () => {
                    logout();
                    router.visit('/');
                },
            },
        );
    };

    return (
        <Suspense fallback={<Loader2Icon className="animate-spin" />}>
            <div className="flex min-h-screen bg-[#f28504fc]">
                <button
                    onClick={() => setMobileSidebarOpen(true)}
                    className="fixed right-6 bottom-6 z-40 rounded-full bg-black p-3 text-white shadow-lg md:hidden"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div
                    className={`fixed top-0 z-50 flex h-screen flex-col bg-black py-4 text-white transition-all duration-300 md:sticky ${sidebarExpanded ? 'w-64' : 'w-16'} ${mobileSidebarOpen ? 'left-0' : '-left-full md:left-0'} `}
                >
                    <button onClick={() => setMobileSidebarOpen(false)} className="absolute top-4 right-4 text-white md:hidden">
                        <X className="h-6 w-6" />
                    </button>

                    <button
                        onClick={() => setSidebarExpanded(!sidebarExpanded)}
                        className="absolute top-5 -right-5 hidden rounded-full bg-white p-2 text-gray-700 shadow-md hover:bg-gray-300 md:block"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex flex-col items-center justify-center border-b border-white/30 px-2 py-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-bold text-blue-700 md:h-12 md:w-12">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                        {sidebarExpanded && (
                            <>
                                <p className="mt-2 text-center text-lg">{user.name}</p>
                                <p className="mt-1 text-center text-sm">{user.role}</p>
                            </>
                        )}
                    </div>

                    <nav className="mx-2 mt-6 flex-1 space-y-2 overflow-y-auto">
                        {NavItems.filter((item) => {
                            if (item.tab === 'settings' && (user?.role === 'staff' || user?.role === 'super_staff')) {
                                return false;
                            }
                            if (item.tab === 'users' && (user?.role === 'staff' || user?.role === 'super_staff')) {
                                return false;
                            }
                            return true;
                        }).map((item) => (
                            <NavItem
                                key={item.tab}
                                icon={item.icon}
                                text={item.text}
                                active={activeTab === item.tab}
                                expanded={sidebarExpanded}
                                onClick={() => {
                                    setActiveTab(item.tab);
                                    setMobileSidebarOpen(false);
                                    const newUrl = new URL(window.location.href);
                                    newUrl.searchParams.set('tab', item.tab);
                                    window.history?.replaceState(null, '', newUrl.toString());
                                }}
                            />
                        ))}
                        <NavItem
                            icon={<LogOut className="h-5 w-5" />}
                            text="Logout"
                            active={false}
                            expanded={sidebarExpanded}
                            onClick={handleLogout}
                        />
                    </nav>
                </div>

                <div className={`min-h-screen flex-1 transition-all duration-300 ${sidebarExpanded ? 'md:ml-2' : 'md:ml-16'} `}>
                    <div className="p-4 sm:p-6">
                        {activeTab === 'dashboard' && <Dashboard />}
                        {activeTab === 'settings' && user.role === 'admin' && <Settings />}
                        {activeTab === 'users' && <UserManagement />}
                        {activeTab === 'contacts' && <ContactManagement />}
                        {activeTab === 'opportunities' && <Opportunities />}
                        {activeTab === 'bulk-emails' && <BulkEmails />}
                        {activeTab === 'reservations' && <GuestReservations />}
                        {activeTab === 'guests' && <GuestsDashboard />}
                        {activeTab === 'patrols' && <Patrols />}
                        {activeTab === 'quotations' && <Quotations />}
                        {activeTab === 'dream-passes' && <DreamPasses />}
                    </div>
                </div>
            </div>
        </Suspense>
    );
}

const NavItem = ({ icon, text, active, expanded, onClick }: NavItemProps) => (
    <button
        onClick={onClick}
        className={`flex w-full items-center rounded-lg px-2 py-3 transition-all ${
            active ? 'bg-white text-black' : 'text-white hover:bg-white/20'
        } ${expanded ? 'justify-start px-4' : 'justify-center'}`}
    >
        {icon}
        {expanded && <span className="ml-3">{text}</span>}
    </button>
);
