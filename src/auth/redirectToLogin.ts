import { router } from 'expo-router';

/** Reset to in-tab sign-in after 401 / session expired (same route as manual sign-out). */
export function redirectToLogin(): void {
    const go = () => {
        try {
            router.replace('/(tabs)/login');
        } catch (e) {
            if (__DEV__) console.warn('[redirectToLogin] replace /(tabs)/login', e);
        }
    };
    try {
        go();
    } catch (e) {
        if (__DEV__) console.warn('[redirectToLogin] initial go', e);
    }
    queueMicrotask(() => {
        setTimeout(go, 0);
    });
}
