import { createBrowserRouter, RouterProvider } from "react-router-dom"
import NotFound from "./pages/NotFound"
import LoginForm from "./pages/LoginPage";
import ProtectedLayout from "./components/ProtectedLayout";
import Dashbord from "./pages/Dashbord";
import Orders from "./pages/Orders";
import Watchlist from "./pages/Watchlist";
import RegisterForm from "./pages/Register";
import Home from "./pages/Home";
import StockPage from "./pages/Chart";
import TransactionHistory from "./pages/TransactionHistory";

import DeepPortfolioAnalysis from "./pages/DeepPortfolioAnalysis";
import PortfolioAnalytics from "./pages/PortfolioAnalytics";
import AIStockResearch from "./pages/AIStockResearch";

import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { checkAuth } from "./services/authService"
import { loginSuccess, verificationCompleted } from "./store/authSlice"
import { WebSocketProvider } from "./context/WebSocketContext"

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
    errorElement: <NotFound />,
  },
  {
    path: "/login",
    element: <LoginForm />,
  },
  {
    path: "/register",
    element: <RegisterForm />
  },
  {
    element: <ProtectedLayout />,

    children: [
      { path: "/dashbord", element: <Dashbord /> },
      { path: "/deep-analysis", element: <DeepPortfolioAnalysis /> },
      { path: "/analytics", element: <PortfolioAnalytics /> },
      { path: "/ai-research", element: <AIStockResearch /> },
      { path: "/ai-research/:ticker", element: <AIStockResearch /> },
      { path: "/orders", element: <Orders /> },
      { path: "/history", element: <TransactionHistory /> },
      { path: "/watchlist/:ticker", element: <Watchlist /> },
      { path: "/charts", element: <StockPage /> },
      { path: "/charts/:ticker", element: <StockPage /> }
    ],
  },
]);

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const userData = await checkAuth()
        dispatch(loginSuccess(userData))
      } catch (error) {
        dispatch(verificationCompleted())
      }
    }
    verifyUser()
  }, [dispatch])

  return (
    <WebSocketProvider>
      <RouterProvider router={router} />
    </WebSocketProvider>
  )
}

export default App