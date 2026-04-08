import { useCallback, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Alert,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banknote, ChevronRight, Plus, Funnel, Search, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { api, ApiEnvelope } from '../../src/api/client';
import { canActionLoans, canApplyLoans, canViewLoansModule, canViewTeamLoans, isManagementRole, permissionDebugSummary } from '../../src/lib/permissions';
import { useAuthStore } from '../../src/store/useAuthStore';
import { canCurrentUserActOnLoanItem } from '../../src/utils/workflowPermissions';
import { SkeletonCard } from '../../src/components/Skeleton';

type OrgNode = string | { _id?: string; name?: string; code?: string };
type LoanRow = {
    _id: string;
    requestType: 'loan' | 'salary_advance';
    amount?: number;
    duration?: number;
    status?: string;
    reason?: string;
    appliedAt?: string;
    emp_no?: string;
    employeeId?: {
        emp_no?: string;
        employee_name?: string;
        first_name?: string;
        last_name?: string;
        designation?: OrgNode;
        designation_id?: OrgNode;
        department?: OrgNode & { division?: OrgNode };
        department_id?: OrgNode;
        division?: OrgNode;
        division_id?: OrgNode;
    };
    designation?: OrgNode;
    designation_id?: OrgNode;
    department?: OrgNode;
    department_id?: OrgNode;
    division?: OrgNode;
    division_id?: OrgNode;
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

function nodeName(v: unknown): string {
    if (!v) return '—';
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null && 'name' in v) return String((v as { name?: unknown }).name || '—');
    return '—';
}

function employeeDisplay(row: LoanRow): {
    empNo: string;
    name: string;
    designation: string;
    division: string;
    department: string;
} {
    const emp = row.employeeId;
    const name = String(emp?.employee_name || [emp?.first_name, emp?.last_name].filter(Boolean).join(' ') || '—');
    const department =
        nodeName(emp?.department) !== '—' ? nodeName(emp?.department) : nodeName(emp?.department_id || row.department || row.department_id);
    const division =
        nodeName((emp?.department as { division?: unknown } | undefined)?.division) !== '—'
            ? nodeName((emp?.department as { division?: unknown } | undefined)?.division)
            : nodeName(emp?.division || emp?.division_id || row.division || row.division_id);
    return {
        empNo: String(emp?.emp_no || row.emp_no || '—'),
        name,
        designation: nodeName(emp?.designation || emp?.designation_id || row.designation || row.designation_id),
        division,
        department,
    };
}

export default function LoansScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [segment, setSegment] = useState<'loan' | 'salary_advance' | 'guarantor'>('loan');
    const [scopeMode, setScopeMode] = useState<'my' | 'team'>('my');
    const [filter, setFilter] = useState<Filter>('all');
    const [searchText, setSearchText] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rows, setRows] = useState<LoanRow[]>([]);
    const [guarantorRows, setGuarantorRows] = useState<LoanRow[]>([]);
    const [pendingRows, setPendingRows] = useState<LoanRow[]>([]);
    const [loanAllowHigherAuthority, setLoanAllowHigherAuthority] = useState(false);
    const [advanceAllowHigherAuthority, setAdvanceAllowHigherAuthority] = useState(false);
    const hasTeamView = canViewTeamLoans(user);
    const hasActionPermission = canActionLoans(user);
    const canViewModule = canViewLoansModule(user);
    const canApply = canApplyLoans(user);
    const showEmployeeMeta = isManagementRole(user);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            if (segment === 'guarantor') {
                const res = await api.getGuarantorRequests();
                const body = res.data as ApiEnvelope<LoanRow[]>;
                setGuarantorRows(Array.isArray(body.data) ? body.data : []);
            } else {
                try {
                    const [loanSettingsRes, advanceSettingsRes] = await Promise.all([
                        api.getLoanSettings('loan'),
                        api.getLoanSettings('salary_advance'),
                    ]);
                    const loanSettingsBody = loanSettingsRes.data as ApiEnvelope<Record<string, unknown>>;
                    const advanceSettingsBody = advanceSettingsRes.data as ApiEnvelope<Record<string, unknown>>;
                    const loanWorkflow = (loanSettingsBody.data as { workflow?: { allowHigherAuthorityToApproveLowerLevels?: boolean } } | undefined)?.workflow;
                    const advanceWorkflow = (advanceSettingsBody.data as { workflow?: { allowHigherAuthorityToApproveLowerLevels?: boolean } } | undefined)?.workflow;
                    setLoanAllowHigherAuthority(!!loanWorkflow?.allowHigherAuthorityToApproveLowerLevels);
                    setAdvanceAllowHigherAuthority(!!advanceWorkflow?.allowHigherAuthorityToApproveLowerLevels);
                } catch {
                    setLoanAllowHigherAuthority(false);
                    setAdvanceAllowHigherAuthority(false);
                }
                const res = await (scopeMode === 'team' && hasTeamView
                    ? api.getLoans({
                        requestType: segment,
                        status: statusForApi(filter),
                    })
                    : api.getMyLoans({
                    requestType: segment,
                    status: statusForApi(filter),
                }));
                const body = res.data as ApiEnvelope<LoanRow[]>;
                let list = Array.isArray(body.data) ? body.data : [];
                const qText = searchText.trim().toLowerCase();
                const fromTs = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
                const toTs = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null;
                list = list.filter((r) => {
                    const meta = employeeDisplay(r);
                    const hay = [
                        String(r.requestType || ''),
                        String(r.status || ''),
                        String(r.reason || ''),
                        String(r.amount || ''),
                        meta.empNo,
                        meta.name,
                        meta.designation,
                        meta.division,
                        meta.department,
                    ].join(' ').toLowerCase();
                    if (qText && !hay.includes(qText)) return false;
                    const appliedTs = r.appliedAt ? new Date(r.appliedAt).getTime() : null;
                    if (fromTs != null && appliedTs != null && appliedTs < fromTs) return false;
                    if (toTs != null && appliedTs != null && appliedTs > toTs) return false;
                    return true;
                });
                setRows(list);
                if (hasTeamView) {
                    const pRes = await api.getPendingLoanApprovals({ limit: 200 });
                    const pBody = pRes.data as ApiEnvelope<LoanRow[]>;
                    setPendingRows(Array.isArray(pBody.data) ? pBody.data : []);
                } else {
                    setPendingRows([]);
                }
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [segment, filter, scopeMode, hasTeamView, searchText, fromDate, toDate]);

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
    const pendingCount = segment === 'guarantor'
        ? guarantorRows.filter((r) => String(r.status || '').toLowerCase().includes('pending')).length
        : (scopeMode === 'team' ? pendingRows.length : rows.filter((r) => String(r.status || '').toLowerCase().includes('pending')).length);

    const onAction = async (id: string, action: 'approve' | 'reject') => {
        try {
            const res = await api.processLoanAction(id, action);
            const body = res.data as ApiEnvelope;
            if (!body.success) throw new Error(body.message || body.error || 'Could not process action');
            await load();
        } catch (e) {
            Alert.alert('Action failed', e instanceof Error ? e.message : 'Could not process action');
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <LinearGradient colors={['#FFFFFE', '#F7FEE7', '#FFFFFF']} className="absolute inset-0" />
            <SafeAreaView className="flex-1">
                {!canViewModule ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-neutral-700 text-center font-semibold">You do not have access to Finance module.</Text>
                    </View>
                ) : (
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
                            {__DEV__ ? (
                                <Text className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
                                    {permissionDebugSummary(user)}
                                </Text>
                            ) : null}
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push('/apply-loan')}
                            className="h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30"
                            disabled={(scopeMode === 'team' && segment !== 'guarantor') || !canApply}
                        >
                            <Plus size={28} color="white" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>

                    {hasTeamView && segment !== 'guarantor' ? (
                        <View className="mb-4 flex-row rounded-2xl border-2 border-neutral-100 bg-white p-1">
                            {(['my', 'team'] as const).map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setScopeMode(m)}
                                    className={`flex-1 items-center rounded-xl py-3 ${scopeMode === m ? 'bg-neutral-900' : ''}`}
                                >
                                    <Text className={`text-xs font-black uppercase tracking-widest ${scopeMode === m ? 'text-white' : 'text-neutral-500'}`}>
                                        {m === 'my' ? 'My requests' : 'Team inbox'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : null}

                    {segment !== 'guarantor' ? (
                        <View className="mb-4 rounded-2xl border-2 border-neutral-50 bg-white p-4">
                            <Text className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Pending</Text>
                            <Text className="mt-1 text-2xl font-black text-neutral-900">{pendingCount}</Text>
                        </View>
                    ) : null}

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
                        <View className="mb-3 flex-row items-center gap-2">
                            <View className="flex-1 flex-row items-center rounded-2xl border-2 border-neutral-100 bg-white px-3">
                                <Search size={16} color="#64748B" />
                                <TextInput
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    placeholder="Search employee, reason, amount"
                                    placeholderTextColor="#94A3B8"
                                    className="ml-2 h-11 flex-1 text-sm text-neutral-800"
                                />
                                {searchText ? (
                                    <TouchableOpacity onPress={() => setSearchText('')} className="p-1">
                                        <X size={14} color="#94A3B8" />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                            <TouchableOpacity
                                onPress={() => setFiltersOpen((v) => !v)}
                                className={`h-11 w-11 items-center justify-center rounded-2xl border-2 ${
                                    filtersOpen ? 'border-emerald-300 bg-emerald-50' : 'border-neutral-100 bg-white'
                                }`}
                            >
                                <Funnel size={16} color={filtersOpen ? '#047857' : '#475569'} />
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {segment !== 'guarantor' && filtersOpen ? (
                        <View className="mb-4 rounded-2xl border-2 border-neutral-100 bg-white p-3">
                            <View className="flex-row gap-2">
                                <View className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
                                    <Text className="pt-2 text-[9px] font-black uppercase tracking-wider text-neutral-500">From date</Text>
                                    <TextInput
                                        value={fromDate}
                                        onChangeText={setFromDate}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94A3B8"
                                        className="h-9 text-xs text-neutral-800"
                                    />
                                </View>
                                <View className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
                                    <Text className="pt-2 text-[9px] font-black uppercase tracking-wider text-neutral-500">To date</Text>
                                    <TextInput
                                        value={toDate}
                                        onChangeText={setToDate}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94A3B8"
                                        className="h-9 text-xs text-neutral-800"
                                    />
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    setFromDate('');
                                    setToDate('');
                                    setSearchText('');
                                    setFilter('all');
                                }}
                                className="mt-3 self-start rounded-lg bg-neutral-100 px-3 py-1.5"
                            >
                                <Text className="text-[10px] font-black uppercase tracking-wider text-neutral-700">Clear all</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

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
                        <View className="pb-28">
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonCard />
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
                                const meta = employeeDisplay(r);
                                const allowHigher = r.requestType === 'salary_advance' ? advanceAllowHigherAuthority : loanAllowHigherAuthority;
                                return (
                                    <TouchableOpacity
                                        key={r._id}
                                        onPress={() => router.push(`/loan/${r._id}`)}
                                        activeOpacity={0.9}
                                        className="rounded-[28px] border-2 border-neutral-50 bg-white p-5 shadow-sm"
                                    >
                                        <View className="flex-row items-center">
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
                                            {showEmployeeMeta ? (
                                                <View className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2">
                                                    <Text className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                                                        {meta.empNo} · {meta.name}
                                                    </Text>
                                                    <Text className="mt-1 text-[10px] text-neutral-600">
                                                        {meta.designation} · {meta.division} · {meta.department}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <ChevronRight size={22} color="#94A3B8" strokeWidth={2.5} />
                                        </View>
                                        {scopeMode === 'team' &&
                                            segment !== 'guarantor' &&
                                            hasActionPermission &&
                                            canCurrentUserActOnLoanItem({
                                                item: r as unknown as { status?: string; workflow?: { [k: string]: unknown } },
                                                user,
                                                allowHigherAuthority: allowHigher,
                                            }) ? (
                                            <View className="mt-4 flex-row gap-2">
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        Alert.alert('Approve request', 'Proceed with approval?', [
                                                            { text: 'No', style: 'cancel' },
                                                            { text: 'Approve', onPress: () => { void onAction(r._id, 'approve'); } },
                                                        ])
                                                    }
                                                    className="flex-1 items-center rounded-xl bg-emerald-600 py-2.5"
                                                >
                                                    <Text className="text-[10px] font-black uppercase tracking-widest text-white">Approve</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        Alert.alert('Reject request', 'Proceed with rejection?', [
                                                            { text: 'No', style: 'cancel' },
                                                            { text: 'Reject', style: 'destructive', onPress: () => { void onAction(r._id, 'reject'); } },
                                                        ])
                                                    }
                                                    className="flex-1 items-center rounded-xl bg-rose-600 py-2.5"
                                                >
                                                    <Text className="text-[10px] font-black uppercase tracking-widest text-white">Reject</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}
