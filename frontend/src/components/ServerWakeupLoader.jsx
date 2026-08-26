import React, { useState, useEffect } from "react";
import { TrendingUp, Server, Loader2, Sparkles, Clock } from "lucide-react";

/**
 * ServerWakeupLoader
 * Polished, high-end loading component designed for cloud spin-downs / cold starts (Render free tier).
 * Automatically detects if a request exceeds the threshold (default: 2.5s) and displays
 * an informative, non-alarming status message with an active time counter and progress animation.
 *
 * @param {string} title - Primary loading message
 * @param {string} subtitle - Secondary description
 * @param {number} delayThreshold - Milliseconds before showing server wake-up notice (default: 2500)
 * @param {boolean} fullScreen - Whether to take full viewport (default: true)
 */
export function ServerWakeupLoader({
    title = "טוען נתונים...",
    subtitle = "מאמת נתונים מול השרת",
    delayThreshold = 2500,
    fullScreen = true,
}) {
    const [isDelayed, setIsDelayed] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        const delayTimer = setTimeout(() => {
            setIsDelayed(true);
        }, delayThreshold);

        return () => clearTimeout(delayTimer);
    }, [delayThreshold]);

    useEffect(() => {
        let interval;
        if (isDelayed) {
            interval = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isDelayed]);

    const containerClasses = fullScreen
        ? "fixed inset-0 z-50 min-h-screen w-screen bg-gradient-to-br from-zinc-950 via-[#0c0d12] to-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30 selection:text-emerald-400"
        : "w-full min-h-[350px] py-12 flex flex-col items-center justify-center text-zinc-100 p-4";

    return (
        <div className={containerClasses} dir="rtl">
            {/* Ambient Background Glow */}
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />

            <div className="w-full max-w-md mx-auto flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                {/* Brand Logo & Glowing Spinner Ring */}
                <div className="relative flex items-center justify-center">
                    {/* Concentric Rotating Gradient Ring */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent p-[1px] animate-spin duration-[4000ms]">
                        <div className="w-full h-full bg-zinc-950/80 rounded-3xl backdrop-blur-xl" />
                    </div>

                    {/* Central Icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                            <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 animate-pulse" />
                        </div>
                    </div>

                    {/* Orbiting Sparkle */}
                    <div className="absolute -top-1 -right-1 p-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-full text-emerald-300 animate-bounce">
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                </div>

                {/* Brand Title */}
                <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        Tomer<span className="text-emerald-400">Vest</span>
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-zinc-400">{title}</p>
                </div>

                {/* Dynamic Server Wake-up Notice (Appears after 2.5s) */}
                {isDelayed ? (
                    <div className="w-full bg-[#121214]/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl text-right space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-500">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0 mt-0.5">
                                <Server className="w-5 h-5 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                                        <span>השרת מתעורר לפעולה</span>
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                    </h4>
                                    <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400/90 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30" dir="ltr">
                                        <Clock className="w-3 h-3" />
                                        <span>{elapsedSeconds + 3}s</span>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                                    שרת הענן מתעורר ממצב שינה (Cold Start) ומחיל עדכונים. תהליך זה אורך בדרך כלל 15-30 שניות בפעם הראשונה.
                                </p>
                            </div>
                        </div>

                        {/* Animated Shimmer Loading Bar */}
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
                            <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-full animate-pulse w-full" />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        <span>{subtitle}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ServerWakeupLoader;
