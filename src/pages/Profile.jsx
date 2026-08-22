import { useNavigate } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import useMatchStore from '../store/matchStore'
import useThemeStore from '../store/themeStore'

/* ────────────────────────────────────────────────────────────
   /profile
   Matches the visual language of Leaderboard.jsx:
   var(--color-bg) bg, Space Mono display, #00FF85 accent, dot-grid.
   Fields come straight from the authenticated user in matchStore
   (populated via /api/auth/me on load).
   ──────────────────────────────────────────────────────────── */

const winRate = (wins = 0, losses = 0) => {
  const total = wins + losses
  if (total === 0) return null
  return Math.round((wins / total) * 100)
}

const solveCount = (solvedProblems) =>
  Array.isArray(solvedProblems) ? solvedProblems.length : 0

export default function Profile() {
  const navigate        = useNavigate()
  const isAuthenticated = useMatchStore((s) => s.isAuthenticated)
  const currentUser     = useMatchStore((s) => s.currentUser)
  const theme           = useThemeStore((s) => s.theme)
  const toggleTheme     = useThemeStore((s) => s.toggleTheme)

  const rate = currentUser ? winRate(currentUser.wins, currentUser.losses) : null
  const solved = currentUser ? solveCount(currentUser.solvedProblems) : 0
  const initial = (currentUser?.username || '?').slice(0, 1).toUpperCase()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .font-mono-display { font-family: 'Space Mono', monospace; }
        .tabnum { font-variant-numeric: tabular-nums; }
        .dot-grid {
          background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
      `}</style>

      {/* ── Minimal nav (matches Leaderboard.jsx) ── */}
      <nav className="fixed top-4 left-0 w-full z-50 px-5">
        <div className="max-w-[82rem] mx-auto h-[72px] px-10 flex items-center justify-between rounded-full border border-[var(--color-border)]/60 bg-[var(--color-surface)]/25 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
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
              Profile
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
          </div>
        </div>
      </nav>

      {!isAuthenticated || !currentUser ? (
        <section className="dot-grid min-h-screen flex items-center justify-center px-6 text-center">
          <div className="fade-up">
            <h2 className="font-mono-display font-bold text-2xl mb-2">Log in to view your profile</h2>
            <p className="text-[var(--color-text-muted)] text-sm mb-6">
              Your stats, rank, and match history live here once you're signed in.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="font-mono-display text-[13px] tracking-widest px-5 py-3 rounded-full bg-[#00FF85] text-black font-bold hover:brightness-95 transition"
            >
              LOG IN
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="dot-grid relative px-6 pt-36 pb-10">
            <div className="max-w-3xl mx-auto fade-up flex flex-col md:flex-row md:items-center gap-6">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt=""
                  className="w-20 h-20 rounded-2xl object-cover border border-[var(--color-border)]"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold border border-[var(--color-border)]"
                  style={{ background: 'var(--color-surface-2)', color: '#00FF85' }}
                >
                  {initial}
                </div>
              )}
              <div>
                <h2 className="font-mono-display font-bold text-3xl leading-none mb-1">
                  {currentUser.username}
                </h2>
                <p className="text-[var(--color-text-muted)] text-sm">{currentUser.email}</p>
                {currentUser.rank != null && (
                  <p className="text-sm mt-2">
                    Rank <span className="text-[#00FF85] font-semibold">#{currentUser.rank}</span>
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="px-6 pb-20">
            <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Rating', value: currentUser.rating ?? 1000 },
                { label: 'Wins', value: currentUser.wins ?? 0 },
                { label: 'Losses', value: currentUser.losses ?? 0 },
                { label: 'Win rate', value: rate == null ? '—' : `${rate}%` },
                { label: 'Matches', value: currentUser.totalMatches ?? 0 },
                { label: 'Accuracy', value: `${currentUser.accuracy ?? 0}%` },
                { label: 'Solved', value: solved },
                { label: 'Record', value: `${currentUser.wins ?? 0}–${currentUser.losses ?? 0}` },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3"
                >
                  <div className="font-mono-display text-[10px] tracking-widest text-[var(--color-text-muted)] uppercase mb-1">
                    {item.label}
                  </div>
                  <div className="font-mono-display text-xl font-bold tabnum">{item.value}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
