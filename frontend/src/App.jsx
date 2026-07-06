import { createBrowserRouter, RouterProvider } from "react-router-dom"
import NotFound from "./pages/NotFound"
import LoginForm from "./pages/LoginPage";
import ProtectedLayout from "./component/ProtectedLayout";
import Dashbord from "./pages/dashbord";
import Orders from "./pages/orders";
import Watchlist from "./pages/Watchlist";
import RegisterForm from "./pages/Register";
import Home from "./pages/Home";


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

  return <RouterProvider router={router} />

}

export default App