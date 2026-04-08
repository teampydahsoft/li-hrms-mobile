import { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Calendar, Clock, User } from 'lucide-react-native';
import { api, ApiEnvelope } from '../../src/api/client';
import { ApprovalTimeline, type TimelineStep } from '../../src/components/ApprovalTimeline';
import { formatDateRangeIST, formatDateTimeIST } from '../../src/utils/dateIST';
import { useAuthStore } from '../../src/store/useAuthStore';
import { canActionLeaves, isManagementRole } from '../../src/lib/permissions';
import { canCurrentUserActOnLeaveLikeItem } from '../../src/utils/workflowPermissions';
import { SkeletonBlock } from '../../src/components/Skeleton';
import { EmployeeMetaCard } from '../../src/components/EmployeeMetaCard';

type ChainStep = TimelineStep;

function statusBadge(status: string): { wrap: string; text: string } {
    const s = (status || '').toLowerCase();
    if (s.includes('approv')) return { wrap: 'bg-emerald-100', text: 'text-emerald-800' };
    if (s.includes('reject')) return { wrap: 'bg-rose-100', text: 'text-rose-800' };
    if (s.includes('pending') || s.includes('progress')) return { wrap: 'bg-amber-100', text: 'text-amber-900' };
    return { wrap: 'bg-neutral-100', text: 'text-neutral-700' };
}

function nodeName(v: unknown): string {
    if (!v) return '—';
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null && 'name' in v) return String((v as { name?: unknown }).name || '—');
    return '—';
}

