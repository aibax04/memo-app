
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import NavBar from "./NavBar";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "./ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ExtensionDialogProvider } from "@/context/ExtensionDialogContext";

// Check if token has expired (7 days)
const isTokenExpired = (): boolean => {
  const tokenTimestamp = localStorage.getItem('ownnote_token_timestamp');
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
    const accessToken = localStorage.getItem("ownnote_access_token");
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
    <ExtensionDialogProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-col min-h-screen">
            <div className="pt-6 flex-shrink-0 flex items-center px-4 md:px-6">
              <SidebarTrigger className="-ml-1" />
            </div>

            {/* Main content area */}
            <div className="flex-1 flex min-h-0 w-full mx-auto px-4 md:px-8 pb-6">
              <div className="w-full">
                {children || <Outlet />}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ExtensionDialogProvider>
  );
};

export default ProtectedLayout;
