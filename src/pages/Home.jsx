import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Check, X, ThumbsUp, ThumbsDown } from 'lucide-react'
import useMatchStore from '../store/matchStore.js'
import socket from '../socket/socket.js'
import HeroStage from '../components/home/HeroStage.jsx'
import QueueRadar from '../components/home/QueueRadar.jsx'
import StatsTicker from '../components/home/StatsTicker.jsx'
import Navbar from '../components/layout/Navbar.jsx'

const MIN_MATCH_WIDTH = 768

const TOPICS = [
  'Array', 'HashMap', 'String',
  'Stack', 'LinkedList', 'Tree', 'Graph',
  'DynamicProgramming', 'Greedy', 'BinarySearch', 'BitManipulation',
]

/* Values must stay exactly as stored on the problem documents; only the
   display label gets the space. */
const topicLabel = (t) => t.replace(/([a-z])([A-Z])/g, '$1 $2')
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

const QUOTE_BATCH = 6
const QUOTE_PREFETCH_AT_REMAINING = 2
const QUOTE_TRANSITION_MS = 220

const QUOTE_FALLBACK = [
  { id: 'fb-1', text: "Your friend thinks they're better. Bet." },
  { id: 'fb-2', text: 'Same problem. Same clock. No excuses.' },
  { id: 'fb-3', text: 'Code under pressure. Win under pressure.' },
  { id: 'fb-4', text: 'They can see your silhouette. Not your source.' },
  { id: 'fb-5', text: 'First to green wins the room.' },
  { id: 'fb-6', text: 'Ranked is personal. Prove it.' },
]

/* One of these opens the very first quote slot for every session (picked at
   random, client-side only — never sent to the feedback API). Every quote
   after it, on this load and all future refills, comes from fetchQuoteFeed. */
const QUOTE_COLD_OPENERS = [
  { id: 'cold-1', text: 'You can grind LeetCode alone. Dual Dev puts you under pressure.' },
  { id: 'cold-2', text: 'LeetCode builds the skill. Dual Dev tests the composure.' },
  { id: 'cold-3', text: 'Practice LeetCode in comfort. Compete on Dual Dev under pressure.' },
  { id: 'cold-4', text: 'Green checks on LeetCode feel good. Beating your rival feels better.' },
  { id: 'cold-5', text: 'LeetCode teaches you to solve. Dual Dev teaches you to perform.' },
]

function dedupeQuotesById(list, excludeIds = new Set()) {
  const seen = new Set(excludeIds)
  const out = []
  for (const item of list) {
    const id = String(item.id)
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, text: String(item.text).replace(/\s*\n\s*/g, ' ') })
  }
  return out
}

