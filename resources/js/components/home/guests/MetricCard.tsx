import { cn } from '@/lib/utils';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface BreakdownItem {
    label: string;
    value: number;
    color: string;
}

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: { value: number; isPositive: boolean };
    variant?: 'default' | 'primary' | 'secondary' | 'warning' | 'destructive' | 'success';
    pulse?: boolean;
    breakdown?: BreakdownItem[];
    onClick?: () => void;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', pulse = false, breakdown, onClick }: MetricCardProps) {
    const config = {
        default: {
            iconBg: 'bg-stone-100',
            iconColor: 'text-stone-500',
            valueColor: 'text-stone-900',
            accent: 'from-stone-200/60 to-transparent',
            border: 'border-stone-200/60',
            glow: '',
        },
        primary: {
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-700',
            valueColor: 'text-rose-800',
            accent: 'from-rose-100/80 to-transparent',
            border: 'border-rose-100',
            glow: 'hover:shadow-rose-100/50',
        },
        secondary: {
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-700',
            valueColor: 'text-amber-800',
            accent: 'from-amber-100/80 to-transparent',
            border: 'border-amber-100',
            glow: 'hover:shadow-amber-100/50',
        },
        warning: {
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            valueColor: 'text-amber-700',
            accent: 'from-amber-100/60 to-transparent',
            border: 'border-amber-100',
            glow: 'hover:shadow-amber-100/50',
        },
        destructive: {
            iconBg: 'bg-red-50',
            iconColor: 'text-red-600',
            valueColor: 'text-red-700',
            accent: 'from-red-100/60 to-transparent',
            border: 'border-red-100',
            glow: 'hover:shadow-red-100/50',
        },
        success: {
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-700',
            valueColor: 'text-emerald-800',
            accent: 'from-emerald-100/60 to-transparent',
            border: 'border-emerald-100',
            glow: 'hover:shadow-emerald-100/50',
        },
    }[variant];

    const total = breakdown?.reduce((s, b) => s + b.value, 0) ?? 0;

    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-2xl border bg-white transition-all duration-300',
                config.border,
                'hover:-translate-y-0.5 hover:shadow-xl',
                config.glow,
                onClick && 'cursor-pointer',
            )}
            onClick={onClick}
        >
            <div className={cn('absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r', config.accent)} />

            {pulse && (
                <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
            )}

            <div className="p-5">
                <div className="mb-4 flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-stone-400 uppercase">{title}</p>
                    <div
                        className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
                            config.iconBg,
                        )}
                    >
                        <Icon className={cn('h-4 w-4', config.iconColor)} />
                    </div>
                </div>

                <p className={cn('font-serif text-[2.6rem] leading-none font-bold tracking-tight', config.valueColor)}>{value}</p>

                {subtitle && <p className="mt-2 text-xs leading-snug text-stone-400">{subtitle}</p>}

                {trend && (
                    <div
                        className={cn(
                            'mt-3 flex items-center gap-1.5 text-[11px] font-semibold',
                            trend.isPositive ? 'text-emerald-600' : 'text-rose-500',
                        )}
                    >
                        {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{Math.abs(trend.value)}% vs yesterday</span>
                    </div>
                )}

                {breakdown && breakdown.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                            {breakdown.map((item) => (
                                <div
                                    key={item.label}
                                    className={cn('h-full transition-all duration-700', item.color)}
                                    style={{ width: total > 0 ? `${(item.value / total) * 100}%` : '0%' }}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {breakdown.map((item) => (
                                <div key={item.label} className="flex items-center gap-1.5">
                                    <span className={cn('h-1.5 w-1.5 rounded-full', item.color)} />
                                    <span className="text-[10px] text-stone-400">{item.label}</span>
                                    <span className="text-[10px] font-bold text-stone-700">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
