import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Play, Pause, Download, Volume2, Clock, Calendar, Users, Search,
    FileText, BarChart3, Mic, AlertCircle, Loader2, CheckCircle2,
    RefreshCw, ChevronRight, MessageSquare, ListChecks, Lightbulb,
    TrendingUp, ThumbsUp, ThumbsDown, Minus, Trash2, Zap, Brain, Activity,
    Shield, Target, Award, UserPlus, Info, Volume1, Waves
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    getMeeting, getMeetingAudioUrl, reprocessMeeting, deleteMeeting,
    formatTimestamp, formatMeetingDate, formatDuration,
    type Meeting, type TranscriptionSegment
} from '@/services/meetingApi';
import { toast } from 'sonner';

type TabType = 'transcription' | 'summary' | 'analytics' | 'audio';

const SPEAKER_COLORS = [
    { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', accent: '#1B2BB8' },
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', accent: '#10B981' },
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', accent: '#8B5CF6' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', accent: '#F97316' },
    { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', accent: '#EC4899' },
];

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

    useEffect(() => {
        if (!id) { navigate('/meetings'); return; }
        const loadMeeting = async () => {
            setIsLoading(true);
            const result = await getMeeting(id);
            if ('error' in result) {
                toast.error('Failed to load meeting');
                navigate('/meetings');
                return;
            }
            setMeeting(result);

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
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('durationchange', onDurationChange);
        audio.addEventListener('ended', onEnded);
        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('durationchange', onDurationChange);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const seekTo = (time: number) => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = time;
        if (!isPlaying) togglePlay();
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

                    <div className="relative">
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                            disabled={isDeleting}
                            className="rounded-xl border-red-100 text-red-600 gap-2 h-10 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                        </Button>

                        {showDeleteConfirm && (
                            <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200">
                                <p className="text-sm font-bold text-slate-800 mb-1">Delete this intelligence?</p>
                                <p className="text-xs text-slate-500 mb-4">This action cannot be undone and will permanently remove all capture data.</p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="flex-1 text-xs h-9 rounded-xl font-bold"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Deleting...' : 'CONFIRM DELETE'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="flex-1 text-xs h-9 rounded-xl font-bold"
                                        onClick={() => setShowDeleteConfirm(false)}
                                    >
                                        CANCEL
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[1px]" onClick={() => setShowDeleteConfirm(false)} />
            )}

            {/* Title & Metadata */}
            <div className="mb-10">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                        {meeting.status}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                        <Calendar className="h-3 w-3" />
                        {formatMeetingDate(meeting.created_at)}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                        <Clock className="h-3 w-3" />
                        {formatDuration(meeting.duration)}
                    </span>
                </div>
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-2">
                    {meeting.title}
                </h1>
                <p className="text-slate-500 font-medium max-w-2xl">
                    {meeting.description || 'Intelligence captured and processed. Review the findings below.'}
                </p>
            </div>

            {/* Sticky Player */}
            {audioUrl && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-[800px] px-6">
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 shadow-2xl flex items-center gap-6 text-white ring-1 ring-white/5">
                        <button
                            onClick={togglePlay}
                            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/20 transition-all hover:scale-105"
                        >
                            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">
                                <span>{formatTimestamp(currentTime)}</span>
                                <span className="text-slate-500">{formatTimestamp(duration)}</span>
                            </div>
                            <div
                                className="h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden group"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const pct = (e.clientX - rect.left) / rect.width;
                                    seekTo(pct * duration);
                                }}
                            >
                                <div
                                    className="bg-blue-500 h-full transition-all duration-300"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-3">
                            <Volume2 className="h-4 w-4 text-slate-400" />
                            <input
                                type="range"
                                min="0" max="1" step="0.01"
                                value={volume}
                                onChange={(e) => {
                                    const v = parseFloat(e.target.value);
                                    setVolume(v);
                                    if (audioRef.current) audioRef.current.volume = v;
                                }}
                                className="w-24 accent-blue-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                            />
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
                    { id: 'transcription', label: 'Dialogue', icon: <FileText className="h-4 w-4" /> }
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
                        {activeTab === 'analytics' && <AnalyticsView meeting={meeting} uniqueSpeakers={uniqueSpeakers} />}
                        {activeTab === 'transcription' && (
                            <TranscriptionView
                                segments={filteredTranscription}
                                searchQuery={searchTranscript}
                                onSearchChange={setSearchTranscript}
                                colorMap={speakerColorMap}
                                onSeek={seekTo}
                            />
                        )}
                    </div>
                </div>

                {/* Right: Insights Sidebar - Now Aligned with Left Card Top */}
                <div className="lg:col-span-4 space-y-6">
                    <SidebarContent meeting={meeting} />
                </div>
            </div>
        </div>
    );
};

/* Sub-components */
const TranscriptionView = ({ segments, searchQuery, onSearchChange, colorMap, onSeek }: any) => (
    <div className="space-y-6">
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
                type="text"
                placeholder="Search dialogue..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none transition-all font-medium text-sm"
            />
        </div>

        <div className="space-y-1 max-h-[700px] overflow-y-auto pr-4 scrollbar-thin">
            {segments.map((seg: TranscriptionSegment, i: number) => {
                const colors = colorMap[seg.speaker] || SPEAKER_COLORS[0];
                return (
                    <div
                        key={i}
                        className="group flex gap-5 py-4 px-4 rounded-3xl hover:bg-slate-50 transition-all cursor-pointer border border-transparent hover:border-slate-100"
                        onClick={() => onSeek(seg.start)}
                    >
                        <div className={`w-10 h-10 rounded-2xl ${colors.bg} flex items-center justify-center font-bold text-xs ${colors.text} shrink-0 shadow-sm border ${colors.border}`}>
                            {seg.speaker.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-sm font-bold ${colors.text}`}>{seg.speaker}</span>
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
                {meeting.summary || 'Summary not generated for this session.'}
            </div>
        </div>

        {meeting.key_points && (
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-50 rounded-xl">
                        <Lightbulb className="h-5 w-5 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Key Intelligence Points</h3>
                </div>
                <div className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                    {meeting.key_points}
                </div>
            </div>
        )}
    </div>
);

const AnalyticsView = ({ meeting }: any) => {
    const analytics = meeting.analytics_data;
    if (!analytics) return (
        <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Processing advanced intelligence analytics...</p>
        </div>
    );

    const renderMetric = (label: string, value: any, color: string) => {
        const numValue = typeof value === 'number' ? value : 0;
        const percentage = numValue * 10; // Assuming 0-10 scale from backend
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

    return (
        <div className="space-y-12">
            {/* Sentiment Header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
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
                            <h3 className="text-3xl font-black uppercase tracking-tight">{analytics.sentiment || 'NEUTRAL'}</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs font-bold text-slate-400">SCORE: {analytics.sentiment_score || 0}/10</span>
                                <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${(analytics.sentiment_score || 0) * 10}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[120px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Engagement</p>
                            <p className="text-xl font-black">{(analytics.engagement_level || 0) * 10}%</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[120px]">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ROI</p>
                            <p className="text-xl font-black">{(analytics.meeting_roi || 0) * 10}%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analysis Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Participation & Engagement */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Activity className="h-5 w-5 text-emerald-500" />
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Participation</h3>
                    </div>
                    <div className="space-y-5">
                        {renderMetric('Active Participation', analytics.active_participation, 'bg-emerald-500')}
                        {renderMetric('Speaking Distribution', analytics.speaking_distribution, 'bg-emerald-400')}
                        {renderMetric('Listening Quality', analytics.listening_quality, 'bg-emerald-300')}
                        {renderMetric('Participation Balance', analytics.participation_balance, 'bg-emerald-200')}
                    </div>
                </div>

                {/* Meeting Effectiveness */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="h-5 w-5 text-blue-500" />
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Effectiveness</h3>
                    </div>
                    <div className="space-y-5">
                        {renderMetric('Agenda Coverage', analytics.agenda_coverage / 10, 'bg-blue-500')}
                        {renderMetric('Time Management', analytics.time_management, 'bg-blue-400')}
                        {renderMetric('Decision Making', analytics.decision_making_efficiency / 10, 'bg-blue-300')}
                        {renderMetric('Discussion Relevance', analytics.discussion_relevance / 10, 'bg-blue-200')}
                    </div>
                </div>

                {/* Communication & Collaboration */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <MessageSquare className="h-5 w-5 text-purple-500" />
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Collaboration</h3>
                    </div>
                    <div className="space-y-5">
                        {renderMetric('Communication Clarity', analytics.clarity_of_communication, 'bg-purple-500')}
                        {renderMetric('Inclusiveness', analytics.inclusiveness, 'bg-purple-400')}
                        {renderMetric('Team Collaboration', analytics.team_collaboration, 'bg-purple-300')}
                        {renderMetric('Conflict Handling', analytics.conflict_handling, 'bg-purple-200')}
                    </div>
                </div>

                {/* Technical Quality */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <Mic className="h-5 w-5 text-slate-500" />
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Audio Quality</h3>
                    </div>
                    <div className="space-y-5">
                        {renderMetric('Audio Clarity', analytics.audio_clarity, 'bg-slate-500')}
                        {renderMetric('Connectivity', analytics.connectivity_stability, 'bg-slate-400')}
                        {renderMetric('Latency Status', analytics.latency_delay, 'bg-slate-300')}
                        {renderMetric('Mute Usage', analytics.mute_unmute_usage, 'bg-slate-200')}
                    </div>
                </div>
            </div>

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
    );
};

const SidebarContent = ({ meeting }: { meeting: Meeting }) => {
    const analytics = meeting.analytics_data || {};

    return (
        <div className="flex flex-col gap-6">
            {/* Audio Insights - Standardized Alignment */}
            <div className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white overflow-hidden relative border border-white/5">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Waves className="h-24 w-24" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                            <Zap className="h-4 w-4 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold">Audio Insights</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Energy Shifts</p>
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-400" />
                                <span className="text-xl font-black">{analytics.energy_shifts || 0}</span>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Silences</p>
                            <div className="flex items-center gap-2">
                                <Volume1 className="h-4 w-4 text-orange-400" />
                                <span className="text-xl font-black">{analytics.notable_silences || 0}</span>
                            </div>
                        </div>
                    </div>

                    {analytics.key_moments && analytics.key_moments.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Key Moments</p>
                            <div className="space-y-2">
                                {analytics.key_moments.slice(0, 3).map((moment: string, i: number) => (
                                    <div key={i} className="flex gap-3 text-xs font-medium text-slate-300 bg-white/5 p-2.5 rounded-xl border border-white/5">
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

            {/* Participants - Standardized Alignment */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-widest mb-4">Participants</h3>
                <div className="flex flex-wrap gap-2">
                    {meeting.participants?.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-[8px] flex items-center justify-center text-white font-bold">
                                {p.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-bold text-slate-700">{p}</span>
                        </div>
                    )) || <p className="text-xs text-slate-400">No participant data recorded.</p>}
                </div>
            </div>
        </div>
    );
};

export default MeetingDetail;
