import React, { useState, useEffect, useRef, useMemo } from 'react'
import axios from 'axios'
import Login from './login'

/* ────────────────────────────────────────────────────────────
   REGISTER — Sibling of Sign In.
   Same precision OS surface; the system quietly provisions
   a new workspace.
   ──────────────────────────────────────────────────────────── */

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/* ── Theme (shared with Login via localStorage) ───────────── */
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
    lines.push(`Network: ${navigator.onLine ? 'Stable' : 'Reconnecting'}`)
  } catch {}

  try {
    if (tz) {
      const parts = tz.split('/')
      const region = parts[0]
      const city = parts.slice(-1)[0].replace(/_/g, ' ')
      lines.push(`Location: ${city}, ${region}`)
    }
  } catch {}

  lines.push('Security Check Complete')
  lines.push('Workspace Ready')
  return lines
}

/* ── Intelligence panel ───────────────────────────────────── */
function IntelPanel({ reducedMotion, status, theme }) {
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

  /* ACTIVE dot adapts to theme; ONLINE stays green in both */
  const dotColor =
    status === 'active'
      ? (theme === 'light' ? '#111111' : '#FFFFFF')
      : '#4ADE80'
  const dotShadow =
    status === 'active'
      ? (theme === 'light' ? '0 0 8px rgba(17,17,17,0.35)' : '0 0 8px rgba(255,255,255,0.5)')
      : '0 0 8px rgba(74,222,128,0.4)'

  return (
    <div className="intel-panel" aria-live="polite">
      {!done && lines[idx] && (
        <span key={idx} className="intel-line">{lines[idx]}</span>
      )}
      {done && (
        <span className="intel-online">
          <span className="intel-dot" style={{ background: dotColor, boxShadow: dotShadow }} />
          {status === 'active' ? 'ACTIVE' : 'ONLINE'}
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

/* ── Film grain (color matrix flips by theme) ─────────────── */
function Grain({ reducedMotion, theme }) {
  const matrix = theme === 'light'
    ? '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'
    : '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'
  return (
    <svg className={`grain ${reducedMotion ? 'still' : ''}`} aria-hidden="true">
      <filter id="grainFilterReg">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values={matrix} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grainFilterReg)" />
    </svg>
  )
}

/* ── Floating-label field ─────────────────────────────────── */
function Field({
  label, type = 'text', value, onChange,
  autoFocus, autoComplete, name,
  validate, validMessage,
}) {
  const [focused, setFocused]       = useState(false)
  const [pulse,   setPulse]         = useState(false)
  const [showHint, setShowHint]     = useState(false)
  const validRef = useRef(false)
  const hintTimer = useRef(null)

  useEffect(() => {
    if (!validate) return
    const ok = validate(value)
    if (ok && !validRef.current && value.length > 0) {
      validRef.current = true
      setPulse(true)
      setShowHint(true)
      setTimeout(() => setPulse(false), 700)
      clearTimeout(hintTimer.current)
      hintTimer.current = setTimeout(() => setShowHint(false), 2000)
    } else if (!ok) {
      validRef.current = false
    }
    return () => clearTimeout(hintTimer.current)
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
      {validMessage && (
        <span className={`field-hint ${showHint ? 'show' : ''}`}>{validMessage}</span>
      )}
    </div>
  )
}

/* ── Submit button ────────────────────────────────────────── */
const BUTTON_SEQUENCE = [
  { label: 'INITIALIZING', dots: true,  dur: 1600 },
  { label: 'VERIFYING ENVIRONMENT', dur: 600 },
  { label: 'SECURING SESSION',      dur: 600 },
  { label: 'CREATING WORKSPACE',    dur: 600 },
  { label: 'IDENTITY CREATED',      dur: 500 },
]

function CreateButton({ phase, allValid, onClick, seqIndex, seqDots }) {
  let label = 'Create Account'
  let arrow = '→'

  if (phase === 'submitting' || phase === 'verified') {
    const step = BUTTON_SEQUENCE[seqIndex] || BUTTON_SEQUENCE[BUTTON_SEQUENCE.length - 1]
    label = step.dots ? `${step.label}${seqDots}` : step.label
    arrow = ''
  }
  if (phase === 'error') { label = 'RETRY'; arrow = '→' }

  /* Always clickable except during async work; visually marked
     `inactive` until all fields validate, but onClick still runs
     so the user gets specific feedback about what's missing.   */
  const disabled = phase === 'submitting' || phase === 'verified'
  const inactiveLook = !allValid && (phase === 'idle' || phase === 'error')

  return (
    <button
      type="submit"
      className={`continue ${phase} ${inactiveLook ? 'inactive' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="continue-label">{label}</span>
      {arrow && <span className="continue-arrow">{arrow}</span>}
    </button>
  )
}

/* ── Main ─────────────────────────────────────────────────── */
function Register() {
  const [showLogin, setShowLogin] = useState(false)
  const [theme, toggleTheme]      = useThemeMode()

  const [username, setUsername] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')

  const [phase, setPhase]       = useState('idle')   // idle | submitting | verified | sweeping | dashboard | error
  const [error, setError]       = useState(null)
  const [seqIndex, setSeqIndex] = useState(0)
  const [seqDots, setSeqDots]   = useState('')

  const reducedMotion = useMemo(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  , [])

  const v = {
    username: (s) => /^[a-zA-Z0-9_]{3,}$/.test(s),
    email:    (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
    password: (s) => s.length >= 8 && /[a-zA-Z]/.test(s) && /\d/.test(s),
    confirm:  (s) => s.length > 0 && s === password,
  }
  const allValid =
    v.username(username) && v.email(email) && v.password(password) && v.confirm(confirm)

  /* ── Button label sequence driver ─────────────────────── */
  useEffect(() => {
    if (phase !== 'submitting') return
    if (seqIndex === 0) {
      let n = 0
      const id = setInterval(() => {
        n = (n + 1) % 4
        setSeqDots('.'.repeat(n))
      }, 400)
      return () => clearInterval(id)
    }
  }, [phase, seqIndex])

  const runSuccessSequence = async () => {
    await new Promise((r) => setTimeout(r, BUTTON_SEQUENCE[0].dur))
    setSeqDots('')
    setSeqIndex(1)
    await new Promise((r) => setTimeout(r, BUTTON_SEQUENCE[1].dur))
    setSeqIndex(2)
    await new Promise((r) => setTimeout(r, BUTTON_SEQUENCE[2].dur))
    setSeqIndex(3)
    await new Promise((r) => setTimeout(r, BUTTON_SEQUENCE[3].dur))
    setSeqIndex(4)
    setPhase('verified')
    await new Promise((r) => setTimeout(r, BUTTON_SEQUENCE[4].dur))
    await new Promise((r) => setTimeout(r, 500))
    setPhase('sweeping')
    await new Promise((r) => setTimeout(r, 1100))
    setPhase('dashboard')
    await new Promise((r) => setTimeout(r, 1600))
    setShowLogin(true)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (phase === 'submitting' || phase === 'verified') return

    /* Field-specific feedback when fields are incomplete/invalid */
    if (!allValid) {
      let msg = 'Complete all fields to continue'
      if      (!username)            msg = 'Username is required'
      else if (!v.username(username)) msg = 'Username must be 3+ characters (letters, numbers, _)'
      else if (!email)               msg = 'Email is required'
      else if (!v.email(email))       msg = 'Enter a valid email address'
      else if (!password)            msg = 'Password is required'
      else if (!v.password(password)) msg = 'Password needs 8+ characters, a letter, and a number'
      else if (!confirm)             msg = 'Confirm your password'
      else if (!v.confirm(confirm))   msg = 'Passwords do not match'
      setError(msg)
      setPhase('error')
      return
    }
    setError(null)
    setSeqIndex(0)
    setSeqDots('')
    setPhase('submitting')
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        { username, email, password },
        { withCredentials: true }
      )
      if (res.data?.success) {
        await runSuccessSequence()
      } else {
        throw new Error(res.data?.message || 'Registration failed')
      }
    } catch (err) {
      setPhase('error')
      const msg = err.response?.data?.message || err.message || 'Registration failed'
      setError(msg)
      setSeqIndex(0)
      setSeqDots('')
    }
  }

  if (showLogin) return <Login />

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
          --shadow-line: 0 0 24px rgba(255,255,255,0.5);
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
          --shadow-line: 0 0 24px rgba(26, 26, 24, 0.28);
        }

        /* Ndot — for OS labels, headings, and system text */
        .brand, .heading, .intel-panel, .intel-line, .intel-online,
        .field label, .field-hint, .continue, .continue-label,
        .meta, .meta button, .dashboard h1, .dashboard p {
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
          transition: color 0.6s ${EASE};
        }
        .intel-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          display: inline-block;
          animation: dotBreathe 3s ease-in-out infinite;
          transition: background 0.6s ${EASE}, box-shadow 0.6s ${EASE};
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
          padding: 48px 24px;
        }
        .card {
          width: 100%;
          max-width: 380px;
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
          margin: 0 0 10px;
        }
        .heading-sub {
          font-size: 12px;
          color: var(--t-second);
          font-weight: 300;
          letter-spacing: 0.02em;
          margin: 0 0 44px;
        }

        /* field */
        .field { position: relative; margin-bottom: 24px; }
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
          transition: border-color 150ms ${EASE}, color 0.5s ${EASE};
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
          transition: transform 150ms ${EASE}, color 150ms ${EASE};
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
          transition: transform 150ms ${EASE}, background 0.5s ${EASE};
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
        .field.pulse .underline-pulse {
          animation: underlinePulse 0.7s ${EASE};
        }
        @keyframes underlinePulse {
          0%   { transform: scaleX(0); opacity: 0; }
          40%  { transform: scaleX(1); opacity: 1; }
          100% { transform: scaleX(1); opacity: 0; }
        }
        .field-hint {
          position: absolute;
          right: 0;
          top: 22px;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--t-second);
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.5s ${EASE}, transform 0.5s ${EASE}, color 0.5s ${EASE};
          pointer-events: none;
        }
        .field-hint.show { opacity: 1; transform: translateY(0); }

        /* button */
        .continue {
          margin-top: 32px;
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
        .continue:disabled { cursor: default; }
        .continue.inactive {
          border-color: var(--hairline);
          color: var(--t-dim);
          opacity: 0.75;
        }
        .continue.inactive:hover { border-color: var(--hairline2); color: var(--t-second); opacity: 0.9; }
        .continue-arrow {
          display: inline-block;
          font-weight: 200;
          transition: transform 0.6s ${EASE};
        }
        .continue:hover:not(:disabled) .continue-arrow { transform: translateX(4px); }
        .continue.submitting { border-color: var(--hairline); color: var(--t-second); }
        .continue.verified   { border-color: rgba(74, 222, 128, 0.5); color: rgba(74, 222, 128, 0.95); }
        .continue.error      { border-color: rgba(248, 113, 113, 0.35); }

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
          margin-top: 48px;
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

        /* sweep */
        .sweep {
          position: fixed;
          left: 50%; top: 50%;
          height: 1px;
          width: 0;
          background: var(--accent);
          transform: translate(-50%, -50%);
          z-index: 25;
          opacity: 0;
          box-shadow: var(--shadow-line);
        }
        .sweep.run { animation: sweepLine 1.1s ${EASE} forwards; }
        @keyframes sweepLine {
          0%   { width: 0;     opacity: 0; }
          20%  {               opacity: 1; }
          80%  { width: 100vw; opacity: 1; }
          100% { width: 100vw; opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sweep.run { animation: none; opacity: 0; }
        }

        /* dashboard placeholder */
        .dashboard {
          position: fixed; inset: 0;
          display: grid; place-items: center;
          z-index: 20;
          color: var(--t-primary);
          opacity: 0;
          background: linear-gradient(180deg, var(--bg-top), var(--bg-bot));
          animation: dashIn 0.9s ${EASE} forwards;
        }
        @keyframes dashIn { to { opacity: 1; } }
        .dashboard h1 {
          font-size: 64px;
          font-weight: 400;
          letter-spacing: 0.02em;
          margin: 0 0 14px;
          color: var(--t-primary);
          opacity: 0;
          transform: translateY(8px);
          animation: dashText 1.2s ${EASE} 0.15s forwards;
        }
        .dashboard p {
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--t-second);
          margin: 0;
          text-align: center;
          opacity: 0;
          animation: dashText 1.2s ${EASE} 0.4s forwards;
        }
        @keyframes dashText { to { opacity: 1; transform: translateY(0); } }

        @media (prefers-reduced-motion: reduce) {
          .card, .continue, .continue-arrow, .field input, .field label,
          .underline, .dashboard, .dashboard h1, .dashboard p, .field-hint {
            transition: none !important; animation: none !important;
          }
        }

        @media (max-width: 480px) {
          .heading { font-size: 32px; }
          .heading-sub { margin-bottom: 32px; }
          .brand { margin-bottom: 40px; }
          .field-hint { position: static; display: block; margin-top: 6px; }
        }
      `}</style>

      <div className="os-root fixed inset-0 overflow-hidden" data-theme={theme}>
        <Grain reducedMotion={reducedMotion} theme={theme} />
        <CursorTrail reducedMotion={reducedMotion} />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <IntelPanel
          reducedMotion={reducedMotion}
          theme={theme}
          status={phase === 'sweeping' || phase === 'dashboard' ? 'active' : 'online'}
        />

        <div className="stage">
          {phase !== 'dashboard' && (
            <form
              onSubmit={handleSubmit}
              className={`card ${phase === 'sweeping' ? 'fading' : ''}`}
              noValidate
            >
              <div className="brand">DUALDEV / GENESIS</div>

              <h1 className="heading">Create Account</h1>
              <p className="heading-sub">Initialize your workspace.</p>

              <Field
                label="Username"
                type="text"
                name="username"
                value={username}
                onChange={setUsername}
                autoFocus
                autoComplete="username"
                validate={v.username}
                validMessage="● Identity Confirmed"
              />
              <Field
                label="Email"
                type="email"
                name="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                validate={v.email}
                validMessage="● Communication Ready"
              />
              <Field
                label="Password"
                type="password"
                name="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                validate={v.password}
                validMessage="● Security Established"
              />
              <Field
                label="Confirm Password"
                type="password"
                name="confirm"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                validate={v.confirm}
                validMessage="● Verification Complete"
              />

              {error && phase === 'error' && (
                <div className="err">{error}</div>
              )}

              <CreateButton
                phase={phase}
                allValid={allValid}
                onClick={handleSubmit}
                seqIndex={seqIndex}
                seqDots={seqDots}
              />

              <div className="meta">
                <span>Encrypted Channel</span>
                <button type="button" onClick={() => setShowLogin(true)}>
                  Sign In →
                </button>
              </div>
            </form>
          )}
        </div>

        {phase === 'sweeping' && <div className="sweep run" />}

        {phase === 'dashboard' && (
          <div className="dashboard">
            <div style={{ textAlign: 'center' }}>
              <h1>Workspace Ready.</h1>
              <p>Redirecting to sign in</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Register
