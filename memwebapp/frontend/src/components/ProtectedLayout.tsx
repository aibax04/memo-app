
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import NavBar from "./NavBar";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

// Check if token has expired (7 days)
const isTokenExpired = (): boolean => {
  const tokenTimestamp = localStorage.getItem('memoapp_token_timestamp');
  if (!tokenTimestamp) return true;
  
  const expiryTimeMs = parseInt(tokenTimestamp) + (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
  return Date.now() > expiryTimeMs;
};

type ProtectedLayoutProps = {
  children?: React.ReactNode;
};

const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ children }) => {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login while preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const canGoBack = location.pathname !== "/";
  
  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar is fixed at the top with higher z-index */}
      {/* <div className="w-full z-20 relative">
        <NavBar />
      </div> */}
      
      {/* Add spacing below navbar */}
      <div className="pt-4"></div>
      
      {/* Main content area that includes the sidebar and page content */}
      <div className="flex-1 flex">
        {children || <Outlet />}
      </div>
    </div>
  );
};

export default ProtectedLayout;
