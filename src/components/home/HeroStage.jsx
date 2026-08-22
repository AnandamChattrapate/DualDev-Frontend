import { useEffect, useMemo, useRef, useState } from 'react'
import { tokenize } from '../../utils/tokenizer.js'

/* Independent from problem-tab cycling — only opponent events.
   Progress / TC chips only after a full solution exists + run finishes. */
const OPP_SCRIPT = [
  { state: 'reading', section: 'description', ms: 5200 },
  { state: 'thinking', section: null,         ms: 3200 },
  { state: 'coding',   section: null,         ms: 48000 },
  { state: 'thinking', section: null,         ms: 2400 },
  { state: 'running',  section: null,         ms: 2800 },
  { state: 'results',  section: null,         ms: 3600, passed: 3 },
  { state: 'reading', section: 'examples',    ms: 4000 },
  { state: 'coding',   section: null,         ms: 5000 },
  { state: 'running',  section: null,         ms: 2600 },
  { state: 'results',  section: null,         ms: 3400, passed: 5 },
  { state: 'thinking', section: null,         ms: 2200 },
  { state: 'running',  section: null,         ms: 2400 },
  { state: 'results',  section: null,         ms: 3800, passed: 6 },
]

/* Your side — finish the full solution before Run / Submit touch progress. */
const YOU_SCRIPT = [
  { action: 'type',  until: 0.38, ms: 12000 },
  { action: 'pause', ms: 2200 },
  { action: 'type',  until: 0.72, ms: 11000 },
  { action: 'pause', ms: 1800 },
  { action: 'type',  until: 1,    ms: 9000 },
  { action: 'pause', ms: 1200 },
  { action: 'run',   ms: 2800, passed: 4 },
  { action: 'pause', ms: 1600 },
  { action: 'submit', ms: 3200, passed: 6 },
  { action: 'pause', ms: 4000 },
]

/* Problem tabs cycle on their own (viewer UI), not tied to opponent. */
const TAB_SCRIPT = [
  { id: 'description', ms: 9000 },
  { id: 'io',          ms: 7000 },
  { id: 'examples',    ms: 7000 },
  { id: 'constraints', ms: 6000 },
]

const DEMO_PROBLEM = {
  title: 'Orbital Skip Distance',
  difficulty: 'Medium',
  topic: 'Array',
  description:
    'You are given n orbital stations in a line, each with an energy cost energy[i], and a fuel budget k.\n\nStarting at any station, you may only move right. Find the longest contiguous stretch of stations you can visit without the sum of energy costs exceeding k.\n\nReturn the length of that stretch (0 if none fit).',
  inputFormat:
    'First line: two integers n and k — number of stations and fuel budget.\nSecond line: n integers energy[0..n-1].',
  outputFormat:
    'A single integer — the longest contiguous stretch whose energy sum is ≤ k.',
  constraints: [
    '1 ≤ n ≤ 10⁵',
    '0 ≤ energy[i] ≤ 10⁹',
    '0 ≤ k ≤ 10¹⁴',
  ],
  sampleTestCases: [
    { input: 'energy = [2,3,1,2,4,3], k = 7', output: '4' },
    { input: 'energy = [1,1,1,1], k = 2', output: '2' },
    { input: 'energy = [5,5,5], k = 4', output: '0' },
  ],
}

const PROBLEM_TABS = [
  { id: 'description', label: 'Description' },
  { id: 'io', label: 'Input / Output' },
  { id: 'examples', label: 'Examples' },
  { id: 'constraints', label: 'Constraints' },
]

/* You: shorter Python. Opponent: longer C++. Different shapes. */
const YOUR_CODE = `def orbital_skip(energy, k):
    best = left = cur = 0
    for right, cost in enumerate(energy):
        cur += cost
        while cur > k and left <= right:
            cur -= energy[left]
            left += 1
        if cur <= k:
            best = max(best, right - left + 1)
    return best`

const OPP_CODE = `class Solution {
public:
    int orbitalSkip(vector<int>& energy, long long k) {
        int n = energy.size();
        int best = 0, left = 0;
        long long cur = 0;
        for (int right = 0; right < n; right++) {
            cur += energy[right];
            while (cur > k && left <= right) {
                cur -= energy[left];
                left++;
            }
            if (cur <= k) {
                best = max(best, right - left + 1);
            }
        }
        return best;
    }
};`

