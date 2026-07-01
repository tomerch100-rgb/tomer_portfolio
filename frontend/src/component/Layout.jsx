import { Outlet } from 'react-router-dom';
import Navbar from './Layout';
import Footer from './Footer';

function Layout() {
    return (
        <div>
            <Navbar />
            <main >
                <Outlet />
            </main>

            <Footer />
        </div>
    );
}

export default Layout;







