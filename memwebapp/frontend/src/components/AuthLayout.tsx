
import React from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft } from "lucide-react";

type AuthLayoutProps = {
  children: React.ReactNode;
};

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-full flex bg-[#F3F3F3] overflow-hidden">
      {/* Left side: Premium Branding (Hidden on smaller screens) */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center border-r border-[#1B2BB8] bg-[#1B2BB8] overflow-hidden">
        {/* Dynamic Abstract Background Gradient & Glows */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B2BB8] via-[#16239b] to-[#0c135c]"></div>

        {/* Animated Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px] animate-[pulse_6s_ease-in-out_infinite]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/20 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-500/20 blur-[90px] animate-[pulse_7s_ease-in-out_infinite]" style={{ animationDelay: '2s' }}></div>

        {/* Interactive Grid overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1.5px, transparent 1.5px)', backgroundSize: '48px 48px' }}></div>

        {/* Floating Abstract UI Elements / Badges */}
        <div className="absolute top-[12%] left-[8%] z-10 animate-[bounce_8s_ease-in-out_infinite]">
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl flex items-center gap-2 text-white/90 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
            Real-time Sync
          </div>
        </div>

        <div className="absolute bottom-[10%] right-[8%] z-10 animate-[bounce_10s_ease-in-out_infinite]" style={{ animationDelay: '1.5s' }}>
          <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl flex items-center gap-2 text-white/90 text-sm font-medium">
            <span className="h-2 w-2 rounded-full bg-blue-300 animate-pulse"></span>
            AI Insights Extracted
          </div>
        </div>

        <div className="absolute bottom-[35%] left-[6%] z-10 animate-[bounce_9s_ease-in-out_infinite] opacity-60" style={{ animationDelay: '0.5s' }}>
          <div className="h-16 w-16 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-white/20 animate-ping"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-16 animate-in fade-in zoom-in-95 duration-1000 h-full w-full">
          <Link to="/" className="flex flex-col items-center group mb-4">
            <img
              src="/lovable-uploads/image.png"
              alt="Memo App Logo"
              className="h-32 w-auto object-contain group-hover:scale-[1.03] transition-transform duration-700 drop-shadow-2xl brightness-0 invert"
            />
          </Link>

          <div className="space-y-6 max-w-md relative">
            <div className="absolute -inset-8 bg-white/5 blur-2xl rounded-full z-0 pointer-events-none"></div>
            <div className="relative z-10 space-y-4">
              <p className="text-3xl font-light text-blue-50 leading-snug drop-shadow-sm">
                Capture your conversations. <br />
                <span className="font-bold text-white tracking-tight">Unlock your intelligence.</span>
              </p>
              <p className="text-blue-200/90 font-medium text-lg">Record, transcribe, and instantly export to your CRM.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center relative bg-[#F3F3F3] p-6 sm:p-12 overflow-y-auto">
        {/* Mobile Background Elements */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#1B2BB8]/10 blur-[120px]"></div>
          <div className="absolute inset-0 z-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        {/* Back to Home Button */}
        <Link
          to="/"
          className="absolute top-8 left-8 z-20 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-semibold text-sm group"
        >
          <div className="p-2 rounded-full bg-white border border-slate-200 shadow-sm group-hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </Link>

        {/* Form Container */}
        <div className="w-full max-w-[420px] relative z-10 animate-in fade-in slide-in-from-right-8 duration-700">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <Link to="/" className="flex flex-col items-center group">
              <img
                src="/lovable-uploads/image.png"
                alt="Memo App Logo"
                className="h-20 w-auto object-contain group-hover:scale-105 transition-all"
              />
            </Link>
          </div>

          <div className="bg-white/80 lg:bg-transparent backdrop-blur-3xl lg:backdrop-blur-none p-8 sm:p-10 lg:p-0 shadow-xl lg:shadow-none rounded-[2.5rem] lg:rounded-none border border-slate-200 lg:border-none">
            {children}
          </div>

          <div className="mt-8 text-center">
            <p className="text-slate-600 text-[11px] uppercase tracking-widest font-bold">
              &copy; {new Date().getFullYear()} Memo App
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
