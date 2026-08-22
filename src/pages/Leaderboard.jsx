import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import useMatchStore from '../store/matchStore'
import Navbar from '../components/layout/Navbar.jsx'

/* ────────────────────────────────────────────────────────────
   /leaderboard
   Matches the visual language of Home.jsx:
   var(--color-bg) bg, Space Mono display, themed green accent, dot-grid.
   Real data from /api/leaderboard/me (top 9 + your row).
   ──────────────────────────────────────────────────────────── */

const RANK_STYLES = {
  1: { color: '#FFB800', bg: 'rgba(255,184,0,0.08)',   badge: 'Champion' },
  2: { color: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', badge: 'Elite'    },
  3: { color: '#CD7F32', bg: 'rgba(205,127,50,0.08)',  badge: 'Master'   },
}
const DEFAULT_STYLE = { color: 'var(--color-accent-green)', bg: 'rgba(0,255,133,0.05)', badge: 'Diamond' }

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
      className={`grid grid-cols-[56px_1fr_90px_90px_120px] px-6 py-4 border-b border-[var(--color-surface)] items-center transition-colors ${
        isMe ? 'bg-[var(--color-accent-green)]/[0.04]' : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* Rank */}
      <span
        className="font-mono-display font-bold text-base tabnum"
        style={{ color: rank <= 3 ? color : 'var(--color-text-muted)' }}
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
          <div className="font-mono-display text-[13px] text-[var(--color-text-primary)] truncate flex items-center gap-2">
            @{username || 'unknown'}
            {isMe && (
              <span className="font-mono-display text-[9px] tracking-widest border border-[var(--color-accent-green)]/40 text-[var(--color-accent-green)] px-1.5 py-0.5 rounded-sm">
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
      <span className="font-mono-display text-[13px] text-[var(--color-text-secondary)] tabnum">🏆 {wins ?? 0}</span>

      {/* Win Rate */}
      <span className="font-mono-display text-[13px] text-[var(--color-accent-green)] tabnum">↗ {rate}</span>

      {/* Rating */}
      <span className="font-mono-display text-[13px] text-[var(--color-text-primary)] tabnum text-right">
        {rating != null ? Math.round(rating) : '—'} <span className="text-[var(--color-text-muted)]">ELO</span>
      </span>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[56px_1fr_90px_90px_120px] px-6 py-4 border-b border-[var(--color-surface)] items-center">
      <span className="h-3 w-6 rounded bg-[var(--color-surface-2)]" />
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-[var(--color-surface-2)]" />
        <span className="h-3 w-32 rounded bg-[var(--color-surface-2)]" />
      </div>
      <span className="h-3 w-12 rounded bg-[var(--color-surface-2)]" />
      <span className="h-3 w-12 rounded bg-[var(--color-surface-2)]" />
      <span className="h-3 w-16 rounded bg-[var(--color-surface-2)] justify-self-end" />
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
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] overflow-x-hidden">
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

      <Navbar />

      {/* ── Header ── */}
      <section className="dot-grid relative px-6 pt-16 pb-12 text-center overflow-hidden">
        <div className="max-w-2xl mx-auto fade-up">
          <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
            <h2
              className="font-mono-display font-bold text-[var(--color-text-primary)] tracking-tight"
              style={{ fontSize: 'clamp(28px, 5vw, 48px)' }}
            >
              Global Leaderboard
            </h2>
            <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-[#FF3355] font-mono-display text-[10px] tracking-widest px-3 py-1 rounded-full">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#FF3355] inline-block" />
              LIVE
            </span>
          </div>
          <p className="text-[var(--color-text-muted)] text-sm">
            The top warriors in competitive coding. Updated in real-time.
          </p>
        </div>
      </section>

      {/* ── Stat strip ── */}
      <section className="px-6 pb-10">
        <div className="max-w-3xl mx-auto grid grid-cols-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          {[
            { label: 'Total Ranked', value: total },
            { label: 'Your Rating',  value: me?.rating != null ? Math.round(me.rating) : '—' },
            { label: 'Your Rank',    value: me?.rank   != null ? `#${me.rank}`         : '—' },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`px-6 py-5 ${i < 2 ? 'border-r border-[var(--color-border)]' : ''}`}
            >
              <div className="font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)] uppercase">
                {s.label}
              </div>
              <div className="font-mono-display font-bold text-2xl text-[var(--color-text-primary)] tabnum mt-1">
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
            <span className="font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)]">
              TOP 9
            </span>
            <span className="font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)]">
              {timeAgo && `SYNCED ${timeAgo}`}
            </span>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="grid grid-cols-[56px_1fr_90px_90px_120px] px-6 py-3 border-b border-[var(--color-surface-2)]">
              {['#', 'PLAYER', 'WINS', 'WIN RATE', 'RATING'].map((h, i) => (
                <span
                  key={h}
                  className={`font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)] ${i === 4 ? 'text-right' : ''}`}
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
              <div className="px-6 py-8 text-center font-mono-display text-[12px] tracking-widest text-[var(--color-text-muted)]">
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
              <span className="font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)]">
                YOUR STANDING
              </span>
              <span className="font-mono-display text-[10px] tracking-widest text-[var(--color-accent-green)]">
                #{me.rank ?? '—'} OF {total}
              </span>
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-accent-green)]/30 rounded-xl overflow-hidden me-row">
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
      <section className="border-t border-[var(--color-surface-2)] px-6 py-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)]">
            DATA SOURCE · REDIS SORTED SET · LIVE
          </div>
          <button
            onClick={() => navigate('/')}
            className="font-mono-display text-[11px] tracking-widest text-[var(--color-text-secondary)] hover:text-[var(--color-accent-green)] transition-colors"
          >
            ← BACK TO HOME
          </button>
        </div>
      </section>
    </div>
  )
}
