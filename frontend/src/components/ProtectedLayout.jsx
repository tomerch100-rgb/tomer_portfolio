import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import Footer from './Footer';

function ProtectedLayout() {
    const { isAuthenticated, isVerifying } = useSelector((state) => state.auth);

    if (isVerifying) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return (
        <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
            <Navbar />
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}

export default ProtectedLayout;