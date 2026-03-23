// Admin API service for OWNnote admin dashboard
import { toast } from "sonner";

const API_BASE_URL =
    (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== null)
        ? String(import.meta.env.VITE_API_URL)
        : (import.meta.env.DEV ? "http://localhost:8000" : "");

const ADMIN_PREFIX = "/api/v1/admin";

const getAdminKey = (): string | null => {
    return sessionStorage.getItem("ownnote_admin_key");
};

export const setAdminKey = (key: string) => {
    sessionStorage.setItem("ownnote_admin_key", key);
};

export const clearAdminKey = () => {
    sessionStorage.removeItem("ownnote_admin_key");
};

export const isAdminAuthenticated = (): boolean => {
    return !!getAdminKey();
};

const adminFetch = async (endpoint: string, method = "GET", body?: any) => {
    const key = getAdminKey();
    if (!key) {
        throw new Error("Not authenticated as admin");
    }

    const options: RequestInit = {
        method,
        headers: {
            "Content-Type": "application/json",
            "X-Admin-Key": key,
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${ADMIN_PREFIX}${endpoint}`, options);

    if (response.status === 403) {
        clearAdminKey();
        toast.error("Admin session expired. Please re-authenticate.");
        window.location.href = "/admin";
        throw new Error("Admin authentication failed");
    }

    const raw = await response.text();
    let data: Record<string, unknown> = {};
    if (raw.trim()) {
        try {
            data = JSON.parse(raw) as Record<string, unknown>;
        } catch {
            if (!response.ok) {
                throw new Error(raw.slice(0, 200) || `Request failed (${response.status})`);
            }
        }
    }

    if (!response.ok) {
        const detail = data?.detail;
        let msg = "Admin API error";
        if (typeof detail === "string") msg = detail;
        else if (Array.isArray(detail)) {
            msg = detail
                .map((d: { msg?: string }) => (typeof d?.msg === "string" ? d.msg : JSON.stringify(d)))
                .join(". ");
        } else if (detail != null && typeof detail === "object" && "msg" in detail) {
            msg = String((detail as { msg: string }).msg);
        }
        throw new Error(msg || `Request failed (${response.status})`);
    }

    return data;
};

// Auth
export const adminLogin = async (adminKey: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE_URL}${ADMIN_PREFIX}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_key: adminKey }),
        });

        if (response.ok) {
            setAdminKey(adminKey);
            return true;
        }
        return false;
    } catch {
        return false;
    }
};

// Stats
export interface AdminStats {
    total_users: number;
    active_users: number;
    total_meetings: number;
    completed_meetings: number;
    pending_meetings: number;
    failed_meetings: number;
    total_duration_minutes: number;
    meetings_today: number;
    meetings_this_week: number;
    meetings_this_month: number;
    total_pro_users: number;
}

export const getAdminStats = async (): Promise<AdminStats> => {
    return adminFetch("/stats");
};

// Users
export interface UserWithStats {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    auth_provider: string;
    created_at: string | null;
    updated_at: string | null;
    meeting_count: number;
    completed_meetings: number;
    total_duration_minutes: number;
    last_meeting_at: string | null;
    is_pro: boolean;
}

export const getAdminUsers = async (): Promise<UserWithStats[]> => {
    return adminFetch("/users");
};

export const createAdminUser = async (data: {
    email: string;
    password: string;
    name: string;
}): Promise<UserWithStats> => {
    return adminFetch("/users", "POST", data);
};

export const updateAdminUser = async (
    userId: number,
    data: {
        name?: string;
        email?: string;
        is_active?: boolean;
        password?: string;
    }
): Promise<any> => {
    return adminFetch(`/users/${userId}`, "PUT", data);
};

export const deleteAdminUser = async (userId: number): Promise<any> => {
    return adminFetch(`/users/${userId}`, "DELETE");
};

export const toggleAdminUserPro = async (userId: number): Promise<any> => {
    return adminFetch(`/users/${userId}/toggle-pro`, "POST");
};

// User meetings
export interface AdminMeeting {
    id: string;
    title: string;
    status: string;
    duration: number | null;
    platform: string | null;
    created_at: string | null;
    is_processed: boolean;
    participants: string[];
}

export const getAdminUserMeetings = async (userId: number): Promise<AdminMeeting[]> => {
    return adminFetch(`/users/${userId}/meetings`);
};
