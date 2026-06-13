import useMatchStore from "../../store/matchStore"

export default function DarkModeToggle() {
  const darkMode = useMatchStore((s) => s.darkMode)
  const toggleDarkMode = useMatchStore((s) => s.toggleDarkMode)

  return (
    <button
      onClick={toggleDarkMode}
      className="btn"
      style={{
        fontSize: 11,
        padding: "6px 10px",
      }}
    >
      {darkMode ? "🌙 Dark" : "☀️ Light"}
    </button>
  )
}