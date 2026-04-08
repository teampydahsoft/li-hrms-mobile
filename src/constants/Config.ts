import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Use the local IP address for physical device testing, or localhost for simulator
// Replace with your machine's IP (e.g., '192.168.1.5') to test on a real phone s://hrms-api.raviburaga.shop
const LOCALHOST = Platform.OS === 'android' ? ' http://192.168.0.36:5000' : 'localhost';

export const API_BASE_URL = `${LOCALHOST}/api`;

export const CONFIG = {
    API_BASE_URL,
    APP_NAME: 'LI HRMS',
    APP_VERSION: Constants.expoConfig?.version || '1.0.0',
};
