import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Play, Pause, Download, Volume2, Clock, Calendar, Users, Search,
    FileText, BarChart3, Mic, AlertCircle, Loader2, CheckCircle2,
    RefreshCw, ChevronRight, MessageSquare, ListChecks, Lightbulb,
    TrendingUp, ThumbsUp, ThumbsDown, Minus, Trash2, Zap, Brain, Activity,
    Shield, Target, Award, UserPlus, Info, Volume1, Waves, Video, Pencil, Lock, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    getMeeting, getMeetingAudioUrl, reprocessMeeting, deleteMeeting, renameSpeaker,
    updateMeeting, formatTimestamp, formatMeetingDate, formatDuration,
    mergeSpeakers,
    type Meeting, type TranscriptionSegment
} from '@/services/meetingApi';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, Cell } from 'recharts';

type TabType = 'transcription' | 'summary' | 'analytics' | 'audio';

const SPEAKER_COLORS = [
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', accent: '#1B2BB8' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', accent: '#10B981' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', accent: '#8B5CF6' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', accent: '#F97316' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', accent: '#EC4899' },
];

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

const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.color}`}>
            {config.icon}
            {config.label}
        </span>
    );
};

const MeetingDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('summary');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.7);
    const [speakerColorMap, setSpeakerColorMap] = useState<Record<string, typeof SPEAKER_COLORS[0]>>({});
    const [isReprocessing, setIsReprocessing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [searchTranscript, setSearchTranscript] = useState('');
    const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
    const [newSpeakerName, setNewSpeakerName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isMergeMode, setIsMergeMode] = useState(false);
    const [selectedSpeakersForMerge, setSelectedSpeakersForMerge] = useState<string[]>([]);
    const [isMerging, setIsMerging] = useState(false);

    const { user, isPro, logout } = useAuth();

    // Pro state
    const [showPromoDialog, setShowPromoDialog] = useState(false);
    const [promoCode, setPromoCode] = useState('');
    const [showTransition, setShowTransition] = useState(false);

    const handleUnlock = async () => {
        try {
            const { activatePro } = await import('@/services/api');
            const result = await activatePro(promoCode);
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

    useEffect(() => {
        if (!id) { navigate('/meetings'); return; }
        const loadMeeting = async () => {
            const token = localStorage.getItem('memoapp_access_token');
            if (!token) {
                console.log('🚫 No access token found, skipping meeting load');
                return;
            }

            setIsLoading(true);
            const result = await getMeeting(id);
            if ('error' in result) {
                toast.error('Failed to load meeting');
                navigate('/meetings');
                return;
            }
            setMeeting(result);
            setNewTitle(result.title);

            const speakers = new Set<string>();
            if (result.transcription) {
                result.transcription.forEach(seg => speakers.add(seg.speaker));
            }
            const colorMap: Record<string, typeof SPEAKER_COLORS[0]> = {};
            Array.from(speakers).forEach((speaker, i) => {
                colorMap[speaker] = SPEAKER_COLORS[i % SPEAKER_COLORS.length];
            });
            setSpeakerColorMap(colorMap);
            setIsLoading(false);
        };
        loadMeeting();
    }, [id, navigate]);

    useEffect(() => {
        if (!id) return;
        const loadAudio = async () => {
            const result = await getMeetingAudioUrl(id);
            if (!('error' in result)) {
                setAudioUrl(result.download_url);
            }
        };
        loadAudio();
    }, [id]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTimeUpdate = () => setCurrentTime(audio.currentTime);
        const onDurationChange = () => setDuration(audio.duration);
        const onEnded = () => setIsPlaying(false);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('durationchange', onDurationChange);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('durationchange', onDurationChange);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
        };
    }, [audioUrl]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (audioRef.current.paused) {
            audioRef.current.play().catch(err => console.error("Playback failed:", err));
        } else {
            audioRef.current.pause();
        }
    };

    const seekTo = (time: number) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
        if (!isDragging || !duration) return;
        const slider = document.getElementById('audio-slider');
        if (!slider) return;
        const rect = slider.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seekTo(pct * duration);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', () => setIsDragging(false));
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', () => setIsDragging(false));
        };
    }, [isDragging, duration]);

    const handleRenameTitle = async () => {
        if (!id || !newTitle.trim() || newTitle === meeting?.title) {
            setIsEditingTitle(false);
            return;
        }

        const result = await updateMeeting(id, { title: newTitle });
        if ('error' in result) {
            toast.error('Failed to rename meeting');
        } else {
            toast.success('Meeting renamed');
            setMeeting(prev => prev ? { ...prev, title: newTitle } : null);
        }
        setIsEditingTitle(false);
    };

    const downloadTranscript = () => {
        if (!meeting) return;
        const text = meeting.transcription?.map(s => `[${formatTimestamp(s.start)}] ${s.speaker}: ${s.text}`).join('\n') || '';
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${meeting.title}_Transcript.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadAudio = () => {
        if (!audioUrl || !meeting) return;
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = `${meeting.title}_Audio${meeting.audio_filename.substring(meeting.audio_filename.lastIndexOf('.')) || '.mp3'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleReprocess = async () => {
        if (!id) return;
        setIsReprocessing(true);
        const result = await reprocessMeeting(id);
        if ('error' in result) {
            toast.error('Reprocessing failed');
        } else {
            toast.success('Reprocessing started');
        }
        setIsReprocessing(false);
    };

    const handleRenameSpeaker = async (oldName: string, newName: string) => {
        if (!id || !newName.trim() || oldName === newName) {
            setEditingSpeaker(null);
            return;
        }

        setIsRenaming(true);
        const result = await renameSpeaker(id, oldName, newName);
        if ('error' in result) {
            toast.error('Failed to rename speaker');
        } else {
            toast.success('Speaker renamed globally in this meeting');
            // Update local state to reflect change immediately
            if (meeting) {
                const updatedMeeting = { ...meeting };
                if (updatedMeeting.transcription) {
                    updatedMeeting.transcription = updatedMeeting.transcription.map(seg => ({
                        ...seg,
                        speaker: seg.speaker === oldName ? newName : seg.speaker
                    }));
                }
                if (updatedMeeting.participants) {
                    updatedMeeting.participants = updatedMeeting.participants.map(p =>
                        p === oldName ? newName : p
                    );
                }
                setMeeting(updatedMeeting);
            }
        }
        setIsRenaming(false);
        setEditingSpeaker(null);
    };

    const handleDelete = async () => {
        if (!id) return;
        setIsDeleting(true);
        const result = await deleteMeeting(id);
        if ('error' in result) {
            toast.error('Failed to delete meeting');
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        } else {
            toast.success('Meeting deleted successfully');
            navigate('/meetings');
        }
    };

    const handleMergeSpeakers = async () => {
        if (!id || selectedSpeakersForMerge.length < 2) return;
        setIsMerging(true);

        // Use the first selected speaker as target, others as sources
        const targetSpeaker = selectedSpeakersForMerge[0];
        const sourceSpeakers = selectedSpeakersForMerge.slice(1);

        const result = await mergeSpeakers(id, targetSpeaker, sourceSpeakers);
        if ('error' in result) {
            toast.error('Failed to merge speakers');
        } else {
            toast.success(`Merged speakers into ${targetSpeaker}`);
            setIsMergeMode(false);
            setSelectedSpeakersForMerge([]);

            // Reload meeting to refresh transcript & participants
            const freshMeeting = await getMeeting(id);
            if (!('error' in freshMeeting)) {
                setMeeting(freshMeeting as Meeting);
            }
        }
        setIsMerging(false);
    };

    if (isLoading || !meeting) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Assembling Intelligence...</p>
            </div>
        );
    }

    const filteredTranscription = meeting.transcription?.filter(seg =>
        seg.text.toLowerCase().includes(searchTranscript.toLowerCase()) ||
        seg.speaker.toLowerCase().includes(searchTranscript.toLowerCase())
    ) || [];

    const uniqueSpeakers = new Set<string>();
    meeting.transcription?.forEach(seg => uniqueSpeakers.add(seg.speaker));

    return (
        <div className="w-full">

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

            {/* Nav Header */}
            <div className="flex items-center justify-between mb-8">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/meetings')}
                    className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 px-2 -ml-2"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm uppercase tracking-wider">Back to intel</span>
                </Button>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleReprocess}
                        disabled={isReprocessing || isDeleting}
                        className="rounded-xl border-slate-200 gap-2 h-10 hover:bg-slate-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isReprocessing ? 'animate-spin' : ''}`} />
                        <span>Re-analyze</span>
                    </Button>

                </div>
            </div>

            {/* Title & Metadata */}
            <div className="mb-12">
                <div className="flex flex-wrap items-center gap-3 mb-6">
                    <div className="flex items-center gap-2">
                        {getStatusBadge(meeting.status)}
                        {meeting.platform && PLATFORM_CONFIG[meeting.platform] && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${PLATFORM_CONFIG[meeting.platform].color}`}>
                                {PLATFORM_CONFIG[meeting.platform].icon}
                                {PLATFORM_CONFIG[meeting.platform].label}
                            </span>
                        )}
                        {meeting.is_processed && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1B2BB8] text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                                <Brain className="h-3.5 w-3.5" />
                                Intel Extracted
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div className="flex-1 min-w-0">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-3 w-full max-w-2xl bg-slate-50 p-2 rounded-2xl border-2 border-blue-100">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameTitle();
                                        if (e.key === 'Escape') {
                                            setNewTitle(meeting.title);
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    className="text-4xl font-bold text-slate-900 outline-none bg-transparent flex-1 px-2"
                                />
                                <Button size="sm" onClick={handleRenameTitle} className="bg-[#1B2BB8] hover:bg-blue-800 rounded-xl px-6 h-10 shadow-lg shadow-blue-500/20">Save</Button>
                                <Button variant="ghost" size="sm" onClick={() => setIsEditingTitle(false)} className="rounded-xl h-10">Cancel</Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight break-all">
                                    {meeting.title || 'Untitled'}
                                </h1>
                                <Pencil className="h-5 w-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </div>
                        )}
                        <p className="text-slate-500 font-medium text-lg mt-4 max-w-3xl leading-relaxed">
                            {meeting.description || 'Intelligence captured and processed. Review the detailed findings below.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-6 text-slate-500 font-bold text-xs uppercase tracking-widest border-l-0 md:border-l border-slate-200 md:pl-8 flex-shrink-0">
                        <div className="flex flex-col gap-2">
                            <span className="text-slate-400 font-medium">Session Date</span>
                            <div className="flex items-center gap-2 text-slate-900 font-black">
                                <Calendar className="h-4 w-4 text-[#1B2BB8]" />
                                {formatMeetingDate(meeting.created_at).split('•')[0]}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <span className="text-slate-400 font-medium">Duration</span>
                            <div className="flex items-center gap-2 text-slate-900 font-black">
                                <Clock className="h-4 w-4 text-[#1B2BB8]" />
                                {formatDuration(meeting.duration)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Player */}
            {audioUrl && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-[850px] px-6 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-white/98 backdrop-blur-2xl border-2 border-slate-200/50 rounded-[2.5rem] p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] flex items-center gap-7 text-slate-900 ring-4 ring-white/40">
                        <button
                            onClick={togglePlay}
                            className="w-14 h-14 rounded-full bg-[#1B2BB8] hover:bg-blue-800 flex items-center justify-center shadow-xl shadow-blue-600/30 transition-all hover:scale-110 active:scale-95 group/play"
                        >
                            {isPlaying ? (
                                <Pause className="h-6 w-6 text-white fill-white" />
                            ) : (
                                <Play className="h-6 w-6 ml-1 text-white fill-white" />
                            )}
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-[11px] font-black text-slate-500 mb-2 uppercase tracking-widest font-mono">
                                <span className="text-[#1B2BB8]">{formatTimestamp(currentTime)}</span>
                                <span className="text-slate-400">{formatTimestamp(duration)}</span>
                            </div>
                            <div
                                id="audio-slider"
                                className="h-2 bg-slate-100/80 rounded-full cursor-pointer relative group"
                                onMouseDown={(e) => {
                                    setIsDragging(true);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                    seekTo(pct * duration);
                                }}
                            >
                                <div
                                    className="bg-[#1B2BB8] h-full rounded-full transition-all duration-75 relative"
                                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/20 blur-sm" />
                                </div>
                                <div
                                    className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-[#1B2BB8] rounded-full shadow-lg transition-all pointer-events-none z-10 ${isDragging ? 'scale-125' : 'group-hover:scale-110'}`}
                                    style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, marginLeft: '-10px' }}
                                />
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-4 px-6 border-l border-slate-100">
                            <Volume2 className="h-4 w-4 text-[#1B2BB8] shrink-0" />
                            <div className="w-24 group relative flex items-center h-6">
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={volume}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setVolume(v);
                                        if (audioRef.current) audioRef.current.volume = v;
                                    }}
                                    style={{
                                        background: `linear-gradient(to right, #1B2BB8 0%, #1B2BB8 ${volume * 100}%, #f1f5f9 ${volume * 100}%, #f1f5f9 100%)`
                                    }}
                                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-white transition-all hover:h-2"
                                />
                            </div>
                        </div>

                        <audio ref={audioRef} src={audioUrl} />
                    </div>
                </div>
            )}

            {/* Tabs Nav - Moved above grid for perfect alignment */}
            <div className="mb-8 flex items-center gap-1.5 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-2xl w-fit border border-slate-200/50">
                {[
                    { id: 'summary', label: 'Summary', icon: <MessageSquare className="h-4 w-4" /> },
                    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
                    { id: 'transcription', label: 'Transcripts', icon: <FileText className="h-4 w-4" /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === tab.id
                            ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                            }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Layout - Perfectly Aligned Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32 items-start">

                {/* Left: Intelligence Console */}
                <div className="lg:col-span-8">
                    {/* Main Content Card - Standardized padding and rounding */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm min-h-[600px]">
                        {activeTab === 'summary' && <SummaryView meeting={meeting} />}
                        {activeTab === 'analytics' && <AnalyticsView meeting={meeting} uniqueSpeakers={uniqueSpeakers} isPro={isPro} onUpgradeClick={() => setShowPromoDialog(true)} />}
                        {activeTab === 'transcription' && (
                            <TranscriptionView
                                segments={filteredTranscription}
                                searchQuery={searchTranscript}
                                onSearchChange={setSearchTranscript}
                                colorMap={speakerColorMap}
                                onSeek={seekTo}
                                editingSpeaker={editingSpeaker}
                                setEditingSpeaker={(name: string | null) => {
                                    setEditingSpeaker(name);
                                    if (name) setNewSpeakerName(name);
                                }}
                                newSpeakerName={newSpeakerName}
                                setNewSpeakerName={setNewSpeakerName}
                                onRenameSpeaker={handleRenameSpeaker}
                                isRenaming={isRenaming}
                            />
                        )}
                    </div>
                </div>

                {/* Right: Insights Sidebar - Now Aligned with Left Card Top */}
                <div className="lg:col-span-4 space-y-6">
                    <SidebarContent
                        meeting={meeting}
                        editingSpeaker={editingSpeaker}
                        setEditingSpeaker={(name: string | null) => {
                            setEditingSpeaker(name);
                            if (name) setNewSpeakerName(name);
                        }}
                        newSpeakerName={newSpeakerName}
                        setNewSpeakerName={setNewSpeakerName}
                        onRenameSpeaker={handleRenameSpeaker}
                        isRenaming={isRenaming}
                        onDownloadAudio={downloadAudio}
                        onDownloadTranscript={downloadTranscript}
                        isMergeMode={isMergeMode}
                        setIsMergeMode={setIsMergeMode}
                        selectedSpeakersForMerge={selectedSpeakersForMerge}
                        setSelectedSpeakersForMerge={setSelectedSpeakersForMerge}
                        onMergeSpeakers={handleMergeSpeakers}
                        isMerging={isMerging}
                        isPro={isPro}
                    />
                </div>
            </div>
        </div>
    );
};

/* Sub-components */
const TranscriptionView = ({ segments, searchQuery, onSearchChange, colorMap, onSeek, editingSpeaker, setEditingSpeaker, newSpeakerName, setNewSpeakerName, onRenameSpeaker, isRenaming }: any) => (
    <div className="space-y-6">
        <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none z-20">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-[#1B2BB8] transition-colors" />
                <div className="h-3 w-[1px] bg-slate-200 group-focus-within:bg-[#1B2BB8]/30 transition-colors" />
            </div>
            <input
                type="text"
                placeholder="Search transcripts..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#1B2BB8]/5 focus:border-[#1B2BB8] shadow-sm outline-none transition-all font-medium text-sm placeholder:text-slate-400"
            />
        </div>

        <div className="space-y-1 max-h-[700px] overflow-y-auto pr-4 scrollbar-thin">
            {segments.map((seg: TranscriptionSegment, i: number) => {
                const colors = colorMap[seg.speaker] || SPEAKER_COLORS[0];
                const isEditing = editingSpeaker === seg.speaker;

                return (
                    <div
                        key={i}
                        className="group flex gap-5 py-4 px-4 rounded-3xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
                        onClick={() => !isEditing && onSeek(seg.start)}
                    >
                        <div className={`w-10 h-10 rounded-2xl ${colors.bg} flex items-center justify-center font-bold text-xs ${colors.text} shrink-0 shadow-sm border ${colors.border}`}>
                            {seg.speaker.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={newSpeakerName}
                                                onChange={(e) => setNewSpeakerName(e.target.value)}
                                                className="px-2 py-0.5 rounded border border-blue-400 outline-none text-sm font-bold text-slate-900"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') onRenameSpeaker(seg.speaker, newSpeakerName);
                                                    if (e.key === 'Escape') setEditingSpeaker(null);
                                                }}
                                            />
                                            <Button
                                                size="sm"
                                                disabled={isRenaming}
                                                className="h-7 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-[10px] font-bold"
                                                onClick={() => onRenameSpeaker(seg.speaker, newSpeakerName)}
                                            >
                                                {isRenaming ? '...' : 'SAVE'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 rounded-lg text-[10px] font-bold text-slate-400"
                                                onClick={() => setEditingSpeaker(null)}
                                            >
                                                CANCEL
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className={`text-sm font-bold ${colors.text}`}>{seg.speaker}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSpeaker(seg.speaker);
                                                }}
                                                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-200 transition-all"
                                            >
                                                <Pencil className="h-3 w-3 text-slate-400" />
                                            </button>
                                        </>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                    {formatTimestamp(seg.start)}
                                </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                {seg.text}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
);

const SummaryView = ({ meeting }: { meeting: Meeting }) => (
    <div className="space-y-10">
        <div>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-xl">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Briefing</h3>
            </div>
            <div className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                {(meeting.summary || 'Summary not generated for this session.').replace(/\*/g, '')}
            </div>
        </div>

        {meeting.key_points && (
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100/80 shadow-sm">
                        <Lightbulb className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Key Intelligence Points</h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Extracted insights from the conversation</p>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-slate-50/80 to-amber-50/30 rounded-2xl border border-slate-200/60 p-6 space-y-3">
                    {meeting.key_points.split('\n').filter((line: string) => line.trim()).map((line: string, idx: number) => {
                        const trimmed = line.trim();
                        // Detect section headers (lines ending with ":" or starting with "##" or all-caps short lines)
                        const isHeader = /^#{1,3}\s/.test(trimmed) ||
                            (/^[A-Z][^.]*:$/.test(trimmed) && trimmed.length < 80) ||
                            (/^\*\*.*\*\*:?$/.test(trimmed));
                        // Clean markdown bold markers
                        const cleanText = trimmed
                            .replace(/^#{1,3}\s+/, '')
                            .replace(/^\*\*(.+?)\*\*:?$/, '$1')
                            .replace(/^[-•*]\s+/, '')
                            .replace(/^\d+[.)]\s+/, '')
                            .replace(/\*/g, '');

                        if (isHeader) {
                            return (
                                <div key={idx} className={`flex items-center gap-3 ${idx > 0 ? 'pt-4 mt-2 border-t border-slate-200/60' : ''}`}>
                                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-400 shrink-0" />
                                    <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">{cleanText.replace(/:$/, '')}</h4>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={idx}
                                className="flex gap-3.5 items-start bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-amber-200/60 transition-all duration-300 group"
                            >
                                <div className="mt-0.5 shrink-0">
                                    <div className="w-6 h-6 rounded-lg bg-amber-100/80 border border-amber-200/60 flex items-center justify-center group-hover:bg-amber-200/80 transition-colors">
                                        <ChevronRight className="h-3.5 w-3.5 text-amber-600" />
                                    </div>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed font-medium flex-1">
                                    {cleanText}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
);

const AnalyticsView = ({ meeting, isPro, onUpgradeClick }: any) => {
    const analytics = meeting.analytics_data;
    if (!analytics) return (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Processing advanced intelligence analytics...</p>
        </div>
    );

    const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

    // Accepts either 0-10 or 0-1 or 0-100-ish values and normalizes to 0-100.
    const toPct = (value: any): number | null => {
        if (typeof value !== 'number' || Number.isNaN(value)) return null;
        if (value <= 1) return clamp(value * 100);
        if (value <= 10) return clamp(value * 10);
        return clamp(value);
    };

    const renderMetric = (label: string, value: any, color: string) => {
        const percentage = toPct(value);
        if (percentage === null) return null;
        return (
            <div key={label} className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                    <span className="text-sm font-extrabold text-slate-900">{percentage}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                    <div className={`h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${percentage}%` }} />
                </div>
            </div>
        );
    };

    const coreMetrics: Array<{ label: string; value: any; color: string }> = [
        { label: 'Engagement', value: analytics.engagement_level, color: 'bg-[#1B2BB8]' },
        { label: 'Participation Balance', value: analytics.participation_balance, color: 'bg-emerald-500' },
        { label: 'Audio Clarity', value: analytics.audio_clarity, color: 'bg-slate-500' },
    ];

    const proSections: Array<{
        title: string;
        icon: React.ReactNode;
        metrics: Array<{ label: string; value: any; color: string }>;
    }> = [
            {
                title: 'Participation',
                icon: <Activity className="h-5 w-5 text-emerald-500" />,
                metrics: [
                    { label: 'Active Participation', value: analytics.active_participation, color: 'bg-emerald-500' },
                    { label: 'Speaking Distribution', value: analytics.speaking_distribution, color: 'bg-slate-500' },
                ],
            },
            {
                title: 'Effectiveness',
                icon: <Target className="h-5 w-5 text-[#1B2BB8]" />,
                metrics: [
                    { label: 'Agenda Coverage', value: analytics.agenda_coverage, color: 'bg-[#1B2BB8]' },
                    { label: 'Time Management', value: analytics.time_management, color: 'bg-slate-500' },
                ],
            },
        ];

    const renderedCore = coreMetrics.map(m => renderMetric(m.label, m.value, m.color)).filter(Boolean);
    const renderedProSections = proSections
        .map(section => {
            const metrics = section.metrics.map(m => renderMetric(m.label, m.value, m.color)).filter(Boolean);
            if (metrics.length === 0) return null;
            return { ...section, metrics };
        })
        .filter(Boolean) as Array<{ title: string; icon: React.ReactNode; metrics: React.ReactNode[] }>;

    if (renderedCore.length === 0 && renderedProSections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                    <BarChart3 className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-slate-700 font-bold">Analytics not available yet</p>
                <p className="text-slate-500 font-medium mt-1 max-w-sm">
                    This meeting doesn’t have enough processed data to generate reliable analytics.
                </p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Lock Overlay */}
            {!isPro && (
                <div className="absolute inset-0 z-20 bg-slate-50/60 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center border border-slate-200/50 shadow-inner">
                    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200/60 max-w-sm text-center flex flex-col items-center transform -translate-y-8">
                        <div className="h-16 w-16 rounded-full bg-blue-50 border-4 border-white shadow-sm flex items-center justify-center mb-6">
                            <Lock className="h-8 w-8 text-[#1B2BB8]" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">Premium Analytics Locked</h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[260px] mb-6">
                            Advanced AI analytics are not available during the trial period. Upgrade to unlock these insights.
                        </p>
                        <Button
                            className="w-full bg-[#1B2BB8] hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                            onClick={onUpgradeClick}
                        >
                            Upgrade Now
                        </Button>
                    </div>
                </div>
            )}

            <div className={`space-y-12 ${!isPro ? 'opacity-40 pointer-events-none select-none filter grayscale-[30%]' : ''}`}>
                {/* Header */}
                <div className="bg-white rounded-[2.5rem] p-8 text-slate-900 relative overflow-hidden border border-slate-200 shadow-sm">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-400">
                        <Brain className="h-32 w-32" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl ${analytics.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                analytics.sentiment === 'negative' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                {analytics.sentiment === 'positive' ? <ThumbsUp className="h-10 w-10" /> :
                                    analytics.sentiment === 'negative' ? <ThumbsDown className="h-10 w-10" /> :
                                        <Activity className="h-10 w-10" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">Overall Sentiment</p>
                                <h3 className="text-3xl font-bold uppercase tracking-tight">{analytics.sentiment || 'NEUTRAL'}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs font-bold text-slate-400">SCORE: {analytics.sentiment_score || 0}/10</span>
                                    <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500" style={{ width: `${(analytics.sentiment_score || 0) * 10}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[140px]">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Engagement</p>
                                <p className="text-xl font-bold">{toPct(analytics.engagement_level) ?? 0}%</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[140px]">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">ROI</p>
                                <p className="text-xl font-bold">{toPct(analytics.meeting_roi) ?? 0}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Graph Analytics Block */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                            <Activity className="h-4 w-4 text-[#1B2BB8]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Intelligence Radar</h3>
                            <p className="text-xs font-medium text-slate-500">Holistic view of meeting effectiveness</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                                { subject: 'Engagement', A: toPct(analytics.engagement_level) || 0, fullMark: 100 },
                                { subject: 'Participation', A: toPct(analytics.participation_balance) || 0, fullMark: 100 },
                                { subject: 'Audio Clarity', A: toPct(analytics.audio_clarity) || 0, fullMark: 100 },
                                { subject: 'Active', A: toPct(analytics.active_participation) || 0, fullMark: 100 },
                                { subject: 'Time Mgmt', A: toPct(analytics.time_management) || 0, fullMark: 100 },
                                { subject: 'Agenda Tracking', A: toPct(analytics.agenda_coverage) || 0, fullMark: 100 },
                            ]}>
                                <PolarGrid stroke="#f1f5f9" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Meeting Intelligence"
                                    dataKey="A"
                                    stroke="#1B2BB8"
                                    strokeWidth={2}
                                    fill="#1B2BB8"
                                    fillOpacity={0.2}
                                />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', fontWeight: 'bold', fontSize: '12px' }}
                                    itemStyle={{ color: '#1B2BB8' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Core (always visible when present) */}
                {renderedCore.length > 0 && (
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between gap-6 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                                    <BarChart3 className="h-4 w-4 text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Essential Analytics</h3>
                                    <p className="text-xs font-medium text-slate-500">Only metrics with real values are shown</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {renderedCore as any}
                        </div>
                    </div>
                )}

                {/* Pro details */}
                {renderedProSections.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {renderedProSections.map(section => (
                            <div key={section.title} className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    {section.icon}
                                    <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">{section.title}</h3>
                                </div>
                                <div className="space-y-5">
                                    {section.metrics}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Security & Compliance */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <Shield className={`h-3 w-3 ${analytics.recording_compliance ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span>Compliance: {analytics.recording_compliance ? 'VERIFIED' : 'PENDING'}</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <Shield className={`h-3 w-3 ${analytics.confidentiality_maintained ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span>Secure: {analytics.confidentiality_maintained ? 'YES' : 'NO'}</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <CheckCircle2 className={`h-3 w-3 ${analytics.meeting_minutes_shared ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span>Log Shared: {analytics.meeting_minutes_shared ? 'YES' : 'NO'}</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <Award className={`h-3 w-3 ${analytics.action_items_tracked ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span>Items Tracked: {analytics.action_items_tracked ? 'YES' : 'NO'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


const SidebarContent = ({
    meeting, editingSpeaker, setEditingSpeaker, newSpeakerName,
    setNewSpeakerName, onRenameSpeaker, isRenaming,
    onDownloadAudio, onDownloadTranscript,
    isMergeMode, setIsMergeMode, selectedSpeakersForMerge, setSelectedSpeakersForMerge,
    onMergeSpeakers, isMerging, isPro
}: any) => {
    const analytics = meeting.analytics_data || {};

    return (
        <div className="flex flex-col gap-6">
            {/* Audio Insights - Standardized Alignment */}
            <div className="bg-white rounded-3xl p-6 shadow-sm text-slate-900 overflow-hidden relative border border-slate-200">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-400">
                    <Waves className="h-24 w-24" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                                <Zap className="h-4 w-4 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold">Audio Insights</h3>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={onDownloadAudio}
                                className="p-2.5 bg-blue-50 rounded-xl text-blue-600 hover:bg-[#1B2BB8] hover:text-white transition-all shadow-sm border border-blue-100"
                                title="Download Audio File"
                            >
                                <Mic className="h-4 w-4" />
                            </button>
                            <button
                                onClick={onDownloadTranscript}
                                className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                title="Export Transcript"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Energy Shifts</p>
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-500" />
                                <span className="text-xl font-bold">{analytics.energy_shifts || 0}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Silences</p>
                            <div className="flex items-center gap-2">
                                <Volume1 className="h-4 w-4 text-orange-500" />
                                <span className="text-xl font-bold">{analytics.notable_silences || 0}</span>
                            </div>
                        </div>
                    </div>

                    {analytics.key_moments && analytics.key_moments.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Key Moments</p>
                            <div className="space-y-2">
                                {analytics.key_moments.slice(0, 3).map((moment: string, i: number) => (
                                    <div key={i} className="flex gap-3 text-xs font-medium text-slate-800 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                        <span>{moment}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Items - Standardized Alignment */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-50 rounded-xl">
                        <ListChecks className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Action Items</h3>
                </div>
                {isPro && (
                    <div className="mb-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/50 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="text-[11px] font-black uppercase text-amber-700 tracking-wider">Pro Intelligence Active</span>
                        </div>
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                )}
                <div className="space-y-4">
                    {meeting.action_items?.length ? (
                        meeting.action_items.map((item, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                <CheckCircle2 className={`h-5 w-5 mt-0.5 shrink-0 ${item.status === 'completed' ? 'text-emerald-500' : 'text-slate-300'}`} />
                                <div>
                                    <p className="text-sm font-bold text-slate-800 leading-snug">{item.description}</p>
                                    {item.owner && (
                                        <span className="inline-block mt-2 text-[10px] font-extrabold uppercase bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-400">
                                            Assigned: {item.owner}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-400 italic">No mission directives found.</p>
                    )}
                </div>
            </div>

            {/* Speech Patterns - Standardized Alignment */}
            {analytics.speech_patterns && analytics.speech_patterns.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Waves className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest">Patterns</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {analytics.speech_patterns.map((pattern: string, i: number) => (
                            <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100 uppercase">
                                {pattern}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Participants - Re-styled for Premium Consistency */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-hidden relative">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <Users className="h-4 w-4 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Participants</h3>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-slate-500 font-medium">
                        {isMergeMode ? 'Select target to keep, then others to merge' : 'Members'}
                    </p>
                    {meeting.participants?.length > 1 && (
                        <button
                            onClick={() => {
                                setIsMergeMode(!isMergeMode);
                                setSelectedSpeakersForMerge([]);
                            }}
                            className={`text-[10px] font-bold px-2 py-1 rounded transition-colors uppercase tracking-wider ${isMergeMode
                                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                                }`}
                        >
                            {isMergeMode ? 'Cancel' : 'Merge'}
                        </button>
                    )}
                </div>

                {isMergeMode && selectedSpeakersForMerge.length > 1 && (
                    <div className="mb-4 bg-emerald-50/80 rounded-xl p-3 border border-emerald-100/80 flex flex-col gap-2 animate-in fade-in slide-in-from-to-2">
                        <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                            Merging <span className="font-bold">{selectedSpeakersForMerge.slice(1).join(', ')}</span> into <span className="font-bold">{selectedSpeakersForMerge[0]}</span>
                        </p>
                        <Button
                            disabled={isMerging}
                            onClick={onMergeSpeakers}
                            className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                        >
                            {isMerging ? 'MERGING...' : 'CONFIRM MERGE'}
                        </Button>
                    </div>
                )}

                <div className="flex flex-wrap gap-2.5">
                    {meeting.participants?.map((p: string, i: number) => {
                        const isEditing = editingSpeaker === p;
                        return (
                            <div key={i} className="relative group">
                                {isEditing ? (
                                    <div className="flex items-center gap-2 px-1 py-1 bg-white border-2 border-[#1B2BB8]/30 rounded-2xl shadow-lg animate-in zoom-in-95 duration-200 z-30">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newSpeakerName}
                                            onChange={(e) => setNewSpeakerName(e.target.value)}
                                            className="w-24 px-2 py-0.5 outline-none text-xs font-bold text-slate-900 bg-transparent"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') onRenameSpeaker(p, newSpeakerName);
                                                if (e.key === 'Escape') setEditingSpeaker(null);
                                            }}
                                        />
                                        <button
                                            disabled={isRenaming}
                                            onClick={() => onRenameSpeaker(p, newSpeakerName)}
                                            className="p-1.5 bg-[#1B2BB8] text-white rounded-xl shadow-md hover:bg-blue-700 transition-colors"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => {
                                            if (isMergeMode) {
                                                if (selectedSpeakersForMerge.includes(p)) {
                                                    setSelectedSpeakersForMerge(selectedSpeakersForMerge.filter((s: string) => s !== p));
                                                } else {
                                                    setSelectedSpeakersForMerge([...selectedSpeakersForMerge, p]);
                                                }
                                            } else {
                                                setEditingSpeaker(p);
                                            }
                                        }}
                                        className={`flex items-center gap-2.5 px-3.5 py-2 hover:bg-white transition-all border rounded-2xl cursor-pointer group/tag ${isMergeMode && selectedSpeakersForMerge.includes(p)
                                            ? selectedSpeakersForMerge[0] === p
                                                ? 'bg-emerald-50 border-emerald-300 shadow-sm ring-1 ring-emerald-400/20'
                                                : 'bg-amber-50 border-amber-300 shadow-sm'
                                            : 'bg-slate-50 border-slate-100 hover:border-blue-200 hover:shadow-md'
                                            }`}
                                    >
                                        <div className={`w-6 h-6 rounded-xl text-[9px] flex items-center justify-center text-white font-black shadow-lg ${isMergeMode && selectedSpeakersForMerge.includes(p)
                                            ? selectedSpeakersForMerge[0] === p ? 'bg-emerald-600' : 'bg-amber-500'
                                            : 'bg-[#1B2BB8] shadow-blue-900/10'
                                            }`}>
                                            {p.charAt(0).toUpperCase()}
                                        </div>
                                        <span className={`text-xs font-bold ${isMergeMode && selectedSpeakersForMerge.includes(p) && selectedSpeakersForMerge[0] === p ? 'text-emerald-800' : 'text-slate-700'}`}>{p}</span>
                                        {!isMergeMode && (
                                            <div className="opacity-0 group-hover/tag:opacity-100 transition-opacity flex items-center">
                                                <Pencil className="h-3 w-3 text-[#1B2BB8]/40" />
                                            </div>
                                        )}
                                        {isMergeMode && selectedSpeakersForMerge.includes(p) && selectedSpeakersForMerge[0] === p && (
                                            <span className="text-[9px] font-black text-emerald-700 bg-white px-1.5 py-0.5 rounded shadow-sm border border-emerald-100 uppercase ml-auto">Target &nbsp;✓</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }) || <p className="text-xs text-slate-400">No participant data recorded.</p>}
                </div>
            </div>
        </div>
    );
};

export default MeetingDetail;
