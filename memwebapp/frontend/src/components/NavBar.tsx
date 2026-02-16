
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Mic, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { logout as apiLogout } from "@/services/api";

const NavBar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    console.log("🔒 Logging out user");
    apiLogout();
    await logout();
    toast.success("Logged out successfully");
  };

  const isActive = (path: string) => {
    if (path === '/meetings') return location.pathname === '/' || location.pathname.startsWith('/meetings');

    return false;
  };

  return (
    <header className="w-full fixed top-0 left-0 border-b border-slate-100 bg-white/40 backdrop-blur-md z-50">
      <div className="max-w-[1600px] flex items-center justify-between h-16 mx-auto px-6 sm:px-10">
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-1.5 bg-[#1B2BB8] rounded-xl group-hover:scale-105 transition-all duration-300">
              <Mic className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">
                Memo
              </span>
            </div>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-2">
              <Link
                to="/meetings"
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isActive('/meetings')
                  ? 'bg-[#1B2BB8] text-white shadow-lg shadow-[#1B2BB8]/25'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <BarChart3 className={`h-4 w-4 ${isActive('/meetings') ? 'text-white' : 'text-slate-400'}`} />
                <span>Meetings</span>
              </Link>
            </nav>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-black text-slate-900 leading-none">
                {user?.name || "Member"}
              </span>
              <span className="text-[9px] text-[#1B2BB8] uppercase tracking-[0.2em] font-black mt-1 bg-[#1B2BB8]/5 px-2 py-0.5 rounded-full">
                {user?.role === 'admin' ? 'Workspace Admin' : 'Intelligence Agent'}
              </span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="group flex items-center gap-3 text-slate-500 hover:text-red-600 hover:bg-slate-50 rounded-xl px-4 h-10 transition-all"
            >
              <span className="font-bold text-[10px] uppercase tracking-widest">Logout</span>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};


export default NavBar;
