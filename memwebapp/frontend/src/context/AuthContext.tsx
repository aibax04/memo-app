import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type User = {
  id: string;
  email: string;
  name: string;
};

type AuthContextType = {
  user: User | null;
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
  const tokenTimestamp = localStorage.getItem('memoapp_token_timestamp');
  if (!tokenTimestamp) return true;
  
  const expiryTimeMs = parseInt(tokenTimestamp) + (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
  return Date.now() > expiryTimeMs;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for stored user and token expiration on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem("dashboardUser");
    const accessToken = localStorage.getItem("memoapp_access_token");
    
    // Check if token has expired
    if (accessToken && isTokenExpired()) {
      console.log("🔒 Token has expired, logging out user");
      localStorage.removeItem("memoapp_access_token");
      localStorage.removeItem("memoapp_token_timestamp");
      localStorage.removeItem("memoapp_auth_data");
      localStorage.removeItem("dashboardUser");
      setUser(null);
      setIsLoading(false);
      navigate("/login");
      return;
    }
    
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      console.log("🔄 Restoring user from localStorage:", parsedUser.email);
      setUser(parsedUser);
    }
    setIsLoading(false);
  }, [navigate]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    // The AuthContext's login function should handle the API call internally.
    // The Login component should only call this `login` method.
    // This block is removed as the API login will be handled below, and
    // the `useEffect` already handles restoring user from localStorage and token expiry.
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const foundUser = MOCK_USERS.find(
      (user) => user.email === email && user.password === password
    );
    
    if (foundUser) {
      console.log("👤 User authenticated via mock users");
      const { password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem("dashboardUser", JSON.stringify(userWithoutPassword));
      
      // Set token timestamp and a dummy access token for mock users
      if (!localStorage.getItem('memoapp_token_timestamp')) {
        localStorage.setItem('memoapp_token_timestamp', Date.now().toString());
        localStorage.setItem('memoapp_access_token', 'mock_access_token_for_api_fallback'); // Dummy token for API calls
        console.log("⏰ Setting token timestamp and dummy access token for 7-day expiry");
      }
    } else {
      console.error("❌ Invalid email or password for mock user");
      throw new Error("Invalid email or password");
    }
    
    setIsLoading(false);
  };

  const logout = () => {
    console.log("👋 Logging out user:", user?.email);
    setUser(null);
    localStorage.removeItem("dashboardUser");
    localStorage.removeItem("memoapp_access_token");
    localStorage.removeItem("memoapp_token_timestamp");
    localStorage.removeItem("memoapp_auth_data");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
