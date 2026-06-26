import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useMatchStore from "../store/matchStore";

// Formats seconds into "Xm Ys" or "—" if unknown
function formatDuration(ms) {
  if (!ms || ms <= 0) return "—"
  const secs = Math.floor(ms / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function Result() {
  const { matchId } = useParams();
  const navigate    = useNavigate();

  const currentUser    = useMatchStore((s) => s.currentUser);
  const opponent       = useMatchStore((s) => s.opponent);
  const winner         = useMatchStore((s) => s.winner);
  const aiReview       = useMatchStore((s) => s.aiReview);
  const myTestsPassed  = useMatchStore((s) => s.myTestsPassed);
  const myTotalTests   = useMatchStore((s) => s.myTotalTests);
  const oppTestsPassed = useMatchStore((s) => s.oppTestsPassed);
  const oppTotalTests  = useMatchStore((s) => s.oppTotalTests);
  const myLanguage     = useMatchStore((s) => s.myLanguage);
  const myCode         = useMatchStore((s) => s.codeByLanguage[s.myLanguage]);
  const myRatingBefore = useMatchStore((s) => s.myRatingBefore);
  const matchStartTime = useMatchStore((s) => s.matchStartTime);
  const matchEndTime   = useMatchStore((s) => s.matchEndTime);
  const checkAuth      = useMatchStore((s) => s.checkAuth);
  const resetMatch     = useMatchStore((s) => s.resetMatch);

  const [ratingAfter, setRatingAfter] = useState(null);

  const userId = currentUser?._id;
  const iWon   = winner != null && winner === userId;
  const isDraw = winner === "draw";
  const iLost  = !iWon && !isDraw;

  // Re-fetch user so we have the updated post-match rating
  useEffect(() => {
    checkAuth().then((res) => {
      if (res?.payload?.rating != null) setRatingAfter(res.payload.rating)
    })

    // Remove CSS variables that Match.jsx injected so layout renders normally
    const vars = ["--bg","--s1","--s2","--border","--text","--muted",
                  "--accent","--accent-dim","--accent-rgb","--danger","--warn","--logo"]
    vars.forEach(v => document.documentElement.style.removeProperty(v))

    return () => { useMatchStore.getState().resetMatch() }
  }, []);

  const ratingBefore = myRatingBefore ?? currentUser?.rating ?? null
  const ratingDiff   = (ratingAfter != null && ratingBefore != null) ? ratingAfter - ratingBefore : null
  const matchDuration = (matchEndTime && matchStartTime) ? matchEndTime - matchStartTime : null

  const totalTests = myTotalTests || oppTotalTests || 0

  const handleHome = () => { resetMatch(); navigate("/") }

  const resultEmoji = iWon ? "🏆" : iLost ? "💀" : "🤝"
  const resultText  = iWon ? "YOU WON" : iLost ? "YOU LOST" : "DRAW"
  const resultColor = iWon ? "text-[#00FF85]" : iLost ? "text-[#FF5A5A]" : "text-[#FFD166]"
  const glowColor   = iWon
    ? "0 0 40px rgba(0,255,133,0.5)"
    : iLost
    ? "0 0 40px rgba(255,90,90,0.5)"
    : "0 0 40px rgba(255,209,102,0.5)"

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white px-6 py-10 overflow-x-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,133,0.06),transparent_40%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h1 className="font-claude text-[42px] font-bold tracking-[-2px]">
            <span className="text-white">Dual</span>
            <span className="text-[#F4B183]">Dev</span>
          </h1>
          <div className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-white/40 text-sm">
            Match #{matchId?.slice(0, 6)}
          </div>
        </div>

        <div className="bg-[#101010]/90 border border-white/10 rounded-[32px] p-10 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          {/* Result banner */}
          <div className="text-center mb-14 animate-fade-in">
            <div className="text-[88px] mb-3 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              {resultEmoji}
            </div>
            <h2
              className={`font-claude text-[72px] font-bold tracking-[-4px] leading-none ${resultColor}`}
              style={{ textShadow: glowColor }}
            >
              {resultText}
            </h2>
            <div className="mt-4 inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm">
              <span className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse" />
              {iWon ? "Victory" : iLost ? "Defeat" : "Tie"} · Match completed
            </div>
          </div>

          {/* Players comparison */}
          <div className="grid grid-cols-3 items-start gap-10 mb-16">
            <PlayerCard
              player={currentUser}
              label="YOU"
              color="#00FF85"
              testsPassed={myTestsPassed}
              totalTests={myTotalTests || totalTests}
              time={formatDuration(matchDuration)}
              language={myLanguage}
            />

            <div className="flex flex-col items-center justify-center pt-12">
              <div className="w-24 h-24 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-3xl font-bold text-white/80">
                VS
              </div>
              <div className="mt-4 text-white/40 text-xs uppercase tracking-widest">
                {myTestsPassed} - {oppTestsPassed}
              </div>
              {totalTests > 0 && (
                <div className="w-full mt-2 flex gap-1">
                  <div
                    className="h-1 rounded-full bg-[#00FF85] transition-all"
                    style={{ width: `${(myTestsPassed / totalTests) * 100}%` }}
                  />
                  <div
                    className="h-1 rounded-full bg-[#FF7A00] transition-all"
                    style={{ width: `${(oppTestsPassed / totalTests) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <PlayerCard
              player={opponent}
              label="OPPONENT"
              color="#FF7A00"
              testsPassed={oppTestsPassed}
              totalTests={oppTotalTests || totalTests}
              time="—"
              language={null}
            />
          </div>

          {/* Rating change */}
          <div className="bg-black/30 border border-white/10 rounded-3xl p-8 mb-12 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white text-xl font-semibold mb-2">Rating Change</div>
                <div className="text-white/40 text-sm">Ranked matchmaking adjustment</div>
              </div>
              <div className="text-right">
                {ratingBefore != null && ratingAfter != null ? (
                  <>
                    <div className="text-white text-3xl font-bold tracking-[-1px]">
                      {ratingBefore}
                      <span className="text-white/30 mx-2">→</span>
                      {ratingAfter}
                    </div>
                    <div className={`mt-2 text-lg font-semibold ${ratingDiff >= 0 ? "text-[#00FF85]" : "text-[#FF5A5A]"}`}>
                      {ratingDiff >= 0 ? "+" : ""}{ratingDiff} {ratingDiff >= 0 ? "↑" : "↓"}
                    </div>
                  </>
                ) : (
                  <div className="text-white/40 text-sm">Loading…</div>
                )}
              </div>
            </div>
          </div>

          {/* AI review */}
          {aiReview?.reasoning && (
            <div className="bg-black/30 border border-white/10 rounded-3xl p-8 mb-12 hover:border-white/20 transition-all">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#00FF85]/10 border border-[#00FF85]/20 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <div className="text-white text-xl font-semibold">AI Judge Reasoning</div>
                  <div className="text-white/40 text-sm mt-1">Match evaluation summary</div>
                </div>
              </div>
              <p className="text-white/70 leading-relaxed text-[15px] whitespace-pre-wrap">
                {aiReview.reasoning}
              </p>
            </div>
          )}

          {/* Your code */}
          {myCode && (
            <div className="bg-black/30 border border-white/10 rounded-3xl overflow-hidden mb-12 hover:border-white/20 transition-all">
              <div className="border-b border-white/10 px-6 py-5 flex items-center justify-between">
                <div>
                  <div className="text-white text-lg font-semibold">Your Solution</div>
                  <div className="text-white/40 text-sm mt-1">Submitted in {myLanguage}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/20 text-[#00FF85] text-sm">
                    {myTestsPassed}/{totalTests || "?"} passed
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(myCode)}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"
                    title="Copy code"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
              <pre className="p-6 overflow-x-auto text-[13px] text-[#D6D6D6] font-mono bg-[#0B0B0B] leading-relaxed">
                <code>{myCode}</code>
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={handleHome}
              className="group relative h-14 px-8 rounded-2xl bg-[#00FF85] hover:bg-[#00e676] transition-all duration-300 text-black text-[15px] font-semibold hover:scale-[1.03] overflow-hidden"
            >
              <span className="relative z-10">Play Again</span>
            </button>
            <button
              onClick={handleHome}
              className="h-14 px-8 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 text-white text-[15px] font-semibold"
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
      `}</style>
    </div>
  );
}

function PlayerCard({ player, label, color, testsPassed, totalTests, time, language }) {
  const pct = totalTests > 0 ? (testsPassed / totalTests) * 100 : 0;

  return (
    <div className="bg-black/30 border border-white/10 rounded-3xl p-7 transition-all hover:border-white/20">
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}
        >
          <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />
        </div>
        <div>
          <div className="text-white text-lg font-semibold">{player?.username || "Unknown"}</div>
          <div className="text-sm mt-1" style={{ color }}>{label}</div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-white/45 text-sm">Tests Passed</span>
          <span className="font-semibold" style={{ color }}>
            {totalTests > 0 ? `${testsPassed}/${totalTests} ✓` : `${testsPassed} ✓`}
          </span>
        </div>
        {totalTests > 0 && (
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
            />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-white/45 text-sm">Time</span>
          <span className="text-white">{time}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/45 text-sm">Language</span>
          <span className="text-white">{language || "—"}</span>
        </div>
      </div>
    </div>
  );
}
