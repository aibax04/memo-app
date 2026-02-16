import { callApi } from './api';

const API_PREFIX = '/api/v1/web';

export interface TranscriptionSegment {
    start: number;
    end: number;
    text: string;
    speaker: string;
}

export interface ActionItem {
    description: string;
    owner?: string;
    priority?: string;
    due_date?: string;
    status?: string;
}

export interface Meeting {
    id: string;
    title: string;
    description: string;
    participants: string[];
    transcription: TranscriptionSegment[] | null;
    summary: string | null;
    key_points: string | null;
    action_items: ActionItem[] | null;
    audio_filename: string;
    templateid: string | null;
    custom_template_points: string | null;
    user_id: number;
    created_at: string;
    updated_at: string;
    is_processed: boolean;
    status: 'RECORDING' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    analytics_status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    analytics_data: any | null;
    duration: number | null;
}

export interface PaginatedMeetings {
    data: Meeting[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

// Fetch all meetings with optional filters
export const getMeetings = async (
    page: number = 1,
    limit: number = 100,
    status?: string,
    search?: string,
    dateFrom?: string,
    dateTo?: string
): Promise<PaginatedMeetings | { error: string }> => {
    const params = new URLSearchParams();
    params.append('skip', ((page - 1) * limit).toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    const result = await callApi(`${API_PREFIX}/meetings/?${params.toString()}`);
    if (result?.error) {
        return { error: result.error };
    }
    return result as PaginatedMeetings;
};

// Fetch a single meeting by ID (includes transcription, summary, analytics)
export const getMeeting = async (meetingId: string): Promise<Meeting | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}`);
    if (result?.error) {
        return { error: result.error };
    }
    return result as Meeting;
};

// Get audio URL for a meeting
export const getMeetingAudioUrl = async (meetingId: string): Promise<{ download_url: string; expires_in: number; filename: string } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}/audio/url`);
    if (result?.error) {
        return { error: result.error };
    }
    return result;
};

// Delete a meeting
export const deleteMeeting = async (meetingId: string): Promise<{ status: string; message: string } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}`, 'DELETE');
    if (result?.error) {
        return { error: result.error };
    }
    return result;
};

// Reprocess a meeting
export const reprocessMeeting = async (meetingId: string): Promise<{ status: string; message: string } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}/reprocess`, 'POST');
    if (result?.error) {
        return { error: result.error };
    }
    return result;
};

// Update a meeting
export const updateMeeting = async (meetingId: string, updates: Partial<Meeting>): Promise<Meeting | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}`, 'PUT', updates);
    if (result?.error) {
        return { error: result.error };
    }
    return result as Meeting;
};

// Get unique speakers
export const getUniqueSpeakers = async (): Promise<any[] | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/speakers`);
    if (result?.error) {
        return { error: result.error };
    }
    return result;
};

// Helper: Format duration from minutes
export const formatDuration = (minutes: number | null): string => {
    if (!minutes || minutes === 0) return '00:00:00';
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const s = Math.floor((minutes * 60) % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Helper: Format timestamp (seconds) to HH:MM:SS
export const formatTimestamp = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Helper: Format date nicely with Indian Standard Time (IST)
export const formatMeetingDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);

    const datePart = date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
    });

    const timePart = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });

    return `${datePart} • ${timePart} IST`;
};
