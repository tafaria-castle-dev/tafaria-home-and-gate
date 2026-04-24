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
    const styles = {
        default: {
            iconBg: 'bg-muted',
            iconColor: 'text-muted-foreground',
            valueColor: 'text-foreground',
            accent: 'from-muted-foreground/20 to-transparent',
        },
        primary: { iconBg: 'bg-primary/10', iconColor: 'text-primary', valueColor: 'text-primary', accent: 'from-primary/20 to-transparent' },
        secondary: {
            iconBg: 'bg-secondary/10',
            iconColor: 'text-secondary',
            valueColor: 'text-secondary',
            accent: 'from-secondary/20 to-transparent',
        },
        warning: { iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', valueColor: 'text-amber-500', accent: 'from-amber-500/20 to-transparent' },
        destructive: {
            iconBg: 'bg-destructive/10',
            iconColor: 'text-destructive',
            valueColor: 'text-destructive',
            accent: 'from-destructive/20 to-transparent',
        },
        success: {
            iconBg: 'bg-emerald-500/10',
            iconColor: 'text-emerald-600',
            valueColor: 'text-emerald-600',
            accent: 'from-emerald-500/20 to-transparent',
        },
    }[variant];

    const total = breakdown?.reduce((s, b) => s + b.value, 0) ?? 0;

    return (
        <div
            className={cn(
                'animate-fade-in relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200',
                onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg',
            )}
            onClick={onClick}
        >
            <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r', styles.accent)} />

            {pulse && (
                <span className="absolute top-3.5 right-3.5 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
            )}

            <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                    <p className="text-[11px] leading-none font-bold tracking-widest text-muted-foreground uppercase">{title}</p>
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
                        <Icon className={cn('h-4.5 w-4.5', styles.iconColor)} size={18} />
                    </div>
                </div>

                <p className={cn('font-serif text-[2.4rem] leading-none font-bold tracking-tight', styles.valueColor)}>{value}</p>

                {subtitle && <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{subtitle}</p>}

                {trend && (
                    <div
                        className={cn(
                            'mt-2.5 flex items-center gap-1.5 text-[11px] font-bold',
                            trend.isPositive ? 'text-emerald-600' : 'text-rose-500',
                        )}
                    >
                        {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        <span>{Math.abs(trend.value)}% vs yesterday</span>
                    </div>
                )}

                {breakdown && breakdown.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                            {breakdown.map((item) => (
                                <div
                                    key={item.label}
                                    className={cn('h-full transition-all duration-700', item.color)}
                                    style={{ width: total > 0 ? `${(item.value / total) * 100}%` : '0%' }}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {breakdown.map((item) => (
                                <div key={item.label} className="flex items-center gap-1">
                                    <span className={cn('h-1.5 w-1.5 rounded-full', item.color)} />
                                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                                    <span className="text-[10px] font-bold text-foreground">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
