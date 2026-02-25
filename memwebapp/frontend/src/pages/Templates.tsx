import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Pencil, Trash2, FileText, ChevronLeft, X, Save,
    Loader2, ClipboardList, LayoutTemplate, Sparkles, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
    getTemplates, createTemplate, updateTemplate, deleteTemplate,
    type Template, type TemplateCreatePayload, type TemplateUpdatePayload
} from '@/services/templateApi';

/* ────────────── Template Form Component ────────────── */
interface TemplateFormProps {
    initialData?: Template | null;
    onSave: (data: TemplateCreatePayload | TemplateUpdatePayload) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

const TemplateForm: React.FC<TemplateFormProps> = ({ initialData, onSave, onCancel, isSaving }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [transcriptionPrompt, setTranscriptionPrompt] = useState(initialData?.transcription_prompt || '');
    const [summaryPrompt, setSummaryPrompt] = useState(initialData?.summary_prompt || '');
    const [keyPointsRaw, setKeyPointsRaw] = useState(
        (initialData?.key_points_prompt || initialData?.key_points || []).join('\n')
    );
    const [speakerDiarization, setSpeakerDiarization] = useState(initialData?.speaker_diarization || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Template title is required');
            return;
        }
        const keyPointsList = keyPointsRaw
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean);

