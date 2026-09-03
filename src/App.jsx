// App.jsx
import { useEffect, useMemo } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"
import useMatchStore from './store/matchStore.js'
import socket, { ensureSocket } from './socket/socket.js'

import RootLayout from "./layouts/RootLayout"
import Home from "./pages/Home"
import Match from "./pages/Match"
import Result from "./pages/Result"
import Leaderboard from "./pages/Leaderboard"
import Profile from "./pages/Profile"
/* Pricing and Insights are intentionally NOT routed — the pages are kept in
   src/pages/ so the work isn't lost, but they aren't reachable by users yet.
   Re-add the routes below to bring either one back. */
import Login from "./components/auth/login"
import useThemeStore from "./store/themeStore.js"

function App() {
  const checkAuth       = useMatchStore((s) => s.checkAuth)
  const isAuthenticated = useMatchStore((s) => s.isAuthenticated)
  const theme           = useThemeStore((s) => s.theme)

  // Check auth on every page load/refresh
  useEffect(() => {
    checkAuth()
  }, [])

  /* The socket authenticates from the login cookie in its handshake. On a
     cold load that cookie may not exist yet (logged out, or checkAuth
     still in flight), and a rejected handshake won't retry on its own.
     Once auth is confirmed, (re)connect so matchmaking has a live socket;
     drop it on logout so a stale authenticated socket doesn't linger. */
  useEffect(() => {
    if (isAuthenticated) {
      ensureSocket()
    } else if (socket.connected) {
      socket.disconnect()
    }
  }, [isAuthenticated])

  // Apply the persisted theme to <html> as soon as the app mounts.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  /* Build the router once. App re-renders whenever auth state changes (see
     the socket effect above); recreating the router on those renders resets
     RouterProvider to the current URL and swallows any in-flight navigate()
     — which left users stranded on the login "welcome" screen. */
  const router = useMemo(() => createBrowserRouter([
    {
      path: "/",
      element: <RootLayout />,
      children: [
        { index: true,             element: <Home /> },
        { path: "login",           element: <Login /> },
        { path: "match/:matchId",  element: <Match /> },
        { path: "result/:matchId", element: <Result /> },
        { path: "leaderboard",     element: <Leaderboard /> },
        { path: "profile",         element: <Profile /> },
        /* Anything unrouted (including /pricing and /insights) goes home
           rather than hitting the router's default error screen. */
        { path: "*",               element: <Navigate to="/" replace /> },
      ],
    },
  ]), [])

  return <RouterProvider router={router} />
}

export default App