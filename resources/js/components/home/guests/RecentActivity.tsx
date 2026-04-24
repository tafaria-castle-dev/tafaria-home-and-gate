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

const iconMap = {
    'check-in': {
        Icon: LogIn,
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
        dot: 'bg-emerald-500',
        border: 'border-emerald-500/20',
        label: 'Arrived',
        labelBg: 'bg-emerald-500/10 text-emerald-700',
    },
    'check-out': {
        Icon: LogOut,
        color: 'text-sky-600',
        bg: 'bg-sky-500/10',
        dot: 'bg-sky-500',
        border: 'border-sky-500/20',
        label: 'Departed',
        labelBg: 'bg-sky-500/10 text-sky-700',
    },
    overdue: {
        Icon: AlertTriangle,
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
        dot: 'bg-amber-500',
        border: 'border-amber-500/20',
        label: 'Overdue',
        labelBg: 'bg-amber-500/10 text-amber-700',
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
        <div className="animate-fade-in overflow-hidden rounded-2xl border border-border bg-card">
            <div className="border-b border-border/60 px-5 pt-5 pb-4">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h3 className="font-serif text-lg font-semibold text-foreground">Recent Activity</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">Live guest events · last 30 records</p>
                    </div>
                    <button
                        onClick={fetchActivities}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
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
                                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all',
                                filter === t.f
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            {t.label}
                            {t.count > 0 && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0 text-[9px] leading-4 font-bold',
                                        filter === t.f ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
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
                        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                        <Clock className="h-8 w-8 opacity-20" />
                        <p className="text-sm">No activity to show</p>
                    </div>
                ) : (
                    <div className="space-y-4 px-4 py-3">
                        {Object.entries(grouped).map(([group, items]) => (
                            <div key={group}>
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">{group}</span>
                                    <div className="h-px flex-1 bg-border/60" />
                                </div>
                                <div className="space-y-0.5">
                                    {items.map((activity) => {
                                        const { Icon, color, bg, dot, border, label, labelBg } = iconMap[activity.type];
                                        return (
                                            <div
                                                key={activity.id}
                                                className="group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-all hover:bg-muted/50"
                                            >
                                                <div
                                                    className={cn(
                                                        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                                                        bg,
                                                        border,
                                                    )}
                                                >
                                                    <Icon className={cn('h-3.5 w-3.5', color)} />
                                                    <span
                                                        className={cn('absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card', dot)}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-0.5 flex items-center gap-2">
                                                        <p className="truncate text-sm leading-none font-semibold text-foreground">
                                                            {activity.guestName}
                                                        </p>
                                                        <span
                                                            className={cn(
                                                                'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase',
                                                                labelBg,
                                                            )}
                                                        >
                                                            {label}
                                                        </span>
                                                    </div>
                                                    <p className="truncate text-[11px] text-muted-foreground">{activity.description}</p>
                                                </div>
                                                <span className="shrink-0 text-[11px] text-muted-foreground">{activity.time}</span>
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
