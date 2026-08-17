import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
    Bell,
    BellRing,
    BellOff,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    BarChart3,
    LayoutGrid,
    Table as TableIcon,
    ChevronLeft
} from "lucide-react";

/**
 * Tri-State Alert Bell Indicator Component
 * Engineered with flex-shrink-0, whitespace-nowrap, and resilient spacing to prevent clipping.
 */
export function AlertIndicator({ item, onOpenModal, size = "normal" }) {
    const targetPrice = item?.target_price;
    const isTriggered = Boolean(item?.alert_triggered);
    const direction = item?.alert_direction;

    // 1. No Alert Set
    if (targetPrice === null || targetPrice === undefined || targetPrice === "") {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenModal && onOpenModal(item);
                }}
                className="group/btn flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 hover:border-amber-500/40 transition-all duration-200 cursor-pointer shadow-sm"
                title="הגדר התראת מחיר חדשה לטלגרם"
            >
                <Bell className="w-3.5 h-3.5 flex-shrink-0 text-zinc-500 group-hover/btn:text-amber-400 group-hover/btn:scale-110 transition-transform" />
                <span className="text-[11px] font-medium whitespace-nowrap">
                    הגדר התראה
                </span>
            </button>
        );
    }

    // 3. Triggered / Fired Alert (Sent to Telegram)
    if (isTriggered) {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenModal && onOpenModal(item);
                }}
                className="group/btn flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-300 hover:text-amber-300 border border-zinc-700 hover:border-amber-500/50 transition-all duration-200 shadow-sm cursor-pointer"
                title="ההתראה כבר נשלחה לטלגרם. לחץ לעדכון מחיר והפעלה מחדש"
            >
                <div className="relative flex-shrink-0 flex items-center justify-center">
                    <BellOff className="w-3.5 h-3.5 text-zinc-400 group-hover/btn:text-amber-300" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-zinc-900" />
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap font-mono text-[11px] font-semibold text-zinc-300">
                    <span>נשלחה</span>
                    <span className="text-zinc-400">(${Number(targetPrice).toFixed(2)})</span>
                </div>
            </button>
        );
    }

    // 2. Active Alert (Pending / Glowing)
    const isUp = direction === "UP";
    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenModal && onOpenModal(item);
            }}
            className="group/btn flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/40 hover:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:shadow-[0_0_16px_rgba(245,158,11,0.35)] transition-all duration-200 cursor-pointer"
            title={`התראה פעילה: יעד $${Number(targetPrice).toFixed(2)} (${isUp ? "בעליית מחיר" : "בירידת מחיר"})`}
        >
            <div className="relative flex-shrink-0 flex items-center justify-center">
                <BellRing className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            </div>
            <div className="flex items-center gap-1 whitespace-nowrap font-mono text-[11px] font-bold text-amber-300" dir="ltr">
                {isUp ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                ) : (
                    <TrendingDown className="w-3 h-3 text-rose-400 flex-shrink-0" />
                )}
                <span>${Number(targetPrice).toFixed(2)}</span>
            </div>
        </button>
    );
}

/**
 * Individual Stock Card Component
 * Fully responsive, non-clipped card with flexible visual hierarchy.
 */
