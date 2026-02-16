
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Mic } from "lucide-react";

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
    return <Navigate to="/" replace />;
  }

  return (
    <div className="fixed inset-0 min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0C10]">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-800/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 z-1 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="relative z-10 w-full max-w-md px-6 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-2xl shadow-blue-500/40 mb-4 animate-bounce-subtle">
            <Mic className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Memo App</h2>
          <p className="text-slate-400 mt-2 font-medium">Capture. Transcribe. Analyze.</ p>
        </div>

        <div className="bg-[#161B22]/80 backdrop-blur-2xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] border border-white/10 ring-1 ring-white/5">
          {children}
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Memo App. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
