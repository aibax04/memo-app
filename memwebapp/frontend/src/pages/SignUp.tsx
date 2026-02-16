import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

const SignUp: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await signUp(email, password);
      toast.success("Account created successfully!");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Sign up failed", {
        style: { background: '#ef4444', color: '#fff', border: 'none' }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-8 w-full">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        <p className="text-slate-400 text-sm">Join Memo App to started capturing your meetings</p>
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
          <Label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
            Create Password
          </Label>
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
          <p className="text-[10px] text-slate-500 mt-1 ml-1 font-medium">Password must be at least 6 characters</p>
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] group"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3" />
              <span>Creating...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span>Sign Up</span>
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-bold underline underline-offset-4">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