async function fetchQuoteFeed(excludeIds = new Set()) {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/phrases/feed`, {
      params: { limit: QUOTE_BATCH },
      withCredentials: true,
    })
    const raw = Array.isArray(res.data?.phrases) ? res.data.phrases : []
    const cleaned = dedupeQuotesById(raw, excludeIds)
    if (cleaned.length > 0) return cleaned.slice(0, QUOTE_BATCH)
  } catch {
    /* fall through */
  }
  return QUOTE_FALLBACK.filter((p) => !excludeIds.has(String(p.id))).slice(0, QUOTE_BATCH)
}

function recordQuoteVote(phraseId, action) {
  if (!phraseId || String(phraseId).startsWith('fb-') || String(phraseId).startsWith('cold-')) return
  axios
    .post(
      `${import.meta.env.VITE_API_URL}/api/phrases/feedback`,
      { phraseId, action },
      { withCredentials: true },
    )
    .catch(() => {})
}

/* Human-like typewriter: per-character delay jitters, with a longer pause
   after punctuation, instead of a flat interval. */
function useTypewriter(text, enabled) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (!enabled) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let tickTimeout = null

    const tick = (i) => {
      setTyped(text.slice(0, i))
      if (i >= text.length) return
      const justTyped = text[i - 1]
      const delay = /[.,!?]/.test(justTyped)
        ? 170 + Math.random() * 140
        : 32 + Math.random() * 46
      tickTimeout = setTimeout(() => tick(i + 1), delay)
    }

    const startTimeout = setTimeout(() => {
      if (reduceMotion) {
        setTyped(text)
        return
      }
      setTyped('')
      tick(1)
    }, 0)

    return () => {
      clearTimeout(startTimeout)
      clearTimeout(tickTimeout)
    }
  }, [text, enabled])

  return typed
}

export default function Home() {
  const navigate        = useNavigate()
  const isAuthenticated = useMatchStore((s) => s.isAuthenticated)
  const authLoading     = useMatchStore((s) => s.authLoading)
  const isSearching     = useMatchStore((s) => s.isSearching)
  const setSearching    = useMatchStore((s) => s.setSearching)
  const initMatch       = useMatchStore((s) => s.initMatch)

  const [mobileWarning, setMobileWarning] = useState(null)

  const [showModal, setShowModal]   = useState(false)
  const [topic, setTopic]           = useState('Array')
  const [difficulty, setDifficulty] = useState('Easy')
  const [mode, setMode]             = useState('random')

  const [roomId, setRoomId]             = useState(null)
  const [friendRoomId, setFriendRoomId] = useState('')
  const [roomCopied, setRoomCopied]     = useState(false)

  const [pendingMatch, setPendingMatch]       = useState(null)
  const [acceptCountdown, setAcceptCountdown] = useState(30)
  const [waitingAccept, setWaitingAccept]     = useState(false)
  const [startCountdown, setStartCountdown]   = useState(null)
  const [searchSecondsLeft, setSearchSecondsLeft] = useState(30)
  const pendingMatchRef = useRef(null)

  const [playersOnline, setPlayersOnline] = useState(0)
  const [battlesPlayed, setBattlesPlayed] = useState(0)
  const [battlesLiveNow, setBattlesLiveNow] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [languages, setLanguages] = useState(3)
  const [problems, setProblems] = useState(0)
  const [topics, setTopics] = useState(0)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(null)

  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stats`)
      if (!res.ok) throw new Error(`Network error: ${res.status}`)
      const data = await res.json()
      setPlayersOnline(data.playersOnline)
      setBattlesPlayed(data.battlesPlayed)
      setBattlesLiveNow(data.battlesLiveNow)
      setTotalUsers(data.totalUsers)
      setLanguages(data.languages ?? 3)
      setProblems(data.problems ?? 0)
      setTopics(data.topics ?? 0)
      setStatsError(null)
      setStatsLoading(false)
    } catch (err) {
      setStatsError(err.message)
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 4000)
    return () => clearInterval(interval)
  }, [])

  const [quotes, setQuotes]   = useState([])
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [quotePhase, setQuotePhase] = useState('in') // 'in' | 'out'
  const [quotesReady, setQuotesReady] = useState(false)
  const [quoteRevealed, setQuoteRevealed] = useState(false)
  const quoteBusyRef = useRef(false)
  const quotesRef = useRef([])
  const quoteIndexRef = useRef(0)
  const nextQuoteBatchRef = useRef(null)
  const quotePrefetchingRef = useRef(false)

  useEffect(() => { quotesRef.current = quotes }, [quotes])
  useEffect(() => { quoteIndexRef.current = quoteIndex }, [quoteIndex])

  useEffect(() => {
    let cancelled = false
    const opener = QUOTE_COLD_OPENERS[Math.floor(Math.random() * QUOTE_COLD_OPENERS.length)]
    fetchQuoteFeed(new Set([opener.id])).then((batch) => {
      if (cancelled) return
      const rest = (batch.length ? batch : QUOTE_FALLBACK).slice(0, QUOTE_BATCH - 1)
      setQuotes([opener, ...rest])
      setQuoteIndex(0)
      setQuotesReady(true)
      setQuotePhase('in')
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setQuoteRevealed(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const maybePrefetchQuotes = useCallback((currentQuotes, currentIndex) => {
    const remaining = currentQuotes.length - 1 - currentIndex
    if (remaining > QUOTE_PREFETCH_AT_REMAINING) return
    if (quotePrefetchingRef.current || nextQuoteBatchRef.current) return
    quotePrefetchingRef.current = true
    const exclude = new Set(currentQuotes.map((q) => String(q.id)))
    fetchQuoteFeed(exclude).then((batch) => {
      nextQuoteBatchRef.current = batch.length ? batch : QUOTE_FALLBACK
      quotePrefetchingRef.current = false
    })
  }, [])

  const advanceQuote = useCallback(async () => {
    if (quoteBusyRef.current) return
    quoteBusyRef.current = true

    const currentQuotes = quotesRef.current
    const currentIndex = quoteIndexRef.current
    const isLast = currentIndex >= currentQuotes.length - 1

    if (!isLast) {
      maybePrefetchQuotes(currentQuotes, currentIndex)
      setQuotePhase('out')
      await new Promise((r) => setTimeout(r, QUOTE_TRANSITION_MS))
      setQuoteIndex(currentIndex + 1)
      setQuotePhase('in')
      quoteBusyRef.current = false
      return
    }

    let batch = nextQuoteBatchRef.current
    nextQuoteBatchRef.current = null
    if (!batch) {
      const exclude = new Set(currentQuotes.map((q) => String(q.id)))
      const next = await fetchQuoteFeed(exclude)
      batch = next.length ? next : QUOTE_FALLBACK
    }

    setQuotePhase('out')
    await new Promise((r) => setTimeout(r, QUOTE_TRANSITION_MS))
    setQuotes(batch)
    setQuoteIndex(0)
    setQuotePhase('in')
    quoteBusyRef.current = false
  }, [maybePrefetchQuotes])

  const onQuoteVote = (action) => {
    const current = quotesRef.current[quoteIndexRef.current]
    if (!current) return
    recordQuoteVote(current.id, action === 'up' ? 'like' : 'dislike')
    advanceQuote()
  }

  const typedQuoteText = useTypewriter(
    quotes[quoteIndex]?.text || '',
    quotesReady && quoteRevealed && quotePhase === 'in',
  )

  const modalHeadingText = mode === 'random' ? 'Find a match' : 'Create a room'
  const typedModalHeading = useTypewriter(modalHeadingText, showModal)
  const typedHowItWorksHeading = useTypewriter('How a match works', true)

  useEffect(() => {
    const interval = setInterval(() => {
      if (socket.connected) socket.emit('heartbeat')
    }, 10_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => { pendingMatchRef.current = pendingMatch }, [pendingMatch])

  useEffect(() => {
    if (!isSearching) { setSearchSecondsLeft(30); return }
    setSearchSecondsLeft(30)
    let seconds = 30
    const iv = setInterval(() => {
      seconds -= 1
      setSearchSecondsLeft(seconds)
      if (seconds <= 0) {
        clearInterval(iv)
        if (pendingMatchRef.current) return
        setSearching(false)
        axios.delete(`${import.meta.env.VITE_API_URL}/api/matchmaking/leave`, { withCredentials: true }).catch(() => {})
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [isSearching]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    socket.on('match_found', (data) => {
      setPendingMatch({
        ...data,
        reason: data.reason || '',
      })
      setSearching(false)
      setRoomId(null)
      let remaining = data.timeout || 30
      setAcceptCountdown(remaining)
      const interval = setInterval(() => {
        remaining -= 1
        setAcceptCountdown(remaining)
        if (remaining <= 0) { clearInterval(interval); setPendingMatch(null) }
      }, 1000)
    })
    socket.on('match_acceptance_waiting', () => setWaitingAccept(true))
    socket.on('match_accepted', (data) => {
      setPendingMatch(null); setWaitingAccept(false)
      initMatch(data); navigate(`/match/${data.matchId}`)
    })
    socket.on('match_cancelled', ({ reason }) => {
      setPendingMatch(null); setWaitingAccept(false)
      setSearching(false); setRoomId(null); alert(reason)
    })
    socket.on('match_starting', ({ seconds }) => {
      setStartCountdown(seconds)
      let remaining = seconds
      const interval = setInterval(() => {
        remaining -= 1; setStartCountdown(remaining)
        if (remaining <= 0) clearInterval(interval)
      }, 1000)
    })
    return () => {
      socket.off('match_found'); socket.off('match_acceptance_waiting')
      socket.off('match_accepted'); socket.off('match_cancelled'); socket.off('match_starting')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const acceptMatch  = () => { socket.emit('accept_match',  { matchId: pendingMatch.matchId }); setWaitingAccept(true) }
  const declineMatch = () => { socket.emit('decline_match', { matchId: pendingMatch.matchId }); setPendingMatch(null); setWaitingAccept(false) }

  const requiresDesktopAndAuth = () => {
    if (!isAuthenticated) { navigate('/login'); return false }
    if (window.innerWidth < MIN_MATCH_WIDTH) {
      setMobileWarning('Matches require a desktop or laptop screen (≥768px). Please switch devices to play.')
      setTimeout(() => setMobileWarning(null), 5000)
      return false
    }
    return true
  }

  const joinMatch = async () => {
    if (!requiresDesktopAndAuth()) return
    if (!socket.connected || !socket.id) {
      alert('Still connecting to server — please wait a moment and try again.')
      return
    }
    try {
      setSearching(true)
      setShowModal(false)
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/matchmaking/join`,
        { socketId: socket.id, topic, difficulty },
        { withCredentials: true },
      )
    } catch (e) {
      console.error(e.response?.data || e.message)
      setSearching(false)
    }
  }

  const createRoom = async () => {
    if (!requiresDesktopAndAuth()) return
    if (!socket.connected || !socket.id) {
      alert('Still connecting to server — please wait a moment and try again.')
      return
    }
    try {
      setShowModal(false)
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/matchmaking/create-room`,
        { socketId: socket.id, topic, difficulty },
        { withCredentials: true },
      )
      setRoomId(res.data.roomId)
    } catch (e) {
      console.error(e.response?.data || e.message)
    }
  }

  const joinRoom = async () => {
    if (!requiresDesktopAndAuth()) return
    if (!socket.connected || !socket.id) {
      alert('Still connecting to server — please wait a moment and try again.')
      return
    }
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/matchmaking/join-room`,
        { socketId: socket.id, roomId: friendRoomId },
        { withCredentials: true },
      )
    } catch (e) {
      console.error(e.response?.data || e.message)
    }
  }

  const cancelSearch = async () => {
    setSearching(false)
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/matchmaking/leave`, { withCredentials: true }).catch(() => {})
  }

  if (authLoading) {
    return (
      <div className="home-root min-h-screen flex items-center justify-center">
        <p className="home-muted text-sm">Loading…</p>
      </div>
    )
  }

  const ringCircumference = 2 * Math.PI * 44
  const ringOffset = ringCircumference - (ringCircumference * (acceptCountdown / 30))
  const activeQuote = quotes[quoteIndex]
  const activeQuoteText = activeQuote?.text || ''

  return (
    <div className="home-root min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap');

        /* Previous DualDev wordmark (Manrope + peach DEV) + premium motion */
        .brand-wordmark {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          letter-spacing: -0.05em;
          line-height: 1;
          display: inline-flex;
          align-items: baseline;
          position: relative;
        }
        .brand-wordmark .brand-dual {
          color: var(--color-text-primary);
        }
        .brand-wordmark .brand-dev {
          color: #F4B183;
          background: linear-gradient(
            105deg,
            #C97A45 0%,
            #E8A06A 22%,
            #F4B183 40%,
            #FFF8F0 50%,
            #F4B183 60%,
            #E8A06A 78%,
            #C97A45 100%
          );
          background-size: 280% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: brandSheen 4.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          filter: drop-shadow(0 0 18px rgba(244,177,131,0.18));
        }
        @keyframes brandSheen {
          0%, 55% { background-position: 120% 50%; }
          100% { background-position: -120% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .brand-wordmark .brand-dev {
            animation: none !important;
            -webkit-text-fill-color: #F4B183;
            background: none;
            color: #F4B183;
            filter: none;
          }
        }

        .home-root {
          --home-ink: var(--color-text-primary);
          --home-muted: var(--color-text-secondary);
          --home-faint: var(--color-text-muted);
          --home-line: var(--color-border);
          --home-panel: var(--color-surface);
          --home-panel-2: var(--color-surface-2);
          --home-bg: var(--color-bg);
          --home-accent: var(--color-accent-green);
          --home-warn: var(--color-accent-orange);
          background:
            radial-gradient(1200px 500px at 10% -10%, color-mix(in srgb, var(--home-accent) 12%, transparent), transparent 55%),
            radial-gradient(900px 420px at 100% 0%, color-mix(in srgb, var(--home-warn) 8%, transparent), transparent 50%),
            var(--home-bg);
          color: var(--home-ink);
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .home-display {
          font-family: 'Instrument Serif', Georgia, serif;
          font-weight: 400;
          letter-spacing: -0.02em;
        }
        .home-muted { color: var(--home-muted); }
        .home-faint { color: var(--home-faint); }
        .home-line { border-color: var(--home-line); }
        .home-panel {
          background: var(--home-panel);
          border: 1px solid var(--home-line);
        }
        .home-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          height: 44px;
          padding: 0 1.15rem;
          font-size: 14px;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .home-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .home-btn-primary {
          background: var(--home-accent);
          color: #0A0A0A;
        }
        .home-btn-primary:hover:not(:disabled) {
          filter: brightness(1.06);
        }
        .home-btn-secondary {
          background: transparent;
          color: var(--home-ink);
          border-color: var(--home-line);
        }
        .home-btn-secondary:hover:not(:disabled) {
          border-color: var(--home-muted);
        }
        .home-btn-ghost {
          background: transparent;
          color: var(--home-muted);
          border-color: transparent;
          height: 36px;
          padding: 0 0.75rem;
          font-weight: 500;
        }
        .home-btn-ghost:hover {
          color: var(--home-ink);
        }
        .home-btn-danger {
          background: transparent;
          color: #E11D48;
          border-color: color-mix(in srgb, #E11D48 35%, transparent);
        }
        .home-btn-danger:hover:not(:disabled) {
          background: color-mix(in srgb, #E11D48 8%, transparent);
        }
        .home-input, .home-select {
          width: 100%;
          height: 44px;
          padding: 0 0.9rem;
          background: var(--home-bg);
          border: 1px solid var(--home-line);
          border-radius: 4px;
          color: var(--home-ink);
          font-size: 14px;
          outline: none;
        }
        .home-input:focus, .home-select:focus {
          border-color: var(--home-accent);
        }
        .home-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: color-mix(in srgb, var(--home-bg) 88%, black);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }
        .home-dialog {
          width: 100%;
          max-width: 380px;
          background: var(--home-panel);
          border: 1px solid var(--home-line);
          border-radius: 6px;
          padding: 1.75rem;
        }
        .home-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: var(--home-line);
          border: 1px solid var(--home-line);
          border-radius: 6px;
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .home-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        .home-stat-cell {
          background: var(--home-panel);
          padding: 1.1rem 1rem;
        }
        /* ── Quote bar (between navbar and hero) ─────────── */
        .hq-bar {
          background: var(--home-bg);
          padding: 1.4rem 1.25rem 0.4rem;
          opacity: 0;
          transform: translateY(14px) scale(0.98);
          transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hq-bar.is-revealed {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .hq-bar .hq-controls {
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 450ms ease, transform 450ms ease;
        }
        .hq-bar.is-revealed .hq-controls {
          opacity: 1;
          transform: translateY(0);
          transition-delay: 200ms;
        }
        .hq-row {
          margin: 0 auto;
          max-width: 72rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .hq-stage {
          flex: 0 1 auto;
          min-width: 0;
          max-width: 36rem;
          overflow: hidden;
        }
        .hq-quote {
          margin: 0;
          font-family: 'Manrope', 'DM Sans', system-ui, sans-serif;
          font-weight: 700;
          font-size: clamp(1.4rem, 2.2vw, 1.6rem);
          line-height: 1.2;
          letter-spacing: -0.01em;
          color: var(--home-ink);
          text-align: center;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          min-height: 2.4em;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .hq-cursor {
          display: inline-block;
          width: 2px;
          height: 0.95em;
          margin-left: 2px;
          vertical-align: -0.15em;
          background: var(--home-accent);
          animation: hqCursorBlink 800ms step-end infinite;
        }
        @keyframes hqCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .hq-quote.is-out {
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity ${QUOTE_TRANSITION_MS}ms ease, transform ${QUOTE_TRANSITION_MS}ms ease;
        }
        .hq-controls {
          flex: none;
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }
        .hq-votes {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .hq-vote {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 5px;
          border: 1px solid var(--home-line);
          background: color-mix(in srgb, var(--home-panel) 70%, transparent);
          color: var(--home-muted);
          cursor: pointer;
          transition:
            color 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease,
            transform 0.12s ease,
            opacity 0.15s ease;
        }
        .hq-vote:hover {
          color: var(--home-ink);
          border-color: var(--home-muted);
          opacity: 1;
          transform: scale(1.05);
        }
        .hq-vote:active {
          transform: scale(0.92);
          background: color-mix(in srgb, var(--home-accent) 10%, transparent);
        }
        .hq-vote:focus-visible {
          outline: 2px solid var(--home-accent);
          outline-offset: 2px;
        }
        .hq-progress {
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        .hq-pill {
          display: block;
          height: 2px;
          width: 10px;
          border-radius: 2px;
          background: color-mix(in srgb, var(--home-faint) 45%, transparent);
          transition: width 0.2s ease, background 0.2s ease, opacity 0.2s ease;
          opacity: 0.55;
        }
        .hq-pill.is-active {
          width: 16px;
          background: var(--home-ink);
          opacity: 0.85;
        }
        @media (max-width: 640px) {
          .hq-bar { padding: 1.05rem 1rem 0.3rem; }
          .hq-row { gap: 0.6rem; }
          .hq-quote { font-size: 1.35rem; }
          .hq-progress { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hq-cursor {
            display: none;
          }
          .hq-quote.is-out {
            transform: none;
          }
          .hq-bar {
            transition: opacity 550ms ease;
            transform: none;
          }
          .hq-bar.is-revealed {
            transform: none;
          }
          .hq-bar .hq-controls {
            transition: opacity 300ms ease;
            transform: none;
          }
          .hq-bar.is-revealed .hq-controls {
            transform: none;
            transition-delay: 0ms;
          }
        }

        /* ── Hero stage (wide match-page preview) ─────────── */
        .hero-stage {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          min-height: 360px;
          max-height: 560px;
          perspective: 1200px;
        }
        @media (min-width: 1024px) {
          .hero-stage {
            min-height: 420px;
            max-height: 640px;
          }
        }
        .hero-stage-frame {
          position: relative;
          height: 100%;
          min-height: inherit;
          border-radius: 12px;
          border: 1px solid var(--home-line);
          background:
            linear-gradient(160deg, color-mix(in srgb, var(--home-panel) 88%, transparent), var(--home-bg));
          overflow: hidden;
          box-shadow:
            0 1px 0 color-mix(in srgb, white 4%, transparent) inset,
            0 24px 60px -28px rgba(0,0,0,0.55);
          transform-style: preserve-3d;
          transition: transform 0.12s linear;
          will-change: transform;
        }
        .hero-stage-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .hero-chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--home-accent);
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--home-accent) 55%, transparent);
          animation: heroPulse 1.8s ease-out infinite;
        }
        @keyframes heroPulse {
          0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--home-accent) 55%, transparent); }
          70%  { box-shadow: 0 0 0 8px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        .hero-match {
          position: absolute;
          z-index: 2;
          left: 0.55rem;
          right: 0.55rem;
          top: 0.55rem;
          bottom: 0.55rem;
          border-radius: 9px;
          border: 1px solid var(--home-line);
          background: color-mix(in srgb, var(--home-bg) 90%, transparent);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Match-style top bar — no DualDev */
        .hero-topbar {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.55rem;
          border-bottom: 1px solid var(--home-line);
          background: color-mix(in srgb, var(--home-panel-2) 80%, transparent);
          flex-shrink: 0;
          min-width: 0;
        }
        .hero-topbar-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--home-ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          max-width: 34%;
        }
        .hero-diff {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .hero-diff-easy {
          color: var(--home-accent);
          background: color-mix(in srgb, var(--home-accent) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--home-accent) 28%, transparent);
        }
        .hero-topbar-topic {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--home-faint);
          flex-shrink: 0;
        }
        .hero-topbar-spacer { flex: 1; min-width: 0.5rem; }
        .hero-btn {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.06em;
          padding: 0.28rem 0.55rem;
          border-radius: 5px;
          border: 1px solid var(--home-line);
          color: var(--home-muted);
          background: color-mix(in srgb, var(--home-panel) 70%, transparent);
          flex-shrink: 0;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
        }
        .hero-btn-run.is-flash {
          color: var(--home-ink);
          border-color: color-mix(in srgb, var(--home-accent) 45%, transparent);
          background: color-mix(in srgb, var(--home-accent) 14%, transparent);
          box-shadow: 0 0 14px color-mix(in srgb, var(--home-accent) 28%, transparent);
          transform: scale(1.04);
        }
        .hero-btn-submit {
          border-color: color-mix(in srgb, var(--home-accent) 25%, transparent);
        }
        .hero-btn-submit.is-flash {
          color: #04130b;
          background: var(--home-accent);
          border-color: var(--home-accent);
          box-shadow: 0 0 18px color-mix(in srgb, var(--home-accent) 40%, transparent);
          transform: scale(1.05);
        }
        .hero-topbar-timer {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 11px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.06em;
          color: var(--home-ink);
          padding: 0.2rem 0.45rem;
          border-radius: 4px;
          border: 1px solid var(--home-line);
          background: color-mix(in srgb, var(--home-panel) 70%, transparent);
          flex-shrink: 0;
        }
        .hero-topbar-timer.is-urgent {
          color: #E11D48;
          border-color: color-mix(in srgb, #E11D48 45%, transparent);
          background: color-mix(in srgb, #E11D48 10%, transparent);
          animation: heroTimerPulse 0.8s ease-in-out infinite;
        }
        @keyframes heroTimerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
        .hero-timeup {
          position: absolute;
          inset: 0;
          z-index: 8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          background: color-mix(in srgb, var(--home-bg) 72%, transparent);
          backdrop-filter: blur(6px);
          animation: presenceMorph 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-timeup span {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 1.6rem;
          letter-spacing: 0.18em;
          color: #E11D48;
        }
        .hero-timeup em {
          font-style: normal;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--home-faint);
        }

        /* Problem statement strip */
        .hero-problem {
          flex-shrink: 0;
          border-bottom: 1px solid var(--home-line);
          background: color-mix(in srgb, var(--home-panel) 55%, transparent);
          max-height: 32%;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .hero-problem-tabs {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.5rem;
          border-bottom: 1px solid var(--home-line);
          background: color-mix(in srgb, var(--home-panel-2) 75%, transparent);
          flex-shrink: 0;
          overflow-x: auto;
        }
        .hero-problem-label {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--home-faint);
          padding-right: 0.2rem;
          flex-shrink: 0;
        }
        .hero-problem-tab {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.06em;
          padding: 0.22rem 0.45rem;
          border-radius: 4px;
          color: var(--home-muted);
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          flex-shrink: 0;
          transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .hero-problem-tab:hover {
          color: var(--home-ink);
        }
        .hero-problem-tab.is-active {
          color: var(--home-ink);
          background: color-mix(in srgb, var(--home-accent) 10%, transparent);
          border-color: color-mix(in srgb, var(--home-accent) 30%, transparent);
        }
        .hero-problem-body {
          padding: 0.45rem 0.6rem 0.55rem;
          overflow: hidden;
          animation: presenceMorph 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-problem-desc {
          margin: 0;
          font-size: 10.5px;
          line-height: 1.5;
          color: var(--home-muted);
          white-space: pre-wrap;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .hero-problem-io {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .hero-io-block p {
          margin: 0;
          font-size: 10px;
          line-height: 1.45;
          color: var(--home-muted);
          white-space: pre-wrap;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .hero-io-label {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 8px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 0.2rem;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .hero-io-label::before {
          content: '';
          width: 3px;
          height: 10px;
          border-radius: 2px;
        }
        .hero-io-in { color: var(--home-accent); }
        .hero-io-in::before { background: var(--home-accent); }
        .hero-io-out { color: var(--home-warn); }
        .hero-io-out::before { background: var(--home-warn); }
        .hero-problem-constraints {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .hero-problem-constraints li {
          display: flex;
          align-items: flex-start;
          gap: 0.4rem;
          padding: 0.25rem 0.4rem;
          border-radius: 5px;
          border: 1px solid var(--home-line);
          background: color-mix(in srgb, var(--home-panel-2) 70%, transparent);
        }
        .hero-problem-constraints li::before {
          content: '';
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--home-accent);
          margin-top: 0.3rem;
          flex-shrink: 0;
        }
        .hero-problem-constraints code {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 10px;
          color: var(--home-ink);
          opacity: 0.9;
        }
        .hero-problem-examples {
          display: flex;
          flex-direction: row;
          gap: 0.4rem;
          overflow: hidden;
        }
        .hero-example {
          flex: 1;
          min-width: 0;
          border: 1px solid var(--home-line);
          border-radius: 6px;
          overflow: hidden;
        }
        .hero-example-label {
          padding: 0.2rem 0.4rem;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 8px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--home-faint);
          background: color-mix(in srgb, var(--home-panel-2) 80%, transparent);
          border-bottom: 1px solid var(--home-line);
        }
        .hero-example-row {
          display: flex;
          flex-direction: column;
          gap: 0.08rem;
          padding: 0.28rem 0.4rem;
          border-top: 1px solid var(--home-line);
        }
        .hero-example-row:first-of-type { border-top: none; }
        .hero-example-row span {
          font-size: 8px;
          font-weight: 600;
          color: #3b82f6;
        }
        .hero-example-row:nth-of-type(2) span { color: var(--home-accent); }
        .hero-example-row code {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9.5px;
          color: var(--home-ink);
          opacity: 0.9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hero-meter-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0.55rem;
          border-bottom: 1px solid var(--home-line);
          flex-shrink: 0;
        }
        .hero-match-you {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: var(--home-accent);
          flex-shrink: 0;
        }
        .hero-match-opp {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #F4B183;
          flex-shrink: 0;
        }
        .hero-meter {
          flex: 1;
          display: flex;
          height: 3px;
          background: var(--home-line);
          border-radius: 2px;
          overflow: hidden;
        }
        .hero-meter-fill {
          height: 100%;
          background: var(--home-accent);
          transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-meter-fill-opp {
          height: 100%;
          margin-left: auto;
          background: #F4B183;
          transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .hero-editors {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          min-height: 0;
        }
        .hero-caret {
          display: inline-block;
          width: 1.5px;
          height: 0.95em;
          margin-left: 1px;
          vertical-align: text-bottom;
          background: var(--home-accent);
          animation: heroCaretBlink 1s step-end infinite;
        }
        .hero-caret-opp {
          background: #F4B183;
          height: 0.85em;
        }
        @keyframes heroCaretBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .hero-run-spin {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1.5px solid color-mix(in srgb, #A78BFA 35%, transparent);
          border-top-color: #A78BFA;
          animation: heroSpin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes heroSpin {
          to { transform: rotate(360deg); }
        }
        .hero-presence.tone-running { background: rgba(167,139,250,0.06); }
        .hero-presence.tone-results { background: rgba(0,255,133,0.06); }
        .hero-tc-row {
          flex-shrink: 0;
          padding: 0.35rem 0.55rem 0.45rem;
          border-bottom: 1px solid var(--home-line);
          background: color-mix(in srgb, var(--home-panel-2) 55%, transparent);
          animation: presenceMorph 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-tc-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.3rem;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .hero-tc-head span { color: var(--home-faint); }
        .hero-tc-you .hero-tc-head strong { color: var(--home-accent); }
        .hero-tc-opp .hero-tc-head strong { color: #F4B183; }
        .hero-tc-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
        }
        .hero-tc-chip {
          font-family: 'JetBrains Mono', ui-monospace, monospace;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 0.15rem 0.35rem;
          border-radius: 3px;
          border: 1px solid transparent;
          animation: presenceMorph 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-tc-chip.is-pass {
          color: var(--home-accent);
          background: color-mix(in srgb, var(--home-accent) 12%, transparent);
          border-color: color-mix(in srgb, var(--home-accent) 28%, transparent);
        }
        .hero-tc-chip.is-fail {
          color: #E11D48;
          background: color-mix(in srgb, #E11D48 10%, transparent);
          border-color: color-mix(in srgb, #E11D48 28%, transparent);
        }
        .hero-editor {
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
          border-right: 1px solid var(--home-line);
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .hero-editor-opp { border-right: none; }
        .hero-editor-head {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.55rem 0.7rem;
          border-bottom: 1px solid var(--home-line);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--home-muted);
          flex-shrink: 0;
        }
        .hero-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--home-accent);
          box-shadow: 0 0 8px color-mix(in srgb, var(--home-accent) 70%, transparent);
        }
        .hero-lang {
          margin-left: auto;
          color: var(--home-faint);
          letter-spacing: 0.06em;
        }
        .hero-your-code {
          margin: 0;
          padding: 0.55rem 0.65rem;
          flex: 1;
          overflow: auto;
          font-size: 10px;
          line-height: 1.6;
          color: var(--home-ink);
          white-space: pre;
          font-family: inherit;
        }
        .hero-opp-avatar {
          width: 18px;
          height: 18px;
          border-radius: 5px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          background: rgba(255,68,68,0.1);
          color: #FF4444;
          border: 1px solid rgba(255,68,68,0.25);
          flex-shrink: 0;
        }
        .hero-opp-meta {
          display: flex;
          flex-direction: column;
          min-width: 0;
          line-height: 1.15;
        }
        .hero-opp-name {
          font-size: 11px;
          letter-spacing: 0;
          text-transform: none;
          color: var(--home-ink);
          font-weight: 600;
        }
        .hero-opp-elo {
          font-size: 9px;
          color: var(--home-accent);
          letter-spacing: 0.04em;
        }
        .hero-opp-live {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 9px;
          color: var(--home-faint);
        }
        .hero-presence {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.7rem;
          border-bottom: 1px solid var(--home-line);
          font-size: 10px;
          letter-spacing: 0.12em;
          font-weight: 600;
          flex-shrink: 0;
          transition: background 0.45s ease;
          animation: presenceMorph 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes presenceMorph {
          from { opacity: 0; transform: translateY(6px); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .hero-presence-text {
          animation: presenceText 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes presenceText {
          from { opacity: 0; letter-spacing: 0.22em; }
          to   { opacity: 1; letter-spacing: 0.12em; }
        }
        .hero-presence.tone-coding  { background: rgba(0,255,133,0.05); }
        .hero-presence.tone-reading { background: rgba(96,165,250,0.06); }
        .hero-presence.tone-thinking { background: rgba(255,170,0,0.05); }
        .hero-presence-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          box-shadow: 0 0 8px currentColor;
          animation: presenceDot 1.6s ease-in-out infinite;
        }
        @keyframes presenceDot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.75); opacity: 0.55; }
        }
        .hero-typing {
          display: inline-flex;
          gap: 3px;
          align-items: center;
        }
        .hero-typing i {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--home-accent);
          display: block;
          animation: heroTypingBounce 1s ease-in-out infinite;
        }
        .hero-typing i:nth-child(2) { animation-delay: 0.15s; }
        .hero-typing i:nth-child(3) { animation-delay: 0.3s; }
        @keyframes heroTypingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        .hero-thermal-label {
          display: flex;
          justify-content: space-between;
          padding: 0.4rem 0.7rem 0.15rem;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--home-faint);
          flex-shrink: 0;
        }
        .hero-thermal-label span:last-child {
          color: color-mix(in srgb, var(--home-accent) 75%, transparent);
        }
        .hero-sil {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          padding: 0.25rem 0.55rem 0.6rem;
        }
        .hero-sil-line {
          display: flex;
          align-items: baseline;
          gap: 0.4rem;
          font-size: 10px;
          line-height: 1.7;
          white-space: pre;
          opacity: 0;
          transform: translateY(8px);
        }
        .hero-sil-line.is-in {
          animation: silGrowIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-sil-line.is-new {
          animation: silGrowNew 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes silGrowIn {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes silGrowNew {
          0% { opacity: 0; transform: translateY(10px) scaleX(0.96); filter: brightness(1.4); }
          100% { opacity: 1; transform: translateY(0) scaleX(1); filter: brightness(1); }
        }
        .hero-sil-ln {
          width: 1rem;
          text-align: right;
          color: var(--home-faint);
          flex-shrink: 0;
          font-size: 9px;
        }
        .hero-sil-kw { color: #FFD24A; font-weight: 600; }
        .hero-sil-block {
          color: #E0A85C;
          background: rgba(224,168,92,0.14);
          border-radius: 2px;
          padding: 0 1px;
          letter-spacing: 0.02em;
        }
        .hero-sil.is-coding .hero-sil-block {
          animation: heroSilShimmer 1.8s ease-in-out infinite;
        }
        @keyframes heroSilShimmer {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }
        .hero-sil-blank { height: 10px; }
        .hero-sil-empty {
          padding: 0.6rem 0.7rem;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .hero-sil-bar {
          height: 8px;
          border-radius: 3px;
          background: var(--home-panel-2);
          animation: heroSilShimmer 1.6s ease-in-out infinite;
        }
        .hero-sil-empty p {
          margin: 0.4rem 0 0;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--home-faint);
          text-align: center;
        }

        /* Auto-scrolling platform stats */
        .stats-ticker {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--home-line);
          border-radius: 6px;
          background: color-mix(in srgb, var(--home-panel) 70%, transparent);
          margin-bottom: 2rem;
          mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
        }
        .stats-ticker-track {
          display: flex;
          width: max-content;
          gap: 0;
          animation: statsTickerScroll 32s linear infinite;
        }
        .stats-ticker:hover .stats-ticker-track {
          animation-play-state: paused;
        }
        @keyframes statsTickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .stats-ticker-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 0.2rem;
          padding: 1rem 1.75rem;
          border-right: 1px solid var(--home-line);
          min-width: 9.5rem;
          white-space: nowrap;
        }
        .stats-ticker-item strong {
          font-size: 1.35rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: var(--home-ink);
          line-height: 1;
        }
        .stats-ticker-item span {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--home-faint);
        }

        /* Queue radar */
        .queue-radar {
          width: 100%;
          margin: 0 0 1.25rem;
        }
        .queue-radar canvas {
          display: block;
          width: 100%;
          height: 160px;
        }
        .queue-radar-meta {
          margin: 0.15rem 0 0;
          text-align: center;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--home-faint);
        }

        /* Match-found countdown */
        .match-found-dialog {
          animation: matchFoundIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
          max-width: 400px;
        }
        @keyframes matchFoundIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .match-ring {
          position: relative;
          width: 104px;
          height: 104px;
          margin: 0 auto 1.4rem;
        }
        .match-ring svg {
          width: 104px;
          height: 104px;
          transform: rotate(-90deg);
          filter: drop-shadow(0 0 12px rgba(0,255,133,0.25));
        }
        .match-ring-count {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 2rem;
          font-variant-numeric: tabular-nums;
          animation: matchCountPulse 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes matchCountPulse {
          0% { transform: scale(1.18); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
        .match-ring-glow {
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,255,133,0.12), transparent 70%);
          pointer-events: none;
          animation: matchGlow 2s ease-in-out infinite;
        }
        @keyframes matchGlow {
          0%, 100% { opacity: 0.55; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        .search-dialog {
          animation: matchFoundIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
          max-width: 420px;
        }
        .start-countdown-num {
          animation: matchCountPulse 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-chip-dot,
          .hero-typing i,
          .hero-sil.is-coding .hero-sil-block,
          .hero-sil-bar,
          .hero-presence,
          .hero-presence-text,
          .hero-presence-dot,
          .hero-sil-line.is-in,
          .hero-sil-line.is-new,
          .hero-problem-body,
          .hero-caret,
          .hero-run-spin,
          .hero-topbar-timer.is-urgent,
          .match-found-dialog,
          .search-dialog,
          .match-ring-count,
          .match-ring-glow,
          .start-countdown-num,
          .stats-ticker-track { animation: none !important; }
          .hero-sil-line { opacity: 1; transform: none; }
        }
      `}</style>

      <Navbar />

      <div className={`hq-bar ${quoteRevealed ? 'is-revealed' : ''}`} aria-live="polite">
        <div className="hq-row">
          <div className="hq-stage">
            <h2 className={`hq-quote ${quotePhase === 'out' ? 'is-out' : ''}`}>
              {quotesReady ? typedQuoteText : '…'}
              {quotesReady && quotePhase === 'in' && typedQuoteText.length < activeQuoteText.length && (
                <span className="hq-cursor" aria-hidden="true" />
              )}
            </h2>
          </div>

          <div className="hq-controls">
            <div className="hq-votes">
              <button
                type="button"
                className="hq-vote"
                aria-label="Like quote"
                disabled={!quotesReady}
                onClick={() => onQuoteVote('up')}
              >
                <ThumbsUp size={14} strokeWidth={2.25} />
              </button>
              <button
                type="button"
                className="hq-vote"
                aria-label="Dislike quote"
                disabled={!quotesReady}
                onClick={() => onQuoteVote('down')}
              >
                <ThumbsDown size={14} strokeWidth={2.25} />
              </button>
            </div>

            <div className="hq-progress" aria-hidden="true">
              {(quotes.length ? quotes : Array.from({ length: QUOTE_BATCH })).map((_, i) => (
                <span
                  key={i}
                  className={`hq-pill ${quotesReady && i === quoteIndex ? 'is-active' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {mobileWarning && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[400] home-panel px-4 py-3 text-sm max-w-sm text-center"
          style={{ color: 'var(--home-warn)' }}
          role="alert"
        >
          {mobileWarning}
        </div>
      )}

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-5 pt-8 pb-10 md:pt-14 md:pb-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.35fr] lg:items-center lg:gap-10">
          <div className="flex flex-col justify-center">
            <p className="text-[clamp(1.4rem,2.6vw,1.75rem)] leading-snug max-w-xl mb-3">
              Real-time 1v1 coding battles.
            </p>
            <p className="home-muted text-[15px] leading-relaxed max-w-md mb-8">
              Same problem. Same clock. Not just who submits first — an AI judge scores TLE, MLE, code structure, and more to decide the winner.
            </p>

            {!isSearching && !roomId && !pendingMatch && (
              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  type="button"
                  className="home-btn home-btn-primary"
                  onClick={() => { setMode('random'); setShowModal(true) }}
                >
                  Play ranked
                </button>
                <button
                  type="button"
                  className="home-btn home-btn-secondary"
                  onClick={() => { setMode('friend'); setShowModal(true) }}
                >
                  Challenge a friend
                </button>
              </div>
            )}

            {roomId && (
              <div className="home-panel rounded-md p-5 mb-8 max-w-md">
                <p className="home-faint text-xs uppercase tracking-[0.14em] mb-2">Room ID</p>
                <div className="flex items-center gap-3 flex-wrap">
                  <code className="text-xl tracking-[0.2em]" style={{ color: 'var(--home-accent)' }}>
                    {roomId}
                  </code>
                  <button
                    type="button"
                    className="home-btn home-btn-secondary !h-9 text-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(roomId)
                      setRoomCopied(true)
                      setTimeout(() => setRoomCopied(false), 2000)
                    }}
                  >
                    {roomCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="home-muted text-sm mt-3">Waiting for your friend to join…</p>
              </div>
            )}

            {!isSearching && !roomId && !pendingMatch && (
              <div className="max-w-md">
                <label className="home-faint text-xs uppercase tracking-[0.14em] block mb-2">
                  Or join with a room ID
                </label>
                <div className="flex gap-2">
                  <input
                    className="home-input"
                    placeholder="Paste room ID"
                    value={friendRoomId}
                    onChange={(e) => setFriendRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && friendRoomId && joinRoom()}
                  />
                  <button
                    type="button"
                    className="home-btn home-btn-secondary shrink-0"
                    onClick={joinRoom}
                    disabled={!friendRoomId}
                  >
                    Join
                  </button>
                </div>
              </div>
            )}
          </div>

          <HeroStage />
        </div>

        {statsError && (
          <p className="text-sm mt-4" style={{ color: '#E11D48' }}>
            Stats unavailable — {statsError}
          </p>
        )}
      </main>

      {/* How to play — short, text-only */}
      <section className="border-t home-line">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <StatsTicker
            playersOnline={playersOnline}
            totalUsers={totalUsers}
            battlesPlayed={battlesPlayed}
            battlesLiveNow={battlesLiveNow}
            languages={languages}
            problems={problems}
            topics={topics}
            loading={statsLoading}
          />
          <h2 className="home-display text-3xl mb-8">
            {typedHowItWorksHeading}
            {typedHowItWorksHeading.length < 'How a match works'.length && (
              <span className="hq-cursor" aria-hidden="true" />
            )}
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {[
              ['Queue or invite', 'Pick a topic and difficulty, or share a room ID with a friend.'],
              ['Code head-to-head', 'Same problem, live timer. You see a silhouette of their code — not the source.'],
              ['Tests decide', 'Submit against hidden tests. More passed wins; efficiency breaks ties.'],
            ].map(([title, body], i) => (
              <li key={title}>
                <div className="home-faint text-xs uppercase tracking-[0.14em] mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="home-muted text-sm leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t home-line">
        <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="brand-wordmark text-[28px]">
            <span className="brand-dual">DUAL</span>
            <span className="brand-dev">DEV</span>
          </span>
          <div className="flex flex-col sm:items-end gap-1">
            <span className="home-faint text-xs">© 2026 DualDev</span>
            <a
              href="https://www.chattrapate.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="home-faint text-xs hover:underline"
            >
              Developer: Chattrapate
            </a>
          </div>
        </div>
      </footer>

      {/* Searching — queue radar pairing */}
      {isSearching && !pendingMatch && (
        <div className="home-overlay" style={{ zIndex: 200 }}>
          <div className="home-dialog search-dialog text-center">
            <p className="home-faint text-xs uppercase tracking-[0.16em] mb-2">Searching</p>
            <h2 className="home-display text-3xl mb-1">Finding opponent</h2>
            <QueueRadar topic={topicLabel(topic)} difficulty={difficulty} />
            <div className="mb-6">
              <div className="flex justify-between text-xs home-faint mb-2">
                <span>Auto-cancel</span>
                <span style={{ color: searchSecondsLeft <= 10 ? '#E11D48' : 'inherit' }}>
                  {searchSecondsLeft}s
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--home-line)' }}>
                <div
                  className="h-full rounded-full transition-[width] duration-1000 linear"
                  style={{
                    width: `${(searchSecondsLeft / 30) * 100}%`,
                    background: searchSecondsLeft <= 10 ? '#E11D48' : 'var(--home-accent)',
                  }}
                />
              </div>
            </div>
            <button type="button" className="home-btn home-btn-secondary w-full" onClick={cancelSearch}>
              Cancel search
            </button>
          </div>
        </div>
      )}

      {/* Accept / decline — premium countdown */}
      {pendingMatch && (
        <div className="home-overlay" style={{ zIndex: 300 }}>
          <div className="home-dialog match-found-dialog text-center">
            <p className="home-faint text-xs uppercase tracking-[0.16em] mb-3">Match found</p>
            <h2 className="home-display text-3xl mb-2">
              vs {pendingMatch.opponent?.username}
            </h2>
            <p className="home-muted text-sm mb-1">
              Rating {pendingMatch.opponent?.rating}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--home-warn)' }}>
              {pendingMatch.problem?.title} · {pendingMatch.problem?.difficulty}
            </p>
            {pendingMatch.reason && (
              <p className="home-panel rounded-md px-3 py-2 text-xs mb-5" style={{ color: 'var(--home-accent)' }}>
                {pendingMatch.reason}
              </p>
            )}

            <div className="match-ring">
              <div className="match-ring-glow" />
              <svg width="104" height="104" viewBox="0 0 104 104">
                <circle cx="52" cy="52" r="44" fill="none" stroke="var(--home-line)" strokeWidth="4" />
                <circle
                  cx="52" cy="52" r="44" fill="none" stroke="var(--home-accent)" strokeWidth="4"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <span key={acceptCountdown} className="match-ring-count">
                {acceptCountdown}
              </span>
            </div>

            {waitingAccept ? (
              <p className="home-muted text-sm">Accepted — waiting for opponent…</p>
            ) : (
              <div className="flex gap-2 justify-center">
                <button type="button" className="home-btn home-btn-primary" onClick={acceptMatch}>
                  <Check size={14} /> Accept
                </button>
                <button type="button" className="home-btn home-btn-danger" onClick={declineMatch}>
                  <X size={14} /> Decline
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match starting */}
      {startCountdown !== null && startCountdown > 0 && (
        <div className="home-overlay">
          <div className="home-dialog match-found-dialog text-center">
            <div
              key={startCountdown}
              className="home-display text-7xl leading-none mb-3 start-countdown-num"
              style={{ color: 'var(--home-accent)' }}
            >
              {startCountdown}
            </div>
            <p className="home-faint text-xs uppercase tracking-[0.16em]">Match starting</p>
          </div>
        </div>
      )}

      {/* Config modal */}
      {showModal && (
        <div className="home-overlay" onClick={() => setShowModal(false)}>
          <div className="home-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="home-display text-2xl mb-1">
              {typedModalHeading}
              {typedModalHeading.length < modalHeadingText.length && (
                <span className="hq-cursor" aria-hidden="true" />
              )}
            </h3>
            <p className="home-muted text-sm mb-6">
              {mode === 'random'
                ? 'Matched with someone near your rating.'
                : 'Share the room ID after you create it.'}
            </p>

            <label className="home-faint text-xs uppercase tracking-[0.14em] block mb-2">Topic</label>
            <select className="home-select mb-4" value={topic} onChange={(e) => setTopic(e.target.value)}>
              {TOPICS.map((t) => <option key={t} value={t}>{topicLabel(t)}</option>)}
            </select>

            <label className="home-faint text-xs uppercase tracking-[0.14em] block mb-2">Difficulty</label>
            <select className="home-select mb-6" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                className="home-btn home-btn-primary flex-1"
                onClick={mode === 'random' ? joinMatch : createRoom}
              >
                {mode === 'random' ? 'Find match' : 'Create room'}
              </button>
              <button type="button" className="home-btn home-btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
