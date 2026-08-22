import { displayMatches, displayUsers, formatStat } from '../../lib/displayStats.js'

/**
 * Auto-scrolling platform stats strip — sits above "How a match works".
 */
export default function StatsTicker({
  playersOnline = 0,
  totalUsers = 0,
  battlesPlayed = 0,
  battlesLiveNow = 0,
  languages = 3,
  problems = 0,
  topics = 0,
  loading = false,
}) {
  const items = [
    { label: 'Online', value: loading ? '—' : formatStat(playersOnline) },
    { label: 'Total users', value: loading ? '—' : formatStat(displayUsers(totalUsers)) },
    { label: 'Matches', value: loading ? '—' : formatStat(displayMatches(battlesPlayed)) },
    { label: 'Current battles', value: loading ? '—' : formatStat(battlesLiveNow) },
    { label: 'Languages', value: loading ? '—' : formatStat(languages) },
    { label: 'Problems', value: loading ? '—' : formatStat(problems) },
    { label: 'Topics', value: loading ? '—' : formatStat(topics) },
  ]

  const track = [...items, ...items]

  return (
    <div className="stats-ticker" aria-label="Platform stats">
      <div className="stats-ticker-track">
        {track.map((item, i) => (
          <div key={`${item.label}-${i}`} className="stats-ticker-item">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
