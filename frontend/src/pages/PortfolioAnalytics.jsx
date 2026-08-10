import React, { useMemo, useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { displayPortfolio, getPortfolioHistory, transaction_log, getTransactionsSummary } from '../services/dashbordService';
import useFetchData from '../hooks/useFetchData';
import { Loader2, AlertCircle, TrendingUp, PieChart as PieIcon, BarChart3, DollarSign, Activity } from 'lucide-react';

const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(num);
};

const formatCurrencyPrecise = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#6366f1'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl" dir="rtl">
                <p className="text-zinc-400 text-sm mb-1">{label}</p>
                <p className="text-white font-bold">{formatCurrency(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

const formatPercent = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "0.00%";
    return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
};

const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl" dir="rtl">
                <p className="text-white font-medium mb-1">{payload[0].name}</p>
                <p className="text-zinc-300">{formatCurrency(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

function PortfolioAnalytics() {
    const { data: portfolioDisplay, isLoading: loadingPortfolio } = useFetchData(displayPortfolio);
    const { data: portfolioHistory, isLoading: loadingHistory } = useFetchData(getPortfolioHistory);
    const { data: transactions, isLoading: loadingTransactions } = useFetchData(transaction_log);
    const { data: summary, isLoading: loadingSummary } = useFetchData(getTransactionsSummary);

    const isLoading = loadingPortfolio || loadingHistory || loadingTransactions || loadingSummary;

    const sectorData = useMemo(() => {
        if (!portfolioDisplay) return [];
        const sectors = {};
        portfolioDisplay.forEach(item => {
            const sec = item.sector || 'Unknown';
            if (!sectors[sec]) sectors[sec] = 0;
            sectors[sec] += (item.stock_currnet_worth || 0);
        });
        return Object.keys(sectors).map(key => ({ name: key, value: sectors[key] })).sort((a,b) => b.value - a.value);
    }, [portfolioDisplay]);

    const weightData = useMemo(() => {
        if (!portfolioDisplay) return [];
        return portfolioDisplay
            .map(item => ({ name: item.ticker, value: item.stock_currnet_worth || 0 }))
            .sort((a,b) => b.value - a.value);
    }, [portfolioDisplay]);

    const realizedProfits = useMemo(() => {
        if (!transactions) return [];
        // Only get SELL transactions with realized P/L
        return transactions
            .filter(tx => tx.action_type === 'SELL')
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
    }, [transactions]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4" dir="rtl">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="text-zinc-400 font-medium">מנתח ביצועי תיק...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">ביצועים ואנליזה</h1>
                    <p className="text-zinc-400 text-sm">גרפים, התפלגות סקטורים ורווחים ממומשים בתיק.</p>
                </div>
            </div>

            {/* Realized P&L Card */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <DollarSign className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">Realized P&L Amount</h2>
                        </div>
                        <p className={`text-3xl font-bold font-mono mt-2 ${summary.realized_pl_total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrencyPrecise(summary.realized_pl_total)}
                        </p>
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/10 rounded-xl">
                                <Activity className="w-5 h-5 text-purple-400" />
                            </div>
                            <h2 className="text-zinc-400 text-sm font-semibold uppercase tracking-wider">Realized P&L Percentage</h2>
                        </div>
                        <p className={`text-3xl font-bold font-mono mt-2 ${summary.realized_pl_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatPercent(summary.realized_pl_percentage)}
                        </p>
                    </div>
                </div>
            )}

            {/* Area Chart */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-bold text-white">צמיחת שווי התיק לאורך זמן</h2>
                </div>
                <div className="h-[400px] w-full" dir="ltr">
                    {portfolioHistory && portfolioHistory.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={portfolioHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickMargin={10} minTickGap={30} />
                                <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={val => `$${val.toLocaleString()}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-zinc-500">אין מספיק נתוני היסטוריה להצגה.</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sector Allocation */}
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2 w-full justify-start">
                        <PieIcon className="w-5 h-5 text-blue-400" />
                        <h2 className="text-lg font-bold text-white">התפלגות לפי סקטורים</h2>
                    </div>
                    <div className="h-[300px] w-full" dir="ltr">
                        {sectorData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={sectorData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={2} dataKey="value">
                                        {sectorData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-500">אין נתונים להצגה.</div>
                        )}
                    </div>
                </div>

                {/* Stock Weight Distribution */}
                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2 w-full justify-start">
                        <BarChart3 className="w-5 h-5 text-fuchsia-400" />
                        <h2 className="text-lg font-bold text-white">משקל כל מניה בתיק</h2>
                    </div>
                    <div className="h-[300px] w-full" dir="ltr">
                        {weightData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={weightData} cx="50%" cy="50%" outerRadius={110} paddingAngle={1} dataKey="value">
                                        {weightData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-zinc-500">אין נתונים להצגה.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Realized Profits Table */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-xl mt-8">
                <div className="p-6 border-b border-zinc-800/80">
                    <h2 className="text-lg font-bold text-white">רווחים/הפסדים ממומשים (עסקאות מכירה)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="text-xs text-zinc-400 bg-zinc-900/80 uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium">תאריך סגירה</th>
                                <th className="px-6 py-4 font-medium">סימול</th>
                                <th className="px-6 py-4 font-medium">כמות</th>
                                <th className="px-6 py-4 font-medium">מחיר מכירה</th>
                                <th className="px-6 py-4 font-medium">רווח/הפסד ממומש ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/30">
                            {realizedProfits.map((tx, index) => (
                                <tr key={index} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 text-zinc-300">
                                        {new Date(tx.transaction_date).toLocaleString('he-IL', {
                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-white">{tx.ticker}</td>
                                    <td className="px-6 py-4 text-zinc-300">{tx.shares}</td>
                                    <td className="px-6 py-4 text-zinc-300">{formatCurrencyPrecise(tx.price)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`font-medium px-2.5 py-1 rounded-full text-xs ${
                                            tx.realized_pl > 0 ? 'bg-emerald-500/10 text-emerald-400' : 
                                            tx.realized_pl < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-zinc-500/10 text-zinc-400'
                                        }`}>
                                            {formatCurrencyPrecise(tx.realized_pl)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {realizedProfits.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                                        אין היסטוריית רווחים ממומשים להצגה.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default PortfolioAnalytics;
