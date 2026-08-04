import { useState, useMemo } from "react";
import { transaction_log } from "../services/dashbordService";
import useFetchData from "../hooks/useFetchData";
import {
    History, Search, Loader2, AlertCircle, TrendingUp, TrendingDown, DollarSign
} from "lucide-react";

function TransactionHistory() {
    const { data: transactions = [], isLoading, error } = useFetchData(transaction_log);
    const [searchFilter, setSearchFilter] = useState("");

    // Helper formatters
    const formatCurrency = (val) => {
        const num = Number(val);
        if (isNaN(num)) return "$0.00";
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
    };

    // Filter transactions by ticker search input
    const filteredTransactions = useMemo(() => {
        if (!Array.isArray(transactions)) return [];
        return transactions.filter((tx) =>
            tx.ticker?.toLowerCase().includes(searchFilter.toLowerCase())
        );
    }, [transactions, searchFilter]);

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans p-4 sm:p-6 lg:p-8" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner">
                                <History className="w-5 h-5" />
                            </div>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight">
                                היסטוריית פעולות
                            </h1>
                        </div>
                        <p className="text-zinc-400 text-sm mt-1">
                            תיעוד מלא ומקיף של כל קניות ומכירות המניות בחשבון
                        </p>
                    </div>

                    {/* Search & Filter Input */}
                    <div className="relative w-full md:w-80">
                        <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="סינון לפי סימול מניה (למשל: AAPL)..."
                            className="w-full pl-4 pr-10 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-zinc-100 placeholder-zinc-500 text-xs font-semibold uppercase font-mono transition-all text-right"
                        />
                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                            <Search className="w-4 h-4" />
                        </span>
                    </div>
                </div>

                {/* Table / Content State */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        <p className="text-zinc-400 text-sm">טוען את היסטוריית העסקאות...</p>
                    </div>
                ) : error ? (
                    <div className="bg-rose-950/20 border border-rose-900/50 rounded-2xl p-6 flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-rose-400">שגיאה בטעינת היסטוריית העסקאות</h3>
                            <p className="text-rose-500/80 text-sm mt-1">אנא ודא חיבור לרשת או נסה שנית מאוחר יותר.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
                        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between">
                            <span className="text-xs text-zinc-400 font-mono">
                                מוצגות {filteredTransactions.length} מתוך {transactions.length} עסקאות
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            {filteredTransactions.length === 0 ? (
                                <div className="text-center py-16 px-4">
                                    <History className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                    <h3 className="font-semibold text-zinc-300 text-sm">לא נמצאו עסקאות</h3>
                                    <p className="text-zinc-500 text-xs mt-1">לא נמצאו פעולות התואמות לחיפוש שלך.</p>
                                </div>
                            ) : (
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold tracking-wider uppercase bg-zinc-900/30">
                                            <th className="py-4 px-6">תאריך ושעה</th>
                                            <th className="py-4 px-6">סימול</th>
                                            <th className="py-4 px-6">סוג פעולה</th>
                                            <th className="py-4 px-6 text-left">כמות מניות</th>
                                            <th className="py-4 px-6 text-left">מחיר ליחידה</th>
                                            <th className="py-4 px-6 text-left">סך עסקה</th>
                                            <th className="py-4 px-6 text-left">רווח/הפסד ממומש</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/50 text-sm">
                                        {filteredTransactions.map((tx, index) => {
                                            const isBuy = tx.action_type === "BUY";
                                            const isRealizedPositive = Number(tx.realized_pl) >= 0;
                                            const totalAmount = Number(tx.shares) * Number(tx.price);

                                            return (
                                                <tr
                                                    key={index}
                                                    className="hover:bg-zinc-800/20 transition-colors duration-150"
                                                >
                                                    <td className="py-4 px-6 text-zinc-400 text-xs font-mono" dir="ltr">
                                                        {tx.transaction_date}
                                                    </td>
                                                    <td className="py-4 px-6 font-bold text-white font-mono">
                                                        {tx.ticker}
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${isBuy
                                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                            }`}>
                                                            {isBuy ? "קנייה (BUY)" : "מכירה (SELL)"}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-left text-zinc-300 font-mono" dir="ltr">
                                                        {tx.shares}
                                                    </td>
                                                    <td className="py-4 px-6 text-left text-zinc-400 font-mono" dir="ltr">
                                                        {formatCurrency(tx.price)}
                                                    </td>
                                                    <td className="py-4 px-6 text-left text-white font-mono font-bold" dir="ltr">
                                                        {formatCurrency(totalAmount)}
                                                    </td>
                                                    <td className={`py-4 px-6 text-left font-mono font-bold ${tx.realized_pl !== 0
                                                            ? isRealizedPositive ? "text-emerald-400" : "text-rose-400"
                                                            : "text-zinc-500"
                                                        }`} dir="ltr">
                                                        {tx.realized_pl !== 0 ? formatCurrency(tx.realized_pl) : "-"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TransactionHistory;
