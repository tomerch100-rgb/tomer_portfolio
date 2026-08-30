import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { logout } from "../store/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { TrendingUp, LogOut, Menu, X } from "lucide-react";
import { logout as logoutApi } from "../services/authService";

function Navbar() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSelector((state) => state.auth.user);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const exit = async () => {
        try {
            await logoutApi();
            localStorage.removeItem("access_token");
            localStorage.removeItem("token");
            dispatch(logout());
            navigate('/', {
                replace: true,
                state: { message: "ביי ביי תודה" }
            });
        } catch (error) {
            console.error("שגיאה בהתנתקות מול השרת:", error);
        }
    };

    const navLinkClass = ({ isActive }) =>
        `px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-medium transition-all duration-200 ${isActive
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
        }`;

    const mobileNavLinkClass = ({ isActive }) =>
        `flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
        }`;

    const navItems = [
        { to: "/dashbord", label: "דאשבורד" },
        { to: "/deep-analysis", label: "ניתוח תיק לעומק" },
        { to: "/analytics", label: "ביצועים ואנליזה" },
        { to: "/ai-research", label: "מחקר AI 🤖" },
        { to: "/orders", label: "פקודות מסחר" },
        { to: "/history", label: "היסטוריית פעולות" },
        { to: "/watchlist/AAPL", label: "רשימת מעקב" },
        { to: "/charts/AAPL", label: "גרפים" },
    ];

    return (
        <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-3 sm:px-6 py-3 md:py-4 sticky top-0 z-50" dir="rtl">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                {/* Right Side: Hamburger (Mobile) + Logo + Desktop Navigation Links */}
                <div className="flex items-center gap-2 sm:gap-3 md:gap-6">
                    {/* Mobile Hamburger Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                        className="flex md:hidden p-1.5 sm:p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-800 transition-colors focus:outline-none"
                        aria-label="פתח תפריט ניווט"
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? (
                            <X className="w-5 h-5 text-zinc-200" />
                        ) : (
                            <Menu className="w-5 h-5 text-zinc-200" />
                        )}
                    </button>

                    {/* Logo & Brand Name */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 md:w-9 md:h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center shadow-inner shrink-0">
                            <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                        </div>
                        <span className="text-base md:text-lg font-bold tracking-tight text-white select-none whitespace-nowrap">
                            Tomer<span className="text-emerald-500">Vest</span>
                        </span>
                    </div>

                    {/* Desktop Navigation Links (Hidden on Mobile) */}
                    <div className="hidden md:flex items-center gap-2">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} className={navLinkClass}>
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                </div>

                {/* Left Side: User Greeting & Logout Button */}
                <div className="flex items-center gap-2 md:gap-3">
                    {user?.username && (
                        <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-mono hidden sm:inline-block whitespace-nowrap">
                            שלום, {user.username}
                        </span>
                    )}

                    <button
                        onClick={exit}
                        className="p-2 md:p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded-xl transition-all duration-200 border border-zinc-800 flex items-center justify-center gap-1.5 md:gap-2 cursor-pointer text-xs md:text-sm font-medium"
                        title="יציאה מהאתר"
                    >
                        <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">יציאה</span>
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu (Visible Only on Mobile when opened) */}
            {isMobileMenuOpen && (
                <div className="md:hidden mt-3 pt-3 border-t border-zinc-800/80 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={mobileNavLinkClass}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                    {user?.username && (
                        <div className="pt-2 border-t border-zinc-900 px-4 sm:hidden">
                            <span className="text-xs text-zinc-400 font-mono">
                                מחובר כ: <span className="text-zinc-200">{user.username}</span>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}

export default Navbar;
