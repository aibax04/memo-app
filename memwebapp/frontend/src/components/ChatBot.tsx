import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, BookOpen, Zap, Calendar, BarChart2, ListChecks, Mail, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { type Meeting, draftFollowUpEmail, type EmailDraftTone } from '@/services/meetingApi';
import { toast } from 'sonner';

const GMAIL_COMPOSE_URL_MAX = 7200;

function getBackendOrigin(): string {
    if (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== null) {
        return String(import.meta.env.VITE_API_URL).replace(/\/$/, '');
    }
    return import.meta.env.DEV ? 'http://localhost:8000' : '';
}

function buildGmailComposeUrl(to: string, subject: string, body: string): string {
    const p = new URLSearchParams();
    p.set('view', 'cm');
    p.set('fs', '1');
    const t = to.trim();
    if (t) p.set('to', t);
    p.set('su', subject);
    p.set('body', body);
    return `https://mail.google.com/mail/?${p.toString()}`;
}

interface Message {
    role: 'user' | 'bot';
    content: string;
}

interface ChatBotProps {
    meetings: Meeting[];
    /** Floating FAB (default) or full panel inside a page (e.g. meeting detail tab) */
    variant?: 'floating' | 'embedded';
    /** When set, every message uses this meeting as context; meeting picker is hidden */
    contextMeetingId?: string | null;
    /** Meeting title for UI when context is locked */
    contextMeetingTitle?: string;
}

const defaultWelcome = 'Hi! I\'m MemoBot. I can answer questions about your meetings or explain how Memo App works. How can I help you today?';

