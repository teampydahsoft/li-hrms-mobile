import { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
    Linking,
    Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Calendar, Clock, MapPin, ExternalLink } from 'lucide-react-native';
import { api, ApiEnvelope } from '../../src/api/client';
import { ApprovalTimeline, type TimelineStep } from '../../src/components/ApprovalTimeline';
import { formatDateRangeIST, formatDateTimeIST } from '../../src/utils/dateIST';
import { useAuthStore } from '../../src/store/useAuthStore';
import { canActionLeaves, isManagementRole } from '../../src/lib/permissions';
import { canCurrentUserActOnLeaveLikeItem } from '../../src/utils/workflowPermissions';
import { SkeletonBlock } from '../../src/components/Skeleton';
import { EmployeeMetaCard } from '../../src/components/EmployeeMetaCard';

type ChainStep = TimelineStep;

function googleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

function openMaps(lat: number, lng: number) {
    const url = googleMapsUrl(lat, lng);
    Linking.openURL(url).catch(() => {
        Alert.alert('Maps', 'Could not open maps.');
    });
}

function parseGeo(
    row: Record<string, unknown> | null
): { latitude: number; longitude: number; address?: string; capturedAt?: string; source: 'geoLocation' | 'exif' } | null {
    if (!row) return null;
    const geo = row.geoLocation as {
        latitude?: number | string;
        longitude?: number | string;
        address?: string;
        capturedAt?: string;
    } | undefined;
    if (geo != null) {
        const lat = Number(geo.latitude);
        const lng = Number(geo.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return {
                latitude: lat,
                longitude: lng,
                address: geo.address,
                capturedAt: geo.capturedAt != null ? String(geo.capturedAt) : undefined,
                source: 'geoLocation',
            };
        }
    }
    const photo = row.photoEvidence as { exifLocation?: { latitude?: number | string; longitude?: number | string } } | undefined;
    const exif = photo?.exifLocation;
    if (exif != null) {
        const lat = Number(exif.latitude);
        const lng = Number(exif.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { latitude: lat, longitude: lng, source: 'exif' };
        }
    }
    return null;
}

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

