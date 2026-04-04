import { router } from 'expo-router';

/** Reset root stack to public home (401 / session expired). User can open Sign in from there. */
export function redirectToLogin(): void {
    const go = () => {
        try {
            router.replace('/');
        } catch {
            /* Router not ready */
        }
    };
    try {
        go();
    } catch {
        /* noop */
    }
    queueMicrotask(() => {
        setTimeout(go, 0);
    });
}
