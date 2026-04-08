import { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Calendar, Clock } from 'lucide-react-native';
import { api, ApiEnvelope } from '../../src/api/client';
import { formatDateTimeIST } from '../../src/utils/dateIST';
import { useAuthStore } from '../../src/store/useAuthStore';
import { ApprovalTimeline, type TimelineStep } from '../../src/components/ApprovalTimeline';
import { canActionLoans, isManagementRole } from '../../src/lib/permissions';
import { canCurrentUserActOnLoanItem } from '../../src/utils/workflowPermissions';
import { SkeletonBlock } from '../../src/components/Skeleton';
import { EmployeeMetaCard } from '../../src/components/EmployeeMetaCard';

function statusBadge(status: string): { wrap: string; text: string } {
    const s = (status || '').toLowerCase();
    if (s.includes('approv') || s === 'disbursed' || s === 'active' || s === 'completed') return { wrap: 'bg-emerald-100', text: 'text-emerald-800' };
    if (s.includes('reject') || s.includes('cancel')) return { wrap: 'bg-rose-100', text: 'text-rose-800' };
    if (s.includes('pending') || s.includes('progress')) return { wrap: 'bg-amber-100', text: 'text-amber-900' };
    return { wrap: 'bg-neutral-100', text: 'text-neutral-700' };
}

function buildLoanTimeline(row: Record<string, unknown> | null): TimelineStep[] {
    if (!row) return [];
    const status = String(row.status ?? '');
    const workflow = (row.workflow as { history?: Array<Record<string, unknown>> } | undefined) || {};
    const history = Array.isArray(workflow.history) ? workflow.history : [];
    const approvals = (row.approvals as Record<string, Record<string, unknown> | undefined> | undefined) || {};

    const pickHistory = (step: string) =>
        history
            .filter((h) => String(h.step ?? '').toLowerCase() === step)
            .sort((a, b) => new Date(String(b.timestamp ?? 0)).getTime() - new Date(String(a.timestamp ?? 0)).getTime())[0];

    const submitted = history
        .filter((h) => String(h.action ?? '') === 'submitted')
        .sort((a, b) => new Date(String(a.timestamp ?? 0)).getTime() - new Date(String(b.timestamp ?? 0)).getTime())[0];

    const mapStep = (
        stepOrder: number,
        label: string,
        stepKey: 'employee' | 'hod' | 'manager' | 'hr' | 'final'
    ): TimelineStep => {
        if (stepKey === 'employee') {
            return {
                stepOrder,
                label,
                status: submitted ? 'submitted' : 'pending',
                actionByName: submitted ? String(submitted.actionByName ?? '') : undefined,
                updatedAt: submitted ? String(submitted.timestamp ?? '') : undefined,
            };
        }
        const ap = approvals[stepKey];
        const hist = pickHistory(stepKey);
        const stepStatus = String(ap?.status ?? '');
        return {
            stepOrder,
            label,
            status: stepStatus || (hist ? String(hist.action ?? '') : 'pending'),
            actionByName: String(ap?.approvedByName ?? hist?.actionByName ?? ''),
            comments: String(ap?.comments ?? hist?.comments ?? ''),
            updatedAt: String(ap?.approvedAt ?? hist?.timestamp ?? ''),
        };
    };

    const steps: TimelineStep[] = [
        mapStep(1, 'Applied', 'employee'),
        mapStep(2, 'HOD', 'hod'),
    ];
    const hasManagerStage =
        String(status).includes('manager') ||
        !!approvals.manager?.status ||
        history.some((h) => String(h.step ?? '').toLowerCase() === 'manager');
    if (hasManagerStage) {
        steps.push(mapStep(3, 'Manager', 'manager'));
    }
    steps.push(mapStep(hasManagerStage ? 4 : 3, 'HR', 'hr'));
    steps.push(mapStep(hasManagerStage ? 5 : 4, 'Final', 'final'));
    return steps;
}