export default function ODDetailScreen() {
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
                api.getOD(String(id)),
                api.getLeaveSettings('od'),
            ]);
            const body = res.data as ApiEnvelope & Record<string, unknown>;
            if (body.success && body.data) setRow(body.data as Record<string, unknown>);
            else Alert.alert('Error', (body.message as string) || 'Could not load OD');
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
            isOD: true,
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

    const photo = row?.photoEvidence as { url?: string; exifLocation?: { latitude?: number; longitude?: number } } | undefined;
    const photoUrl = photo?.url;
    const geoParsed = parseGeo(row);

    const onCancel = () => {
        Alert.alert('Withdraw application', 'Cancel this on-duty request?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Withdraw',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await api.cancelOD(String(id));
                        const body = res.data as ApiEnvelope;
                        if (body.success) {
                            Alert.alert('Done', 'OD request withdrawn.');
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
            action === 'approve' ? 'Approve OD' : 'Reject OD',
            `Are you sure you want to ${action} this request?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: action === 'approve' ? 'Approve' : 'Reject',
                    style: action === 'approve' ? 'default' : 'destructive',
                    onPress: async () => {
                        try {
                            const res = await api.processODAction(String(id), action);
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

    const b = statusBadge(status);
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
                        <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">On duty</Text>
                        <Text className="text-neutral-900 text-xl font-black">Details</Text>
                    </View>
                </View>

                {loading ? (
                    <View className="flex-1 px-6 pt-6">
                        <SkeletonBlock height={24} width="30%" />
                        <SkeletonBlock height={48} width="45%" style={{ marginTop: 12 }} />
                        <SkeletonBlock height={180} style={{ marginTop: 14 }} radius={20} />
                        <SkeletonBlock height={220} style={{ marginTop: 14 }} radius={20} />
                        <SkeletonBlock height={56} style={{ marginTop: 14 }} radius={16} />
                    </View>
                ) : !row ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Text className="text-neutral-500 text-center font-medium">No data.</Text>
                    </View>
                ) : (
                    <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
                        {chain.length > 0 ? <ApprovalTimeline steps={chain} title="OD approval progress" /> : null}

                        <View className={`self-start px-3 py-1 rounded-full mb-4 ${b.wrap}`}>
                            <Text className={`text-xs font-black uppercase tracking-wide ${b.text}`}>
                                {status.replace(/_/g, ' ') || '—'}
                            </Text>
                        </View>

                        <View className="bg-white rounded-[28px] border-2 border-neutral-100 p-5 mb-4 shadow-sm">
                            <Text className="text-neutral-900 font-black text-lg">{String(row.odType ?? 'OD')}</Text>
                            <Text className="text-neutral-500 text-sm mt-1 font-medium">
                                Mode: {String(row.odType_extended ?? 'full_day').replace('_', ' ')}
                            </Text>
                            {row.odType_extended === 'hours' && (row.odStartTime || row.odEndTime) ? (
                                <Text className="text-neutral-600 text-sm mt-2">
                                    {String(row.odStartTime)} – {String(row.odEndTime)}
                                    {row.durationHours != null ? ` (${row.durationHours}h)` : ''}
                                </Text>
                            ) : null}
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
                            {row.placeVisited ? (
                                <View className="flex-row items-start mt-3 gap-2">
                                    <MapPin size={16} color="#64748B" />
                                    <Text className="text-neutral-700 flex-1 font-medium">{String(row.placeVisited)}</Text>
                                </View>
                            ) : null}
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

                        {(photoUrl || geoParsed) ? (
                            <View className="mb-4 rounded-[28px] border-2 border-neutral-100 bg-neutral-50/80 p-4">
                                <Text className="mb-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                    Evidence & location
                                </Text>
                                {photoUrl ? (
                                    <View className="mb-4 overflow-hidden rounded-2xl border border-neutral-100 bg-white">
                                        <Text className="px-4 pt-3 pb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                            Photo evidence
                                        </Text>
                                        <Image
                                            source={{ uri: photoUrl }}
                                            style={{ width: '100%', height: 220 }}
                                            resizeMode="cover"
                                        />
                                    </View>
                                ) : null}
                                {geoParsed ? (
                                    <View className="rounded-2xl border border-neutral-100 bg-white p-4">
                                        <View className="mb-2 flex-row items-center gap-2">
                                            <MapPin size={18} color="#ef4444" strokeWidth={2.5} />
                                            <Text className="text-xs font-black uppercase tracking-widest text-neutral-700">
                                                {geoParsed.source === 'exif' ? 'Location (from photo EXIF)' : 'Live location'}
                                            </Text>
                                        </View>
                                        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
                                            <Text className="text-xs text-neutral-600">
                                                <Text className="font-bold text-neutral-400">Lat: </Text>
                                                <Text className="font-mono">{geoParsed.latitude.toFixed(6)}</Text>
                                            </Text>
                                            <Text className="text-xs text-neutral-600">
                                                <Text className="font-bold text-neutral-400">Lon: </Text>
                                                <Text className="font-mono">{geoParsed.longitude.toFixed(6)}</Text>
                                            </Text>
                                        </View>
                                        {geoParsed.address ? (
                                            <View className="mt-3 border-t border-neutral-100 pt-3">
                                                <Text className="text-[10px] font-bold uppercase text-neutral-400">Address</Text>
                                                <Text className="mt-1 text-xs font-medium leading-5 text-neutral-700">{geoParsed.address}</Text>
                                            </View>
                                        ) : null}
                                        {geoParsed.capturedAt ? (
                                            <Text className="mt-2 text-[10px] text-neutral-500">
                                                Captured (IST): {formatDateTimeIST(geoParsed.capturedAt)}
                                            </Text>
                                        ) : null}
                                        <TouchableOpacity
                                            onPress={() => openMaps(geoParsed.latitude, geoParsed.longitude)}
                                            className="mt-3 flex-row items-center justify-center rounded-xl bg-blue-50 py-3"
                                        >
                                            <ExternalLink size={16} color="#2563eb" strokeWidth={2.5} />
                                            <Text className="ml-2 text-[10px] font-black uppercase tracking-wider text-blue-600">
                                                View on Google Maps
                                            </Text>
                                        </TouchableOpacity>
                                        {Platform.OS === 'ios' ? (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    Linking.openURL(
                                                        `http://maps.apple.com/?ll=${geoParsed.latitude},${geoParsed.longitude}&q=Location`
                                                    ).catch(() => Alert.alert('Maps', 'Could not open Apple Maps.'));
                                                }}
                                                className="mt-2 flex-row items-center justify-center rounded-xl border border-neutral-200 py-2.5"
                                            >
                                                <Text className="text-[10px] font-black uppercase tracking-wider text-neutral-700">
                                                    Open in Apple Maps
                                                </Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                ) : photoUrl ? (
                                    <Text className="text-xs text-neutral-500">No GPS coordinates stored for this request.</Text>
                                ) : null}
                            </View>
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

                        {appliedLabel ? (
                            <View className="flex-row items-center gap-2 mb-6 opacity-90">
                                <Text className="text-neutral-600 text-xs">Submitted (IST): {appliedLabel}</Text>
                            </View>
                        ) : null}

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
                        <View className="h-8" />
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}
