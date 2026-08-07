import { useState } from "react"

// Single-series time-series line chart, hand-rolled SVG (no chart lib in this
// project). Index-spaced x-axis — fine for regularly-sampled series like
// stats snapshots, where evenly spacing points reads cleaner than fighting
// gaps from a missed sample.
export default function LineChart({ data, height = 200, color = "var(--color-accent-green)", formatX, formatY, ariaLabel }) {
  const [hoverIdx, setHoverIdx] = useState(null)

  const W = 600
  const H = height
  const padX = 12
  const padTop = 16
  const padBottom = 28

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-[var(--color-text-muted)] text-sm" style={{ height }}>
        No data yet
      </div>
    )
  }

  const values = data.map((d) => d.y)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom

  const xAt = (i) => (data.length === 1 ? padX + innerW / 2 : padX + (i / (data.length - 1)) * innerW)
  const yAt = (v) => padTop + innerH - ((v - min) / range) * innerH

  const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d.y), raw: d }))
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")

  const hovered = hoverIdx != null ? points[hoverIdx] : null

  const handleMove = (e) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    let nearest = 0
    let best = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(p.x - px)
      if (d < best) { best = d; nearest = i }
    })
    setHoverIdx(nearest)
  }

  return (
    <div className="relative w-full" role="img" aria-label={ariaLabel}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* baseline */}
        <line x1={padX} y1={padTop + innerH} x2={W - padX} y2={padTop + innerH} stroke="var(--color-border)" strokeWidth="1" />

        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {hovered && (
          <>
            <line
              x1={hovered.x} y1={padTop} x2={hovered.x} y2={padTop + innerH}
              stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3,3"
            />
            <circle cx={hovered.x} cy={hovered.y} r="4" fill={color} stroke="var(--color-bg)" strokeWidth="2" />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="absolute pointer-events-none bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${(hovered.x / W) * 100}%`,
            top: 0,
            transform: `translate(${hovered.x > W / 2 ? "-105%" : "5%"}, 0)`,
          }}
        >
          <div className="text-[var(--color-text-secondary)]">{formatX ? formatX(hovered.raw) : ""}</div>
          <div className="text-[var(--color-text-primary)] font-semibold">{formatY ? formatY(hovered.raw) : hovered.raw.y}</div>
        </div>
      )}

      <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mt-1 px-1">
        <span>{formatX ? formatX(data[0]) : ""}</span>
        <span>{formatX ? formatX(data[data.length - 1]) : ""}</span>
      </div>
    </div>
  )
}
