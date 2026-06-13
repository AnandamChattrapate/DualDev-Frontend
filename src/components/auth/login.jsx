import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router'
import useMatchStore from '../../store/matchStore'
import Register from './Register'

/* ────────────────────────────────────────────────────────────
   LOGIN — Precision-engineered OS surface.
   Reference: Nothing OS · Linear · Cursor · Render.
   System fonts only. No external libraries.
   ──────────────────────────────────────────────────────────── */

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/* ── Theme (shared with Register via localStorage) ────────── */
function useThemeMode() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    try { return localStorage.getItem('dualdev-theme') || 'dark' } catch { return 'dark' }
  })
  const toggle = () =>
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      try { localStorage.setItem('dualdev-theme', next) } catch {}
      return next
    })
  return [theme, toggle]
}

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}

/* ── Environment detection ────────────────────────────────── */
async function detectEnvironment() {
  const lines = ['Environment Ready']

  try {
    const data = navigator.userAgentData
    const brand = data?.brands?.find((b) => !/Not.?A.?Brand/i.test(b.brand))
    if (brand) {
      lines.push(`Browser: ${brand.brand} ${brand.version}`)
    } else {
      const m = navigator.userAgent.match(/(Edg|Chrome|Firefox|Safari|OPR)\/([\d.]+)/)
      if (m) lines.push(`Browser: ${m[1].replace('Edg', 'Edge').replace('OPR', 'Opera')} ${m[2].split('.')[0]}`)
    }
  } catch {}

  try {
    const p = navigator.userAgentData?.platform || navigator.platform
    if (p) lines.push(`Platform: ${p}`)
  } catch {}

  try {
    if (screen?.width && screen?.height) {
      lines.push(`Resolution: ${screen.width} × ${screen.height}`)
    }
  } catch {}

  let tz = null
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz) lines.push(`Timezone: ${tz}`)
  } catch {}

  try {
    if (typeof navigator.getBattery === 'function') {
      const b = await navigator.getBattery()
      const pct = Math.round((b.level ?? 0) * 100)
      lines.push(`Battery: ${pct}% ${b.charging ? 'Charging' : 'Discharging'}`)
    }
  } catch {}

  try {
    lines.push(`Connection: ${location.protocol === 'https:' ? 'Secure' : 'Standard'}`)
  } catch {}

  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl') || c.getContext('experimental-webgl')
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      if (ext) {
        const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        if (renderer) {
          const trimmed = renderer
            .replace(/^ANGLE\s*\(/, '')
            .replace(/\)$/, '')
            .split(',').slice(-1)[0]
            .replace(/Direct3D11.*$/, '')
            .trim()
          lines.push(`GPU: ${trimmed || renderer}`)
        }
      }
    }
  } catch {}

  try {
    if (tz) {
      const parts = tz.split('/')
      const region = parts[0]
      const city = parts.slice(-1)[0].replace(/_/g, ' ')
      lines.push(`Location: ${city}, ${region}`)
    }
  } catch {}

  lines.push('Session Initialized')
  return lines
}

