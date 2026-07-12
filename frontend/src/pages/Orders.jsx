import { useState } from "react";
import { useForm } from "react-hook-form";
import { addStock, sellStock } from "../service/ordersService";

function Orders() {
    const { register, handleSubmit, formState: { errors }, reset } = useForm();
    const [orderType, setOrderType] = useState("buy");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (data) => {
        setIsSubmitting(true);

        // הופכים את סימול המניה לאותיות גדולות (למשל aapl -> AAPL)
        const formattedData = {
            ...data,
            stock: data.stock.toUpperCase()
        };

        try {
            let response;
            if (orderType === "buy") {
                response = await addStock(formattedData);
            } else {
                response = await sellStock(formattedData);
            }

            console.log("הפעולה בוצעה בהצלחה:", response);
            reset(); // מנקה את השדות בטופס לאחר הצלחה

            // תוספת מומלצת: אפשר להוסיף פה alert או Toast כדי לעדכן את המשתמש
            alert("הפעולה בוצעה בהצלחה!");

        } catch (error) {
            console.error("לא הצלחנו לבצע את הפעולה:", error);
            alert("שגיאה בביצוע הפעולה, אנא נסה שוב.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-8 bg-[#121214] border border-zinc-800 rounded-3xl shadow-2xl font-sans">
            <h2 className="text-2xl font-bold text-zinc-100 mb-8 text-center tracking-tight">
                Trade Stocks
            </h2>

            {/* Type Selector (Buy / Sell) */}
            <div className="flex gap-4 mb-8">
                <button
                    type="button"
                    onClick={() => setOrderType("buy")}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#121214] focus:ring-green-500 ${orderType === "buy"
                            ? "bg-green-600 text-green-50 shadow-lg shadow-green-600/30 scale-[0.98] ring-1 ring-green-500"
                            : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                >
                    Buy
                </button>
                <button
                    type="button"
                    onClick={() => setOrderType("sell")}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#121214] focus:ring-red-500 ${orderType === "sell"
                            ? "bg-red-600 text-red-50 shadow-lg shadow-red-600/30 scale-[0.98] ring-1 ring-red-500"
                            : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                        }`}
                >
                    Sell
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Stock Symbol Input */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-400">
                        Stock Symbol
                    </label>
                    <input
                        {...register("stock", { required: "Stock is required" })}
                        type="text"
                        placeholder="e.g. AAPL"
                        style={{ textTransform: "uppercase" }}
                        className={`w-full px-4 py-3 bg-zinc-900/50 border rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all duration-200 ${orderType === "buy"
                                ? "focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                : "focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            } ${errors.stock ? "border-rose-500" : "border-zinc-800"}`}
                    />
                    {errors.stock && (
                        <p className="text-xs text-rose-500 font-medium">{errors.stock.message}</p>
                    )}
                </div>

                {/* Shares Input */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-400">
                        Shares
                    </label>
                    <input
                        {...register("shares", {
                            required: "Shares quantity is required",
                            valueAsNumber: true,
                            min: { value: 0.0001, message: "Quantity must be > 0" }
                        })}
                        type="number"
                        step="any"
                        placeholder="0.00"
                        className={`w-full px-4 py-3 bg-zinc-900/50 border rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all duration-200 ${orderType === "buy"
                                ? "focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                : "focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            } ${errors.shares ? "border-rose-500" : "border-zinc-800"}`}
                    />
                    {errors.shares && (
                        <p className="text-xs text-rose-500 font-medium">{errors.shares.message}</p>
                    )}
                </div>

                {/* Average Price Input */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-zinc-400">
                        Price per Share
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">$</span>
                        <input
                            {...register("avg_price", {
                                required: "Price is required",
                                valueAsNumber: true,
                                min: { value: 0.01, message: "Price must be > 0" }
                            })}
                            type="number"
                            step="any"
                            placeholder="0.00"
                            className={`w-full pl-8 pr-4 py-3 bg-zinc-900/50 border rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none transition-all duration-200 ${orderType === "buy"
                                    ? "focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                    : "focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                } ${errors.avg_price ? "border-rose-500" : "border-zinc-800"}`}
                        />
                    </div>
                    {errors.avg_price && (
                        <p className="text-xs text-rose-500 font-medium">{errors.avg_price.message}</p>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full mt-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#121214] active:scale-[0.98] ${orderType === "buy"
                            ? "bg-green-600 hover:bg-green-500 text-green-50 focus:ring-green-500 shadow-lg shadow-green-600/20"
                            : "bg-red-600 hover:bg-red-500 text-red-50 focus:ring-red-500 shadow-lg shadow-red-600/20"
                        } ${isSubmitting ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                >
                    {isSubmitting
                        ? "Processing..."
                        : orderType === "buy" ? "Execute Buy" : "Execute Sell"}
                </button>
            </form>
        </div>
    );
}

export default Orders;