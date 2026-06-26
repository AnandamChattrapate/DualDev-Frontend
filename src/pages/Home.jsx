import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import useMatchStore from '../store/matchStore.js'
import socket from '../socket/socket.js'
import MatchmakingRouteDiscovery from "../components/MatchmakingRouteDiscovery.jsx";

export default function Home() {
  const navigate        = useNavigate()
  const isAuthenticated = useMatchStore((s) => s.isAuthenticated)
  const authLoading     = useMatchStore((s) => s.authLoading)
  const currentUser     = useMatchStore((s) => s.currentUser)
  const isSearching     = useMatchStore((s) => s.isSearching)
  const setSearching    = useMatchStore((s) => s.setSearching)
  const initMatch       = useMatchStore((s) => s.initMatch)
  const logout          = useMatchStore((s) => s.logout)

  const [showModal, setShowModal]   = useState(false)
  const [topic, setTopic]           = useState("Array")
  const [difficulty, setDifficulty] = useState("Easy")
  const [mode, setMode]             = useState("random")

  const [roomId, setRoomId]             = useState(null)
  const [friendRoomId, setFriendRoomId] = useState("")
  const [roomCopied, setRoomCopied]     = useState(false)

  const [pendingMatch, setPendingMatch]       = useState(null)
  const [acceptCountdown, setAcceptCountdown] = useState(30)
  const [waitingAccept, setWaitingAccept]     = useState(false)
  const [startCountdown, setStartCountdown]   = useState(null)
  /* Issue 3 — 30 s search countdown shown on the overlay */
  const [searchSecondsLeft, setSearchSecondsLeft] = useState(30)
  /* Ref so the auto-cancel interval can check if a match was already found
     without needing pendingMatch in its dependency array. */
  const pendingMatchRef = useRef(null)

  const [timeLeft, setTimeLeft] = useState(900)
  // stats 
  // const totalMatches = "1.2M+"
  const totalLanguages = 3
   const matchmakingSpeed = "120ms"
   const judgeUptime = "99.9%"
  // const playersOnline = "2,431"

  const [playersOnline, setPlayersOnline] = useState(0);
  const [battlesPlayed, setBattlesPlayed] = useState(0);
  const [battlesLiveNow, setBattlesLiveNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Function to call the backend API
  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stats`); // adjust to your backend URL
      console.log("Response status:", res.status); // check if it's 200
      if (!res.ok) throw new Error(`Network error: ${res.status}`);
      const data = await res.json();               // parse JSON *here*
      console.log("Stats data:", data);            // now log the actual data
        
      // 3. Assign the received data to state variables
      setPlayersOnline(data.playersOnline);
      setBattlesPlayed(data.battlesPlayed);
      setBattlesLiveNow(data.battlesLiveNow);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // 4. Fetch on component mount and then poll every 5 seconds
  useEffect(() => {
    fetchStats(); // initial fetch
    const interval = setInterval(fetchStats, 10000); // refresh every 5s
    return () => clearInterval(interval); // cleanup
  }, []); 

    // ── HEARTBEAT for online tracking ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, 10_000); // every 10 seconds

    return () => clearInterval(interval);
  }, []);

  /* Keep ref in sync so the auto-cancel can check without a stale closure */
  useEffect(() => { pendingMatchRef.current = pendingMatch }, [pendingMatch])

  /* Issue 3 — 30 s search timeout.
     Counts down while searching. At 0 it calls cancelSearch ONLY if no
     match has been found yet (pendingMatchRef guard). The countdown resets
     whenever isSearching flips back to false. */
  useEffect(() => {
    if (!isSearching) { setSearchSecondsLeft(30); return }
    setSearchSecondsLeft(30)
    let seconds = 30
    const iv = setInterval(() => {
      seconds -= 1
      setSearchSecondsLeft(seconds)
      if (seconds <= 0) {
        clearInterval(iv)
        /* Don't cancel if match_found already arrived — the accept popup
           is showing and the user still needs to accept/decline. */
        if (pendingMatchRef.current) return
        setSearching(false)
        axios.delete(`${import.meta.env.VITE_API_URL}/api/matchmaking/leave`, { withCredentials: true }).catch(() => {})
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [isSearching]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {

      const timer = setInterval(() => {

        setTimeLeft((prev) => {

          if (prev <= 0) {
            clearInterval(timer)
            return 0
          }

          return prev - 1

        })

      }, 1000)

      return () => clearInterval(timer)

    }, [])

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')
  const userCode = `def two_sum(nums, target):
    seen = {}

        for i, num in enumerate(nums):
            comp = target - num

            if comp in seen:
                return [seen[comp], i]

            seen[num] = i

        return []

    n = int(input())
    nums = list(map(int, input().split()))
    target = int(input())

    print(two_sum(nums, target))`

    const opponentCode = `#include<▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓>
    using namespace ▓▓▓;

    int ▓▓▓▓(){
        int ▓;
        cin >> ▓;

        vector<int> ▓▓▓▓(▓);

        for(int ▓ = ▓; ▓ < ▓; ▓++){
            cin >> ▓▓▓▓[▓];
        }

        int ▓▓▓▓▓▓;
        cin >> ▓▓▓▓▓▓;

        unordered_map<int, int> ▓▓▓▓;

        for(int ▓ = ▓; ▓ < ▓; ▓++){

            int ▓▓▓▓▓▓▓▓▓▓▓ = ▓▓▓▓▓▓ - ▓▓▓▓[▓];

            if(▓▓▓▓.▓▓▓▓▓(▓▓▓▓▓▓▓▓▓▓▓)){
                cout << ▓▓▓▓[▓▓▓▓▓▓▓▓▓▓▓] << " " << ▓;
                return ▓;
            }

            ▓▓▓▓[▓▓▓▓[▓]] = ▓;
        }

        return ▓;
    }`

    const [typedUserCode, setTypedUserCode] = useState('')
    const [typedOpponentCode, setTypedOpponentCode] = useState('')

    useEffect(() => {

      let userIndex = 0
      let opponentIndex = 0

      const interval = setInterval(() => {

        if (userIndex < userCode.length) {
          setTypedUserCode(userCode.slice(0, userIndex + 1))
          userIndex++
        }

        if (opponentIndex < opponentCode.length) {
          setTypedOpponentCode(opponentCode.slice(0, opponentIndex + 1))
          opponentIndex++
        }

      }, 180)

      return () => clearInterval(interval)

    }, [])

  useEffect(() => {
    socket.on('match_found', (data) => {
      setPendingMatch({
        ...data,
        reason:data.reason || "",
      })
      setSearching(false)
      setRoomId(null)
      let remaining = data.timeout || 30
      setAcceptCountdown(remaining)
      const interval = setInterval(() => {
        remaining -= 1
        setAcceptCountdown(remaining)
        if (remaining <= 0) { clearInterval(interval); setPendingMatch(null) }
      }, 1000)
    })
    socket.on('match_acceptance_waiting', () => setWaitingAccept(true))
    socket.on('match_accepted', (data) => {
      setPendingMatch(null); setWaitingAccept(false)
      initMatch(data); navigate(`/match/${data.matchId}`)
    })
    socket.on('match_cancelled', ({ reason }) => {
      setPendingMatch(null); setWaitingAccept(false)
      setSearching(false); setRoomId(null); alert(reason)
    })
    socket.on('match_starting', ({ seconds }) => {
      setStartCountdown(seconds)
      let remaining = seconds
      const interval = setInterval(() => {
        remaining -= 1; setStartCountdown(remaining)
        if (remaining <= 0) clearInterval(interval)
      }, 1000)
    })
    return () => {
      socket.off('match_found'); socket.off('match_acceptance_waiting')
      socket.off('match_accepted'); socket.off('match_cancelled'); socket.off('match_starting')
    }
  }, [])

  const acceptMatch  = () => { socket.emit('accept_match',  { matchId: pendingMatch.matchId }); setWaitingAccept(true) }
  const declineMatch = () => { socket.emit('decline_match', { matchId: pendingMatch.matchId }); setPendingMatch(null); setWaitingAccept(false) }

  const joinMatch = async () => {
    if (!socket.connected || !socket.id) {
      alert("Still connecting to server — please wait a moment and try again.")
      return
    }
    try { setSearching(true); setShowModal(false); await axios.post(`${import.meta.env.VITE_API_URL}/api/matchmaking/join`, { socketId: socket.id, topic, difficulty }, { withCredentials: true }) }
    catch (e) { console.error(e.response?.data || e.message); setSearching(false) }
  }
  const createRoom = async () => {
    if (!socket.connected || !socket.id) {
      alert("Still connecting to server — please wait a moment and try again.")
      return
    }
    try { setShowModal(false); const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/matchmaking/create-room`, { socketId: socket.id, topic, difficulty }, { withCredentials: true }); setRoomId(res.data.roomId) }
    catch (e) { console.error(e.response?.data || e.message) }
  }
  const joinRoom = async () => {
    if (!socket.connected || !socket.id) {
      alert("Still connecting to server — please wait a moment and try again.")
      return
    }
    try { await axios.post(`${import.meta.env.VITE_API_URL}/api/matchmaking/join-room`, { socketId: socket.id, roomId: friendRoomId }, { withCredentials: true }) }
    catch (e) { console.error(e.response?.data || e.message) }
  }
  const cancelSearch = async () => {
    setSearching(false)
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/matchmaking/leave`, { withCredentials: true }).catch(() => {})
  }

  const handleLogout = async () => {
    await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {}, { withCredentials: true }).catch(() => {})
    logout()
    navigate('/login')
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#2A2A2A] border-t-[#00FF85] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#666] font-mono text-xs tracking-[3px]">INITIALIZING</p>
      </div>
    </div>
  )

  // ── Not authenticated ────────────────────────────────────────────────
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 font-mono">
      <p className="text-[#666] text-sm">Authentication required</p>
      <button
        onClick={() => navigate('/login')}
        className="bg-[#00FF85] text-black font-bold text-xs tracking-widest px-6 py-3 rounded-md hover:brightness-110 transition-all"
      >
        Go to Login
      </button>
    </div>
  )

  const ringCircumference = 2 * Math.PI * 34
  const ringOffset = ringCircumference - (ringCircumference * (acceptCountdown / 30))

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] overflow-x-hidden">

      {/* ── GLOBAL STYLES injected via style tag ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .font-mono-display { font-family: 'Space Mono', monospace; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker { animation: ticker 24s linear infinite; }
        @keyframes liveBlink { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.7); } }
        .live-dot { animation: liveBlink 1.2s ease-in-out infinite; }
        @keyframes glowPulse { 0%,100% { box-shadow: 0 0 16px rgba(0,255,133,0.4); } 50% { box-shadow: 0 0 36px rgba(0,255,133,0.7), 0 0 64px rgba(0,255,133,0.2); } }
        .glow-btn { animation: glowPulse 2.4s ease-in-out infinite; }
        @keyframes slideUp { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        .slide-up { animation: slideUp 0.22s ease forwards; }
        @keyframes searchPulse { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
        .search-dot { animation: searchPulse 1.2s ease-in-out infinite; }
        .dot-grid { background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 28px 28px; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-4 left-0 w-full z-50 px-5">

  <div className="max-w-[82rem] mx-auto h-[72px] px-10 flex items-center justify-between rounded-full border border-white/20 bg-black/30 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.45)]">

    {/* LOGO */}
    <div
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
      className="flex items-center gap-3 cursor-pointer select-none"
    >

      <h1 className="font-claude text-[40px] font-extrabold tracking-[-2px] leading-none">

        <span className="text-white">
          DUAL
        </span>

        <span className="text-[#F4B183]">
          DEV
        </span>

      </h1>

    </div>

    {/* NAV LINKS */}
    <div className="hidden md:flex items-center gap-14">

      {[
        {
          label: "How It Works",
          id:    "how-it-works",
          route: null,
        },
        {
          label: "Leaderboard",
          id:    null,
          route: "/leaderboard",
        }
      ].map((item, i) => (

        <button
          key={item.label}
          onClick={() => {
            if (item.route) {
              navigate(item.route)
            } else if (item.id) {
              document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
            }
          }}
          className={`text-[16px] font-medium tracking-wide transition-all duration-300 ${
            i === 0
              ? "text-white"
              : "text-white/65 hover:text-white"
          }`}
        >

          {item.label}

        </button>

      ))}

    </div>

    {/* RIGHT */}
    <div className="flex items-center gap-4">

      {/* USER */}
      <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03]">

        <span className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse" />

        <span className="text-sm text-white/90">
          {currentUser?.username}
        </span>

        <span className="text-sm font-semibold text-[#00FF85]">
          {currentUser?.rating}
        </span>

      </div>

      {/* MODES BUTTON */}
      <button
        onClick={() =>
          document
            .getElementById('battle-modes')
            ?.scrollIntoView({
              behavior: 'smooth'
            })
        }
        className="h-12 px-7 rounded-full bg-[#FF7A00] hover:bg-[#ff8800] text-white text-[15px] font-semibold transition-all duration-300 hover:scale-[1.03]"
      >

        Modes

      </button>

      {/* LOGOUT BUTTON */}
      <button
        onClick={handleLogout}
        className="h-12 px-5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-red-500/10 hover:border-red-500/30 text-white/60 hover:text-[#FF5A5A] text-[14px] font-medium transition-all duration-300"
        title="Logout"
      >
        Logout
      </button>

    </div>

  </div>

</nav>

      {/* ════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════ */}
      <section  id="home" className="dot-grid relative px-6 pt-36 pb-20 text-center overflow-hidden">
        {/* green glow blob */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse,rgba(0,255,133,0.07)_0%,transparent_70%)] pointer-events-none" />

        {/* status badges */}
        <div className="flex gap-3 justify-center mb-12 flex-wrap">
          <span className="flex items-center gap-2 bg-white/[0.03] border border-[#2A2A2A] rounded-full px-4 py-2 font-mono-display text-[11px] text-[#888]">
            <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#ead24a] shrink-0" />
            {battlesLiveNow} battles live now
          </span>
          <span className="flex items-center gap-2 bg-white/[0.03] border border-[#2A2A2A] rounded-full px-4 py-2 font-mono-display text-[11px] text-[#888]">
            <span className="text-[#dbf362]">⚡</span>
            Avg match: 8 mins
          </span>
        </div>

        {/* headline */}
        <h1 className="font-mono-display font-bold text-[#E8E8E8] leading-[1.05] tracking-tight mb-5"
          style={{ fontSize: 'clamp(42px, 7vw, 94px)' }}>
          Code.&nbsp;&nbsp;Compete.<br />
          <span className="text-[#00FF85]">Dominate.</span>
        </h1>
        <p className="text-[#555] text-[15px] tracking-wide mb-10">
          Real-time 1v1 coding battles. Ranked. Live. Brutal.
        </p>

        {/* ── CTAs / searching / room states ── */}
        {!isSearching && !roomId && !pendingMatch && (
          <div className="flex gap-4 justify-center flex-wrap mb-2">
            <button
              className="glow-btn bg-[#00FF85] text-black font-mono-display font-bold text-xs tracking-widest px-9 py-4 rounded-md hover:brightness-110 transition-all"
              onClick={() => { setMode("random"); setShowModal(true) }}
            >
              Play with Random
            </button>
            <button
              className="bg-transparent text-[#E8E8E8] border border-[#2A2A2A] font-mono-display font-bold text-xs tracking-widest px-9 py-4 rounded-md hover:border-[#444] hover:bg-white/[0.03] transition-all"
              onClick={() => { setMode("friend"); setShowModal(true) }}
            >
              ▷&nbsp;&nbsp;Challenge Friend
            </button>
          </div>
        )}

        {/* Issue 3 — full-screen overlay so home page is blocked while searching.
            Hidden when pendingMatch is set so the accept popup can show on top. */}
        {isSearching && !pendingMatch && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center z-[200] gap-8">
            {/* Animated radar rings */}
            <div className="relative flex items-center justify-center">
              <span className="absolute w-32 h-32 rounded-full border border-[#00FF85]/10 animate-ping" style={{ animationDuration:"2s" }} />
              <span className="absolute w-20 h-20 rounded-full border border-[#00FF85]/20 animate-ping" style={{ animationDuration:"1.5s" }} />
              <span className="w-12 h-12 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/40 flex items-center justify-center">
                <span className="w-4 h-4 rounded-full bg-[#00FF85] animate-pulse" />
              </span>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="search-dot w-2 h-2 rounded-full bg-[#00FF85] inline-block" />
                <span className="font-mono-display text-[13px] text-[#00FF85] tracking-[4px]">SEARCHING FOR OPPONENT</span>
              </div>
              <p className="font-mono-display text-[11px] text-[#555] tracking-wider mt-1">
                {topic} · {difficulty}
              </p>
            </div>

            {/* Countdown bar */}
            <div className="w-64">
              <div className="flex justify-between font-mono-display text-[10px] text-[#555] mb-2 tracking-wider">
                <span>AUTO-CANCEL IN</span>
                <span className={searchSecondsLeft <= 10 ? "text-[#FF4444]" : "text-[#888]"}>{searchSecondsLeft}s</span>
              </div>
              <div className="w-full h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${(searchSecondsLeft / 30) * 100}%`,
                    background: searchSecondsLeft <= 10 ? "#FF4444" : "#00FF85",
                  }}
                />
              </div>
            </div>

            <MatchmakingRouteDiscovery />

            <button
              className="bg-[#161616] text-[#E8E8E8] border border-[#2A2A2A] font-mono-display font-bold text-xs tracking-widest px-8 py-3 rounded-md hover:border-[#444] transition-all"
              onClick={cancelSearch}
            >
              Cancel Search
            </button>
          </div>
        )}

        {roomId && (
          <div className="inline-block bg-[#111] border border-[#2A2A2A] rounded-lg px-10 py-5 mt-4 text-center">
            <p className="font-mono-display text-[10px] tracking-[3px] text-[#555] mb-3">SHARE ROOM ID</p>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono-display text-xl text-[#00FF85] tracking-[6px]">{roomId}</span>
              <button
                className={`font-mono-display text-[11px] px-3 py-1 rounded transition-all border ${
                  roomCopied
                    ? "bg-[#00FF85]/10 text-[#00FF85] border-[#00FF85]/40"
                    : "bg-[#161616] text-[#888] border-[#2A2A2A] hover:border-[#444]"
                }`}
                onClick={() => {
                  navigator.clipboard.writeText(roomId)
                  setRoomCopied(true)
                  setTimeout(() => setRoomCopied(false), 2000)
                }}
              >
                {roomCopied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
            <p className="font-mono-display text-[10px] text-[#444] mt-3 tracking-wider">Waiting for opponent to join...</p>
          </div>
        )}

        {/* join room input */}
        {!isSearching && !roomId && !pendingMatch && (
          <div className="flex gap-3 justify-center mt-5">
            <input
              className="bg-[#0A0A0A] border border-[#2A2A2A] text-[#E8E8E8] font-mono-display text-sm px-4 py-2.5 rounded-md outline-none focus:border-[#00FF85]/50 transition-colors w-44 placeholder:text-[#444]"
              placeholder="Enter Room ID"
              value={friendRoomId}
              onChange={(e) => setFriendRoomId(e.target.value)}
            />
            <button
              className={`font-mono-display font-bold text-xs tracking-widest px-5 py-2.5 rounded-md transition-all ${
                friendRoomId
                  ? 'bg-[#161616] text-[#E8E8E8] border border-[#2A2A2A] hover:border-[#444]'
                  : 'bg-[#111] text-[#333] border border-[#1A1A1A] cursor-not-allowed'
              }`}
              onClick={joinRoom}
              disabled={!friendRoomId}
            >
              Join Room
            </button>
          </div>
        )}

        {/* ── terminal preview card ── */}
        <div className="max-w-3xl mx-auto mt-16 bg-[#111] border border-[#2A2A2A] rounded-xl overflow-hidden text-left shadow-2xl">

  {/* macOS bar */}
  <div className="bg-[#161616] border-b border-[#1E1E1E] px-4 py-3 flex items-center gap-2">

    <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
    <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
    <span className="w-3 h-3 rounded-full bg-[#28C840]" />

    <span className="flex-1 text-center font-mono-display text-[11px] text-[#444]">

      Problem: Two Sum &nbsp;&nbsp;

      <span className="bg-red-500/20 text-[#FF3355] border border-red-500/30 px-2 py-0.5 rounded text-[11px]">
        ● {minutes}:{seconds}
      </span>

    </span>

    <span className="font-mono-display text-[11px] text-[#444]">
      Difficulty: Medium
    </span>

  </div>

  {/* two panes */}
  <div className="grid grid-cols-2">

    {/* YOU */}
    <div className="p-4 border-r border-[#1E1E1E]">

      <div className="flex items-center gap-2 mb-4">

        <span className="w-6 h-6 rounded-full bg-[#00FF85] flex items-center justify-center text-black font-bold text-[10px]">
          Y
        </span>

        <span className="font-mono-display text-[11px] text-[#666]">
          You (Python)
        </span>

      </div>

      {typedUserCode.split('\n').map((line, i) => (

  <div key={i} className="flex gap-4 mb-0.5">

    <span className="font-mono-display text-[11px] text-[#333] w-4 text-right shrink-0">
      {i + 1}
    </span>

    <span className="font-mono-display text-[11px] text-[#C8C8C8] whitespace-pre">

      {line}

      {i === typedUserCode.split('\n').length - 1 && (
        <span className="typing-cursor text-[#00FF85]">
          |
        </span>
      )}

    </span>

  </div>

))}

    </div>
{/* OPPONENT */}
<div className="p-4">

  <div className="flex items-center gap-2 mb-4">

    <span className="w-6 h-6 rounded-full bg-[#FF3355] flex items-center justify-center text-white font-bold text-[10px]">
      O
    </span>

    <span className="font-mono-display text-[11px] text-[#666]">
      ninja_coder (C++)
    </span>

  </div>

  {typedOpponentCode.split('\n').map((line, i) => (

  <div key={i} className="flex gap-4 mb-0.5">

    <span className="font-mono-display text-[11px] text-[#333] w-4 text-right shrink-0">
      {i + 1}
    </span>

    <span className="font-mono-display text-[11px] text-[#8A8A8A] whitespace-pre">

      {line}

      {i === typedOpponentCode.split('\n').length - 1 && (
        <span className="typing-cursor text-[#FF3355]">
          |
        </span>
      )}

    </span>

  </div>

))}

</div>

  </div>

</div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          STATS BAR
      ════════════════════════════════════════════════════════════ */}
      {/* PLATFORM STATS */}
<div className="border-y border-[#1A1A1A] bg-[#0D0D0D]">

  {/* backend values */}
  {/*
    const totalMatches      = "1.2M+"
    const totalLanguages    = 3
    const matchmakingSpeed  = "120ms"
    const judgeUptime       = "99.9%"
    const playersOnline     = "2,431"
  */}

  {error && (
    <div className="text-center py-2 font-mono-display text-[11px] text-[#FF4444] tracking-wider bg-red-500/5 border-b border-red-500/10">
      Stats unavailable — {error}
    </div>
  )}
  <div className="max-w-5xl mx-auto grid grid-cols-5 divide-x divide-[#1A1A1A] py-10 px-6">
    {[
      [playersOnline, 'Players Online'],
      [battlesPlayed, 'Battles Played'],
      [totalLanguages, 'Languages'],
      [matchmakingSpeed, 'Match Speed'],
      [judgeUptime, 'Judge Uptime']
    ].map(([val, label]) => (
      <div key={label} className="text-center px-4">
        <div className="font-mono-display text-[34px] font-bold text-[#00FF85] tracking-tight">
          {val}
        </div>
        <div className="text-[#555] text-xs mt-1 uppercase tracking-[1px]">
          {label}
        </div>
      </div>
    ))}
  </div>
</div>
      {/* ═════════════════════════════════════════════════════
                    HOW IT WORKS
        ═════════════════════════════════════════════════════ */}

<section id="how-it-works" className="relative px-6 py-32 border-t border-[#151515] overflow-hidden">

  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,133,0.05),transparent_45%)] pointer-events-none" />

  <div className="max-w-6xl mx-auto relative z-10">

    {/* HEADING */}
    <div className="text-center mb-24">

      <h2
        className="font-claude text-white font-bold tracking-[-3px] leading-none"
        style={{ fontSize: 'clamp(42px,7vw,78px)' }}
      >
        How It Works
      </h2>

      <p className="text-white/40 text-[16px] mt-5 max-w-2xl mx-auto leading-relaxed">
        Real-time coding battles where strategy matters as much as speed.
      </p>

    </div>

    {/* STEPS */}
    <div className="space-y-8">

      {/* STEP 1 */}
      <div className="bg-[#0F0F10]/80 border border-white/10 rounded-[32px] p-8 md:p-12 backdrop-blur-xl">

        <div className="grid md:grid-cols-2 gap-14 items-center">

          {/* LEFT */}
          <div>

            <div className="flex items-center gap-5 mb-8">

              <div className="w-12 h-12 rounded-2xl bg-[#00FF85] text-black flex items-center justify-center font-bold text-lg">
                1
              </div>

              <div>

                <div className="text-[#00FF85] text-xs tracking-[2px] uppercase mb-1">
                  Matchmaking
                </div>

                <h3 className="font-claude text-white text-[34px] font-bold tracking-[-1.5px]">
                  Pick Your Battle
                </h3>

              </div>

            </div>

            <div className="space-y-5 text-[15px] text-white/70 leading-relaxed">

              <div className="flex items-start gap-3">
                <span className="text-[#00FF85] mt-1">◎</span>
                <span>
                  Choose topic — Arrays, Graphs, DP, Trees, HashMaps
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#00FF85] mt-1">◎</span>
                <span>
                  Select difficulty — Easy, Medium, or Hard
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#00FF85] mt-1">◎</span>
                <span>
                  Find a live opponent matched by rating in seconds
                </span>
              </div>

            </div>

            <p className="mt-10 text-[#00FF85] text-sm font-medium tracking-wide">
              No waiting. No setup. Just code.
            </p>

          </div>

          {/* RIGHT */}
          <div className="bg-black/40 border border-white/10 rounded-[28px] p-8">

            <div className="flex items-center justify-between">

              {/* USER */}
              <div className="flex flex-col items-center">

                <div className="w-16 h-16 rounded-2xl bg-[#00FF85]/10 border border-[#00FF85]/20 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-[#00FF85]" />
                </div>

                <span className="text-white/50 text-xs mt-3 tracking-wide">
                  YOU
                </span>

              </div>

              {/* LINE */}
              <div className="flex-1 mx-5 h-[2px] bg-white/10 rounded-full overflow-hidden">

                <div className="h-full w-1/3 bg-gradient-to-r from-[#00FF85] to-[#FF7A00] animate-pulse rounded-full" />

              </div>

              {/* OPPONENT */}
              <div className="flex flex-col items-center">

                <div className="w-16 h-16 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-[#FF7A00]" />
                </div>

                <span className="text-white/50 text-xs mt-3 tracking-wide">
                  OPPONENT
                </span>

              </div>

            </div>

            <div className="mt-12 bg-[#00FF85]/10 border border-[#00FF85]/20 rounded-2xl px-5 py-4 flex items-center justify-between">

              <div>

                <div className="text-[#00FF85] text-sm font-semibold">
                  Match Found
                </div>

                <div className="text-white/40 text-xs mt-1">
                  Rating difference: 21
                </div>

              </div>

              <div className="font-mono-display text-[#00FF85] text-lg">
                0.8s
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* STEP 2 */}
      <div className="bg-[#0F0F10]/80 border border-white/10 rounded-[32px] p-8 md:p-12 backdrop-blur-xl">

        <div className="grid md:grid-cols-2 gap-14 items-center">

          {/* LEFT */}
          <div>

            <div className="flex items-center gap-5 mb-8">

              <div className="w-12 h-12 rounded-2xl bg-[#00FF85] text-black flex items-center justify-center font-bold text-lg">
                2
              </div>

              <div>

                <div className="text-[#00FF85] text-xs tracking-[2px] uppercase mb-1">
                  Real-Time Coding
                </div>

                <h3 className="font-claude text-white text-[34px] font-bold tracking-[-1.5px]">
                  Code Live
                </h3>

              </div>

            </div>

            <div className="space-y-5 text-[15px] text-white/70 leading-relaxed">

              <div className="flex items-start gap-3">
                <span className="text-[#00FF85] mt-1">◎</span>
                <span>
                  Your real code stays fully visible to you
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#00FF85] mt-1">◎</span>
                <span>
                  Opponents only see a live silhouette of your logic
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#00FF85] mt-1">◎</span>
                <span>
                  Adapt to strategies while racing against the clock
                </span>
              </div>

            </div>

            <p className="mt-10 text-[#00FF85] text-sm font-medium tracking-wide">
              Feel the pressure. Stay focused.
            </p>

          </div>

          {/* RIGHT */}
          <div className="bg-black/40 border border-white/10 rounded-[28px] overflow-hidden">

            {/* TOP BAR */}
            <div className="border-b border-white/10 px-5 py-4 flex items-center gap-2">

              <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <span className="w-3 h-3 rounded-full bg-[#28C840]" />

              <span className="ml-auto text-[11px] text-white/35 font-mono-display tracking-wide">
                YOUR VIEW
              </span>

            </div>

            <div className="grid grid-cols-2">

              {/* YOUR CODE */}
              <div className="p-5 border-r border-white/10">

                <div className="flex items-center justify-between mb-5">

                  <div className="text-[#00FF85] text-xs tracking-wide">
                    YOUR CODE • PYTHON
                  </div>

                  <div className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse" />

                </div>

                <div className="space-y-1 font-mono-display text-[11px] text-[#D6D6D6]">

                  <div>def two_sum(nums, target):</div>
                  <div>    seen = {}</div>
                  <div>    for i in range(len(nums)):</div>
                  <div>        comp = target - nums[i]</div>
                  <div>        if comp in seen:</div>
                  <div className="text-[#00FF85]">█</div>

                </div>

              </div>

              {/* OPPONENT VIEW */}
              <div className="p-5">

                <div className="flex items-center justify-between mb-5">

                  <div className="text-[#FF7A00] text-xs tracking-wide">
                    OPPONENT VIEW
                  </div>

                  <div className="w-2 h-2 rounded-full bg-[#FF7A00] animate-pulse" />

                </div>

                <div className="space-y-1 font-mono-display text-[11px] text-[#7A7A7A]">

                  <div>def ▓▓▓▓▓▓(▓▓▓▓, ▓▓▓▓▓▓):</div>
                  <div>    ▓▓▓▓ = {'{}'}</div>
                  <div>    for ▓ in ▓▓▓▓▓▓▓▓(▓▓▓▓):</div>
                  <div>        ▓▓▓▓ = ▓▓▓▓ - ▓▓▓▓[▓]</div>
                  <div>        if ▓▓▓▓▓▓▓▓▓▓▓ in ▓▓▓▓:</div>

                  <div className="text-[#FF7A00]">
                    █
                  </div>

                </div>

              </div>

            </div>

            <div className="border-t border-white/10 px-5 py-4 text-center text-[12px] text-white/40">
              Your logic stays visible. Your implementation stays hidden.
            </div>

          </div>

        </div>

      </div>

      {/* STEP 3 */}
      <div className="bg-[#0F0F10]/80 border border-white/10 rounded-[32px] p-8 md:p-12 backdrop-blur-xl">

        <div className="grid md:grid-cols-2 gap-14 items-center">

          {/* LEFT */}
          <div>

            <div className="flex items-center gap-5 mb-8">

              <div className="w-12 h-12 rounded-2xl bg-[#00FF85] text-black flex items-center justify-center font-bold text-lg">
                3
              </div>

              <div>

                <div className="text-[#00FF85] text-xs tracking-[2px] uppercase mb-1">
                  AI Judge
                </div>

                <h3 className="font-claude text-white text-[34px] font-bold tracking-[-1.5px]">
                  AI Decides the Winner
                </h3>

              </div>

            </div>

            <div className="space-y-5 text-[15px] text-white/70 leading-relaxed">

              <div className="flex items-start gap-3">
                <span className="text-[#00FF85] mt-1">✓</span>
                <span>
                  Evaluates test cases, runtime, and memory usage
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#00FF85] mt-1">✓</span>
                <span>
                  Considers efficiency, submissions, and completion speed
                </span>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#00FF85] mt-1">✓</span>
                <span>
                  Picks the strongest solution — not just the first solution
                </span>
              </div>

            </div>

            <p className="mt-10 text-[#00FF85] text-sm font-medium tracking-wide">
              Not just who solved it — who solved it better.
            </p>

          </div>

          {/* RIGHT */}
          <div className="bg-black/40 border border-white/10 rounded-[28px] p-7">

            <div className="flex items-center justify-between mb-8">

              <div>

                <div className="text-white font-semibold text-lg">
                  AI Match Review
                </div>

                <div className="text-white/40 text-xs mt-1">
                  Evaluation completed in 184ms
                </div>

              </div>

              <div className="px-5 py-2 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/20 text-[#00FF85] text-sm font-semibold">
                WINNER
              </div>

            </div>

            <div className="space-y-5">

              {[
                ['Test Cases', '24 / 24'],
                ['Runtime', '84ms'],
                ['Memory Usage', '41MB'],
                ['Efficiency', '98th percentile']
              ].map(([label, value]) => (

                <div key={label} className="flex items-center justify-between border-b border-white/5 pb-4">

                  <span className="text-white/45 text-sm">
                    {label}
                  </span>

                  <span className="text-white text-sm font-medium">
                    {value}
                  </span>

                </div>

              ))}

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</section>

      {/* ════════════════════════════════════════════════════════════
          BATTLE MODES
      ════════════════════════════════════════════════════════════ */}
      <section id="battle-modes" className="bg-[#0D0D0D] border-y border-[#1A1A1A] px-6 py-28 overflow-hidden">

  <div className="max-w-6xl mx-auto">

    {/* HEADING */}
    <div className="text-center mb-20">

      <h2
        className="font-claude text-white font-bold tracking-[-3px] leading-none"
        style={{ fontSize: 'clamp(42px,7vw,72px)' }}
      >
        Battle Modes
      </h2>

      <p className="text-white/40 text-[16px] mt-5 max-w-2xl mx-auto leading-relaxed">
        Choose your battlefield. Queue into ranked matchmaking or challenge friends directly.
      </p>

    </div>

    {/* MODES */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      {/* RANDOM MATCHMAKING */}
      <div className="bg-[#101010] border border-white/10 rounded-[32px] p-8 backdrop-blur-xl relative overflow-hidden">

        {/* glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00FF85]/5 blur-3xl rounded-full pointer-events-none" />

        {/* top */}
        <div className="flex items-start justify-between mb-8">

          <div>

            <div className="w-14 h-14 rounded-2xl bg-[#00FF85]/10 border border-[#00FF85]/20 flex items-center justify-center text-[#00FF85] text-2xl mb-5">
              ⚔
            </div>

            <h3 className="font-claude text-white text-[34px] font-bold tracking-[-1.5px]">
              Play With Random
            </h3>

          </div>

          <div className="px-4 py-2 rounded-full bg-[#00FF85]/10 border border-[#00FF85]/20 text-[#00FF85] text-xs tracking-[1px] uppercase">
            Most Popular
          </div>

        </div>

        {/* description */}
        <p className="text-white/65 text-[15px] leading-relaxed mb-10">
          Select a topic and difficulty, enter the matchmaking queue, and get paired instantly with a live opponent near your rating.
        </p>

        {/* flow */}
        <div className="space-y-5 mb-10">

          <div className="flex items-start gap-4">

            <div className="w-8 h-8 rounded-xl bg-[#00FF85]/10 border border-[#00FF85]/20 flex items-center justify-center text-[#00FF85] text-sm shrink-0">
              1
            </div>

            <div>

              <div className="text-white text-sm font-medium mb-1">
                Choose Difficulty & Topic
              </div>

              <div className="text-white/45 text-[13px] leading-relaxed">
                Pick Easy, Medium, or Hard and select concepts like Arrays, Graphs, DP, Trees, or HashMaps.
              </div>

            </div>

          </div>

          <div className="flex items-start gap-4">

            <div className="w-8 h-8 rounded-xl bg-[#00FF85]/10 border border-[#00FF85]/20 flex items-center justify-center text-[#00FF85] text-sm shrink-0">
              2
            </div>

            <div>

              <div className="text-white text-sm font-medium mb-1">
                Enter Matchmaking Queue
              </div>

              <div className="text-white/45 text-[13px] leading-relaxed">
                Players are matched only if both selected the same difficulty and topic.
              </div>

            </div>

          </div>

          <div className="flex items-start gap-4">

            <div className="w-8 h-8 rounded-xl bg-[#00FF85]/10 border border-[#00FF85]/20 flex items-center justify-center text-[#00FF85] text-sm shrink-0">
              3
            </div>

            <div>

              <div className="text-white text-sm font-medium mb-1">
                Balanced Rating Matchups
              </div>

              <div className="text-white/45 text-[13px] leading-relaxed">
                Opponents are searched within your rating range:
              </div>

              <div className="mt-3 font-mono-display text-[#00FF85] text-[13px] bg-[#00FF85]/5 border border-[#00FF85]/10 rounded-xl px-4 py-3 inline-block">
                rating - 100 → rating + 100
              </div>

            </div>

          </div>

        </div>

        {/* tags */}
        <div className="flex flex-wrap gap-2">

          {[
            'Arrays',
            'Graphs',
            'Dynamic Programming',
            'HashMaps',
            'Trees',
            'Greedy'
          ].map((tag) => (

            <span
              key={tag}
              className="border border-white/10 bg-white/[0.03] text-white/45 text-[11px] px-4 py-2 rounded-full"
            >
              {tag}
            </span>

          ))}

        </div>

      </div>

      {/* PLAY WITH FRIEND */}
      <div className="bg-[#101010] border border-white/10 rounded-[32px] p-8 backdrop-blur-xl relative overflow-hidden">

        {/* glow */}
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF7A00]/5 blur-3xl rounded-full pointer-events-none" />

        {/* top */}
        <div className="flex items-start justify-between mb-8">

          <div>

            <div className="w-14 h-14 rounded-2xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center text-[#FF7A00] text-2xl mb-5">
              👥
            </div>

            <h3 className="font-claude text-white text-[34px] font-bold tracking-[-1.5px]">
              Play With Friend
            </h3>

          </div>

          <div className="px-4 py-2 rounded-full bg-[#FF7A00]/10 border border-[#FF7A00]/20 text-[#FF7A00] text-xs tracking-[1px] uppercase">
            Private Match
          </div>

        </div>

        {/* description */}
        <p className="text-white/65 text-[15px] leading-relaxed mb-10">
          Create a private battle room, share the room code, and compete directly against friends in real-time.
        </p>

        {/* flow */}
        <div className="space-y-5 mb-10">

          <div className="flex items-start gap-4">

            <div className="w-8 h-8 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center text-[#FF7A00] text-sm shrink-0">
              1
            </div>

            <div>

              <div className="text-white text-sm font-medium mb-1">
                Create Battle Room
              </div>

              <div className="text-white/45 text-[13px] leading-relaxed">
                Host selects difficulty, topic, timer, and generates a unique room ID.
              </div>

            </div>

          </div>

          <div className="flex items-start gap-4">

            <div className="w-8 h-8 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center text-[#FF7A00] text-sm shrink-0">
              2
            </div>

            <div>

              <div className="text-white text-sm font-medium mb-1">
                Friend Joins Using Room ID
              </div>

              <div className="text-white/45 text-[13px] leading-relaxed">
                Share the generated room code and instantly join the same live battle.
              </div>

            </div>

          </div>

          <div className="flex items-start gap-4">

            <div className="w-8 h-8 rounded-xl bg-[#FF7A00]/10 border border-[#FF7A00]/20 flex items-center justify-center text-[#FF7A00] text-sm shrink-0">
              3
            </div>

            <div>

              <div className="text-white text-sm font-medium mb-1">
                Real-Time Head-to-Head Match
              </div>

              <div className="text-white/45 text-[13px] leading-relaxed">
                Solve the same problem simultaneously while tracking each other's live coding silhouette.
              </div>

            </div>

          </div>

        </div>

        {/* room preview */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5">

          <div className="flex items-center justify-between mb-4">

            <div>

              <div className="text-white text-sm font-medium">
                Private Room
              </div>

              <div className="text-white/40 text-xs mt-1">
                Invite your friend instantly
              </div>

            </div>

            <div className="w-2 h-2 rounded-full bg-[#00FF85] animate-pulse" />

          </div>

          <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-4 py-4">

            <div>

              <div className="text-white/40 text-[11px] mb-1">
                ROOM ID
              </div>

              <div className="font-mono-display text-[#FF7A00] tracking-[2px] text-lg">
                DX9K2P
              </div>

            </div>

            <button className="px-4 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#ff8d32] transition-all duration-300 text-black text-sm font-semibold">
              Copy
            </button>

          </div>

        </div>

      </div>

    </div>

  </div>

</section>

      {/* ════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#0D0D0D] border-t border-[#1A1A1A] px-6 pt-12 pb-7">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-10 mb-10">
            <div>
              <span className="font-mono-display font-bold text-sm tracking-widest">
                <span className="text-[#E8E8E8]">Dual</span><span className="text-[#00FF85]">Dev</span>
              </span>
              <p className="text-[#555] text-xs leading-relaxed mt-3 max-w-[200px]">
                The ultimate platform for competitive coders. Battle in real-time, climb the ranks, and prove your skills.
              </p>
              <div className="flex gap-2 mt-4">
                {['𝕏','⌥','in'].map(icon => (
                  <span key={icon} className="w-8 h-8 border border-[#2A2A2A] rounded-md flex items-center justify-center text-[#555] text-xs cursor-pointer hover:border-[#444] hover:text-[#888] transition-all">{icon}</span>
                ))}
              </div>
            </div>
            {[
              ['Product', ['Features','Pricing','Leaderboard','API']],
              ['Resources', ['Documentation','Blog','Problems','Discord']],
              ['Company', ['About','Careers','Contact','Press']],
              ['Legal', ['Privacy','Terms','Cookies']],
            ].map(([title, links]) => (
              <div key={title}>
                <h4 className="font-mono-display text-[#E8E8E8] text-[11px] tracking-widest mb-4">{title}</h4>
                {links.map(l => (
                  <div key={l} className="text-[#555] text-xs mb-2.5 cursor-pointer hover:text-[#888] transition-colors">{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-[#1A1A1A] pt-5 flex items-center justify-between">
            <span className="font-mono-display text-[11px] text-[#444]">© 2026 DualDev. All rights reserved.</span>
            <span className="font-mono-display text-[11px] text-[#444] flex items-center gap-2">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#00FF85] inline-block" />
              All systems operational
            </span>
          </div>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════════════════
          OVERLAYS
      ════════════════════════════════════════════════════════════ */}

      {/* Accept / Decline popup — z-[300] keeps it above the searching overlay */}
      {pendingMatch && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[300]">
          <div className="slide-up bg-[#111] border border-[#2A2A2A] rounded-2xl p-10 min-w-[340px] text-center">
            <h2 className="font-mono-display text-[#00FF85] text-lg font-bold mb-2">⚔️ Match Found!</h2>
            <p className="text-[#888] text-sm mb-1">
              vs <strong className="text-[#E8E8E8]">{pendingMatch.opponent?.username}</strong>
              <span className="text-[#00FF85] font-mono-display ml-2">{pendingMatch.opponent?.rating}</span>
            </p>
            <p className="text-[#F59E0B] font-mono-display text-xs tracking-wider mb-8">
              {pendingMatch.problem?.title} · {pendingMatch.problem?.difficulty}
            </p>
            
            {/*  Matching reason */}
            {pendingMatch.reason && (
              <div className="mb-6 bg-[#00FF85]/10 border border-[#00FF85]/20 rounded-xl px-4 py-3 text-[#00FF85] text-xs font-mono-display">
                {pendingMatch.reason}
              </div>
            )}

            {/* countdown ring */}
            <div className="relative w-20 h-20 mx-auto mb-8">
              <svg width="80" height="80" className="-rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1A1A1A" strokeWidth="4" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#00FF85" strokeWidth="4"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-mono-display text-xl font-bold text-[#E8E8E8]">
                {acceptCountdown}
              </span>
            </div>

            {waitingAccept ? (
              <div className="flex items-center justify-center gap-2 text-[#00FF85] font-mono-display text-xs tracking-wider">
                <span className="search-dot w-2 h-2 rounded-full bg-[#00FF85] inline-block" />
                Accepted — waiting for opponent...
              </div>
            ) : (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={acceptMatch}
                  className="bg-[#00FF85] text-black font-mono-display font-bold text-xs tracking-widest px-6 py-3 rounded-md hover:brightness-110 transition-all"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={declineMatch}
                  className="bg-red-500/10 text-[#FF3355] border border-red-500/30 font-mono-display font-bold text-xs tracking-widest px-6 py-3 rounded-md hover:bg-red-500/15 transition-all"
                >
                  ✗ Decline
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Match starting countdown */}
      {startCountdown !== null && startCountdown > 0 && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[200]">
          <div className="slide-up bg-[#111] border border-[#2A2A2A] rounded-2xl px-16 py-12 text-center">
            <div className="font-mono-display text-[72px] font-bold text-[#00FF85] leading-none mb-3">{startCountdown}</div>
            <p className="font-mono-display text-[#666] text-[11px] tracking-[4px]">MATCH STARTING</p>
          </div>
        </div>
      )}

      {/* Match config modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-[200]">
          <div className="slide-up bg-[#111] border border-[#2A2A2A] rounded-2xl p-10 min-w-[320px]">
            <h3 className="font-mono-display text-[#E8E8E8] text-sm tracking-[3px] mb-7">
              {mode === "random" ? "🎯 FIND MATCH" : "🔗 CHALLENGE FRIEND"}
            </h3>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="font-mono-display text-[10px] tracking-[2px] text-[#555]">TOPIC</label>
              <select
                className="bg-[#0A0A0A] border border-[#2A2A2A] text-[#E8E8E8] font-mono-display text-sm px-3 py-2.5 rounded-md outline-none focus:border-[#00FF85]/50 transition-colors"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="Array">Array</option>
                <option value="HashMap">HashMap</option>
                <option value="String">String</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 mb-8">
              <label className="font-mono-display text-[10px] tracking-[2px] text-[#555]">DIFFICULTY</label>
              <select
                className="bg-[#0A0A0A] border border-[#2A2A2A] text-[#E8E8E8] font-mono-display text-sm px-3 py-2.5 rounded-md outline-none focus:border-[#00FF85]/50 transition-colors"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={mode === "random" ? joinMatch : createRoom}
                className="bg-[#00FF85] text-black font-mono-display font-bold text-xs tracking-widest px-6 py-3 rounded-md hover:brightness-110 transition-all"
              >
                {mode === "random" ? "Find Match" : "Create Room"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="bg-[#161616] text-[#E8E8E8] border border-[#2A2A2A] font-mono-display font-bold text-xs tracking-widest px-6 py-3 rounded-md hover:border-[#444] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}