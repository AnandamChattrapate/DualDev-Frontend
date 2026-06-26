import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState, useCallback, useRef } from "react"
import axios from "axios"
import { v4 as uuidv4 } from "uuid"
import socket from "../socket/socket"
import useMatchStore from "../store/matchStore"
import { tokenize } from "../utils/tokenizer"
import ProblemPanel from "../components/match/ProblemPanel"
import EditorPanel from "../components/match/EditorPanel"
import OpponentPanel from "../components/match/OpponentPanel"
import { IconPlay, IconCheck, IconSparkles, IconSun, IconMoon, IconClose } from "../components/match/icons"

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap');

  :root {
    --bg:         #0A0A0A;
    --s1:         #111111;
    --s2:         #161616;
    --border:     #2A2A2A;
    --accent:     #00FF85;
    --accent-dim: #00cc6a;
    --accent-rgb: 0,255,133;
    --text:       #E8E8E8;
    --muted:      #555555;
    --danger:     #FF4444;
    --warn:       #FFAA00;
    --logo:       #F4B183;
    --mono:       'JetBrains Mono', monospace;
    --sans:       'Space Grotesk', sans-serif;
    --display:    'Manrope', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body, #root {
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    height: 100vh;
    overflow: hidden;
    transition: background 0.3s ease, color 0.3s ease;
  }

  .dot-grid {
    background-image: radial-gradient(circle, rgba(var(--accent-rgb),0.05) 1px, transparent 1px);
    background-size: 22px 22px;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(var(--accent-rgb),0.5); }

  .tabnum { font-variant-numeric: tabular-nums; }

  @keyframes shimmer-block { 0%,100% { opacity: 0.28; } 50% { opacity: 0.62; } }
  @keyframes pulse-red {
    0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(255,68,68,0.6); }
    50%      { opacity: 0.7; box-shadow: 0 0 0 4px rgba(255,68,68,0); }
  }
  @keyframes pulse-green {
    0%,100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb),0.5); }
    50%      { box-shadow: 0 0 0 5px rgba(var(--accent-rgb),0); }
  }
  @keyframes emote-pop {
    0%   { opacity:0; transform:translate(-50%,-50%) scale(0.3) rotate(-10deg); }
    25%  { opacity:1; transform:translate(-50%,-50%) scale(1.3) rotate(5deg); }
    70%  { opacity:1; transform:translate(-50%,-50%) scale(1) rotate(0deg); }
    100% { opacity:0; transform:translate(-50%,-50%) scale(0.8); }
  }
  @keyframes slide-down { from { transform:translateY(-100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
  @keyframes fade-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes timer-shake {
    0%,100% { transform:translateX(0); }
    20% { transform:translateX(-3px); } 40% { transform:translateX(3px); }
    60% { transform:translateX(-2px); } 80% { transform:translateX(2px); }
  }
  @keyframes glow-pulse {
    0%,100% { box-shadow: 0 0 8px rgba(var(--accent-rgb),0.2); }
    50%      { box-shadow: 0 0 20px rgba(var(--accent-rgb),0.5); }
  }
  @keyframes blink-cursor { 0%,100% { opacity:1; } 50% { opacity:0; } }
  @keyframes typing-bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }
  @keyframes logo-glow { 0%,100% { opacity:1; } 50% { opacity:0.45; } }

  .emote-popup {
    animation: emote-pop 2.2s cubic-bezier(.36,.07,.19,.97) forwards;
    position: fixed; top:50%; left:50%;
    font-size: 80px; z-index: 9999; pointer-events: none;
    filter: drop-shadow(0 0 24px rgba(var(--accent-rgb),0.3));
  }
  .first-blood-banner { animation: slide-down 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .fade-in { animation: fade-in 0.25s ease-out forwards; }
  .progress-bar-fill { transition: width 0.7s cubic-bezier(0.34,1.56,0.64,1); }

  .btn {
    font-family: var(--mono); font-size: 14px; font-weight: 500;
    letter-spacing: 0.08em; padding: 8px 14px; border-radius: 6px;
    border: 1px solid var(--border); background: var(--s2); color: var(--text);
    cursor: pointer; transition: all 0.15s ease;
    display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
  }
  .btn:hover:not(:disabled) { border-color: rgba(var(--accent-rgb),0.4); background: var(--s1); transform: translateY(-1px); }
  .btn:active:not(:disabled) { transform: scale(0.96); }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-icon { padding: 8px 10px; font-size: 17px; }

  .btn-accent {
    background: var(--accent); border-color: var(--accent); color: #04130b; font-weight: 700;
    box-shadow: 0 0 16px rgba(var(--accent-rgb),0.25);
  }
  .btn-accent:hover:not(:disabled) {
    background: var(--accent-dim); border-color: var(--accent-dim);
    box-shadow: 0 0 24px rgba(var(--accent-rgb),0.45);
  }

  .btn-ai {
    border-color: rgba(124,58,237,0.5); color: #8b5cf6;
    background: rgba(124,58,237,0.08);
  }
  .btn-ai:hover:not(:disabled) {
    border-color: rgba(124,58,237,0.8); background: rgba(124,58,237,0.16);
    box-shadow: 0 0 16px rgba(124,58,237,0.25); color: #7c3aed;
  }

  .panel {
    background: var(--s1); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden;
    transition: background 0.3s ease, border-color 0.3s ease;
  }

  .panel-header {
    padding: 9px 14px; border-bottom: 1px solid var(--border); background: var(--s2);
    display: flex; align-items: center; gap: 8px;
    font-family: var(--mono); font-size: 13px; letter-spacing: 0.14em;
    color: var(--muted); text-transform: uppercase; flex-shrink: 0;
  }
  .panel-header .label { color: var(--text); font-weight: 600; }

  .tc-chip {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 9px; border-radius: 5px;
    font-family: var(--mono); font-size: 13px; font-weight: 600;
    border: 1px solid transparent; letter-spacing: 0.04em;
    transition: all 0.2s ease;
  }
  .tc-pass { background:rgba(var(--accent-rgb),0.08); border-color:rgba(var(--accent-rgb),0.25); color:var(--accent); }
  .tc-fail { background:rgba(255,68,68,0.08); border-color:rgba(255,68,68,0.25); color:var(--danger); }
  .tc-wait { background:rgba(128,128,128,0.1); border-color:var(--border); color:var(--muted); }

  .ai-textarea {
    width: 100%; background: var(--bg);
    border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); font-family: var(--sans); font-size: 16px;
    padding: 9px 11px; resize: none; line-height: 1.5;
    transition: border-color 0.15s ease; caret-color: var(--accent);
  }
  .ai-textarea:focus { outline: none; border-color: rgba(var(--accent-rgb),0.45); }
  .ai-textarea::placeholder { color: var(--muted); }

  .resizer {
    width: 6px; flex-shrink: 0; cursor: col-resize;
    background: transparent; border-radius: 4px;
    transition: background 0.15s; margin: 0 1px;
    display: flex; align-items: center; justify-content: center;
  }
  .resizer::after {
    content: ""; width: 2px; height: 36px; border-radius: 4px;
    background: var(--border); transition: all 0.15s;
  }
  .resizer:hover::after, .resizer.active::after {
    background: rgba(var(--accent-rgb),0.7); height: 60px;
    box-shadow: 0 0 8px rgba(var(--accent-rgb),0.4);
  }

  .typing-dot {
    display: inline-block; width: 4px; height: 4px;
    border-radius: 50%; background: var(--accent);
    animation: typing-bounce 1.2s ease-in-out infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .typing-dot:nth-child(3) { animation-delay: 0.3s; }

  select.lang-select {
    background: var(--bg); border: 1px solid var(--border);
    color: var(--text); font-family: var(--mono); font-size: 14px;
    padding: 6px 10px; border-radius: 6px; cursor: pointer;
    letter-spacing: 0.06em; transition: border-color 0.15s;
  }
  select.lang-select:focus { outline: none; border-color: rgba(var(--accent-rgb),0.4); }
  select.lang-select:hover { border-color: rgba(var(--accent-rgb),0.4); }

  .verdict-accepted { animation: glow-pulse 1s ease-in-out 3; }

  /* ── Problem strip tabs ── */
  .strip-tabs {
    display: flex; gap: 6px; overflow-x: auto; overflow-y: hidden;
    flex: 1; min-width: 0; padding-bottom: 1px;
  }
  .strip-tabs::-webkit-scrollbar { height: 0; }
  .strip-tab {
    flex-shrink: 0; font-family: var(--mono); font-size: 13px;
    letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
    padding: 5px 12px; border-radius: 6px; border: 1px solid transparent;
    color: var(--muted); background: transparent; white-space: nowrap;
    transition: all 0.15s ease;
  }
  .strip-tab:hover { color: var(--text); background: var(--s2); }
  .strip-tab.active {
    color: var(--accent); background: rgba(var(--accent-rgb),0.08);
    border-color: rgba(var(--accent-rgb),0.25);
  }

  /* ── Top bar logo ── */
  .logo-dot {
    width: 9px; height: 9px; border-radius: 50%;
    background: var(--accent); box-shadow: 0 0 10px rgba(var(--accent-rgb),0.8);
    animation: logo-glow 1.6s ease-in-out infinite; flex-shrink: 0;
  }
  .logo-text {
    font-family: var(--display); font-weight: 800; font-size: 23px;
    letter-spacing: -1px; line-height: 1; white-space: nowrap;
  }

  .diff-badge {
    padding: 4px 9px; border-radius: 6px; font-size: 13px;
    font-family: var(--mono); font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; border: 1px solid;
  }
  .topbar-divider { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; }

  /* ── Accessibility: visible keyboard focus ── */
  .btn:focus-visible,
  .strip-tab:focus-visible,
  select.lang-select:focus-visible,
  .ai-textarea:focus-visible,
  .icon-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* ── Respect reduced-motion preference ── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`

/* Small pill in the header that surfaces *my* socket health. Hidden when
   connection is green. Goes amber on reconnect, red on prolonged outage. */
function MyConnectionPill() {
  const myConnection = useMatchStore((s) => s.myConnection)
  if (myConnection === "connected") return null
  const isReconnecting = myConnection === "reconnecting"
  const color = isReconnecting ? "var(--warn)" : "var(--danger)"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "5px 12px", borderRadius: 6,
        border: `1px solid ${color}`,
        background: isReconnecting ? "rgba(255,170,0,0.08)" : "rgba(255,68,68,0.08)",
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%", background: color,
          animation: isReconnecting ? "pulse-green 1.2s ease-in-out infinite" : "pulse-red 1s ease-in-out infinite",
        }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.14em", color }}>
          {isReconnecting ? "RECONNECTING…" : "OFFLINE"}
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        title="Reload page"
        style={{
          fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.1em",
          padding: "5px 10px", borderRadius: 6, cursor: "pointer",
          border: `1px solid ${color}`, color,
          background: isReconnecting ? "rgba(255,170,0,0.06)" : "rgba(255,68,68,0.06)",
        }}
      >
        ↺ Reload
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
  const oppTyping          = useMatchStore((s) => s.oppTyping)
  const timeLeft           = useMatchStore((s) => s.timeLeft)
  const aiUsageLeft        = useMatchStore((s) => s.aiUsageLeft)
  const firstBlood         = useMatchStore((s) => s.firstBlood)
  const firstBloodBy       = useMatchStore((s) => s.firstBloodBy)
  const userId             = useMatchStore((s) => s.currentUser?._id)
  const darkMode           = useMatchStore((s) => s.darkMode)
  const toggleDarkMode     = useMatchStore((s) => s.toggleDarkMode)

  const setMyVerdict          = useMatchStore((s) => s.setMyVerdict)
  const setOppProgress        = useMatchStore((s) => s.setOppProgress)
  const setSubmitting         = useMatchStore((s) => s.setSubmitting)
  const setOppSilhouette      = useMatchStore((s) => s.setOppSilhouette)
  const setOppTyping          = useMatchStore((s) => s.setOppTyping)
  const tickTimer             = useMatchStore((s) => s.tickTimer)
  const setTimeLeftFromServer = useMatchStore((s) => s.setTimeLeftFromServer)
  const incrementSubmission   = useMatchStore((s) => s.incrementSubmission)
  const incrementAIUsage      = useMatchStore((s) => s.incrementAIUsage)
  const setIncomingEmote      = useMatchStore((s) => s.setIncomingEmote)
  const setAIReview           = useMatchStore((s) => s.setAIReview)
  const setWinner             = useMatchStore((s) => s.setWinner)
  const setOppPresence        = useMatchStore((s) => s.setOppPresence)
  const setOppOffline         = useMatchStore((s) => s.setOppOffline)
  const setOppOnline          = useMatchStore((s) => s.setOppOnline)
  const setMyConnection       = useMatchStore((s) => s.setMyConnection)
  const fetchActiveMatch      = useMatchStore((s) => s.fetchActiveMatch)
  const initMatch             = useMatchStore((s) => s.initMatch)
  const setMatchEndTime       = useMatchStore((s) => s.setMatchEndTime)

  const [runResults,     setRunResults]     = useState([])
  const [isRunning,      setIsRunning]      = useState(false)
  const [aiResponse,     setAIResponse]     = useState(null)
  const [aiLoading,      setAILoading]      = useState(false)
  const [aiQuestion,     setAIQuestion]     = useState("")
  const [showAIPanel,    setShowAIPanel]    = useState(false)
  const [matchEnded,     setMatchEnded]     = useState(false)
  const [showEmotePopup, setShowEmotePopup] = useState(null)
  const [rightW,         setRightW]         = useState(340)
  /* Issue 4 — offline detection */
  const [networkOffline,   setNetworkOffline]   = useState(false)
  const [showBackOnline,   setShowBackOnline]   = useState(false)
  /* Issue 5 — guards fallback navigation so we only fire it once */
  const matchResultReceived = useRef(false)
  /* Which sub-section of the problem panel the user is currently looking at. */
  const [activeProblemTab, setActiveProblemTab] = useState("description")

  const myTestsPassed = myTCResults?.filter(tc => tc.passed).length || 0

  // ── Theme: drive CSS variables from store darkMode ──
  useEffect(() => {
    const root = document.documentElement
    const v = darkMode
      ? {
          "--bg":"#0A0A0A","--s1":"#111111","--s2":"#161616","--border":"#2A2A2A",
          "--text":"#E8E8E8","--muted":"#7A7A7A","--accent":"#00FF85","--accent-dim":"#00cc6a",
          "--accent-rgb":"0,255,133","--danger":"#FF4444","--warn":"#FFAA00","--logo":"#F4B183",
        }
      : {
          "--bg":"#F7F8FA","--s1":"#FFFFFF","--s2":"#F1F3F6","--border":"#D8DCE3",
          "--text":"#121826","--muted":"#4B5563","--accent":"#059669","--accent-dim":"#047857",
          "--accent-rgb":"5,150,105","--danger":"#DC2626","--warn":"#D97706","--logo":"#EA7B2C",
        }
    Object.entries(v).forEach(([k, val]) => root.style.setProperty(k, val))
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

  /* Issue 1 — periodic resync every 30 s so both users stay in lockstep.
     Each client's local tickTimer() can drift if the tab was backgrounded
     or if the two browsers loaded the page at different times. */
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
     Fetches full problem + opponent from the server and hydrates the store.
     If the match is no longer active, redirect home so user isn't stuck. */
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
  }, [matchId, matchEnded])

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
       3. inactivity timer (4s) → state='thinking'
     We rate-limit the emit so we don't spam the socket. */
  useEffect(() => {
    if (!matchId) return
    /* On first mount, advertise that we're reading the description. */
    socket.emit("presence", { matchId, state: "reading", section: activeProblemTab })
  }, [matchId])

  /* Typing → coding, with a 4s decay to "thinking". The dependency on
     myCode triggers re-fire on every keystroke (debounced naturally
     by React batching), and the cleanup pushes the "thinking" emit
     once typing pauses. */
  const lastTypingEmitRef = useRef(0)
  useEffect(() => {
    if (!matchId || !myCode) return
    const now = Date.now()
    /* Only emit "coding" if more than 1.5s since the last one. */
    if (now - lastTypingEmitRef.current > 1500) {
      socket.emit("presence", { matchId, state: "coding" })
      lastTypingEmitRef.current = now
    }
    const idle = setTimeout(() => {
      socket.emit("presence", { matchId, state: "thinking" })
    }, 4000)
    return () => clearTimeout(idle)
  }, [myCode, matchId])

  /* Tab change → reading <section>. */
  useEffect(() => {
    if (!matchId) return
    socket.emit("presence", { matchId, state: "reading", section: activeProblemTab })
  }, [activeProblemTab, matchId])

  /* My own connection state — drives a "RECONNECTING…" pill in my UI. */
  useEffect(() => {
    const onConnect    = () => setMyConnection("connected")
    const onDisconnect = () => setMyConnection("reconnecting")
    const onReconnect  = () => setMyConnection("connected")
    socket.on("connect",    onConnect)
    socket.on("disconnect", onDisconnect)
    socket.io?.on?.("reconnect_attempt", onDisconnect)
    socket.io?.on?.("reconnect",         onReconnect)
    /* Initialise to whatever it currently is */
    setMyConnection(socket.connected ? "connected" : "reconnecting")
    return () => {
      socket.off("connect",    onConnect)
      socket.off("disconnect", onDisconnect)
      socket.io?.off?.("reconnect_attempt", onReconnect)
      socket.io?.off?.("reconnect_attempt", onDisconnect)
    }
  }, [])

  /* Issue 4 — browser-level offline / online detection.
     window.offline fires when the device truly loses internet (Wi-Fi drops,
     cable unplugged, airplane mode). This is separate from the socket
     reconnect events above, which only track the WebSocket connection. */
  useEffect(() => {
    const goOffline = () => {
      setNetworkOffline(true)
      setMyConnection("offline")
    }
    const goOnline = () => {
      setNetworkOffline(false)
      setMyConnection("reconnecting")   // socket will re-establish; pill shows "RECONNECTING…"
      setShowBackOnline(true)
      setTimeout(() => setShowBackOnline(false), 3000)
    }
    window.addEventListener("offline", goOffline)
    window.addEventListener("online",  goOnline)
    return () => {
      window.removeEventListener("offline", goOffline)
      window.removeEventListener("online",  goOnline)
    }
  }, [])

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
    socket.on("run_result",         ({ results })                          => { setRunResults(results || []); setIsRunning(false) })
    socket.on("opponent_tc_update", ({ userId: sid, testsPassed, totalTests }) => { if (sid !== userId) setOppProgress({ testsPassed, totalTests }) })
    socket.on("opponent_tokens", ({ tokens }) => { setOppSilhouette(tokens) })
    socket.on("opponent_emote",     ({ emote })                            => { setIncomingEmote(emote); setShowEmotePopup(emote); setTimeout(() => setShowEmotePopup(null), 2400) })
    socket.on("match_result", ({ winnerId, aiReview }) => {
      matchResultReceived.current = true
      setMatchEndTime(Date.now())
      setWinner(winnerId)
      if (aiReview) setAIReview(aiReview)
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

    return () => ["verdict","run_result","opponent_tc_update","opponent_tokens","opponent_emote","match_result","opponent_presence","opponent_offline","opponent_joined"].forEach(e => socket.off(e))
  }, [matchId, userId])

  const handleMatchEnd = useCallback(async () => {
    if (matchEnded) return
    setMatchEnded(true)
    socket.emit("match_ended", {
      matchId, userId, code: myCode, language: myLanguage,
      testsPassed:     useMatchStore.getState().myTestsPassed,
      submissionCount: useMatchStore.getState().submissionCount,
      aiUsageCount:    useMatchStore.getState().aiUsageCount,
    })
    /* Issue 5 — if match_result socket never arrives (network blip, server
       delay) navigate to results after 8 s so user isn't stranded. */
    setTimeout(() => {
      if (!matchResultReceived.current) {
        setMatchEndTime(Date.now())
        navigate(`/result/${matchId}`)
      }
    }, 8000)
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
    } catch {} finally { setAILoading(false) }
  }

  const sendEmote = (emote) => socket.emit("emote", { matchId, emote })

  const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`

  const timerColor = timeLeft <= 60 ? "var(--danger)" : timeLeft <= 300 ? "var(--warn)" : "var(--accent)"
  const timerShake = timeLeft <= 10 && !matchEnded

  const diffStyle = (d) => d === "Easy"
    ? { color:"var(--accent)", borderColor:"rgba(var(--accent-rgb),0.4)", background:"rgba(var(--accent-rgb),0.08)" }
    : d === "Medium"
    ? { color:"var(--warn)", borderColor:"rgba(255,170,0,0.4)", background:"rgba(255,170,0,0.08)" }
    : { color:"var(--danger)", borderColor:"rgba(255,68,68,0.4)", background:"rgba(255,68,68,0.08)" }

  if (!problem) return (
    <div style={{ background:"var(--bg)", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"var(--mono)", color:"var(--muted)", fontSize:15, letterSpacing:"0.2em" }}>
      <div style={{ width:28, height:28, border:"2px solid var(--border)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      LOADING MATCH...
    </div>
  )

  return (
    <div
      className="dot-grid"
      style={{ background:"var(--bg)", height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column", padding:8, gap:8 }}
    >
      {/* Issue 4 — full-screen no-internet overlay */}
      {networkOffline && (
        <div style={{
          position:"fixed", inset:0, zIndex:9998,
          background:"rgba(0,0,0,0.88)", backdropFilter:"blur(10px)",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16,
        }}>
          <div style={{ fontSize:52 }}>📡</div>
          <div style={{ fontFamily:"var(--mono)", fontSize:22, fontWeight:700, color:"var(--danger)", letterSpacing:"0.12em" }}>
            NO INTERNET CONNECTION
          </div>
          <div style={{ fontFamily:"var(--mono)", fontSize:13, color:"var(--muted)", letterSpacing:"0.08em" }}>
            Your match is paused — reconnecting when connection is restored…
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--danger)", animation:"pulse-red 1s ease-in-out infinite" }} />
            <span style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--danger)", letterSpacing:"0.14em" }}>OFFLINE</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop:8, fontFamily:"var(--mono)", fontSize:13, fontWeight:600,
              letterSpacing:"0.1em", padding:"10px 28px", borderRadius:6,
              border:"1px solid rgba(255,68,68,0.4)", background:"rgba(255,68,68,0.08)",
              color:"var(--danger)", cursor:"pointer",
            }}
          >
            ↺ Reload Page
          </button>
        </div>
      )}

      {/* Issue 4 — "Back Online" toast */}
      {showBackOnline && (
        <div style={{
          position:"fixed", top:72, left:"50%", transform:"translateX(-50%)",
          zIndex:9999, background:"rgba(0,255,133,0.12)",
          border:"1px solid var(--accent)", borderRadius:8,
          padding:"10px 28px", fontFamily:"var(--mono)", fontSize:13,
          color:"var(--accent)", letterSpacing:"0.14em",
          animation:"slide-down 0.3s ease forwards",
        }}>
          ✓ BACK ONLINE
        </div>
      )}

      {showEmotePopup && <div className="emote-popup">{showEmotePopup}</div>}

      {firstBlood && (
        <div
          className="first-blood-banner"
          style={{
            position:"fixed", top:0, left:0, right:0, zIndex:500,
            background:"linear-gradient(90deg,#1a0000,rgba(255,68,68,0.1),#1a0000)",
            borderBottom:"1px solid rgba(255,68,68,0.35)", padding:"7px 0", textAlign:"center",
            fontFamily:"var(--mono)", fontSize:14, letterSpacing:"0.22em",
            color:"var(--danger)", textTransform:"uppercase",
          }}
        >
          🩸 First Blood — {firstBloodBy === "me" ? "YOU" : opponent?.username?.toUpperCase()} passed TC1
        </div>
      )}

      {/* ═══════════════ TOP BAR ═══════════════ */}
      <header
        className="panel"
        style={{ flexShrink:0, display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:10 }}
      >
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <span className="logo-dot" />
          <span className="logo-text">
            <span style={{ color:"var(--text)" }}>DUAL</span>
            <span style={{ color:"var(--logo)" }}>DEV</span>
          </span>
        </div>

        <span className="topbar-divider" />

        {/* Problem title + difficulty + topic */}
        <div style={{ display:"flex", alignItems:"center", gap:9, minWidth:0, flex:1 }}>
          <span style={{ fontFamily:"var(--sans)", fontWeight:600, fontSize:18, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:280 }}>
            {problem.title}
          </span>
          <span className="diff-badge" style={diffStyle(problem.difficulty)}>{problem.difficulty}</span>
          {problem.topic && (
            <span style={{ fontFamily:"var(--mono)", fontSize:13, letterSpacing:"0.12em", color:"var(--muted)", textTransform:"uppercase", whiteSpace:"nowrap" }}>
              {problem.topic}
            </span>
          )}
        </div>

        {/* Emotes (emoji here is sent content, not UI chrome) */}
        <div style={{ display:"flex", gap:5 }} role="group" aria-label="Send emote to opponent">
          {[["😤","taunt"],["🔥","fire"],["👀","watching"]].map(([e, name]) => (
            <button key={e} className="btn btn-icon" onClick={() => sendEmote(e)} title={`Send ${name} emote`} aria-label={`Send ${name} emote`}>{e}</button>
          ))}
        </div>

        <span className="topbar-divider" />

        {/* AI / Run / Submit */}
        <button
          className="btn btn-ai"
          onClick={() => setShowAIPanel((v) => !v)}
          aria-pressed={showAIPanel}
          aria-label="Toggle AI assistant"
          style={showAIPanel ? { borderColor:"rgba(124,58,237,0.9)", background:"rgba(124,58,237,0.18)" } : undefined}
        >
          <IconSparkles s={13} /> AI <span style={{ opacity:0.7 }}>({aiUsageLeft})</span>
        </button>
        <button className="btn" onClick={runCode} disabled={isRunning || timeLeft <= 0 || matchEnded} aria-label="Run sample tests">
          <IconPlay s={12} /> {isRunning ? "Running…" : "Run"}
        </button>
        <button className="btn btn-accent" onClick={submitCode} disabled={isSubmitting || timeLeft <= 0 || matchEnded} aria-label="Submit solution">
          <IconCheck s={13} /> {isSubmitting ? "Submitting…" : "Submit"}
        </button>

        <span className="topbar-divider" />

        {/* Connection pill — only visible when not connected */}
        <MyConnectionPill />

        {/* Timer */}
        <div
          style={{
            display:"flex", alignItems:"center", gap:7, padding:"5px 12px", borderRadius:6,
            border:`1px solid ${timeLeft <= 60 ? "rgba(255,68,68,0.5)" : timeLeft <= 300 ? "rgba(255,170,0,0.4)" : "var(--border)"}`,
            background: timeLeft <= 60 ? "rgba(255,68,68,0.07)" : timeLeft <= 300 ? "rgba(255,170,0,0.06)" : "var(--s2)",
            animation: timerShake ? "timer-shake 0.4s infinite" : "none",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={timerColor} strokeWidth="1.5">
            <circle cx="8" cy="9" r="6" /><path d="M8 6v3l1.5 1" /><path d="M6 1h4" />
          </svg>
          <span className="tabnum" style={{ fontFamily:"var(--mono)", fontSize:18, fontWeight:700, letterSpacing:"0.08em", color:timerColor }}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Theme toggle */}
        <button
          className="btn btn-icon"
          onClick={toggleDarkMode}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <IconSun s={15} /> : <IconMoon s={15} />}
        </button>
      </header>

      {/* ═══════════════ PROBLEM STRIP ═══════════════ */}
      <ProblemPanel problem={problem} activeTab={activeProblemTab} onTabChange={setActiveProblemTab} />

      {/* ═══════════════ BODY ═══════════════ */}
      <div style={{ flex:1, minHeight:0, display:"flex", position:"relative" }}>
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
        />

        {/* AI floating panel */}
        {showAIPanel && (
          <div
            className="panel fade-in"
            style={{ position:"absolute", top:0, right:0, width:360, maxWidth:"calc(100% - 16px)", zIndex:60, boxShadow:"0 12px 40px rgba(0,0,0,0.35)" }}
          >
            <div className="panel-header">
              <span style={{ color:"#8b5cf6", display:"inline-flex" }}><IconSparkles s={13} /></span>
              <span className="label">AI Assistant</span>
              <span style={{ marginLeft:"auto", color:"var(--muted)" }}>{aiUsageLeft} left</span>
              <button
                className="icon-btn"
                onClick={() => setShowAIPanel(false)}
                style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", display:"inline-flex", padding:2, borderRadius:4 }}
                title="Close AI assistant"
                aria-label="Close AI assistant"
              ><IconClose s={14} /></button>
            </div>
            <div style={{ padding:12, display:"flex", flexDirection:"column", gap:10 }}>
              <textarea
                className="ai-textarea"
                rows={3}
                value={aiQuestion}
                onChange={(e) => setAIQuestion(e.target.value)}
                placeholder="Ask for a hint about the problem…"
              />
              <button className="btn btn-ai" onClick={askAI} disabled={aiLoading || aiUsageLeft <= 0} style={{ justifyContent:"center" }}>
                {aiLoading ? "Thinking…" : "Ask AI"}
              </button>
              {aiResponse && (
                <div style={{
                  background:"var(--bg)", border:"1px solid var(--border)", borderRadius:6,
                  padding:"10px 12px", fontSize:17, lineHeight:1.6, color:"var(--text)",
                  maxHeight:240, overflowY:"auto", whiteSpace:"pre-wrap",
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