const MATCH_SECONDS = 8 * 60 + 47 // 08:47 demo clock

/** Random pause after finishing a line (ms). */
const linePauseMs = () => 220 + Math.floor(Math.random() * 320)

const SECTION_LABEL = {
  description: 'READING DESCRIPTION',
  io:          'READING I/O FORMAT',
  examples:    'READING EXAMPLES',
  constraints: 'READING CONSTRAINTS',
}

function describePresence(presence, totalTests = 6) {
  if (presence.state === 'coding') {
    return { text: 'CODING', color: '#00FF85', tone: 'coding' }
  }
  if (presence.state === 'running') {
    return { text: 'RUNNING TESTS', color: '#A78BFA', tone: 'running' }
  }
  if (presence.state === 'results') {
    const n = presence.passed ?? 0
    const ok = n >= totalTests
    return {
      text: ok ? `${n}/${totalTests} PASSED` : `${n}/${totalTests} PASSED`,
      color: ok ? '#00FF85' : '#FFAA00',
      tone: 'results',
    }
  }
  if (presence.state === 'reading') {
    return {
      text: SECTION_LABEL[presence.section] || 'READING',
      color: '#60A5FA',
      tone: 'reading',
    }
  }
  if (presence.state === 'thinking') {
    return { text: 'THINKING', color: '#FFAA00', tone: 'thinking' }
  }
  return { text: 'IDLE', color: '#555555', tone: 'thinking' }
}

function TestResults({ passed, total, visible, side }) {
  if (!visible || passed <= 0) return null
  return (
    <div className={`hero-tc-row hero-tc-${side}`}>
      <div className="hero-tc-head">
        <span>Results</span>
        <strong>{passed}/{total} passed</strong>
      </div>
      <div className="hero-tc-chips">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`hero-tc-chip ${i < passed ? 'is-pass' : 'is-fail'}`}
            style={{ animationDelay: `${i * 55}ms` }}
          >
            TC{i + 1}
          </span>
        ))}
      </div>
    </div>
  )
}

function TypedCode({ text, caret }) {
  return (
    <pre className="hero-your-code">
      {text}
      {caret && <span className="hero-caret" />}
    </pre>
  )
}

