import { Stack, router, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/useAuthStore';
import '../src/styles/global.css';

/** Keeps unauthenticated users off `(tabs)` and sends them to `/` after logout (store cannot navigate reliably). */
function AuthStackGuard() {
    const isLoggingOut = useAuthStore((s) => s.isLoggingOut);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const prevLoggingOut = useRef(false);
    const segments = useSegments();
    const rootSegment = segments[0];
    const unauthKickRef = useRef(false);

    useEffect(() => {
        if (isLoggingOut) unauthKickRef.current = false;
    }, [isLoggingOut]);

    useEffect(() => {
        const endedLogout = prevLoggingOut.current && !isLoggingOut;
        prevLoggingOut.current = isLoggingOut;
        if (!endedLogout || isAuthenticated) return;
        const id = requestAnimationFrame(() => {
            try {
                router.replace('/');
            } catch {
                /* noop */
            }
        });
        return () => cancelAnimationFrame(id);
    }, [isLoggingOut, isAuthenticated]);

    useEffect(() => {
        if (rootSegment !== '(tabs)') {
            unauthKickRef.current = false;
            return;
        }
        if (isAuthenticated || isLoggingOut) {
            unauthKickRef.current = false;
            return;
        }
        if (unauthKickRef.current) return;
        unauthKickRef.current = true;
        const id = requestAnimationFrame(() => {
            try {
                router.replace('/');
            } catch {
                /* noop */
            }
        });
        return () => cancelAnimationFrame(id);
    }, [rootSegment, isAuthenticated, isLoggingOut]);

    return null;
}

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
        return <View style={{ flex: 1, backgroundColor: '#ffffff' }} />;
    }

    return (
        <SafeAreaProvider>
            <AuthStackGuard />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="apply-leave" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="apply-od" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="apply-loan" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="leave/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="od/[id]" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="loan/[id]" options={{ animation: 'slide_from_right' }} />
            </Stack>
        </SafeAreaProvider>
    );
}
