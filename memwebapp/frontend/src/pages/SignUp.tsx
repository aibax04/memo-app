
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createUser } from "@/services/api";

const SignUp: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("👤 Creating new user:", { name, email });

      const result = await createUser(email, password, name);

      if (result.error) {
        throw new Error(result.error);
      }

      console.log("✅ User created successfully:", result);
      toast.success("Account created! Please sign in.");
      navigate("/login");
    } catch (error: any) {
      console.error("❌ Error creating account:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Join Memo App</h1>
        <p className="text-slate-600 mt-2">Start capturing your meetings smarter</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2 group">
          <Label htmlFor="name" className="text-sm font-semibold text-slate-700 ml-1 group-focus-within:text-[#1B2BB8] transition-colors">
            Full Name
          </Label>
          <div className="relative">
            <Input
              id="name"
              placeholder="Elon Musk"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <Label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1 group-focus-within:text-[#1B2BB8] transition-colors">
            Email Address
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2 group">
          <Label htmlFor="password" className="text-sm font-semibold text-slate-700 ml-1 group-focus-within:text-[#1B2BB8] transition-colors">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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
              <span>Preparing your account...</span>
            </div>
          ) : (
            "Create Free Account"
          )}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-slate-600 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-[#1B2BB8] font-bold hover:text-blue-800 hover:underline transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200">
        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          By signing up, you agree to our <span className="text-[#1B2BB8] font-medium cursor-pointer hover:underline">Terms of Service</span> and <span className="text-[#1B2BB8] font-medium cursor-pointer hover:underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

export default SignUp;
