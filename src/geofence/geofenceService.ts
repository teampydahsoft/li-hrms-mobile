import * as Location from 'expo-location';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { redirectToLogin } from '../auth/redirectToLogin';
import { showAppToast } from '../ui/toast';

let locationSubscription: Location.LocationSubscription | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let pollIntervalTimer: ReturnType<typeof setInterval> | null = null;
let isLoggingOutForGeofence = false;

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function isUserSuperAdmin(): boolean {
    const role = useAuthStore.getState().user?.role;
    return role === 'super_admin' || role === 'superadmin';
}

export async function stopGeofenceMonitoring(): Promise<void> {
    if (locationSubscription) {
        try {
            locationSubscription.remove();
        } catch {
            /* ignore */
        }
        locationSubscription = null;
    }

    if (appStateSubscription) {
        try {
            appStateSubscription.remove();
        } catch {
            /* ignore */
        }
        appStateSubscription = null;
    }

    if (pollIntervalTimer) {
        clearInterval(pollIntervalTimer);
        pollIntervalTimer = null;
    }
}

async function performGeofenceLogout(toastMsg: string, alertMsg: string): Promise<void> {
    if (isLoggingOutForGeofence || isUserSuperAdmin()) return;
    isLoggingOutForGeofence = true;

    await stopGeofenceMonitoring();

    showAppToast(toastMsg, 'error');
    Alert.alert('Geofence Protection', alertMsg);

    try {
        await useAuthStore.getState().logout();
    } catch {
        /* ignore */
    }

    try {
        await redirectToLogin();
    } catch {
        /* ignore */
    }
}

export async function checkGeofenceNow(): Promise<void> {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || isLoggingOutForGeofence || isUserSuperAdmin()) return;

    try {
        const res = await api.getGeofenceConfig();
        const config = res.data?.data;
        if (
            !config ||
            !config.enabled ||
            !Number.isFinite(config.latitude) ||
            !Number.isFinite(config.longitude) ||
            !Number.isFinite(config.radiusMeters)
        ) {
            return;
        }

        // 1. Verify location services (GPS) are enabled
        const isServicesEnabled = await Location.hasServicesEnabledAsync();
        if (!isServicesEnabled) {
            await performGeofenceLogout(
                'Auto-Logged Out: GPS / Location services disabled.',
                'Device Location (GPS) services must be enabled while workplace geofence restriction is active.'
            );
            return;
        }

        // 2. Verify foreground location permission
        let perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') {
            perm = await Location.requestForegroundPermissionsAsync();
        }

        if (perm.status !== 'granted') {
            await performGeofenceLogout(
                'Auto-Logged Out: Location permission required.',
                'Location permission is required to access the app while workplace geofence restriction is active.'
            );
            return;
        }

        // 3. Acquire current location and verify geofence distance
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const distance = haversineM(lat, lng, config.latitude, config.longitude);
            if (distance > config.radiusMeters) {
                const distRounded = Math.round(distance);
                await performGeofenceLogout(
                    `Auto-Logged Out: ${distRounded}m outside workplace boundary.`,
                    `You are ${distRounded} meters away from the allowed workplace area (${config.locationName || 'Company Area'}, max ${config.radiusMeters}m radius). You have been automatically logged out.`
                );
            }
        }
    } catch {
        /* Ignore transient network or position fix timeouts */
    }
}

export async function startGeofenceMonitoring(): Promise<void> {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || isUserSuperAdmin()) {
        await stopGeofenceMonitoring();
        return;
    }

    await stopGeofenceMonitoring();
    isLoggingOutForGeofence = false;

    // Initial check
    await checkGeofenceNow();
    if (isLoggingOutForGeofence) return;

    // Listen for AppState changes to re-check location immediately when returning to foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
        if (nextState === 'active') {
            void checkGeofenceNow();
        }
    };
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Periodic check every 30 seconds to catch location changes and config updates
    pollIntervalTimer = setInterval(() => {
        void checkGeofenceNow();
    }, 30000);

    // Watch position in background/foreground for real-time location triggers
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
            locationSubscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 20000,
                    distanceInterval: 15,
                },
                (loc) => {
                    if (isUserSuperAdmin()) return;

                    const lat = loc.coords.latitude;
                    const lng = loc.coords.longitude;
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                    api.getGeofenceConfig()
                        .then((res) => {
                            if (isUserSuperAdmin()) return;
                            const config = res.data?.data;
                            if (config && config.enabled && Number.isFinite(config.latitude) && Number.isFinite(config.longitude)) {
                                const distance = haversineM(lat, lng, config.latitude, config.longitude);
                                if (distance > config.radiusMeters) {
                                    const distRounded = Math.round(distance);
                                    void performGeofenceLogout(
                                        `Auto-Logged Out: ${distRounded}m outside workplace boundary.`,
                                        `You moved outside the allowed workplace area (${config.locationName || 'Company Area'}, max ${config.radiusMeters}m radius). You have been automatically logged out.`
                                    );
                                }
                            }
                        })
                        .catch(() => {});
                }
            );
        }
    } catch {
        /* ignore watcher initialization error */
    }
}
