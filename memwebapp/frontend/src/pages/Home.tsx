import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
    Mic, Brain, Clock, Zap, ArrowRight, CheckCircle,
    Smartphone, Database, ShieldCheck, Layers,
    Users, BarChart3, MessageSquareText,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const Home: React.FC = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F3F3F3]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1B2BB8]"></div>
            </div>
        );
    }

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 }
    };

    return (
        <div className="min-h-screen bg-[#F3F3F3] overflow-x-hidden flex flex-col relative text-slate-900 selection:bg-[#1B2BB8] selection:text-white">
            {/* Animated Background Elements */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#1B2BB8]/10 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full bg-[#1B2BB8]/5 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Grid Pattern Overlay */}
            <div className="fixed inset-0 z-1 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            {/* Navigation Bar */}
            <header className="relative z-50 w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center bg-transparent backdrop-blur-sm sticky top-0">
                <div className="flex items-center gap-3">
                    <img
                        src="/lovable-uploads/image.png"
                        alt="Memo App Logo"
                        className="h-16 w-auto object-contain drop-shadow-sm"
                    />
                </div>

                <nav className="hidden md:flex gap-8 items-center mr-auto ml-16">
                    <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-[#1B2BB8] transition-colors uppercase tracking-wider">How it Works</a>
                    <a href="#features" className="text-sm font-medium text-slate-600 hover:text-[#1B2BB8] transition-colors uppercase tracking-wider">Features</a>
                    <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-[#1B2BB8] transition-colors uppercase tracking-wider">FAQ</a>
                </nav>

                <div className="flex gap-4 items-center">
                    {user ? (
                        <Link to="/dashboard">
                            <Button className="bg-[#1B2BB8] hover:bg-blue-800 text-white font-bold rounded-xl px-6 h-11 transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                Go to Dashboard
                            </Button>
                        </Link>
                    ) : (
                        <>
                            <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-[#1B2BB8] transition-colors">
                                Sign In
                            </Link>
                            <Link to="/signup">
                                <Button className="bg-white border border-slate-200 hover:bg-slate-50 text-black font-bold rounded-xl px-6 h-11 transition-all active:scale-95 shadow-sm">
                                    Get Started
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative z-10 pt-20 pb-24 md:pt-32 md:pb-40 px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 border border-[#1B2BB8]/20 text-[#1B2BB8] text-xs font-bold uppercase tracking-widest mb-8">
                        <Zap className="h-3.5 w-3.5" />
                        <span>The Future of Professional Meetings</span>
                    </div>

                    <h1 className="text-5xl md:text-8xl font-medium tracking-tight leading-[1] mb-10 drop-shadow-sm text-black">
                        Capture Intelligence <br />
                        <span className="text-[#1B2BB8] font-['Caveat_Brush'] inline-block transform scale-[1.35] origin-center mt-3">Automatically.</span>
                    </h1>

                    <p className="text-lg md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
                        Memo App transforms your conversation audio into structured, actionable intelligence. Perfect for sales teams, researchers, and project managers.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <Link to="/signup" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto bg-[#1B2BB8] hover:bg-blue-800 text-white h-16 px-10 rounded-2xl font-bold text-xl shadow-[0_4px_14px_0_rgba(27,43,184,0.39)] transition-all active:scale-95">
                                Try for Free
                            </Button>
                        </Link>
                        <a href="https://makememo.ai/" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                            <Button className="w-full sm:w-auto h-16 px-10 rounded-2xl font-bold text-xl bg-white border-2 border-[#1B2BB8] text-[#1B2BB8] hover:bg-blue-50 transition-all active:scale-95 shadow-lg group flex items-center justify-center">
                                <ArrowRight className="mr-2 h-6 w-6 transition-transform group-hover:translate-x-1" /> Know More
                            </Button>
                        </a>
                    </div>
                </motion.div>

                {/* Dashboard Preview Mockup */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 100 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="max-w-6xl mx-auto mt-24 relative"
                >
                    <div className="rounded-[2.5rem] bg-white p-4 shadow-2xl border border-slate-200 overflow-hidden relative">
                        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                                <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                                <div className="h-3 w-3 rounded-full bg-emerald-400"></div>
                            </div>
                            <div className="mx-auto bg-white border border-slate-200 text-[10px] text-slate-400 px-4 py-1 rounded-full w-1/3 text-center">
                                dash.makememo.ai/meetings
                            </div>
                        </div>
                        <img
                            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop"
                            alt="Dashboard Preview"
                            className="w-full h-auto object-cover opacity-90 brightness-110"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                    </div>
                    {/* Floating Badges */}
                    <div className="absolute -top-6 -right-6 h-24 w-24 bg-[#1B2BB8] rounded-3xl flex items-center justify-center text-white shadow-xl rotate-12 hidden md:flex">
                        <BarChart3 className="h-10 w-10" />
                    </div>
                    <div className="absolute top-1/2 -left-12 h-20 w-48 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 px-4 shadow-xl -rotate-6 hidden lg:flex">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Status</span>
                            <span className="text-sm font-bold">Synced to CRM</span>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="relative z-10 py-32 px-6 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6">Simple, Powerful <br /><span className="text-[#1B2BB8] font-['Caveat_Brush'] inline-block transform scale-[1.25] origin-center mt-2">Workflow</span></h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">From raw audio to structured intelligence in three easy steps.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-[2px] bg-slate-100/50 dashed border-t border-dashed border-slate-200 z-0"></div>

                        <motion.div {...fadeInUp} className="flex flex-col items-center text-center relative z-10">
                            <div className="h-24 w-24 rounded-[2rem] bg-blue-50 border-4 border-white shadow-xl flex items-center justify-center mb-8 relative">
                                <Mic className="h-10 w-10 text-[#1B2BB8]" />
                                <div className="absolute -top-2 -right-2 h-8 w-8 bg-[#1B2BB8] text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 tracking-tighter">Record</h3>
                            <p className="text-slate-500 leading-relaxed">Capture any conversation using our browser interface or mobile app. High-fidelity audio recording built-in.</p>
                        </motion.div>

                        <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="flex flex-col items-center text-center relative z-10">
                            <div className="h-24 w-24 rounded-[2rem] bg-indigo-50 border-4 border-white shadow-xl flex items-center justify-center mb-8 relative">
                                <Brain className="h-10 w-10 text-[#1B2BB8]" />
                                <div className="absolute -top-2 -right-2 h-8 w-8 bg-[#1B2BB8] text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 tracking-tighter">Intelligence</h3>
                            <p className="text-slate-500 leading-relaxed">Our AI models transcribe and analyze for action items, sentiment, and technical details automatically.</p>
                        </motion.div>

                        <motion.div {...fadeInUp} transition={{ delay: 0.4 }} className="flex flex-col items-center text-center relative z-10">
                            <div className="h-24 w-24 rounded-[2rem] bg-emerald-50 border-4 border-white shadow-xl flex items-center justify-center mb-8 relative">
                                <Database className="h-10 w-10 text-[#1B2BB8]" />
                                <div className="absolute -top-2 -right-2 h-8 w-8 bg-[#1B2BB8] text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 tracking-tighter">Sync</h3>
                            <p className="text-slate-500 leading-relaxed">Export structured data or sync directly to your CRM with our custom templates for every use-case.</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative z-10 py-32 px-6 bg-[#F3F3F3]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
                        <div className="max-w-xl">
                            <h2 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 leading-tight">Packed with <br /><span className="text-[#1B2BB8] font-['Caveat_Brush'] inline-block transform scale-[1.25] origin-left mt-1">Enterprise Power.</span></h2>
                            <p className="text-lg text-slate-500 font-medium">Everything you need to turn voices into value, without the manual effort.</p>
                        </div>
                        <Link to="/signup">
                            <Button variant="outline" className="h-14 px-8 border-slate-300 hover:bg-white rounded-xl font-bold bg-white/50 backdrop-blur-sm">Explore All Features</Button>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Smartphone className="h-7 w-7" />,
                                title: "Mobile Ready",
                                desc: "Record anywhere. Our mobile-optimized web app ensures you never miss a field visit or hallway chat."
                            },
                            {
                                icon: <Layers className="h-7 w-7" />,
                                title: "Custom Templates",
                                desc: "Structure insights for specifically what YOU care about—Technical, Sales, or Client Success."
                            },
                            {
                                icon: <MessageSquareText className="h-7 w-7" />,
                                title: "Technical Insights",
                                desc: "Extract specific technical keywords, platform needs, and requirements from messy conversations."
                            },
                            {
                                icon: <Zap className="h-7 w-7" />,
                                title: "Instant Analysis",
                                desc: "No waiting hours. Most transcripts and AI summaries are ready in less than 90 seconds."
                            },
                            {
                                icon: <ShieldCheck className="h-7 w-7" />,
                                title: "Secure & Private",
                                desc: "Your data is encrypted. We never train public models on your private professional meetings."
                            },
                            {
                                icon: <Users className="h-7 w-7" />,
                                title: "Team Collaboration",
                                desc: "Share meeting keys with team members and collaborate on transcripts and action items."
                            }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                {...fadeInUp}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all hover:-translate-y-2 hover:shadow-xl group"
                            >
                                <div className="h-16 w-16 rounded-2xl bg-[#F3F3F3] border border-slate-100 flex items-center justify-center mb-8 group-hover:bg-[#1B2BB8] group-hover:text-white transition-all duration-300">
                                    <span className="text-[#1B2BB8] group-hover:text-white transition-colors">{feature.icon}</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-4 tracking-tighter">{feature.title}</h3>
                                <p className="text-slate-500 leading-relaxed text-sm md:text-base">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="relative z-10 py-32 px-6 bg-white">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">Questions? <br /><span className="text-[#1B2BB8] font-['Caveat_Brush'] inline-block transform scale-[1.3] origin-center mt-2">Answers.</span></h2>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-b-2 border-slate-100 py-4">
                            <AccordionTrigger className="text-xl font-bold tracking-tighter hover:no-underline hover:text-[#1B2BB8]">How accurate is the transcription?</AccordionTrigger>
                            <AccordionContent className="text-slate-500 text-lg pt-4 leading-relaxed">
                                Extremely. We use the latest Whisper models enhanced with professional terminology libraries, achieving over 98% accuracy in quiet environments.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2" className="border-b-2 border-slate-100 py-4">
                            <AccordionTrigger className="text-xl font-bold tracking-tighter hover:no-underline hover:text-[#1B2BB8]">Which languages do you support?</AccordionTrigger>
                            <AccordionContent className="text-slate-500 text-lg pt-4 leading-relaxed">
                                We currently support 40+ languages with automatic language detection, so you don't even need to tell the app which language is being spoken.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3" className="border-b-2 border-slate-100 py-4">
                            <AccordionTrigger className="text-xl font-bold tracking-tighter hover:no-underline hover:text-[#1B2BB8]">Can I export the data for my CRM?</AccordionTrigger>
                            <AccordionContent className="text-slate-500 text-lg pt-4 leading-relaxed">
                                Yes. You can copy the AI-generated structured data directly or use one of our templates designed for Salesforce, HubSpot, and Pipedrive.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4" className="border-b-2 border-slate-100 py-4">
                            <AccordionTrigger className="text-xl font-bold tracking-tighter hover:no-underline hover:text-[#1B2BB8]">Is my data used for AI training?</AccordionTrigger>
                            <AccordionContent className="text-slate-500 text-lg pt-4 leading-relaxed">
                                No. We use API calls with zero data retention for training. Your meetings remain private and yours alone.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="relative z-10 pt-28 pb-24 px-6 md:pt-44 md:pb-40 scroll-mt-24" id="cta">
                <div className="max-w-6xl mx-auto bg-[#1B2BB8] rounded-[3rem] p-12 md:p-24 text-center overflow-hidden relative">
                    {/* Background decorations */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[80px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 blur-[80px]"></div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        viewport={{ once: true }}
                        className="relative z-10"
                    >
                        <h2 className="text-4xl md:text-7xl font-bold text-white tracking-tighter mb-12 leading-[1.1]">
                            Ready to stop taking notes and <br />
                            <span className="text-blue-200 font-['Caveat_Brush'] inline-block transform scale-[1.2] origin-center mt-4">start taking action?</span>
                        </h2>
                        <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto font-medium">
                            Join 5,000+ professionals using Memo Intelligence to stay focused on the client, not the notepad.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link to="/signup" className="w-full sm:w-auto">
                                <Button className="w-full sm:w-auto bg-white text-[#1B2BB8] hover:bg-blue-50 h-16 px-12 rounded-2xl font-bold text-xl transition-all shadow-xl active:scale-95 shadow-blue-900/40">
                                    Get Started Free
                                </Button>
                            </Link>
                            <Link to="/login" className="w-full sm:w-auto">
                                <Button className="w-full sm:w-auto h-16 px-12 rounded-2xl font-bold text-xl border-2 border-white/30 text-white bg-white/5 hover:bg-white/10 transition-all active:scale-95">
                                    Sign In
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

        </div>
    );
};

export default Home;

