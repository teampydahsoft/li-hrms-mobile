import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { Mail, Lock, ChevronRight, Fingerprint } from 'lucide-react-native';
import { MotiView, MotiText } from 'moti';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/useAuthStore';
import { api } from '../src/api/client';

type LoginPayload = {
    user: {
        _id: string;
        name: string;
        email: string;
        role: string;
        emp_no?: string;
        employeeId?: string;
    };
    token: string;
};

export default function LoginScreen() {
    const rootNavigationState = useRootNavigationState();
    const { setAuth, isAuthenticated } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!rootNavigationState?.key) return;
        if (!isAuthenticated) return;
        router.replace('/(tabs)');
    }, [rootNavigationState?.key, isAuthenticated]);

    if (isAuthenticated) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Required', 'Please enter both email and password.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.login({ email, password });
            if (response.data.success && response.data.data) {
                const payload = response.data.data as LoginPayload;
                const { user, token } = payload;
                setAuth(
                    {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        emp_no: user.emp_no,
                        employeeRef: user.employeeId,
                    },
                    token
                );
                requestAnimationFrame(() => {
                    router.replace('/(tabs)');
                });
            } else {
                Alert.alert('Access Denied', response.data.message || 'Invalid credentials.');
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            const errorMsg = err.response?.data?.message || 'Unable to connect to service. Please check your network.';
            Alert.alert('Connection Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar style="dark" />

            <LinearGradient colors={['#FFFFFE', '#F7FEE7', '#FFFFFF']} className="absolute inset-0" />

            <MotiView
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.03, 0.05, 0.03],
                }}
                transition={{ duration: 8000, loop: true, type: 'timing' }}
                className="absolute top-[-100] right-[-100] h-[500] w-[500] rounded-full bg-emerald-400"
            />

            <SafeAreaView className="flex-1">
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        className="flex-1 justify-center px-8"
                    >
                        <MotiView
                            from={{ opacity: 0, translateY: 30 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'spring', damping: 15 }}
                            className="mb-14"
                        >
                            <View className="mb-4 flex-row items-center">
                                <View className="green-bar mr-3 h-1 w-10 rounded-full bg-primary" />
                                <Text className="text-xs font-bold uppercase tracking-[4px] text-primary">Enterprise Portal</Text>
                            </View>
                            <Text className="text-5xl font-black leading-[55px] tracking-tight text-neutral-900">
                                Sign<Text className="text-primary">.</Text>In
                            </Text>
                            <Text className="mt-3 text-lg font-medium tracking-wide text-neutral-400">Access your workspace account</Text>
                        </MotiView>

                        <View className="space-y-6">
                            <MotiView
                                animate={{
                                    scale: isEmailFocused ? 1.02 : 1,
                                }}
                                className="h-20 flex-row items-center rounded-3xl border-2 border-[#F1F5F9] bg-white px-6 shadow-sm shadow-neutral-200"
                                style={{ borderColor: isEmailFocused ? '#10B981' : '#F1F5F9' }}
                            >
                                <Mail size={22} color={isEmailFocused ? '#10B981' : '#94A6B8'} strokeWidth={2.5} />
                                <View className="ml-4 flex-1">
                                    {(isEmailFocused || email.length > 0) && (
                                        <MotiText
                                            from={{ opacity: 0, translateY: 5 }}
                                            animate={{ opacity: 1, translateY: 0 }}
                                            className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary"
                                        >
                                            Email Address
                                        </MotiText>
                                    )}
                                    <TextInput
                                        placeholder={!isEmailFocused ? 'Email Address' : ''}
                                        value={email}
                                        onChangeText={setEmail}
                                        onFocus={() => setIsEmailFocused(true)}
                                        onBlur={() => setIsEmailFocused(false)}
                                        className="p-0 text-lg font-bold text-neutral-900"
                                        placeholderTextColor="#CBD5E1"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>
                            </MotiView>

                            <MotiView
                                animate={{
                                    scale: isPasswordFocused ? 1.02 : 1,
                                }}
                                className="mt-5 h-20 flex-row items-center rounded-3xl border-2 border-[#F1F5F9] bg-white px-6 shadow-sm shadow-neutral-200"
                                style={{ borderColor: isPasswordFocused ? '#10B981' : '#F1F5F9' }}
                            >
                                <Lock size={22} color={isPasswordFocused ? '#10B981' : '#94A6B8'} strokeWidth={2.5} />
                                <View className="ml-4 flex-1">
                                    {(isPasswordFocused || password.length > 0) && (
                                        <MotiText
                                            from={{ opacity: 0, translateY: 5 }}
                                            animate={{ opacity: 1, translateY: 0 }}
                                            className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary"
                                        >
                                            Secure Password
                                        </MotiText>
                                    )}
                                    <TextInput
                                        placeholder={!isPasswordFocused ? 'Password' : ''}
                                        value={password}
                                        onChangeText={setPassword}
                                        onFocus={() => setIsPasswordFocused(true)}
                                        onBlur={() => setIsPasswordFocused(false)}
                                        secureTextEntry
                                        className="p-0 text-lg font-bold text-neutral-900"
                                        placeholderTextColor="#CBD5E1"
                                    />
                                </View>
                            </MotiView>

                            <TouchableOpacity className="mt-1 self-end px-2">
                                <Text className="text-xs font-bold uppercase tracking-widest text-neutral-400">Recovery Access?</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleLogin}
                                activeOpacity={0.9}
                                disabled={loading}
                                className={`mt-8 ${loading ? 'opacity-70' : ''}`}
                            >
                                <LinearGradient
                                    colors={['#10B981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    className="h-20 flex-row items-center justify-center rounded-3xl shadow-2xl shadow-emerald-500/40"
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <Text className="mr-2 text-xl font-black uppercase tracking-widest text-white">Login to Account</Text>
                                            <ChevronRight size={24} color="white" strokeWidth={3} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity className="mt-6 items-center">
                                <View className="h-16 w-16 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
                                    <Fingerprint size={28} color="#10B981" />
                                </View>
                                <Text className="mt-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Biometric Sign-in</Text>
                            </TouchableOpacity>
                        </View>

                        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 800 }} className="mt-16 items-center">
                            <View className="w-full items-center rounded-[32px] border border-neutral-100 bg-neutral-50 p-6">
                                <Text className="mb-1 text-xs font-bold uppercase tracking-tighter text-neutral-500">Authorization required</Text>
                                <Text className="px-4 text-center text-[11px] leading-5 text-neutral-400">
                                    To ensure workplace security, please contact your{' '}
                                    <Text className="font-black text-primary">Department Admin</Text> for official system credentials.
                                </Text>
                            </View>
                        </MotiView>
                    </KeyboardAvoidingView>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