        await onSave({
            title: title.trim(),
            description: description.trim() || undefined,
            transcription_prompt: transcriptionPrompt.trim() || undefined,
            summary_prompt: summaryPrompt.trim() || undefined,
            key_points_prompt: keyPointsList.length > 0 ? keyPointsList : undefined,
            speaker_diarization: speakerDiarization.trim() || undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">
                    Template Title <span className="text-red-400">*</span>
                </label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sales Discovery Call"
                    className="h-12 rounded-xl bg-white border-slate-200 focus:ring-blue-500/20 text-base"
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">
                    Description
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of when to use this template..."
                    rows={2}
                    className="w-full rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 px-4 py-3 text-sm resize-none outline-none transition"
                />
            </div>

            {/* Transcription Prompt */}
            <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">
                    Transcription Prompt
                </label>
                <textarea
                    value={transcriptionPrompt}
                    onChange={(e) => setTranscriptionPrompt(e.target.value)}
                    placeholder="Custom AI instructions for transcription (e.g. Focus on technical terms...)"
                    rows={3}
                    className="w-full rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 px-4 py-3 text-sm resize-none outline-none transition"
                />
            </div>

            {/* Summary Prompt */}
            <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">
                    Summary Prompt
                </label>
                <textarea
                    value={summaryPrompt}
                    onChange={(e) => setSummaryPrompt(e.target.value)}
                    placeholder="Custom AI instructions for generating summaries..."
                    rows={3}
                    className="w-full rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 px-4 py-3 text-sm resize-none outline-none transition"
                />
            </div>

            {/* Key Points */}
            <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">
                    Key Points to Extract <span className="text-slate-400 normal-case font-medium">(one per line)</span>
                </label>
                <textarea
                    value={keyPointsRaw}
                    onChange={(e) => setKeyPointsRaw(e.target.value)}
                    placeholder={"Action items\nDecisions made\nRisks identified\nNext steps"}
                    rows={4}
                    className="w-full rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 px-4 py-3 text-sm resize-none outline-none transition font-mono"
                />
            </div>

            {/* Speaker Diarization */}
            <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">
                    Speaker Identification
                </label>
                <textarea
                    value={speakerDiarization}
                    onChange={(e) => setSpeakerDiarization(e.target.value)}
                    placeholder="Instructions for speaker identification (e.g. Label the product manager as PM...)"
                    rows={2}
                    className="w-full rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 px-4 py-3 text-sm resize-none outline-none transition"
                />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 h-12 rounded-xl bg-[#1B2BB8] hover:bg-[#1525a0] text-white font-bold text-sm uppercase tracking-widest transition-all"
                >
                    {isSaving ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
                    ) : (
                        <><Save className="h-4 w-4 mr-2" /> {initialData ? 'Update Template' : 'Create Template'}</>
                    )}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    className="h-12 px-6 rounded-xl border-slate-200 font-bold text-xs uppercase tracking-widest"
                >
                    Cancel
                </Button>
            </div>
        </form>
    );
};

/* ────────────── Main Templates Page ────────────── */
const Templates: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const fetchTemplates = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const result = await getTemplates(1, 100, searchQuery || undefined);
            if ('error' in result) {
                toast.error('Failed to load templates');
            } else {
                setTemplates(result.data || []);
            }
        } catch {
            toast.error('Error loading templates');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    useEffect(() => {
        const timeout = setTimeout(() => fetchTemplates(), 400);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const handleCreate = async (data: TemplateCreatePayload | TemplateUpdatePayload) => {
        setIsSaving(true);
        try {
            const result = await createTemplate(data as TemplateCreatePayload);
            if ('error' in result) {
                toast.error('Failed to create template');
            } else {
                toast.success('Template created!');
                setShowForm(false);
                fetchTemplates(true);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (data: TemplateCreatePayload | TemplateUpdatePayload) => {
        if (!editingTemplate) return;
        setIsSaving(true);
        try {
            const result = await updateTemplate(editingTemplate.id, data as TemplateUpdatePayload);
            if ('error' in result) {
                toast.error('Failed to update template');
            } else {
                toast.success('Template updated!');
                setEditingTemplate(null);
                setShowForm(false);
                fetchTemplates(true);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const original = [...templates];
        setTemplates(prev => prev.filter(t => t.id !== id));
        const result = await deleteTemplate(id);
        if ('error' in result) {
            toast.error('Failed to delete template');
            setTemplates(original);
        } else {
            toast.success('Template deleted');
            setShowDeleteConfirm(null);
            fetchTemplates(true);
        }
    };

    const openEdit = (template: Template) => {
        setEditingTemplate(template);
        setShowForm(true);
    };

    const openCreate = () => {
        setEditingTemplate(null);
        setShowForm(true);
    };

    const closeForm = () => {
        setEditingTemplate(null);
        setShowForm(false);
    };

    const isDefault = (t: Template) => t.created_by === null;

    return (
        <div className="w-full relative min-h-[90vh]">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-indigo-600/5 blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[25%] h-[25%] rounded-full bg-blue-600/5 blur-[100px]" />
            </div>

            {/* Header */}
            <div className="relative z-10 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex flex-col gap-3">
                    <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#1B2BB8] transition-colors w-fit group">
                        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="h-px w-8 bg-[#1B2BB8]/30" />
                        <p className="text-[11px] font-black text-[#1B2BB8] tracking-[0.3em] uppercase">
                            Meeting Templates
                        </p>
                    </div>
                    <h1 className="text-4xl font-light text-slate-900 tracking-tight leading-none">
                        Manage <span className="font-semibold text-[#1B2BB8]">Templates</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-4 w-full md:w-[280px] h-12 bg-white/80 backdrop-blur-sm border-slate-200 rounded-2xl focus:ring-blue-500/10 shadow-sm transition-all focus:bg-white focus:shadow-md"
                        />
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchTemplates()}
                        className={`h-12 w-12 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition-all hover:scale-105 active:scale-95 ${isLoading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="h-4 w-4 text-slate-600" />
                    </Button>

                    <Button
                        onClick={openCreate}
                        className="h-12 px-6 rounded-2xl bg-[#1B2BB8] hover:bg-[#1525a0] text-white font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Template
                    </Button>
                </div>
            </div>

            {/* Form Modal Overlay */}
            {showForm && (
                <>
                    <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={closeForm} />
                    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white/95 backdrop-blur-lg shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-md border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-xl">
                                    <LayoutTemplate className="h-5 w-5 text-[#1B2BB8]" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    {editingTemplate ? 'Edit Template' : 'Create Template'}
                                </h2>
                            </div>
                            <button onClick={closeForm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8">
                            <TemplateForm
                                initialData={editingTemplate}
                                onSave={editingTemplate ? handleUpdate : handleCreate}
                                onCancel={closeForm}
                                isSaving={isSaving}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* Content */}
            <div className="relative z-10">
                {isLoading && templates.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-[2rem] border border-slate-100 p-7 space-y-4 animate-pulse">
                                <div className="flex justify-between items-start">
                                    <div className="h-6 w-24 bg-slate-100 rounded-full" />
                                    <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-5 w-3/4 bg-slate-100 rounded-md" />
                                    <div className="h-4 w-1/2 bg-slate-100 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300">
                        <div className="p-6 bg-slate-50 rounded-full mb-6">
                            <LayoutTemplate className="h-12 w-12 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No templates found</h3>
                        <p className="text-slate-500 max-w-xs text-center mb-8">
                            {searchQuery
                                ? `No templates match "${searchQuery}".`
                                : "Create your first template to customise meeting AI processing."}
                        </p>
                        {!searchQuery && (
                            <Button onClick={openCreate} className="rounded-2xl px-6 h-11 bg-[#1B2BB8] hover:bg-[#1525a0] text-white font-bold text-xs uppercase tracking-widest">
                                <Plus className="h-4 w-4 mr-2" /> Create Template
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="group relative bg-white/80 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] rounded-[2.5rem] border border-slate-200/60 p-7 cursor-pointer overflow-hidden"
                                onClick={() => openEdit(template)}
                            >
                                {/* Hover glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                <div className="relative z-10">
                                    {/* Badge row */}
                                    <div className="flex justify-between items-start mb-5">
                                        <div className="flex items-center gap-2">
                                            {isDefault(template) ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 border-blue-200 text-blue-700">
                                                    <Sparkles className="h-3 w-3" /> System
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-50 border-emerald-200 text-emerald-700">
                                                    <FileText className="h-3 w-3" /> Custom
                                                </span>
                                            )}
                                        </div>

                                        {!isDefault(template) && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEdit(template); }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(template.id); }}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2 mb-2 group-hover:text-[#1B2BB8] transition-colors leading-tight tracking-tight">
                                        {template.title}
                                    </h3>

                                    {/* Description */}
                                    {template.description && (
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-5 leading-relaxed">
                                            {template.description}
                                        </p>
                                    )}

                                    {/* Key Points preview */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100/80">
                                        {(template.key_points_prompt || template.key_points || []).length > 0 && (
                                            <div className="flex items-start gap-2">
                                                <ClipboardList className="h-3.5 w-3.5 text-blue-500/60 mt-0.5 shrink-0" />
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(template.key_points_prompt || template.key_points || []).slice(0, 3).map((kp, i) => (
                                                        <span key={i} className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 rounded-md border border-slate-100">
                                                            {kp}
                                                        </span>
                                                    ))}
                                                    {(template.key_points_prompt || template.key_points || []).length > 3 && (
                                                        <span className="px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                                            +{(template.key_points_prompt || template.key_points || []).length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                            Updated {new Date(template.updated_at).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Delete Confirm Popover */}
                                {showDeleteConfirm === template.id && (
                                    <div
                                        className="absolute top-4 right-4 z-50 w-56 bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 px-1">
                                            Delete Template?
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="flex-1 text-[10px] h-9 rounded-xl font-bold uppercase tracking-widest"
                                                onClick={() => handleDelete(template.id)}
                                            >
                                                DELETE
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="flex-1 text-[10px] h-9 rounded-xl font-bold uppercase tracking-widest"
                                                onClick={() => setShowDeleteConfirm(null)}
                                            >
                                                NO
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Global overlay for delete confirm */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[1px]" onClick={() => setShowDeleteConfirm(null)} />
            )}
        </div>
    );
};

export default Templates;
