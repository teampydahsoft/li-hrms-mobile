import { Tabs, useRouter } from 'expo-router';
import { LayoutDashboard, Clock, Calendar, User, Banknote } from 'lucide-react-native';
import { View, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function TabLayout() {
    const router = useRouter();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

    useEffect(() => {
        const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
        return unsub;
    }, []);

    useEffect(() => {
        if (!hydrated || isAuthenticated) return;
        const t = setTimeout(() => {
            try {
                router.replace('/');
            } catch {
                /* noop */
            }
        }, 0);
        return () => clearTimeout(t);
    }, [hydrated, isAuthenticated, router]);

    if (!hydrated) {
        return <View className="flex-1 bg-white" />;
    }
    if (!isAuthenticated) {
        return <View className="flex-1 bg-white" />;
    }

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#10B981',
                tabBarInactiveTintColor: '#CBD5E1',
                tabBarLabelStyle: {
                    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
                    fontWeight: '900',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: -5
                },
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 0,
                    elevation: 10,
                    height: 100,
                    paddingBottom: 35,
                    paddingTop: 15,
                    borderTopLeftRadius: 40,
                    borderTopRightRadius: 40,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: -10 },
                    shadowOpacity: 0.08,
                    shadowRadius: 20,
                    borderWidth: 2,
                    borderColor: '#F1F5F9'
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <LayoutDashboard size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="attendance"
                options={{
                    title: 'Attendance',
                    tabBarIcon: ({ color, size }) => (
                        <Clock size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="leaves"
                options={{
                    title: 'Leaves',
                    tabBarIcon: ({ color, size }) => (
                        <Calendar size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="loans"
                options={{
                    title: 'Finance',
                    tabBarIcon: ({ color, size }) => (
                        <Banknote size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <User size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
