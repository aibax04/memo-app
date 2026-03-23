import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    decay: number;
    rotation: number;
    rotationSpeed: number;
    type: 'confetti' | 'sparkle' | 'ring' | 'star';
    life: number;
    maxLife: number;
    gravity: number;
}

const GOLD_PALETTE = [
    '#FFD700', '#FFC107', '#FFB300', '#FFA000',
    '#FF8F00', '#FFCA28', '#FFE082', '#FFF8E1',
    '#F59E0B', '#D97706', '#B45309',
];

const ACCENT_PALETTE = [
    '#818CF8', '#6366F1', '#4F46E5', // Indigo
    '#A78BFA', '#8B5CF6',             // Violet
    '#F472B6', '#EC4899',             // Pink
    '#34D399', '#10B981',             // Emerald
    '#FFFFFF',                         // White
];

const ALL_COLORS = [...GOLD_PALETTE, ...ACCENT_PALETTE];

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

interface ProCelebrationProps {
    show: boolean;
    onComplete?: () => void;
    duration?: number;
}

const ProCelebration: React.FC<ProCelebrationProps> = ({
    show,
    onComplete,
    duration = 5000,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animFrameRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const [visible, setVisible] = useState(false);
    const [showBadge, setShowBadge] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    const createBurst = useCallback((cx: number, cy: number, count: number) => {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const speed = 2 + Math.random() * 6;
            const type: Particle['type'] = randomFrom(['confetti', 'sparkle', 'star', 'ring']);
            const maxLife = 80 + Math.random() * 80;
            particlesRef.current.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                size: type === 'confetti' ? 6 + Math.random() * 8 : 3 + Math.random() * 5,
                color: randomFrom(ALL_COLORS),
                alpha: 1,
                decay: 1 / maxLife,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.15,
                type,
                life: 0,
                maxLife,
                gravity: type === 'confetti' ? 0.06 : 0.02,
            });
        }
    }, []);

    const createRain = useCallback((w: number, count: number) => {
        for (let i = 0; i < count; i++) {
            const maxLife = 100 + Math.random() * 100;
            particlesRef.current.push({
                x: Math.random() * w,
                y: -10 - Math.random() * 40,
                vx: (Math.random() - 0.5) * 2,
                vy: 2 + Math.random() * 4,
                size: 5 + Math.random() * 7,
                color: randomFrom(ALL_COLORS),
                alpha: 0.9 + Math.random() * 0.1,
                decay: 1 / maxLife,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                type: 'confetti',
                life: 0,
                maxLife,
                gravity: 0.05 + Math.random() * 0.04,
            });
        }
    }, []);

    const createSparkleField = useCallback((w: number, h: number, count: number) => {
        for (let i = 0; i < count; i++) {
            const maxLife = 40 + Math.random() * 60;
            particlesRef.current.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5 - 0.5,
                size: 2 + Math.random() * 4,
                color: randomFrom(GOLD_PALETTE),
                alpha: 0,
                decay: 0,
                rotation: 0,
                rotationSpeed: 0,
                type: 'sparkle',
                life: 0,
                maxLife,
                gravity: 0,
            });
        }
    }, []);

    const drawParticle = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;

        switch (p.type) {
            case 'confetti': {
                const scaleX = Math.cos(p.life * 0.1) * 0.6 + 0.4;
                ctx.scale(scaleX, 1);
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                if (typeof ctx.roundRect === 'function') {
                    ctx.roundRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6, 2);
                } else {
                    ctx.rect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
                }
                ctx.fill();
                break;
            }
            case 'sparkle': {
                // Glowing 4-point sparkle
                const progress = p.life / p.maxLife;
                const pulse = Math.sin(progress * Math.PI);
                const s = p.size * pulse;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 12;
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const a = (Math.PI / 2) * i;
                    ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
                    ctx.lineTo(
                        Math.cos(a + Math.PI / 4) * s * 0.3,
                        Math.sin(a + Math.PI / 4) * s * 0.3
                    );
                }
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'star': {
                // 5-point star
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    const innerAngle = outerAngle + Math.PI / 5;
                    ctx.lineTo(Math.cos(outerAngle) * p.size, Math.sin(outerAngle) * p.size);
                    ctx.lineTo(
                        Math.cos(innerAngle) * p.size * 0.4,
                        Math.sin(innerAngle) * p.size * 0.4
                    );
                }
                ctx.closePath();
                ctx.fill();
                break;
            }
            case 'ring': {
                // Expanding ring
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, p.size * (1 + p.life * 0.05), 0, Math.PI * 2);
                ctx.stroke();
                break;
            }
        }
        ctx.restore();
    }, []);

    useEffect(() => {
        if (!show) return;
        setVisible(true);
        setShowBadge(false);
        setFadeOut(false);
        particlesRef.current = [];
        startTimeRef.current = performance.now();

        // Guaranteed auto-dismiss: even if canvas errors, never stay visible forever
        const safetyTimer = setTimeout(() => {
            setFadeOut(true);
            setTimeout(() => { setVisible(false); setShowBadge(false); onComplete?.(); }, 600);
        }, duration + 2000);

        const canvas = canvasRef.current;
        if (!canvas) { clearTimeout(safetyTimer); return; }
        const ctx = canvas.getContext('2d');
        if (!ctx) { clearTimeout(safetyTimer); return; }

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const w = canvas.width;
        const h = canvas.height;

        // Initial massive center burst
        createBurst(w / 2, h / 2, 120);
        // Corner bursts
        createBurst(w * 0.15, h * 0.2, 40);
        createBurst(w * 0.85, h * 0.2, 40);
        createBurst(w * 0.15, h * 0.8, 30);
        createBurst(w * 0.85, h * 0.8, 30);
        // Sparkles
        createSparkleField(w, h, 50);

        // Show badge after initial burst settles
        setTimeout(() => setShowBadge(true), 400);

        let lastRain = 0;

        const animate = (now: number) => {
            try {
                const elapsed = now - startTimeRef.current;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (elapsed < 3000 && now - lastRain > 60) {
                    createRain(canvas.width, 8);
                    lastRain = now;
                }

                if (Math.abs(elapsed - 800) < 20) {
                    createBurst(w * 0.3, h * 0.4, 50);
                    createBurst(w * 0.7, h * 0.4, 50);
                }
                if (Math.abs(elapsed - 1500) < 20) {
                    createBurst(w / 2, h * 0.3, 60);
                    createSparkleField(w, h, 30);
                }
                if (Math.abs(elapsed - 2200) < 20) {
                    createBurst(w * 0.4, h * 0.5, 30);
                    createBurst(w * 0.6, h * 0.5, 30);
                }

                if (elapsed < 3500) {
                    const glowAlpha = Math.min(1, elapsed / 500) * Math.max(0, 1 - (elapsed - 2500) / 1000);
                    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.5);
                    gradient.addColorStop(0, `rgba(255, 215, 0, ${0.12 * glowAlpha})`);
                    gradient.addColorStop(0.5, `rgba(245, 158, 11, ${0.06 * glowAlpha})`);
                    gradient.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                particlesRef.current = particlesRef.current.filter((p) => {
                    p.life++;
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += p.gravity;
                    p.vx *= 0.99;
                    p.rotation += p.rotationSpeed;

                    if (p.type === 'sparkle') {
                        const progress = p.life / p.maxLife;
                        p.alpha = Math.sin(progress * Math.PI);
                    } else {
                        const lifeRatio = p.life / p.maxLife;
                        p.alpha = lifeRatio > 0.7 ? lerp(1, 0, (lifeRatio - 0.7) / 0.3) : 1;
                    }

                    if (p.life >= p.maxLife || p.alpha <= 0.01) return false;
                    if (p.y > canvas.height + 50) return false;

                    drawParticle(ctx, p);
                    return true;
                });

                if (elapsed >= duration) {
                    setFadeOut(true);
                    setTimeout(() => {
                        setVisible(false);
                        setShowBadge(false);
                        onComplete?.();
                    }, 600);
                    return;
                }

                if (elapsed >= duration - 800) {
                    setFadeOut(true);
                }

                animFrameRef.current = requestAnimationFrame(animate);
            } catch (e) {
                console.warn('ProCelebration animation error', e);
                setFadeOut(true);
                setTimeout(() => { setVisible(false); setShowBadge(false); onComplete?.(); }, 300);
            }
        };

        animFrameRef.current = requestAnimationFrame(animate);

        return () => {
            clearTimeout(safetyTimer);
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [show, duration, createBurst, createRain, createSparkleField, drawParticle, onComplete]);

    if (!visible) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] pointer-events-none transition-opacity duration-600 ${fadeOut ? 'opacity-0' : 'opacity-100'
                }`}
        >
            {/* Canvas for particles */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {/* Center badge */}
            {showBadge && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className={`
              flex flex-col items-center gap-3
              animate-in zoom-in-50 fade-in duration-700
              ${fadeOut ? 'animate-out zoom-out-50 fade-out duration-500' : ''}
            `}
                    >
                        {/* Glowing orb behind badge */}
                        <div className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-amber-400/30 via-yellow-300/20 to-orange-500/10 blur-3xl animate-pulse" />

                        {/* Main badge */}
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-500 rounded-3xl blur-lg opacity-70 animate-pulse" />
                            <div className="relative bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-600 rounded-3xl px-10 py-6 shadow-2xl shadow-amber-500/50">
                                <div className="flex items-center gap-3">
                                    {/* Crown / Zap icon */}
                                    <svg
                                        className="w-10 h-10 text-white drop-shadow-lg"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                                    </svg>
                                    <div className="flex flex-col">
                                        <span className="text-white/80 text-xs font-black uppercase tracking-[0.25em]">
                                            Welcome to
                                        </span>
                                        <span className="text-white text-3xl font-black uppercase tracking-tight italic leading-none">
                                            PRO
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subtitle */}
                        <p className="text-amber-300/90 text-sm font-bold tracking-wider uppercase mt-2 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]">
                            ✦ Premium Features Unlocked ✦
                        </p>
                    </div>
                </div>
            )}

            {/* Screen flash on first burst */}
            <div className="absolute inset-0 bg-amber-200/20 animate-[flash_0.6s_ease-out_forwards]" />

            <style>{`
        @keyframes flash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }
      `}</style>
        </div>
    );
};

export default ProCelebration;
