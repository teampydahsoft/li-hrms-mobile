import { View, Text, ScrollView } from 'react-native';
import { Check, Clock, X, type LucideIcon } from 'lucide-react-native';
import { formatShortDateTimeIST } from '../utils/dateIST';

export type TimelineStep = {
    stepOrder?: number;
    role?: string;
    stepRole?: string;
    label?: string;
    status?: string;
    actionByName?: string;
    comments?: string;
    updatedAt?: string;
};

function stepVisual(status: string): { ring: string; line: string; Icon: LucideIcon; iconColor: string } {
    const s = (status || '').toLowerCase();
    if (s.includes('reject')) {
        return { ring: 'border-rose-400 bg-rose-50', line: 'bg-rose-200', Icon: X, iconColor: '#e11d48' };
    }
    if (s.includes('approv')) {
        return { ring: 'border-emerald-500 bg-emerald-500', line: 'bg-emerald-300', Icon: Check, iconColor: '#ffffff' };
    }
    if (s.includes('pending') || s.includes('progress') || s === '' || s === '—') {
        return { ring: 'border-amber-400 bg-amber-50', line: 'bg-amber-200', Icon: Clock, iconColor: '#d97706' };
    }
    return { ring: 'border-neutral-200 bg-neutral-100', line: 'bg-neutral-200', Icon: Clock, iconColor: '#64748b' };
}

function shortStatus(status: string): string {
    const s = (status || '').trim();
    if (!s) return 'Waiting';
    const l = s.toLowerCase();
    if (l.includes('approv')) return 'Approved';
    if (l.includes('reject')) return 'Rejected';
    if (l.includes('pending')) return 'Pending';
    if (l.includes('progress')) return 'In progress';
    return s.replace(/_/g, ' ');
}

type Props = {
    steps: TimelineStep[];
    title?: string;
};

export function ApprovalTimeline({ steps, title = 'Approval progress' }: Props) {
    const sorted = [...steps].sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
    if (sorted.length === 0) return null;

    return (
        <View className="bg-white rounded-[28px] border-2 border-neutral-100 p-4 mb-4 shadow-sm">
            <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-3">{title}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 8 }}>
                <View className="flex-row items-center">
                    {sorted.map((step, idx) => {
                        const label = step.label || step.role || step.stepRole || `Step ${idx + 1}`;
                        const st = String(step.status ?? '');
                        const { ring, line, Icon, iconColor } = stepVisual(st);
                        const when = step.updatedAt ? formatShortDateTimeIST(step.updatedAt) : '';

                        return (
                            <View key={idx} className="flex-row items-center">
                                {idx > 0 ? <View className={`h-0.5 w-5 mx-1 ${line}`} /> : null}
                                <View className="items-center w-[104px]">
                                    <View
                                        className={`w-11 h-11 rounded-full border-2 items-center justify-center ${ring}`}
                                    >
                                        <Icon size={20} color={iconColor} strokeWidth={2.5} />
                                    </View>
                                    <Text className="text-[11px] font-black text-neutral-800 text-center mt-2 leading-4" numberOfLines={2}>
                                        {label}
                                    </Text>
                                    <Text className="text-[10px] font-bold text-neutral-500 text-center mt-0.5" numberOfLines={1}>
                                        {shortStatus(st)}
                                    </Text>
                                    {step.actionByName ? (
                                        <Text className="text-[9px] text-neutral-400 text-center mt-0.5" numberOfLines={1}>
                                            {step.actionByName}
                                        </Text>
                                    ) : null}
                                    {when ? (
                                        <Text className="text-[9px] text-neutral-400 text-center mt-0.5">IST · {when}</Text>
                                    ) : null}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}