function ThermalSilhouette({ text, language, active }) {
  const sil = useMemo(() => (text ? tokenize(text, language) : ''), [text, language])
  const lines = useMemo(() => (sil ? sil.split('\n') : []), [sil])

  if (!lines.length) {
    return (
      <div className="hero-sil-empty">
        {[72, 48, 84, 36, 60, 28, 68].map((w, i) => (
          <div key={i} className="hero-sil-bar" style={{ width: `${w}%`, marginLeft: i > 0 && i < 6 ? 14 : 0 }} />
        ))}
        <p>waiting for opponent…</p>
      </div>
    )
  }

  return (
    <div className={`hero-sil ${active ? 'is-coding' : ''}`}>
      {lines.map((line, li) => {
        if (!line.trim()) return <div key={li} className="hero-sil-blank" />
        const parts = line.split(/(▓+|\s+)/g).filter(Boolean)
        const isLast = li === lines.length - 1
        return (
          <div
            key={li}
            className={`hero-sil-line ${isLast ? 'is-new' : 'is-in'}`}
          >
            <span className="hero-sil-ln">{li + 1}</span>
            <span className="hero-sil-code">
              {parts.map((tok, ti) => {
                if (/^▓+$/.test(tok)) {
                  return <span key={ti} className="hero-sil-block">{tok}</span>
                }
                if (/^\s+$/.test(tok)) return <span key={ti}>{tok}</span>
                return <span key={ti} className="hero-sil-kw">{tok}</span>
              })}
              {isLast && active && <span className="hero-caret hero-caret-opp" />}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function HeroProblemBody({ tab, problem }) {
  if (tab === 'examples') {
    return (
      <div className="hero-problem-examples">
        {problem.sampleTestCases.map((tc, i) => (
          <div key={i} className="hero-example">
            <div className="hero-example-label">Example {i + 1}</div>
            <div className="hero-example-row">
              <span>Input</span>
              <code>{tc.input}</code>
            </div>
            <div className="hero-example-row">
              <span>Output</span>
              <code>{tc.output}</code>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (tab === 'io') {
    return (
      <div className="hero-problem-io">
        <div className="hero-io-block">
          <div className="hero-io-label hero-io-in">Input Format</div>
          <p>{problem.inputFormat}</p>
        </div>
        <div className="hero-io-block">
          <div className="hero-io-label hero-io-out">Output Format</div>
          <p>{problem.outputFormat}</p>
        </div>
      </div>
    )
  }

  if (tab === 'constraints') {
    return (
      <ul className="hero-problem-constraints">
        {problem.constraints.map((c) => (
          <li key={c}><code>{c}</code></li>
        ))}
      </ul>
    )
  }

  return <p className="hero-problem-desc">{problem.description}</p>
}

export default function HeroStage() {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const tiltSmooth = useRef({ x: 0, y: 0 })
  const reducedRef = useRef(false)
  /** When true, both sides stop typing (user is browsing problem tabs). */
  const typingPausedRef = useRef(false)
  const tabPinTimerRef = useRef(0)
  const tabPinnedRef = useRef(false)

  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [timer, setTimer] = useState(MATCH_SECONDS)
  const [timeUp, setTimeUp] = useState(false)
  const [round, setRound] = useState(0)

  const [problemTab, setProblemTab] = useState('description')
  const [tabPinned, setTabPinned] = useState(false)

  const [youChars, setYouChars] = useState(0)
  const [youAction, setYouAction] = useState('type')
  const [youBtnFlash, setYouBtnFlash] = useState(null) // 'run' | 'submit' | null
  const [youPassed, setYouPassed] = useState(0)
  const [youResultsOn, setYouResultsOn] = useState(false)

  const [oppChars, setOppChars] = useState(0)
  const [oppPresence, setOppPresence] = useState(OPP_SCRIPT[0])
  const [presenceKey, setPresenceKey] = useState(0)
  const [oppPassed, setOppPassed] = useState(0)
  const [oppResultsOn, setOppResultsOn] = useState(false)

  const totalTests = 6
  const youTarget = YOUR_CODE.length
  const oppTarget = OPP_CODE.length

  const resetDemoRound = () => {
    setYouChars(0)
    setOppChars(0)
    setYouPassed(0)
    setOppPassed(0)
    setYouResultsOn(false)
    setOppResultsOn(false)
    setYouAction('type')
    setYouBtnFlash(null)
    setOppPresence(OPP_SCRIPT[0])
    setPresenceKey((k) => k + 1)
    setProblemTab('description')
    setTabPinned(false)
    tabPinnedRef.current = false
    typingPausedRef.current = false
    setTimer(MATCH_SECONDS)
    setTimeUp(false)
    setRound((r) => r + 1)
  }

  /* Reading problem tabs blocks typing — same as a real match: you browse
     OR you code, not both at once. Typing only while Description is active. */
  const selectProblemTab = (id) => {
    clearTimeout(tabPinTimerRef.current)
    setProblemTab(id)
    typingPausedRef.current = id !== 'description'
    if (id === 'description') {
      setTabPinned(false)
      tabPinnedRef.current = false
    } else {
      setTabPinned(true)
      tabPinnedRef.current = true
    }
  }

  const youText = YOUR_CODE.slice(0, youChars)
  const oppText = OPP_CODE.slice(0, oppChars)
  const label = describePresence(oppPresence, totalTests)
  const readingProblem = problemTab !== 'description'
  const youTyping = youAction === 'type' && !readingProblem
  const oppTyping = oppPresence.state === 'coding' && !readingProblem

  /* Keep the typing loops in sync with the active problem tab */
  useEffect(() => {
    typingPausedRef.current = problemTab !== 'description'
  }, [problemTab])

  /* Reduced motion */
  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedRef.current) {
      setYouChars(youTarget)
      setOppChars(oppTarget)
      setYouPassed(4)
      setOppPassed(3)
      setOppPresence({ state: 'coding', section: null })
    }
  }, [youTarget, oppTarget])

  useEffect(() => () => clearTimeout(tabPinTimerRef.current), [])

  /* Problem tabs — auto-cycle unless user pinned a non-description tab.
     Typing stays off for the whole time io / examples / constraints are shown. */
  useEffect(() => {
    if (reducedRef.current || tabPinned) return
    let i = Math.max(0, TAB_SCRIPT.findIndex((t) => t.id === problemTab))
    let id
    const run = () => {
      if (tabPinnedRef.current) return
      const step = TAB_SCRIPT[i % TAB_SCRIPT.length]
      setProblemTab(step.id)
      typingPausedRef.current = step.id !== 'description'
      i += 1
      id = setTimeout(run, step.ms)
    }
    id = setTimeout(run, TAB_SCRIPT[i % TAB_SCRIPT.length].ms)
    return () => clearTimeout(id)
  }, [tabPinned, round]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Your typing + run/submit timeline */
  useEffect(() => {
    if (reducedRef.current) return
    let cancelled = false
    let stepIdx = 0
    let charTimer = null
    let stepTimer = null
    let chars = 0

    const clearChar = () => {
      if (charTimer) clearTimeout(charTimer)
      charTimer = null
    }

    const schedule = (fn, ms) => {
      stepTimer = setTimeout(fn, ms)
    }

    const typeToward = (untilFrac, durationMs, done) => {
      setYouAction('type')
      setYouBtnFlash(null)
      const goal = Math.max(chars + 1, Math.floor(youTarget * untilFrac))
      const remaining = Math.max(1, goal - chars)
      const baseInterval = Math.max(52, Math.floor(durationMs / remaining))

      const tick = () => {
        if (cancelled) return
        if (typingPausedRef.current) {
          charTimer = setTimeout(tick, 120)
          return
        }
        chars = Math.min(goal, chars + 1)
        setYouChars(chars)
        if (chars >= goal) {
          clearChar()
          done()
          return
        }
        const justTyped = YOUR_CODE[chars - 1]
        const delay = justTyped === '\n' ? linePauseMs() : baseInterval
        charTimer = setTimeout(tick, delay)
      }

      clearChar()
      charTimer = setTimeout(tick, baseInterval)
    }

    const runStep = () => {
      if (cancelled) return
      const step = YOU_SCRIPT[stepIdx % YOU_SCRIPT.length]
      stepIdx += 1

      if (step.action === 'type') {
        typeToward(step.until, step.ms, () => schedule(runStep, 250))
        return
      }

      if (step.action === 'pause') {
        setYouAction('pause')
        setYouBtnFlash(null)
        schedule(runStep, step.ms)
        return
      }

      if (step.action === 'run') {
        // Only reveal progress after the full solution is typed
        if (chars < youTarget) {
          schedule(runStep, 200)
          return
        }
        setYouAction('run')
        setYouBtnFlash('run')
        setYouResultsOn(false)
        schedule(() => {
          setYouPassed(step.passed ?? 4)
          setYouResultsOn(true)
          setYouBtnFlash(null)
          schedule(runStep, 500)
        }, step.ms)
        return
      }

      if (step.action === 'submit') {
        if (chars < youTarget) {
          schedule(runStep, 200)
          return
        }
        setYouAction('submit')
        setYouBtnFlash('submit')
        schedule(() => {
          setYouPassed(step.passed ?? totalTests)
          setYouResultsOn(true)
          setYouBtnFlash(null)
          schedule(() => {
            chars = 0
            setYouChars(0)
            setYouPassed(0)
            setYouResultsOn(false)
            schedule(runStep, 400)
          }, step.ms)
        }, 900)
      }
    }

    runStep()
    return () => {
      cancelled = true
      clearChar()
      clearTimeout(stepTimer)
    }
  }, [youTarget, round])

  /* Opponent presence + typing (only while coding) */
  useEffect(() => {
    if (reducedRef.current) return
    let i = 0
    let timeoutId
    let typeId
    let cancelled = false
    let chars = 0

    const stopType = () => {
      if (typeId) clearTimeout(typeId)
      typeId = null
    }

    const startType = () => {
      stopType()
      const tick = () => {
        if (cancelled) return
        if (typingPausedRef.current) {
          typeId = setTimeout(tick, 120)
          return
        }
        if (chars >= oppTarget) {
          stopType()
          return
        }
        chars = Math.min(oppTarget, chars + 1)
        setOppChars(chars)
        const justTyped = OPP_CODE[chars - 1]
        const delay = justTyped === '\n' ? linePauseMs() : 88
        typeId = setTimeout(tick, delay)
      }
      typeId = setTimeout(tick, 88)
    }

    const run = () => {
      const step = OPP_SCRIPT[i % OPP_SCRIPT.length]
      setOppPresence(step)
      setPresenceKey((k) => k + 1)
      i += 1

      stopType()
      if (step.state === 'coding') {
        startType()
      } else if (step.state === 'running') {
        // Hide old chips while tests are in flight
        if (chars >= oppTarget) setOppResultsOn(false)
      } else if (step.state === 'results') {
        // Reveal opponent TC results only after the run finishes
        if (chars >= oppTarget && typeof step.passed === 'number') {
          setOppPassed(step.passed)
          setOppResultsOn(true)
        }
      }

      if (i % OPP_SCRIPT.length === 0) {
        timeoutId = setTimeout(() => {
          if (cancelled) return
          chars = 0
          setOppChars(0)
          setOppPassed(0)
          setOppResultsOn(false)
          run()
        }, step.ms)
        return
      }

      timeoutId = setTimeout(run, step.ms)
    }

    run()
    return () => {
      cancelled = true
      stopType()
      clearTimeout(timeoutId)
    }
  }, [oppTarget, round])

  /* Match clock — at 0: flash TIME UP, then restart the demo round */
  useEffect(() => {
    if (timeUp) return
    const clock = setInterval(() => {
      setTimer((s) => {
        if (s <= 1) {
          setTimeUp(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(clock)
  }, [timeUp])

  useEffect(() => {
    if (!timeUp) return
    const id = setTimeout(() => {
      resetDemoRound()
    }, 2200)
    return () => clearTimeout(id)
  }, [timeUp])

  /* Parallax */
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    let target = { x: 0, y: 0 }
    let raf = 0

    const tick = () => {
      tiltSmooth.current.x += (target.x - tiltSmooth.current.x) * 0.08
      tiltSmooth.current.y += (target.y - tiltSmooth.current.y) * 0.08
      setTilt({ ...tiltSmooth.current })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onMove = (e) => {
      if (reducedRef.current) return
      const rect = el.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width
      const ny = (e.clientY - rect.top) / rect.height
      mouseRef.current = { x: nx, y: ny }
      target = { x: (nx - 0.5) * 10, y: (ny - 0.5) * -7 }
    }
    const onLeave = () => {
      mouseRef.current = { x: 0.5, y: 0.5 }
      target = { x: 0, y: 0 }
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  /* Canvas ambience */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let w = 0
    let h = 0
    let dpr = 1
    const particles = []

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const parent = canvas.parentElement
      w = parent.clientWidth
      h = parent.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles.length = 0
      const count = Math.floor((w * h) / 16000)
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.2 + 0.3,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.14,
          a: Math.random() * 0.35 + 0.1,
        })
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      const g1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, w * 0.4)
      g1.addColorStop(0, 'rgba(0,255,133,0.09)')
      g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, w, h)

      const g2 = ctx.createRadialGradient(w * 0.8, h * 0.55, 0, w * 0.8, h * 0.55, w * 0.38)
      g2.addColorStop(0, 'rgba(244,177,131,0.09)')
      g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, w, h)

      const mx = mouseRef.current.x * w
      const my = mouseRef.current.y * h
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        if (!reducedRef.current) {
          const dx = mx - p.x
          const dy = my - p.y
          const dist = Math.hypot(dx, dy) || 1
          p.x += p.vx + (dx / dist) * 0.035
          p.y += p.vy + (dy / dist) * 0.035
          if (p.x < 0) p.x = w
          if (p.x > w) p.x = 0
          if (p.y < 0) p.y = h
          if (p.y > h) p.y = 0
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232,232,232,${p.a})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  const mm = String(Math.floor(timer / 60)).padStart(2, '0')
  const ss = String(timer % 60).padStart(2, '0')
  const layer = (depth, rotate = false) => ({
    transform: rotate
      ? `translate3d(${tilt.x * depth}px, ${tilt.y * depth}px, 0) rotateX(${tilt.y * 0.12}deg) rotateY(${tilt.x * 0.16}deg)`
      : `translate3d(${tilt.x * depth}px, ${tilt.y * depth}px, 0)`,
  })
  const youPct = (youPassed / totalTests) * 100
  const oppPct = (oppPassed / totalTests) * 100

  return (
    <aside ref={rootRef} className="hero-stage">
      <div
        className="hero-stage-frame"
        style={{
          transform: `perspective(1200px) rotateX(${tilt.y * 0.06}deg) rotateY(${tilt.x * 0.1}deg)`,
        }}
      >
        <canvas ref={canvasRef} className="hero-stage-canvas" />

        <div className="hero-match" style={layer(1, true)}>
          {/* Top bar — no DualDev wordmark */}
          <div className="hero-topbar">
            <span className="hero-topbar-title">{DEMO_PROBLEM.title}</span>
            <span className="hero-diff hero-diff-easy">{DEMO_PROBLEM.difficulty}</span>
            <span className="hero-topbar-topic">{DEMO_PROBLEM.topic}</span>

            <span className="hero-topbar-spacer" />

            <span className={`hero-btn hero-btn-run ${youBtnFlash === 'run' ? 'is-flash' : ''}`}>
              ▶ Run
            </span>
            <span className={`hero-btn hero-btn-submit ${youBtnFlash === 'submit' ? 'is-flash' : ''}`}>
              ✓ Submit
            </span>
            <span className={`hero-topbar-timer ${timer <= 30 || timeUp ? 'is-urgent' : ''}`}>
              {timeUp ? '00:00' : `${mm}:${ss}`}
            </span>
          </div>

          {timeUp && (
            <div className="hero-timeup">
              <span>TIME UP</span>
              <em>Restarting match…</em>
            </div>
          )}

          {/* Problem strip — clickable tabs pause typing */}
          <div className="hero-problem">
            <div className="hero-problem-tabs" role="tablist" aria-label="Problem sections">
              <span className="hero-problem-label">Problem</span>
              {PROBLEM_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={problemTab === t.id}
                  className={`hero-problem-tab ${problemTab === t.id ? 'is-active' : ''}`}
                  onClick={() => selectProblemTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="hero-problem-body" key={problemTab}>
              <HeroProblemBody tab={problemTab} problem={DEMO_PROBLEM} />
            </div>
          </div>

          {/* Progress */}
          <div className="hero-meter-row">
            <span className="hero-match-you">YOU · {youPassed}/{totalTests}</span>
            <div className="hero-meter">
              <div className="hero-meter-fill" style={{ width: `${youPct}%` }} />
              <div className="hero-meter-fill-opp" style={{ width: `${oppPct}%` }} />
            </div>
            <span className="hero-match-opp">OPP · {oppPassed}/{totalTests}</span>
          </div>

          <div className="hero-editors">
            <div className="hero-editor">
              <div className="hero-editor-head">
                <span className="hero-live-dot" />
                <span>Your Code</span>
                <span className="hero-lang">Python</span>
              </div>
              <TypedCode text={youText} caret={youTyping} />
              <TestResults
                passed={youPassed}
                total={totalTests}
                visible={youResultsOn}
                side="you"
              />
            </div>

            <div className="hero-editor hero-editor-opp">
              <div className="hero-editor-head">
                <span className="hero-opp-avatar">N</span>
                <div className="hero-opp-meta">
                  <span className="hero-opp-name">ninja_dev</span>
                  <span className="hero-opp-elo">1240 ELO</span>
                </div>
                <span className="hero-opp-live">
                  <span className="hero-chip-dot" />
                  LIVE
                </span>
              </div>

              <div className={`hero-presence tone-${label.tone}`} key={presenceKey}>
                {label.tone === 'coding' ? (
                  <span className="hero-typing"><i /><i /><i /></span>
                ) : label.tone === 'running' ? (
                  <span className="hero-run-spin" />
                ) : (
                  <span className="hero-presence-dot" style={{ background: label.color }} />
                )}
                <span className="hero-presence-text" style={{ color: label.color }}>
                  {label.text}
                  {(label.tone === 'coding' || label.tone === 'thinking') ? '…' : ''}
                </span>
              </div>

              <TestResults
                passed={oppPassed}
                total={totalTests}
                visible={oppResultsOn}
                side="opp"
              />

              <div className="hero-thermal-label">
                <span>Thermal View · C++</span>
                <span>
                  {oppTyping
                    ? 'typing'
                    : oppPresence.state === 'running'
                      ? 'tests'
                      : oppPresence.state === 'results'
                        ? 'results'
                        : 'live'}
                </span>
              </div>

              <ThermalSilhouette
                text={oppText}
                language="cpp"
                active={oppTyping}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
