
import React from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Mic, ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen w-full flex bg-[#0A0C10] overflow-hidden">
      {/* Left side: Premium Branding (Hidden on smaller screens) */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center border-r border-white/5 bg-[#0D1017]">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute inset-0 z-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10 flex flex-col items-center text-center px-16 animate-in fade-in slide-in-from-left-8 duration-1000">
          <Link to="/" className="flex flex-col items-center group mb-10">
            <div className="p-6 bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-500/20 mb-6 group-hover:scale-105 group-hover:bg-blue-500 transition-all duration-500 hover:-translate-y-2">
              <Mic className="h-14 w-14 text-white" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter group-hover:text-blue-400 transition-colors">MEMO APP</h1>
          </Link>
          <div className="space-y-4">
            <p className="text-2xl font-light text-slate-300 leading-snug">
              Capture your conversations. <br />
              <span className="font-semibold text-white">Unlock your intelligence.</span>
            </p>
            <p className="text-slate-500 font-medium">Record, transcribe, and instantly export to your CRM.</p>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center relative bg-[#0A0C10] p-6 sm:p-12 overflow-y-auto">
        {/* Mobile Background Elements */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px]"></div>
          <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        {/* Back to Home Button */}
        <Link
          to="/"
          className="absolute top-8 left-8 z-20 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-semibold text-sm group"
        >
          <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
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
              <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-3 group-hover:scale-105 transition-all">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tighter">MEMO APP</h2>
            </Link>
          </div>

          <div className="bg-[#111418]/60 lg:bg-transparent backdrop-blur-3xl lg:backdrop-blur-none p-8 sm:p-10 lg:p-0 shadow-2xl lg:shadow-none rounded-[2.5rem] lg:rounded-none border border-white/5 lg:border-none">
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
