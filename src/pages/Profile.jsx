import { useNavigate } from 'react-router-dom'
import useMatchStore from '../store/matchStore'
import Navbar from '../components/layout/Navbar.jsx'

/* ────────────────────────────────────────────────────────────
   /profile
   Matches the visual language of Leaderboard.jsx:
   var(--color-bg) bg, Space Mono display, themed green accent, dot-grid.
   Uses the shared <Navbar /> so every page carries the same header.
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

      <Navbar />

      {!isAuthenticated || !currentUser ? (
        /* Navbar is 3.5rem of normal flow above this, so subtract it rather
           than using a full min-h-screen and overflowing the viewport. */
        <section className="dot-grid min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 text-center">
          <div className="fade-up">
            <h2 className="font-mono-display font-bold text-2xl mb-2">Log in to view your profile</h2>
            <p className="text-[var(--color-text-muted)] text-sm mb-6">
              Your stats, rank, and match history live here once you're signed in.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="font-mono-display text-[13px] tracking-widest px-5 py-3 rounded-full bg-[var(--color-accent-green)] text-black font-bold hover:brightness-95 transition"
            >
              LOG IN
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="dot-grid relative px-6 pt-16 pb-10">
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
                  style={{ background: 'var(--color-surface-2)', color: 'var(--color-accent-green)' }}
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
                    Rank <span className="text-[var(--color-accent-green)] font-semibold">#{currentUser.rank}</span>
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
                // "0%" reads as "you're bad at this" — only meaningful once
                // they've actually played; show "—" before that instead.
                { label: 'Accuracy', value: !currentUser.totalMatches ? '—' : `${currentUser.accuracy ?? 0}%` },
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
