import { Link } from "react-router-dom";

function Footer() {
    return (
        <footer className="border-t border-zinc-900 bg-zinc-950/80 py-8 px-6 text-zinc-500 text-xs mt-auto" dir="rtl">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="space-y-1 text-center sm:text-right">
                    <p>© {new Date().getFullYear()} TomerVest. כל הזכויות שמורות.</p>
                    <p className="text-[10px] text-zinc-600">נבנה באהבה על ידי Tomer</p>
                </div>
                <div className="flex gap-6">
                    <Link to="/dashbord" className="hover:text-zinc-300 transition-colors">דאשבורד</Link>
                    <Link to="/orders" className="hover:text-zinc-300 transition-colors">פקודות מסחר</Link>
                    <Link to="/watchlist/AAPL" className="hover:text-zinc-300 transition-colors">רשימת מעקב</Link>
                    <Link to="/feedback" className="hover:text-emerald-400 text-zinc-400 transition-colors">משוב ורעיונות 💬</Link>
                </div>
            </div>
        </footer>
    );
}

export default Footer;