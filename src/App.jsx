// App.jsx
import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import useMatchStore from './store/matchStore.js'

import RootLayout from "./layouts/RootLayout"
import Home from "./pages/Home"
import Match from "./pages/Match"
import Result from "./pages/Result"
import Leaderboard from "./pages/Leaderboard"
import Login from "./components/auth/login"

function App() {
  const checkAuth = useMatchStore((s) => s.checkAuth)

  // Check auth on every page load/refresh
  useEffect(() => {
    checkAuth()
  }, [])

  const router = createBrowserRouter([
    {
      path: "/",
      element: <RootLayout />,
      children: [
        { index: true,             element: <Home /> },
        { path: "login",           element: <Login /> },
        { path: "match/:matchId",  element: <Match /> },
        { path: "result/:matchId", element: <Result /> },
        { path: "leaderboard",     element: <Leaderboard /> },
      ],
    },
  ])

  return <RouterProvider router={router} />
}

export default App