/* ── Intelligence panel ───────────────────────────────────── */
function IntelPanel({ reducedMotion }) {
  const [lines, setLines] = useState([])
  const [idx, setIdx]     = useState(0)
  const [done, setDone]   = useState(false)

  useEffect(() => {
    let cancelled = false
    detectEnvironment().then((arr) => {
      if (!cancelled) setLines(arr)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (lines.length === 0) return
    if (reducedMotion) { setDone(true); return }
    if (idx >= lines.length) { setDone(true); return }
    const t = setTimeout(() => setIdx((i) => i + 1), 3000)
    return () => clearTimeout(t)
  }, [lines, idx, reducedMotion])

  return (
    <div className="intel-panel" aria-live="polite">
      {!done && lines[idx] && (
        <span key={idx} className="intel-line">{lines[idx]}</span>
      )}
      {done && (
        <span className="intel-online">
          <span className="intel-dot" />
          ONLINE
        </span>
      )}
    </div>
  )
}

/* ── Cursor trail ─────────────────────────────────────────── */
function CursorTrail({ reducedMotion }) {
  const ref = useRef(null)
  useEffect(() => {
    if (reducedMotion) return
    let mx = -100, my = -100
    let dx = -100, dy = -100
    let raf
    let visible = false
    const onMove = (e) => {
      mx = e.clientX
      my = e.clientY
      if (!visible && ref.current) {
        ref.current.style.opacity = '1'
        visible = true
      }
    }
    const onLeave = () => {
      if (ref.current) ref.current.style.opacity = '0'
      visible = false
    }
    const tick = () => {
      dx += (mx - dx) * 0.18
      dy += (my - dy) * 0.18
      if (ref.current) {
        ref.current.style.transform = `translate3d(${dx - 2}px, ${dy - 2}px, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseout',  onLeave)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout',  onLeave)
      cancelAnimationFrame(raf)
    }
  }, [reducedMotion])
  if (reducedMotion) return null
  return <div ref={ref} className="cursor-dot" aria-hidden="true" />
}

/* ── Film grain ───────────────────────────────────────────── */
function Grain({ reducedMotion, theme }) {
  const matrix = theme === 'light'
    ? '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'
    : '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'
  return (
    <svg className={`grain ${reducedMotion ? 'still' : ''}`} aria-hidden="true">
      <filter id="grainFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values={matrix} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grainFilter)" />
    </svg>
  )
}

/* ── Floating-label field ─────────────────────────────────── */
function Field({ label, type = 'text', value, onChange, autoFocus, autoComplete, name, validate }) {
  const [focused, setFocused] = useState(false)
  const [pulse,   setPulse]   = useState(false)
  const validRef = useRef(false)

  useEffect(() => {
    if (!validate) return
    const ok = validate(value)
    if (ok && !validRef.current && value.length > 0) {
      validRef.current = true
      setPulse(true)
      setTimeout(() => setPulse(false), 700)
    } else if (!ok) {
      validRef.current = false
    }
  }, [value, validate])

  const filled = value.length > 0

  return (
    <div className={`field ${focused ? 'focused' : ''} ${filled ? 'filled' : ''} ${pulse ? 'pulse' : ''}`}>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        spellCheck="false"
        placeholder=" "
        required
      />
      <label htmlFor={name}>{label}</label>
      <span className="underline" />
      <span className="underline-pulse" />
    </div>
  )
}

/* ── Continue button ──────────────────────────────────────── */
function ContinueButton({ phase, onClick, disabled }) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (phase !== 'authenticating') { setDots(''); return }
    let n = 0
    const id = setInterval(() => {
      n = (n + 1) % 4
      setDots('.'.repeat(n))
    }, 400)
    return () => clearInterval(id)
  }, [phase])

  let label = 'Continue'
  let suffix = '→'
  if (phase === 'authenticating') { label = `AUTHENTICATING${dots}`; suffix = '' }
  if (phase === 'verified')       { label = 'IDENTITY VERIFIED';     suffix = '' }
  if (phase === 'error')          { label = 'RETRY';                 suffix = '→' }

  return (
    <button
      type="submit"
      className={`continue ${phase}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="continue-label">{label}</span>
      {suffix && <span className="continue-arrow">{suffix}</span>}
    </button>
  )
}

/* ── Main ─────────────────────────────────────────────────── */
export function Login() {
  const navigate = useNavigate()
  const login    = useMatchStore((s) => s.login)

  const [showRegister, setShowRegister] = useState(false)
  const [theme, toggleTheme]            = useThemeMode()
  const [email,    setEmail]            = useState('')
  const [password, setPassword]         = useState('')
  const [phase,    setPhase]            = useState('idle')   // idle | authenticating | verified | welcome | error
  const [error,    setError]            = useState(null)

  const reducedMotion = useMemo(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  , [])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (phase !== 'idle' && phase !== 'error') return
    if (!email || !password) {
      setError('Both fields are required')
      setPhase('error')
      return
    }
    setError(null)
    setPhase('authenticating')
    try {
      const res = await login({ email, password })
      if (res?.success) {
        await new Promise((r) => setTimeout(r, 800))
        setPhase('verified')
        await new Promise((r) => setTimeout(r, 700))
        setPhase('welcome')
        await new Promise((r) => setTimeout(r, 1200))
        navigate('/')
      } else {
        throw new Error(res?.message || 'Authentication failed')
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication failed'
      setError(msg)
      setPhase('error')
    }
  }

  if (showRegister) return <Register />

  return (
    <>
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/ndot-47');

        .os-root {
          /* dark tokens (default) */
          --bg-top:    #090909;
          --bg-bot:    #0D0D0D;
          --t-primary: rgba(255, 255, 255, 0.92);
          --t-second:  rgba(255, 255, 255, 0.55);
          --t-mute:    rgba(255, 255, 255, 0.38);
          --t-dim:     rgba(255, 255, 255, 0.22);
          --hairline:  rgba(255, 255, 255, 0.10);
          --hairline2: rgba(255, 255, 255, 0.18);
          --accent:    #FFFFFF;
          --cursor:    rgba(255, 255, 255, 0.65);
          --grain-blend: overlay;
          --grain-opacity: 0.025;
          --autofill-bg: #0D0D0D;
          --hover-tint: rgba(255,255,255,0.02);
          --font-display: 'Ndot-47', 'Ndot 47', 'Ndot-55', ui-monospace, "JetBrains Mono", monospace;
          --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", "SF Pro Display",
                       Roboto, Helvetica, Arial, sans-serif;

          font-family: var(--font-body);
          color: var(--t-primary);
          background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bot) 100%);
          -webkit-font-smoothing: antialiased;
          font-feature-settings: "ss01", "cv01";
          letter-spacing: -0.005em;
          transition: background 0.5s ${EASE}, color 0.5s ${EASE};
        }
        .os-root[data-theme="light"] {
          /* warm muted gray — no harsh whites */
          --bg-top:    #DCDAD3;
          --bg-bot:    #D0CEC6;
          --t-primary: #1A1A18;
          --t-second:  #4F4F49;
          --t-mute:    #7E7E76;
          --t-dim:     #A5A59D;
          --hairline:  #B6B5AC;
          --hairline2: #9A998F;
          --accent:    #1A1A18;
          --cursor:    rgba(26, 26, 24, 0.7);
          --grain-blend: multiply;
          --grain-opacity: 0.05;
          --autofill-bg: #DCDAD3;
          --hover-tint: rgba(26, 26, 24, 0.04);
        }

        /* Ndot — for OS labels, headings, and system text */
        .brand, .heading, .intel-panel, .intel-line, .intel-online,
        .field label, .continue, .continue-label, .meta, .meta button,
        .welcome h1 {
          font-family: var(--font-display);
        }

        /* film grain */
        .grain {
          position: fixed; left: -50%; top: -50%;
          width: 200%; height: 200%;
          pointer-events: none; z-index: 1;
          opacity: var(--grain-opacity);
          mix-blend-mode: var(--grain-blend);
          animation: grainDrift 14s steps(8) infinite;
        }
        .grain.still { animation: none; }
        @keyframes grainDrift {
          0%   { transform: translate(0, 0); }
          12%  { transform: translate(-1%, -1.2%); }
          25%  { transform: translate(1.2%, -1%); }
          37%  { transform: translate(-0.8%, 1.4%); }
          50%  { transform: translate(1.5%, 0.8%); }
          62%  { transform: translate(-1.2%, -0.4%); }
          75%  { transform: translate(0.6%, -1.5%); }
          87%  { transform: translate(-1.4%, 0.6%); }
          100% { transform: translate(0, 0); }
        }

        /* cursor trail */
        .cursor-dot {
          position: fixed; left: 0; top: 0;
          width: 4px; height: 4px;
          background: var(--cursor);
          border-radius: 50%;
          pointer-events: none;
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.3s ${EASE}, background 0.5s ${EASE};
          will-change: transform;
        }
        @media (hover: none), (max-width: 700px) { .cursor-dot { display: none; } }

        /* theme toggle (top-left) */
        .theme-toggle {
          position: fixed;
          top: 28px; left: 32px;
          z-index: 10;
          width: 30px; height: 30px;
          background: transparent;
          border: 1px solid var(--hairline2);
          color: var(--t-second);
          display: grid; place-items: center;
          cursor: pointer;
          border-radius: 0;
          padding: 0;
          transition: border-color 0.5s ${EASE}, color 0.5s ${EASE}, background 0.5s ${EASE};
        }
        .theme-toggle:hover {
          border-color: var(--accent);
          color: var(--t-primary);
          background: var(--hover-tint);
        }
        .theme-toggle svg { width: 14px; height: 14px; stroke: currentColor; fill: none; }
        @media (max-width: 640px) {
          .theme-toggle { top: 18px; left: 18px; }
        }

        /* intel panel */
        .intel-panel {
          position: fixed;
          top: 28px; right: 32px;
          z-index: 10;
          font-size: 10.5px;
          font-weight: 200;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--t-second);
          min-height: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .intel-line {
          display: inline-block;
          animation: intelLine 3s ${EASE} forwards;
          will-change: transform, opacity;
        }
        @keyframes intelLine {
          0%   { opacity: 0; transform: translateY(0); }
          20%  { opacity: 1; transform: translateY(0); }
          86%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
        .intel-online {
          display: inline-flex; align-items: center; gap: 8px;
          color: var(--t-primary);
        }
        .intel-dot {
          width: 6px; height: 6px;
          background: #4ADE80;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
          animation: dotBreathe 3s ease-in-out infinite;
        }
        @keyframes dotBreathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.18); }
        }
        @media (prefers-reduced-motion: reduce) {
          .intel-line { animation: none; opacity: 1; }
          .intel-dot  { animation: none; }
        }
        @media (max-width: 640px) { .intel-panel { display: none; } }

        /* layout */
        .stage {
          position: relative; z-index: 2;
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px 24px;
        }
        .card {
          width: 100%;
          max-width: 360px;
          position: relative;
          transition: opacity 0.6s ${EASE}, transform 0.6s ${EASE}, filter 0.6s ${EASE};
        }
        .card.fading { opacity: 0; transform: translateY(-12px); filter: blur(6px); pointer-events: none; }

        .brand {
          font-size: 10px;
          letter-spacing: 0.32em;
          font-weight: 300;
          color: var(--t-mute);
          text-transform: uppercase;
          margin-bottom: 56px;
          display: flex; align-items: center; gap: 10px;
        }
        .brand::before {
          content: ''; display: inline-block;
          width: 18px; height: 1px;
          background: var(--hairline2);
        }

        .heading {
          font-size: 42px;
          font-weight: 400;
          line-height: 1.05;
          letter-spacing: 0.02em;
          color: var(--t-primary);
          margin: 0 0 8px;
        }
        .heading-sub {
          font-size: 12px;
          color: var(--t-second);
          font-weight: 300;
          letter-spacing: 0.02em;
          margin: 0 0 48px;
        }

        /* field */
        .field { position: relative; margin-bottom: 28px; }
        .field input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--hairline);
          padding: 18px 0 10px;
          color: var(--t-primary);
          font-size: 15px;
          font-weight: 200;
          letter-spacing: 0.01em;
          font-family: inherit;
          outline: none;
          caret-color: var(--accent);
          transition: border-color 0.5s ${EASE}, color 0.5s ${EASE};
        }
        .field input::placeholder { color: transparent; }
        .field input:-webkit-autofill {
          -webkit-text-fill-color: var(--t-primary);
          -webkit-box-shadow: 0 0 0 100px var(--autofill-bg) inset;
          transition: background-color 9999s;
        }
        .field label {
          position: absolute;
          left: 0;
          top: 18px;
          font-size: 13px;
          font-weight: 300;
          color: var(--t-second);
          letter-spacing: 0.10em;
          text-transform: uppercase;
          pointer-events: none;
          transform-origin: left top;
          transition: transform 0.55s ${EASE}, color 0.55s ${EASE};
        }
        .field.focused label,
        .field.filled  label {
          transform: translateY(-18px) scale(0.78);
          color: var(--t-mute);
        }
        .field.focused input { border-bottom-color: transparent; }
        .field .underline {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 1px;
          background: var(--accent);
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 0.7s ${EASE}, background 0.5s ${EASE};
        }
        .field.focused .underline { transform: scaleX(1); }
        .field .underline-pulse {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          height: 1px;
          background: var(--accent);
          transform: scaleX(0);
          transform-origin: left center;
          opacity: 0;
        }
        .field.pulse .underline-pulse { animation: underlinePulse 0.7s ${EASE}; }
        @keyframes underlinePulse {
          0%   { transform: scaleX(0); opacity: 0; }
          40%  { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }

        /* button */
        .continue {
          margin-top: 28px;
          width: 100%;
          background: transparent;
          border: 1px solid var(--hairline2);
          color: var(--t-primary);
          padding: 16px 22px;
          font-size: 12px;
          font-weight: 300;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-family: inherit;
          display: flex; align-items: center; justify-content: space-between;
          cursor: pointer;
          transition: border-color 0.5s ${EASE}, background 0.5s ${EASE}, color 0.5s ${EASE}, opacity 0.5s ${EASE};
          border-radius: 0;
        }
        .continue-label { opacity: 0.92; transition: opacity 0.5s ${EASE}; }
        .continue:hover:not(:disabled) {
          border-color: var(--accent);
          background: var(--hover-tint);
        }
        .continue:hover:not(:disabled) .continue-label { opacity: 1; }
        .continue:disabled { cursor: default; opacity: 0.95; }
        .continue-arrow {
          display: inline-block;
          font-weight: 200;
          transition: transform 0.6s ${EASE};
        }
        .continue:hover:not(:disabled) .continue-arrow { transform: translateX(4px); }
        .continue.authenticating { border-color: var(--hairline); color: var(--t-second); }
        .continue.verified       { border-color: rgba(74, 222, 128, 0.5); color: rgba(74, 222, 128, 0.95); }
        .continue.error          { border-color: rgba(248, 113, 113, 0.35); }

        .err {
          margin-top: 18px;
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.08em;
          color: rgba(248, 113, 113, 0.85);
          text-transform: uppercase;
        }
        .os-root[data-theme="light"] .err { color: rgba(190, 18, 60, 0.85); }

        .meta {
          margin-top: 56px;
          display: flex; justify-content: space-between; align-items: center;
          font-size: 10.5px;
          letter-spacing: 0.16em;
          font-weight: 300;
          text-transform: uppercase;
          color: var(--t-mute);
        }
        .meta button {
          background: transparent; border: none; color: var(--t-second);
          font: inherit; cursor: pointer; padding: 0;
          letter-spacing: inherit;
          transition: color 0.5s ${EASE};
        }
        .meta button:hover { color: var(--t-primary); }

        /* welcome screen */
        .welcome {
          position: fixed; inset: 0;
          display: grid; place-items: center;
          z-index: 20;
          color: var(--t-primary);
          opacity: 0;
          animation: welcomeIn 0.9s ${EASE} forwards;
          background: linear-gradient(180deg, var(--bg-top), var(--bg-bot));
        }
        @keyframes welcomeIn { from { opacity: 0; } to { opacity: 1; } }
        .welcome h1 {
          font-size: 72px;
          font-weight: 400;
          letter-spacing: 0.02em;
          margin: 0;
          color: var(--t-primary);
          opacity: 0;
          transform: translateY(8px);
          animation: welcomeText 1.4s ${EASE} 0.15s forwards;
        }
        @keyframes welcomeText { to { opacity: 1; transform: translateY(0); } }

        @media (prefers-reduced-motion: reduce) {
          .card, .continue, .continue-arrow, .field input, .field label,
          .underline, .welcome, .welcome h1 {
            transition: none !important; animation: none !important;
          }
        }

        @media (max-width: 480px) {
          .heading { font-size: 32px; }
          .heading-sub { margin-bottom: 36px; }
          .brand { margin-bottom: 40px; }
        }
      `}</style>

      <div className="os-root fixed inset-0 overflow-hidden" data-theme={theme}>
        <Grain reducedMotion={reducedMotion} theme={theme} />
        <CursorTrail reducedMotion={reducedMotion} />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <IntelPanel reducedMotion={reducedMotion} />

        <div className="stage">
          {phase !== 'welcome' && (
            <form
              onSubmit={handleSubmit}
              className={`card ${phase === 'welcome' ? 'fading' : ''}`}
              noValidate
            >
              <div className="brand">DUALDEV / AUTH</div>

              <h1 className="heading">Sign In</h1>
              <p className="heading-sub">Verify identity to continue.</p>

              <Field
                label="Email"
                type="email"
                name="email"
                value={email}
                onChange={setEmail}
                autoFocus
                autoComplete="email"
                validate={(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
              />
              <Field
                label="Password"
                type="password"
                name="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                validate={(v) => v.length >= 4}
              />

              {error && phase === 'error' && (
                <div className="err">{error}</div>
              )}

              <ContinueButton
                phase={phase}
                onClick={handleSubmit}
                disabled={phase === 'authenticating' || phase === 'verified'}
              />

              <div className="meta">
                <span>Encrypted Channel</span>
                <button type="button" onClick={() => setShowRegister(true)}>
                  Create Account →
                </button>
              </div>
            </form>
          )}

          {phase === 'welcome' && (
            <div className="welcome">
              <h1>Welcome.</h1>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Login
