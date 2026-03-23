import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    adminLogin,
    isAdminAuthenticated,
    clearAdminKey,
    getAdminStats,
    getAdminUsers,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    getAdminUserMeetings,
    toggleAdminUserPro,
    type AdminStats,
    type UserWithStats,
    type AdminMeeting,
} from "@/services/adminApi";
import { toast } from "sonner";
import {
    Users, BarChart3, Clock, CheckCircle2, XCircle,
    Trash2, Shield, LogOut, Activity,
    Calendar, TrendingUp, UserPlus, ChevronDown, ChevronUp,
    Search, RefreshCw, X, ArrowLeft, Video,
    Star, Sparkles, Bot, FileText,
} from "lucide-react";

/* ─────────────────────── helpers ─────────────────────── */
const fmtDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        timeZone: "Asia/Kolkata",
    });
};

const fmtDuration = (minutes: number) => {
    if (!minutes) return "0 min";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const statusColor: Record<string, string> = {
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    PROCESSING: "bg-blue-50 text-[#1B2BB8] border-blue-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
    RECORDING: "bg-violet-50 text-violet-700 border-violet-200",
};

/* ─────────────────────── component ─────────────────────── */
const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();

    /* auth state */
    const [authenticated, setAuthenticated] = useState(isAdminAuthenticated());
    const [adminKeyInput, setAdminKeyInput] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);

    /* data state */
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    /* expanded user meetings */
    const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
    const [userMeetings, setUserMeetings] = useState<AdminMeeting[]>([]);
    const [meetingsLoading, setMeetingsLoading] = useState(false);

    /* create user dialog */
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "" });
    const [createLoading, setCreateLoading] = useState(false);

    /* ─── Load data ─── */
    const loadData = useCallback(async () => {
        if (!isAdminAuthenticated()) return;
        setLoading(true);
        try {
            const [s, u] = await Promise.all([getAdminStats(), getAdminUsers()]);
            setStats(s);
            setUsers(u);
        } catch (e: any) {
            toast.error(e.message || "Failed to load admin data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authenticated) loadData();
    }, [authenticated, loadData]);

    /* ─── Auth handlers ─── */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        const ok = await adminLogin(adminKeyInput);
        if (ok) {
            setAuthenticated(true);
            toast.success("Welcome, Admin");
        } else {
            toast.error("Invalid admin key");
        }
        setLoginLoading(false);
    };

    const handleLogout = () => {
        clearAdminKey();
        setAuthenticated(false);
        setStats(null);
        setUsers([]);
    };

    /* ─── User CRUD ─── */
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            await createAdminUser(newUser);
            toast.success(`User ${newUser.email} created`);
            setShowCreateDialog(false);
            setNewUser({ name: "", email: "", password: "" });
            loadData();
        } catch (e: any) {
            toast.error(e.message || "Failed to create user");
        }
        setCreateLoading(false);
    };

    const handleToggleActive = async (user: UserWithStats) => {
        try {
            await updateAdminUser(user.id, { is_active: !user.is_active });
            toast.success(`${user.name} ${user.is_active ? "deactivated" : "activated"}`);
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleTogglePro = async (user: UserWithStats) => {
        try {
            const res = await toggleAdminUserPro(user.id);
            toast.success(`${user.name} is now ${res.is_pro ? "Pro" : "Free"}`);
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleDeleteUser = async (user: UserWithStats) => {
        if (!window.confirm(`Delete ${user.name} (${user.email}) and all their meetings?`)) return;
        try {
            await deleteAdminUser(user.id);
            toast.success(`Deleted ${user.email}`);
            loadData();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleExpandUser = async (userId: number) => {
        if (expandedUserId === userId) {
            setExpandedUserId(null);
            return;
        }
        setExpandedUserId(userId);
        setMeetingsLoading(true);
        try {
            const m = await getAdminUserMeetings(userId);
            setUserMeetings(m);
        } catch (e: any) {
            toast.error(e.message);
        }
        setMeetingsLoading(false);
    };

    const filteredUsers = users.filter(
        (u) =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    /* ═══════════════════════════════════════════ */
    /*            LOGIN SCREEN (OWNnote theme)        */
    /* ═══════════════════════════════════════════ */
    if (!authenticated) {
        return (
            <div className="min-h-screen w-full flex bg-[#F3F3F3] overflow-hidden">
                {/* Left: Branded Panel */}
                <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center border-r border-[#1B2BB8] bg-[#1B2BB8] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1B2BB8] via-[#16239b] to-[#0c135c]" />
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px] animate-[pulse_6s_ease-in-out_infinite]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" style={{ animationDelay: "1s" }} />
                    <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-500/20 blur-[90px] animate-[pulse_7s_ease-in-out_infinite]" style={{ animationDelay: "2s" }} />
                    <div className="absolute inset-0 z-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,1) 1.5px, transparent 1.5px)", backgroundSize: "48px 48px" }} />

                    {/* Floating badges */}
                    <div className="absolute top-[15%] left-[10%] z-10 animate-[bounce_8s_ease-in-out_infinite]">
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl flex items-center gap-2 text-white/90 text-sm font-medium">
                            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                            12 Active Users
                        </div>
                    </div>
                    <div className="absolute bottom-[15%] right-[10%] z-10 animate-[bounce_10s_ease-in-out_infinite]" style={{ animationDelay: "1.5s" }}>
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl flex items-center gap-2 text-white/90 text-sm font-medium">
                            <span className="h-2 w-2 rounded-full bg-blue-300 animate-pulse" />
                            100+ Meetings Tracked
                        </div>
                    </div>
                    <div className="absolute top-[15%] right-[10%] z-10 animate-[bounce_9s_ease-in-out_infinite]" style={{ animationDelay: "0.7s" }}>
                        <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl flex items-center gap-2 text-white/90 text-sm font-medium">
                            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                            Full Control
                        </div>
                    </div>

                    {/* Center content */}
                    <div className="relative z-20 flex flex-col items-center justify-center text-center px-16 animate-in fade-in zoom-in-95 duration-1000 h-full w-full">
                        <img src="/lovable-uploads/image.png" alt="OWNnote Logo" className="h-32 w-auto object-contain drop-shadow-2xl brightness-0 invert mb-4" />
                        <div className="space-y-4 max-w-md">
                            <p className="text-3xl font-light text-blue-50 leading-snug drop-shadow-sm">
                                Command center for<br />
                                <span className="font-bold text-white tracking-tight">your meeting intelligence.</span>
                            </p>
                            <p className="text-blue-200/90 font-medium text-lg">Monitor users, track meetings, and manage access.</p>
                        </div>
                    </div>
                </div>

                {/* Right: Login Form */}
                <div className="w-full lg:w-1/2 flex flex-col items-center justify-center relative bg-[#F3F3F3] p-6 sm:p-12 overflow-y-auto">
                    <div className="lg:hidden absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#1B2BB8]/10 blur-[120px]" />
                        <div className="absolute inset-0 z-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(#000000 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold text-sm group"
                    >
                        <div className="p-2 rounded-full bg-white border border-slate-200 shadow-sm group-hover:bg-slate-50 transition-colors">
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        </div>
                        <span className="hidden sm:inline">Back to Login</span>
                    </button>

                    <div className="w-full max-w-[420px] relative z-10 animate-in fade-in slide-in-from-right-8 duration-700">
                        <div className="lg:hidden flex flex-col items-center mb-10">
                            <img src="/lovable-uploads/image.png" alt="OWNnote Logo" className="h-20 w-auto object-contain" />
                        </div>

                        <div className="bg-white/80 lg:bg-transparent backdrop-blur-3xl lg:backdrop-blur-none p-8 sm:p-10 lg:p-0 shadow-xl lg:shadow-none rounded-[2.5rem] lg:rounded-none border border-slate-200 lg:border-none">
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="text-center mb-8">
                                    <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-[#1B2BB8] flex items-center justify-center shadow-[0_4px_14px_0_rgba(27,43,184,0.39)]">
                                        <Shield className="w-7 h-7 text-white" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Console</h1>
                                    <p className="text-slate-600 mt-2">Enter your admin key to continue</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div className="space-y-2 group">
                                        <label className="text-sm font-semibold text-slate-700 ml-1 group-focus-within:text-[#1B2BB8] transition-colors">
                                            Admin Key
                                        </label>
                                        <div className="relative">
                                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2BB8] transition-colors z-10" />
                                            <input
                                                type="password"
                                                value={adminKeyInput}
                                                onChange={(e) => setAdminKeyInput(e.target.value)}
                                                placeholder="Enter admin key"
                                                className="w-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl pl-12 pr-4 focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={loginLoading}
                                        className="w-full h-12 bg-[#1B2BB8] hover:bg-blue-800 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(27,43,184,0.39)] transition-all active:scale-[0.98] mt-4 disabled:opacity-50"
                                    >
                                        {loginLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
                                                Verifying…
                                            </span>
                                        ) : "Authenticate"}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <p className="text-slate-600 text-[11px] uppercase tracking-widest font-bold">
                                &copy; {new Date().getFullYear()} OWNnote · Admin
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ═══════════════════════════════════════════ */
    /*          ADMIN DASHBOARD (OWNnote theme)       */
    /* ═══════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-[#F3F3F3]">
            {/* ── Header ── */}
            <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
                <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src="/lovable-uploads/image.png" alt="OWNnote" className="h-9 w-auto object-contain drop-shadow-sm" />
                        <div className="h-6 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#1B2BB8] flex items-center justify-center">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-[10px] font-black text-[#1B2BB8]/60 uppercase tracking-widest">Admin Console</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={loadData}
                            className="h-9 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1B2BB8] text-sm font-bold flex items-center gap-2 transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="h-9 px-4 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 text-sm font-bold flex items-center gap-2 transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1440px] mx-auto px-6 py-8">
                {/* ── Stats Cards ── */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                        <StatCard icon={<Users className="w-5 h-5" />} label="Total Users" value={stats.total_users} accent="blue" />
                        <StatCard icon={<Activity className="w-5 h-5" />} label="Active Users" value={stats.active_users} accent="emerald" />
                        <StatCard icon={<Video className="w-5 h-5" />} label="Total Meetings" value={stats.total_meetings} accent="blue" />
                        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Completed" value={stats.completed_meetings} accent="emerald" />
                        <StatCard icon={<Sparkles className="w-5 h-5" />} label="Pro Users" value={stats.total_pro_users} accent="blue" />
                        <StatCard icon={<Clock className="w-5 h-5" />} label="Total Hours" value={`${(stats.total_duration_minutes / 60).toFixed(1)}h`} accent="amber" />
                    </div>
                )}

                {/* ── Kanban Overview ── */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <KanbanColumn
                            title="Completed"
                            count={stats.completed_meetings}
                            icon={<CheckCircle2 className="w-4 h-4" />}
                            accent="emerald"
                            items={[
                                { label: "Today", value: stats.meetings_today },
                                { label: "This Week", value: stats.meetings_this_week },
                                { label: "This Month", value: stats.meetings_this_month },
                            ]}
                        />
                        <KanbanColumn
                            title="Pending"
                            count={stats.pending_meetings}
                            icon={<Clock className="w-4 h-4" />}
                            accent="amber"
                            items={[{ label: "Awaiting processing", value: stats.pending_meetings }]}
                        />
                        <KanbanColumn
                            title="Failed"
                            count={stats.failed_meetings}
                            icon={<XCircle className="w-4 h-4" />}
                            accent="red"
                            items={[{ label: "Needs attention", value: stats.failed_meetings }]}
                        />
                        <KanbanColumn
                            title="Platform Overview"
                            count={stats.total_meetings}
                            icon={<TrendingUp className="w-4 h-4" />}
                            accent="blue"
                            items={[
                                { label: "Users", value: stats.total_users },
                                { label: "Active", value: stats.active_users },
                                { label: "Pro Users", value: stats.total_pro_users },
                                { label: "Duration", value: `${(stats.total_duration_minutes / 60).toFixed(1)}h` },
                            ]}
                        />
                    </div>
                )}

                {/* ── Users Section ── */}
                <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">User Management</h2>
                            <p className="text-sm text-slate-400 font-medium mt-0.5">{users.length} registered users</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search users…"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] outline-none transition-all w-56"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateDialog(true)}
                                className="h-10 px-5 rounded-xl bg-[#1B2BB8] hover:bg-blue-800 text-white text-sm font-bold flex items-center gap-2 shadow-[0_4px_14px_0_rgba(27,43,184,0.25)] transition-all active:scale-[0.97]"
                            >
                                <UserPlus className="w-4 h-4" />
                                Create User
                            </button>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    {["User", "Status", "Meetings", "Completed", "Duration", "Last Active", "Joined", "Actions"].map((h, i) => (
                                        <th key={h} className={`text-[10px] font-black text-[#1B2BB8]/40 uppercase tracking-widest py-3 ${i === 0 ? "text-left px-6" : i === 7 ? "text-right px-6" : ["Meetings", "Completed", "Duration"].includes(h) ? "text-center px-4" : "text-left px-4"
                                            }`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <React.Fragment key={user.id}>
                                        <tr
                                            className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer ${expandedUserId === user.id ? "bg-blue-50/30" : ""
                                                }`}
                                            onClick={() => handleExpandUser(user.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${user.is_active
                                                        ? "bg-gradient-to-br from-[#1B2BB8] to-blue-700"
                                                        : "bg-slate-300"
                                                        }`}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-900 text-sm leading-tight">{user.name}</p>
                                                            {user.is_pro && (
                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-black uppercase tracking-tight">
                                                                    <Star className="w-2 h-2 fill-current" />
                                                                    Pro
                                                                </span>
                                                            )}
                                                            {user.auth_provider === "self_service" && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-black uppercase tracking-tight" title="Registered via public sign-up page">
                                                                    Self signup
                                                                </span>
                                                            )}
                                                            {user.auth_provider === "local" && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100 text-[10px] font-black uppercase tracking-tight" title="Created from admin dashboard">
                                                                    Admin
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${user.is_active
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-slate-400"}`} />
                                                    {user.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-sm font-black text-slate-900">{user.meeting_count}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-sm font-bold text-emerald-600">{user.completed_meetings}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-sm font-medium text-slate-600">{fmtDuration(user.total_duration_minutes)}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-medium text-slate-500">{fmtDate(user.last_meeting_at)}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-xs font-medium text-slate-400">{fmtDate(user.created_at)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleExpandUser(user.id)}
                                                        className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-[#1B2BB8] transition-colors"
                                                        title="View meetings"
                                                    >
                                                        {expandedUserId === user.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleActive(user)}
                                                        className={`p-2 rounded-lg transition-colors ${user.is_active
                                                            ? "hover:bg-amber-50 text-slate-400 hover:text-amber-600"
                                                            : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                                                            }`}
                                                        title={user.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        {user.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleTogglePro(user)}
                                                        className={`p-2 rounded-lg transition-colors ${user.is_pro
                                                            ? "hover:bg-amber-50 text-amber-500"
                                                            : "hover:bg-slate-100 text-slate-400"
                                                            }`}
                                                        title={user.is_pro ? "Revoke Pro" : "Grant Pro"}
                                                    >
                                                        <Star className={`w-4 h-4 ${user.is_pro ? "fill-current" : ""}`} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDeleteUser(user);
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded user meetings */}
                                        {expandedUserId === user.id && (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-5 bg-slate-50/60 border-b border-slate-100">
                                                    {/* Quick Actions Bar */}
                                                    <div className="flex flex-wrap items-center justify-end gap-3 mb-6 animate-in slide-in-from-top-2 duration-300">
                                                        <button
                                                            type="button"
                                                            onClick={() => toast.info(`Generating Progress Report for ${user.name}`)}
                                                            className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm group min-w-[180px]"
                                                        >
                                                            <div className="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                                                                <FileText className="w-5 h-5 text-emerald-600" />
                                                            </div>
                                                            <span className="text-sm font-bold">Progress Report</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => toast.info(`Starting Chat with OWNnote Bot about ${user.name}`)}
                                                            className="flex items-center gap-3 px-6 py-3 bg-[#1B2BB8] text-white rounded-2xl hover:bg-blue-800 transition-all shadow-[0_4px_14px_0_rgba(27,43,184,0.3)] hover:scale-105 active:scale-95 group min-w-[200px]"
                                                        >
                                                            <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors">
                                                                <Bot className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none">AI Assistant</p>
                                                                <p className="text-sm font-bold">Ask OWNnote Bot</p>
                                                            </div>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => toast.info(`Viewing Calendar for ${user.name}`)}
                                                            className="flex items-center justify-center p-3 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:text-[#1B2BB8] transition-all shadow-sm group h-[52px] w-[52px]"
                                                            title="Calendar View"
                                                        >
                                                            <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                                                <Calendar className="w-5 h-5 text-[#1B2BB8]" />
                                                            </div>
                                                        </button>
                                                    </div>
                                                    {meetingsLoading ? (
                                                        <div className="flex items-center justify-center py-8 text-slate-400">
                                                            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading meetings…
                                                        </div>
                                                    ) : userMeetings.length === 0 ? (
                                                        <div className="text-center py-8 text-slate-400 text-sm font-medium">
                                                            <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                            No meetings recorded yet
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                                            {userMeetings.map((m) => (
                                                                <div
                                                                    key={m.id}
                                                                    className="bg-white rounded-2xl border border-slate-200/60 p-4 hover:shadow-md transition-all group"
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2 flex-1 group-hover:text-[#1B2BB8] transition-colors">
                                                                            {m.title || "Untitled Meeting"}
                                                                        </h4>
                                                                        <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusColor[m.status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                                                                            {m.status}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 font-medium">
                                                                        <span className="flex items-center gap-1">
                                                                            <Calendar className="w-3 h-3" />
                                                                            {fmtDate(m.created_at)}
                                                                        </span>
                                                                        {m.duration && (
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock className="w-3 h-3" />
                                                                                {fmtDuration(m.duration)}
                                                                            </span>
                                                                        )}
                                                                        {m.platform && (
                                                                            <span className="capitalize">{m.platform.replace("_", " ")}</span>
                                                                        )}
                                                                    </div>
                                                                    {m.participants.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                                            {m.participants.slice(0, 3).map((p, i) => (
                                                                                <span key={i} className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-[#1B2BB8]/70">{p}</span>
                                                                            ))}
                                                                            {m.participants.length > 3 && (
                                                                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-400">+{m.participants.length - 3}</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredUsers.length === 0 && !loading && (
                        <div className="text-center py-16 text-slate-400">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                            <p className="font-bold text-slate-500">No users found</p>
                            <p className="text-sm mt-1">Try adjusting your search term</p>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Create User Dialog ── */}
            {showCreateDialog && (
                <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-300 border border-slate-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Create New User</h3>
                                <p className="text-sm text-slate-500 mt-0.5 font-medium">Same database as public sign-up — tagged as <span className="font-bold text-slate-700">Admin</span> here. Self-registered users show <span className="font-bold text-violet-600">Self signup</span>.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateDialog(false)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-8 flex flex-col gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    placeholder="John Doe"
                                    className="w-full h-12 border border-slate-200 rounded-xl px-4 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="user@company.com"
                                    className="w-full h-12 border border-slate-200 rounded-xl px-4 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-slate-700">Password</label>
                                <input
                                    type="text"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder="Set initial password"
                                    className="w-full h-12 border border-slate-200 rounded-xl px-4 text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] outline-none transition-all"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={createLoading}
                                className="w-full h-12 mt-2 bg-[#1B2BB8] hover:bg-blue-800 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(27,43,184,0.39)] transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {createLoading ? "Creating…" : "Create Account"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════ */
/*          SUB-COMPONENTS (OWNnote style)        */
/* ═══════════════════════════════════════════ */

const accentStyles: Record<string, { card: string; icon: string; badge: string }> = {
    blue: {
        card: "bg-white",
        icon: "bg-blue-50 text-[#1B2BB8]",
        badge: "bg-blue-50 text-[#1B2BB8]",
    },
    emerald: {
        card: "bg-white",
        icon: "bg-emerald-50 text-emerald-600",
        badge: "bg-emerald-50 text-emerald-600",
    },
    amber: {
        card: "bg-white",
        icon: "bg-amber-50 text-amber-600",
        badge: "bg-amber-50 text-amber-600",
    },
    red: {
        card: "bg-white",
        icon: "bg-red-50 text-red-600",
        badge: "bg-red-50 text-red-600",
    },
};

function StatCard({
    icon,
    label,
    value,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    accent: string;
}) {
    const s = accentStyles[accent] || accentStyles.blue;
    return (
        <div className={`${s.card} rounded-2xl p-5 border border-slate-200/60 hover:shadow-md transition-all`}>
            <div className={`${s.icon} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
            <p className="text-[10px] font-black text-[#1B2BB8]/40 mt-0.5 uppercase tracking-widest">{label}</p>
        </div>
    );
}

function KanbanColumn({
    title,
    count,
    icon,
    accent,
    items,
}: {
    title: string;
    count: number | string;
    icon: React.ReactNode;
    accent: string;
    items: { label: string; value: number | string }[];
}) {
    const s = accentStyles[accent] || accentStyles.blue;
    return (
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden hover:shadow-md transition-all">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`${s.icon} w-7 h-7 rounded-lg flex items-center justify-center`}>
                        {icon}
                    </div>
                    <h3 className="text-sm font-black text-slate-900">{title}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${s.badge}`}>{count}</span>
            </div>
            <div className="p-4 space-y-2">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50/80 hover:bg-slate-100 transition-colors">
                        <span className="text-xs font-medium text-slate-500">{item.label}</span>
                        <span className="text-sm font-black text-slate-900">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AdminDashboard;
