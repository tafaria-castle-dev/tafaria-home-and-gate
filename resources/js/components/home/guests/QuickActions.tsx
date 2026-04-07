import { FileText, UserMinus, UserPlus } from 'lucide-react';

const actions = [
    {
        title: 'Check-In Guest',
        description: 'Register new arrival',
        icon: UserPlus,
        href: '/guests/check-in',
    },
    {
        title: 'Check-Out Guest',
        description: 'Process departure',
        icon: UserMinus,
        href: '/guests/check-out',
    },
    {
        title: 'Generate Report',
        description: 'Export data',
        icon: FileText,
        href: '/analytics/reports',
    },
];

export function QuickActions() {
    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {actions.map((action) => (
                <button key={action.title} onClick={() => (window.location.href = action.href)} className="quick-action group">
                    <action.icon className="quick-action-icon" />
                    <span className="text-sm font-medium text-foreground">{action.title}</span>
                    <span className="text-xs text-muted-foreground">{action.description}</span>
                </button>
            ))}
        </div>
    );
}
