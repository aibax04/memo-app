import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Clock, RefreshCw, Trash2, Mic, CheckCircle2, Loader2, AlertCircle, Brain, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getMeetings, deleteMeeting, formatMeetingDate, formatDuration, type Meeting } from '@/services/meetingApi';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    COMPLETED: { label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    PROCESSING: { label: 'Processing', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    PENDING: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: <Clock className="h-3.5 w-3.5" /> },
    RECORDING: { label: 'Recording', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: <Mic className="h-3.5 w-3.5 animate-pulse" /> },
    FAILED: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const MeetingsList: React.FC = () => {
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [perPage] = useState(12);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const { user } = useAuth();

    const fetchMeetings = useCallback(async (silent = false) => {
        const token = localStorage.getItem('memoapp_access_token');
        if (!token) {
            console.log('🚫 No access token found, skipping meetings fetch');
            return;
        }

        if (!silent) setIsLoading(true);
        try {
            const result = await getMeetings(currentPage, perPage, statusFilter || undefined, searchQuery || undefined);
            if ('error' in result) {
                toast.error('Failed to load meetings');
            } else {
                setMeetings(result.data || []);
                setTotalPages(result.total_pages || 1);
            }
        } catch (error) {
            toast.error('Error loading meetings');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [currentPage, perPage, statusFilter, searchQuery]);

    useEffect(() => {
        fetchMeetings();
    }, [fetchMeetings]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setCurrentPage(1);
            fetchMeetings();
        }, 400);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const handleDelete = async (meetingId: string) => {
        // Optimistic update to prevent flicker
        const originalMeetings = [...meetings];
        setMeetings(prev => prev.filter(m => String(m.id) !== meetingId));

        const result = await deleteMeeting(meetingId);
        if ('error' in result) {
            toast.error('Failed to delete meeting');
            // Rollback on error
            setMeetings(originalMeetings);
        } else {
            toast.success('Meeting deleted');
            setShowDeleteConfirm(null);
            // Silent refresh to ensure pagination and total counts are correct
            fetchMeetings(true);
        }
    };

    const getStatusBadge = (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.color}`}>
                {config.icon}
                {config.label}
            </span>
        );
    };

    const getGreeting = () => {
        // Get hour in IST
        const hour = parseInt(new Intl.DateTimeFormat('en-IN', {
            hour: 'numeric',
            hour12: false,
            timeZone: 'Asia/Kolkata'
        }).format(new Date()));

        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="w-full relative min-h-[90vh]">
            {/* Ambient Background Accents */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-blue-600/5 blur-[120px]" />
                <div className="absolute bottom-[20%] right-[-5%] w-[25%] h-[25%] rounded-full bg-indigo-600/5 blur-[100px]" />
            </div>

            {/* Header */}
            <div className="relative z-10 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <span className="h-px w-8 bg-[#1B2BB8]/30"></span>
                            <p className="text-[11px] font-black text-[#1B2BB8] tracking-[0.3em] uppercase">
                                Intelligence Dashboard
                            </p>
                        </div>
                        <h1 className="text-5xl font-light text-slate-900 tracking-tight leading-none">
                            {getGreeting()}, <span className="font-semibold text-[#1B2BB8]">{user?.name || 'Agent'}</span>
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                            placeholder="Search intelligence..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-4 w-full md:w-[320px] h-12 bg-white/80 backdrop-blur-sm border-slate-200 rounded-2xl focus:ring-blue-500/10 shadow-sm transition-all focus:bg-white focus:shadow-md"
                        />
                    </div>

                    <div className="flex items-center p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-slate-200/50">
                        <button
                            onClick={() => { setStatusFilter(''); setCurrentPage(1); }}
                            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === '' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            ALL
                        </button>
                        <button
                            onClick={() => { setStatusFilter('COMPLETED'); setCurrentPage(1); }}
                            className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === 'COMPLETED' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            SYNCED
                        </button>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchMeetings()}
                        className={`h-12 w-12 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition-all hover:scale-105 active:scale-95 ${isLoading ? 'animate-spin-slow' : ''}`}
                    >
                        <RefreshCw className="h-4 w-4 text-slate-600" />
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="relative z-10">
                {isLoading && meetings.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 animate-pulse">
                                <div className="flex justify-between items-start">
                                    <div className="h-6 w-20 bg-slate-100 rounded-full" />
                                    <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-5 w-3/4 bg-slate-100 rounded-md" />
                                    <div className="h-5 w-1/2 bg-slate-100 rounded-md" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300">
                        <div className="p-6 bg-slate-50 rounded-full mb-6">
                            <Mic className="h-12 w-12 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No meetings found</h3>
                        <p className="text-slate-500 max-w-xs text-center mb-8">
                            {searchQuery ? `No meetings match "${searchQuery}".` : "You haven't recorded any meetings yet."}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {meetings.map((meeting) => (
                                <div
                                    key={meeting.id}
                                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                                    className="group relative bg-white/80 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] rounded-[2.5rem] border border-slate-200/60 p-7 cursor-pointer overflow-hidden"
                                >
                                    {/* Decorative Gradient Overlay on Hover */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex flex-col gap-1.5">
                                                {getStatusBadge(meeting.status)}
                                                {meeting.is_processed && (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50/50 w-fit">
                                                        <Brain className="h-3 w-3" />
                                                        Intel extracted
                                                    </span>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowDeleteConfirm(String(meeting.id));
                                                    }}
                                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>

                                                {showDeleteConfirm === String(meeting.id) && (
                                                    <div className="absolute top-0 right-0 z-50 w-56 bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
                                                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 px-1">Delete Intel?</p>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="flex-1 text-[10px] h-9 rounded-xl font-bold uppercase tracking-widest"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(String(meeting.id));
                                                                }}
                                                            >
                                                                DELETE
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="flex-1 text-[10px] h-9 rounded-xl font-bold uppercase tracking-widest"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowDeleteConfirm(null);
                                                                }}
                                                            >
                                                                NO
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 line-clamp-2 mb-6 group-hover:text-blue-600 transition-colors leading-tight tracking-tight h-[3.5rem] flex items-center">
                                            {meeting.title}
                                        </h3>

                                        <div className="space-y-4 pt-5 border-t border-slate-100/80">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 font-mono">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5 text-blue-500/70" />
                                                    <span>{formatMeetingDate(meeting.created_at).split('•')[0]}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5 text-blue-500/70" />
                                                    <span>{formatDuration(meeting.duration)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-2 pt-2">
                                                <div className="flex -space-x-2">
                                                    {[...Array(Math.min(3, meeting.participants?.length || 1))].map((_, i) => (
                                                        <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400">
                                                            {meeting.participants?.[i]?.charAt(0).toUpperCase() || 'A'}
                                                        </div>
                                                    ))}
                                                    {(meeting.participants?.length || 0) > 3 && (
                                                        <div className="w-6 h-6 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400">
                                                            +{(meeting.participants?.length || 0) - 3}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-slate-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                                                    <ChevronRight className="h-4 w-4 text-blue-600" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className="mt-12 flex items-center justify-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="rounded-xl px-4 border-slate-200"
                                >
                                    Previous
                                </Button>
                                <span className="text-sm font-bold text-slate-600 px-4">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="rounded-xl px-4 border-slate-200"
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[1px]" onClick={() => setShowDeleteConfirm(null)} />
                )}
            </div>
        </div>
    );
};

export default MeetingsList;
