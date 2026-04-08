import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, Redirect } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../src/store/useAuthStore';
import { useAuthPersistHydrated } from '../src/hooks/useAuthPersistHydrated';

const screenFill = { flex: 1 as const, backgroundColor: '#ffffff' as const };

export default function HomeScreen() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const hydrated = useAuthPersistHydrated();

    if (!hydrated) {
        return (
            <View style={[screenFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)" />;
    }

    return (
        <View style={screenFill} className="flex-1 bg-white">
            <StatusBar style="dark" />
            <LinearGradient colors={['#FFFFFE', '#F7FEE7', '#FFFFFF']} className="absolute inset-0" />
            <SafeAreaView className="flex-1 justify-center px-8">
                <View className="mb-4 flex-row items-center">
                    <View className="mr-3 h-1 w-10 rounded-full bg-primary" />
                    <Text className="text-xs font-bold uppercase tracking-[4px] text-primary">Enterprise Portal</Text>
                </View>
                <Text className="text-5xl font-black leading-[55px] tracking-tight text-neutral-900">
                    HRMS<Text className="text-primary">.</Text>
                </Text>
                <Text className="mt-3 text-lg font-medium tracking-wide text-neutral-400">Workplace access in one place</Text>

                <TouchableOpacity
                    onPress={() => router.push('/(tabs)/login')}
                    activeOpacity={0.9}
                    className="mt-14"
                >
                    <LinearGradient
                        colors={['#10B981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        className="h-16 flex-row items-center justify-center rounded-3xl shadow-xl shadow-emerald-500/30"
                    >
                        <Text className="mr-2 text-lg font-black uppercase tracking-widest text-white">Sign in</Text>
                        <ChevronRight size={22} color="white" strokeWidth={3} />
                    </LinearGradient>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}