function nodeName(v: unknown): string {
    if (!v) return '—';
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null && 'name' in v) return String((v as { name?: unknown }).name || '—');
    return '—';
}

export default function LoanDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [row, setRow] = useState<Record<string, unknown> | null>(null);
    const [allowHigherAuthority, setAllowHigherAuthority] = useState(false);
    const [transactions, setTransactions] = useState<Array<Record<string, unknown>>>([]);
    const [remarks, setRemarks] = useState('');
    const [acting, setActing] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [res, txRes] = await Promise.all([api.getLoan(String(id)), api.getLoanTransactions(String(id))]);
            const body = res.data as ApiEnvelope & Record<string, unknown>;
            const txBody = txRes.data as ApiEnvelope<{ transactions?: Array<Record<string, unknown>> }>;
            if (body.success && body.data) setRow(body.data as Record<string, unknown>);
            else Alert.alert('Error', String(body.message || body.error || 'Could not load record'));
            setTransactions(Array.isArray(txBody.data?.transactions) ? txBody.data!.transactions : []);
            if (body.success && body.data) {
                try {
                    const data = body.data as { requestType?: 'loan' | 'salary_advance' };
                    const type = data.requestType === 'salary_advance' ? 'salary_advance' : 'loan';
                    const settingsRes = await api.getLoanSettings(type);
                    const settingsBody = settingsRes.data as ApiEnvelope<Record<string, unknown>>;
                    const wf = (settingsBody.data as { workflow?: { allowHigherAuthorityToApproveLowerLevels?: boolean } } | undefined)?.workflow;
                    setAllowHigherAuthority(!!wf?.allowHigherAuthorityToApproveLowerLevels);
                } catch {
                    setAllowHigherAuthority(false);
                }
            }
        } catch {
            Alert.alert('Error', 'Network error');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const status = String(row?.status ?? '');
    const canCancel = ['pending', 'hod_approved', 'manager_approved', 'hr_approved'].includes(status);
    const canApproveReject =
        canActionLoans(user) &&
        canCurrentUserActOnLoanItem({
            item: row as unknown as { status?: string; workflow?: { [k: string]: unknown } },
            user,
            allowHigherAuthority,
        });
    const showEmployeeMeta = isManagementRole(user);
    const b = statusBadge(status);
    const isLoan = String(row?.requestType ?? '') === 'loan';
    const amount = Number(row?.amount ?? 0);
    const duration = Number(row?.duration ?? 0);
    const appliedAt = row?.appliedAt ? formatDateTimeIST(row.appliedAt) : '';
    const loanConfig = (row?.loanConfig as { emiAmount?: number; totalInterest?: number; totalAmount?: number } | undefined) || {};
    const advanceConfig = (row?.advanceConfig as { deductionPerCycle?: number } | undefined) || {};
    const repayment = (row?.repayment as { totalPaid?: number; remainingBalance?: number; installmentsPaid?: number; totalInstallments?: number; nextPaymentDate?: string } | undefined) || {};
    const guarantors = (row?.guarantors as Array<{ emp_no?: string; name?: string; status?: string; actionAt?: string; remarks?: string }> | undefined) || [];
    const myEmpNo = String(user?.emp_no ?? '').trim().toUpperCase();
    const myGuarantor = guarantors.find((g) => String(g.emp_no ?? '').trim().toUpperCase() === myEmpNo);
    const canRespondAsGuarantor = !!myGuarantor && myGuarantor.status === 'pending' && status !== 'cancelled';
    const history = (row?.workflow as { history?: Array<{ action?: string; step?: string; actionByName?: string; timestamp?: string }> } | undefined)?.history || [];
    const timelineSteps = buildLoanTimeline(row);
    const emp = row?.employeeId as
        | {
              emp_no?: string;
              employee_name?: string;
              first_name?: string;
              last_name?: string;
              designation?: unknown;
              designation_id?: unknown;
              department?: unknown;
              department_id?: unknown;
              division?: unknown;
              division_id?: unknown;
          }
        | undefined;
    const empName = String(emp?.employee_name || [emp?.first_name, emp?.last_name].filter(Boolean).join(' ') || '—');
    const empNo = String(emp?.emp_no || row?.emp_no || '—');
    const desig = nodeName(emp?.designation || emp?.designation_id || (row as Record<string, unknown> | null)?.designation);
    const dep = nodeName(emp?.department || emp?.department_id || (row as Record<string, unknown> | null)?.department);
    const div = nodeName(emp?.division || emp?.division_id || (row as Record<string, unknown> | null)?.division);

    const onCancel = () => {
        Alert.alert('Withdraw request', 'Cancel this request?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Withdraw',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await api.cancelLoan(String(id));
                        const body = res.data as ApiEnvelope;
                        if (body.success) {
                            Alert.alert('Done', 'Request cancelled.');
                            router.back();
                        } else Alert.alert('Failed', body.message || body.error || 'Try again');
                    } catch {
                        Alert.alert('Error', 'Network error');
                    }
                },
            },
        ]);
    };

    const onGuarantorAction = (action: 'accepted' | 'rejected') => {
        Alert.alert(
            action === 'accepted' ? 'Accept as guarantor' : 'Reject as guarantor',
            `Are you sure you want to ${action === 'accepted' ? 'accept' : 'reject'} this guarantor request?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: action === 'accepted' ? 'Accept' : 'Reject',
                    style: action === 'accepted' ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            setActing(true);
                            const res = await api.processGuarantorAction(String(id), action, remarks.trim() || undefined);
                            const body = res.data as ApiEnvelope;
                            if (body.success) {
                                Alert.alert('Done', `Request ${action}.`);
                                setRemarks('');
                                await load();
                            } else {
                                Alert.alert('Failed', body.message || body.error || 'Could not process action.');
                            }
                        } catch {
                            Alert.alert('Error', 'Network error');
                        } finally {
                            setActing(false);
                        }
                    },
                },
            ]
        );
    };

    const onDecision = (action: 'approve' | 'reject') => {
        Alert.alert(
            action === 'approve' ? 'Approve request' : 'Reject request',
            `Are you sure you want to ${action} this request?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: action === 'approve' ? 'Approve' : 'Reject',
                    style: action === 'approve' ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            const res = await api.processLoanAction(String(id), action);
                            const body = res.data as ApiEnvelope;
                            if (!body.success) throw new Error(body.message || body.error || 'Could not process action');
                            await load();
                        } catch (e) {
                            Alert.alert('Action failed', e instanceof Error ? e.message : 'Could not process action');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <LinearGradient colors={['#FFFFFE', '#F7FEE7', '#FFFFFF']} className="absolute inset-0" />
            <SafeAreaView className="flex-1">
                <View className="flex-row items-center px-6 pb-4 pt-2">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mr-3 h-12 w-12 items-center justify-center rounded-2xl border-2 border-neutral-100 bg-white"
                    >
                        <ChevronLeft size={24} color="#0F172A" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Finance</Text>
                        <Text className="text-xl font-black text-neutral-900">Request details</Text>
                    </View>
                </View>

                {loading ? (
                    <View className="flex-1 px-6 pt-6">
                        <SkeletonBlock height={24} width="30%" />
                        <SkeletonBlock height={48} width="45%" style={{ marginTop: 12 }} />
                        <SkeletonBlock height={170} style={{ marginTop: 14 }} radius={20} />
                        <SkeletonBlock height={140} style={{ marginTop: 14 }} radius={20} />
                        <SkeletonBlock height={130} style={{ marginTop: 14 }} radius={20} />
                    </View>
                ) : !row ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-center font-medium text-neutral-500">No data.</Text>
                    </View>
                ) : (
                    <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                        {timelineSteps.length > 0 ? <ApprovalTimeline steps={timelineSteps} title="Approval progress" /> : null}

                        <View className={`mb-4 self-start rounded-full px-3 py-1 ${b.wrap}`}>
                            <Text className={`text-xs font-black uppercase tracking-wide ${b.text}`}>
                                {status.replace(/_/g, ' ') || '—'}
                            </Text>
                        </View>

                        <View className="mb-4 rounded-[28px] border-2 border-neutral-100 bg-white p-5 shadow-sm">
                            <Text className="text-lg font-black text-neutral-900">{isLoan ? 'Loan' : 'Salary advance'}</Text>
                            <Text className="mt-2 text-base font-bold text-neutral-800">INR {amount.toLocaleString('en-IN')}</Text>
                            <View className="mt-2 flex-row items-center gap-2">
                                <Calendar size={16} color="#64748B" />
                                <Text className="font-medium text-neutral-600">{duration} month(s)</Text>
                            </View>
                            {appliedAt ? (
                                <View className="mt-2 flex-row items-center gap-2">
                                    <Clock size={16} color="#64748B" />
                                    <Text className="text-sm text-neutral-600">Applied (IST): {appliedAt}</Text>
                                </View>
                            ) : null}
                        </View>

                        <View className="mb-4 rounded-[28px] border-2 border-neutral-100 bg-white p-5">
                            <Text className="mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">Reason</Text>
                            <Text className="font-medium leading-6 text-neutral-800">{String(row.reason ?? '—')}</Text>
                            {row.remarks ? <Text className="mt-3 text-sm text-neutral-600">Remarks: {String(row.remarks)}</Text> : null}
                        </View>
                        {showEmployeeMeta ? (
                            <EmployeeMetaCard
                                empNo={empNo}
                                empName={empName}
                                designation={desig}
                                division={div}
                                department={dep}
                            />
                        ) : null}

                        {guarantors.length > 0 ? (
                            <View className="mb-4 rounded-[28px] border-2 border-neutral-100 bg-white p-5">
                                <Text className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                    Guarantor status ({guarantors.filter((g) => g.status === 'accepted').length}/{guarantors.length} accepted)
                                </Text>
                                {guarantors.map((g, idx) => (
                                    <View key={`${g.emp_no || idx}`} className={`${idx ? 'mt-3 border-t border-neutral-100 pt-3' : ''}`}>
                                        <Text className="font-semibold text-neutral-900">{g.name || g.emp_no || 'Guarantor'}</Text>
                                        <Text className="text-xs text-neutral-500">{String(g.emp_no || '')}</Text>
                                        <Text className="mt-1 text-xs font-bold uppercase text-neutral-600">{String(g.status || 'pending')}</Text>
                                        {g.actionAt ? <Text className="mt-1 text-xs text-neutral-400">Action: {formatDateTimeIST(g.actionAt)}</Text> : null}
                                        {g.remarks ? <Text className="mt-1 text-xs text-neutral-500">Remarks: {g.remarks}</Text> : null}
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {canRespondAsGuarantor ? (
                            <View className="mb-4 rounded-[28px] border-2 border-blue-100 bg-blue-50 p-5">
                                <Text className="mb-2 text-xs font-black uppercase tracking-widest text-blue-700">Your consent required</Text>
                                <TextInput
                                    value={remarks}
                                    onChangeText={setRemarks}
                                    placeholder="Optional remarks"
                                    className="mb-3 rounded-xl border border-blue-200 bg-white px-3 py-2 text-neutral-900"
                                    placeholderTextColor="#94A3B8"
                                />
                                <View className="flex-row gap-3">
                                    <TouchableOpacity
                                        onPress={() => onGuarantorAction('accepted')}
                                        disabled={acting}
                                        className="flex-1 items-center rounded-xl bg-emerald-600 py-3"
                                    >
                                        <Text className="text-xs font-black uppercase tracking-widest text-white">Accept</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => onGuarantorAction('rejected')}
                                        disabled={acting}
                                        className="flex-1 items-center rounded-xl bg-rose-600 py-3"
                                    >
                                        <Text className="text-xs font-black uppercase tracking-widest text-white">Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : null}

                        {isLoan ? (
                            <View className="mb-6 rounded-[28px] border-2 border-neutral-100 bg-white p-5">
                                <Text className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Loan plan</Text>
                                <Text className="text-sm text-neutral-700">EMI: INR {Number(loanConfig.emiAmount || 0).toLocaleString('en-IN')}</Text>
                                <Text className="mt-1 text-sm text-neutral-700">Interest: INR {Number(loanConfig.totalInterest || 0).toLocaleString('en-IN')}</Text>
                                <Text className="mt-1 text-sm text-neutral-700">Total payable: INR {Number(loanConfig.totalAmount || amount).toLocaleString('en-IN')}</Text>
                            </View>
                        ) : (
                            <View className="mb-6 rounded-[28px] border-2 border-neutral-100 bg-white p-5">
                                <Text className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Advance plan</Text>
                                <Text className="text-sm text-neutral-700">
                                    Deduction per cycle: INR {Number(advanceConfig.deductionPerCycle || 0).toLocaleString('en-IN')}
                                </Text>
                            </View>
                        )}

                        <View className="mb-4 rounded-[28px] border-2 border-neutral-100 bg-white p-5">
                            <Text className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Repayment overview</Text>
                            <Text className="text-sm text-neutral-700">Paid: INR {Number(repayment.totalPaid || 0).toLocaleString('en-IN')}</Text>
                            <Text className="mt-1 text-sm text-neutral-700">Balance: INR {Number(repayment.remainingBalance || 0).toLocaleString('en-IN')}</Text>
                            <Text className="mt-1 text-sm text-neutral-700">
                                Installments: {Number(repayment.installmentsPaid || 0)} / {Number(repayment.totalInstallments || duration)}
                            </Text>
                            {repayment.nextPaymentDate ? (
                                <Text className="mt-1 text-sm text-neutral-700">Next due: {formatDateTimeIST(repayment.nextPaymentDate)}</Text>
                            ) : null}
                        </View>

                        {transactions.length > 0 ? (
                            <View className="mb-4 rounded-[28px] border-2 border-neutral-100 bg-white p-5">
                                <Text className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Recent transactions</Text>
                                {transactions.slice(0, 5).map((t, idx) => (
                                    <View key={idx} className={`${idx ? 'mt-2 border-t border-neutral-100 pt-2' : ''}`}>
                                        <Text className="text-sm font-semibold text-neutral-800">{String(t.transactionType || 'transaction').replace(/_/g, ' ')}</Text>
                                        <Text className="text-xs text-neutral-500">INR {Number(t.amount || 0).toLocaleString('en-IN')}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {history.length > 0 ? (
                            <View className="mb-4 rounded-[28px] border-2 border-neutral-100 bg-white p-5">
                                <Text className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">Workflow history</Text>
                                {history.slice().reverse().slice(0, 6).map((h, idx) => (
                                    <View key={idx} className={`${idx ? 'mt-2 border-t border-neutral-100 pt-2' : ''}`}>
                                        <Text className="text-sm font-semibold text-neutral-800">{String(h.action || '-').replace(/_/g, ' ')}</Text>
                                        <Text className="text-xs text-neutral-500">
                                            {String(h.step || 'step')} · {h.actionByName || 'System'}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        {canCancel ? (
                            <TouchableOpacity
                                onPress={onCancel}
                                className="mb-10 items-center rounded-2xl border-2 border-rose-200 bg-rose-50 py-4"
                            >
                                <Text className="text-xs font-black uppercase tracking-widest text-rose-700">Withdraw request</Text>
                            </TouchableOpacity>
                        ) : (
                            <View className="h-10" />
                        )}
                        {canApproveReject ? (
                            <View className="mb-10 flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => onDecision('approve')}
                                    className="flex-1 items-center rounded-2xl bg-emerald-600 py-4"
                                >
                                    <Text className="text-xs font-black uppercase tracking-widest text-white">Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => onDecision('reject')}
                                    className="flex-1 items-center rounded-2xl bg-rose-600 py-4"
                                >
                                    <Text className="text-xs font-black uppercase tracking-widest text-white">Reject</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}
