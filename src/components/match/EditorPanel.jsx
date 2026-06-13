import { useState, useEffect, useRef } from "react"
import CodeEditor from "../editor/CodeEditor"
import useMatchStore from "../../store/matchStore"
import { IconChevronUp, IconChevronDown } from "./icons"

export default function EditorPanel({
  myLanguage,
  runResults,
  myVerdict,
  myTCResults,
  myTestsPassed,
}) {
  const setMyLanguage = useMatchStore((s) => s.setMyLanguage)
  const darkMode      = useMatchStore((s) => s.darkMode)

  const isSubmission = !!myVerdict
  const results      = isSubmission ? (Array.isArray(myTCResults) ? myTCResults : []) : (Array.isArray(runResults) ? runResults : [])
  const hasResults   = results.length > 0
  const accepted     = typeof myVerdict === "string" && /accept/i.test(myVerdict)
  const passedCount  = isSubmission ? (myTestsPassed ?? results.filter((r) => r.passed).length) : results.filter((r) => r.passed).length

  const [showWs, setShowWs] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(true)

  // Auto-open the results panel whenever a new result batch arrives.
  const resultsSig = `${results.length}:${results[0]?.testCaseId ?? ""}:${results[0]?.verdict ?? ""}:${isSubmission}`
  const lastResultsSig = useRef("")
  useEffect(() => {
    if (lastResultsSig.current === resultsSig) return
    lastResultsSig.current = resultsSig
    setResultsOpen(true)
  }, [resultsSig])

  return (
    <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
      {/* ── Editor ── */}
      <div className="panel" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div className="panel-header">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", boxShadow: "0 0 8px rgba(var(--accent-rgb),0.7)" }} />
          <span className="label">Your Code</span>
          <select
            className="lang-select"
            style={{ marginLeft: "auto" }}
            value={myLanguage}
            onChange={(e) => setMyLanguage(e.target.value)}
            aria-label="Select language"
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          <CodeEditor darkMode={darkMode} />
        </div>
      </div>

      {/* ── Results / Verdict ── */}
      {hasResults && (
        <div className="panel fade-in" style={{ flexShrink: 0, maxHeight: "min(50vh, 480px)", display: "flex", flexDirection: "column" }}>
          <div className="panel-header">
            <span className="label">{isSubmission ? "Verdict" : "Sample Tests"}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--muted)", marginLeft: 10 }}>
              {passedCount}/{results.length} passed
            </span>
            <button
              onClick={() => setShowWs((v) => !v)}
              aria-pressed={showWs}
              className="btn"
              style={{
                marginLeft: "auto", padding: "3px 9px", fontSize: 11,
                borderColor: showWs ? "rgba(var(--accent-rgb),0.5)" : "var(--border)",
                color: showWs ? "var(--accent)" : "var(--muted)",
              }}
              title="Reveal spaces, tabs and newlines"
            >
              {showWs ? "● " : "○ "}Whitespace
            </button>
            {isSubmission && (
              <span className={`tc-chip ${accepted ? "tc-pass" : "tc-fail"}`}>
                {accepted ? "✓ " : "✗ "}{myVerdict}
              </span>
            )}
            <button
              onClick={() => setResultsOpen((v) => !v)}
              className="btn btn-icon"
              aria-expanded={resultsOpen}
              aria-label={resultsOpen ? "Hide test results" : "Show test results"}
              title={resultsOpen ? "Hide test results (restore editor size)" : "Show test results"}
              style={{ padding: "5px 8px", fontSize: 12 }}
            >
              {resultsOpen ? <IconChevronDown s={14} /> : <IconChevronUp s={14} />}
            </button>
          </div>

          {resultsOpen && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              <TestResultList results={results} hideInput={isSubmission} showWs={showWs} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TestResultList({ results, hideInput, showWs }) {
  const [open, setOpen] = useState(0)

  // Auto-expand first failing test when a new batch arrives.
  const sig = `${results.length}:${results[0]?.testCaseId ?? ""}:${results[0]?.verdict ?? ""}`
  const lastSig = useRef("")
  useEffect(() => {
    if (lastSig.current === sig) return
    lastSig.current = sig
    const ff = results.findIndex((r) => !r.passed)
    setOpen(ff >= 0 ? ff : 0)
  }, [sig, results])

  // One-shot debug: confirm backend payload shape
  useEffect(() => {
    if (results.length) {
      // eslint-disable-next-line no-console
      console.debug("[EditorPanel] result[0]:", results[0])
    }
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  if (results.length === 0) {
    return <div style={{ padding: 16, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No test results</div>
  }

  return results.map((r, i) => {
    const isOpen   = open === i
    const verdict  = r.verdict || (r.passed ? "Accepted" : "Failed")
    const errorish = !r.passed
    const err      = extractError(r)

    const rawActual   = (r.actual   != null) ? String(r.actual)   : ""
    const rawExpected = (r.expected != null) ? String(r.expected) : ""

    // Compute diff only when both sides exist and program didn't crash with an error.
    const diff = (!err && rawExpected !== "" && !r.passed) ? firstDiff(rawExpected, rawActual) : null

    return (
<div key={r.testCaseId || i} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "visible", background: "var(--s2)" }}>
        {/* Row header */}
        <button
          onClick={() => setOpen(isOpen ? -1 : i)}
          aria-expanded={isOpen}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            padding: "8px 12px", border: "none", cursor: "pointer", background: "transparent",
            color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13,
          }}
        >
          <span className={`tc-chip ${r.passed ? "tc-pass" : "tc-fail"}`} style={{ minWidth: 64, justifyContent: "center" }}>
            {r.passed ? "✓ PASS" : "✗ FAIL"}
          </span>
          <span style={{ fontWeight: 600 }}>Test {i + 1}</span>
          <span style={{ color: errorish ? "var(--danger)" : "var(--muted)", fontSize: 12, letterSpacing: "0.04em" }}>{verdict}</span>
          {r.executionTime != null && (
            <span style={{ color: "var(--muted)", fontSize: 12 }}>· {r.executionTime}ms</span>
          )}
          {err && (
            <span style={{
              fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: "var(--danger)",
              background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
              borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap",
            }}>
              {err.name}
            </span>
          )}
          <span style={{ marginLeft: "auto", display: "inline-flex", color: "var(--muted)" }}>
            {isOpen ? <IconChevronUp s={14} /> : <IconChevronDown s={14} />}
          </span>
        </button>

        {/* Details */}
        {isOpen && (
            
  <div
  style={{
    padding: "4px 12px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    borderTop: "1px solid var(--border)",
    maxHeight: 500,
    overflowY: "auto",
    overflowX: "hidden",
  }}
>
                {/* Error summary banner */}
            {err && (
              <div style={{
                display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap",
                background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.3)",
                borderRadius: 6, padding: "8px 11px",
              }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>{err.name}</span>
                {err.message && (
  <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text)", opacity: 0.9, wordBreak: "break-word" }}>
    {err.message}
  </span>
)}
              </div>
            )}

            {/* First-difference pointer for Wrong Answer */}
            {diff && (
              <div style={{
                background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.35)",
                borderRadius: 6, padding: "8px 11px",
                fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--text)",
                display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
              }}>
                <span style={{ color: "var(--warn)", fontWeight: 700, letterSpacing: "0.06em" }}>MISMATCH</span>
                <span>at line <b>{diff.line}</b>, col <b>{diff.col}</b></span>
                <span style={{ opacity: 0.85 }}>
                  expected <CharBadge ch={diff.expectedCh} /> got <CharBadge ch={diff.actualCh} danger />
                </span>
              </div>
            )}

            {!hideInput && r.input != null && r.input !== "" && (
              <IOBlock label="Input" value={String(r.input)} showWs={showWs} />
            )}

            {r.expected != null && r.expected !== "" && (
              <IOBlock label="Expected Output" value={rawExpected} showWs={showWs} />
            )}

            {/* Your Output — always rendered, exact bytes preserved */}
            <IOBlock
  label="Your Output"
  value={err ? (r.stderr || rawActual) : rawActual}
  showWs={showWs}
  tone={errorish ? "danger" : "default"}
  emptyHint="(program produced no stdout)"
/>

            {r.stderr != null && r.stderr !== "" && (
              <IOBlock label="Stderr" value={String(r.stderr)} showWs={showWs} tone="danger" />
            )}
          </div>
        )}
      </div>
    )
  })
}


function IOBlock({ label, value, showWs, tone = "default", emptyHint }) {
  const danger = tone === "danger"
  const isEmpty = value === ""

  return (
    <div>
      <div
        style={{
          marginBottom: 6,
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: danger ? "var(--danger)" : "var(--muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>

      <div
  style={{
    maxHeight: "200px",
    minHeight: "40px",
    overflow: "auto",
    border: `1px solid ${danger ? "rgba(255,68,68,0.3)" : "var(--border)"}`,
    borderRadius: 6,
    background: "var(--bg)",
  }}
>
        <pre
          style={{
            margin: 0,
            padding: 12,
            fontFamily: "var(--mono)",
            fontSize: 13,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: danger ? "var(--danger)" : "var(--text)",
          }}
        >
          {isEmpty
            ? (emptyHint || "(empty)")
            : (showWs ? renderWithWhitespace(value) : value)}
        </pre>
      </div>
    </div>
  )
}
// Inline char badge used in the mismatch pointer
function CharBadge({ ch, danger }) {
  const label = ch == null ? "EOF" : visibleChar(ch)
  const code  = ch == null ? "—" : `U+${ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}`
  return (
    <span style={{
      display: "inline-flex", alignItems: "baseline", gap: 4,
      padding: "1px 6px", borderRadius: 4,
      background: danger ? "rgba(255,68,68,0.12)" : "rgba(var(--accent-rgb),0.1)",
      border: `1px solid ${danger ? "rgba(255,68,68,0.35)" : "rgba(var(--accent-rgb),0.3)"}`,
      color: danger ? "var(--danger)" : "var(--accent)",
      fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700,
    }}>
      {label} <span style={{ opacity: 0.6, fontWeight: 400 }}>{code}</span>
    </span>
  )
}

// ── helpers ─────────────────────────────────────────────────────────────────

function meta(s) {
  if (s == null) return { chars: 0, lines: 0, trailingNewline: false }
  return {
    chars: s.length,
    lines: s === "" ? 0 : s.split("\n").length - (s.endsWith("\n") ? 1 : 0) || 1,
    trailingNewline: s.endsWith("\n"),
  }
}

function visibleChar(ch) {
  if (ch === " ") return "·"
  if (ch === "\t") return "→"
  if (ch === "\n") return "↵"
  if (ch === "\r") return "␍"
  return ch
}

// Walk the string and emit JSX, replacing whitespace with dim glyphs while
// preserving layout (newlines still break, tabs still tab via tab-size).
function renderWithWhitespace(s) {
  const nodes = []
  let i = 0
  let key = 0
  const dim = { color: "var(--muted)", opacity: 0.55 }
  while (i < s.length) {
    const ch = s[i]
    if (ch === " ") {
      let j = i
      while (j < s.length && s[j] === " ") j++
      nodes.push(<span key={key++} style={dim}>{"·".repeat(j - i)}</span>)
      i = j
    } else if (ch === "\t") {
      nodes.push(<span key={key++} style={dim}>→</span>)
      nodes.push(<span key={key++}>{"\t"}</span>)
      i++
    } else if (ch === "\n") {
      nodes.push(<span key={key++} style={dim}>↵</span>)
      nodes.push("\n")
      i++
    } else if (ch === "\r") {
      nodes.push(<span key={key++} style={dim}>␍</span>)
      i++
    } else {
      let j = i
      while (j < s.length && s[j] !== " " && s[j] !== "\t" && s[j] !== "\n" && s[j] !== "\r") j++
      nodes.push(<span key={key++}>{s.substring(i, j)}</span>)
      i = j
    }
  }
  return nodes
}

// Locate the first byte where two strings differ, return 1-based line + col
// and the offending characters from each side.
function firstDiff(a, b) {
  if (a === b) return null
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a[i] === b[i]) i++
  // Compute line/col from `a` (expected) — both share the prefix up to i.
  let line = 1, col = 1
  for (let k = 0; k < i; k++) {
    if (a[k] === "\n") { line++; col = 1 } else { col++ }
  }
  return {
    line, col,
    expectedCh: i < a.length ? a[i] : null,
    actualCh:   i < b.length ? b[i] : null,
  }
}

// Pull the error type + message out of a traceback / stderr.
function extractError(r) {
  if (r.passed) return null
  const text = (r.stderr && r.stderr.trim()) ? r.stderr : (r.actual || "")
  if (!text) return null
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const re = /^([A-Za-z_][\w.]*(?:Error|Exception|Warning)|SyntaxError|Segmentation fault)\s*:?\s*(.*)$/
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(re)
    if (m) return { name: m[1], message: m[2] || "" }
  }
  return null
}
