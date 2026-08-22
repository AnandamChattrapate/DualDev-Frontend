import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState, useCallback, useRef } from "react"
import axios from "axios"
import { v4 as uuidv4 } from "uuid"
import socket from "../socket/socket"
import useMatchStore from "../store/matchStore"
import useThemeStore from "../store/themeStore"
import { tokenize } from "../utils/tokenizer"
import ProblemPanel from "../components/match/ProblemPanel"
import EditorPanel from "../components/match/EditorPanel"
import OpponentPanel from "../components/match/OpponentPanel"
import {
  IconPlay, IconCheck, IconSparkles, IconSun, IconMoon, IconClose,
  IconChat, IconSend,
} from "../components/match/icons"

const CHAT_LIMIT = 60
const CHAT_MAX_LEN = 300

/* Match-page CSS. Deliberately shares the home page's palette, type scale and
   flat-surface treatment so the app reads as one product — the tokens below
   mirror :root / [data-theme] in index.css, re-exposed under the short names
   the match sub-panels were built against. */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    height: 100vh;
    overflow: hidden;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--muted); }

  .tabnum { font-variant-numeric: tabular-nums; }

  @keyframes shimmer-block { 0%,100% { opacity: 0.28; } 50% { opacity: 0.62; } }
  @keyframes pulse-red   { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
  @keyframes pulse-green { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes slide-down  { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fade-in     { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin        { to { transform: rotate(360deg); } }
  @keyframes typing-bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-3px); } }

  .fade-in { animation: fade-in 0.2s ease-out forwards; }
  .progress-bar-fill { transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1); }

  /* ── Buttons ── */
  .btn {
    font-family: var(--sans); font-size: 13px; font-weight: 600;
    letter-spacing: 0; padding: 0 12px; height: 32px; border-radius: 4px;
    border: 1px solid var(--border); background: transparent; color: var(--text);
    cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
    display: inline-flex; align-items: center; justify-content: center;
    gap: 6px; white-space: nowrap;
  }
  .btn:hover:not(:disabled) { border-color: var(--muted); }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-icon { padding: 0; width: 32px; }

  .btn-accent {
    background: var(--accent); border-color: var(--accent);
    color: var(--accent-ink); font-weight: 700;
  }
  .btn-accent:hover:not(:disabled) { filter: brightness(1.06); border-color: var(--accent); }

  .btn-ai { color: var(--text-2); }
  .btn-ai:hover:not(:disabled) { color: var(--text); border-color: var(--muted); }

  /* ── Surfaces ── */
  .panel {
    background: var(--s1); border: 1px solid var(--border);
    border-radius: 6px; overflow: hidden;
  }

  .panel-header {
    padding: 9px 12px; border-bottom: 1px solid var(--border); background: var(--s2);
    display: flex; align-items: center; gap: 8px;
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em;
    color: var(--muted); text-transform: uppercase; flex-shrink: 0;
  }
  .panel-header .label { color: var(--text); font-weight: 600; }

  .tc-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 4px;
    font-family: var(--mono); font-size: 12px; font-weight: 600;
    border: 1px solid transparent; letter-spacing: 0.02em;
  }
  .tc-pass { background: var(--accent-soft); border-color: var(--accent-line); color: var(--accent); }
  .tc-fail { background: var(--danger-soft); border-color: var(--danger-line); color: var(--danger); }
  .tc-wait { background: var(--s2); border-color: var(--border); color: var(--muted); }

  .ai-textarea {
    width: 100%; background: var(--bg);
    border: 1px solid var(--border); border-radius: 4px;
    color: var(--text); font-family: var(--sans); font-size: 14px;
    padding: 9px 11px; resize: none; line-height: 1.5;
    transition: border-color 0.15s ease; caret-color: var(--accent);
  }
  .ai-textarea:focus { outline: none; border-color: var(--muted); }
  .ai-textarea::placeholder { color: var(--muted); }

  .resizer {
    width: 6px; flex-shrink: 0; cursor: col-resize;
    background: transparent; margin: 0 1px;
    display: flex; align-items: center; justify-content: center;
  }
  .resizer::after {
    content: ""; width: 1px; height: 32px; border-radius: 2px;
    background: var(--border); transition: background 0.15s, height 0.15s;
  }
  .resizer:hover::after, .resizer.active::after { background: var(--muted); height: 56px; }

  .typing-dot {
    display: inline-block; width: 4px; height: 4px;
    border-radius: 50%; background: var(--accent);
    animation: typing-bounce 1.2s ease-in-out infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .typing-dot:nth-child(3) { animation-delay: 0.3s; }

  select.lang-select {
    background: var(--bg); border: 1px solid var(--border);
    color: var(--text); font-family: var(--mono); font-size: 13px;
    padding: 6px 10px; border-radius: 4px; cursor: pointer;
    transition: border-color 0.15s;
  }
  select.lang-select:focus { outline: none; border-color: var(--muted); }
  select.lang-select:hover { border-color: var(--muted); }

  /* ── Problem strip tabs ── */
  .strip-tabs {
    display: flex; gap: 4px; overflow-x: auto; overflow-y: hidden;
    flex: 1; min-width: 0; padding-bottom: 1px;
  }
  .strip-tabs::-webkit-scrollbar { height: 0; }
  .strip-tab {
    flex-shrink: 0; font-family: var(--sans); font-size: 13px; font-weight: 500;
    cursor: pointer; padding: 5px 11px; border-radius: 4px;
    border: 1px solid transparent; color: var(--muted);
    background: transparent; white-space: nowrap;
    transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
  }
  .strip-tab:hover { color: var(--text); }
  .strip-tab.active { color: var(--text); background: var(--s1); border-color: var(--border); }

  /* ── Brand ── */
  .m-brand {
    font-family: var(--display); font-weight: 800; font-size: 22px;
    letter-spacing: -0.05em; line-height: 1; white-space: nowrap;
    display: inline-flex; align-items: baseline;
  }
  .m-brand .b-dual { color: var(--text); }
  .m-brand .b-dev  { color: var(--logo); }

  .diff-badge {
    padding: 3px 8px; border-radius: 4px; font-size: 11px;
    font-family: var(--mono); font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; border: 1px solid;
  }
  .topbar-divider { width: 1px; height: 20px; background: var(--border); flex-shrink: 0; }

  /* ── Chat ── */
  .chat-msg {
    display: flex; flex-direction: column; gap: 2px;
    max-width: 85%; animation: fade-in 0.18s ease-out forwards;
  }
  .chat-msg.is-me  { align-self: flex-end;   align-items: flex-end; }
  .chat-msg.is-opp { align-self: flex-start; align-items: flex-start; }
  .chat-bubble {
    padding: 7px 10px; border-radius: 6px;
    font-size: 13px; line-height: 1.45; word-break: break-word;
    border: 1px solid var(--border); background: var(--s2); color: var(--text);
  }
  .chat-msg.is-me .chat-bubble {
    background: var(--accent-soft); border-color: var(--accent-line);
  }
  .chat-who {
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--muted);
  }
  .chat-input {
    flex: 1; min-width: 0; background: var(--bg);
    border: 1px solid var(--border); border-radius: 4px;
    color: var(--text); font-family: var(--sans); font-size: 13px;
    padding: 0 10px; height: 32px;
    transition: border-color 0.15s ease; caret-color: var(--accent);
  }
  .chat-input:focus { outline: none; border-color: var(--muted); }
  .chat-input::placeholder { color: var(--muted); }

  .chat-badge {
    position: absolute; top: -4px; right: -4px;
    min-width: 15px; height: 15px; padding: 0 4px;
    border-radius: 8px; background: var(--accent); color: var(--accent-ink);
    font-family: var(--mono); font-size: 9px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Accessibility ── */
  .btn:focus-visible,
  .strip-tab:focus-visible,
  select.lang-select:focus-visible,
  .ai-textarea:focus-visible,
  .chat-input:focus-visible,
  .icon-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`

/* Palettes are the home page's tokens verbatim, plus the few match-only
   roles (danger/warn/logo) the sub-panels need. */
const PALETTE = {
  dark: {
    "--bg": "#0A0A0A", "--s1": "#111111", "--s2": "#161616", "--border": "#2A2A2A",
    "--text": "#E8E8E8", "--text-2": "#888888", "--muted": "#555555",
    "--accent": "#00FF85", "--accent-ink": "#0A0A0A",
    "--accent-soft": "rgba(0,255,133,0.08)", "--accent-line": "rgba(0,255,133,0.25)",
    "--accent-rgb": "0,255,133",
    "--danger": "#FF4444", "--danger-soft": "rgba(255,68,68,0.08)", "--danger-line": "rgba(255,68,68,0.25)",
    "--warn": "#FFAA00", "--logo": "#F4B183",
  },
  light: {
    "--bg": "#F5F4F0", "--s1": "#FFFFFF", "--s2": "#ECEAE4", "--border": "#D8D6CE",
    "--text": "#16160F", "--text-2": "#5B5B52", "--muted": "#8A8A80",
    "--accent": "#00B85F", "--accent-ink": "#FFFFFF",
    "--accent-soft": "rgba(0,184,95,0.10)", "--accent-line": "rgba(0,184,95,0.30)",
    "--accent-rgb": "0,184,95",
    "--danger": "#DC2626", "--danger-soft": "rgba(220,38,38,0.08)", "--danger-line": "rgba(220,38,38,0.25)",
    "--warn": "#B45309", "--logo": "#E06A00",
  },
}

const FONT_VARS = {
  "--mono": "'JetBrains Mono', ui-monospace, monospace",
  "--sans": "'DM Sans', system-ui, sans-serif",
  "--display": "'Manrope', sans-serif",
}

/* Small pill in the header that surfaces *my* socket health. Hidden when
   the connection is healthy. */
function MyConnectionPill() {
  const myConnection = useMatchStore((s) => s.myConnection)
  if (myConnection === "connected") return null
  const isReconnecting = myConnection === "reconnecting"
  const color = isReconnecting ? "var(--warn)" : "var(--danger)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "0 10px", height: 32, borderRadius: 4,
        border: `1px solid ${color}`,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: color,
          animation: "pulse-red 1.2s ease-in-out infinite",
        }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", color }}>
          {isReconnecting ? "RECONNECTING" : "OFFLINE"}
        </span>
      </div>
      <button className="btn" onClick={() => window.location.reload()} style={{ color }}>
        Reload
      </button>
    </div>
  )
}

export default function Match() {
  const { matchId } = useParams()
  const navigate    = useNavigate()

  const problem            = useMatchStore((s) => s.problem)
  const opponent           = useMatchStore((s) => s.opponent)
  const myLanguage         = useMatchStore((s) => s.myLanguage)
  const myCode             = useMatchStore((s) => s.codeByLanguage[s.myLanguage])
  const myTCResults        = useMatchStore((s) => s.myTCResults)
  const myVerdict          = useMatchStore((s) => s.myVerdict)
  const isSubmitting       = useMatchStore((s) => s.isSubmitting)
  const oppTestsPassed     = useMatchStore((s) => s.oppTestsPassed)
  const oppTotalTests      = useMatchStore((s) => s.oppTotalTests)
  const oppSilhouette      = useMatchStore((s) => s.oppSilhouette)
  const timeLeft           = useMatchStore((s) => s.timeLeft)
  const aiUsageLeft        = useMatchStore((s) => s.aiUsageLeft)
  const firstBlood         = useMatchStore((s) => s.firstBlood)
  const firstBloodBy       = useMatchStore((s) => s.firstBloodBy)
  const userId             = useMatchStore((s) => s.currentUser?._id)

  const theme       = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const darkMode    = theme === "dark"

  const setMyVerdict          = useMatchStore((s) => s.setMyVerdict)
  const setOppProgress        = useMatchStore((s) => s.setOppProgress)
  const setSubmitting         = useMatchStore((s) => s.setSubmitting)
  const setOppSilhouette      = useMatchStore((s) => s.setOppSilhouette)
  const tickTimer             = useMatchStore((s) => s.tickTimer)
  const setTimeLeftFromServer = useMatchStore((s) => s.setTimeLeftFromServer)
  const incrementSubmission   = useMatchStore((s) => s.incrementSubmission)
  const incrementAIUsage      = useMatchStore((s) => s.incrementAIUsage)
  const setAIReview           = useMatchStore((s) => s.setAIReview)
  const setWinner             = useMatchStore((s) => s.setWinner)
  const setOppPresence        = useMatchStore((s) => s.setOppPresence)
  const setOppOffline         = useMatchStore((s) => s.setOppOffline)
  const setOppOnline          = useMatchStore((s) => s.setOppOnline)
  const setMyConnection       = useMatchStore((s) => s.setMyConnection)
  const fetchActiveMatch      = useMatchStore((s) => s.fetchActiveMatch)
  const initMatch             = useMatchStore((s) => s.initMatch)
  const setMatchEndTime       = useMatchStore((s) => s.setMatchEndTime)
  const applyFinalResult      = useMatchStore((s) => s.applyFinalResult)

  const [runResults,     setRunResults]     = useState([])
  const [isRunning,      setIsRunning]      = useState(false)
  const [aiResponse,     setAIResponse]     = useState(null)
  const [aiLoading,      setAILoading]      = useState(false)
  const [aiQuestion,     setAIQuestion]     = useState("")
  const [showAIPanel,    setShowAIPanel]    = useState(false)
  const [matchEnded,     setMatchEnded]     = useState(false)
  const [rightW,         setRightW]         = useState(340)
  const [networkOffline, setNetworkOffline] = useState(false)
  const [showBackOnline, setShowBackOnline] = useState(false)
  const [activeProblemTab, setActiveProblemTab] = useState("description")

  /* Chat is intentionally ephemeral — kept in component state only, never
     persisted or replayed. Closing the match or reloading clears it. */
  const [chatMessages, setChatMessages] = useState([])
  const [chatDraft,    setChatDraft]    = useState("")
  const [showChat,     setShowChat]     = useState(false)
  const [chatUnread,   setChatUnread]   = useState(0)
  const showChatRef = useRef(false)
  const chatEndRef  = useRef(null)

  useEffect(() => { showChatRef.current = showChat }, [showChat])

  const myTestsPassed = myTCResults?.filter(tc => tc.passed).length || 0
  const oppMessages   = chatMessages.filter((m) => m.from === "opp")

  // ── Theme: drive the match-page CSS variables from the sitewide theme ──
  useEffect(() => {
    const root = document.documentElement
    const vars = { ...PALETTE[darkMode ? "dark" : "light"], ...FONT_VARS }
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
    return () => Object.keys(vars).forEach((k) => root.style.removeProperty(k))
  }, [darkMode])

  useEffect(() => {
    const id = "match-global-css"
    let el = document.getElementById(id)
    if (!el) {
      el = document.createElement("style")
      el.id = id
      document.head.appendChild(el)
    }
    el.textContent = GLOBAL_CSS
    /* Remove the tag on unmount so body/root height:100vh + overflow:hidden
       don't bleed into the Result page and compress everything into one viewport. */
    return () => { document.getElementById(id)?.remove() }
  }, [])

  /* One-time sync on mount */
  useEffect(() => {
    if (!matchId) return
    axios.get(`${import.meta.env.VITE_API_URL}/api/match/${matchId}/timer`, { withCredentials: true })
      .then(r => { if (r.data.match?.timeLeft !== undefined) setTimeLeftFromServer(r.data.match.timeLeft) })
      .catch(() => {})
  }, [matchId])

  /* Periodic resync every 40s so both users stay in lockstep. Each client's
     local tickTimer() can drift if the tab was backgrounded or if the two
     browsers loaded the page at different times. */
  useEffect(() => {
    if (!matchId || matchEnded) return
    const iv = setInterval(() => {
      axios.get(`${import.meta.env.VITE_API_URL}/api/match/${matchId}/timer`, { withCredentials: true })
        .then(r => { if (r.data.match?.timeLeft !== undefined) setTimeLeftFromServer(r.data.match.timeLeft) })
        .catch(() => {})
    }, 40000)
    return () => clearInterval(iv)
  }, [matchId, matchEnded])

  /* Restore match data when localStorage is empty (new browser / cleared storage).
     If the match is no longer active, redirect home so the user isn't stuck. */
  useEffect(() => {
    if (problem || !matchId) return
    let cancelled = false
    const giveUpTimer = setTimeout(() => {
      if (!cancelled) navigate('/', { replace: true })
    }, 10000)

    fetchActiveMatch().then(active => {
      clearTimeout(giveUpTimer)
      if (cancelled) return
      if (active?.active && active?.matchId === matchId && active.problem && active.opponent) {
        initMatch({ matchId: active.matchId, opponent: active.opponent, problem: active.problem })
      } else {
        navigate('/', { replace: true })
      }
    }).catch(() => {
      clearTimeout(giveUpTimer)
      if (!cancelled) navigate('/', { replace: true })
    })

    return () => { cancelled = true; clearTimeout(giveUpTimer) }
  }, [matchId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!matchId) return
    socket.emit("join_match", { matchId })
  }, [matchId])

  useEffect(() => {
    if (!matchId || matchEnded) return
    const iv = setInterval(() => {
      const t = useMatchStore.getState().timeLeft
      if (t <= 0) { clearInterval(iv); handleMatchEnd(); return }
      tickTimer()
    }, 1000)
    return () => clearInterval(iv)
  }, [matchId, matchEnded]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!myCode || !matchId) return
    const t = setTimeout(() => {
      socket.emit("code_change", { matchId, tokens: tokenize(myCode, myLanguage) })
    }, 300)
    return () => clearTimeout(t)
  }, [myCode, myLanguage, matchId])

  /* ─────────────────────────────────────────────────────────
     PRESENCE — my activity → opponent's status badge
     ─────────────────────────────────────────────────────────
     Three signals drive my outgoing presence:
       1. myCode changes        → state='coding'
       2. activeProblemTab      → state='reading', section=<tab>
       3. inactivity timer (4s) → state='thinking' */
  useEffect(() => {
    if (!matchId) return
    socket.emit("presence", { matchId, state: "reading", section: activeProblemTab })
  }, [matchId]) // eslint-disable-line react-hooks/exhaustive-deps

  const lastTypingEmitRef = useRef(0)
  useEffect(() => {
    if (!matchId || !myCode) return
    const now = Date.now()
    if (now - lastTypingEmitRef.current > 1500) {
      socket.emit("presence", { matchId, state: "coding" })
      lastTypingEmitRef.current = now
    }
    const idle = setTimeout(() => {
      socket.emit("presence", { matchId, state: "thinking" })
    }, 4000)
    return () => clearTimeout(idle)
  }, [myCode, matchId])

  useEffect(() => {
    if (!matchId) return
    socket.emit("presence", { matchId, state: "reading", section: activeProblemTab })
  }, [activeProblemTab, matchId])

  /* My own connection state — drives the "RECONNECTING" pill in my UI. */
  useEffect(() => {
    const onConnect    = () => setMyConnection("connected")
    const onDisconnect = () => setMyConnection("reconnecting")
    const onReconnect  = () => setMyConnection("connected")
    socket.on("connect",    onConnect)
    socket.on("disconnect", onDisconnect)
    socket.io?.on?.("reconnect_attempt", onDisconnect)
    socket.io?.on?.("reconnect",         onReconnect)
    setMyConnection(socket.connected ? "connected" : "reconnecting")
    return () => {
      socket.off("connect",    onConnect)
      socket.off("disconnect", onDisconnect)
      socket.io?.off?.("reconnect_attempt", onDisconnect)
      socket.io?.off?.("reconnect",         onReconnect)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Browser-level offline / online detection. window.offline fires when the
     device truly loses internet — separate from the socket reconnect events
     above, which only track the WebSocket connection. */
  useEffect(() => {
    const goOffline = () => {
      setNetworkOffline(true)
      setMyConnection("offline")
    }
    const goOnline = () => {
      setNetworkOffline(false)
      setMyConnection("reconnecting")
      setShowBackOnline(true)
      setTimeout(() => setShowBackOnline(false), 3000)
    }
    window.addEventListener("offline", goOffline)
    window.addEventListener("online",  goOnline)
    return () => {
      window.removeEventListener("offline", goOffline)
      window.removeEventListener("online",  goOnline)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    socket.on("verdict", ({ userId: sid, results, totalTests }) => {
      if (sid !== userId) return
      // Count from the actual result objects — don't trust the server-sent verdict string
      const passed = Array.isArray(results) ? results.filter(r => r.passed).length : 0
      const total  = totalTests || results?.length || 0
      const verdict = passed === total && total > 0 ? "Accepted" : `${passed}/${total} Passed`
      setMyVerdict({ verdict, results, testsPassed: passed, totalTests: total })
      setSubmitting(false)
      incrementSubmission()
      socket.emit("tc_update", { matchId, testsPassed: passed, totalTests: total })
    })
    socket.on("run_result",         ({ results })                              => { setRunResults(results || []); setIsRunning(false) })
    socket.on("opponent_tc_update", ({ userId: sid, testsPassed, totalTests }) => { if (sid !== userId) setOppProgress({ testsPassed, totalTests }) })
    socket.on("opponent_tokens",    ({ tokens })                               => { setOppSilhouette(tokens) })

    socket.on("opponent_chat", ({ text, ts }) => {
      if (!text) return
      setChatMessages((prev) => [
        ...prev.slice(-(CHAT_LIMIT - 1)),
        { id: `${ts}-${Math.random().toString(36).slice(2, 8)}`, from: "opp", text, ts },
      ])
      if (!showChatRef.current) setChatUnread((n) => n + 1)
    })

    socket.on("match_result", ({ winnerId, aiReview, players }) => {
      setMatchEndTime(Date.now())
      setWinner(winnerId)
      if (aiReview) setAIReview(aiReview)
      if (players) {
        const oppId = useMatchStore.getState().opponent?.userId
        applyFinalResult({ mine: players[userId], opp: oppId ? players[oppId] : null })
      }
      setMatchEnded(true)
      navigate(`/result/${matchId}`)
    })

    /* Presence: opponent told us what they're doing right now */
    socket.on("opponent_presence", ({ userId: sid, state, section }) => {
      if (sid === userId) return
      setOppPresence({ state, section })
    })
    /* Backend tracked their socket dropping for more than 3s */
    socket.on("opponent_offline", ({ userId: sid }) => {
      if (sid === userId) return
      setOppOffline()
    })
    /* They (re)joined the match room — either fresh accept or a reconnect */
    socket.on("opponent_joined", ({ userId: sid }) => {
      if (sid === userId) return
      setOppOnline()
    })

    return () => [
      "verdict", "run_result", "opponent_tc_update", "opponent_tokens", "opponent_chat",
      "match_result", "opponent_presence", "opponent_offline", "opponent_joined",
    ].forEach(e => socket.off(e))
  }, [matchId, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Keep the chat scrolled to the newest message while it's open. */
  useEffect(() => {
    if (showChat) chatEndRef.current?.scrollIntoView({ block: "end" })
  }, [chatMessages, showChat])

  const openChat = () => {
    setShowChat(true)
    setChatUnread(0)
  }

  const sendChat = () => {
    const text = chatDraft.trim().slice(0, CHAT_MAX_LEN)
    if (!text || !matchId) return
    socket.emit("chat", { matchId, text })
    setChatMessages((prev) => [
      ...prev.slice(-(CHAT_LIMIT - 1)),
      { id: `${Date.now()}-me`, from: "me", text, ts: Date.now() },
    ])
    setChatDraft("")
  }

  const handleMatchEnd = useCallback(async () => {
    if (matchEnded) return
    setMatchEnded(true)
    socket.emit("match_ended", {
      matchId, userId, code: myCode, language: myLanguage,
      testsPassed:     useMatchStore.getState().myTestsPassed,
      submissionCount: useMatchStore.getState().submissionCount,
      aiUsageCount:    useMatchStore.getState().aiUsageCount,
    })
    // Navigate immediately instead of sitting on a frozen match screen while
    // the server judges the match — Result.jsx owns the "evaluating" state and
    // picks up match_result itself, since this page unmounts right after.
    navigate(`/result/${matchId}`)
  }, [matchId, userId, myCode, myLanguage, matchEnded, navigate])

  const runCode = async () => {
    try {
      setIsRunning(true); setRunResults([])
      const cases = (problem?.sampleTestCases || []).map((tc, i) => ({ id: tc.id || `tc${i+1}`, input: tc.input, expected: tc.output }))
      if (!cases.length) { setIsRunning(false); return }
      await axios.post(`${import.meta.env.VITE_API_URL}/api/submit`,
        { language: myLanguage, code: myCode, testCases: cases, jobId: uuidv4(), matchId: null, userId },
        { withCredentials: true })
    } catch { setIsRunning(false) }
  }

  const submitCode = async () => {
    try {
      setSubmitting(true)
      const cases = (problem?.hiddenTestCases || []).map((tc, i) => ({ id: tc.id || `tc${i+1}`, input: tc.input, expected: tc.output }))
      if (!cases.length) { setSubmitting(false); return }
      await axios.post(`${import.meta.env.VITE_API_URL}/api/submit`,
        { language: myLanguage, code: myCode, testCases: cases, jobId: uuidv4(), matchId, userId },
        { withCredentials: true })
    } catch { setSubmitting(false) }
  }

  const askAI = async () => {
    if (aiUsageLeft <= 0 || !aiQuestion.trim() || !incrementAIUsage()) return
    try {
      setAILoading(true)
      await axios.post(`${import.meta.env.VITE_API_URL}/api/match/ai-usage`, { matchId }, { withCredentials: true })
      const r = await axios.post(`${import.meta.env.VITE_API_URL}/api/ai/hint`,
        { question: aiQuestion, problemTitle: problem?.title, description: problem?.description, code: myCode, language: myLanguage },
        { withCredentials: true })
      setAIResponse(r.data.hint); setAIQuestion("")
    } catch { /* hint failed — usage is already counted, nothing to surface */ }
    finally { setAILoading(false) }
  }

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`

  const timerColor = timeLeft <= 60 ? "var(--danger)" : timeLeft <= 300 ? "var(--warn)" : "var(--text)"

  const diffStyle = (d) => d === "Easy"
    ? { color: "var(--accent)", borderColor: "var(--accent-line)", background: "var(--accent-soft)" }
    : d === "Medium"
    ? { color: "var(--warn)", borderColor: "var(--border)", background: "var(--s2)" }
    : { color: "var(--danger)", borderColor: "var(--danger-line)", background: "var(--danger-soft)" }

  if (!problem) return (
    <div style={{ background: "var(--bg)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, fontFamily: "var(--mono)", color: "var(--muted)", fontSize: 12, letterSpacing: "0.18em" }}>
      <div style={{ width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      LOADING MATCH
    </div>
  )

  return (
    <div style={{ background: "var(--bg)", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", padding: 8, gap: 8 }}>
      {/* Full-screen no-internet overlay */}
      {networkOffline && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "var(--bg)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
        }}>
          <div style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>
            No internet connection
          </div>
          <div style={{ fontSize: 14, color: "var(--text-2)", maxWidth: 380, textAlign: "center", lineHeight: 1.6 }}>
            Your match is paused. It will reconnect automatically once your connection is restored.
          </div>
          <button className="btn" onClick={() => window.location.reload()} style={{ marginTop: 6 }}>
            Reload page
          </button>
        </div>
      )}

      {/* "Back online" toast */}
      {showBackOnline && (
        <div style={{
          position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: "var(--s1)",
          border: "1px solid var(--accent-line)", borderRadius: 6,
          padding: "9px 20px", fontSize: 13, fontWeight: 600,
          color: "var(--accent)",
          animation: "slide-down 0.25s ease forwards",
        }}>
          Back online
        </div>
      )}

      {firstBlood && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 500,
            background: "var(--s1)", borderBottom: "1px solid var(--border)",
            padding: "7px 0", textAlign: "center",
            fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em",
            color: "var(--text-2)", textTransform: "uppercase",
            animation: "slide-down 0.3s ease forwards",
          }}
        >
          First blood — {firstBloodBy === "me" ? "you" : opponent?.username || "opponent"} passed TC1
        </div>
      )}

      {/* ═══════════════ TOP BAR ═══════════════ */}
      <header
        className="panel"
        style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}
      >
        <span className="m-brand">
          <span className="b-dual">DUAL</span><span className="b-dev">DEV</span>
        </span>

        <span className="topbar-divider" />

        {/* Problem title + difficulty + topic */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }}>
            {problem.title}
          </span>
          <span className="diff-badge" style={diffStyle(problem.difficulty)}>{problem.difficulty}</span>
          {problem.topic && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {problem.topic.replace(/([a-z])([A-Z])/g, '$1 $2')}
            </span>
          )}
        </div>

        {/* Chat */}
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-icon"
            onClick={() => (showChat ? setShowChat(false) : openChat())}
            aria-pressed={showChat}
            aria-label={showChat ? "Close chat" : "Open chat"}
            title="Chat"
            style={showChat ? { borderColor: "var(--muted)", background: "var(--s2)" } : undefined}
          >
            <IconChat s={15} />
          </button>
          {chatUnread > 0 && !showChat && (
            <span className="chat-badge">{chatUnread > 9 ? "9+" : chatUnread}</span>
          )}
        </div>

        <button
          className="btn btn-ai"
          onClick={() => setShowAIPanel((v) => !v)}
          aria-pressed={showAIPanel}
          aria-label="Toggle AI assistant"
          style={showAIPanel ? { borderColor: "var(--muted)", background: "var(--s2)", color: "var(--text)" } : undefined}
        >
          <IconSparkles s={13} /> AI <span style={{ opacity: 0.6 }}>{aiUsageLeft}</span>
        </button>
        <button className="btn" onClick={runCode} disabled={isRunning || timeLeft <= 0 || matchEnded} aria-label="Run sample tests">
          <IconPlay s={12} /> {isRunning ? "Running" : "Run"}
        </button>
        <button className="btn btn-accent" onClick={submitCode} disabled={isSubmitting || timeLeft <= 0 || matchEnded} aria-label="Submit solution">
          <IconCheck s={13} /> {isSubmitting ? "Submitting" : "Submit"}
        </button>

        <span className="topbar-divider" />

        <MyConnectionPill />

        {/* Timer */}
        <div
          className="tabnum"
          style={{
            display: "flex", alignItems: "center", height: 32, padding: "0 12px", borderRadius: 4,
            border: "1px solid var(--border)",
            fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700,
            letterSpacing: "0.04em", color: timerColor,
          }}
        >
          {formatTime(timeLeft)}
        </div>

        <button
          className="btn btn-icon"
          onClick={toggleTheme}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <IconSun s={15} /> : <IconMoon s={15} />}
        </button>
      </header>

      {/* ═══════════════ PROBLEM STRIP ═══════════════ */}
      <ProblemPanel problem={problem} activeTab={activeProblemTab} onTabChange={setActiveProblemTab} />

      {/* ═══════════════ BODY ═══════════════ */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>
        <EditorPanel
          myLanguage={myLanguage}
          runResults={runResults}
          myVerdict={myVerdict}
          myTCResults={myTCResults}
          myTestsPassed={myTestsPassed}
        />

        <div
          className="resizer"
          onMouseDown={(e) => {
            e.currentTarget.classList.add("active")
            const el = e.currentTarget
            const onMove = (ev) => setRightW((w) => Math.min(560, Math.max(240, w - ev.movementX)))
            const onUp = () => {
              el.classList.remove("active")
              window.removeEventListener("mousemove", onMove)
              window.removeEventListener("mouseup", onUp)
            }
            window.addEventListener("mousemove", onMove)
            window.addEventListener("mouseup", onUp)
          }}
        />

        <OpponentPanel
          opponent={opponent}
          oppSilhouette={oppSilhouette}
          oppTestsPassed={oppTestsPassed}
          oppTotalTests={oppTotalTests}
          width={rightW}
          messages={oppMessages}
          onOpenChat={openChat}
        />

        {/* Chat panel */}
        {showChat && (
          <div
            className="panel fade-in"
            style={{
              position: "absolute", bottom: 0, right: 0, width: 320, maxWidth: "calc(100% - 16px)",
              height: 360, zIndex: 70, display: "flex", flexDirection: "column",
              boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
            }}
          >
            <div className="panel-header">
              <IconChat s={13} />
              <span className="label">Chat</span>
              <span style={{ marginLeft: "auto", textTransform: "none", letterSpacing: 0, fontSize: 10 }}>
                not saved
              </span>
              <button
                className="icon-btn"
                onClick={() => setShowChat(false)}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "inline-flex", padding: 2, borderRadius: 4 }}
                title="Close chat"
                aria-label="Close chat"
              ><IconClose s={14} /></button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {chatMessages.length === 0 ? (
                <p style={{ margin: "auto", fontSize: 13, color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
                  Say something to your opponent.<br />Messages disappear when the match ends.
                </p>
              ) : (
                chatMessages.map((m) => (
                  <div key={m.id} className={`chat-msg ${m.from === "me" ? "is-me" : "is-opp"}`}>
                    <span className="chat-who">{m.from === "me" ? "You" : opponent?.username || "Opponent"}</span>
                    <span className="chat-bubble">{m.text}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: 10, display: "flex", gap: 8 }}>
              <input
                className="chat-input"
                value={chatDraft}
                maxLength={CHAT_MAX_LEN}
                placeholder="Message…"
                aria-label="Chat message"
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat() } }}
              />
              <button
                className="btn btn-icon"
                onClick={sendChat}
                disabled={!chatDraft.trim()}
                aria-label="Send message"
                title="Send"
              >
                <IconSend s={14} />
              </button>
            </div>
          </div>
        )}

        {/* AI floating panel */}
        {showAIPanel && (
          <div
            className="panel fade-in"
            style={{ position: "absolute", top: 0, right: 0, width: 340, maxWidth: "calc(100% - 16px)", zIndex: 60, boxShadow: "0 8px 28px rgba(0,0,0,0.18)" }}
          >
            <div className="panel-header">
              <IconSparkles s={13} />
              <span className="label">AI Assistant</span>
              <span style={{ marginLeft: "auto" }}>{aiUsageLeft} left</span>
              <button
                className="icon-btn"
                onClick={() => setShowAIPanel(false)}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "inline-flex", padding: 2, borderRadius: 4 }}
                title="Close AI assistant"
                aria-label="Close AI assistant"
              ><IconClose s={14} /></button>
            </div>
            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <textarea
                className="ai-textarea"
                rows={3}
                value={aiQuestion}
                onChange={(e) => setAIQuestion(e.target.value)}
                placeholder="Ask for a hint about the problem…"
              />
              <button className="btn" onClick={askAI} disabled={aiLoading || aiUsageLeft <= 0} style={{ justifyContent: "center" }}>
                {aiLoading ? "Thinking…" : "Ask AI"}
              </button>
              {aiResponse && (
                <div style={{
                  background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4,
                  padding: "10px 12px", fontSize: 14, lineHeight: 1.6, color: "var(--text)",
                  maxHeight: 240, overflowY: "auto", whiteSpace: "pre-wrap",
                }}>
                  {aiResponse}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
