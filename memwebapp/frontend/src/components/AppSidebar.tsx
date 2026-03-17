import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
    SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
    SidebarMenuItem, SidebarGroupContent
} from '@/components/ui/sidebar';
import {
    Video, FileText, Chrome, CalendarPlus, Zap, CheckCircle2,
    LogOut, ShieldCheck, Activity, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { getMeetings, formatMeetingDate, formatDuration } from '@/services/meetingApi';
import { getProStatus, activatePro, revokePro } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import ProCelebration from '@/components/ProCelebration';

export function AppSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isPro, logout } = useAuth();

    const [promoCode, setPromoCode] = useState('');
    const [showPromoDialog, setShowPromoDialog] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [meetings, setMeetings] = useState<any[]>([]);

    // Fetch meetings for the calendar
    useEffect(() => {
        const fetchAllMeetings = async () => {
            if (!user) {
                setMeetings([]);
                return;
            }
            try {
                const result = await getMeetings(1, 100);
                if ('data' in result) {
                    setMeetings(result.data);
                }
            } catch (e) {
                console.error("Failed to fetch meetings for calendar", e);
            }
        };
        fetchAllMeetings();
    }, [user]);

    const meetingDates = React.useMemo(() => {
        return meetings.map(m => new Date(m.created_at));
    }, [meetings]);

    const selectedDateMeetings = React.useMemo(() => {
        if (!selectedDate) return [];
        return meetings.filter(m => {
            const mDate = new Date(m.created_at);
            return mDate.toDateString() === selectedDate.toDateString();
        });
    }, [selectedDate, meetings]);

    const handleUnlock = async () => {
        try {
            const result = await activatePro(promoCode.trim());
            if (!result.error) {
                setShowPromoDialog(false);
                setShowCelebration(true);
            } else {
                toast.error(result.detail || result.error || "Invalid Promo Code");
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to activate Pro");
        }
    };

    const handleRevoke = async () => {
        if (!window.confirm("Are you sure you want to revoke your Pro subscription? You will lose access to unlimited recordings.")) return;
        try {
            const result = await revokePro();
            if (!result.error) {
                toast.success("Subscription revoked. You are now on the Free plan.");
            } else {
                toast.error(result.detail || result.error || "Failed to revoke subscription");
            }
        } catch (e: any) {
            toast.error(e.message || "An error occurred");
        }
    };

    const handleLogout = async () => {
        logout();
        toast.success("Logged out successfully");
        navigate('/login');
    };

    return (
        <>
            <Sidebar className="border-r border-slate-200/60 bg-white/95 backdrop-blur-xl">
                <SidebarHeader className="p-6 pt-8 flex items-center justify-center w-full">
                    <img src="/lovable-uploads/image.png" alt="Memo App Logo" className="h-16 md:h-20 w-auto object-contain drop-shadow-sm" />
                </SidebarHeader>

                <SidebarContent className="px-3 py-4 flex flex-col gap-6">
                    {/* Main Navigation */}
                    <SidebarGroup>
                        <SidebarGroupLabel className="text-[10px] font-black tracking-widest text-[#1B2BB8]/60 uppercase mb-2">Workspace</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={location.pathname === '/dashboard' || location.pathname === '/meetings'}
                                        onClick={() => navigate('/dashboard')}
                                        className="font-bold text-slate-600 h-10 rounded-xl data-[active=true]:bg-blue-50 data-[active=true]:text-[#1B2BB8] transition-all"
                                    >
                                        <Video className="w-5 h-5 mr-3" />
                                        <span>Dashboard</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        isActive={location.pathname === '/templates'}
                                        onClick={() => navigate('/templates')}
                                        className="font-bold text-slate-600 h-10 rounded-xl data-[active=true]:bg-blue-50 data-[active=true]:text-[#1B2BB8] transition-all"
                                    >
                                        <FileText className="w-5 h-5 mr-3" />
                                        <span>Templates</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>

                    {/* Tools & Calendar */}
                    <SidebarGroup>
                        <SidebarGroupLabel className="text-[10px] font-black tracking-widest text-[#1B2BB8]/60 uppercase mb-2">Apps & Tools</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="gap-2">
                                <SidebarMenuItem>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <SidebarMenuButton className="font-bold text-slate-600 h-10 rounded-xl hover:bg-slate-100 transition-all">
                                                <CalendarPlus className="w-5 h-5 mr-3 text-emerald-500" />
                                                <span>Meeting Calendar</span>
                                            </SidebarMenuButton>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[700px] bg-white border-slate-200 shadow-xl rounded-[2rem] p-0 overflow-hidden">
                                            <div className="flex flex-col md:flex-row h-[500px]">
                                                <div className="p-6 border-r border-slate-100 bg-slate-50/50 flex flex-col items-center justify-start flex-shrink-0">
                                                    <DialogHeader className="mb-4">
                                                        <DialogTitle className="text-lg font-bold text-slate-900 text-center">Calendar</DialogTitle>
                                                    </DialogHeader>
                                                    <Calendar
                                                        mode="single"
                                                        selected={selectedDate}
                                                        onSelect={setSelectedDate}
                                                        modifiers={{ hasMeeting: meetingDates }}
                                                        modifiersClassNames={{ hasMeeting: "bg-blue-100/50 font-bold text-blue-700" }}
                                                        className="rounded-xl border border-slate-200 bg-white"
                                                    />
                                                </div>
                                                <div className="flex-1 p-6 flex flex-col bg-white overflow-hidden">
                                                    <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">
                                                        {selectedDate ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
                                                    </h3>
                                                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                                                        {selectedDateMeetings.length > 0 ? (
                                                            selectedDateMeetings.map(meeting => (
                                                                <div key={meeting.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => navigate(`/meetings/${meeting.id}`)}>
                                                                    <h4 className="font-bold text-slate-900 truncate pr-4 group-hover:text-blue-700 transition-colors">
                                                                        {meeting.title || 'Untitled Meeting'}
                                                                    </h4>
                                                                    <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-500">
                                                                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatMeetingDate(meeting.created_at)}</span>
                                                                        <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" />{formatDuration(meeting.duration)}</span>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
                                                                <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                                                                    <CalendarPlus className="h-5 w-5 text-slate-300" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-slate-500">No meetings recorded</p>
                                                                    <p className="text-xs mt-1">Select another day.</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </SidebarMenuItem>

                                <SidebarMenuItem>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <SidebarMenuButton className="font-bold text-slate-600 h-10 rounded-xl hover:bg-slate-100 transition-all">
                                                <Chrome className="w-5 h-5 mr-3 text-rose-500" />
                                                <span>Chrome Extension</span>
                                            </SidebarMenuButton>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-xl bg-white border-slate-200 shadow-xl rounded-[2rem] p-6">
                                            <DialogHeader className="mb-2">
                                                <DialogTitle className="text-xl font-bold text-slate-900">Install Extension Local</DialogTitle>
                                            </DialogHeader>
                                            <div className="flex flex-col gap-6 py-2 text-sm text-slate-600 font-medium leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
                                                <p className="text-base text-slate-800">Follow these quick steps to start recording from your browser:</p>
                                                <div className="space-y-8">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                                            <span className="font-bold text-slate-800">Go to Manage Extensions</span>
                                                        </div>
                                                        <p className="text-slate-500 mb-4 ml-9">Click the puzzle icon in Chrome and select <strong>Manage Extensions</strong>, or manually navigate to <code className="bg-slate-100 px-2 py-1 rounded text-[#1B2BB8]">chrome://extensions</code></p>
                                                        <div className="ml-9 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                                            <img src="/images/image.png" alt="Manage Extensions" className="w-full object-contain max-h-[250px]" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                                            <span className="font-bold text-slate-800">Enable Developer Mode</span>
                                                        </div>
                                                        <p className="text-slate-500 mb-4 ml-9">Toggle <strong>Developer mode</strong> in the top right corner of the extensions page to allow local extensions.</p>
                                                        <div className="ml-9 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                                            <img src="/images/image copy.png" alt="Developer Tools" className="w-full object-contain max-h-[250px]" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                                            <span className="font-bold text-slate-800">Load Unpacked</span>
                                                        </div>
                                                        <p className="text-slate-500 mb-4 ml-9">Click <strong>Load unpacked</strong> and select your extension folder to install and start using it!</p>
                                                        <div className="ml-9 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                                            <img src="/images/image copy 2.png" alt="Load unpacked" className="w-full object-contain max-h-[150px]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>

                <SidebarFooter className="p-4 gap-4 flex flex-col">
                    {/* User Profile */}
                    <div className="flex items-center gap-3 px-2 py-2 w-full justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900 leading-tight block truncate w-32">
                                    {user?.name || "User"}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    {isPro ? 'Pro Account' : 'Free Account'}
                                </span>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors h-8 w-8 rounded-full">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>

                    {isPro ? (
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden group">
                            <Zap className="absolute right-0 bottom-0 h-24 w-24 opacity-20 -mr-6 -mb-6 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80 text-white/90">Subscription Status</p>
                                    <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                                        Pro Member <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                    </h3>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRevoke}
                                    className="h-7 px-2 text-[9px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition-all"
                                >
                                    Revoke
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-5 shadow-sm group">
                            <h3 className="font-black text-slate-900 text-lg mb-1 tracking-tight">Elevate to Pro</h3>
                            <p className="text-xs text-slate-500 font-medium mb-4 leading-relaxed line-clamp-2">
                                Unlock the full power of meeting intelligence.
                            </p>

                            <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
                                <DialogTrigger asChild>
                                    <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm h-11 font-bold shadow-md active:scale-95 transition-all">
                                        Upgrade Now
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px] bg-white border-none shadow-2xl rounded-[2.5rem] p-8">
                                    <DialogHeader className="mb-2">
                                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Unlock Pro Features</DialogTitle>
                                    </DialogHeader>
                                    <div className="flex flex-col gap-5 py-4">
                                        <p className="text-sm text-slate-600 font-medium leading-relaxed">Enter your promo code to unlock unlimited recordings and premium analytics.</p>
                                        <Input
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value)}
                                            placeholder="Enter promo code"
                                            className="h-14 border-slate-200 rounded-2xl bg-slate-50 focus:bg-white text-lg px-4"
                                        />
                                        <Button onClick={handleUnlock} className="w-full bg-amber-500 hover:bg-amber-600 text-white h-14 rounded-2xl font-bold text-lg shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] transition-all active:scale-95">
                                            Unlock Now
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}
                </SidebarFooter>
            </Sidebar>
            <ProCelebration
                show={showCelebration}
                onComplete={() => setShowCelebration(false)}
                duration={5000}
            />
        </>
    );
}
