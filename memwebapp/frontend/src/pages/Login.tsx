
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock } from "lucide-react";
import { loginUser } from "@/services/api";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("🔑 Attempting login with:", { email });
      
      // Try API login first
      const apiResult = await loginUser(email, password);
      
      if (apiResult.access_token) {
        console.log("✅ API login successful with token:", apiResult.access_token.substring(0, 10) + "...");
        
        // Store the user in local storage as expected by other parts of the app
        // This avoids the need to use Supabase login at all
        const apiUser = {
          id: email, // Use email as ID for now
          email: email,
          name: email.split('@')[0], // Use part before @ as name
        };
        
        localStorage.setItem("dashboardUser", JSON.stringify(apiUser));
        
        // Still call the login function to update app state, but don't let it throw errors
        try {
          // We're passing email and password but we don't expect this to validate
          // since we've already set the user in localStorage
          await login(email, password);
        } catch (loginErr) {
          console.log("Supabase login attempt failed, but API login successful. Proceeding with API auth.");
        }
        
        toast.success("Login successful!");
        navigate("/");
      } else {
        console.log("API login failed, falling back to Supabase", apiResult.error);
        // Fallback to Supabase login
        await login(email, password);
        toast.success("Login successful!");
        navigate("/");
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      toast.error(error.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full max-w-md">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
          Memo App
        </h1>
        <p className="text-muted-foreground">
          Welcome back! Please sign in to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2" />
              <span>Signing in...</span>
            </div>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
