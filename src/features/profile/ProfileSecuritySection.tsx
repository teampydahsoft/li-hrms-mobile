import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Key } from 'lucide-react-native';
import { useState } from 'react';
import { api } from '../../api/client';

export function ProfileSecuritySection() {
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const handlePasswordChange = async () => {
        setPasswordMsg(null);
        if (!passwordData.currentPassword) {
            setPasswordMsg({ type: 'err', text: 'Current password is required' });
            return;
        }
        if (!passwordData.newPassword) {
            setPasswordMsg({ type: 'err', text: 'New password is required' });
            return;
        }
        if (passwordData.newPassword.length < 4) {
            setPasswordMsg({ type: 'err', text: 'New password must be at least 4 characters' });
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMsg({ type: 'err', text: 'New passwords do not match' });
            return;
        }
        if (passwordData.currentPassword === passwordData.newPassword) {
            setPasswordMsg({ type: 'err', text: 'New password must differ from current' });
            return;
        }
        setPasswordLoading(true);
        try {
            const res = await api.changePassword(passwordData.currentPassword, passwordData.newPassword);
            if (res.data.success) {
                setPasswordMsg({ type: 'ok', text: 'Password changed successfully' });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setPasswordMsg({ type: 'err', text: res.data.message || 'Failed to change password' });
            }
        } catch (e: unknown) {
            const msg =
                e && typeof e === 'object' && 'response' in e
                    ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message || '')
                    : e instanceof Error
                      ? e.message
                      : 'Failed to change password';
            setPasswordMsg({ type: 'err', text: msg || 'Failed to change password' });
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <View className="mb-8">
            <View className="mb-4 flex-row items-center rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                <Key size={20} color="#64748B" />
                <Text className="ml-3 flex-1 text-sm font-bold text-neutral-700">Change password</Text>
            </View>
            {passwordMsg ? (
                <Text className={`mb-3 text-sm font-semibold ${passwordMsg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {passwordMsg.text}
                </Text>
            ) : null}
            <View className="rounded-[28px] border border-neutral-100 bg-white p-5">
                <Text className="mb-1 text-[10px] font-black uppercase text-neutral-400">Current</Text>
                <TextInput
                    value={passwordData.currentPassword}
                    onChangeText={(t) => setPasswordData((p) => ({ ...p, currentPassword: t }))}
                    secureTextEntry
                    className="mb-4 rounded-xl border border-neutral-200 px-3 py-3 text-neutral-900"
                    placeholder="••••••••"
                />
                <Text className="mb-1 text-[10px] font-black uppercase text-neutral-400">New</Text>
                <TextInput
                    value={passwordData.newPassword}
                    onChangeText={(t) => setPasswordData((p) => ({ ...p, newPassword: t }))}
                    secureTextEntry
                    className="mb-4 rounded-xl border border-neutral-200 px-3 py-3 text-neutral-900"
                    placeholder="••••••••"
                />
                <Text className="mb-1 text-[10px] font-black uppercase text-neutral-400">Confirm new</Text>
                <TextInput
                    value={passwordData.confirmPassword}
                    onChangeText={(t) => setPasswordData((p) => ({ ...p, confirmPassword: t }))}
                    secureTextEntry
                    className="mb-6 rounded-xl border border-neutral-200 px-3 py-3 text-neutral-900"
                    placeholder="••••••••"
                />
                <TouchableOpacity onPress={handlePasswordChange} disabled={passwordLoading} className="items-center rounded-2xl bg-primary py-4">
                    {passwordLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="font-black uppercase tracking-widest text-white">Update password</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