const ChatBot: React.FC<ChatBotProps> = ({
    meetings,
    variant = 'floating',
    contextMeetingId = null,
    contextMeetingTitle,
}) => {
    const isEmbedded = variant === 'embedded';
    const welcomeForContext = contextMeetingId
        ? `Hi! I'm MemoBot. I'm focused on **${contextMeetingTitle || 'this meeting'}**. Ask me about the transcript, summary, action items, analytics, or anything from this session.`
        : defaultWelcome;

    const [isOpen, setIsOpen] = useState(isEmbedded);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', content: welcomeForContext }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMeetingId, setSelectedMeetingId] = useState<string>(
        contextMeetingId ? String(contextMeetingId) : 'none'
    );
    const scrollRef = useRef<HTMLDivElement>(null);

    // Keep locked context in sync if parent passes a new meeting id (without remount)
    useEffect(() => {
        if (contextMeetingId) {
            setSelectedMeetingId(String(contextMeetingId));
        }
    }, [contextMeetingId]);

    const getUserId = () => {
        const userStr = localStorage.getItem('dashboardUser');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                return user.id || 'guest';
            } catch (e) { }
        }
        return 'guest';
    };

    const storageKey = `memo_bot_pro_${getUserId()}`;

    const [isPro, setIsPro] = useState(() => localStorage.getItem(storageKey) === 'true');
    const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailTone, setEmailTone] = useState<EmailDraftTone>('professional');
    const [emailTo, setEmailTo] = useState('');
    const [emailExtra, setEmailExtra] = useState('');
    const [draftSubject, setDraftSubject] = useState('');
    const [draftBody, setDraftBody] = useState('');
    const [isDraftingEmail, setIsDraftingEmail] = useState(false);

    const gmailComposeUrl = useMemo(() => {
        if (!draftSubject && !draftBody) return '';
        return buildGmailComposeUrl(emailTo, draftSubject, draftBody);
    }, [emailTo, draftSubject, draftBody]);

    const gmailUrlTooLong = gmailComposeUrl.length > GMAIL_COMPOSE_URL_MAX;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleGoogleConnect = () => {
        const base = getBackendOrigin();
        if (!base) {
            toast.error('Google sign-in is not configured for this deployment.');
            return;
        }
        setIsConnectingGoogle(true);
        window.location.href = `${base}/api/v1/web/auth/google/login`;
    };

    const resetEmailDraft = () => {
        setDraftSubject('');
        setDraftBody('');
        setEmailExtra('');
    };

    const openEmailDialog = () => {
        resetEmailDraft();
        setEmailTone('professional');
        setEmailDialogOpen(true);
    };

    const runEmailDraft = async () => {
        if (!contextMeetingId || isDraftingEmail) return;
        setIsDraftingEmail(true);
        try {
            const res = await draftFollowUpEmail(String(contextMeetingId), {
                tone: emailTone,
                extra_instructions: emailExtra || null,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setDraftSubject(res.subject);
            setDraftBody(res.body.replace(/\\n/g, '\n'));
            toast.success('Draft ready — review, copy, or open in Gmail.');
        } catch {
            toast.error('Failed to draft email');
        } finally {
            setIsDraftingEmail(false);
        }
    };

    const copyEmailDraft = async () => {
        const text = `Subject: ${draftSubject}\n\n${draftBody}`;
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Could not copy');
        }
    };

    const openInGmail = () => {
        if (gmailUrlTooLong || !gmailComposeUrl) {
            toast.info('Draft is long — use Copy and paste into Gmail.');
            return;
        }
        window.open(gmailComposeUrl, '_blank', 'noopener,noreferrer');
    };

    const submitMessage = async (msgText: string) => {
        if (!msgText.trim() || isLoading) return;

        setMessages(prev => [...prev, { role: 'user', content: msgText }]);
        setIsLoading(true);

        try {
            const token = localStorage.getItem('memoapp_access_token');
            const response = await fetch('/api/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: msgText,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                    meeting_id: contextMeetingId
                        ? String(contextMeetingId)
                        : (selectedMeetingId === 'none' ? null : selectedMeetingId),
                    is_general_query: contextMeetingId
                        ? false
                        : (msgText.toLowerCase().includes('how') || msgText.toLowerCase().includes('memo app'))
                })
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'bot', content: data.response }]);
        } catch (error) {
            console.error('Chat error:', error);
            toast.error('Failed to send message');
            setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => {
        const userMessage = input.trim();
        setInput('');
        submitMessage(userMessage);
    };

    const handleQuickAction = (actionText: string) => {
        submitMessage(actionText);
    };

    const renderMessageContent = (content: string) => {
        // Basic Markdown parser for Bold and Links
        const parts = content.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
        
        return parts.map((part, i) => {
            const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                return (
                    <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 font-medium hover:opacity-80 transition-opacity">
                        {linkMatch[1]}
                    </a>
                );
            }
            
            const boldMatch = part.match(/\*\*([^*]+)\*\*/);
            if (boldMatch) {
                return <strong key={i} className="font-bold">{boldMatch[1]}</strong>;
            }
            
            // split by newlines to render <br/>
            const lines = part.split('\n');
            if (lines.length > 1) {
                return (
                    <span key={i}>
                        {lines.map((line, j) => (
                            <React.Fragment key={j}>
                                {line}
                                {j < lines.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </span>
                );
            }
            
            return <span key={i}>{part}</span>;
        });
    };

    const emailDraftDialog = contextMeetingId ? (
        <Dialog
            open={emailDialogOpen}
            onOpenChange={(open) => {
                setEmailDialogOpen(open);
                if (!open) resetEmailDraft();
            }}
        >
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                        <Mail className="h-5 w-5 text-[#1B2BB8]" />
                        Draft follow-up email
                    </DialogTitle>
                    <DialogDescription className="text-xs text-left">
                        Choose a tone. Memo uses AI (Gemini) with this meeting&apos;s summary, transcript, and analytics.
                        Use <strong>Copy</strong> or <strong>Open in Gmail</strong> (uses your browser&apos;s Google account — same app Client ID as Google sign-in).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Tone</Label>
                        <Select value={emailTone} onValueChange={(v) => setEmailTone(v as EmailDraftTone)}>
                            <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Tone" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="concise">Concise</SelectItem>
                                <SelectItem value="formal">Formal</SelectItem>
                                <SelectItem value="warm">Warm</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">To (optional)</Label>
                        <Input
                            type="email"
                            placeholder="recipient@example.com"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600">Extra instructions (optional)</Label>
                        <Textarea
                            placeholder="e.g. Thank them for the demo and propose a follow-up call next Tuesday."
                            value={emailExtra}
                            onChange={(e) => setEmailExtra(e.target.value)}
                            rows={2}
                            className="text-xs resize-none"
                        />
                    </div>

                    <Button
                        type="button"
                        className="w-full bg-[#1B2BB8] hover:bg-blue-800 text-white text-xs font-bold"
                        disabled={isDraftingEmail}
                        onClick={runEmailDraft}
                    >
                        {isDraftingEmail ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                                Drafting…
                            </>
                        ) : (
                            'Generate draft'
                        )}
                    </Button>

                    {(draftSubject || draftBody) && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Subject</Label>
                                <Input
                                    value={draftSubject}
                                    onChange={(e) => setDraftSubject(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-600">Body</Label>
                                <Textarea
                                    value={draftBody}
                                    onChange={(e) => setDraftBody(e.target.value)}
                                    rows={10}
                                    className="text-xs min-h-[180px]"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <Button type="button" variant="outline" size="sm" className="text-xs font-bold" onClick={copyEmailDraft}>
                                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                                    Copy all
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="text-xs font-bold bg-[#1B2BB8] hover:bg-blue-800 text-white"
                                    disabled={gmailUrlTooLong || !gmailComposeUrl}
                                    onClick={openInGmail}
                                    title={gmailUrlTooLong ? 'Draft too long for a link — use Copy' : 'Open Gmail compose'}
                                >
                                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                    Open in Gmail
                                </Button>
                            </div>
                            {gmailUrlTooLong && (
                                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                                    This draft is long for a URL. Use <strong>Copy all</strong> and paste into Gmail.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    ) : null;

    const cardClassName = isEmbedded
        ? 'w-full h-[min(72vh,760px)] min-h-[420px] flex flex-col shadow-sm border border-slate-200 rounded-2xl overflow-hidden bg-white'
        : 'w-80 md:w-96 h-[500px] flex flex-col shadow-2xl border-slate-200 animate-in slide-in-from-bottom-5 duration-300';

    const chatCard = (
        <Card className={cardClassName}>
                    <CardHeader className={`bg-[#1B2BB8] text-white py-4 flex flex-row items-center justify-between shrink-0 ${isEmbedded ? 'rounded-none' : 'rounded-t-xl'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <Bot className="h-5 w-5 shrink-0" />
                            <div className="min-w-0">
                                <CardTitle className="text-sm font-bold truncate">
                                    {isEmbedded ? 'Ask Memo Bot' : 'MemoBot'}
                                    {isPro && <span className="ml-1 text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
                                </CardTitle>
                                {isEmbedded && contextMeetingTitle && (
                                    <p className="text-[10px] text-white/80 font-medium truncate mt-0.5">{contextMeetingTitle}</p>
                                )}
                            </div>
                        </div>
                        {!isEmbedded && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:bg-white/10 h-8 w-8 shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </CardHeader>

                    {contextMeetingId ? (
                        <div className="px-4 py-3 border-b bg-blue-50/90 flex flex-col gap-2 shrink-0">
                            <div className="text-[10px] font-bold text-[#1B2BB8] uppercase tracking-widest flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> Connected to this meeting
                            </div>
                            <p className="text-xs font-bold text-slate-800 line-clamp-2">{contextMeetingTitle || 'Current session'}</p>
                            <p className="text-[10px] text-slate-500 leading-relaxed">MemoBot uses this meeting&apos;s summary, transcript, and analytics for every reply.</p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => handleQuickAction('Summarize this meeting in a few bullet points.')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#1B2BB8] hover:text-[#1B2BB8] text-slate-600 text-[10px] rounded-full transition-colors shadow-sm"
                                >
                                    <BookOpen className="h-3 w-3" /> Summarize
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickAction('What are the action items from this meeting?')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#1B2BB8] hover:text-[#1B2BB8] text-slate-600 text-[10px] rounded-full transition-colors shadow-sm"
                                >
                                    <ListChecks className="h-3 w-3" /> Action items
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickAction('Explain the key analytics and technical overview for this meeting.')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#1B2BB8] hover:text-[#1B2BB8] text-slate-600 text-[10px] rounded-full transition-colors shadow-sm"
                                >
                                    <BarChart2 className="h-3 w-3" /> Analytics
                                </button>
                                <button
                                    type="button"
                                    onClick={openEmailDialog}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#1B2BB8] hover:text-[#1B2BB8] text-slate-600 text-[10px] rounded-full transition-colors shadow-sm"
                                >
                                    <Mail className="h-3 w-3" /> Summarize as email
                                </button>
                            </div>
                        </div>
                    ) : (
                    <div className="px-4 py-2 border-b bg-slate-50 flex flex-col gap-2 shrink-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <BookOpen className="h-3.3" /> Select Context Meeting
                        </div>
                        <Select value={selectedMeetingId} onValueChange={setSelectedMeetingId}>
                            <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                                <SelectValue placeholder="General Assistant" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">General Assistant</SelectItem>
                                {meetings.map((m) => (
                                    <SelectItem key={String(m.id)} value={String(m.id)}>
                                        {m.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex flex-wrap gap-2 mt-1">
                            <button
                                type="button"
                                onClick={() => handleQuickAction("Schedule a meet")}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#1B2BB8] hover:text-[#1B2BB8] text-slate-600 text-[10px] rounded-full transition-colors shadow-sm"
                            >
                                <Calendar className="h-3 w-3" /> Schedule a meet
                            </button>
                            <button
                                type="button"
                                onClick={() => handleQuickAction("Know Analytics")}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#1B2BB8] hover:text-[#1B2BB8] text-slate-600 text-[10px] rounded-full transition-colors shadow-sm"
                            >
                                <BarChart2 className="h-3 w-3" /> Know Analytics
                            </button>
                        </div>
                    </div>
                    )}

                    <CardContent className="flex-1 min-h-0 overflow-hidden p-0 bg-white flex flex-col">
                        <div
                            ref={scrollRef}
                            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 space-y-4 scroll-smooth [scrollbar-gutter:stable] scrollbar-thin"
                        >
                            {!isPro && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-white p-2 rounded-full shadow-sm">
                                            <Zap className="h-5 w-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800">Unlock MemoBot Pro</h4>
                                            <p className="text-[10px] text-slate-500 mt-1 mb-2 leading-relaxed">
                                                Connect your Google account to fetch calendar, Gmail, and Google Meet permissions.
                                            </p>
                                            <Button 
                                                onClick={handleGoogleConnect} 
                                                disabled={isConnectingGoogle}
                                                className="w-full h-8 text-[10px] bg-white border border-slate-200 text-slate-700 hover:text-[#1B2BB8] hover:bg-blue-50 transition-colors shadow-sm"
                                            >
                                                {isConnectingGoogle ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : (
                                                    <svg className="w-3 h-3 mr-2" viewBox="0 0 24 24">
                                                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                    </svg>
                                                )}
                                                Sign in with Google
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-100' : 'bg-blue-100'}`}>
                                            {msg.role === 'user' ? <User className="h-4 w-4 text-slate-600" /> : <Bot className="h-4 w-4 text-[#1B2BB8]" />}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user'
                                                ? 'bg-[#1B2BB8] text-white rounded-tr-none'
                                                : 'bg-slate-100 text-slate-800 rounded-tl-none'
                                            }`}>
                                            {renderMessageContent(msg.content)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex gap-2">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Bot className="h-4 w-4 text-[#1B2BB8]" />
                                        </div>
                                        <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                                            <span className="text-[10px] text-slate-400 font-medium">Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className={`p-3 border-t bg-white shrink-0 ${isEmbedded ? 'rounded-none' : 'rounded-b-xl'}`}>
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex gap-2 w-full"
                        >
                            <Input
                                placeholder={contextMeetingId ? `Ask about this meeting…` : 'Type your question...'}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="h-10 text-xs rounded-xl bg-slate-50 border-slate-200 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8]"
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={isLoading || !input.trim()}
                                className="h-10 w-10 rounded-xl bg-[#1B2BB8] hover:bg-blue-800 text-white flex-shrink-0 transition-all active:scale-90"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
        </Card>
    );

    if (isEmbedded) {
        return (
            <>
                <div className="w-full flex flex-col min-h-0">
                    {chatCard}
                </div>
                {emailDraftDialog}
            </>
        );
    }

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                {!isOpen ? (
                    <Button
                        onClick={() => setIsOpen(true)}
                        className="h-14 w-14 rounded-full bg-[#1B2BB8] hover:bg-blue-800 shadow-2xl text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                    >
                        <MessageSquare className="h-6 w-6" />
                    </Button>
                ) : (
                    chatCard
                )}
            </div>
            {emailDraftDialog}
        </>
    );
};

export default ChatBot;

