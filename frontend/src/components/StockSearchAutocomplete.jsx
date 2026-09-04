import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, Building2, TrendingUp } from "lucide-react";
import { searchStocks } from "../services/stocksService";

/**
 * StockSearchAutocomplete
 * A debounced autocomplete search input for stock tickers and company names.
 * When a user selects a suggestion, it fills the input and calls onSelect(stock)
 * WITHOUT automatically triggering search/submit actions.
 */
export default function StockSearchAutocomplete({
    value = "",
    onChange,
    onSelect,
    placeholder = "הזן סימול או שם חברה (למשל: AAPL, Tesla)...",
    disabled = false,
    className = "",
    inputClassName = "",
    required = false,
    name = "ticker",
    id = "stock-autocomplete-input",
    showIcon = true,
    dir = "ltr",
}) {
    const [inputValue, setInputValue] = useState(value || "");
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Sync internal state when external value changes
    useEffect(() => {
        setInputValue(value || "");
    }, [value]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced stock search API call
    useEffect(() => {
        const trimmed = inputValue.trim();
        if (!trimmed || trimmed.length < 1) {
            setSuggestions([]);
            setIsLoading(false);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        const timer = setTimeout(async () => {
            try {
                const results = await searchStocks(trimmed, 8);
                setSuggestions(results);
                setIsOpen(results.length > 0);
                setHighlightedIndex(-1);
            } catch (err) {
                console.error("Autocomplete fetch error:", err);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [inputValue]);

    const handleInputChange = (e) => {
        const nextVal = e.target.value;
        setInputValue(nextVal);
        if (onChange) {
            onChange(nextVal);
        }
    };

    const handleSelectStock = (stock) => {
        const selectedSymbol = stock.symbol.toUpperCase();
        setInputValue(selectedSymbol);
        setIsOpen(false);
        setSuggestions([]);

        if (onChange) {
            onChange(selectedSymbol);
        }
        if (onSelect) {
            onSelect(stock);
        }
    };

    const handleKeyDown = (e) => {
        if (!isOpen || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            e.preventDefault();
            handleSelectStock(suggestions[highlightedIndex]);
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            <div className="relative flex items-center">
                {showIcon && (
                    <span className="absolute right-3.5 flex items-center pointer-events-none text-zinc-500">
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </span>
                )}

                <input
                    ref={inputRef}
                    id={id}
                    name={name}
                    type="text"
                    autoComplete="off"
                    disabled={disabled}
                    required={required}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (suggestions.length > 0) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    dir={dir}
                    className={`w-full px-4 py-2.5 sm:py-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 text-sm font-mono transition-all ${
                        showIcon ? "pr-10" : ""
                    } ${inputClassName}`}
                />
            </div>

            {/* Suggestions Floating Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div
                    className="absolute z-50 mt-1.5 w-full bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150"
                    dir="ltr"
                >
                    <div className="px-3 py-1.5 bg-zinc-800/60 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
                        <span>תוצאות חיפוש מניות</span>
                        <span className="text-[10px] text-zinc-500">בחר מניה למילוי</span>
                    </div>

                    <ul className="divide-y divide-zinc-800/50">
                        {suggestions.map((stock, idx) => {
                            const isHighlighted = idx === highlightedIndex;
                            return (
                                <li
                                    key={stock.symbol || idx}
                                    onMouseDown={(e) => {
                                        // Prevent blur before selection
                                        e.preventDefault();
                                        handleSelectStock(stock);
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                                        isHighlighted
                                            ? "bg-emerald-500/15 text-white"
                                            : "hover:bg-zinc-800/70 text-zinc-200"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="p-1.5 bg-zinc-800 border border-zinc-700/60 rounded-lg text-emerald-400 flex-shrink-0">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-sm text-emerald-400 tracking-wide">
                                                    {stock.symbol}
                                                </span>
                                                {stock.exchange && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-sans border border-zinc-700/40 uppercase">
                                                        {stock.exchange}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-zinc-400 truncate max-w-[220px] sm:max-w-xs font-sans">
                                                {stock.name}
                                            </span>
                                        </div>
                                    </div>

                                    <span className="text-[11px] text-zinc-500 hover:text-emerald-300 transition-colors flex-shrink-0">
                                        בחר ↵
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
