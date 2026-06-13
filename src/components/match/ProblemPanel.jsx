import { useState, useMemo } from "react"
import { IconChevronUp, IconChevronDown, IconBulb } from "./icons"

export default function ProblemPanel({ problem, activeTab: externalTab, onTabChange }) {
  const [collapsed, setCollapsed]       = useState(false)
  const [internalTab, setInternalTab]   = useState("description")
  /* Controlled mode if parent passes activeTab + onTabChange; otherwise
     fall back to local state. Either way, the tab is the source of truth
     for the opponent's "reading <section>" indicator. */
  const activeTab    = externalTab    ?? internalTab
  const setActiveTab = onTabChange    ?? setInternalTab
  const [openHint, setOpenHint]   = useState(null)

  const tabs = useMemo(() => {
    const t = [{ id: "description", label: "Description" }]
    if (problem.inputFormat || problem.outputFormat) t.push({ id: "io", label: "Input / Output" })
    if (problem.constraints?.length)                 t.push({ id: "constraints", label: "Constraints" })
    if (problem.sampleTestCases?.length)             t.push({ id: "examples", label: "Examples" })
    if (problem.hints?.length)                       t.push({ id: "hints", label: "Hints" })
    return t
  }, [problem])

  const active = tabs.some((t) => t.id === activeTab) ? activeTab : "description"

  return (
    <div className="panel" style={{ flexShrink: 0, display: "flex", flexDirection: "column" }}>
      {/* ── Tab row ── */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 10px", borderBottom: collapsed ? "none" : "1px solid var(--border)",
          background: "var(--s2)",
        }}
      >
        <span style={{
          fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.16em",
          color: "var(--muted)", textTransform: "uppercase", flexShrink: 0, paddingRight: 4,
        }}>
          Problem
        </span>

        <div className="strip-tabs" role="tablist" aria-label="Problem sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              className={`strip-tab ${active === t.id ? "active" : ""}`}
              onClick={() => { setActiveTab(t.id); setCollapsed(false) }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="btn btn-icon"
          style={{ flexShrink: 0 }}
          title={collapsed ? "Expand problem" : "Collapse problem"}
          aria-label={collapsed ? "Expand problem panel" : "Collapse problem panel"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <IconChevronDown s={14} /> : <IconChevronUp s={14} />}
        </button>
      </div>

      {/* ── Content ── */}
      {!collapsed && (
        <div
          className="fade-in"
          style={{ maxHeight: 260, overflowY: "auto", padding: "16px 18px" }}
        >
          {active === "description" && (
            <>
              <h1 style={{ fontFamily: "var(--sans)", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.5px" }}>
                {problem.title}
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.7, color: "var(--text)", opacity: 0.85, whiteSpace: "pre-wrap" }}>
                {problem.description}
              </p>
            </>
          )}

          {active === "io" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {problem.inputFormat && (
                <Block label="Input Format" accent="var(--accent)">{problem.inputFormat}</Block>
              )}
              {problem.outputFormat && (
                <Block label="Output Format" accent="var(--warn)">{problem.outputFormat}</Block>
              )}
            </div>
          )}

          {active === "constraints" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {problem.constraints.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    background: "var(--s2)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "9px 12px",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginTop: 7, flexShrink: 0 }} />
                  <code style={{ fontFamily: "var(--mono)", fontSize: 17, lineHeight: 1.6, color: "var(--text)", opacity: 0.9 }}>{c}</code>
                </div>
              ))}
            </div>
          )}

          {active === "examples" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {problem.sampleTestCases.map((tc, i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "6px 12px", background: "var(--s2)", borderBottom: "1px solid var(--border)", fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase" }}>
                    Example {i + 1}
                  </div>
                  <ExampleRow label="Input" color="#3b82f6">{tc.input}</ExampleRow>
                  <ExampleRow label="Output" color="var(--accent)" topBorder>{tc.output}</ExampleRow>
                  {tc.explanation && (
                    <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", background: "var(--s2)" }}>
                      <p style={{ fontSize: 16, fontStyle: "italic", lineHeight: 1.6, color: "var(--muted)" }}>{tc.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {active === "hints" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {problem.hints.map((hint, i) => (
                <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                  <button
                    onClick={() => setOpenHint(openHint === i ? null : i)}
                    aria-expanded={openHint === i}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 12px", cursor: "pointer", border: "none",
                      background: openHint === i ? "rgba(var(--accent-rgb),0.08)" : "var(--s2)",
                      color: openHint === i ? "var(--accent)" : "var(--text)",
                      fontFamily: "var(--sans)", fontSize: 16, fontWeight: 500,
                    }}
                  >
                    <span style={{ display: "inline-flex", color: openHint === i ? "var(--accent)" : "var(--warn)" }}><IconBulb s={15} /></span>
                    <span>Hint {i + 1}</span>
                    <span style={{ marginLeft: "auto", display: "inline-flex", color: "var(--muted)" }}>
                      {openHint === i ? <IconChevronUp s={13} /> : <IconChevronDown s={13} />}
                    </span>
                  </button>
                  {openHint === i && (
                    <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)", background: "var(--bg)", fontSize: 17, lineHeight: 1.7, color: "var(--text)", opacity: 0.9 }}>
                      {hint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Block({ label, accent, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 4, height: 14, borderRadius: 4, background: accent }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase" }}>{label}</span>
      </div>
      <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--text)", opacity: 0.85, whiteSpace: "pre-wrap", fontFamily: "var(--mono)" }}>{children}</p>
    </div>
  )
}

function ExampleRow({ label, color, topBorder, children }) {
  return (
    <div style={{ padding: "9px 12px", borderTop: topBorder ? "1px solid var(--border)" : "none" }}>
      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color }}>{label}</p>
      <pre style={{ fontFamily: "var(--mono)", fontSize: 17, lineHeight: 1.6, color: "var(--text)", opacity: 0.9, whiteSpace: "pre-wrap", overflowX: "auto", margin: 0 }}>{children}</pre>
    </div>
  )
}
