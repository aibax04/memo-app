import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar as CalendarIcon, Clock, RefreshCw, Trash2, Mic, CheckCircle2, Loader2, AlertCircle, Brain, ChevronRight, Activity, LogOut, LayoutTemplate, Video, Users, Smartphone, Layers, MessageSquareText, Zap, ShieldCheck, Chrome, CalendarPlus, ExternalLink, Menu, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getMeetings, deleteMeeting, formatMeetingDate, formatDuration, type Meeting } from '@/services/meetingApi';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import ChatBot from '@/components/ChatBot';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { isSameDay } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    COMPLETED: { label: 'Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    PROCESSING: { label: 'Processing', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    PENDING: { label: 'Pending', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: <Clock className="h-3.5 w-3.5" /> },
    RECORDING: { label: 'Recording', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: <Mic className="h-3.5 w-3.5 animate-pulse" /> },
    FAILED: { label: 'Failed', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const PLATFORM_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    google_meet: { label: 'Google Meet', icon: <Activity className="h-3 w-3" />, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    teams: { label: 'Microsoft Teams', icon: <Users className="h-3 w-3" />, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    zoom: { label: 'Zoom', icon: <Video className="h-3 w-3" />, color: 'bg-sky-50 text-sky-700 border-sky-100' },
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
    const { user, isPro, logout } = useAuth();

    // Pro state
    const [showPromoDialog, setShowPromoDialog] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [showTransition, setShowTransition] = useState(false);

    const handleUnlock = async () => {
        try {
            const { activatePro } = await import('@/services/api');
            const result = await activatePro(promoCode.trim());
            if (!result.error) {
                setShowPromoDialog(false);
                setShowTransition(true);
                setTimeout(() => setShowTransition(false), 3000);
                toast.success("Premium features unlocked!");
            } else {
                toast.error(result.detail || result.error || "Invalid promo code.");
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to unlock pro features.");
        }
    };

    // Calendar state
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const meetingDates = meetings.map(m => new Date(m.created_at));
    const selectedDateMeetings = meetings.filter(m => selectedDate && isSameDay(new Date(m.created_at), selectedDate));

    const handleLogout = () => {
        logout();
        toast.success("Logged out successfully");
    };

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
        <div className="w-full relative flex flex-col min-h-0 flex-1">

            {showTransition && (
                <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-amber-500/20 backdrop-blur-sm animate-in fade-in duration-500">

                    <div className="bg-white p-12 rounded-full shadow-2xl shadow-amber-500/50 flex flex-col items-center animate-in zoom-in duration-500">
                        <Zap className="h-16 w-16 text-amber-500 mb-4 animate-bounce" />
                        <h2 className="text-3xl font-black text-amber-500 uppercase tracking-widest">Premium Unlocked</h2>
                    </div>
                </div>
            )}

            <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
                <DialogContent className="sm:max-w-md bg-white border-slate-200 shadow-xl rounded-[2rem] p-6 focus:outline-none focus-visible:outline-none z-[100]">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl font-bold text-slate-900">Unlock Pro Features</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <p className="text-sm text-slate-600 font-medium">Enter your promo code to unlock unlimited recordings and premium analytics.</p>
                        <Input
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="Enter promo code"
                            className="h-12 border-slate-200 rounded-xl"
                        />
                        <Button onClick={handleUnlock} className="w-full bg-amber-500 hover:bg-amber-600 text-white h-12 rounded-xl font-bold text-lg">
                            Unlock Now
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ambient Background Accents */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">

                <div className="absolute top-[10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-[#1B2BB8]/5 blur-[120px]" />
            </div>

            {/* Header */}
            <div className="relative z-10 mb-8 flex flex-col xl:flex-row xl:items-start justify-between gap-6 flex-shrink-0">
                <div>
                    <div className="flex flex-col gap-4">

                        <h1 className="text-5xl font-light text-slate-900 tracking-tight leading-tight flex items-center gap-2">
                            {getGreeting()},
                            <span className="font-bold text-[#1B2BB8]">
                                {user?.name ? user.name.charAt(0).toUpperCase() + user.name.slice(1) : 'Agent'}
                            </span>
                            {isPro && (
                                <span className="ml-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black rounded-lg shadow-sm uppercase tracking-wider animate-in fade-in zoom-in duration-500">
                                    Pro
                                </span>
                            )}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 w-full xl:w-auto mt-4 xl:mt-0">
                    <div className="relative group w-full sm:w-auto flex-grow xl:flex-grow-0">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-20">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-[#1B2BB8] transition-colors" />
                            <div className="h-4 w-[1px] bg-slate-200 group-focus-within:bg-[#1B2BB8]/30 transition-colors" />
                        </div>
                        <Input
                            placeholder="Search intelligence..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-14 pr-4 w-full sm:w-[320px] h-12 bg-white/80 backdrop-blur-sm border-slate-200 rounded-2xl focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] shadow-lg shadow-blue-900/5 transition-all focus:bg-white placeholder:text-slate-400 font-medium"
                        />
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-3">

                        <Button
                            variant="outline"
                            onClick={() => navigate('/templates')}
                            className="h-12 px-5 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-slate-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 font-bold text-xs uppercase tracking-widest text-slate-600 flex-shrink-0"
                        >
                            <LayoutTemplate className="h-4 w-4 mr-2" />
                            Templates
                        </Button>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => fetchMeetings()}
                            className={`h-12 w-12 rounded-2xl border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-slate-50 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0 ${isLoading ? 'animate-spin-slow' : ''}`}
                        >
                            <RefreshCw className="h-4 w-4 text-slate-600" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Limit Banner */}
            {(!isPro && meetings.length >= 10) && (
                <div className="relative z-10 mb-8 bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <Lock className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-red-900 mb-1">Trial Limit Reached</h3>
                            <p className="text-sm font-medium text-red-700">You've reached the 10-recording trial limit. Upgrade to **Pro** for unlimited recordings, premium analytics, and full workspace control.</p>
                        </div>
                    </div>
                    <Button
                        className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl whitespace-nowrap px-6"
                        onClick={() => setShowPromoDialog(true)}
                    >
                        Unlock Pro Now
                    </Button>
                </div>
            )}

            {/* Content Area */}
            <div className="relative z-10 flex-1 min-h-0 flex flex-col">
                <div className="flex-1 min-w-0 flex flex-col">
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
                        <div className="flex-1 flex flex-col pt-4">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl font-light text-slate-900 tracking-tight mb-3">Unlock Meeting <span className="font-bold text-[#1B2BB8]">Intelligence</span></h2>
                                <p className="text-slate-500 max-w-lg mx-auto font-medium">Capture voices, extract insights, and sync directly to your CRM with enterprise-grade AI.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    {
                                        icon: <Smartphone className="h-6 w-6" />,
                                        title: "Mobile Ready",
                                        desc: "Record anywhere. Our mobile-optimized web app ensures you never miss a field visit or hallway chat."
                                    },
                                    {
                                        icon: <Layers className="h-6 w-6" />,
                                        title: "Custom Templates",
                                        desc: "Structure insights for specifically what YOU care about—Technical, Sales, or Client Success."
                                    },
                                    {
                                        icon: <MessageSquareText className="h-6 w-6" />,
                                        title: "Technical Insights",
                                        desc: "Extract specific technical keywords, platform needs, and requirements from messy conversations."
                                    },
                                    {
                                        icon: <Zap className="h-6 w-6" />,
                                        title: "Instant Analysis",
                                        desc: "No waiting hours. Most transcripts and AI summaries are ready in less than 90 seconds."
                                    },
                                    {
                                        icon: <ShieldCheck className="h-6 w-6" />,
                                        title: "Secure & Private",
                                        desc: "Your data is encrypted. We never train public models on your private professional meetings."
                                    },
                                    {
                                        icon: <Users className="h-6 w-6" />,
                                        title: "Team Collaboration",
                                        desc: "Share meeting keys with team members and collaborate on transcripts and action items."
                                    }
                                ].map((feature, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-white p-8 rounded-[2rem] border border-slate-200/60 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg group"
                                    >
                                        <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6 group-hover:bg-[#1B2BB8] group-hover:text-white transition-all duration-300">
                                            <span className="text-[#1B2BB8] group-hover:text-white transition-colors">{feature.icon}</span>
                                        </div>
                                        <h3 className="text-lg font-bold mb-3 tracking-tight text-slate-800">{feature.title}</h3>
                                        <p className="text-slate-500 leading-relaxed text-xs md:text-sm font-medium">{feature.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-16 text-center pb-20">
                                <div className="inline-block p-1 rounded-2xl bg-blue-50 border border-blue-100">
                                    <Button
                                        onClick={() => window.open('https://makememo.ai/', '_blank')}
                                        className="bg-[#1B2BB8] hover:bg-blue-800 text-white font-bold rounded-xl px-8 h-12 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                                    >
                                        Start Your First Recording
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {meetings.map((meeting) => (
                                    <div
                                        key={meeting.id}
                                        onClick={() => navigate(`/meetings/${meeting.id}`)}
                                        className="group relative bg-white transition-all duration-300 hover:shadow-xl hover:border-blue-200 rounded-3xl border border-slate-200 p-6 cursor-pointer overflow-hidden"
                                    >
                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {getStatusBadge(meeting.status)}
                                                    {meeting.platform && PLATFORM_CONFIG[meeting.platform] && (
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${PLATFORM_CONFIG[meeting.platform].color}`}>
                                                            {PLATFORM_CONFIG[meeting.platform].icon}
                                                            {PLATFORM_CONFIG[meeting.platform].label}
                                                        </span>
                                                    )}
                                                </div>
                                                {meeting.is_processed && (
                                                    <Brain className="h-4 w-4 text-[#1B2BB8]" />
                                                )}
                                            </div>

                                            <h3 className="text-lg font-bold text-slate-900 mb-4 line-clamp-2 leading-snug break-all min-h-[3rem] flex items-start">
                                                {meeting.title || 'Untitled'}
                                            </h3>

                                            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <CalendarIcon className="h-3.5 w-3.5" />
                                                        <span>{formatMeetingDate(meeting.created_at).split('•')[0]}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>{formatDuration(meeting.duration)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex -space-x-1.5">
                                                    {[...Array(Math.min(3, meeting.participants?.length || 0))].map((_, i) => (
                                                        <div key={i} className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[7px] font-bold text-slate-500">
                                                            {meeting.participants?.[i]?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                    ))}
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

                </div>
            </div>

            {/* Layout Footer / Sign Out */}
            <div className="relative z-10 mt-auto pt-6 border-t border-slate-200/50 flex justify-start pb-6 flex-shrink-0">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 text-sm font-bold text-slate-500 hover:text-red-500 transition-all group hover:bg-red-50 px-5 py-3 rounded-2xl"
                >
                    <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Sign Out</span>
                </button>
            </div>
            {/* ChatBot Section */}
            <ChatBot meetings={meetings} />
        </div>
    );
};

export default MeetingsList;
