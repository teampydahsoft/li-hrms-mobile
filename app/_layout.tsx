import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import '../src/styles/global.css';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded] = useFonts({
        // Add custom fonts here if needed
    });

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync();
        }
    }, [loaded]);

    if (!loaded) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="apply-leave" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="apply-od" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="leave/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="od/[id]" options={{ animation: 'slide_from_right' }} />
            </Stack>
        </SafeAreaProvider>
    );
}
