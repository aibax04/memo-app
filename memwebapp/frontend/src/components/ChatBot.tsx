import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, ChevronDown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Meeting } from '@/services/meetingApi';
import { toast } from 'sonner';

interface Message {
    role: 'user' | 'bot';
    content: string;
}

interface ChatBotProps {
    meetings: Meeting[];
}

const ChatBot: React.FC<ChatBotProps> = ({ meetings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'bot', content: 'Hi! I\'m MemoBot. I can answer questions about your meetings or explain how Memo App works. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMeetingId, setSelectedMeetingId] = useState<string>('none');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
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
                    message: userMessage,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                    meeting_id: selectedMeetingId === 'none' ? null : selectedMeetingId,
                    is_general_query: userMessage.toLowerCase().includes('how') || userMessage.toLowerCase().includes('memo app')
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

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {!isOpen ? (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full bg-[#1B2BB8] hover:bg-blue-800 shadow-2xl text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                >
                    <MessageSquare className="h-6 w-6" />
                </Button>
            ) : (
                <Card className="w-80 md:w-96 h-[500px] flex flex-col shadow-2xl border-slate-200 animate-in slide-in-from-bottom-5 duration-300">
                    <CardHeader className="bg-[#1B2BB8] text-white rounded-t-xl py-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            <CardTitle className="text-sm font-bold">MemoBot</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:bg-white/10 h-8 w-8"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <div className="px-4 py-2 border-b bg-slate-50 flex flex-col gap-2">
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
                    </div>

                    <CardContent className="flex-1 overflow-hidden p-0 bg-white">
                        <div ref={scrollRef} className="h-full overflow-y-auto p-4 space-y-4">
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
                                            {msg.content}
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

                    <CardFooter className="p-3 border-t bg-white rounded-b-xl">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex gap-2 w-full"
                        >
                            <Input
                                placeholder="Type your question..."
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
            )}
        </div>
    );
};

export default ChatBot;
