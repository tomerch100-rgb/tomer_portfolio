import { NavLink, useNavigate } from "react-router-dom";
import Btn from "./Btn";
import { logout } from "../store/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { TrendingUp, LogOut } from "lucide-react";

function Navbar() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const user = useSelector((state) => state.auth.user)

    const exit = () => {
        dispatch(logout())
        navigate('/', {
            replace: true,
            state: { message: "ביי ביי תודה" }
        })
    }

    const navLinkClass = ({ isActive }) =>
        `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
        }`;

    return (
        <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-50" dir="rtl">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center shadow-inner">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-white">
                            Tomer<span className="text-emerald-500">Vest</span>
                        </span>
                    </div>

                    <div className="flex gap-2">
                        <NavLink to="/dashbord" className={navLinkClass}>דאשבורד</NavLink>
                        <NavLink to="/orders" className={navLinkClass}>פקודות מסחר</NavLink>
                        <NavLink to="/watchlist/AAPL" className={navLinkClass}>רשימת מעקב</NavLink>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {user?.username && (
                        <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800/60 px-3 py-1.5 rounded-full font-mono">
                            שלום, {user.username}
                        </span>
                    )}
                    <button
                        onClick={exit}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded-xl transition-all duration-200 border border-zinc-800 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium"
                        title="יציאה מהאתר"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">יציאה</span>
                    </button>
                </div>
            </div>
        </nav>
    )
}
export default Navbar
