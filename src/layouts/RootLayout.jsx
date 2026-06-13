import { useEffect, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import useMatchStore from "../store/matchStore"

/* Below this width we block the app and show a "use a real machine" notice */
const MIN_WIDTH = 768

/* ────────────────────────────────────────────────────────────
   DesktopOnly — Nothing-OS-style notice for narrow viewports.
   Shares the design language of the Login / Register pages.
   ──────────────────────────────────────────────────────────── */
function DesktopOnly() {
  return (
    <>
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/ndot-47');

        .desk-root {
          position: fixed; inset: 0; z-index: 9999;
          background: linear-gradient(180deg, #090909 0%, #0D0D0D 100%);
          color: rgba(255,255,255,0.92);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: grid; place-items: center;
          padding: 32px 24px;
          text-align: center;
        }
        .desk-root .label {
          font-family: 'Ndot-47', 'Ndot 47', ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.32em;
          color: rgba(255,255,255,0.38);
          text-transform: uppercase;
          margin-bottom: 28px;
        }
        .desk-root h1 {
          font-family: 'Ndot-47', 'Ndot 47', ui-monospace, monospace;
          font-size: 30px;
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: 0.02em;
          margin: 0 0 14px;
          max-width: 380px;
        }
        .desk-root p {
          font-size: 13px;
          font-weight: 300;
          color: rgba(255,255,255,0.55);
          line-height: 1.6;
          margin: 0 auto 28px;
          max-width: 340px;
        }
        .desk-root .specs {
          font-family: 'Ndot-47', 'Ndot 47', ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.18em;
          color: rgba(255,255,255,0.38);
          text-transform: uppercase;
          border-top: 1px solid rgba(255,255,255,0.10);
          padding-top: 18px;
          display: flex; flex-direction: column; gap: 6px;
          width: 100%; max-width: 280px;
        }
        .desk-root .specs .row {
          display: flex; justify-content: space-between;
        }
        .desk-root .dot {
          width: 6px; height: 6px;
          background: #4ADE80;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
          vertical-align: middle;
          box-shadow: 0 0 8px rgba(74,222,128,0.4);
        }
      `}</style>
      <div className="desk-root">
        <div>
          <div className="label"><span className="dot" />DUALDEV / VIEWPORT</div>
          <h1>Use a desktop or laptop.</h1>
          <p>
            DualDev requires a wide screen and a physical keyboard to run
            competitive coding matches. Open this page on a laptop or desktop
            with a viewport of at least {MIN_WIDTH}px.
          </p>
          <div className="specs">
            <div className="row"><span>Required Width</span><span>≥ {MIN_WIDTH}px</span></div>
            <div className="row"><span>Current Width</span><span>{typeof window !== 'undefined' ? window.innerWidth : 0}px</span></div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const fetchActiveMatch = useMatchStore((s) => s.fetchActiveMatch)
  const initMatch        = useMatchStore((s) => s.initMatch)
  const isAuthenticated  = useMatchStore((s) => s.isAuthenticated)

  /* Mobile guard — re-evaluate on resize */
  const [tooNarrow, setTooNarrow] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < MIN_WIDTH
  )
  useEffect(() => {
    const onResize = () => setTooNarrow(window.innerWidth < MIN_WIDTH)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* Auto-rejoin: every time the user is on a non-match route AND is
     authenticated, ask the server whether they're mid-match. If yes (and
     >60s remain), redirect to /match/:id. This fires on:
       — login (isAuthenticated flips true)
       — any client-side navigation that lands on a non-match route
     Skipped when already inside /match/* or /result/* so we don't loop. */
  useEffect(() => {
    if (!isAuthenticated) return

    const path = location.pathname
    if (path.startsWith('/match/') || path.startsWith('/result/')) return

    let cancelled = false
    ;(async () => {
      console.log("[active-match] checking…", { path })
      const active = await fetchActiveMatch()
      console.log("[active-match] response:", active)
      if (cancelled) return
      if (active?.active && active?.matchId) {
        console.log(`[active-match] → navigating to /match/${active.matchId}`)
        /* Hydrate the store BEFORE navigating so Match.jsx finds problem/opponent
           already set (fixes new-browser "LOADING MATCH..." stuck screen). */
        if (active.problem && active.opponent) {
          initMatch({
            matchId:  active.matchId,
            opponent: active.opponent,
            problem:  active.problem,
          })
        }
        navigate(`/match/${active.matchId}`, { replace: true })
      } else {
        console.log(`[active-match] not redirecting (reason: ${active?.reason || "none"})`)
      }
    })()
    return () => { cancelled = true }
    /* eslint-disable-next-line */
  }, [isAuthenticated, location.pathname])

  if (tooNarrow) return <DesktopOnly />

  return (
    <div>
      <Outlet />
    </div>
  )
}
