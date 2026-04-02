import { useCallback, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banknote, ChevronRight, Plus } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, ApiEnvelope } from '../../src/api/client';

type LoanRow = {
    _id: string;
    requestType: 'loan' | 'salary_advance';
    amount?: number;
    duration?: number;
    status?: string;
    reason?: string;
    appliedAt?: string;
};

const FILTERS = ['all', 'pending', 'approved', 'rejected', 'active', 'completed'] as const;
type Filter = (typeof FILTERS)[number];

function statusBadge(status: string): { wrap: string; text: string } {
    const s = (status || '').toLowerCase();
    if (s.includes('approv') || s === 'disbursed' || s === 'active' || s === 'completed') return { wrap: 'bg-emerald-100', text: 'text-emerald-800' };
    if (s.includes('reject') || s.includes('cancel')) return { wrap: 'bg-rose-100', text: 'text-rose-800' };
    if (s.includes('pending') || s.includes('progress')) return { wrap: 'bg-amber-100', text: 'text-amber-900' };
    return { wrap: 'bg-neutral-100', text: 'text-neutral-700' };
}

function statusForApi(filter: Filter): string | undefined {
    if (filter === 'all') return undefined;
    if (filter === 'approved') return 'approved';
    return filter;
}

export default function LoansScreen() {
    const router = useRouter();
    const [segment, setSegment] = useState<'loan' | 'salary_advance' | 'guarantor'>('loan');
    const [filter, setFilter] = useState<Filter>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rows, setRows] = useState<LoanRow[]>([]);
    const [guarantorRows, setGuarantorRows] = useState<LoanRow[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (segment === 'guarantor') {
                const res = await api.getGuarantorRequests();
                const body = res.data as ApiEnvelope<LoanRow[]>;
                setGuarantorRows(Array.isArray(body.data) ? body.data : []);
            } else {
                const res = await api.getMyLoans({
                    requestType: segment,
                    status: statusForApi(filter),
                });
                const body = res.data as ApiEnvelope<LoanRow[]>;
                const list = Array.isArray(body.data) ? body.data : [];
                setRows(list);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [segment, filter]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    const visibleRows = segment === 'guarantor' ? guarantorRows : rows;

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
                    <View className="mb-6 flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                            <View className="mb-1 flex-row items-center">
                                <View className="mr-2 h-1 w-8 rounded-full bg-primary" />
                                <Text className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Finance</Text>
                            </View>
                            <Text className="text-3xl font-black tracking-tight text-neutral-900">
                                Loans<Text className="text-primary">.</Text>Advances
                            </Text>
                            <Text className="mt-1 text-sm font-medium text-neutral-500">Apply and track your own requests</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push('/apply-loan')}
                            className="h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30"
                        >
                            <Plus size={28} color="white" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>

                    <View className="mb-4 flex-row rounded-2xl border-2 border-neutral-100 bg-white p-1">
                        {(['loan', 'salary_advance', 'guarantor'] as const).map((s) => (
                            <TouchableOpacity
                                key={s}
                                onPress={() => setSegment(s)}
                                className={`flex-1 items-center rounded-xl py-3 ${segment === s ? 'bg-neutral-900' : ''}`}
                            >
                                <Text className={`text-xs font-black uppercase tracking-widest ${segment === s ? 'text-white' : 'text-neutral-500'}`}>
                                    {s === 'loan' ? 'Loans' : s === 'salary_advance' ? 'Salary Advance' : 'Guarantor'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {segment !== 'guarantor' ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-1">
                            <View className="flex-row gap-2 px-1">
                                {FILTERS.map((f) => (
                                    <TouchableOpacity
                                        key={f}
                                        onPress={() => setFilter(f)}
                                        className={`rounded-full border-2 px-4 py-2 ${filter === f ? 'border-primary bg-emerald-50' : 'border-neutral-100 bg-white'}`}
                                    >
                                        <Text className={`text-xs font-bold capitalize ${filter === f ? 'text-emerald-900' : 'text-neutral-600'}`}>
                                            {f}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    ) : null}

                    {loading && !refreshing ? (
                        <View className="items-center py-20">
                            <ActivityIndicator size="large" color="#10B981" />
                        </View>
                    ) : visibleRows.length === 0 ? (
                        <View className="mb-24 items-center rounded-[32px] border-2 border-neutral-50 bg-white p-10">
                            <View className="mb-6 h-20 w-20 items-center justify-center rounded-[28px] border border-emerald-100 bg-emerald-50">
                                <Banknote size={38} color="#10B981" strokeWidth={2.5} />
                            </View>
                            <Text className="mb-2 text-xl font-black text-neutral-900">No records</Text>
                            <Text className="text-center font-medium leading-6 text-neutral-500">
                                {segment === 'guarantor'
                                    ? 'No guarantor requests assigned to you.'
                                    : `No ${segment === 'loan' ? 'loan' : 'salary advance'} applications found for this filter.`}
                            </Text>
                        </View>
                    ) : (
                        <View className="gap-3 pb-28">
                            {visibleRows.map((r) => {
                                const st = String(r.status ?? '');
                                const b = statusBadge(st);
                                const label = segment === 'guarantor'
                                    ? `Guarantor · ${r.requestType === 'loan' ? 'Loan' : 'Salary advance'}`
                                    : r.requestType === 'loan' ? 'Loan' : 'Salary advance';
                                const dateLabel = r.appliedAt ? new Date(r.appliedAt).toLocaleDateString('en-IN') : '—';
                                return (
                                    <TouchableOpacity
                                        key={r._id}
                                        onPress={() => router.push(`/loan/${r._id}`)}
                                        activeOpacity={0.9}
                                        className="flex-row items-center rounded-[28px] border-2 border-neutral-50 bg-white p-5 shadow-sm"
                                    >
                                        <View className="min-w-0 flex-1">
                                            <View className="mb-1 flex-row flex-wrap items-center gap-2">
                                                <Text className="flex-shrink text-base font-black text-neutral-900">{label}</Text>
                                                <View className={`rounded-full px-2 py-0.5 ${b.wrap}`}>
                                                    <Text className={`text-[10px] font-black uppercase ${b.text}`}>
                                                        {st.replace(/_/g, ' ') || '—'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text className="text-sm font-bold text-neutral-700">INR {Number(r.amount || 0).toLocaleString('en-IN')}</Text>
                                            <Text className="mt-0.5 text-xs text-neutral-500">{Number(r.duration || 0)} month(s)</Text>
                                            <Text className="mt-2 text-xs text-neutral-400">Applied: {dateLabel}</Text>
                                            {r.reason ? (
                                                <Text className="mt-1 text-xs text-neutral-400" numberOfLines={2}>
                                                    {r.reason}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <ChevronRight size={22} color="#94A3B8" strokeWidth={2.5} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
