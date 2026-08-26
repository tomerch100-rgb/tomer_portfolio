import React from 'react';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";

const TradingChart = ({ symbol = "AAPL", interval = "D", style = "1" }) => {
    const formattedSymbol = symbol.toUpperCase();

    return (
        <div className="w-full min-w-0 h-[380px] sm:h-[500px] md:h-[600px] lg:h-[650px] bg-[#09090b] rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-800/80 shadow-2xl">
            <AdvancedRealTimeChart
                symbol={formattedSymbol}
                interval={interval}
                theme="dark"
                width="100%"
                height="100%"
                allow_symbol_change={false}
                timezone="Asia/Jerusalem"
                hide_side_toolbar={false}
                style={style}
            />
        </div>
    );
};

export default TradingChart;