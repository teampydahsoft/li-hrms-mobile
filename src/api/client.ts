import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { redirectToLogin } from '../auth/redirectToLogin';
import { API_BASE_URL } from '../constants/Config';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
            redirectToLogin();
        }
        return Promise.reject(error);
    }
);

/** Resolve 4xx with a response body (no throw) so screens can handle { success: false } without Metro axios errors. */
const okThrough4xx: import('axios').AxiosRequestConfig = {
    validateStatus: (status) => status >= 200 && status < 500,
};

/** Backend envelope used across HRMS APIs */
export type ApiEnvelope<T = unknown> = {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    url?: string;
    key?: string;
    filename?: string;
};

export const api = {
    login: (data: { email: string; password: string }) => apiClient.post<ApiEnvelope>('/auth/login', data),
    getMe: () => apiClient.get<ApiEnvelope>('/auth/me'),

    updateProfile: (data: Record<string, unknown>) => apiClient.put<ApiEnvelope>('/users/profile', data),

    getEmployee: (empNo: string) => apiClient.get<ApiEnvelope>(`/employees/${empNo}`),

    getAttendanceCalendar: (employeeNumber: string, year?: number, month?: number) => {
        const params = new URLSearchParams();
        params.set('employeeNumber', employeeNumber);
        if (year != null) params.set('year', String(year));
        if (month != null) params.set('month', String(month));
        return apiClient.get<ApiEnvelope & { year?: number; month?: number }>(
            `/attendance/calendar?${params.toString()}`
        );
    },

    getAttendanceDetail: (employeeNumber: string, date: string) => {
        const params = new URLSearchParams();
        params.set('employeeNumber', employeeNumber);
        params.set('date', date);
        return apiClient.get<ApiEnvelope>(`/attendance/detail?${params.toString()}`, okThrough4xx);
    },

    getAttendanceList: (
        employeeNumber: string,
        startDate: string,
        endDate: string,
        page = 1,
        limit = 31
    ) => {
        const params = new URLSearchParams();
        params.set('employeeNumber', employeeNumber);
        params.set('startDate', startDate);
        params.set('endDate', endDate);
        params.set('page', String(page));
        params.set('limit', String(limit));
        return apiClient.get<ApiEnvelope & { pagination?: Record<string, unknown> }>(
            `/attendance/list?${params.toString()}`,
            okThrough4xx
        );
    },

    getDashboardStats: () =>
        apiClient.get<ApiEnvelope>('/dashboard/stats', { validateStatus: () => true }),

    getDivision: (id: string) => apiClient.get<ApiEnvelope>(`/divisions/${id}`),

    getDepartment: (id: string) => apiClient.get<ApiEnvelope>(`/departments/${id}`),

    changePassword: (currentPassword: string, newPassword: string) =>
        apiClient.put<ApiEnvelope<{ message?: string }>>('/auth/change-password', {
            currentPassword,
            newPassword,
        }),

    // Leave / OD settings (types + policy)
    getLeaveSettings: (type: 'leave' | 'od' | 'ccl') =>
        apiClient.get<ApiEnvelope>(`/leaves/settings/${type}`),

    getMyLeaves: (filters?: { status?: string; fromDate?: string; toDate?: string }) => {
        const q = new URLSearchParams();
        if (filters?.status) q.set('status', filters.status);
        if (filters?.fromDate) q.set('fromDate', filters.fromDate);
        if (filters?.toDate) q.set('toDate', filters.toDate);
        const qs = q.toString();
        return apiClient.get<ApiEnvelope>(`/leaves/my${qs ? `?${qs}` : ''}`);
    },

    getMyODs: (filters?: { status?: string; fromDate?: string; toDate?: string }) => {
        const q = new URLSearchParams();
        if (filters?.status) q.set('status', filters.status);
        if (filters?.fromDate) q.set('fromDate', filters.fromDate);
        if (filters?.toDate) q.set('toDate', filters.toDate);
        const qs = q.toString();
        return apiClient.get<ApiEnvelope>(`/leaves/od/my${qs ? `?${qs}` : ''}`);
    },

    getLeave: (id: string) => apiClient.get<ApiEnvelope>(`/leaves/${id}`),

    getOD: (id: string) => apiClient.get<ApiEnvelope>(`/leaves/od/${id}`),

    applyLeave: (body: Record<string, unknown>) =>
        apiClient.post<ApiEnvelope>('/leaves', body),

    applyOD: (body: Record<string, unknown>) =>
        apiClient.post<ApiEnvelope>('/leaves/od', body),

    cancelLeave: (id: string, reason?: string) =>
        apiClient.put<ApiEnvelope>(`/leaves/${id}/cancel`, { reason }),

    cancelOD: (id: string, reason?: string) =>
        apiClient.put<ApiEnvelope>(`/leaves/od/${id}/cancel`, { reason }),

    getApprovedRecordsForDate: (employeeId: string, employeeNumber: string, date: string) => {
        const q = new URLSearchParams();
        if (employeeId) q.set('employeeId', employeeId);
        if (employeeNumber) q.set('employeeNumber', employeeNumber);
        q.set('date', date);
        return apiClient.get<ApiEnvelope>(`/leaves/approved-records?${q.toString()}`);
    },

    getLeaveApplyPeriodContext: (params: { fromDate: string; employeeId?: string; leaveType?: string }) => {
        const q = new URLSearchParams();
        q.set('fromDate', params.fromDate);
        if (params.employeeId) q.set('employeeId', params.employeeId);
        if (params.leaveType) q.set('leaveType', params.leaveType);
        return apiClient.get<ApiEnvelope>(`/leaves/apply-period-context?${q.toString()}`);
    },

    checkODHoliday: (employeeId: string | undefined, empNo: string | undefined, date: string) => {
        const q = new URLSearchParams();
        if (employeeId) q.set('employeeId', employeeId);
        if (empNo) q.set('empNo', empNo);
        q.set('date', date);
        return apiClient.get<ApiEnvelope>(`/leaves/od/check-holiday?${q.toString()}`);
    },

    /**
     * Upload OD evidence (React Native FormData file part).
     */
    /** React Native: use fetch so multipart boundary is set correctly (avoid default JSON Content-Type). */
    uploadEvidence: async (asset: { uri: string; mimeType?: string | null; fileName?: string | null }) => {
        const name = asset.fileName || 'evidence.jpg';
        const type = asset.mimeType || 'image/jpeg';
        const form = new FormData();
        form.append('file', {
            uri: asset.uri,
            name,
            type,
        } as unknown as Blob);
        const token = useAuthStore.getState().token;
        const res = await fetch(`${API_BASE_URL}/upload/evidence`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form,
        });
        const json = (await res.json()) as ApiEnvelope & { url?: string; key?: string };
        return { data: json };
    },
};

export default apiClient;
