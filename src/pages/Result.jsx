import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import useMatchStore from "../store/matchStore";
import socket from "../socket/socket";

// Formats a duration in ms into "Xm Ys" or "—" if unknown
function formatDuration(ms) {
  if (!ms || ms <= 0) return "—"
  const secs = Math.floor(ms / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

/* Pick the opponent's entry out of a players payload keyed by userId.
   The store's `opponent` is empty on a fresh load of this page (reload, or
   after resetMatch cleared it), so relying on it alone left the opponent
   column reading "Unknown" with no stats. Whichever id in the payload isn't
   mine is the opponent — a match only ever has two players. */
function pickOpponent(players, myId) {
  if (!players) return null
  const storedOppId = useMatchStore.getState().opponent?.userId
  if (storedOppId && players[storedOppId]) return players[storedOppId]
  const oppId = Object.keys(players).find((id) => id !== myId)
  return oppId ? players[oppId] : null
}

const EVAL_MESSAGES = [
  "Evaluating your code…",
  "Running final test cases…",
  "Consulting the AI judge…",
  "Calculating rating changes…",
  "Almost there…",
]

/* Shared page chrome. Every colour here comes from the sitewide tokens so
   the result screen follows the same light/dark theme as the rest of the
   app instead of being permanently dark. */
function PageShell({ children, center = false }) {
  return (
    <div
      className={`min-h-screen px-6 overflow-x-hidden ${center ? "flex items-center justify-center" : "py-10"}`}
      style={{ background: "var(--color-bg)", color: "var(--color-text-primary)" }}
    >
      {children}
    </div>
  )
}

function Wordmark({ size = 42 }) {
  return (
    <h1 className="font-claude font-bold tracking-[-2px]" style={{ fontSize: size }}>
      <span style={{ color: "var(--color-text-primary)" }}>Dual</span>
      <span style={{ color: "var(--color-accent-orange)" }}>Dev</span>
    </h1>
  )
}

// Full-screen loading state shown between "match ended" and "we have a
// verdict" — replaces what used to be a dead-air wait on the match screen.
function EvaluatingScreen() {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % EVAL_MESSAGES.length)
    }, 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <PageShell center>
      <div className="relative z-10 text-center">
        <div className="mb-10 flex justify-center"><Wordmark size={32} /></div>

        <div className="relative w-20 h-20 mx-auto mb-8">
          <div
            className="absolute inset-0 rounded-full border-4"
            style={{ borderColor: "var(--color-border)" }}
          />
          <div
            className="absolute inset-0 rounded-full border-4 border-r-transparent border-b-transparent border-l-transparent animate-spin"
            style={{ borderTopColor: "var(--color-accent-green)" }}
          />
        </div>

        <div className="min-h-[28px] flex items-center justify-center px-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="text-lg whitespace-nowrap"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {EVAL_MESSAGES[msgIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5">
          {EVAL_MESSAGES.map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i === msgIndex
                  ? "var(--color-accent-green)"
                  : "var(--color-border)",
              }}
            />
          ))}
        </div>
      </div>
    </PageShell>
  )
}

