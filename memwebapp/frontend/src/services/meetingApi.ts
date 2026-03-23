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
    platform: string | null;
}

export interface PaginatedMeetings {
    data: Meeting[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    /** True when a free account has more meetings than the 10 shown (upgrade to see all). */
    has_more_meetings_on_account?: boolean;
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

export type EmailDraftTone = 'professional' | 'friendly' | 'concise' | 'formal' | 'warm';

/** AI draft of a follow-up email from meeting intelligence (uses Gemini on the server). */
export const draftFollowUpEmail = async (
    meetingId: string,
    opts: { tone: EmailDraftTone; extra_instructions?: string | null }
): Promise<{ success: boolean; subject: string; body: string } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}/draft-follow-up-email`, 'POST', {
        tone: opts.tone,
        extra_instructions: opts.extra_instructions?.trim() || null,
    });
    if (result?.error) {
        return { error: typeof result.error === 'string' ? result.error : 'Failed to draft email' };
    }
    return result as { success: boolean; subject: string; body: string };
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

/** Pro-only: delete multiple meetings in one request. */
export const deleteMeetingsBulk = async (
    meetingIds: string[]
): Promise<{ status: string; deleted: number; requested: number; message: string } | { error: string }> => {
    if (!meetingIds.length) {
        return { error: 'No meetings selected' };
    }
    const result = await callApi(`${API_PREFIX}/meetings/bulk-delete`, 'POST', {
        meeting_ids: meetingIds,
    });
    if (result?.error) {
        return { error: result.error };
    }
    return result as { status: string; deleted: number; requested: number; message: string };
};

/** Combined AI analysis JSON (shape from Gemini). */
export type GroupedAnalysisData = Record<string, unknown>;

export const runGroupedMeetingAnalysis = async (
    meetingIds: string[]
): Promise<
    | { success: boolean; analysis: GroupedAnalysisData; meeting_ids: string[] }
    | { error: string }
> => {
    if (meetingIds.length < 2) {
        return { error: 'Select at least two meetings' };
    }
    const result = await callApi(`${API_PREFIX}/meetings/grouped-analysis/run`, 'POST', {
        meeting_ids: meetingIds,
    });
    if (result?.error) {
        return { error: result.error };
    }
    return result as { success: boolean; analysis: GroupedAnalysisData; meeting_ids: string[] };
};

export const saveGroupedMeetingAnalysis = async (opts: {
    meeting_ids: string[];
    analysis: GroupedAnalysisData;
    title?: string;
}): Promise<{ success: boolean; id: string; title: string } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/grouped-analysis/save`, 'POST', {
        meeting_ids: opts.meeting_ids,
        analysis: opts.analysis,
        title: opts.title?.trim() || undefined,
    });
    if (result?.error) {
        return { error: result.error };
    }
    return result as { success: boolean; id: string; title: string };
};

export const listSavedGroupedAnalyses = async (): Promise<
    | {
          items: Array<{
              id: string;
              title: string | null;
              meeting_count: number;
              created_at: string | null;
          }>;
      }
    | { error: string }
> => {
    const result = await callApi(`${API_PREFIX}/meetings/grouped-analysis/saved`);
    if (result?.error) {
        return { error: result.error };
    }
    return result as {
        items: Array<{ id: string; title: string | null; meeting_count: number; created_at: string | null }>;
    };
};

export const getSavedGroupedAnalysis = async (
    id: string
): Promise<
    | {
          id: string;
          title: string | null;
          meeting_ids: string[];
          analysis: GroupedAnalysisData;
          created_at: string | null;
      }
    | { error: string }
> => {
    const result = await callApi(`${API_PREFIX}/meetings/grouped-analysis/saved/${id}`);
    if (result?.error) {
        return { error: result.error };
    }
    return result as {
        id: string;
        title: string | null;
        meeting_ids: string[];
        analysis: GroupedAnalysisData;
        created_at: string | null;
    };
};

export const deleteSavedGroupedAnalysis = async (
    id: string
): Promise<{ success: boolean } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/grouped-analysis/saved/${id}`, 'DELETE');
    if (result?.error) {
        return { error: result.error };
    }
    return result as { success: boolean };
};

// Reprocess a meeting
export const reprocessMeeting = async (meetingId: string): Promise<{ status: string; message: string } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}/reprocess`, 'POST');
    if (result?.error) {
        return { error: result.error };
    }
    return result;
};

// Rename a speaker within a meeting
export const renameSpeaker = async (meetingId: string, oldSpeakerName: string, newSpeakerName: string): Promise<{ status: string; message: string } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}/rename-speaker`, 'POST', {
        old_speaker_name: oldSpeakerName,
        new_speaker_name: newSpeakerName
    });
    if (result?.error) {
        return { error: result.error };
    }
    return result;
};

// Merge multiple speakers into a single target speaker
export const mergeSpeakers = async (meetingId: string, targetSpeaker: string, sourceSpeakers: string[]): Promise<{ status: string; message: string } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}/merge-speakers`, 'POST', {
        target_speaker: targetSpeaker,
        source_speakers: sourceSpeakers
    });
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

// Get meetings by speaker
export const getMeetingsBySpeaker = async (speakerName: string): Promise<{ items: Meeting[]; total: number } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/by-speaker?speaker_name=${encodeURIComponent(speakerName)}`);
    if (result?.error) {
        return { error: result.error };
    }
    return result;
};

export interface BuyerIntentData {
    meeting_type: string;
    meeting_type_confidence: number;
    purchase_readiness: number;
    purchase_readiness_label: string;
    emotional_arc: { phase: string; emotion: string; intensity: number; note: string }[];
    buyer_signals: { type: string; signal: string; quote: string; weight: number }[];
    question_analysis: {
        total_questions: number;
        focused_questions: number;
        irregular_questions: number;
        top_concerns: string[];
        off_topic_flags: string[];
        curiosity_score: number;
    };
    participant_emotions: {
        name: string;
        role_guess: string;
        dominant_emotion: string;
        engagement_level: number;
        interest_trend: string;
        key_moments: string[];
    }[];
    tone_summary: string;
    follow_up_recommendation: {
        priority: string;
        suggested_action: string;
        timing: string;
        risk_level: string;
    };
    deal_health: {
        score: number;
        label: string;
        blockers: string[];
        accelerators: string[];
    };
}

/** Run AI buyer-intent analysis for a meeting. */
export const analyseBuyerIntent = async (
    meetingId: string
): Promise<{ success: boolean; data: BuyerIntentData } | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/meetings/${meetingId}/buyer-intent`, 'POST');
    if (result?.error) {
        return { error: typeof result.error === 'string' ? result.error : 'Analysis failed' };
    }
    return result as { success: boolean; data: BuyerIntentData };
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
