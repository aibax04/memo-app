
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

      const apiResult = await loginUser(email, password);

      if (apiResult.access_token) {
        console.log("✅ API login successful");

        const apiUser = {
          id: email,
          email: email,
          name: email.split('@')[0],
        };

        localStorage.setItem("dashboardUser", JSON.stringify(apiUser));

        try {
          await login(email, password);
        } catch (loginErr) {
          console.log("Supabase login fallback check");
        }

        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        await login(email, password);
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      toast.error(error.message || "Invalid credentials");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
        <p className="text-slate-600 mt-2">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2 group">
          <Label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1 group-focus-within:text-[#1B2BB8] transition-colors">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2BB8] transition-colors z-10" />
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl pl-12 focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <div className="flex justify-between items-center ml-1">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700 group-focus-within:text-[#1B2BB8] transition-colors">
              Password
            </Label>
            <Link to="/forgot-password" className="text-xs text-[#1B2BB8] hover:text-blue-800 transition-colors">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2BB8] transition-colors z-10" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl pl-12 focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-[#1B2BB8] hover:bg-blue-800 text-white font-bold rounded-xl shadow-[0_4px_14px_0_rgba(27,43,184,0.39)] transition-all active:scale-[0.98] mt-4"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
              <span>Verifying...</span>
            </div>
          ) : (
            "Secure Sign In"
          )}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-slate-600 text-sm">
          New to Memo App?{" "}
          <Link to="/signup" className="text-[#1B2BB8] font-bold hover:text-blue-800 hover:underline transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
