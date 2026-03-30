import { useCallback, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Plus, ChevronRight, Briefcase } from 'lucide-react-native';
import { MotiView } from 'moti';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, ApiEnvelope } from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';
import { formatDateRangeIST } from '../../src/utils/dateIST';

type Row = { _id: string; status?: string; fromDate?: string; toDate?: string; purpose?: string; leaveType?: string; odType?: string };

const FILTERS = ['all', 'pending', 'approved', 'rejected'] as const;
type Filter = (typeof FILTERS)[number];

function statusBadge(status: string): { wrap: string; text: string } {
    const s = (status || '').toLowerCase();
    if (s.includes('approv')) return { wrap: 'bg-emerald-100', text: 'text-emerald-800' };
    if (s.includes('reject')) return { wrap: 'bg-rose-100', text: 'text-rose-800' };
    if (s.includes('pending') || s.includes('progress')) return { wrap: 'bg-amber-100', text: 'text-amber-900' };
    return { wrap: 'bg-neutral-100', text: 'text-neutral-700' };
}

export default function LeavesScreen() {
    const router = useRouter();
    const { user, employee, setEmployee } = useAuthStore();
    const [segment, setSegment] = useState<'leave' | 'od'>('leave');
    const [filter, setFilter] = useState<Filter>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [leaveRows, setLeaveRows] = useState<Row[]>([]);
    const [odRows, setOdRows] = useState<Row[]>([]);
    const [actionOpen, setActionOpen] = useState(false);

    const ensureEmployee = useCallback(async () => {
        if (!employee && user?.emp_no) {
            try {
                const er = await api.getEmployee(user.emp_no);
                const body = er.data as ApiEnvelope;
                if (body.success && body.data) setEmployee(body.data as never);
            } catch {
                /* ignore */
            }
        }
    }, [employee, user?.emp_no, setEmployee]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            await ensureEmployee();
            const q: { status?: string } = {};
            if (filter === 'approved') q.status = 'approved';
            else if (filter === 'rejected') q.status = 'rejected';
            const [lr, or] = await Promise.all([api.getMyLeaves(q), api.getMyODs(q)]);
            const lb = lr.data as ApiEnvelope<Row[]>;
            const ob = or.data as ApiEnvelope<Row[]>;
            let l = Array.isArray(lb.data) ? lb.data : [];
            let o = Array.isArray(ob.data) ? ob.data : [];
            if (filter === 'pending') {
                const pend = (s: string) => {
                    const x = (s || '').toLowerCase().replace(/\s+/g, '_');
                    return x === 'pending' || x === 'in_progress';
                };
                l = l.filter((r) => pend(String(r.status)));
                o = o.filter((r) => pend(String(r.status)));
            }
            setLeaveRows(l);
            setOdRows(o);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter, ensureEmployee]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const rows = segment === 'leave' ? leaveRows : odRows;
    const pendingLeave = leaveRows.filter((r) => String(r.status).toLowerCase().includes('pending')).length;
    const pendingOd = odRows.filter((r) => String(r.status).toLowerCase().includes('pending')).length;

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <LinearGradient colors={['#FFFFFE', '#F7FEE7', '#FFFFFF']} className="absolute inset-0" />
            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1 px-6 pt-6"
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
                >
                    <View className="flex-row justify-between items-start mb-6">
                        <View className="flex-1 pr-3">
                            <View className="flex-row items-center mb-1">
                                <View className="w-8 h-1 bg-primary rounded-full mr-2" />
                                <Text className="text-neutral-400 font-bold tracking-widest text-[10px] uppercase">Leave & OD</Text>
                            </View>
                            <Text className="text-neutral-900 text-3xl font-black tracking-tight">
                                Time<Text className="text-primary">.</Text>Off
                            </Text>
                            <Text className="text-neutral-500 text-sm font-medium mt-1">Apply, track status, view approval steps.</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setActionOpen(true)}
                            className="w-14 h-14 bg-primary rounded-2xl items-center justify-center shadow-lg shadow-primary/30"
                        >
                            <Plus size={28} color="white" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row gap-3 mb-4">
                        <View className="flex-1 bg-white rounded-[24px] p-4 border-2 border-neutral-50 shadow-sm">
                            <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1">Leaves pending</Text>
                            <Text className="text-neutral-900 text-2xl font-black">{pendingLeave}</Text>
                        </View>
                        <View className="flex-1 bg-white rounded-[24px] p-4 border-2 border-neutral-50 shadow-sm">
                            <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1">OD pending</Text>
                            <Text className="text-neutral-900 text-2xl font-black">{pendingOd}</Text>
                        </View>
                    </View>

                    <View className="flex-row bg-white rounded-2xl border-2 border-neutral-100 p-1 mb-4">
                        {(['leave', 'od'] as const).map((s) => (
                            <TouchableOpacity
                                key={s}
                                onPress={() => setSegment(s)}
                                className={`flex-1 py-3 rounded-xl items-center ${segment === s ? 'bg-neutral-900' : ''}`}
                            >
                                {s === 'leave' ? (
                                    <Text className={`font-black text-xs uppercase tracking-widest ${segment === s ? 'text-white' : 'text-neutral-500'}`}>
                                        Leaves
                                    </Text>
                                ) : (
                                    <View className="flex-row items-center gap-1">
                                        <Briefcase size={14} color={segment === s ? '#fff' : '#64748B'} />
                                        <Text className={`font-black text-xs uppercase tracking-widest ${segment === s ? 'text-white' : 'text-neutral-500'}`}>
                                            On duty
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-1">
                        <View className="flex-row gap-2 px-1">
                            {FILTERS.map((f) => (
                                <TouchableOpacity
                                    key={f}
                                    onPress={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-full border-2 ${filter === f ? 'bg-emerald-50 border-primary' : 'bg-white border-neutral-100'}`}
                                >
                                    <Text className={`font-bold text-xs capitalize ${filter === f ? 'text-emerald-900' : 'text-neutral-600'}`}>
                                        {f}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {loading && !refreshing ? (
                        <View className="py-20 items-center">
                            <ActivityIndicator size="large" color="#10B981" />
                        </View>
                    ) : rows.length === 0 ? (
                        <MotiView
                            from={{ opacity: 0, translateY: 12 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            className="bg-white rounded-[32px] p-10 items-center border-2 border-neutral-50 mb-24"
                        >
                            <View className="bg-emerald-50 w-20 h-20 rounded-[28px] items-center justify-center mb-6 border border-emerald-100">
                                <Calendar size={40} color="#10B981" strokeWidth={2.5} />
                            </View>
                            <Text className="text-neutral-900 font-black text-xl mb-2">No records</Text>
                            <Text className="text-neutral-500 text-center font-medium leading-6">
                                {filter === 'all'
                                    ? `You have no ${segment === 'leave' ? 'leave' : 'on-duty'} applications in this filter.`
                                    : `No ${filter} ${segment === 'leave' ? 'leaves' : 'ODs'} right now.`}
                            </Text>
                        </MotiView>
                    ) : (
                        <View className="gap-3 pb-28">
                            {rows.map((r, idx) => {
                                const st = String(r.status ?? '');
                                const badge = statusBadge(st);
                                const title =
                                    segment === 'leave'
                                        ? String(r.leaveType ?? 'Leave')
                                        : String(r.odType ?? 'On duty');
                                return (
                                    <MotiView
                                        key={r._id}
                                        from={{ opacity: 0, translateY: 10 }}
                                        animate={{ opacity: 1, translateY: 0 }}
                                        transition={{ delay: idx * 40 }}
                                    >
                                        <TouchableOpacity
                                            onPress={() =>
                                                segment === 'leave'
                                                    ? router.push(`/leave/${r._id}`)
                                                    : router.push(`/od/${r._id}`)
                                            }
                                            activeOpacity={0.9}
                                            className="bg-white rounded-[28px] p-5 border-2 border-neutral-50 shadow-sm flex-row items-center"
                                        >
                                            <View className="flex-1 min-w-0">
                                                <View className="flex-row items-center gap-2 mb-1 flex-wrap">
                                                    <Text className="text-neutral-900 font-black text-base flex-shrink">{title}</Text>
                                                    <View className={`px-2 py-0.5 rounded-full ${badge.wrap}`}>
                                                        <Text className={`text-[10px] font-black uppercase ${badge.text}`}>
                                                            {st.replace(/_/g, ' ') || '—'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text className="text-neutral-500 text-sm font-bold">
                                                    {formatDateRangeIST(r.fromDate, r.toDate)}
                                                </Text>
                                                <Text className="text-neutral-400 text-[9px] font-bold uppercase tracking-wider mt-0.5">
                                                    IST
                                                </Text>
                                                {r.purpose ? (
                                                    <Text className="text-neutral-400 text-xs mt-2" numberOfLines={2}>
                                                        {r.purpose}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <ChevronRight size={22} color="#94A3B8" strokeWidth={2.5} />
                                        </TouchableOpacity>
                                    </MotiView>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>

                <Modal visible={actionOpen} animationType="fade" transparent>
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setActionOpen(false)}
                        className="flex-1 bg-black/50 justify-end"
                    >
                        <View className="bg-white rounded-t-[32px] p-6 pb-10 border-t-2 border-neutral-100">
                            <Text className="text-neutral-900 font-black text-lg mb-4">New request</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setActionOpen(false);
                                    router.push('/apply-leave');
                                }}
                                className="py-4 rounded-2xl bg-emerald-500 mb-3 items-center"
                            >
                                <Text className="text-white font-black uppercase tracking-widest text-xs">Apply leave</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setActionOpen(false);
                                    router.push('/apply-od');
                                }}
                                className="py-4 rounded-2xl bg-neutral-900 mb-3 items-center"
                            >
                                <Text className="text-white font-black uppercase tracking-widest text-xs">Apply on duty (OD)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActionOpen(false)} className="py-3 items-center">
                                <Text className="text-neutral-500 font-bold">Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView>
        </View>
    );
}
