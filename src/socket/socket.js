import { io } from 'socket.io-client'

/* One shared socket for the whole app. The backend authenticates the
   connection from the `token` cookie in the handshake (see server.js
   io.use(...)), so there's nothing to send in `auth` — the browser
   attaches the cookie automatically. */
const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
  // Keep retrying transient drops forever, with a capped backoff.
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 4000,
  timeout: 8000,
})

/* A handshake rejected by the server's auth middleware (e.g. the app
   loaded before the login cookie existed) sets socket.active = false,
   and socket.io will NOT retry on its own. That's the main source of a
   "dead" socket after login. Nudge it back to life on a short delay —
   once the cookie is present the next attempt succeeds. */
socket.on('connect_error', (err) => {
  if (socket.active) return // transient; socket.io is already retrying
  console.warn('socket connect_error (will retry):', err.message)
  setTimeout(() => { if (!socket.connected) socket.connect() }, 1000)
})

/* Call after login/logout, or any time an action needs the socket and
   finds it disconnected. Safe to call repeatedly — connect() is a no-op
   when already connected or connecting. */
export function ensureSocket() {
  if (!socket.connected) socket.connect()
}

export default socket