export function WatchlistCard({ item, isSelected, onSelect, onOpenEditAlert }) {
    const symbol = typeof item === "string" ? item : item.ticker;
    const currentPrice = typeof item === "object" ? item.current_price : null;
    const changePct = typeof item === "object" ? item.change_percent : null;
    const volume = typeof item === "object" ? item.volume : null;
    const isPositive = Number(changePct) >= 0;

    const formatCurrency = (val) => {
        if (val === null || val === undefined || isNaN(Number(val))) return "---";
        return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatPercent = (val) => {
        if (val === null || val === undefined || isNaN(Number(val))) return "0.00%";
        const num = Number(val);
        return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
    };

    const formatVolume = (val) => {
        if (val === null || val === undefined || isNaN(Number(val))) return "---";
        const num = Number(val);
        if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toLocaleString();
    };

    return (
        <div
            onClick={() => onSelect && onSelect(symbol)}
            className={`w-full rounded-2xl p-4 border transition-all duration-200 cursor-pointer flex flex-col gap-3 group relative ${
                isSelected
                    ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_4px_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                    : "bg-zinc-900/70 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700/90 shadow-md"
            }`}
            dir="rtl"
        >
            {/* Top Row: Ticker Info & Alert Indicator */}
            <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-lg tracking-wider text-white group-hover:text-emerald-400 transition-colors">
                            {symbol}
                        </span>
                        {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                        )}
                    </div>
                </div>

                {/* Alert Badge Container - Guaranteed No Overflow */}
                <div className="flex-shrink-0 mr-auto">
                    <AlertIndicator item={item} onOpenModal={onOpenEditAlert} />
                </div>
            </div>

            {/* Bottom Row: Price Metrics & Action */}
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-800/60 text-xs">
                {/* Current Price */}
                <div className="flex flex-col text-right">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">מחיר</span>
                    <span className="font-mono font-bold text-sm text-zinc-100">
                        {formatCurrency(currentPrice)}
                    </span>
                </div>

                {/* 24h Change */}
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">24 שעות</span>
                    <div
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg font-mono font-bold text-[11px] ${
                            isPositive
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                        dir="ltr"
                    >
                        {isPositive ? (
                            <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                        ) : (
                            <ArrowDownRight className="w-3 h-3 flex-shrink-0" />
                        )}
                        <span>{formatPercent(changePct)}</span>
                    </div>
                </div>

                {/* Volume */}
                <div className="flex flex-col text-left hidden sm:flex">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">מחזור</span>
                    <span className="font-mono text-zinc-400 font-medium">
                        {formatVolume(volume)}
                    </span>
                </div>

                {/* Link to details */}
                <Link
                    to={`/watchlist/${symbol}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl bg-zinc-800/80 hover:bg-emerald-600 text-zinc-400 hover:text-white transition-all flex items-center justify-center flex-shrink-0"
                    title="פתח ניתוח מעמיק"
                >
                    <ChevronLeft className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}

/**
 * WatchlistTable Component
 * Offers responsive Card View and Table View with full layout safety.
 */
function WatchlistTable({
    items = [],
    selectedTicker = "",
    onSelectTicker,
    onOpenEditAlert,
    isLoading = false,
    className = ""
}) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("הכל");
    const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'

    const CATEGORIES = {
        "הכל": [],
        "טכנולוגיה": ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AMD", "INTC", "NFLX"],
        "פיננסים": ["JPM", "BAC", "WFC", "C", "GS", "MS", "V", "MA"],
        "אנרגיה": ["XOM", "CVX", "COP", "SLB"]
    };

    // Formatters
    const formatCurrency = (val) => {
        if (val === null || val === undefined || isNaN(Number(val))) return "---";
        return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatPercent = (val) => {
        if (val === null || val === undefined || isNaN(Number(val))) return "0.00%";
        const num = Number(val);
        return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
    };

    const formatVolume = (val) => {
        if (val === null || val === undefined || isNaN(Number(val))) return "---";
        const num = Number(val);
        if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
        if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
        return num.toLocaleString();
    };

    // Filter items
    const filteredItems = useMemo(() => {
        if (!Array.isArray(items)) return [];
        return items.filter((item) => {
            const ticker = typeof item === "string" ? item : item.ticker;
            const matchesSearch = ticker.toLowerCase().includes(searchQuery.toLowerCase().trim());
            if (!matchesSearch) return false;

            if (selectedCategory === "הכל") return true;
            const categoryTickers = CATEGORIES[selectedCategory] || [];
            return categoryTickers.includes(ticker);
        });
    }, [items, searchQuery, selectedCategory]);

    return (
        <div className={`flex flex-col gap-4 w-full ${className}`} dir="rtl">
            {/* Search & Category Filter & View Mode Controls */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 justify-between">
                    {/* Search Input */}
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="חפש מניה ברשימה..."
                            className="w-full pl-4 pr-9 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all text-right font-mono"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                            <Search className="w-3.5 h-3.5" />
                        </span>
                    </div>

                    {/* View Switcher Toggle */}
                    <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-xl flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                viewMode === "cards"
                                    ? "bg-zinc-800 text-emerald-400 shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-300"
                            }`}
                            title="תצוגת כרטיסים"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                viewMode === "table"
                                    ? "bg-zinc-800 text-emerald-400 shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-300"
                            }`}
                            title="תצוגת טבלה"
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    {Object.keys(CATEGORIES).map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer ${
                                selectedCategory === cat
                                    ? "bg-zinc-800 text-emerald-400 border border-emerald-500/30 font-bold shadow-sm"
                                    : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/50"
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* View Render */}
            {isLoading ? (
                <div className="text-center py-12 text-zinc-500 text-xs">טוען מניות...</div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">לא נמצאו מניות ברשימה</div>
            ) : viewMode === "cards" ? (
                /* Cards View */
                <div className="space-y-3">
                    {filteredItems.map((item) => {
                        const symbol = typeof item === "string" ? item : item.ticker;
                        return (
                            <WatchlistCard
                                key={symbol}
                                item={item}
                                isSelected={selectedTicker === symbol}
                                onSelect={onSelectTicker}
                                onOpenEditAlert={onOpenEditAlert}
                            />
                        );
                    })}
                </div>
            ) : (
                /* Table View */
                <div className="overflow-x-auto border border-zinc-800/80 rounded-2xl bg-zinc-900/40 backdrop-blur-md shadow-xl">
                    <table className="w-full text-right border-collapse min-w-[420px]">
                        <thead>
                            <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                                <th className="py-3 px-3.5">סימול</th>
                                <th className="py-3 px-3.5">מחיר</th>
                                <th className="py-3 px-3.5">שינוי</th>
                                <th className="py-3 px-3.5">התראה</th>
                                <th className="py-3 px-3 text-center">פרטים</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50 text-sm">
                            {filteredItems.map((item) => {
                                const symbol = typeof item === "string" ? item : item.ticker;
                                const isSelected = selectedTicker === symbol;
                                const currentPrice = typeof item === "object" ? item.current_price : null;
                                const changePct = typeof item === "object" ? item.change_percent : null;
                                const isPositive = Number(changePct) >= 0;

                                return (
                                    <tr
                                        key={symbol}
                                        onClick={() => onSelectTicker && onSelectTicker(symbol)}
                                        className={`transition-colors cursor-pointer group ${
                                            isSelected
                                                ? "bg-emerald-500/10 text-white"
                                                : "hover:bg-zinc-800/30 text-zinc-300"
                                        }`}
                                    >
                                        <td className="py-3 px-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                                                    {symbol}
                                                </span>
                                                {isSelected && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3.5 font-mono font-semibold text-zinc-100 text-xs">
                                            {formatCurrency(currentPrice)}
                                        </td>
                                        <td className="py-3 px-3.5" dir="ltr">
                                            <div
                                                className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                                    isPositive
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-rose-500/10 text-rose-400"
                                                }`}
                                            >
                                                {isPositive ? "+" : ""}
                                                {formatPercent(changePct)}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3.5">
                                            <AlertIndicator item={item} onOpenModal={onOpenEditAlert} />
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <Link
                                                to={`/watchlist/${symbol}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 hover:text-white text-zinc-400 inline-flex items-center justify-center transition-all"
                                                title="חקור מניה"
                                            >
                                                <BarChart3 className="w-3.5 h-3.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default WatchlistTable;
