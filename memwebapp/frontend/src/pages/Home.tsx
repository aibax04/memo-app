import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Mic, Brain, Clock, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Home: React.FC = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0A0C10]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0C10] overflow-x-hidden flex flex-col relative text-white">
            {/* Animated Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-800/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="fixed inset-0 z-1 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            {/* Navigation Bar for Home */}
            <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                        <Mic className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tighter">MEMO</span>
                </div>
                <div className="flex gap-4 items-center">
                    {user ? (
                        <Link to="/dashboard">
                            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-6 h-11 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                Go to Dashboard
                            </Button>
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm font-bold text-slate-300 hover:text-white transition-colors">
                                Sign In
                            </Link>
                            <Link to="/signup">
                                <Button className="bg-white hover:bg-slate-100 text-black font-bold rounded-xl px-6 h-11 transition-all active:scale-95">
                                    Get Started
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 text-center animate-in fade-in zoom-in-95 duration-1000 my-auto pb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8">
                    <Zap className="h-3.5 w-3.5" />
                    <span>The Future of Meetings</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-black tracking-tighter max-w-4xl leading-[1.1] mb-6 drop-shadow-2xl">
                    Capture, Transcribe, and Analyze with <span className="bg-gradient-to-r from-blue-500 to-indigo-400 bg-clip-text text-transparent">AI Intelligence</span>
                </h1>

                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
                    Memo App records your meetings, generates highly accurate transcripts, and extracts actionable intelligence perfectly structured for your CRM.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    {user ? (
                        <Link to="/dashboard" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white h-14 px-8 rounded-2xl font-bold text-lg shadow-[0_0_40px_-10px_rgba(59,130,246,0.6)] transition-all active:scale-95 group">
                                Open Dashboard <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    ) : (
                        <Link to="/signup" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white h-14 px-8 rounded-2xl font-bold text-lg shadow-[0_0_40px_-10px_rgba(59,130,246,0.6)] transition-all active:scale-95 group">
                                Start for Free <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-24">
                    <div className="bg-[#111418]/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 text-left transition-all hover:-translate-y-2 hover:bg-[#161A1F]/80">
                        <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                            <Mic className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Seamless Recording</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Capture high-quality audio directly from your browser or mobile phone without any complex setups.
                        </p>
                    </div>
                    <div className="bg-[#111418]/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 text-left transition-all hover:-translate-y-2 hover:bg-[#161A1F]/80">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 border border-indigo-500/20">
                            <Brain className="h-6 w-6 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">AI Intelligence</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Powered by cutting-edge LLMs to instantly identify action items, sentiments, and key technical details.
                        </p>
                    </div>
                    <div className="bg-[#111418]/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 text-left transition-all hover:-translate-y-2 hover:bg-[#161A1F]/80">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
                            <Clock className="h-6 w-6 text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Save Hours</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Never manually take meeting notes again. Automatically sync structured summaries directly to your CRM.
                        </p>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 py-8 border-t border-white/5 text-center px-4">
                <p className="text-slate-500 text-sm font-medium">
                    &copy; {new Date().getFullYear()} Memo App Intelligence. All rights reserved.
                </p>
            </footer>
        </div>
    );
};

export default Home;
