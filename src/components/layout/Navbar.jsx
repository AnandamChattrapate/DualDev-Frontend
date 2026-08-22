import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Sun, Moon } from 'lucide-react'
import useMatchStore from '../../store/matchStore.js'
import useThemeStore from '../../store/themeStore.js'

/* Shared top navbar — used by Home and every other page (Leaderboard,
   Profile, …) so the app has one consistent nav instead of each page
   rolling its own. Self-contained: brings its own brand-wordmark +
   home-btn styles, only depends on the global --color-* tokens. */
export default function Navbar() {
  const navigate         = useNavigate()
  const isAuthenticated  = useMatchStore((s) => s.isAuthenticated)
  const logout           = useMatchStore((s) => s.logout)
  const theme            = useThemeStore((s) => s.theme)
  const toggleTheme      = useThemeStore((s) => s.toggleTheme)

  const handleLogout = async () => {
    await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {}, { withCredentials: true }).catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <header
      className="dd-nav sticky top-0 z-40 border-b"
      style={{ borderColor: 'var(--color-border)', background: 'color-mix(in srgb, var(--color-bg) 92%, transparent)', backdropFilter: 'blur(8px)' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&display=swap');

        .dd-nav .brand-wordmark {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          letter-spacing: -0.05em;
          line-height: 1;
          display: inline-flex;
          align-items: baseline;
          position: relative;
        }
        .dd-nav .brand-wordmark .brand-dual {
          color: var(--color-text-primary);
        }
        .dd-nav .brand-wordmark .brand-dev {
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
          animation: dd-brandSheen 4.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          filter: drop-shadow(0 0 18px rgba(244,177,131,0.18));
        }
        @keyframes dd-brandSheen {
          0%, 55% { background-position: 120% 50%; }
          100% { background-position: -120% 50%; }
        }
        .dd-nav .brand-wordmark:hover .brand-dev {
          animation-duration: 1.6s;
          filter: drop-shadow(0 0 22px rgba(244,177,131,0.35));
        }
        @media (prefers-reduced-motion: reduce) {
          .dd-nav .brand-wordmark .brand-dev {
            animation: none !important;
            -webkit-text-fill-color: #F4B183;
            background: none;
            color: #F4B183;
            filter: none;
          }
        }

        .dd-nav .home-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          height: 36px;
          padding: 0 1.15rem;
          font-size: 14px;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .dd-nav .home-btn-primary {
          background: var(--color-accent-green);
          color: #0A0A0A;
        }
        .dd-nav .home-btn-primary:hover {
          filter: brightness(1.06);
        }
        .dd-nav .home-btn-secondary {
          background: transparent;
          color: var(--color-text-primary);
          border-color: var(--color-border);
        }
        .dd-nav .home-btn-secondary:hover {
          border-color: var(--color-text-secondary);
        }
        .dd-nav .home-btn-ghost {
          background: transparent;
          color: var(--color-text-secondary);
          border-color: transparent;
          height: 36px;
          padding: 0 0.75rem;
          font-weight: 500;
        }
        .dd-nav .home-btn-ghost:hover {
          color: var(--color-text-primary);
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="brand-wordmark text-[40px] cursor-pointer"
          aria-label="DualDev home"
        >
          <span className="brand-dual">DUAL</span>
          <span className="brand-dev">DEV</span>
        </button>

        <nav className="hidden sm:flex items-center gap-1">
          <button type="button" className="home-btn home-btn-ghost" onClick={() => navigate('/leaderboard')}>
            Leaderboard
          </button>
          {isAuthenticated && (
            <button type="button" className="home-btn home-btn-ghost" onClick={() => navigate('/profile')}>
              Profile
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="home-btn home-btn-secondary !w-9 !px-0"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {isAuthenticated ? (
            <button type="button" onClick={handleLogout} className="home-btn home-btn-secondary text-sm">
              Log out
            </button>
          ) : (
            <>
              <button type="button" onClick={() => navigate('/login')} className="home-btn home-btn-secondary text-sm">
                Log in
              </button>
              <button type="button" onClick={() => navigate('/login')} className="home-btn home-btn-primary text-sm">
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
