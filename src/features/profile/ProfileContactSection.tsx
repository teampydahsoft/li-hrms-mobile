import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Mail, User as UserIcon, Phone, Save } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../api/client';

export function ProfileContactSection() {
    const { user, updateUser } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [editPhone, setEditPhone] = useState(user?.phone || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setEditName(user?.name || '');
            setEditPhone(user?.phone || '');
        }
    }, [user?.name, user?.phone, isEditing]);

    const syncFromUser = () => {
        setEditName(user?.name || '');
        setEditPhone(user?.phone || '');
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            Alert.alert('Validation', 'Name is required');
            return;
        }
        setSaving(true);
        try {
            const res = await api.updateProfile({ name: editName.trim(), phone: editPhone.trim() || undefined });
            if (res.data.success) {
                updateUser({ name: editName.trim(), phone: editPhone.trim() || undefined });
                setIsEditing(false);
                Alert.alert('Saved', 'Profile updated successfully');
            } else {
                Alert.alert('Error', res.data.message || 'Failed to update profile');
            }
        } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View className="mb-8">
            <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-lg font-black text-neutral-900">Contact</Text>
                {!isEditing ? (
                    <TouchableOpacity onPress={() => { syncFromUser(); setIsEditing(true); }} className="rounded-full bg-emerald-50 px-4 py-2">
                        <Text className="text-xs font-black uppercase text-emerald-700">Edit</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        onPress={handleSaveProfile}
                        disabled={saving}
                        className="flex-row items-center rounded-full bg-primary px-4 py-2"
                    >
                        <Save size={14} color="white" />
                        <Text className="ml-1 text-xs font-black uppercase text-white">Save</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View className="rounded-[28px] border border-neutral-100 bg-white p-5">
                <View className="mb-4 flex-row items-center border-b border-neutral-50 pb-4">
                    <Mail size={18} color="#64748B" />
                    <View className="ml-3 flex-1">
                        <Text className="text-[10px] font-black uppercase text-neutral-400">Email</Text>
                        <Text className="font-semibold text-neutral-800">{user?.email || '—'}</Text>
                    </View>
                </View>
                <View className="mb-4 flex-row items-center border-b border-neutral-50 pb-4">
                    <UserIcon size={18} color="#64748B" />
                    <View className="ml-3 flex-1">
                        <Text className="text-[10px] font-black uppercase text-neutral-400">Name</Text>
                        {isEditing ? (
                            <TextInput
                                value={editName}
                                onChangeText={setEditName}
                                className="mt-1 rounded-xl border border-neutral-200 px-3 py-2 text-neutral-900"
                                placeholder="Full name"
                            />
                        ) : (
                            <Text className="font-semibold text-neutral-800">{user?.name || '—'}</Text>
                        )}
                    </View>
                </View>
                <View className="flex-row items-center">
                    <Phone size={18} color="#64748B" />
                    <View className="ml-3 flex-1">
                        <Text className="text-[10px] font-black uppercase text-neutral-400">Phone</Text>
                        {isEditing ? (
                            <TextInput
                                value={editPhone}
                                onChangeText={setEditPhone}
                                keyboardType="phone-pad"
                                className="mt-1 rounded-xl border border-neutral-200 px-3 py-2 text-neutral-900"
                                placeholder="Phone"
                            />
                        ) : (
                            <Text className="font-semibold text-neutral-800">{user?.phone || '—'}</Text>
                        )}
                    </View>
                </View>
            </View>
            {isEditing && (
                <TouchableOpacity
                    onPress={() => {
                        setIsEditing(false);
                        syncFromUser();
                    }}
                    className="mt-3"
                >
                    <Text className="text-center text-sm font-semibold text-neutral-500">Cancel</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
