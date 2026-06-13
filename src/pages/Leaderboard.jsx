import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import useMatchStore from '../store/matchStore'

/* ────────────────────────────────────────────────────────────
   /leaderboard
   Matches the visual language of Home.jsx:
   #0A0A0A bg, Space Mono display, #00FF85 accent, dot-grid.
   Real data from /api/leaderboard/me (top 9 + your row).
   ──────────────────────────────────────────────────────────── */

const RANK_STYLES = {
  1: { color: '#FFB800', bg: 'rgba(255,184,0,0.08)',   badge: 'Champion' },
  2: { color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', badge: 'Elite'    },
  3: { color: '#CD7F32', bg: 'rgba(205,127,50,0.08)',  badge: 'Master'   },
}
const DEFAULT_STYLE = { color: '#00FF85', bg: 'rgba(0,255,133,0.05)', badge: 'Diamond' }

const styleFor = (rank) => (rank && RANK_STYLES[rank]) || DEFAULT_STYLE

const winRate = (wins, losses) => {
  const total = (wins || 0) + (losses || 0)
  if (total === 0) return '—'
  return `${((wins / total) * 100).toFixed(1)}%`
}

const initial = (name) => (name?.[0] || '?').toUpperCase()

function Row({ rank, username, rating, wins, losses, avatar, isMe }) {
  const { color, bg, badge } = styleFor(rank)
  const rate = winRate(wins, losses)

  return (
    <div
      className={`grid grid-cols-[56px_1fr_90px_90px_120px] px-6 py-4 border-b border-[#111] items-center transition-colors ${
        isMe ? 'bg-[#00FF85]/[0.04]' : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* Rank */}
      <span
        className="font-mono-display font-bold text-base tabnum"
        style={{ color: rank <= 3 ? color : '#555' }}
      >
        {rank ?? '—'}
      </span>

      {/* Player */}
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center font-mono-display font-bold text-xs shrink-0 overflow-hidden"
          style={{ background: bg, border: `1px solid ${color}33`, color }}
        >
          {avatar
            ? <img src={avatar} alt="" className="w-full h-full object-cover" />
            : initial(username)}
        </span>
        <div className="min-w-0">
          <div className="font-mono-display text-[13px] text-[#E8E8E8] truncate flex items-center gap-2">
            @{username || 'unknown'}
            {isMe && (
              <span className="font-mono-display text-[9px] tracking-widest border border-[#00FF85]/40 text-[#00FF85] px-1.5 py-0.5 rounded-sm">
                YOU
              </span>
            )}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color }}>
            {rank <= 3 ? `👑 ${badge}` : `💚 ${badge}`}
          </div>
        </div>
      </div>

      {/* Wins */}
      <span className="font-mono-display text-[13px] text-[#888] tabnum">🏆 {wins ?? 0}</span>

      {/* Win Rate */}
      <span className="font-mono-display text-[13px] text-[#00FF85] tabnum">↗ {rate}</span>

      {/* Rating */}
      <span className="font-mono-display text-[13px] text-[#E8E8E8] tabnum text-right">
        {rating != null ? Math.round(rating) : '—'} <span className="text-[#444]">ELO</span>
      </span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[56px_1fr_90px_90px_120px] px-6 py-4 border-b border-[#111] items-center">
      <span className="h-3 w-6 rounded bg-[#1a1a1a]" />
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-[#1a1a1a]" />
        <span className="h-3 w-32 rounded bg-[#1a1a1a]" />
      </div>
      <span className="h-3 w-12 rounded bg-[#1a1a1a]" />
      <span className="h-3 w-12 rounded bg-[#1a1a1a]" />
      <span className="h-3 w-16 rounded bg-[#1a1a1a] justify-self-end" />
    </div>
  )
}

export default function Leaderboard() {
  const navigate        = useNavigate()
  const isAuthenticated = useMatchStore((s) => s.isAuthenticated)
  const currentUser     = useMatchStore((s) => s.currentUser)

  const [top,      setTop]      = useState([])
  const [me,       setMe]       = useState(null)
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [lastSync, setLastSync] = useState(null)

  const fetchData = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true)
      const endpoint = isAuthenticated ? '/api/leaderboard/me' : '/api/leaderboard'
      const url = `${import.meta.env.VITE_API_URL}${endpoint}`
      const res = await axios.get(url, { withCredentials: true })
      if (res.data?.success) {
        setTop(res.data.players || res.data.top || [])
        setMe(res.data.me ?? null)
        setTotal(res.data.total ?? (res.data.players?.length || 0))
        setError(null)
        setLastSync(new Date())
      } else {
        throw new Error(res.data?.message || 'Failed to load leaderboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  /* Initial + 30s polling */
  useEffect(() => {
    fetchData(true)
    const id = setInterval(() => fetchData(false), 30_000)
    return () => clearInterval(id)
    // eslint-disable-next-line
  }, [isAuthenticated])

  const meIsInTop = useMemo(() => {
    if (!me || !top.length) return false
    return top.some((p) => p.userId === me.userId)
  }, [me, top])

  const timeAgo = lastSync
    ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .font-mono-display { font-family: 'Space Mono', monospace; }
        .tabnum { font-variant-numeric: tabular-nums; }
        @keyframes liveBlink { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.7); } }
        .live-dot { animation: liveBlink 1.2s ease-in-out infinite; }
        .dot-grid {
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 16px rgba(0,255,133,0.18); }
          50%     { box-shadow: 0 0 36px rgba(0,255,133,0.32), 0 0 64px rgba(0,255,133,0.10); }
        }
        .me-row { animation: glowPulse 3.2s ease-in-out infinite; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
      `}</style>

      {/* ── Minimal nav (just back to home + brand) ── */}
      <nav className="fixed top-4 left-0 w-full z-50 px-5">
        <div className="max-w-[82rem] mx-auto h-[72px] px-10 flex items-center justify-between rounded-full border border-white/20 bg-black/30 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <h1 className="font-claude text-[40px] font-extrabold tracking-[-2px] leading-none">
              <span className="text-white">DUAL</span>
              <span className="text-[#F4B183]">DEV</span>
            </h1>
          </button>

          <div className="hidden md:flex items-center gap-14">
            <button
              onClick={() => navigate('/')}
              className="text-[16px] font-medium tracking-wide text-white/65 hover:text-white transition-all duration-300"
            >
              Home
            </button>
            <span className="text-[16px] font-medium tracking-wide text-white">
              Leaderboard
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03]">
            <span className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse" />
            {currentUser ? (
              <>
                <span className="text-sm text-white/90">{currentUser.username}</span>
                <span className="text-sm font-semibold text-[#00FF85]">{currentUser.rating}</span>
              </>
            ) : (
              <span className="text-sm text-white/65">Guest</span>
            )}
          </div>
        </div>
      </nav>

      {/* ── Header ── */}
      <section className="dot-grid relative px-6 pt-36 pb-12 text-center overflow-hidden">
        <div className="max-w-2xl mx-auto fade-up">
          <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
            <h2
              className="font-mono-display font-bold text-[#E8E8E8] tracking-tight"
              style={{ fontSize: 'clamp(28px, 5vw, 48px)' }}
            >
              Global Leaderboard
            </h2>
            <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-[#FF3355] font-mono-display text-[10px] tracking-widest px-3 py-1 rounded-full">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#FF3355] inline-block" />
              LIVE
            </span>
          </div>
          <p className="text-[#555] text-sm">
            The top warriors in competitive coding. Updated in real-time.
          </p>
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section className="px-6 pb-10">
        <div className="max-w-3xl mx-auto grid grid-cols-3 bg-[#111] border border-[#2A2A2A] rounded-xl overflow-hidden">
          {[
            { label: 'Total Ranked', value: total },
            { label: 'Your Rating',  value: me?.rating != null ? Math.round(me.rating) : '—' },
            { label: 'Your Rank',    value: me?.rank   != null ? `#${me.rank}`         : '—' },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`px-6 py-5 ${i < 2 ? 'border-r border-[#2A2A2A]' : ''}`}
            >
              <div className="font-mono-display text-[10px] tracking-widest text-[#555] uppercase">
                {s.label}
              </div>
              <div className="font-mono-display font-bold text-2xl text-[#E8E8E8] tabnum mt-1">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Top 9 table ── */}
      <section className="px-6 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-mono-display text-[10px] tracking-widest text-[#555]">
              TOP 9
            </span>
            <span className="font-mono-display text-[10px] tracking-widest text-[#555]">
              {timeAgo && `SYNCED ${timeAgo}`}
            </span>
          </div>

          <div className="bg-[#111] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[56px_1fr_90px_90px_120px] px-6 py-3 border-b border-[#1A1A1A]">
              {['#', 'PLAYER', 'WINS', 'WIN RATE', 'RATING'].map((h, i) => (
                <span
                  key={h}
                  className={`font-mono-display text-[10px] tracking-widest text-[#444] ${i === 4 ? 'text-right' : ''}`}
                >
                  {h}
                </span>
              ))}
            </div>

            {loading && top.length === 0 && (
              <>
                <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
              </>
            )}

            {error && !loading && (
              <div className="px-6 py-8 text-center font-mono-display text-[12px] tracking-widest text-[#FF3355]">
                ✕ {error}
              </div>
            )}

            {!loading && !error && top.length === 0 && (
              <div className="px-6 py-8 text-center font-mono-display text-[12px] tracking-widest text-[#555]">
                NO RANKED PLAYERS YET — BE THE FIRST
              </div>
            )}

            {top.map((p, idx) => (
              <Row
                key={p.userId}
                rank={p.rank ?? idx + 1}
                username={p.username}
                rating={p.rating}
                wins={p.wins}
                losses={p.losses}
                avatar={p.avatar}
                isMe={me?.userId === p.userId}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Your standing (if not in top 9) ── */}
      {isAuthenticated && me && !meIsInTop && (
        <section className="px-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="font-mono-display text-[10px] tracking-widest text-[#555]">
                YOUR STANDING
              </span>
              <span className="font-mono-display text-[10px] tracking-widest text-[#00FF85]">
                #{me.rank ?? '—'} OF {total}
              </span>
            </div>
            <div className="bg-[#111] border border-[#00FF85]/30 rounded-xl overflow-hidden me-row">
              <Row
                rank={me.rank ?? '—'}
                username={me.username || currentUser?.username || 'You'}
                rating={me.rating ?? 0}
                wins={me.wins ?? 0}
                losses={me.losses ?? 0}
                avatar={me.avatar}
                isMe
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Footer-ish bottom strip ── */}
      <section className="border-t border-[#1A1A1A] px-6 py-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="font-mono-display text-[10px] tracking-widest text-[#444]">
            DATA SOURCE · REDIS SORTED SET · LIVE
          </div>
          <button
            onClick={() => navigate('/')}
            className="font-mono-display text-[11px] tracking-widest text-[#888] hover:text-[#00FF85] transition-colors"
          >
            ← BACK TO HOME
          </button>
        </div>
      </section>
    </div>
  )
}
