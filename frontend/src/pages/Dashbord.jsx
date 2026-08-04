import { useSelector } from 'react-redux';
import { displayPortfolio, portfolio_summary } from "../services/dashbordService";
import useFetchData from "../hooks/useFetchData";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle
} from "lucide-react";

function Dashbord() {
  const user = useSelector((state) => state.auth.user);

  // Data fetching using useFetchData hook
  const { data: portfolioDisplay, isLoading: displayLoading, error: displayError } = useFetchData(displayPortfolio);
  const { data: summaryPortfolio, isLoading: summaryLoading, error: summaryError } = useFetchData(portfolio_summary);

  const isLoading = displayLoading || summaryLoading;
  const hasError = displayError || summaryError;

  // Helper to format currency
  const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  };

  // Helper to format percent
  const formatPercent = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "0.00%";
    return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back, <span className="text-emerald-400">{user?.username || "Guest"}</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Here's a real-time overview of your investment portfolio.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-400 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Feed Active
        </div>
      </div>

      {isLoading ? (
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Fetching your portfolio details...</p>
        </div>
      ) : hasError ? (
        <div className="max-w-7xl mx-auto bg-red-950/20 border border-red-900/50 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-400">Failed to load dashboard data</h3>
            <p className="text-red-500/80 text-sm mt-1">
              Please verify your connection or try again later.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Total Value */}
            <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700/80 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Value</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {formatCurrency(summaryPortfolio?.total_value)}
              </h3>
              <p className="text-xs text-zinc-500 mt-2">Current account balance</p>
            </div>

            {/* Total Profit/Loss */}
            <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700/80 transition-all duration-300 shadow-lg">
              {(() => {
                const isProfit = Number(summaryPortfolio?.total_profit) >= 0;
                return (
                  <>
                    <div className="flex items-center justify-between text-zinc-400 mb-4">
                      <span className="text-xs font-semibold uppercase tracking-wider">Total Profit / Loss</span>
                      <div className={`p-2 rounded-lg ${isProfit ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                        {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                    </div>
                    <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatCurrency(summaryPortfolio?.total_profit)}
                    </h3>
                    <div className="flex items-center gap-1 mt-2">
                      {isProfit ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                      <span className={`text-xs font-medium ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                        All-time performance
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Daily Change */}
            <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700/80 transition-all duration-300 shadow-lg">
              {(() => {
                const isDailyPositive = Number(summaryPortfolio?.daily_change) >= 0;
                return (
                  <>
                    <div className="flex items-center justify-between text-zinc-400 mb-4">
                      <span className="text-xs font-semibold uppercase tracking-wider">Daily Change</span>
                      <div className={`p-2 rounded-lg ${isDailyPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
                        <Activity className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDailyPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatCurrency(summaryPortfolio?.daily_change)}
                    </h3>
                    <div className="flex items-center gap-1 mt-2">
                      {isDailyPositive ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                      <span className={`text-xs font-medium ${isDailyPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        Today's P/L
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Active Positions */}
            <div className="bg-[#121214] border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700/80 transition-all duration-300 shadow-lg">
              <div className="flex items-center justify-between text-zinc-400 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider">Positions</span>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {summaryPortfolio?.number_of_positions || 0}
              </h3>
              <p className="text-xs text-zinc-500 mt-2">Active asset holdings</p>
            </div>
          </div>

          {/* Active Holdings Table */}
          <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Holdings</h2>
                <p className="text-zinc-400 text-xs mt-1">Detailed list of your current portfolio holdings.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              {!Array.isArray(portfolioDisplay) || portfolioDisplay.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <Briefcase className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-zinc-300 text-sm">No assets in portfolio</h3>
                  <p className="text-zinc-500 text-xs mt-1">Go to the Trade page to buy your first stock!</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold tracking-wider uppercase bg-zinc-900/30">
                      <th className="py-4 px-6">Ticker</th>
                      <th className="py-4 px-6 text-right">Shares</th>
                      <th className="py-4 px-6 text-right">Avg Price</th>
                      <th className="py-4 px-6 text-right">Current Price</th>
                      <th className="py-4 px-6 text-right">Current Worth</th>
                      <th className="py-4 px-6 text-right">Day P/L</th>
                      <th className="py-4 px-6 text-right">Total P/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 text-sm">
                    {portfolioDisplay.map((stock, index) => {
                      const isPlPositive = Number(stock["p/l"]) >= 0;
                      const isDayPositive = Number(stock.day_change) >= 0;
                      return (
                        <tr
                          key={index}
                          className="hover:bg-zinc-800/20 transition-colors duration-150 group"
                        >
                          <td className="py-4 px-6 font-semibold text-white group-hover:text-emerald-400 transition-colors">
                            {stock.ticker}
                          </td>
                          <td className="py-4 px-6 text-right text-zinc-300 font-mono">
                            {stock.shares}
                          </td>
                          <td className="py-4 px-6 text-right text-zinc-400 font-mono">
                            {formatCurrency(stock.avg_price)}
                          </td>
                          <td className="py-4 px-6 text-right text-zinc-200 font-mono">
                            {formatCurrency(stock.currnet_price || stock.current_price)}
                          </td>
                          <td className="py-4 px-6 text-right text-white font-mono font-semibold">
                            {formatCurrency(stock.stock_currnet_worth)}
                          </td>
                          {/* Day P/L */}
                          <td className={`py-4 px-6 text-right font-mono font-medium ${isDayPositive ? "text-emerald-400" : "text-rose-400"}`}>
                            <div className="flex flex-col items-end">
                              <span>{formatCurrency(stock.day_change)}</span>
                              <span className="text-xs opacity-85">{formatPercent(stock.day_precent)}</span>
                            </div>
                          </td>
                          {/* Total P/L */}
                          <td className={`py-4 px-6 text-right font-mono font-semibold ${isPlPositive ? "text-emerald-400" : "text-rose-400"}`}>
                            <div className="flex flex-col items-end">
                              <span>{formatCurrency(stock["p/l"])}</span>
                              <span className="text-xs opacity-85">{formatPercent(stock.precent_ch)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashbord;
