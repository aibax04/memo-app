import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, User, Shield } from "lucide-react";
import { loginUser, registerUser } from "@/services/api";

const Register: React.FC = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsSubmitting(true);
        try {
            const reg = await registerUser(email.trim(), password, name.trim());
            if ("error" in reg) {
                toast.error(reg.error);
                return;
            }

            const tok = await loginUser(reg.email, password);
            if (tok.access_token) {
                localStorage.setItem(
                    "dashboardUser",
                    JSON.stringify({
                        id: String(reg.id),
                        email: reg.email,
                        name: reg.name,
                    })
                );
                try {
                    await login(reg.email, password);
                } catch {
                    /* AuthContext may still resolve from dashboardUser */
                }
                toast.success("Account created — welcome to Memo!");
                navigate("/dashboard");
            } else {
                toast.success("Account created. Please sign in.");
                navigate("/login");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Registration failed";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
                <p className="text-slate-600 mt-2">Same secure login as admin-created users</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2 group">
                    <Label htmlFor="name" className="text-sm font-semibold text-slate-700 ml-1 group-focus-within:text-[#1B2BB8] transition-colors">
                        Full name
                    </Label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2BB8] transition-colors z-10" />
                        <Input
                            id="name"
                            type="text"
                            placeholder="Jane Doe"
                            autoComplete="name"
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl pl-12 focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2 group">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-700 ml-1 group-focus-within:text-[#1B2BB8] transition-colors">
                        Email address
                    </Label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2BB8] transition-colors z-10" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@company.com"
                            autoComplete="email"
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl pl-12 focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm"
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
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2BB8] transition-colors z-10" />
                        <Input
                            id="password"
                            type="password"
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl pl-12 focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>
                </div>

                <div className="space-y-2 group">
                    <Label htmlFor="confirm" className="text-sm font-semibold text-slate-700 ml-1 group-focus-within:text-[#1B2BB8] transition-colors">
                        Confirm password
                    </Label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#1B2BB8] transition-colors z-10" />
                        <Input
                            id="confirm"
                            type="password"
                            placeholder="Repeat password"
                            autoComplete="new-password"
                            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl pl-12 focus:ring-2 focus:ring-[#1B2BB8]/20 focus:border-[#1B2BB8] transition-all shadow-sm"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
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
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2" />
                            <span>Creating account…</span>
                        </div>
                    ) : (
                        "Create account"
                    )}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link to="/login" className="font-bold text-[#1B2BB8] hover:text-blue-800 transition-colors">
                    Sign in
                </Link>
            </p>

            <div className="mt-6 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                    to="/admin"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
                >
                    <Shield className="w-3.5 h-3.5" />
                    Admin panel
                </Link>
            </div>
        </div>
    );
};

export default Register;
