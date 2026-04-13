import { cn } from '@/lib/utils';
import axios from 'axios';
import { Clock, MoreHorizontal, Shield, UserMinus, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ActivityItem {
    id: string;
    type: 'check-in' | 'check-out' | 'overdue';
    title: string;
    guestName: string;
    description: string;
    time: string;
    rawTime: number;
    status: 'success' | 'warning' | 'info';
}

const iconMap = { 'check-in': UserPlus, 'check-out': UserMinus, overdue: Shield };

const statusStyles = {
    success: { icon: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-700' },
    warning: { icon: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-700' },
    info: { icon: 'bg-sky-500/10 text-sky-600 border-sky-500/20', dot: 'bg-sky-500', badge: 'bg-sky-500/10 text-sky-700' },
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

export function RecentActivity() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [filter, setFilter] = useState<'all' | 'check-in' | 'check-out' | 'overdue'>('all');

    const fetchActivities = useCallback(async () => {
        setIsFetching(true);
        try {
            const { data } = await axios.get('/api/guest-reservations', { params: { per_page: 100 } });
            const all = data.data ?? data;
            const now = Date.now();
            const events: { r: any; time: Date; type: 'check-in' | 'check-out' | 'overdue' }[] = [];

            for (const r of all) {
                if (r.entry_time) events.push({ r, time: new Date(r.entry_time), type: 'check-in' });
                if (r.exit_time) events.push({ r, time: new Date(r.exit_time), type: 'check-out' });
                if (r.entry_time && !r.exit_time && r.check_out && new Date(r.check_out).getTime() < now)
                    events.push({ r, time: new Date(r.check_out), type: 'overdue' });
            }

            events.sort((a, b) => b.time.getTime() - a.time.getTime());

            const items: ActivityItem[] = events.slice(0, 25).map((e) => {
                const name = getGuestLabel(e.r);
                const pax = (e.r.adults_count ?? 0) + (e.r.kids_count ?? 0);
                const paxLabel = pax > 1 ? ` · ${pax} guests` : '';
                if (e.type === 'check-in')
                    return {
                        id: `ci-${e.r.id}`,
                        type: 'check-in',
                        title: 'Guest Arrived',
                        guestName: name,
                        description: `${paxLabel.trim() ? paxLabel.trim() + ' · ' : ''}#${e.r.reservation_number}`,
                        time: formatRelative(e.r.entry_time),
                        rawTime: new Date(e.r.entry_time).getTime(),
                        status: 'success',
                    };
                if (e.type === 'check-out')
                    return {
                        id: `co-${e.r.id}`,
                        type: 'check-out',
                        title: 'Guest Departed',
                        guestName: name,
                        description: `${paxLabel.trim() ? paxLabel.trim() + ' · ' : ''}#${e.r.reservation_number}`,
                        time: formatRelative(e.r.exit_time),
                        rawTime: new Date(e.r.exit_time).getTime(),
                        status: 'info',
                    };
                return {
                    id: `od-${e.r.id}`,
                    type: 'overdue',
                    title: 'Overdue',
                    guestName: name,
                    description: `Expected out ${formatRelative(e.r.check_out)}`,
                    time: formatRelative(e.r.check_out),
                    rawTime: new Date(e.r.check_out).getTime(),
                    status: 'warning',
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
        <div className="animate-fade-in rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h3 className="font-serif text-lg font-semibold">Recent Activity</h3>
                    <p className="text-xs text-muted-foreground">Live guest events</p>
                </div>
                <button className="text-xs font-semibold text-secondary hover:underline">View all</button>
            </div>

            <div className="mb-4 flex flex-wrap gap-1">
                {tabs.map((t) => (
                    <button
                        key={t.f}
                        onClick={() => setFilter(t.f)}
                        className={cn(
                            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                            filter === t.f ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {t.label}
                        {t.count > 0 && (
                            <span
                                className={cn(
                                    'rounded-full px-1.5 py-0 text-[10px] font-bold',
                                    filter === t.f ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                                )}
                            >
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {isFetching ? (
                <div className="flex min-h-40 items-center justify-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
            ) : (
                <div className="space-y-0.5">
                    {filtered.map((activity) => {
                        const Icon = iconMap[activity.type];
                        const s = statusStyles[activity.status];
                        return (
                            <div
                                key={activity.id}
                                className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                            >
                                <div className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', s.icon)}>
                                    <Icon className="h-3.5 w-3.5" />
                                    <span className={cn('absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card', s.dot)} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm leading-none font-semibold text-foreground">{activity.guestName}</p>
                                        <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold', s.badge)}>
                                            {activity.title}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{activity.description}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                                    <Clock className="h-2.5 w-2.5" />
                                    {activity.time}
                                </div>
                                <button className="hidden h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground group-hover:flex hover:text-foreground">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
