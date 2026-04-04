import { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
    Switch,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Camera, Image as ImageIcon, MapPin } from 'lucide-react-native';
import { api, ApiEnvelope } from '../src/api/client';
import { useAuthStore } from '../src/store/useAuthStore';
import { DateField, formatYmd } from '../src/components/DateField';

type OdTypeOpt = { code: string; name: string; isActive?: boolean };

export default function ApplyODScreen() {
    const router = useRouter();
    const { user, employee, setEmployee } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [types, setTypes] = useState<OdTypeOpt[]>([]);
    const [typeModal, setTypeModal] = useState(false);
    const [policyMin, setPolicyMin] = useState<Date>(() => new Date(Date.now() - 86400000 * 365));
    const [policyMax, setPolicyMax] = useState<Date>(() => new Date(Date.now() + 86400000 * 365));

    const [odType, setOdType] = useState('');
    const [odTypeExtended, setOdTypeExtended] = useState<'full_day' | 'hours'>('full_day');
    const [odStartTime, setOdStartTime] = useState('09:00');
    const [odEndTime, setOdEndTime] = useState('18:00');
    const [fromDate, setFromDate] = useState(() => formatYmd(new Date()));
    const [toDate, setToDate] = useState(() => formatYmd(new Date()));
    const [purpose, setPurpose] = useState('');
    const [placeVisited, setPlaceVisited] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [remarks, setRemarks] = useState('');
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [halfDayType, setHalfDayType] = useState<'first_half' | 'second_half'>('first_half');

    const [evidence, setEvidence] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [locationData, setLocationData] = useState<{
        latitude: number;
        longitude: number;
        address?: string;
        capturedAt: string;
    } | null>(null);
    const [locating, setLocating] = useState(false);

    const requestPhotoPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Photos', 'Photo library access is required to attach OD evidence (same as workspace).');
            return false;
        }
        return true;
    };

    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Camera', 'Camera access is required to capture OD evidence.');
            return false;
        }
        return true;
    };

    const pickFromLibrary = async () => {
        const ok = await requestPhotoPermission();
        if (!ok) return;
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.85,
        });
        if (!res.canceled && res.assets[0]) setEvidence(res.assets[0]);
    };

    const pickFromCamera = async () => {
        const ok = await requestCameraPermission();
        if (!ok) return;
        const res = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.85,
        });
        if (!res.canceled && res.assets[0]) setEvidence(res.assets[0]);
    };

    const captureCurrentLocation = async () => {
        setLocating(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location',
                    'Location permission is required for on-duty applications, matching the workspace (evidence + place verification).'
                );
                return;
            }
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = pos.coords;
            let address = '';
            try {
                const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
                const r = rev[0];
                if (r) {
                    address = [r.name, r.street, r.district, r.city, r.region, r.postalCode]
                        .filter(Boolean)
                        .join(', ');
                }
            } catch {
                /* optional */
            }
            setLocationData({
                latitude,
                longitude,
                address: address || undefined,
                capturedAt: new Date().toISOString(),
            });
            if (address && !placeVisited.trim()) {
                setPlaceVisited(address);
            }
        } catch (e) {
            Alert.alert('Location', e instanceof Error ? e.message : 'Could not read your location.');
        } finally {
            setLocating(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                if (!employee && user?.emp_no) {
                    const er = await api.getEmployee(user.emp_no);
                    const body = er.data as ApiEnvelope;
                    if (body.success && body.data) setEmployee(body.data as never);
                }
                const st = await api.getLeaveSettings('od');
                const envelope = st.data as ApiEnvelope & {
                    data?: { types?: OdTypeOpt[]; settings?: Record<string, unknown> };
                };
                if (envelope.success && envelope.data?.types?.length) {
                    setTypes(envelope.data.types.filter((t) => t.isActive !== false));
                } else {
                    setTypes([
                        { code: 'OFFICIAL', name: 'Official Work' },
                        { code: 'TRAINING', name: 'Training' },
                        { code: 'MEETING', name: 'Meeting' },
                        { code: 'CLIENT', name: 'Client Visit' },
                    ]);
                }
                const s = envelope.data?.settings;
                if (s) {
                    const today = new Date();
                    let minD = new Date(today.getTime() - 86400000 * 365);
                    let maxD = new Date(today.getTime() + 86400000 * 365);
                    const maxBack = Number(s.maxBackdatedDays ?? 30);
                    const maxAdv = Number(s.maxAdvanceDays ?? 90);
                    if (s.allowBackdated !== false) {
                        minD = new Date(today.getTime() - 86400000 * maxBack);
                    }
                    if (s.allowFutureDated !== false) {
                        maxD = new Date(today.getTime() + 86400000 * maxAdv);
                    }
                    setPolicyMin(minD);
                    setPolicyMax(maxD);
                }
            } catch {
                Alert.alert('Error', 'Could not load OD settings');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [employee, user?.emp_no, setEmployee]);

    useEffect(() => {
        const emp = useAuthStore.getState().employee;
        const phone =
            (emp as { phone_number?: string } | null)?.phone_number || (user as { phone?: string } | null)?.phone || '';
        if (phone) setContactNumber(phone);
    }, [employee, user]);

    const selectedTypeLabel = types.find((t) => t.code === odType)?.name || odType || 'Select type';

    const onSubmit = async () => {
        if (!odType || !fromDate || !toDate || !purpose.trim() || !placeVisited.trim()) {
            Alert.alert('Required', 'Fill OD type, dates, place visited, and purpose.');
            return;
        }
        if (odTypeExtended === 'hours' && (!odStartTime || !odEndTime)) {
            Alert.alert('Time', 'Enter start and end time for hours-based OD.');
            return;
        }
        if (!evidence?.uri) {
            Alert.alert('Photo', 'Attach photo evidence (required for OD).');
            return;
        }
        if (!locationData) {
            Alert.alert('Location', 'Capture your current location before submitting (required, same as workspace).');
            return;
        }

        const emp = useAuthStore.getState().employee;
        setSubmitting(true);
        try {
            const uploadRes = await api.uploadEvidence({
                uri: evidence.uri,
                mimeType: evidence.mimeType,
                fileName: evidence.fileName,
            });
            const raw = uploadRes.data as ApiEnvelope & { url?: string; key?: string; data?: { url?: string; key?: string } };
            const photoUrl = raw.url || raw.data?.url;
            const photoKey = raw.key || raw.data?.key;
            const uploadOk = raw.success !== false && !!photoUrl;
            if (!uploadOk) {
                setSubmitting(false);
                Alert.alert('Upload', raw.message || raw.error || 'Evidence upload failed');
                return;
            }

            const payload: Record<string, unknown> = {
                fromDate,
                toDate,
                purpose: purpose.trim(),
                placeVisited: placeVisited.trim(),
                contactNumber: contactNumber.trim(),
                remarks: remarks.trim() || undefined,
                isHalfDay: odTypeExtended === 'hours' ? false : isHalfDay,
                halfDayType: odTypeExtended === 'hours' ? null : isHalfDay ? halfDayType : null,
                odType,
                odType_extended: odTypeExtended,
                photoEvidence: { url: photoUrl, key: photoKey },
                geoLocation: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    capturedAt: locationData.capturedAt,
                    address: locationData.address || '',
                },
            };
            if (odTypeExtended === 'hours') {
                payload.odStartTime = odStartTime;
                payload.odEndTime = odEndTime;
            }

            if (user?.role !== 'employee') {
                const empNo = emp?.emp_no || user?.emp_no;
                if (!empNo) {
                    setSubmitting(false);
                    Alert.alert('Employee', 'Employee reference required.');
                    return;
                }
                payload.empNo = empNo;
            }

            const res = await api.applyOD(payload);
            const body = res.data as ApiEnvelope;
            if (body.success) {
                Alert.alert('Success', 'On-duty request submitted.', [{ text: 'OK', onPress: () => router.back() }]);
            } else {
                Alert.alert('Failed', body.message || body.error || 'Could not submit');
            }
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Network error';
            Alert.alert('Error', msg);
        } finally {
            setSubmitting(false);
        }
    };

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
                        <Text className="text-neutral-400 text-[10px] font-black uppercase tracking-widest">New request</Text>
                        <Text className="text-neutral-900 text-xl font-black">Apply on duty</Text>
                    </View>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#10B981" />
                    </View>
                ) : (
                    <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
                        <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">OD type</Text>
                        <TouchableOpacity
                            onPress={() => setTypeModal(true)}
                            className="bg-white rounded-2xl border-2 border-neutral-100 px-4 py-3.5 mb-4"
                        >
                            <Text className="text-neutral-900 font-bold">{selectedTypeLabel}</Text>
                        </TouchableOpacity>

                        <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Duration mode</Text>
                        <View className="flex-row gap-3 mb-4">
                            {(
                                [
                                    { k: 'full_day' as const, label: 'Full / Half day' },
                                    { k: 'hours' as const, label: 'Hours' },
                                ]
                            ).map((opt) => (
                                <TouchableOpacity
                                    key={opt.k}
                                    onPress={() => setOdTypeExtended(opt.k)}
                                    className={`flex-1 py-3 rounded-2xl border-2 items-center ${odTypeExtended === opt.k ? 'border-primary bg-emerald-50' : 'border-neutral-100 bg-white'}`}
                                >
                                    <Text className="font-bold text-neutral-800 text-center text-sm">{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <DateField label="From date" value={fromDate} onChange={setFromDate} minimumDate={policyMin} maximumDate={policyMax} />
                        <DateField label="To date" value={toDate} onChange={setToDate} minimumDate={policyMin} maximumDate={policyMax} />

                        {odTypeExtended === 'full_day' && (
                            <View className="flex-row items-center justify-between bg-white rounded-2xl border-2 border-neutral-100 px-4 py-3 mb-4">
                                <Text className="text-neutral-900 font-bold">Half day</Text>
                                <Switch
                                    value={isHalfDay}
                                    onValueChange={setIsHalfDay}
                                    trackColor={{ true: '#A7F3D0' }}
                                    thumbColor={isHalfDay ? '#10B981' : '#f4f4f5'}
                                />
                            </View>
                        )}

                        {odTypeExtended === 'full_day' && isHalfDay && (
                            <View className="flex-row gap-3 mb-4">
                                {(['first_half', 'second_half'] as const).map((h) => (
                                    <TouchableOpacity
                                        key={h}
                                        onPress={() => setHalfDayType(h)}
                                        className={`flex-1 py-3 rounded-2xl border-2 items-center ${halfDayType === h ? 'border-primary bg-emerald-50' : 'border-neutral-100 bg-white'}`}
                                    >
                                        <Text className="font-bold text-neutral-800">{h === 'first_half' ? 'First half' : 'Second half'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {odTypeExtended === 'hours' && (
                            <View className="flex-row gap-3 mb-4">
                                <View className="flex-1">
                                    <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Start (HH:MM)</Text>
                                    <TextInput
                                        value={odStartTime}
                                        onChangeText={setOdStartTime}
                                        placeholder="09:00"
                                        className="bg-white rounded-2xl border-2 border-neutral-100 px-4 py-3 text-neutral-900 font-bold"
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">End (HH:MM)</Text>
                                    <TextInput
                                        value={odEndTime}
                                        onChangeText={setOdEndTime}
                                        placeholder="18:00"
                                        className="bg-white rounded-2xl border-2 border-neutral-100 px-4 py-3 text-neutral-900 font-bold"
                                        placeholderTextColor="#94A3B8"
                                    />
                                </View>
                            </View>
                        )}

                        <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Place visited *</Text>
                        <TextInput
                            value={placeVisited}
                            onChangeText={setPlaceVisited}
                            placeholder="Location / client (or use capture location below)"
                            className="bg-white rounded-2xl border-2 border-neutral-100 px-4 py-3 text-neutral-900 font-medium mb-3"
                            placeholderTextColor="#94A3B8"
                        />
                        <TouchableOpacity
                            onPress={captureCurrentLocation}
                            disabled={locating}
                            className="mb-4 flex-row items-center justify-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3"
                        >
                            <MapPin size={20} color="#059669" strokeWidth={2.5} />
                            <Text className="ml-2 font-black text-emerald-800">
                                {locating ? 'Getting location…' : 'Capture current location'}
                            </Text>
                        </TouchableOpacity>
                        {locationData ? (
                            <View className="mb-4 rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                                <Text className="text-[10px] font-black uppercase text-emerald-700">GPS captured</Text>
                                <Text className="mt-1 text-xs text-neutral-600">
                                    {locationData.latitude.toFixed(5)}, {locationData.longitude.toFixed(5)}
                                </Text>
                                {locationData.address ? (
                                    <Text className="mt-1 text-xs text-neutral-500">{locationData.address}</Text>
                                ) : null}
                            </View>
                        ) : (
                            <Text className="mb-4 text-xs font-medium text-amber-800">Location is required before submit (workspace rule).</Text>
                        )}

                        <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Purpose *</Text>
                        <TextInput
                            value={purpose}
                            onChangeText={setPurpose}
                            placeholder="Official purpose"
                            multiline
                            className="bg-white rounded-2xl border-2 border-neutral-100 px-4 py-3 min-h-[88px] text-neutral-900 font-medium mb-4"
                            placeholderTextColor="#94A3B8"
                            textAlignVertical="top"
                        />

                        <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Photo evidence *</Text>
                        <View className="mb-4 flex-row gap-3">
                            <TouchableOpacity
                                onPress={pickFromLibrary}
                                className="flex-1 flex-row items-center justify-center rounded-2xl border-2 border-neutral-200 bg-white py-3"
                            >
                                <ImageIcon size={18} color="#0F172A" strokeWidth={2.5} />
                                <Text className="ml-2 text-xs font-black text-neutral-800">Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={pickFromCamera}
                                className="flex-1 flex-row items-center justify-center rounded-2xl border-2 border-neutral-200 bg-white py-3"
                            >
                                <Camera size={18} color="#0F172A" strokeWidth={2.5} />
                                <Text className="ml-2 text-xs font-black text-neutral-800">Camera</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="mb-4 overflow-hidden rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50">
                            {evidence?.uri ? (
                                <Image
                                    source={{ uri: evidence.uri }}
                                    style={{ width: '100%', height: 220 }}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View className="items-center px-4 py-10">
                                    <Camera size={32} color="#10B981" />
                                    <Text className="mt-2 text-center text-sm font-bold text-neutral-500">Choose a photo to see preview</Text>
                                </View>
                            )}
                        </View>

                        <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Contact number</Text>
                        <TextInput
                            value={contactNumber}
                            onChangeText={setContactNumber}
                            keyboardType="phone-pad"
                            className="bg-white rounded-2xl border-2 border-neutral-100 px-4 py-3 text-neutral-900 font-medium mb-4"
                            placeholderTextColor="#94A3B8"
                        />

                        <Text className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2">Remarks</Text>
                        <TextInput
                            value={remarks}
                            onChangeText={setRemarks}
                            className="bg-white rounded-2xl border-2 border-neutral-100 px-4 py-3 text-neutral-900 font-medium mb-8"
                            placeholderTextColor="#94A3B8"
                        />

                        <TouchableOpacity
                            onPress={onSubmit}
                            disabled={submitting}
                            className={`mb-12 py-4 rounded-2xl items-center ${submitting ? 'bg-emerald-300' : 'bg-primary'}`}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-black uppercase tracking-widest">Submit OD</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                )}

                <Modal visible={typeModal} animationType="slide" transparent>
                    <TouchableOpacity activeOpacity={1} onPress={() => setTypeModal(false)} className="flex-1 bg-black/40 justify-end">
                        <View className="bg-white rounded-t-3xl p-6 max-h-[70%]">
                            <Text className="text-neutral-900 font-black text-lg mb-4">OD type</Text>
                            <ScrollView>
                                {types.map((t) => (
                                    <TouchableOpacity
                                        key={t.code}
                                        onPress={() => {
                                            setOdType(t.code);
                                            setTypeModal(false);
                                        }}
                                        className="py-4 border-b border-neutral-100"
                                    >
                                        <Text className="text-neutral-900 font-bold">{t.name}</Text>
                                        <Text className="text-neutral-400 text-xs">{t.code}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView>
        </View>
    );
}
