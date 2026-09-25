import Constants from 'expo-constants';

export type AppVariant = 'unit1' | 'unit2' | 'pydah';

function detectAppVariant(): AppVariant {
    // 1. Extra config appVariant passed from app.config.js manifest at runtime
    const extraVariant = (Constants.expoConfig?.extra as { appVariant?: string } | undefined)?.appVariant?.trim().toLowerCase();

    // 2. Native package / bundle identifier / scheme / name inspection from manifest
    const pkg = (Constants.expoConfig?.android?.package || Constants.expoConfig?.ios?.bundleIdentifier || '').toLowerCase();
    const rawScheme = Constants.expoConfig?.scheme;
    const scheme = (Array.isArray(rawScheme) ? rawScheme.join(' ') : rawScheme || '').toLowerCase();
    const name = (Constants.expoConfig?.name || '').toLowerCase();

    if (extraVariant === 'pydah' || pkg.includes('pydah') || scheme.includes('pydah') || name.includes('pydah')) {
        return 'pydah';
    }
    if (extraVariant === 'unit2' || pkg.includes('unit2') || scheme.includes('unit2') || name.includes('unit 2')) {
        return 'unit2';
    }
    if (extraVariant === 'unit1' || pkg === 'com.lihrms.mobile') {
        return 'unit1';
    }

    // 3. Environment variable fallback
    const envVar = process.env.EXPO_PUBLIC_APP_VARIANT?.trim().toLowerCase();
    if (envVar === 'pydah' || envVar === 'unit2' || envVar === 'unit1') {
        return envVar;
    }

    return 'unit1';
}

/** Active app flavor. Automatically determined from env, config, or native package ID. */
export const APP_VARIANT: AppVariant = detectAppVariant();

const VARIANT_CONFIG = {
    unit1: {
        APP_NAME: 'LI HRMS',
        /** Released app builds (EAS / store). */
        PRODUCTION_API_ORIGIN: 'https://hrmsu1.sleipl.com',
        /** Local backend on your machine (Expo dev, physical devices, emulators). */
        LOCAL_DEV_API_ORIGIN: 'https://hrmsu1.sleipl.com',
    },
    unit2: {
        APP_NAME: 'LI HRMS Unit 2',
        PRODUCTION_API_ORIGIN: 'https://hrmsu2.sleipl.com',
        LOCAL_DEV_API_ORIGIN: 'https://hrmsu2.sleipl.com',
    },
    pydah: {
        APP_NAME: 'LI HRMS Pydah',
        PRODUCTION_API_ORIGIN: 'https://hrms.pydah.edu.in',
        LOCAL_DEV_API_ORIGIN: 'https://hrms.pydah.edu.in',
    },
} as const;

const variantConfig = VARIANT_CONFIG[APP_VARIANT];

/**
 * Set in `eas.json` (e.g. development profile) so device-installed dev clients use production API. Local `npx expo start` leaves this unset → `__DEV__` picks LAN.
 * For testing on physical device: set EXPO_PUBLIC_API_ORIGIN=http://YOUR_COMPUTER_IP:5000
 */
const API_ORIGIN = __DEV__
    ? (process.env.EXPO_PUBLIC_API_ORIGIN?.trim().replace(/\/$/, '') || variantConfig.LOCAL_DEV_API_ORIGIN)
    : variantConfig.PRODUCTION_API_ORIGIN;

export const API_BASE_URL = `${API_ORIGIN}/api`;

export const CONFIG = {
    API_BASE_URL,
    APP_NAME: variantConfig.APP_NAME,
    APP_VERSION: Constants.expoConfig?.version || '1.0.2',
    APP_VARIANT,
};

// Edit this list for each release. Only these points are shown in the "What's New" dialog.
export const RELEASE_NOTES: string[] = [
    'Ravi Buraga',
    'Adjusted the floating support ticket button position to prevent layout overlap with the bottom tab navigation bar.',
    'Enabled dynamic OTA updates delivered directly via update channels.',
    'Improved app stability and smoother navigation experience.',
    'Added new feature to allow users to update their profile information.',
    'Fixed bug in the login process.',
    'Improved the performance of the app.',
];
