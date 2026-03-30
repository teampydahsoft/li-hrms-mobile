import { router } from 'expo-router';

/** Imperative navigation to login (logout, 401, session expired). Runs after a microtask so Zustand + layouts settle first. */
export function redirectToLogin(): void {
    queueMicrotask(() => {
        setTimeout(() => {
            try {
                router.replace('/');
            } catch {
                /* Router not ready */
            }
        }, 0);
    });
}
