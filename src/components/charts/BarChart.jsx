import { useState } from "react"

// Day-bucketed bar chart, hand-rolled SVG. Rounded top corners, a visible
// gap between bars (the dataviz spacer rule), per-bar hover tooltip.
export default function BarChart({ data, height = 200, color = "var(--color-accent-green)", formatLabel, formatValue, ariaLabel }) {
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

  const max = Math.max(...data.map((d) => d.value), 1)
  const innerW = W - padX * 2
  const innerH = H - padTop - padBottom

  const gap = 3
  const barW = Math.max(2, innerW / data.length - gap)

  return (
    <div className="relative w-full" role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        <line x1={padX} y1={padTop + innerH} x2={W - padX} y2={padTop + innerH} stroke="var(--color-border)" strokeWidth="1" />

        {data.map((d, i) => {
          const barH = Math.max(1, (d.value / max) * innerH)
          const x = padX + i * (barW + gap)
          const y = padTop + innerH - barH
          const isHover = hoverIdx === i
          return (
            <rect
              key={i}
              x={x} y={y} width={barW} height={barH}
              rx={Math.min(3, barW / 2)}
              fill={color}
              opacity={isHover ? 1 : 0.75}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          )
        })}
      </svg>

      {hoverIdx != null && (
        <div
          className="absolute pointer-events-none bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${((padX + hoverIdx * (barW + gap) + barW / 2) / W) * 100}%`,
            top: 0,
            transform: `translate(${hoverIdx > data.length / 2 ? "-105%" : "5%"}, 0)`,
          }}
        >
          <div className="text-[var(--color-text-secondary)]">{formatLabel ? formatLabel(data[hoverIdx]) : ""}</div>
          <div className="text-[var(--color-text-primary)] font-semibold">
            {formatValue ? formatValue(data[hoverIdx]) : data[hoverIdx].value}
          </div>
        </div>
      )}

      <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] mt-1 px-1">
        <span>{formatLabel ? formatLabel(data[0]) : ""}</span>
        <span>{formatLabel ? formatLabel(data[data.length - 1]) : ""}</span>
      </div>
    </div>
  )
}
