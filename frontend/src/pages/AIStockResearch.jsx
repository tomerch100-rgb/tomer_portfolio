import React, { useState, useCallback } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
    Sparkles,
    Search,
    TrendingUp,
    TrendingDown,
    ShieldAlert,
    CheckCircle2,
    Radar,
    BarChart3,
    Activity,
    DollarSign,
    Layers,
    Loader2,
    RefreshCw,
    Languages,
    ArrowUpRight,
    AlertCircle,
    BookmarkPlus,
    ExternalLink,
    Zap,
    Cpu,
    LineChart,
    PieChart,
    Compass
} from "lucide-react";
import { fetchAIStockResearch, fetchStockDetails } from "../services/aiResearchService";

const POPULAR_TICKERS = ["NVDA", "AAPL", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "AMD"];

export default function AIStockResearch() {
    const { ticker: paramTicker } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    // Do NOT default to auto-analyzing NVDA. Initialize ticker from URL if present or empty string.
    const urlTicker = (paramTicker || searchParams.get("ticker") || "").toUpperCase();
    const [inputTicker, setInputTicker] = useState(urlTicker);
    const [activeTicker, setActiveTicker] = useState("");
    const [language, setLanguage] = useState("he"); // 'he' | 'en'

    // Initial state is strictly idle and not loading
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [report, setReport] = useState(null);
    const [stockDetails, setStockDetails] = useState(null);

    const loadResearch = useCallback(async (symbolToFetch, langToUse) => {
        if (!symbolToFetch || !symbolToFetch.trim()) return;
        const cleanSymbol = symbolToFetch.trim().toUpperCase();
        setIsLoading(true);
        setError(null);

        try {
            // Concurrently fetch AI report and fundamental market details
            const [aiData, fundamentalData] = await Promise.allSettled([
                fetchAIStockResearch(cleanSymbol, langToUse),
                fetchStockDetails(cleanSymbol)
            ]);

            if (aiData.status === "fulfilled") {
                setReport(aiData.value);
            } else {
                throw aiData.reason || new Error("שגיאה בהפקת דוח ה-AI מהשרת.");
            }

            if (fundamentalData.status === "fulfilled" && !fundamentalData.value?.error) {
                setStockDetails(fundamentalData.value);
            } else {
                setStockDetails(null);
            }

            setActiveTicker(cleanSymbol);
        } catch (err) {
            console.error("AI Research Error:", err);
            const msg =
                err.response?.data?.detail ||
                err.message ||
                "לא הצלחנו להפיק דוח מחקר AI עבור מניה זו. אנא נסה שנית.";
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Explicit User Trigger Handlers
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!inputTicker.trim()) return;
        const clean = inputTicker.trim().toUpperCase();
        setSearchParams({ ticker: clean });
        loadResearch(clean, language);
    };

    const handleQuickSelect = (ticker) => {
        setInputTicker(ticker);
        setSearchParams({ ticker });
        loadResearch(ticker, language);
    };

    const handleLanguageToggle = (newLang) => {
        if (newLang === language) return;
        setLanguage(newLang);
        if (activeTicker) {
            loadResearch(activeTicker, newLang);
        }
    };

    // Score Color Helper
    const getScoreColor = (val) => {
        const num = Number(val) || 0;
        if (num >= 75) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
        if (num >= 50) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
        return "text-rose-400 border-rose-500/40 bg-rose-500/10";
    };

    const getScoreBarColor = (val) => {
        const num = Number(val) || 0;
        if (num >= 75) return "bg-gradient-to-r from-emerald-500 to-teal-400";
        if (num >= 50) return "bg-gradient-to-r from-amber-500 to-yellow-400";
        return "bg-gradient-to-r from-rose-500 to-red-400";
    };

    // Recommendation Styling Helper
    const getRecBadge = (rec) => {
        const upper = (rec || "HOLD").toUpperCase();
        if (upper.includes("BUY")) {
            return {
                label: language === "he" ? "המלצת קנייה (BUY)" : "BUY RECOMMENDATION",
                bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]",
                icon: TrendingUp
            };
        }
        if (upper.includes("SELL")) {
            return {
                label: language === "he" ? "המלצת מכירה (SELL)" : "SELL RECOMMENDATION",
                bg: "bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.25)]",
                icon: TrendingDown
            };
        }
        return {
            label: language === "he" ? "המלצת החזקה (HOLD)" : "HOLD RECOMMENDATION",
            bg: "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]",
            icon: Activity
        };
    };

    const formatCurrency = (val) => {
        const num = Number(val);
        if (isNaN(num)) return "$0.00";
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 w-full space-y-6 md:space-y-8" dir="rtl">
                
                {/* Header Title & Intro */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-emerald-400/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shadow-lg shadow-emerald-950/30">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                מרכז מחקר מניות בבינה מלאכותית <span className="text-emerald-400 font-mono">AI</span>
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-400">
                            ניתוח פונדמנטלי מעמיק, ציוני צמיחה ותמחור, תרחישי שור/דב וזרזים מרכזיים באמצעות מודלי שפה מתקדמים.
                        </p>
                    </div>

                    {/* Language Switcher */}
                    <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1 rounded-2xl self-start md:self-auto shadow-inner">
                        <button
                            type="button"
                            onClick={() => handleLanguageToggle("he")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                                language === "he"
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                                    : "text-zinc-400 hover:text-white"
                            }`}
                        >
                            עברית 🇮🇱
                        </button>
                        <button
                            type="button"
                            onClick={() => handleLanguageToggle("en")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                                language === "en"
                                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                                    : "text-zinc-400 hover:text-white"
                            }`}
                        >
                            English 🇺🇸
                        </button>
                    </div>
                </div>

                {/* Search Bar & Quick Ticker Pills */}
                <div className="bg-[#121214] border border-zinc-800/90 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-500">
                                <Search className="w-5 h-5" />
                            </span>
                            <input
                                type="text"
                                value={inputTicker}
                                onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
                                placeholder="הזן סימול מניה (למשל: NVDA, AAPL, TSLA)..."
                                className="w-full pl-4 pr-12 py-3.5 bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl text-zinc-100 placeholder-zinc-500 text-sm sm:text-base font-mono font-bold tracking-wide uppercase transition-all duration-200"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !inputTicker.trim()}
                            className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-950/30 border border-emerald-400/30 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>מנתח מניה...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    <span>נתח מניה עם AI ⚡</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Popular Tickers Fast Selection */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-xs font-semibold text-zinc-400">חיפוש מהיר:</span>
                        {POPULAR_TICKERS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => handleQuickSelect(t)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all duration-200 cursor-pointer ${
                                    activeTicker === t
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80"
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-rose-950/30 border border-rose-900/60 rounded-3xl p-5 flex items-start gap-3.5 text-rose-200 shadow-xl animate-in fade-in duration-300">
                        <AlertCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h3 className="font-bold text-sm sm:text-base text-rose-300">שגיאה בניתוח ה-AI</h3>
                            <p className="text-xs sm:text-sm text-rose-400/90 leading-relaxed">{error}</p>
                            <button
                                type="button"
                                onClick={() => loadResearch(inputTicker || activeTicker, language)}
                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700/50 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> נסה שוב
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading Skeleton */}
                {isLoading && (
                    <div className="space-y-6 animate-pulse">
                        <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl p-6 sm:p-8 space-y-6">
                            <div className="h-8 bg-zinc-800 rounded-xl w-1/3" />
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-28 bg-zinc-900 rounded-2xl border border-zinc-800" />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="h-64 bg-[#121214] rounded-3xl border border-zinc-800" />
                            <div className="h-64 bg-[#121214] rounded-3xl border border-zinc-800" />
                        </div>
                    </div>
                )}

                {/* Empty / Idle State View */}
                {!isLoading && !report && !error && (
                    <div className="bg-gradient-to-b from-[#121214] to-[#0c0c0e] border border-zinc-800/80 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden space-y-8 animate-in fade-in duration-500">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                        
                        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-emerald-400/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/40">
                                <Compass className="w-8 h-8 animate-spin-slow" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                מוכן לניתוח מניה עם מנוע ה-AI של TomerVest
                            </h2>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                הזן סימול מניה בשורת החיפוש למעלה או בחר באחת ממניות החיפוש המהיר כדי להפיק דוח אנליסטים מקיף הכולל ציוני ביצועים, תרחישים שוריים/דוביים וזרזים מרכזיים.
                            </p>
                        </div>

                        {/* Feature Highlights Bento */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto relative z-10 text-right">
                            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 space-y-2">
                                <div className="p-2 w-fit rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <h4 className="text-sm font-bold text-zinc-200">ציוני ביצועים כמותיים</h4>
                                <p className="text-xs text-zinc-500 leading-normal">
                                    דירוג מבוסס נתונים לרווחיות, תמחור, פוטנציאל צמיחה וציון כללי משוקלל (0-100).
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 space-y-2">
                                <div className="p-2 w-fit rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                    <Cpu className="w-4 h-4" />
                                </div>
                                <h4 className="text-sm font-bold text-zinc-200">תרחישי Bull vs Bear</h4>
                                <p className="text-xs text-zinc-500 leading-normal">
                                    מיפוי סיכונים ואיומים אל מול מנועי צמיחה והזדמנויות השקעה בשוק.
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 space-y-2">
                                <div className="p-2 w-fit rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                    <Radar className="w-4 h-4" />
                                </div>
                                <h4 className="text-sm font-bold text-zinc-200">זרזים ואינדיקטורים</h4>
                                <p className="text-xs text-zinc-500 leading-normal">
                                    זיהוי אירועי מפתח, דוחות כספיים והכרזות שצפויים להשפיע על תנועת המחיר.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main AI Report Content */}
                {!isLoading && report && (
                    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
                        
                        {/* Hero Header & Recommendation */}
                        <div className="bg-gradient-to-br from-[#121214] via-zinc-900/60 to-[#121214] border border-zinc-800 rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                            
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h2 className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight" dir="ltr">
                                            {report.ticker}
                                        </h2>
                                        {report.company_name && (
                                            <span className="text-lg sm:text-xl font-medium text-zinc-400">
                                                · {report.company_name}
                                            </span>
                                        )}
                                        {stockDetails?.current_price && (
                                            <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1 rounded-xl">
                                                <span className="text-xs text-zinc-500">מחיר שוק:</span>
                                                <span className="font-mono font-bold text-white text-base" dir="ltr">
                                                    {formatCurrency(stockDetails.current_price)}
                                                </span>
                                                {stockDetails.change_percent !== undefined && (
                                                    <span className={`text-xs font-mono font-bold flex items-center ${stockDetails.change_percent >= 0 ? "text-emerald-400" : "text-rose-400"}`} dir="ltr">
                                                        {stockDetails.change_percent >= 0 ? "+" : ""}{stockDetails.change_percent.toFixed(2)}%
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                        דוח מחקר מבוסס בינה מלאכותית · הופק ונבדק מול נתוני מסחר מעודכנים
                                    </p>
                                </div>

                                {/* Target Recommendation Badge */}
                                {(() => {
                                    const recInfo = getRecBadge(report.target_recommendation);
                                    const RecIcon = recInfo.icon;
                                    return (
                                        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${recInfo.bg} self-start lg:self-auto`}>
                                            <RecIcon className="w-6 h-6 flex-shrink-0" />
                                            <div>
                                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                                                    קונצנזוס AI
                                                </span>
                                                <span className="text-base sm:text-lg font-black tracking-wide">
                                                    {recInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Score Gauge Cards Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mt-6 sm:mt-8 pt-6 border-t border-zinc-800/80">
                                {/* Overall Score */}
                                <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-xl ${getScoreColor(report.score?.overall_score)}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider">ציון משוקלל (Overall)</span>
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div className="flex items-baseline gap-1 font-mono">
                                        <span className="text-3xl sm:text-4xl font-black">{report.score?.overall_score ?? 0}</span>
                                        <span className="text-xs opacity-70">/ 100</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800/60 rounded-full mt-3 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${getScoreBarColor(report.score?.overall_score)}`} 
                                            style={{ width: `${Math.min(100, Math.max(0, report.score?.overall_score || 0))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Growth Score */}
                                <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-xl ${getScoreColor(report.score?.growth)}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider">פוטנציאל צמיחה (Growth)</span>
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <div className="flex items-baseline gap-1 font-mono">
                                        <span className="text-3xl sm:text-4xl font-black">{report.score?.growth ?? 0}</span>
                                        <span className="text-xs opacity-70">/ 100</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800/60 rounded-full mt-3 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${getScoreBarColor(report.score?.growth)}`} 
                                            style={{ width: `${Math.min(100, Math.max(0, report.score?.growth || 0))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Valuation Score */}
                                <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-xl ${getScoreColor(report.score?.valuation)}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider">תמחור ושוויוניות (Valuation)</span>
                                        <DollarSign className="w-4 h-4" />
                                    </div>
                                    <div className="flex items-baseline gap-1 font-mono">
                                        <span className="text-3xl sm:text-4xl font-black">{report.score?.valuation ?? 0}</span>
                                        <span className="text-xs opacity-70">/ 100</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800/60 rounded-full mt-3 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${getScoreBarColor(report.score?.valuation)}`} 
                                            style={{ width: `${Math.min(100, Math.max(0, report.score?.valuation || 0))}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Profitability Score */}
                                <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-xl ${getScoreColor(report.score?.profitability)}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider">רווחיות (Profitability)</span>
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div className="flex items-baseline gap-1 font-mono">
                                        <span className="text-3xl sm:text-4xl font-black">{report.score?.profitability ?? 0}</span>
                                        <span className="text-xs opacity-70">/ 100</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800/60 rounded-full mt-3 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${getScoreBarColor(report.score?.profitability)}`} 
                                            style={{ width: `${Math.min(100, Math.max(0, report.score?.profitability || 0))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Executive Summary Card */}
                        <div className="bg-[#121214] border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-xl space-y-3">
                            <div className="flex items-center gap-2.5 text-emerald-400">
                                <Layers className="w-5 h-5" />
                                <h3 className="text-base sm:text-lg font-bold text-white">תקציר אנליטי מנהלים (Executive Summary)</h3>
                            </div>
                            <p className="text-zinc-300 text-sm sm:text-base leading-relaxed whitespace-pre-line text-right">
                                {report.summary}
                            </p>
                        </div>

                        {/* Bento Grid: Bull Case vs Bear Case */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Bull Case */}
                            <div className="bg-[#121214] border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-xl shadow-emerald-950/10 space-y-4">
                                <div className="flex items-center gap-2.5 text-emerald-400 border-b border-zinc-800/80 pb-3">
                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                    <h3 className="text-base sm:text-lg font-bold text-white">תרחיש שורי והזדמנויות (Bull Case)</h3>
                                </div>
                                <ul className="space-y-3">
                                    {report.bull_case?.map((point, index) => (
                                        <li key={index} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300 leading-snug">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-emerald-400 text-[11px] font-bold font-mono">
                                                {index + 1}
                                            </div>
                                            <span className="flex-1">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Bear Case */}
                            <div className="bg-[#121214] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-xl shadow-rose-950/10 space-y-4">
                                <div className="flex items-center gap-2.5 text-rose-400 border-b border-zinc-800/80 pb-3">
                                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                    <h3 className="text-base sm:text-lg font-bold text-white">תרחיש דובי וגורמי סיכון (Bear Case)</h3>
                                </div>
                                <ul className="space-y-3">
                                    {report.bear_case?.map((point, index) => (
                                        <li key={index} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300 leading-snug">
                                            <div className="w-5 h-5 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-rose-400 text-[11px] font-bold font-mono">
                                                {index + 1}
                                            </div>
                                            <span className="flex-1">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Catalyst / What to Monitor Highlight Box */}
                        {report.what_to_monitor && (
                            <div className="bg-gradient-to-r from-blue-950/40 via-[#121214] to-indigo-950/30 border border-blue-500/40 rounded-3xl p-6 sm:p-7 shadow-xl space-y-3">
                                <div className="flex items-center gap-2.5 text-blue-400">
                                    <Radar className="w-5 h-5 animate-spin" />
                                    <h3 className="text-base sm:text-lg font-bold text-white">זרז ואינדיקטור מרכזי למעקב (Catalyst to Monitor)</h3>
                                </div>
                                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
                                    {report.what_to_monitor}
                                </p>
                            </div>
                        )}

                        {/* Quick Navigation Footer Actions */}
                        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                            <Link
                                to={`/charts/${report.ticker}`}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-all duration-200"
                            >
                                <BarChart3 className="w-4 h-4 text-emerald-400" />
                                <span>צפה בגרף חי (TradingView)</span>
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                            </Link>

                            <Link
                                to={`/watchlist/${report.ticker}`}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-all duration-200"
                            >
                                <BookmarkPlus className="w-4 h-4 text-blue-400" />
                                <span>נהל ברשימת מעקב</span>
                                <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                            </Link>

                            <Link
                                to="/orders"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/40 transition-all duration-200"
                            >
                                <span>בצע פקודת מסחר</span>
                                <ArrowUpRight className="w-4 h-4" />
                            </Link>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}
