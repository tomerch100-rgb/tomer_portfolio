import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import TradingChart from "../components/TradingChart";
import { showList, addTolist } from "../services/watchlistService";
import useFetchData from "../hooks/useFetchData";
import {
    Search, Star, Trash2, TrendingUp, TrendingDown, Clock, Activity,
    BarChart2, Zap, ArrowUpRight, ArrowDownRight, Check, Plus
} from "lucide-react";

const TIMEFRAMES = [
    { label: "1 דקה", value: "1" },
    { label: "5 דקות", value: "5" },
    { label: "1 שעה", value: "60" },
    { label: "יומי", value: "D" },
    { label: "שבועי", value: "W" },
];

function StockPage() {
    const { ticker } = useParams();
    const navigate = useNavigate();

    // Default symbol if none provided in URL
    const activeSymbol = (ticker || "AAPL").toUpperCase();

    // Local states
    const [searchInput, setSearchInput] = useState("");
    const [selectedInterval, setSelectedInterval] = useState("D");
    const [localFavorites, setLocalFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem("trading_favorites");
            return saved ? JSON.parse(saved) : ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN"];
        } catch {
            return ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN"];
        }
    });

    // Sync with backend watchlist
    const { data: backendWatchlist = [], refetch: refetchWatchlist } = useFetchData(showList);

    // Save favorites to localStorage whenever updated
    useEffect(() => {
        try {
            localStorage.setItem("trading_favorites", JSON.stringify(localFavorites));
        } catch (e) {
            console.error("Failed to persist favorites to localStorage", e);
        }
    }, [localFavorites]);

    // Handle adding a new stock directly to favorites (without changing current active chart)
    const handleAddFavorite = async (e) => {
        e?.preventDefault();
        if (!searchInput.trim()) return;
        const target = searchInput.trim().toUpperCase();
        setSearchInput("");

        if (!localFavorites.includes(target)) {
            setLocalFavorites(prev => [...prev, target]);
            try {
                await addTolist(target);
                refetchWatchlist();
            } catch (err) {
                // Ignore duplicate errors
            }
        }
    };

    // Toggle favorite state for active symbol
    const isFavorite = localFavorites.includes(activeSymbol);

    const toggleFavorite = async () => {
        if (isFavorite) {
            setLocalFavorites(prev => prev.filter(s => s !== activeSymbol));
        } else {
            setLocalFavorites(prev => [...prev, activeSymbol]);
            try {
                await addTolist(activeSymbol);
                refetchWatchlist();
            } catch (e) {
                // Ignore
            }
        }
    };

    const removeFavoriteItem = (e, symbolToRemove) => {
        e.stopPropagation();
        e.preventDefault();
        setLocalFavorites(prev => prev.filter(s => s !== symbolToRemove));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 text-zinc-100 font-sans" dir="rtl">
            
            {/* Top Control Bar */}
            <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                
                {/* Active Symbol Banner & Favorite Toggle Button */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-black text-white font-mono tracking-wider">
                            {activeSymbol}
                        </h1>
                        <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg">
                            גרף חי
                        </span>
                    </div>

                    <button
                        onClick={toggleFavorite}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${isFavorite
                                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80 hover:text-white"
                            }`}
                    >
                        <Star className={`w-4 h-4 ${isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
                        <span>{isFavorite ? "הסר ממועדפים" : "הוסף למועדפים"}</span>
                    </button>
                </div>

                {/* Timeframe Interval Controls */}
                <div className="flex items-center gap-1 bg-zinc-950/80 border border-zinc-800/80 p-1 rounded-xl w-full md:w-auto justify-center">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.value}
                            onClick={() => setSelectedInterval(tf.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedInterval === tf.value
                                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold shadow-sm"
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Trading Area (Chart + Sidebar) */}
            <div className="flex flex-col lg:flex-row gap-6 min-h-[660px]">

                {/* Favorites Sidebar */}
                <div className="w-full lg:w-80 flex-shrink-0 bg-[#121214] border border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                        <h2 className="text-base font-bold flex items-center gap-2 text-white">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            מועדפים מהירים
                        </h2>
                        <span className="text-xs text-zinc-500 font-mono">
                            {localFavorites.length} מניות
                        </span>
                    </div>

                    {/* Add Stock to Favorites Form */}
                    <form onSubmit={handleAddFavorite} className="flex items-center gap-2">
                        <div className="relative w-full">
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === "Enter") handleAddFavorite(e);
                                }}
                                onKeyUp={(e) => e.stopPropagation()}
                                placeholder="הוסף מניה (למשל: SMR)..."
                                className="w-full pl-3 pr-8 py-2 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs font-semibold uppercase font-mono transition-all text-right"
                            />
                            <span className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-zinc-500">
                                <Plus className="w-3.5 h-3.5" />
                            </span>
                        </div>
                        <button
                            type="submit"
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all shadow-md whitespace-nowrap cursor-pointer"
                        >
                            הוסף
                        </button>
                    </form>

                    <div className="flex-grow overflow-y-auto space-y-2 max-h-[560px] pr-1">
                        {localFavorites.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 text-xs">
                                רשימת המועדפים ריקה.<br />הוסף מניות בלחיצה עליונה!
                            </div>
                        ) : (
                            localFavorites.map((favSymbol) => {
                                const isCurrent = activeSymbol === favSymbol;
                                
                                // Find live pricing data if present in backend watchlist
                                const backendMatch = Array.isArray(backendWatchlist)
                                    ? backendWatchlist.find(b => (typeof b === 'object' ? b.ticker : b) === favSymbol)
                                    : null;
                                
                                const price = typeof backendMatch === 'object' ? backendMatch.current_price : null;
                                const changePct = typeof backendMatch === 'object' ? backendMatch.change_percent : null;
                                const isPositive = Number(changePct) >= 0;

                                return (
                                    <div
                                        key={favSymbol}
                                        onClick={() => navigate(`/charts/${favSymbol}`)}
                                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer group ${isCurrent
                                                ? "bg-emerald-500/10 border-emerald-500/40 text-white shadow-md"
                                                : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/60 text-zinc-300"
                                            }`}
                                    >
                                        <div className="flex flex-col text-right">
                                            <span className="font-mono font-bold tracking-wider text-sm group-hover:text-emerald-400 transition-colors">
                                                {favSymbol}
                                            </span>
                                            <span className="text-[11px] text-zinc-500 font-mono">
                                                {price ? `$${price.toFixed(2)}` : "NASDAQ"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {changePct !== null && changePct !== undefined && (
                                                <div className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg flex items-center gap-0.5 ${isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                                                    }`} dir="ltr">
                                                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                    <span>{isPositive ? "+" : ""}{Number(changePct).toFixed(2)}%</span>
                                                </div>
                                            )}

                                            <button
                                                onClick={(e) => removeFavoriteItem(e, favSymbol)}
                                                title="הסר ממועדפים"
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Main Technical Chart Container */}
                <div className="flex-grow min-h-[620px]">
                    <TradingChart
                        symbol={activeSymbol}
                        interval={selectedInterval}
                    />
                </div>

            </div>

        </div>
    );
}

export default StockPage;
