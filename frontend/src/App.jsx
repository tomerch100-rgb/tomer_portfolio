import { createBrowserRouter, RouterProvider } from "react-router-dom"
import NotFound from "./pages/NotFound"
import LoginForm from "./pages/LoginPage";
import ProtectedLayout from "./components/ProtectedLayout";
import Dashbord from "./pages/Dashbord";
import Orders from "./pages/Orders";
import Watchlist from "./pages/Watchlist";
import RegisterForm from "./pages/Register";
import Home from "./pages/Home";


import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { checkAuth } from "./services/authService"
import { loginSuccess, verificationCompleted } from "./store/authSlice"

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
      { path: "/orders", element: <Orders /> },
      { path: "/watchlist/:ticker", element: <Watchlist /> }
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

  return <RouterProvider router={router} />

}

export default App