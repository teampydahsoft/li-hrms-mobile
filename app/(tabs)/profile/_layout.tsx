import { Stack } from 'expo-router';
import { ProfileDataProvider } from '../../../src/features/profile/ProfileDataContext';

export default function ProfileStackLayout() {
    return (
        <ProfileDataProvider>
            <Stack
                screenOptions={{
                    headerBackTitle: 'Profile',
                    headerTintColor: '#059669',
                    headerTitleStyle: { fontWeight: '900' },
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: '#FFFFFF' },
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="employment" options={{ title: 'Work' }} />
                <Stack.Screen name="security" options={{ title: 'Security' }} />
            </Stack>
        </ProfileDataProvider>
    );
}