export default function Result() {
  const { matchId } = useParams();
  const navigate    = useNavigate();

  const currentUser     = useMatchStore((s) => s.currentUser);
  const opponent        = useMatchStore((s) => s.opponent);
  const winner          = useMatchStore((s) => s.winner);
  const aiReview        = useMatchStore((s) => s.aiReview);
  const myTestsPassed   = useMatchStore((s) => s.myTestsPassed);
  const myTotalTests    = useMatchStore((s) => s.myTotalTests);
  const oppTestsPassed  = useMatchStore((s) => s.oppTestsPassed);
  const oppTotalTests   = useMatchStore((s) => s.oppTotalTests);
  const oppLanguage     = useMatchStore((s) => s.oppLanguage);
  const finalOppUsername = useMatchStore((s) => s.finalOppUsername);
  const finalMyCode     = useMatchStore((s) => s.finalMyCode);
  const finalMyLanguage = useMatchStore((s) => s.finalMyLanguage);
  const myRatingBefore  = useMatchStore((s) => s.myRatingBefore);
  const myRatingAfter   = useMatchStore((s) => s.myRatingAfter);
  const matchStartTime  = useMatchStore((s) => s.matchStartTime);
  const matchEndTime    = useMatchStore((s) => s.matchEndTime);
  const checkAuth       = useMatchStore((s) => s.checkAuth);
  const resetMatch      = useMatchStore((s) => s.resetMatch);

  const setWinner          = useMatchStore((s) => s.setWinner);
  const setAIReview        = useMatchStore((s) => s.setAIReview);
  const setMatchEndTime    = useMatchStore((s) => s.setMatchEndTime);
  const applyFinalResult   = useMatchStore((s) => s.applyFinalResult);

  // Only used as a last-resort fallback if the backend never provided an
  // authoritative myRatingAfter (e.g. the error-path payload with no stats).
  const [fallbackRatingAfter, setFallbackRatingAfter] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  /* Whether the backend has told us the match is over, independent of who
     won. The server's error path legitimately emits a null winnerId (it
     can't always determine one), so keying the spinner off `winner != null`
     alone left this page loading forever on a result that had, in fact,
     already arrived. */
  const [resultReceived, setResultReceived] = useState(false);

  const userId = currentUser?._id;
  const iWon   = winner != null && winner !== "draw" && winner === userId;
  const isDraw = winner === "draw";
  const iLost  = winner != null && !iWon && !isDraw;
  const undecided = resultReceived && winner == null;

  useEffect(() => {
    checkAuth().then((res) => {
      if (res?.payload?.rating != null) setFallbackRatingAfter(res.payload.rating)
    })

    // Catch match_result if it arrives after we've already navigated here
    // (Match.jsx's own listener is gone by then — that page unmounted).
    const onMatchResult = ({ winnerId, aiReview: review, players }) => {
      setMatchEndTime(Date.now())
      setResultReceived(true)
      if (winnerId != null) setWinner(winnerId)
      if (review) setAIReview(review)
      if (players) {
        const myId  = useMatchStore.getState().currentUser?._id
        applyFinalResult({ mine: myId ? players[myId] : null, opp: pickOpponent(players, myId) })
      }
    }
    socket.on("match_result", onMatchResult)

    // Belt-and-suspenders REST fallback in case the socket event is missed
    // entirely (dropped connection, reload landing straight on this page).
    // The backend's match-end processing (settle delay + AI judge call) can
    // take a few seconds, so poll a few times rather than trying once.
    let cancelled = false
    let attempts = 0
    const maxAttempts = 10
    const pollMatch = () => {
      if (cancelled || useMatchStore.getState().winner != null) return
      attempts += 1
      axios.get(`${import.meta.env.VITE_API_URL}/api/match/${matchId}/result`, { withCredentials: true })
        .then(res => {
          if (cancelled) return
          const result = res.data?.result
          if (!result?.finished) {
            if (attempts < maxAttempts) setTimeout(pollMatch, 1500)
            else setLoadFailed(true)
            return
          }

          setResultReceived(true)
          setMatchEndTime(Date.now())
          if (result.winner != null) setWinner(result.winner)
          if (result.aiReview?.reasoning) setAIReview(result.aiReview)

          const myId  = useMatchStore.getState().currentUser?._id
          const mine  = myId ? result.players?.[myId] : null
          const opp   = pickOpponent(result.players, myId)
          applyFinalResult({ mine, opp })
        })
        .catch((err) => {
          if (cancelled) return
          // 403/404 are terminal — retrying can't help.
          const status = err?.response?.status
          if (status === 403 || status === 404) { setLoadFailed(true); return }
          if (attempts < maxAttempts) setTimeout(pollMatch, 1500)
          else setLoadFailed(true)
        })
    }
    if (winner == null && matchId) pollMatch()

    // Remove CSS variables that Match.jsx injected so layout renders normally
    const vars = ["--bg","--s1","--s2","--border","--text","--text-2","--muted",
                  "--accent","--accent-ink","--accent-soft","--accent-line","--accent-rgb",
                  "--danger","--danger-soft","--danger-line","--warn","--logo",
                  "--mono","--sans","--display"]
    vars.forEach(v => document.documentElement.style.removeProperty(v))

    return () => {
      cancelled = true
      socket.off("match_result", onMatchResult)
      useMatchStore.getState().resetMatch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ratingBefore  = myRatingBefore ?? currentUser?.rating ?? null
  const ratingAfter   = myRatingAfter  ?? fallbackRatingAfter
  const ratingDiff    = (ratingAfter != null && ratingBefore != null) ? ratingAfter - ratingBefore : null
  const matchDuration = (matchEndTime && matchStartTime) ? matchEndTime - matchStartTime : null

  const myLanguage  = finalMyLanguage || useMatchStore.getState().myLanguage
  const myCode      = finalMyCode
  const totalTests  = myTotalTests || oppTotalTests || 0

  const handleHome = () => { resetMatch(); navigate("/") }

  // Keep loading only while the backend genuinely hasn't reported back.
  if (!resultReceived && winner == null && !loadFailed) {
    return <EvaluatingScreen />
  }

  if (!resultReceived && winner == null && loadFailed) {
    return (
      <PageShell center>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Couldn't load your result</h2>
          <p className="mb-8" style={{ color: "var(--color-text-secondary)" }}>
            The match may still be processing. Try refreshing, or head back home.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              className="h-12 px-6 rounded-xl font-semibold"
              style={{ background: "var(--color-accent-green)", color: "var(--color-bg)" }}
            >
              Retry
            </button>
            <button
              onClick={handleHome}
              className="h-12 px-6 rounded-xl font-semibold border"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
            >
              Home
            </button>
          </div>
        </div>
      </PageShell>
    )
  }

  const resultText = undecided ? "NO RESULT" : iWon ? "YOU WON" : iLost ? "YOU LOST" : "DRAW"
  const resultColor = undecided
    ? "var(--color-text-secondary)"
    : iWon
    ? "var(--color-accent-green)"
    : iLost
    ? "#FF5A5A"
    : "#D9A400"
  const statusLine = undecided
    ? "The judge couldn't determine a winner for this match"
    : `${iWon ? "Victory" : iLost ? "Defeat" : "Tie"} · Match completed`

  return (
    <PageShell>
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <Wordmark />
        </div>

        <div
          className="rounded-[32px] p-10 border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          {/* Result banner */}
          <div className="text-center mb-14 animate-fade-in">
            <h2
              className="font-claude text-[72px] font-bold tracking-[-4px] leading-none"
              style={{ color: resultColor }}
            >
              {resultText}
            </h2>
            <div
              className="mt-4 inline-flex items-center gap-2 px-6 py-2 rounded-full text-sm border"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: undecided ? "var(--color-text-muted)" : "var(--color-accent-green)" }}
              />
              {statusLine}
            </div>
          </div>

          {/* Players comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-10 mb-16">
            <PlayerCard
              player={currentUser}
              label="YOU"
              color="var(--color-accent-green)"
              testsPassed={myTestsPassed}
              totalTests={myTotalTests}
              time={formatDuration(matchDuration)}
              language={myLanguage}
            />

            <div className="flex flex-col items-center justify-center pt-12">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border"
                style={{
                  background: "var(--color-surface-2)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-secondary)",
                }}
              >
                VS
              </div>
              <div className="mt-4 text-xs uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                {myTestsPassed} - {oppTestsPassed}
              </div>
              {totalTests > 0 && (
                <div className="w-full mt-2 flex gap-1">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{ width: `${(myTestsPassed / totalTests) * 100}%`, background: "var(--color-accent-green)" }}
                  />
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{ width: `${(oppTestsPassed / totalTests) * 100}%`, background: "var(--color-accent-orange)" }}
                  />
                </div>
              )}
            </div>

            <PlayerCard
              player={{ ...opponent, username: finalOppUsername || opponent?.username }}
              label="OPPONENT"
              color="var(--color-accent-orange)"
              testsPassed={oppTestsPassed}
              totalTests={oppTotalTests}
              time="—"
              language={oppLanguage}
            />
          </div>

          {/* Rating change */}
          <Section>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl font-semibold mb-2">Rating Change</div>
                <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Ranked matchmaking adjustment
                </div>
              </div>
              <div className="text-right">
                {ratingBefore != null && ratingAfter != null ? (
                  <>
                    <div className="text-3xl font-bold tracking-[-1px]">
                      {ratingBefore}
                      <span className="mx-2" style={{ color: "var(--color-text-muted)" }}>→</span>
                      {ratingAfter}
                    </div>
                    <div
                      className="mt-2 text-lg font-semibold"
                      style={{ color: ratingDiff >= 0 ? "var(--color-accent-green)" : "#FF5A5A" }}
                    >
                      {ratingDiff >= 0 ? "+" : ""}{ratingDiff} {ratingDiff >= 0 ? "↑" : "↓"}
                    </div>
                  </>
                ) : (
                  <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>Unavailable</div>
                )}
              </div>
            </div>
          </Section>

          {/* AI review */}
          {aiReview?.reasoning && (
            <Section>
              <div className="mb-6">
                <div className="text-xl font-semibold">AI Judge Reasoning</div>
                <div className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Match evaluation summary
                </div>
              </div>
              <p
                className="leading-relaxed text-[15px] whitespace-pre-wrap"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {aiReview.reasoning}
              </p>
            </Section>
          )}

          {/* Your code */}
          {myCode && (
            <Section noPadding>
              <div
                className="px-6 py-5 flex items-center justify-between border-b"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div>
                  <div className="text-lg font-semibold">Your Solution</div>
                  <div className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                    Submitted in {myLanguage}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="px-4 py-2 rounded-full text-sm border"
                    style={{
                      background: "var(--color-surface-2)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-accent-green)",
                    }}
                  >
                    {myTestsPassed}/{totalTests || "?"} passed
                  </span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(myCode)}
                    className="w-8 h-8 rounded-lg border flex items-center justify-center transition"
                    style={{
                      background: "var(--color-surface-2)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                    title="Copy code"
                    aria-label="Copy code"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
              <pre
                className="p-6 overflow-x-auto text-[13px] font-mono leading-relaxed"
                style={{ background: "var(--color-bg)", color: "var(--color-text-primary)" }}
              >
                <code>{myCode}</code>
              </pre>
            </Section>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={handleHome}
              className="h-14 px-8 rounded-2xl transition-all duration-300 text-[15px] font-semibold hover:scale-[1.03]"
              style={{ background: "var(--color-accent-green)", color: "var(--color-bg)" }}
            >
              Play Again
            </button>
            <button
              onClick={handleHome}
              className="h-14 px-8 rounded-2xl border transition-all duration-300 text-[15px] font-semibold"
              style={{
                background: "var(--color-surface-2)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              Home
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          0%   { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fade-in 0.8s cubic-bezier(0.16,1,0.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in { animation: none; }
        }
      `}</style>
    </PageShell>
  );
}

function Section({ children, noPadding = false }) {
  return (
    <div
      className={`rounded-3xl mb-12 border ${noPadding ? "overflow-hidden" : "p-8"}`}
      style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}
    >
      {children}
    </div>
  )
}

function PlayerCard({ player, label, color, testsPassed, totalTests, time, language }) {
  const pct = totalTests > 0 ? (testsPassed / totalTests) * 100 : 0;

  return (
    <div
      className="rounded-3xl p-7 border"
      style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center border"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />
        </div>
        <div>
          <div className="text-lg font-semibold">{player?.username || "Unknown"}</div>
          <div className="text-sm mt-1" style={{ color }}>{label}</div>
        </div>
      </div>

      <div className="space-y-5">
        <Row label="Tests Passed">
          <span className="font-semibold" style={{ color }}>
            {totalTests > 0 ? `${testsPassed}/${totalTests}` : `${testsPassed}`}
          </span>
        </Row>
        {totalTests > 0 && (
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        )}
        <Row label="Time"><span>{time}</span></Row>
        <Row label="Language"><span>{language || "—"}</span></Row>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{label}</span>
      {children}
    </div>
  )
}
