import { useAuth } from '@/hooks/use-auth';
import { Link, router } from '@inertiajs/react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { DollarSign, FileText, PieChart, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import SalesForceDashboard from './SalesForceDashboard';
// import SalesForceDashboard from './SalesForceDashboard';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'salesforce'>('overview');
    const { isAuthenticated, user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [quotations, setQuotations] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState<boolean>(true);
    const [quotesLoading, setQuotesLoading] = useState<boolean>(true);

    const fetchUsers = async () => {
        try {
            setUsersLoading(true);
            const response = await axios.get('/api/users', {
                params: { deleted: false },
            });
            setUsers(response.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    };

    const fetchQuotations = async () => {
        try {
            setQuotesLoading(true);
            const params = user?.role === 'staff' ? { user_id: user?.id } : {};
            const response = await axios.get('/api/quotations', { params });
            setQuotations(response.data || []);
        } catch (error) {
            console.error('Error fetching quotations:', error);
            setQuotations([]);
        } finally {
            setQuotesLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            router.get('/');
        } else {
            fetchUsers();
            fetchQuotations();
        }
    }, [isAuthenticated, user]);

    const reloadAllData = () => {
        fetchUsers();
        fetchQuotations();
    };

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                reloadAllData();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const totalUsers = users.length;
    const totalQuotations = quotations.length;

    function getSafeSelectedType(quotation: any): string {
        if (!quotation || typeof quotation !== 'object') {
            return 'Unknown Type';
        }
        const quotation_details = quotation.quotation_details || {};
        const selectedType = quotation_details.selectedType;
        return typeof selectedType === 'string' ? selectedType : 'Unknown Type';
    }

    function getQuotationName(quotation: any): string {
        if (!quotation || typeof quotation !== 'object') {
            return 'Unknown Quotation';
        }
        const quotation_details = quotation.quotation_details || {};
        return quotation_details.institutionName || quotation_details.name || '';
    }

    function getRefNumber(quotation: any): string {
        if (!quotation || typeof quotation !== 'object') {
            return '';
        }
        const quotation_details = quotation.quotation_details || {};
        return quotation_details.refNo || '';
    }

    const totalRevenue = 0;

    const quotationsByType = quotations.reduce(
        (acc, quotation) => {
            const type = getSafeSelectedType(quotation);
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>,
    );

    const recentQuotations = quotations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

    const StatCardLoader = () => (
        <div className="flex animate-pulse items-center rounded-lg bg-white p-4 shadow-md sm:p-6">
            <div className="mr-3 rounded-full bg-gray-200 p-2 sm:mr-4 sm:p-3">
                <div className="h-6 w-6 rounded-full bg-gray-300 sm:h-8 sm:w-8"></div>
            </div>
            <div className="flex-1">
                <div className="mb-2 h-4 w-20 rounded bg-gray-200 sm:mb-3 sm:h-5 sm:w-32"></div>
                <div className="h-6 w-12 rounded bg-gray-300 sm:h-8 sm:w-20"></div>
            </div>
        </div>
    );

    const ListItemLoader = ({ count = 1 }) => (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="mb-2 flex items-center justify-between border-b pb-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-200 sm:w-24"></div>
                    <div className="h-4 w-6 animate-pulse rounded bg-gray-200 sm:w-8"></div>
                </div>
            ))}
        </>
    );

    const SectionLoader = () => (
        <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
            <div className="mb-4 flex items-center">
                <div className="mr-2 h-5 w-5 animate-pulse rounded-full bg-gray-200 sm:h-6 sm:w-6"></div>
                <div className="h-5 w-32 animate-pulse rounded bg-gray-200 sm:h-6 sm:w-40"></div>
            </div>
            <div className="space-y-3 sm:space-y-4">
                <ListItemLoader count={5} />
            </div>
        </div>
    );

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-[300px] items-center justify-center">
                <motion.div
                    className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 sm:p-6">
            <div className="mb-6">
                <div className="flex border-b border-gray-200">
                    <button
                        className={`px-4 py-2 text-sm font-medium ${
                            activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Quotations dashboard
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium ${
                            activeTab === 'salesforce' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab('salesforce')}
                    >
                        Sales Dashboard
                    </button>
                </div>
            </div>

            {activeTab === 'overview' ? (
                <div>
                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                        {usersLoading || quotesLoading ? (
                            <>
                                <StatCardLoader />
                                <StatCardLoader />
                                <StatCardLoader />
                            </>
                        ) : (
                            <>
                                <div className="flex items-center rounded-lg bg-white p-4 shadow-md sm:p-6">
                                    <div className="mr-3 rounded-full bg-blue-100 p-2 sm:mr-4 sm:p-3">
                                        <Users className="h-6 w-6 text-blue-600 sm:h-8 sm:w-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-700 sm:text-xl">Total Users</h2>
                                        <p className="text-2xl font-bold text-blue-600 sm:text-3xl">
                                            {user?.role === 'staff' || user?.role === 'super_staff' ? 1 : totalUsers}
                                        </p>
                                    </div>
                                </div>

                                <Link href="/home?tab=quotations">
                                    <div className="flex items-center rounded-lg bg-white p-4 shadow-md sm:p-6">
                                        <div className="mr-3 rounded-full bg-green-100 p-2 sm:mr-4 sm:p-3">
                                            <FileText className="h-6 w-6 text-green-600 sm:h-8 sm:w-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-700 sm:text-xl">Total Quotations</h2>
                                            <p className="text-2xl font-bold text-green-600 sm:text-3xl">{totalQuotations}</p>
                                        </div>
                                    </div>
                                </Link>

                                <div className="flex items-center rounded-lg bg-white p-4 shadow-md sm:p-6">
                                    <div className="mr-3 rounded-full bg-purple-100 p-2 sm:mr-4 sm:p-3">
                                        <DollarSign className="h-6 w-6 text-purple-600 sm:h-8 sm:w-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-700 sm:text-xl">Total Revenue</h2>
                                        <p className="text-2xl font-bold text-purple-600 sm:text-3xl">KSh {totalRevenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                        {usersLoading || quotesLoading ? (
                            <>
                                <SectionLoader />
                                <SectionLoader />
                            </>
                        ) : (
                            <>
                                <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
                                    <div className="mb-4 flex items-center">
                                        <PieChart className="mr-2 h-5 w-5 text-orange-600 sm:h-6 sm:w-6" />
                                        <h2 className="text-lg font-semibold text-gray-700 sm:text-xl">Quotations by Type</h2>
                                    </div>
                                    <div>
                                        {Object.entries(quotationsByType).map(([type, count]) => (
                                            <div key={type} className="mb-2 flex items-center justify-between border-b pb-2">
                                                <span className="text-sm text-gray-600 sm:text-base">{type}</span>
                                                <span className="text-sm font-bold text-orange-600 sm:text-base">{count as number}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
                                    <div className="mb-4 flex items-center">
                                        <TrendingUp className="mr-2 h-5 w-5 text-teal-600 sm:h-6 sm:w-6" />
                                        <h2 className="text-lg font-semibold text-gray-700 sm:text-xl">Recent Quotations</h2>
                                    </div>
                                    {recentQuotations.map((quotation) => (
                                        <Link key={quotation.id} href={`/home?tab=quotations&ref=${getRefNumber(quotation)}`}>
                                            <div className="mb-2 flex items-center justify-between border-b pb-2">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 sm:text-base">
                                                        {getQuotationName(quotation)} -- ({getSafeSelectedType(quotation)})
                                                    </p>
                                                    <p className="text-xs text-gray-500 sm:text-sm">
                                                        {`${new Date(quotation.created_at).getDate()}/${
                                                            new Date(quotation.created_at).getMonth() + 1
                                                        }/${new Date(quotation.created_at).getFullYear().toString().slice(-2)} ${new Date(
                                                            quotation.created_at,
                                                        )
                                                            .getHours()
                                                            .toString()
                                                            .padStart(2, '0')}:${new Date(quotation.created_at)
                                                            .getMinutes()
                                                            .toString()
                                                            .padStart(2, '0')}`}
                                                    </p>
                                                </div>
                                                <span className="text-sm font-bold text-teal-600 sm:text-base"></span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
                    {' '}
                    <SalesForceDashboard />
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
