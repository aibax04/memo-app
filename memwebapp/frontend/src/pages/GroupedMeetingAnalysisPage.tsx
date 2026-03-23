import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Layers, Loader2, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GroupedAnalysisViewer } from '@/components/GroupedAnalysisViewer';
import {
    listSavedGroupedAnalyses,
    getSavedGroupedAnalysis,
    deleteSavedGroupedAnalysis,
    type GroupedAnalysisData,
} from '@/services/meetingApi';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const GroupedMeetingAnalysisPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isPro } = useAuth();

    const [listLoading, setListLoading] = useState(true);
    const [items, setItems] = useState<
        Array<{ id: string; title: string | null; meeting_count: number; created_at: string | null }>
    >([]);

    const [detailLoading, setDetailLoading] = useState(false);
    const [detailTitle, setDetailTitle] = useState<string | null>(null);
    const [detailAnalysis, setDetailAnalysis] = useState<GroupedAnalysisData | null>(null);
    const [detailCreated, setDetailCreated] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadList = useCallback(async () => {
        if (!isPro) {
            setListLoading(false);
            return;
        }
        setListLoading(true);
        const res = await listSavedGroupedAnalyses();
        setListLoading(false);
        if ('error' in res) {
            toast.error(typeof res.error === 'string' ? res.error : 'Failed to load saved analyses');
            return;
        }
        setItems(res.items || []);
    }, [isPro]);

    useEffect(() => {
        void loadList();
    }, [loadList]);

    const loadDetail = useCallback(async (analysisId: string) => {
        if (!isPro) return;
        setDetailLoading(true);
        setDetailAnalysis(null);
        const res = await getSavedGroupedAnalysis(analysisId);
        setDetailLoading(false);
        if ('error' in res) {
            toast.error(typeof res.error === 'string' ? res.error : 'Not found');
            navigate('/tools/grouped-meeting-analysis', { replace: true });
            return;
        }
        setDetailTitle(res.title);
        setDetailAnalysis(res.analysis);
        setDetailCreated(res.created_at);
    }, [isPro, navigate]);

    useEffect(() => {
        if (id && isPro) {
            void loadDetail(id);
        } else {
            setDetailAnalysis(null);
            setDetailTitle(null);
            setDetailCreated(null);
        }
    }, [id, isPro, loadDetail]);

    const handleDelete = async (analysisId: string) => {
        if (!confirm('Delete this saved grouped analysis?')) return;
        setDeleting(true);
        const res = await deleteSavedGroupedAnalysis(analysisId);
        setDeleting(false);
        if ('error' in res) {
            toast.error(typeof res.error === 'string' ? res.error : 'Delete failed');
            return;
        }
        toast.success('Removed from library');
        if (id === analysisId) {
            navigate('/tools/grouped-meeting-analysis', { replace: true });
        }
        void loadList();
    };

    if (!isPro) {
        return (
            <div className="max-w-lg mx-auto mt-16 text-center px-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 border border-amber-100 mb-6">
                    <Lock className="h-8 w-8 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Grouped meeting analysis</h1>
                <p className="text-slate-600 text-sm font-medium mb-8">
                    Save and review combined AI insights across multiple meetings. This workspace is available on{' '}
                    <strong>Pro</strong>.
                </p>
                <Button className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold" onClick={() => navigate('/dashboard')}>
                    Back to dashboard
                </Button>
            </div>
        );
    }

    if (id) {
        return (
            <div className="w-full max-w-4xl mx-auto pb-16">
                <div className="flex items-center gap-3 mb-8">
                    <Button variant="ghost" size="sm" className="rounded-xl gap-2" asChild>
                        <Link to="/tools/grouped-meeting-analysis">
                            <ArrowLeft className="h-4 w-4" />
                            All saved
                        </Link>
                    </Button>
                </div>
                {detailLoading ? (
                    <div className="flex flex-col items-center py-24 gap-3 text-slate-500">
                        <Loader2 className="h-10 w-10 animate-spin text-[#1B2BB8]" />
                        <p className="font-medium">Loading analysis…</p>
                    </div>
                ) : detailAnalysis ? (
                    <>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                    {detailTitle || 'Grouped analysis'}
                                </h1>
                                {detailCreated && (
                                    <p className="text-xs font-semibold text-slate-400 mt-2 uppercase tracking-wider">
                                        Saved {new Date(detailCreated).toLocaleString()}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                                disabled={deleting}
                                onClick={() => void handleDelete(id)}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 shadow-sm">
                            <GroupedAnalysisViewer analysis={detailAnalysis} />
                        </div>
                    </>
                ) : null}
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto pb-16">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <Layers className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Grouped meeting analysis</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        Open saved combined analyses from your library.
                    </p>
                </div>
            </div>

            <p className="text-sm text-slate-600 mb-8 max-w-2xl">
                Run a new analysis from the dashboard: select meetings with <strong>Select</strong>, then choose{' '}
                <strong>Analyze group</strong>. Save results here for later.
            </p>

            {listLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-[#1B2BB8]" />
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center">
                    <p className="text-slate-600 font-medium">No saved grouped analyses yet.</p>
                    <p className="text-sm text-slate-400 mt-2">
                        Select two or more meetings on the dashboard and run <strong>Analyze group</strong>.
                    </p>
                    <Button className="mt-6 rounded-xl bg-[#1B2BB8] hover:bg-blue-800" onClick={() => navigate('/dashboard')}>
                        Go to meetings
                    </Button>
                </div>
            ) : (
                <ul className="space-y-3">
                    {items.map(row => (
                        <li
                            key={row.id}
                            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-5 shadow-sm hover:border-[#1B2BB8]/30 hover:shadow-md transition-all group"
                        >
                            <Link
                                to={`/tools/grouped-meeting-analysis/${row.id}`}
                                className="flex-1 min-w-0 py-3 pr-2"
                            >
                                <p className="font-bold text-slate-900 truncate group-hover:text-[#1B2BB8] transition-colors">
                                    {row.title || 'Grouped analysis'}
                                </p>
                                <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wide">
                                    {row.meeting_count} meetings
                                    {row.created_at && ` · ${new Date(row.created_at).toLocaleDateString()}`}
                                </p>
                            </Link>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-slate-400 hover:text-red-600"
                                onClick={() => void handleDelete(row.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GroupedMeetingAnalysisPage;
