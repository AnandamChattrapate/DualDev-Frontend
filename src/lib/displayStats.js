/** Public-facing bump so early real counts don't look empty. */
export const DISPLAY_BOOST = 55

export function displayUsers(n) {
  return (Number(n) || 0) + DISPLAY_BOOST
}

export function displayMatches(n) {
  return (Number(n) || 0) + DISPLAY_BOOST
}

export function formatStat(n) {
  const v = Number(n) || 0
  return v.toLocaleString()
}
