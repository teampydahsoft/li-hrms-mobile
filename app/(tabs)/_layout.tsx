import { Tabs } from 'expo-router';
import { LayoutDashboard, Clock, Calendar, User, Banknote } from 'lucide-react-native';
import { View, Platform, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useAuthPersistHydrated } from '../../src/hooks/useAuthPersistHydrated';

const fill = { flex: 1 as const, backgroundColor: '#ffffff' as const };

export default function TabLayout() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isLoggingOut = useAuthStore((s) => s.isLoggingOut);
    const hydrated = useAuthPersistHydrated();

    if (!hydrated) {
        return <View style={fill} />;
    }
    if (isLoggingOut) {
        return (
            <View style={[fill, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ marginTop: 16, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#a3a3a3', letterSpacing: 1 }}>
                    Signing out…
                </Text>
            </View>
        );
    }
    if (!isAuthenticated) {
        return (
            <View style={[fill, { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }]}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ marginTop: 16, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#a3a3a3', letterSpacing: 1 }}>
                    Returning to home…
                </Text>
            </View>
        );
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