export default function LeaveDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [row, setRow] = useState<Record<string, unknown> | null>(null);
    const [allowHigherAuthority, setAllowHigherAuthority] = useState(false);
    const { user } = useAuthStore();

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [res, settingsRes] = await Promise.all([
                api.getLeave(String(id)),
                api.getLeaveSettings('leave'),
            ]);
            const body = res.data as ApiEnvelope & Record<string, unknown>;
            if (body.success && body.data) setRow(body.data as Record<string, unknown>);
            else Alert.alert('Error', (body.message as string) || 'Could not load leave');
            const settingsBody = settingsRes.data as ApiEnvelope<Record<string, unknown>>;
            const wf = (settingsBody.data as { workflow?: { allowHigherAuthorityToApproveLowerLevels?: boolean } } | undefined)?.workflow;
            setAllowHigherAuthority(!!wf?.allowHigherAuthorityToApproveLowerLevels);
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
    const canCancel = status === 'pending' || status === 'in_progress';
    const canApproveReject =
        canActionLeaves(user) &&
        !['approved', 'rejected', 'cancelled'].includes(status) &&
        canCurrentUserActOnLeaveLikeItem({
            item: row as unknown as { status?: string; workflow?: { [k: string]: unknown }; odType?: string },
            user,
            isOD: false,
            allowHigherAuthority,
        });
    const showEmployeeMeta = isManagementRole(user);
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

    const chain = ((row?.workflow as { approvalChain?: ChainStep[] } | undefined)?.approvalChain ||
        []) as ChainStep[];

    const onCancel = () => {
        Alert.alert('Withdraw application', 'Cancel this leave request?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Withdraw',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await api.cancelLeave(String(id));
                        const body = res.data as ApiEnvelope;
                        if (body.success) {
                            Alert.alert('Done', 'Leave request withdrawn.');
                            router.back();
                        } else Alert.alert('Failed', body.message || body.error || 'Try again');
                    } catch {
                        Alert.alert('Error', 'Network error');
                    }
                },
            },
        ]);
    };

    const onAction = (action: 'approve' | 'reject') => {
        Alert.alert(
            action === 'approve' ? 'Approve leave' : 'Reject leave',
            `Are you sure you want to ${action} this request?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: action === 'approve' ? 'Approve' : 'Reject',
                    style: action === 'approve' ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            const res = await api.processLeaveAction(String(id), action);
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

    const sb = statusBadge(status);
    const dateRangeLabel = formatDateRangeIST(row?.fromDate, row?.toDate);
    const appliedLabel = row?.appliedAt ? formatDateTimeIST(row.appliedAt) : '';

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />
            <LinearGradient colors={['#FFFFFE', '#F7FEE7', '#FFFFFF']} className="absolute inset-0" />
            <SafeAreaView className="flex-1">
                <View className="flex-row items-center px-6 pt-2 pb-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-12 h-12 rounded-2xl bg-white border-2 border-neutral-100 items-center justify-center mr-3"
                    >
                        <ChevronLeft size={24} color="#0F172A" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">Leave</Text>
                        <Text className="text-neutral-900 text-xl font-black">Details</Text>
                    </View>
                </View>

                {loading ? (
                    <View className="flex-1 px-6 pt-6">
                        <SkeletonBlock height={24} width="30%" />
                        <SkeletonBlock height={48} width="45%" style={{ marginTop: 12 }} />
                        <SkeletonBlock height={180} style={{ marginTop: 14 }} radius={20} />
                        <SkeletonBlock height={140} style={{ marginTop: 14 }} radius={20} />
                        <SkeletonBlock height={56} style={{ marginTop: 14 }} radius={16} />
                    </View>
                ) : !row ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-neutral-500 text-center font-medium">No data.</Text>
                    </View>
                ) : (
                    <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                        {chain.length > 0 ? <ApprovalTimeline steps={chain} /> : null}

                        <View className={`self-start px-3 py-1 rounded-full mb-4 ${sb.wrap}`}>
                            <Text className={`text-xs font-black uppercase tracking-wide ${sb.text}`}>
                                {status.replace(/_/g, ' ') || '—'}
                            </Text>
                        </View>

                        <View className="bg-white rounded-[28px] border-2 border-neutral-100 p-5 mb-4 shadow-sm">
                            <Text className="text-neutral-900 font-black text-lg mb-1">
                                {String(
                                    (row.leaveType as string) ||
                                        (row as { leave_type?: string }).leave_type ||
                                        'Leave'
                                )}
                            </Text>
                            <View className="flex-row items-center mt-3 gap-2 flex-wrap">
                                <Calendar size={16} color="#64748B" />
                                <Text className="text-neutral-600 font-bold">{dateRangeLabel}</Text>
                            </View>
                            <Text className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider mt-1">Dates shown in IST</Text>
                            <View className="flex-row items-center mt-2 gap-2">
                                <Clock size={16} color="#64748B" />
                                <Text className="text-neutral-600 font-medium">
                                    {Number(row.numberOfDays ?? 0)} day(s)
                                    {row.isHalfDay ? ` · Half: ${String(row.halfDayType ?? '').replace('_', ' ')}` : ''}
                                </Text>
                            </View>
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

                        <View className="bg-white rounded-[28px] border-2 border-neutral-100 p-5 mb-4">
                            <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-2">Purpose</Text>
                            <Text className="text-neutral-800 font-medium leading-6">{String(row.purpose ?? '—')}</Text>
                            {row.contactNumber ? (
                                <Text className="text-neutral-500 text-sm mt-3">Contact: {String(row.contactNumber)}</Text>
                            ) : null}
                            {row.remarks ? (
                                <Text className="text-neutral-600 text-sm mt-3">Remarks: {String(row.remarks)}</Text>
                            ) : null}
                        </View>

                        {row.splitStatus ? (
                            <View className="bg-amber-50 rounded-[28px] border border-amber-100 p-5 mb-4">
                                <Text className="text-amber-900 font-black text-sm">Split status</Text>
                                <Text className="text-amber-800 mt-1">{String(row.splitStatus)}</Text>
                            </View>
                        ) : null}

                        {appliedLabel ? (
                            <View className="flex-row items-center gap-2 mb-8 opacity-90">
                                <User size={14} color="#94A3B8" />
                                <Text className="text-neutral-600 text-xs">Applied (IST): {appliedLabel}</Text>
                            </View>
                        ) : (
                            <View className="h-8" />
                        )}

                        {canCancel && (
                            <TouchableOpacity
                                onPress={onCancel}
                                className="mb-10 py-4 rounded-2xl border-2 border-rose-200 bg-rose-50 items-center"
                            >
                                <Text className="text-rose-700 font-black uppercase tracking-widest text-xs">Withdraw request</Text>
                            </TouchableOpacity>
                        )}
                        {canApproveReject && (
                            <View className="mb-10 flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => onAction('approve')}
                                    className="flex-1 items-center rounded-2xl bg-emerald-600 py-4"
                                >
                                    <Text className="text-xs font-black uppercase tracking-widest text-white">Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => onAction('reject')}
                                    className="flex-1 items-center rounded-2xl bg-rose-600 py-4"
                                >
                                    <Text className="text-xs font-black uppercase tracking-widest text-white">Reject</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}
