import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Zustand persist only notifies onFinishHydration listeners that subscribed before hydration
 * finished. If rehydration completes first, the callback never runs and UI can stay blank.
 */
export function useAuthPersistHydrated(): boolean {
    const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

    useEffect(() => {
        if (useAuthStore.persist.hasHydrated()) {
            setHydrated(true);
        }
        return useAuthStore.persist.onFinishHydration(() => {
            setHydrated(true);
        });
    }, []);

    return hydrated;
}
