import useMatchStore from "../../store/matchStore"

export default function MatchTimer() {
  const timeLeft = useMatchStore((s) => s.timeLeft)

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0")
    const sec = (s % 60).toString().padStart(2, "0")
    return `${m}:${sec}`
  }

  const timerColor =
    timeLeft <= 60
      ? "var(--danger)"
      : timeLeft <= 300
      ? "var(--warn)"
      : "var(--accent)"

  const timerShake = timeLeft <= 10

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 14px",
        borderRadius: 6,
        border: `1px solid ${
          timeLeft <= 60
            ? "rgba(255,68,68,0.5)"
            : timeLeft <= 300
            ? "rgba(255,170,0,0.4)"
            : "var(--border)"
        }`,
        background:
          timeLeft <= 60
            ? "rgba(255,68,68,0.07)"
            : timeLeft <= 300
            ? "rgba(255,170,0,0.05)"
            : "var(--s2)",
        animation: timerShake ? "timer-shake 0.4s infinite" : "none",
        transition: "all 0.3s ease",
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 16 16"
        fill="none"
        stroke={timerColor}
        strokeWidth="1.5"
      >
        <circle cx="8" cy="9" r="6" />
        <path d="M8 6v3l2 1" />
        <path d="M6 1h4" />
      </svg>

      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: timerColor,
        }}
      >
        {formatTime(timeLeft)}
      </span>
    </div>
  )
}