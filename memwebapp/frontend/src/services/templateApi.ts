import { callApi } from './api';

const API_PREFIX = '/api/v1/web';

export interface Template {
    id: string;
    title: string;
    description: string | null;
    transcription_prompt: string | null;
    summary_prompt: string | null;
    key_points_prompt: string[] | null;
    speaker_diarization: string | null;
    key_points: string[] | null;
    created_by: number | null;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}

export interface PaginatedTemplates {
    data: Template[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface TemplateCreatePayload {
    title: string;
    description?: string;
    transcription_prompt?: string;
    summary_prompt?: string;
    key_points_prompt?: string[];
    speaker_diarization?: string;
}

export interface TemplateUpdatePayload {
    title?: string;
    description?: string;
    transcription_prompt?: string;
    summary_prompt?: string;
    key_points_prompt?: string[];
    speaker_diarization?: string;
    is_active?: boolean;
}

// Fetch all templates (user's + defaults)
export const getTemplates = async (
    page: number = 1,
    limit: number = 50,
    search?: string,
    activeOnly: boolean = true
): Promise<PaginatedTemplates | { error: string }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('active_only', activeOnly.toString());
    params.append('include_default', 'true');
    if (search) params.append('search', search);

    const result = await callApi(`${API_PREFIX}/templates?${params.toString()}`);
    if (result?.error) {
        return { error: result.error };
    }
    return result as PaginatedTemplates;
};

// Get a single template
export const getTemplate = async (id: string): Promise<Template | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/templates/${id}`);
    if (result?.error) {
        return { error: result.error };
    }
    return result as Template;
};

// Create a new template
export const createTemplate = async (payload: TemplateCreatePayload): Promise<Template | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/templates`, 'POST', payload);
    if (result?.error) {
        return { error: result.error };
    }
    return result as Template;
};

// Update a template
export const updateTemplate = async (id: string, payload: TemplateUpdatePayload): Promise<Template | { error: string }> => {
    const result = await callApi(`${API_PREFIX}/templates/${id}`, 'PUT', payload);
    if (result?.error) {
        return { error: result.error };
    }
    return result as Template;
};

// Delete a template
export const deleteTemplate = async (id: string, hard: boolean = false): Promise<{ success: boolean } | { error: string }> => {
    const params = hard ? '?hard_delete=true' : '';
    const result = await callApi(`${API_PREFIX}/templates/${id}${params}`, 'DELETE');
    if (result?.error) {
        return { error: result.error };
    }
    return { success: true };
};

// Get default templates only
export const getDefaultTemplates = async (
    page: number = 1,
    limit: number = 50
): Promise<PaginatedTemplates | { error: string }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    const result = await callApi(`${API_PREFIX}/templates/default?${params.toString()}`);
    if (result?.error) return { error: result.error };
    return result as PaginatedTemplates;
};

// Get user's own templates
export const getMyTemplates = async (
    page: number = 1,
    limit: number = 50
): Promise<PaginatedTemplates | { error: string }> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    const result = await callApi(`${API_PREFIX}/templates/my?${params.toString()}`);
    if (result?.error) return { error: result.error };
    return result as PaginatedTemplates;
};
