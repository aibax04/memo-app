
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import NavBar from "./NavBar";
import { toast } from "sonner";

// Check if token has expired (7 days)
const isTokenExpired = (): boolean => {
  const tokenTimestamp = localStorage.getItem('memoapp_token_timestamp');
  if (!tokenTimestamp) return true;

  const expiryTimeMs = parseInt(tokenTimestamp) + (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
  return Date.now() > expiryTimeMs;
};

const ProtectedLayout: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check for token expiration on route changes
  useEffect(() => {
    const accessToken = localStorage.getItem("memoapp_access_token");
    if (accessToken && isTokenExpired()) {
      console.log("🔒 Token expired while navigating, logging out user");
      toast.error("Your session has expired. Please log in again.");
      logout();
      navigate("/login");
    }
  }, [location.pathname, logout, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      {/* Navbar is fixed at the top */}
      <NavBar />

      {/* 
          Main content area with padding for the fixed navbar (h-16 = 64px).
          Max-width 1600px ensures it doesn't get too wide on ultra-wide screens.
          mx-auto centers it.
      */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 sm:px-10 mt-16 pt-12 pb-12">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ProtectedLayout;
