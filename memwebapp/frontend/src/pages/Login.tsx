
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight } from "lucide-react";
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
          console.log("Supabase login optional.");
        }

        toast.success("Welcome back!", {
          style: { background: '#10b981', color: '#fff', border: 'none' }
        });
        navigate("/");
      } else {
        await login(email, password);
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      toast.error(error.message || "Login failed", {
        style: { background: '#ef4444', color: '#fff', border: 'none' }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-8 w-full">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Sign In</h1>
        <p className="text-slate-400 text-sm">Enter your credentials to access your meetings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
            Email Address
          </Label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 bg-[#0D1117] border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
              Password
            </Label>
            <Link to="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 bg-[#0D1117] border-slate-800 text-white placeholder:text-slate-600 rounded-xl focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] group"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3" />
              <span>Checking...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span>Sign In</span>
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-800"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#161B22] px-3 text-slate-500 font-medium">New to Memo?</span>
        </div>
      </div>

      <div className="text-center">
        <Link
          to="/signup"
          className="inline-flex items-center justify-center px-6 py-3 w-full border border-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-white/5 hover:text-white transition-all active:scale-[0.98]"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
};

export default Login;
