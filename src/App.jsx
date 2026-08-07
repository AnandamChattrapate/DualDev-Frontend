// App.jsx
import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import useMatchStore from './store/matchStore.js'

import RootLayout from "./layouts/RootLayout"
import Home from "./pages/Home"
import Match from "./pages/Match"
import Result from "./pages/Result"
import Leaderboard from "./pages/Leaderboard"
import Pricing from "./pages/Pricing"
import Insights from "./pages/Insights"
import Login from "./components/auth/login"
import useThemeStore from "./store/themeStore.js"

function App() {
  const checkAuth = useMatchStore((s) => s.checkAuth)
  const theme     = useThemeStore((s) => s.theme)

  // Check auth on every page load/refresh
  useEffect(() => {
    checkAuth()
  }, [])

  // Apply the persisted theme to <html> as soon as the app mounts.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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
        { path: "pricing",         element: <Pricing /> },
        { path: "insights",        element: <Insights /> },
      ],
    },
  ])

  return <RouterProvider router={router} />
}

export default App