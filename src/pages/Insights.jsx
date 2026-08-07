import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Sun, Moon } from 'lucide-react'
import useMatchStore from '../store/matchStore'
import useThemeStore from '../store/themeStore'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'

/* ────────────────────────────────────────────────────────────
   /insights
   Public platform analytics — matches the visual language of
   Home.jsx/Leaderboard.jsx: var(--color-bg) bg, Space Mono display,
   #00FF85 accent, dot-grid header.
   ──────────────────────────────────────────────────────────── */

const BASE_URL = import.meta.env.VITE_API_URL

function StatTile({ label, value, loading }) {
  return (
    <div className="text-center px-4">
      {loading ? (
        <div className="h-[30px] w-16 mx-auto bg-[var(--color-surface-2)] rounded-md animate-pulse" />
      ) : (
        <div className="font-mono-display text-[28px] font-bold text-[#00FF85] tracking-tight tabnum">
          {value}
        </div>
      )}
      <div className="text-[var(--color-text-muted)] text-[10px] mt-1 uppercase tracking-[1px]">
        {label}
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
      <div className="mb-4">
        <div className="font-mono-display text-[13px] text-[var(--color-text-primary)] font-bold">{title}</div>
        {subtitle && <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  )
}

const fmtDay = (d) => {
  const date = new Date(d.date || d.t)
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
const fmtTime = (d) => new Date(d.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function Insights() {
  const navigate        = useNavigate()
  const isAuthenticated  = useMatchStore((s) => s.isAuthenticated)
  const currentUser      = useMatchStore((s) => s.currentUser)
  const theme            = useThemeStore((s) => s.theme)
  const toggleTheme      = useThemeStore((s) => s.toggleTheme)

  const [summary,        setSummary]        = useState(null)
  const [onlinePoints,   setOnlinePoints]    = useState([])
  const [signupPoints,   setSignupPoints]    = useState([])
  const [matchPoints,    setMatchPoints]     = useState([])
  const [recentMatches,  setRecentMatches]   = useState([])
  const [loading,        setLoading]         = useState(true)
  const [error,          setError]           = useState(null)

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/insights/summary`)
      setSummary(res.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load stats')
    }
  }

  const fetchAll = async () => {
    try {
      const [sum, online, signups, matches, recent] = await Promise.all([
        axios.get(`${BASE_URL}/api/insights/summary`),
        axios.get(`${BASE_URL}/api/insights/online-timeseries`, { params: { hours: 24 } }),
        axios.get(`${BASE_URL}/api/insights/signups-timeseries`, { params: { days: 30 } }),
        axios.get(`${BASE_URL}/api/insights/matches-timeseries`, { params: { days: 30 } }),
        axios.get(`${BASE_URL}/api/insights/recent-matches`, { params: { limit: 20 } }),
      ])
      setSummary(sum.data)
      setOnlinePoints(online.data.points || [])
      setSignupPoints(signups.data.points || [])
      setMatchPoints(matches.data.points || [])
      setRecentMatches(recent.data.matches || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  /* Full load once, then just re-poll the live summary tiles every 4s
     (3-5s cadence) — the historical charts don't need to refetch that often. */
  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchSummary, 4000)
    return () => clearInterval(id)
  }, [])

  const decisive = summary?.resultBreakdown?.decisive ?? 0
  const draws    = summary?.resultBreakdown?.draws ?? 0
  const totalDecided = decisive + draws

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
        @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
      `}</style>

      {/* ── Nav ── */}
      <nav className="fixed top-4 left-0 w-full z-50 px-5">
        <div className="max-w-[82rem] mx-auto h-[72px] px-10 flex items-center justify-between rounded-full border border-[var(--color-border)]/60 bg-[var(--color-surface)]/25 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer select-none">
            <h1 className="font-claude text-[40px] font-extrabold tracking-[-2px] leading-none">
              <span className="text-[var(--color-text-primary)]">DUAL</span>
              <span className="text-[#F4B183]">DEV</span>
            </h1>
          </button>

          <div className="hidden md:flex items-center gap-14">
            <button
              onClick={() => navigate('/')}
              className="cursor-pointer text-[16px] font-medium tracking-wide text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all duration-300"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/leaderboard')}
              className="cursor-pointer text-[16px] font-medium tracking-wide text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all duration-300"
            >
              Leaderboard
            </button>
            <span className="text-[16px] font-medium tracking-wide text-[var(--color-text-primary)]">
              Insights
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="cursor-pointer h-10 w-10 flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[#00FF85]"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              <span className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse" />
              {currentUser ? (
                <span className="text-sm text-[var(--color-text-primary)]">{currentUser.username}</span>
              ) : (
                <span className="text-sm text-[var(--color-text-secondary)]">Guest</span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Header ── */}
      <section className="dot-grid relative px-6 pt-36 pb-10 text-center overflow-hidden">
        <div className="max-w-2xl mx-auto fade-up">
          <div className="flex items-center justify-center gap-3 mb-3 flex-wrap">
            <h2
              className="font-mono-display font-bold text-[var(--color-text-primary)] tracking-tight"
              style={{ fontSize: 'clamp(28px, 5vw, 48px)' }}
            >
              Platform Insights
            </h2>
            <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-[#FF3355] font-mono-display text-[10px] tracking-widest px-3 py-1 rounded-full">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#FF3355] inline-block" />
              LIVE
            </span>
          </div>
          <p className="text-[var(--color-text-muted)] text-sm">
            Real activity on DualDev — users, matches, and who's online right now.
          </p>
        </div>
      </section>

      {error && (
        <div className="text-center py-2 font-mono-display text-[11px] text-[#FF4444] tracking-wider bg-red-500/5 border-y border-red-500/10">
          Insights unavailable — {error}
        </div>
      )}

      {/* ── Summary tiles ── */}
      <section className="px-6 pb-10">
        <div className="max-w-5xl mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl grid grid-cols-4 divide-x divide-[var(--color-border)] py-8 px-6">
          <StatTile label="Total Users"    value={summary?.totalUsers ?? 0}      loading={loading} />
          <StatTile label="Players Online" value={summary?.playersOnline ?? 0}   loading={loading} />
          <StatTile label="Live Matches"   value={summary?.liveMatchesNow ?? 0}  loading={loading} />
          <StatTile label="Total Matches"  value={summary?.totalMatches ?? 0}    loading={loading} />
        </div>
      </section>

      {/* ── Charts ── */}
      <section className="px-6 pb-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard title="Online Users" subtitle="Last 24 hours">
            <LineChart
              data={onlinePoints.map((p) => ({ x: p.t, y: p.onlineCount }))}
              color="var(--color-accent-green)"
              formatX={(d) => fmtTime({ t: d.x })}
              formatY={(d) => `${d.y} online`}
              ariaLabel="Online users over the last 24 hours"
            />
          </ChartCard>

          <ChartCard title="Matches Played" subtitle="Last 30 days">
            <BarChart
              data={matchPoints.map((p) => ({ label: p.date, value: p.count }))}
              color="var(--color-accent-orange)"
              formatLabel={(d) => fmtDay({ date: d.label })}
              formatValue={(d) => `${d.value} matches`}
              ariaLabel="Matches played per day over the last 30 days"
            />
          </ChartCard>

          <ChartCard title="New Signups" subtitle="Last 30 days">
            <BarChart
              data={signupPoints.map((p) => ({ label: p.date, value: p.count }))}
              color="var(--color-accent-green)"
              formatLabel={(d) => fmtDay({ date: d.label })}
              formatValue={(d) => `${d.value} new users`}
              ariaLabel="New user signups per day over the last 30 days"
            />
          </ChartCard>

          <ChartCard title="Match Outcomes" subtitle="All-time">
            <div className="flex items-center gap-8 py-6">
              <svg viewBox="0 0 42 42" className="w-32 h-32 shrink-0" role="img" aria-label="Decisive matches vs draws">
                <circle cx="21" cy="21" r="15.9" fill="transparent" stroke="var(--color-border)" strokeWidth="4" />
                {totalDecided > 0 && (
                  <>
                    <circle
                      cx="21" cy="21" r="15.9" fill="transparent"
                      stroke="var(--color-accent-green)" strokeWidth="4"
                      strokeDasharray={`${(decisive / totalDecided) * 100} ${100 - (decisive / totalDecided) * 100}`}
                      strokeDashoffset="25" strokeLinecap="round"
                    />
                    <circle
                      cx="21" cy="21" r="15.9" fill="transparent"
                      stroke="#FFD166" strokeWidth="4"
                      strokeDasharray={`${(draws / totalDecided) * 100} ${100 - (draws / totalDecided) * 100}`}
                      strokeDashoffset={`${25 - (decisive / totalDecided) * 100}`} strokeLinecap="round"
                    />
                  </>
                )}
              </svg>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-green)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">Decisive</span>
                  <span className="font-mono-display font-bold text-sm text-[var(--color-text-primary)] tabnum">{decisive}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFD166]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">Draws</span>
                  <span className="font-mono-display font-bold text-sm text-[var(--color-text-primary)] tabnum">{draws}</span>
                </div>
              </div>
            </div>
          </ChartCard>
        </div>
      </section>

      {/* ── Recent matches ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-3 px-1 font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)]">
            RECENT MATCHES
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-[var(--color-surface-2)]">
                  {['Player A', 'Player B', 'Result', 'Problem', 'Difficulty', 'Finished'].map((h) => (
                    <th key={h} className="px-5 py-3 font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && recentMatches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center font-mono-display text-[12px] tracking-widest text-[var(--color-text-muted)]">
                      NO MATCHES PLAYED YET
                    </td>
                  </tr>
                )}
                {recentMatches.map((m) => (
                  <tr key={m.matchId} className="border-b border-[var(--color-surface-2)] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3 text-[13px] text-[var(--color-text-primary)]">
                      {m.playerA?.username || 'Unknown'}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[var(--color-text-primary)]">
                      {m.playerB?.username || 'Unknown'}
                    </td>
                    <td className="px-5 py-3 text-[13px]">
                      {m.winner === 'draw' ? (
                        <span className="text-[#FFD166]">Draw</span>
                      ) : (
                        <span className="text-[var(--color-accent-green)]">Decisive</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[var(--color-text-secondary)]">
                      {m.problem?.title || '—'}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[var(--color-text-secondary)]">
                      {m.problem?.difficulty || '—'}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[var(--color-text-muted)]">
                      {m.finishedAt ? new Date(m.finishedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Footer strip ── */}
      <section className="border-t border-[var(--color-surface-2)] px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)]">
            DATA SOURCE · MONGODB + REDIS · UPDATED EVERY 4S
          </div>
          <button
            onClick={() => navigate('/')}
            className="font-mono-display text-[11px] tracking-widest text-[var(--color-text-secondary)] hover:text-[#00FF85] transition-colors"
          >
            ← BACK TO HOME
          </button>
        </div>
      </section>
    </div>
  )
}
