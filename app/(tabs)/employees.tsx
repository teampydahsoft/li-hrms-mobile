import { useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    RefreshControl,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Building2, IdCard, Search, ShieldCheck, Users } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { api, ApiEnvelope } from '../../src/api/client';
import { useAuthStore } from '../../src/store/useAuthStore';
import { canViewEmployeesModule, isManagementRole } from '../../src/lib/permissions';
import { SkeletonCard } from '../../src/components/Skeleton';

type OrgNode = string | { _id?: string; name?: string; code?: string };
type EmployeeRow = {
    _id?: string;
    emp_no?: string;
    employee_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    designation?: OrgNode;
    designation_id?: OrgNode;
    department?: OrgNode;
    department_id?: OrgNode;
    division?: OrgNode;
    division_id?: OrgNode;
    is_active?: boolean;
};

function nodeName(v: unknown): string {
    if (!v) return '—';
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null && 'name' in v) return String((v as { name?: unknown }).name || '—');
    return '—';
}

function empName(row: EmployeeRow): string {
    return String(row.employee_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || '—');
}

export default function EmployeesScreen() {
    const user = useAuthStore((s) => s.user);
    const canViewModule = canViewEmployeesModule(user);
    const isMgmt = isManagementRole(user);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState<EmployeeRow[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.getEmployees({
                is_active: true,
                page: 1,
                limit: 200,
                search: search.trim() || undefined,
            });
            const body = res.data as ApiEnvelope<unknown>;
            let list: EmployeeRow[] = [];
            if (Array.isArray(body.data)) {
                list = body.data as EmployeeRow[];
            } else if (body.data && typeof body.data === 'object') {
                const maybe = body.data as { data?: unknown[]; employees?: unknown[] };
                if (Array.isArray(maybe.data)) list = maybe.data as EmployeeRow[];
                else if (Array.isArray(maybe.employees)) list = maybe.employees as EmployeeRow[];
            }
            setRows(list);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search]);

    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load])
    );

    const activeCount = useMemo(
        () => rows.filter((r) => r.is_active !== false).length,
        [rows]
    );

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <LinearGradient colors={['#FFFFFE', '#F7FEE7', '#FFFFFF']} className="absolute inset-0" />
            <SafeAreaView className="flex-1">
                {!canViewModule ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-center font-semibold text-neutral-700">You do not have access to Employees module.</Text>
                    </View>
                ) : (
                    <ScrollView
                        className="flex-1 px-6 pt-6"
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor="#10B981" />}
                    >
                        <View className="mb-6">
                            <View className="mb-1 flex-row items-center">
                                <View className="mr-2 h-1 w-8 rounded-full bg-primary" />
                                <Text className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Directory</Text>
                            </View>
                            <Text className="text-3xl font-black tracking-tight text-neutral-900">
                                Employees<Text className="text-primary">.</Text>List
                            </Text>
                            <Text className="mt-1 text-sm font-medium text-neutral-500">
                                {isMgmt ? 'Scoped employee directory for your role access.' : 'Employee list'}
                            </Text>
                        </View>

                        <View className="mb-4 rounded-2xl border-2 border-neutral-100 bg-white p-3">
                            <View className="flex-row items-center rounded-xl border border-neutral-200 bg-neutral-50 px-3">
                                <Search size={16} color="#64748B" />
                                <TextInput
                                    value={search}
                                    onChangeText={setSearch}
                                    onSubmitEditing={() => { void load(); }}
                                    placeholder="Search by employee name or number"
                                    placeholderTextColor="#94A3B8"
                                    className="flex-1 px-2 py-2.5 text-neutral-900"
                                />
                            </View>
                        </View>

                        <View className="mb-4 rounded-2xl border-2 border-neutral-50 bg-white p-4">
                            <Text className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Active employees</Text>
                            <Text className="mt-1 text-2xl font-black text-neutral-900">{activeCount}</Text>
                        </View>

                        {loading && !refreshing ? (
                            <View className="pb-28">
                                <SkeletonCard />
                                <SkeletonCard />
                                <SkeletonCard />
                            </View>
                        ) : rows.length === 0 ? (
                            <View className="mb-24 items-center rounded-[32px] border-2 border-neutral-50 bg-white p-10">
                                <View className="mb-6 h-20 w-20 items-center justify-center rounded-[28px] border border-emerald-100 bg-emerald-50">
                                    <Users size={36} color="#10B981" strokeWidth={2.5} />
                                </View>
                                <Text className="mb-2 text-xl font-black text-neutral-900">No employees</Text>
                                <Text className="text-center font-medium leading-6 text-neutral-500">
                                    No employee records available for your current scope.
                                </Text>
                            </View>
                        ) : (
                            <View className="gap-3 pb-28">
                                {rows.map((r, idx) => (
                                    <View
                                        key={String(r._id || `${r.emp_no}-${idx}`)}
                                        className="rounded-[28px] border border-neutral-100 bg-white p-5 shadow-sm"
                                    >
                                        <View className="mb-3 flex-row items-start justify-between gap-3">
                                            <View className="min-w-0 flex-1">
                                                <Text className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Employee</Text>
                                                <Text className="mt-0.5 text-base font-black text-neutral-900" numberOfLines={1}>
                                                    {empName(r)}
                                                </Text>
                                                <Text className="mt-0.5 text-xs font-semibold text-neutral-500">
                                                    {r.email || 'No work email'}
                                                </Text>
                                            </View>
                                            <View className={`rounded-full border px-2.5 py-1 ${r.is_active === false ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                                                <Text className={`text-[10px] font-black uppercase tracking-wider ${r.is_active === false ? 'text-rose-800' : 'text-emerald-800'}`}>
                                                    {r.is_active === false ? 'Inactive' : 'Active'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="mb-3 flex-row gap-2">
                                            <View className="min-w-0 flex-1 rounded-2xl border border-neutral-100 bg-neutral-50 px-3 py-2">
                                                <View className="flex-row items-center gap-1.5">
                                                    <IdCard size={13} color="#64748B" />
                                                    <Text className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Emp No</Text>
                                                </View>
                                                <Text className="mt-1 text-xs font-black text-neutral-800">{String(r.emp_no || '—')}</Text>
                                            </View>
                                            <View className="min-w-0 flex-1 rounded-2xl border border-neutral-100 bg-neutral-50 px-3 py-2">
                                                <View className="flex-row items-center gap-1.5">
                                                    <ShieldCheck size={13} color="#64748B" />
                                                    <Text className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Designation</Text>
                                                </View>
                                                <Text className="mt-1 text-xs font-black text-neutral-800" numberOfLines={1}>
                                                    {nodeName(r.designation || r.designation_id)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="rounded-2xl border border-neutral-100 bg-neutral-50 px-3 py-3">
                                            <View className="flex-row items-center gap-1.5">
                                                <Building2 size={13} color="#64748B" />
                                                <Text className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Organization</Text>
                                            </View>
                                            <Text className="mt-2 text-xs text-neutral-700">
                                                <Text className="font-bold text-neutral-500">Division: </Text>
                                                {nodeName(r.division || r.division_id)}
                                            </Text>
                                            <Text className="mt-1 text-xs text-neutral-700">
                                                <Text className="font-bold text-neutral-500">Department: </Text>
                                                {nodeName(r.department || r.department_id)}
                                            </Text>
                                            {r.phone_number ? (
                                                <Text className="mt-1 text-xs text-neutral-700">
                                                    <Text className="font-bold text-neutral-500">Phone: </Text>
                                                    {r.phone_number}
                                                </Text>
                                            ) : null}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}
