import { cn } from '@/lib/utils';
import axios from 'axios';
import { AlertTriangle, Clock, LogIn, LogOut, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ActivityItem {
    id: string;
    type: 'check-in' | 'check-out' | 'overdue';
    guestName: string;
    description: string;
    time: string;
    rawTime: number;
    status: 'success' | 'warning' | 'info';
    reservation_number: string;
}

const typeConfig = {
    'check-in': {
        Icon: LogIn,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
        dot: 'bg-emerald-500',
        label: 'Arrived',
        labelStyle: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    },
    'check-out': {
        Icon: LogOut,
        iconColor: 'text-sky-600',
        iconBg: 'bg-sky-50',
        dot: 'bg-sky-500',
        label: 'Departed',
        labelStyle: 'bg-sky-50 text-sky-700 border border-sky-100',
    },
    overdue: {
        Icon: AlertTriangle,
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
        dot: 'bg-amber-500',
        label: 'Overdue',
        labelStyle: 'bg-amber-50 text-amber-700 border border-amber-100',
    },
};

const formatRelative = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const getGuestLabel = (r: any): string => {
    if (r.contact?.institution) return r.contact.institution;
    if (r.contact_person) return `${r.contact_person.first_name || ''} ${r.contact_person.last_name || ''}`.trim();
    return r.guest_name ?? 'Unknown Guest';
};

const groupByDate = (items: ActivityItem[]) => {
    const groups: Record<string, ActivityItem[]> = {};
    for (const item of items) {
        const d = new Date(item.rawTime);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        let key: string;
        if (d.toDateString() === today.toDateString()) key = 'Today';
        else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday';
        else key = d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    }
    return groups;
};

export function RecentActivity() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [filter, setFilter] = useState<'all' | 'check-in' | 'check-out' | 'overdue'>('all');

    const fetchActivities = useCallback(async () => {
        setIsFetching(true);
        try {
            const { data } = await axios.get('/api/guest-reservations', { params: { per_page: 100 } });
            const all = data.data ?? data;
            const todayStr = new Date().toISOString().slice(0, 10);
            const events: { r: any; time: Date; type: 'check-in' | 'check-out' | 'overdue' }[] = [];

            for (const r of all) {
                if (r.entry_time) events.push({ r, time: new Date(r.entry_time), type: 'check-in' });
                if (r.exit_time) events.push({ r, time: new Date(r.exit_time), type: 'check-out' });
                if (r.entry_time && !r.exit_time && r.check_out && r.check_out < todayStr)
                    events.push({ r, time: new Date(r.check_out), type: 'overdue' });
            }

            events.sort((a, b) => b.time.getTime() - a.time.getTime());

            const items: ActivityItem[] = events.slice(0, 30).map((e) => {
                const name = getGuestLabel(e.r);
                const pax = (e.r.adults_count ?? 0) + (e.r.kids_count ?? 0);
                const paxStr = pax > 1 ? `${pax} guests` : '1 guest';
                const timeStr = e.type === 'check-in' ? e.r.entry_time : e.type === 'check-out' ? e.r.exit_time : e.r.check_out;
                return {
                    id: `${e.type}-${e.r.id}`,
                    type: e.type,
                    guestName: name,
                    description: `${paxStr} · #${e.r.reservation_number}`,
                    time: formatRelative(timeStr),
                    rawTime: e.time.getTime(),
                    status: e.type === 'check-in' ? 'success' : e.type === 'check-out' ? 'info' : 'warning',
                    reservation_number: e.r.reservation_number,
                };
            });

            setActivities(items);
        } finally {
            setIsFetching(false);
        }
    }, []);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    const filtered = filter === 'all' ? activities : activities.filter((a) => a.type === filter);
    const grouped = groupByDate(filtered);
    const counts = {
        'check-in': activities.filter((a) => a.type === 'check-in').length,
        'check-out': activities.filter((a) => a.type === 'check-out').length,
        overdue: activities.filter((a) => a.type === 'overdue').length,
    };

    const tabs = [
        { f: 'all' as const, label: 'All', count: activities.length },
        { f: 'check-in' as const, label: 'Arrivals', count: counts['check-in'] },
        { f: 'check-out' as const, label: 'Departed', count: counts['check-out'] },
        ...(counts.overdue > 0 ? [{ f: 'overdue' as const, label: 'Overdue', count: counts.overdue }] : []),
    ];

    return (
        <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-sm">
            <div className="border-b border-stone-100 bg-stone-50/50 px-5 pt-5 pb-4">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-serif text-lg font-semibold text-stone-800">Recent Activity</h3>
                        <p className="mt-0.5 text-xs text-stone-400">Live guest events · last 30 records</p>
                    </div>
                    <button
                        onClick={fetchActivities}
                        className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-500 shadow-sm transition-all hover:border-stone-300 hover:text-stone-700 hover:shadow-md active:scale-95"
                    >
                        <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
                        Refresh
                    </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {tabs.map((t) => (
                        <button
                            key={t.f}
                            onClick={() => setFilter(t.f)}
                            className={cn(
                                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150',
                                filter === t.f
                                    ? 'bg-rose-700 text-white shadow-sm shadow-rose-200'
                                    : 'border border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-700',
                            )}
                        >
                            {t.label}
                            {t.count > 0 && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0 text-[9px] leading-4 font-bold',
                                        filter === t.f ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500',
                                    )}
                                >
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
                {isFetching ? (
                    <div className="flex min-h-40 items-center justify-center">
                        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-rose-100 border-t-rose-700" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-14 text-stone-400">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-50">
                            <Clock className="h-5 w-5 opacity-40" />
                        </div>
                        <p className="text-sm font-medium">No activity to show</p>
                    </div>
                ) : (
                    <div className="space-y-5 px-5 py-4">
                        {Object.entries(grouped).map(([group, items]) => (
                            <div key={group}>
                                <div className="mb-2.5 flex items-center gap-2.5">
                                    <span className="text-[10px] font-bold tracking-[0.1em] text-stone-400 uppercase">{group}</span>
                                    <div className="h-px flex-1 bg-stone-100" />
                                </div>
                                <div className="space-y-0.5">
                                    {items.map((activity) => {
                                        const cfg = typeConfig[activity.type];
                                        const { Icon } = cfg;
                                        return (
                                            <div
                                                key={activity.id}
                                                className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all duration-150 hover:bg-stone-50"
                                            >
                                                <div
                                                    className={cn(
                                                        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                                                        cfg.iconBg,
                                                    )}
                                                >
                                                    <Icon className={cn('h-3.5 w-3.5', cfg.iconColor)} />
                                                    <span
                                                        className={cn(
                                                            'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white',
                                                            cfg.dot,
                                                        )}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-0.5 flex items-center gap-2">
                                                        <p className="truncate text-sm leading-none font-semibold text-stone-800">
                                                            {activity.guestName}
                                                        </p>
                                                        <span
                                                            className={cn(
                                                                'shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase',
                                                                cfg.labelStyle,
                                                            )}
                                                        >
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                    <p className="truncate text-[11px] text-stone-400">{activity.description}</p>
                                                </div>
                                                <span className="shrink-0 text-[11px] font-medium text-stone-400">{activity.time}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
