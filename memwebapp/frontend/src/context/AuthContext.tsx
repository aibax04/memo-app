import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProStatus } from "@/services/api";

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
  isPro: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for authentication fallback when API is unavailable
const MOCK_USERS = [
  { id: "1", email: "demo@example.com", password: "password", name: "Demo User" },
  { id: "2", email: "hardik@indika.ai", password: "hardik", name: "Hardik Dave" },
  { id: "3", email: "sanjai.ruhela@dishd2h.com", password: "sanjai@8929100355", name: "Sanjai Ruhela" },
  { id: "4", email: "jhilmil.bhansali@dishd2h.com", password: "jhilmil@8586066223", name: "Jhilmil Bhansali" },
  { id: "5", email: "mohit.sharma2@dishd2h.com", password: "mohit@9711290596", name: "Mohit Sharma" },
  { id: "6", email: "sanjeev.chandel@dishd2h.com", password: "sanjeev@9711624678", name: "Sanjiv Chandel" },
  { id: "7", email: "punit.mediratta@dishd2h.com", password: "punit.mediratta", name: "Punit Mediratta" },
  { id: "8", email: "dheerendra@panscience.xyz", password: "7007197054", name: "Dheerendra Pandey" },
  { id: "9", email: "susanto@panscience.xyz", password: "susanto@panscience", name: "Susanto" },
  { id: "10", email: "abhishek.gupta@dishd2h.com", password: "abhishek@8588811100", name: "Abhishek Gupta" }
];

// Check if token has expired (7 days)
const isTokenExpired = (): boolean => {
  const tokenTimestamp = localStorage.getItem('ownnote_token_timestamp');
  if (!tokenTimestamp) return true;

  const expiryTimeMs = parseInt(tokenTimestamp) + (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
  return Date.now() > expiryTimeMs;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState<boolean>(localStorage.getItem("ownnote_pro") === "true");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for stored user and token expiration on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem("dashboardUser");
    const accessToken = localStorage.getItem("ownnote_access_token");

    // If there's a stored user but no access token, or the token has expired,
    // clear stale data and redirect to login (prevents 403 on production)
    if (storedUser && (!accessToken || isTokenExpired())) {
      console.log("🔒 Stored user found but access token is missing or expired — clearing session");
      localStorage.removeItem("ownnote_access_token");
      localStorage.removeItem("ownnote_token_timestamp");
      localStorage.removeItem("ownnote_auth_data");
      localStorage.removeItem("dashboardUser");
      localStorage.removeItem("ownnote_pro");
      setUser(null);
      setIsPro(false);
      setIsLoading(false);
      navigate("/login");
      return;
    }

    if (storedUser && accessToken) {
      const parsedUser = JSON.parse(storedUser);
      console.log("🔄 Restoring user from localStorage:", parsedUser.email);
      setUser(parsedUser);
      // Sync pro status immediately on load
      checkProStatus();
    }
    setIsLoading(false);
  }, [navigate]);

  // Handle Pro status sync with server
  const checkProStatus = async () => {
    if (!localStorage.getItem("ownnote_access_token")) return;
    try {
      const res = await getProStatus();
      if (res && res.is_pro !== undefined) {
        const current = localStorage.getItem("ownnote_pro") === "true";
        if (res.is_pro !== current) {
          console.log(`✨ Pro status sync: ${current} -> ${res.is_pro}`);
          localStorage.setItem("ownnote_pro", res.is_pro ? "true" : "false");
          setIsPro(res.is_pro);
          window.dispatchEvent(new Event("ownnote_pro_updated"));
        }
      }
    } catch (e) {
      console.warn("Pro status sync failed", e);
    }
  };

  // Poll pro status every 30 seconds when logged in
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkProStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Listen for local pro updates
  useEffect(() => {
    const handleUpdate = () => {
      setIsPro(localStorage.getItem("ownnote_pro") === "true");
    };
    window.addEventListener("ownnote_pro_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("ownnote_pro_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    const storedUser = localStorage.getItem("dashboardUser");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.email === email) {
        setUser(parsedUser);
        setIsPro(localStorage.getItem("ownnote_pro") === "true");
        setIsLoading(false);
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const foundUser = MOCK_USERS.find(
      (user) => user.email === email && user.password === password
    );

    if (foundUser) {
      const { password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem("dashboardUser", JSON.stringify(userWithoutPassword));
      setIsPro(localStorage.getItem("ownnote_pro") === "true");

      const authData = {
        token: 'mock_token_' + foundUser.id,
        user: userWithoutPassword
      };
      localStorage.setItem('ownnote_auth_data', JSON.stringify(authData));

      if (!localStorage.getItem('ownnote_token_timestamp')) {
        localStorage.setItem('ownnote_token_timestamp', Date.now().toString());
      }
    } else {
      throw new Error("Invalid email or password");
    }

    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setIsPro(false);
    localStorage.removeItem("dashboardUser");
    localStorage.removeItem("ownnote_access_token");
    localStorage.removeItem("ownnote_token_timestamp");
    localStorage.removeItem("ownnote_auth_data");
    localStorage.removeItem("ownnote_pro");
    window.dispatchEvent(new Event("ownnote_pro_updated"));
  };

  return (
    <AuthContext.Provider value={{ user, isPro, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
