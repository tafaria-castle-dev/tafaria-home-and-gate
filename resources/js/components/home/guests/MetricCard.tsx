import { cn } from '@/lib/utils';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: LucideIcon;
    trend?: { value: number; isPositive: boolean };
    variant?: 'default' | 'primary' | 'secondary' | 'warning' | 'destructive' | 'success';
    pulse?: boolean;
    onClick?: () => void;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', pulse = false, onClick }: MetricCardProps) {
    const styles = {
        default: { iconBg: 'bg-muted', iconColor: 'text-muted-foreground', valueColor: 'text-foreground', bar: 'bg-muted-foreground/30' },
        primary: { iconBg: 'bg-primary/10', iconColor: 'text-primary', valueColor: 'text-primary', bar: 'bg-primary/40' },
        secondary: { iconBg: 'bg-secondary/10', iconColor: 'text-secondary', valueColor: 'text-secondary', bar: 'bg-secondary/40' },
        warning: { iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', valueColor: 'text-amber-500', bar: 'bg-amber-500/40' },
        destructive: { iconBg: 'bg-destructive/10', iconColor: 'text-destructive', valueColor: 'text-destructive', bar: 'bg-destructive/40' },
        success: { iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600', bar: 'bg-emerald-500/40' },
    }[variant];

    return (
        <div
            className={cn(
                'animate-fade-in relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all',
                onClick && 'cursor-pointer hover:border-border/80 hover:shadow-md',
            )}
            onClick={onClick}
        >
            <div className={cn('absolute bottom-0 left-0 h-0.5 w-full', styles.bar)} />
            {pulse && (
                <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
            )}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="mb-1.5 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{title}</p>
                    <p className={cn('font-serif text-[2.2rem] leading-none font-bold tracking-tight', styles.valueColor)}>{value}</p>
                    {subtitle && <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>}
                    {trend && (
                        <div
                            className={cn(
                                'mt-2 flex items-center gap-1.5 text-[11px] font-bold',
                                trend.isPositive ? 'text-emerald-600' : 'text-destructive',
                            )}
                        >
                            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span>{Math.abs(trend.value)}% vs yesterday</span>
                        </div>
                    )}
                </div>
                <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
                    <Icon className={cn('h-5 w-5', styles.iconColor)} />
                </div>
            </div>
        </div>
    );
}
