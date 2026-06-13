import { useState, useEffect } from "react"
import useMatchStore from "../../store/matchStore"
import { IconEye, IconEyeOff } from "./icons"

/* Map presence + section → human label + style hints. */
const SECTION_LABEL = {
  description: "READING DESCRIPTION",
  examples:    "READING EXAMPLES",
  constraints: "READING CONSTRAINTS",
  io:          "READING I/O FORMAT",
  hints:       "READING HINTS",
}

function describePresence(presence) {
  if (!presence || !presence.online && presence.state === 'offline') {
    return { text: "OFFLINE",          color: "var(--danger)", tone: "offline" }
  }
  if (presence.state === 'coding') {
    return { text: "CODING",           color: "var(--accent)", tone: "coding" }
  }
  if (presence.state === 'reading') {
    return { text: SECTION_LABEL[presence.section] || "READING", color: "#60A5FA", tone: "reading" }
  }
  if (presence.state === 'thinking') {
    return { text: "THINKING",         color: "var(--warn)",   tone: "thinking" }
  }
  if (presence.state === 'unknown') {
    return { text: "CONNECTING",       color: "var(--muted)",  tone: "unknown" }
  }
  return { text: "IDLE", color: "var(--muted)", tone: "thinking" }
}

export default function OpponentPanel({ opponent, oppSilhouette, oppTestsPassed, oppTotalTests, width }) {
  const darkMode    = useMatchStore((s) => s.darkMode)
  const oppPresence = useMatchStore((s) => s.oppPresence)
  const pct = oppTotalTests > 0 ? (oppTestsPassed / oppTotalTests) * 100 : 0
  const [collapsed, setCollapsed] = useState(false)

  /* "How long ago" the last presence event was — re-renders every second
     so the label can fade from CODING → THINKING locally if no update
     arrives. The backend timeout is the source of truth; this is for
     visual freshness. */
  const [ago, setAgo] = useState(0)
  useEffect(() => {
    if (!oppPresence?.lastEvent) return
    const tick = () => setAgo(Math.floor((Date.now() - oppPresence.lastEvent) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [oppPresence?.lastEvent])

  /* Local decay: if last event >10s ago and state was "coding", show
     "THINKING" instead. Doesn't mutate state — just affects display. */
  const effective = (() => {
    const p = oppPresence || { state: 'unknown', section: null, online: false }
    if (p.online && p.state === 'coding' && ago > 10) {
      return { ...p, state: 'thinking' }
    }
    return p
  })()
  const label = describePresence(effective)

  return (
    <div
      className="panel"
      style={{ flexShrink: 0, width: collapsed ? 46 : width, display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.25s ease" }}
    >
      {/* ── Header ── */}
      <div className="panel-header" style={{ gap: 9 }}>
        {!collapsed && (
          <>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--mono)", fontWeight: 700, fontSize: 15,
              background: "rgba(255,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(255,68,68,0.25)",
            }}>
              {opponent?.username?.[0]?.toUpperCase() || "O"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span className="label" style={{ fontSize: 15, textTransform: "none", letterSpacing: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {opponent?.username || "Opponent"}
              </span>
              {opponent?.rating != null && (
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--accent)" }}>{opponent.rating} ELO</span>
              )}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: effective.online ? "var(--accent)" : "var(--danger)",
                animation: effective.online ? "pulse-green 2s ease-in-out infinite" : "pulse-red 1.2s ease-in-out infinite",
              }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em", color: "var(--muted)" }}>
                {effective.online ? "LIVE" : "OFFLINE"}
              </span>
            </div>
          </>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="btn btn-icon"
          style={{ marginLeft: collapsed ? 0 : 4, padding: "5px 8px", gap: 5 }}
          title={collapsed ? "Show opponent panel" : "Hide opponent panel"}
          aria-label={collapsed ? "Show opponent panel" : "Hide opponent panel"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <IconEye s={14} /> : <><IconEyeOff s={13} /> Hide</>}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* ── Progress ── */}
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Progress</span>
              <span className="tabnum" style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color: pct === 100 ? "var(--accent)" : "var(--text)" }}>
                {oppTestsPassed}/{oppTotalTests}
              </span>
            </div>
            <div style={{ height: 7, borderRadius: 6, overflow: "hidden", background: "var(--s2)" }}>
              <div
                className="progress-bar-fill"
                style={{
                  height: "100%", borderRadius: 6, width: `${pct}%`,
                  background: pct === 100
                    ? "linear-gradient(90deg, var(--accent), var(--accent-dim))"
                    : `rgba(var(--accent-rgb),${pct > 50 ? 0.8 : 0.45})`,
                  boxShadow: pct === 100 ? "0 0 10px rgba(var(--accent-rgb),0.6)" : "none",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 7 }}>
              {Array.from({ length: oppTotalTests || 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, height: 4, borderRadius: 4,
                    background: i < oppTestsPassed ? "var(--accent)" : "var(--s2)",
                    transition: "background 0.3s ease", transitionDelay: `${i * 50}ms`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Presence status ── */}
          <div style={{
            padding: "9px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0,
            display: "flex", alignItems: "center", gap: 10,
            transition: "background 0.4s ease",
            background: label.tone === 'coding'   ? "rgba(var(--accent-rgb),0.05)"
                     : label.tone === 'reading'  ? "rgba(96,165,250,0.06)"
                     : label.tone === 'offline'  ? "rgba(255,68,68,0.07)"
                     : "transparent",
          }}>
            {label.tone === 'coding' ? (
              <>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </>
            ) : (
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: label.color,
                boxShadow: label.tone === 'offline' ? `0 0 0 0 ${label.color}` : `0 0 8px ${label.color}`,
                animation:
                  label.tone === 'thinking' ? "shimmer-block 1.8s ease-in-out infinite"
                : label.tone === 'reading'  ? "pulse-green 2.4s ease-in-out infinite"
                : label.tone === 'offline'  ? "pulse-red 1.2s ease-in-out infinite"
                : "none",
              }} />
            )}
            <span style={{
              fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.14em",
              color: label.color,
              transition: "color 0.4s ease",
            }}>
              {label.text}{label.tone === 'coding' || label.tone === 'thinking' ? '…' : ''}
            </span>
            {effective.online && effective.lastEvent > 0 && (label.tone === 'reading' || label.tone === 'thinking') && (
              <span style={{
                marginLeft: "auto",
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em",
                color: "var(--muted)", opacity: 0.7,
              }}>
                {ago < 60 ? `${ago}s` : `${Math.floor(ago/60)}m`}
              </span>
            )}
          </div>

          {/* ── Thermal label ── */}
          <div style={{ padding: "9px 12px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>Thermal View</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(var(--accent-rgb),0.7)" }}>live</span>
          </div>

          {/* ── Silhouette ── */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
            <Silhouette code={oppSilhouette} darkMode={darkMode} />
          </div>
        </>
      )}
    </div>
  )
}

function Silhouette({ code, darkMode }) {
  if (!code) {
    return (
      <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
        {[75, 50, 88, 40, 65, 30, 72, 45, 58, 35].map((w, i) => (
          <div
            key={i}
            style={{
              height: 11, borderRadius: 4, width: `${w}%`,
              marginLeft: i > 0 && i < 8 ? (i < 5 ? 20 : 12) : 0,
              background: "var(--s2)",
              animation: `shimmer-block ${1.5 + i * 0.12}s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
        <p style={{ fontFamily: "var(--mono)", fontSize: 13, textAlign: "center", letterSpacing: "0.14em", paddingTop: 6, color: "var(--muted)", opacity: 0.6 }}>
          waiting for opponent…
        </p>
      </div>
    )
  }

  const lines = code.split("\n")

  const KEYWORDS = new Set([
    "def","class","if","elif","else","for","while","return","import","from",
    "in","and","or","not","True","False","None","lambda","try","except",
    "finally","with","as","pass","break","continue","print","input","len",
    "range","sorted","map","filter","zip","enumerate","sum","min","max",
    "int","str","list","dict","set","float","split","append","extend",
    "include","using","namespace","auto","const","true","false","switch",
    "case","default","template","typename","cin","cout","endl","vector",
    "unordered_map","unordered_set","pair","public","private","protected",
    "struct","new","delete","void","bool","char","long","double","do",
    "System","out","println","Scanner","ArrayList","HashMap","static",
    "final","extends","implements","interface","abstract","this","super",
    "throw","throws","catch","null","boolean",
  ])

  const PUNCT = new Set(["{","}","(",")","[","]",",",".",":",";","+","-","*","/","%","=","<",">","!","&","|","^","~","?","#"])

  const tokenizeLine = (line) => {
    const tokens = []
    const regex = /(▓+|\s+|[{}()[\],.:;+\-*/%=<>!&|^~?#]+|"[^"]*"|'[^']*')/g
    let lastIndex = 0
    let match
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        const text = line.substring(lastIndex, match.index)
        if (text.trim()) tokens.push(text)
      }
      tokens.push(match[0])
      lastIndex = regex.lastIndex
    }
    if (lastIndex < line.length) {
      const text = line.substring(lastIndex)
      if (text.trim()) tokens.push(text)
    }
    return tokens
  }

  const blockColor = darkMode ? "#E0A85C" : "#C06A1A"
  const blockBg    = darkMode ? "rgba(224,168,92,0.14)" : "rgba(192,106,26,0.12)"
  const kwColor    = darkMode ? "#FFD24A" : "#C2820A"
  const punctColor = darkMode ? "#5a5a6a" : "#9aa0aa"
  const lineNumCol = darkMode ? "#3a3a3a" : "#c4c8cf"

  return (
    <div style={{ padding: "4px 8px 24px" }}>
      {lines.map((line, li) => {
        if (!line.trim()) return <div key={li} style={{ height: 14 }} />
        const tokens = tokenizeLine(line)
        return (
          <div key={li} style={{ display: "flex", alignItems: "baseline", fontFamily: "'JetBrains Mono', monospace", fontSize: 17, lineHeight: "1.9" }}>
            <span style={{ userSelect: "none", textAlign: "right", flexShrink: 0, marginRight: 10, fontSize: 13, color: lineNumCol, minWidth: 20 }}>
              {li + 1}
            </span>
            <span style={{ whiteSpace: "pre" }}>
              {tokens.map((token, ti) => {
                if (/^▓+$/.test(token)) {
                  return (
                    <span key={ti} style={{
                      color: blockColor, background: blockBg, borderRadius: 3, padding: "1px 2px",
                      letterSpacing: "0.04em", display: "inline-block",
                      animation: `shimmer-block ${1.8 + (li % 5) * 0.2}s ease-in-out infinite`,
                      animationDelay: `${((li * 0.08 + ti * 0.05) % 0.9).toFixed(2)}s`,
                    }}>{token}</span>
                  )
                }
                if (/^\s+$/.test(token)) return <span key={ti}>{token}</span>
                const trimmed = token.trim()
                if (KEYWORDS.has(trimmed)) {
                  return <span key={ti} style={{ color: kwColor, textShadow: darkMode ? "0 0 8px rgba(255,210,74,0.3)" : "none", fontWeight: 600 }}>{token}</span>
                }
                if (trimmed.length === 1 && PUNCT.has(trimmed)) {
                  return <span key={ti} style={{ color: punctColor }}>{token}</span>
                }
                return <span key={ti} style={{ color: "transparent", userSelect: "none" }}>{token}</span>
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
