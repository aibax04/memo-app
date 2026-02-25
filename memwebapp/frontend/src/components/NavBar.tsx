
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { logout as apiLogout } from "@/services/api";

const NavBar: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    console.log("🔒 Logging out user");

    // Log out from API first
    apiLogout();

    // Then log out from Supabase
    await logout();

    toast.success("Logged out successfully");
  };

  return (
    <div className="w-full fixed border-b bg-white shadow-sm">
      <div className="container flex items-center justify-between h-16 mx-auto px-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/lovable-uploads/image.png"
              alt="Memo App Logo"
              className="h-14 w-auto object-contain"
            />
          </Link>
        </div>

        {user &&
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              {user?.name || "User"}
            </span>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
              title="Logout"
            >
              <span>Logout</span>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        }
      </div>
    </div>
  );
};

export default NavBar;
