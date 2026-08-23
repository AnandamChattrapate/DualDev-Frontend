import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL

const DEFAULT_STARTER = {
  python: '# Write your solution here\n',
  cpp:    '#include<bits/stdc++.h>\nusing namespace std;\nint main(){\n    \n    return 0;\n}',
  java:   'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}',
}

// TEMP: matches backend's temporarily shortened MATCH_DURATION_SECONDS —
// revert both together once testing is done.
const MATCH_DURATION = {
  Easy:   120, // was 900
  Medium: 180, // was 1500
  Hard:   300, // was 2400
}

const useMatchStore = create(
  persist(
    (set, get) => ({

      currentUser:     null,
      isAuthenticated: false,
      authLoading:     false,
      authError:       null,

      isSearching: false,

      matchId:        null,
      matchStatus:    null,
      winner:         null,
      timeLeft:       900,
      myRatingBefore: null, // rating snapshot taken at match start, used to show the diff on result page
      myRatingAfter:  null, // authoritative post-match rating from the backend's match_result payload
      matchEndTime:   null, // set when match_result arrives, used for time-taken display

      // Snapshotted once when match_result data lands (applyFinalResult), decoupled
      // from the live myLanguage/codeByLanguage below — a subsequent match's
      // initMatch() resets those for the NEW match, which would otherwise silently
      // clobber what the result page is still displaying for the PREVIOUS match.
      finalMyCode:     null,
      finalMyLanguage: null,
      // Opponent's username straight from the backend's match-end lookup —
      // some join paths (e.g. friend-room matches) can populate the live
      // `opponent` object below incompletely; this is always reliable once
      // match_result data lands.
      finalOppUsername: null,

      problem: null,

      myLanguage: 'python',
      codeByLanguage: {
        python: DEFAULT_STARTER.python,
        cpp:    DEFAULT_STARTER.cpp,
        java:   DEFAULT_STARTER.java,
      },

      myTCResults:     [],
      myVerdict:       null,
      myTestsPassed:   0,
      myTotalTests:    0,
      isSubmitting:    false,
      submissionCount: 0,
      aiUsageCount:    0,
      aiUsageLeft:     5,
      matchStartTime:  null,

      opponent:       null,
      oppSilhouette:  '',
      oppTestsPassed: 0,
      oppTotalTests:  0,
      oppVerdict:     null,
      oppLanguage:    null,
      // Opponent's live presence: state = 'coding'|'reading'|'thinking'|'offline'|'unknown'
      // section = which part of the problem they're reading; online = socket connected
      oppPresence: {
        state:     'unknown',
        section:   null,
        lastEvent: 0,
        online:    false,
      },

      // Tracks OUR own connection — drives the "reconnecting" badge
      myConnection: 'connected', // 'connected' | 'reconnecting' | 'offline'

      activeHints:   [],
      firstBlood:    false,
      firstBloodBy:  null,

      aiReview: null,

      login: async (userCred) => {
        try {
          set({ authLoading: true, authError: null })
          const res = await axios.post(`${BASE_URL}/api/auth/login`, userCred, { withCredentials: true })
          set({ authLoading: false, isAuthenticated: true, currentUser: res.data.payload, authError: null })
          return res.data
        } catch (err) {
          set({ authLoading: false, isAuthenticated: false, currentUser: null, authError: err.response?.data?.message || "Login Failed" })
          throw err
        }
      },

      logout: () => set({ currentUser: null, isAuthenticated: false, authLoading: false, authError: null }),

      checkAuth: async () => {
        try {
          set({ authLoading: true })
          const res = await axios.get(`${BASE_URL}/api/auth/me`, { withCredentials: true })
          set({ authLoading: false, isAuthenticated: true, currentUser: res.data.payload, authError: null })
          return res.data
        } catch (err) {
          set({ authLoading: false, isAuthenticated: false, currentUser: null })
          return null
        }
      },

      // Checks with the server whether this user is mid-match. Used on page load to auto-rejoin.
      fetchActiveMatch: async () => {
        try {
          const res = await axios.get(`${BASE_URL}/api/match/active/me`, { withCredentials: true })
          return res.data
        } catch {
          return { active: false }
        }
      },

      setSearching: (val) => set({ isSearching: val }),

      initMatch: ({ matchId, opponent, problem }) => {
        const timeLeft = MATCH_DURATION[problem?.difficulty] || 900
        set((state) => ({
          matchId,
          matchStatus:     'ongoing',
          opponent,
          problem,
          timeLeft,
          winner:          null,
          myRatingBefore:  state.currentUser?.rating ?? null, // snapshot for result page diff
          matchEndTime:    null,
          myLanguage:      'python',
          codeByLanguage: {
            python: problem?.starterCode?.python || DEFAULT_STARTER.python,
            cpp:    problem?.starterCode?.cpp    || DEFAULT_STARTER.cpp,
            java:   problem?.starterCode?.java   || DEFAULT_STARTER.java,
          },
          myTCResults:     [],
          myVerdict:       null,
          myTestsPassed:   0,
          myTotalTests:    0,
          isSubmitting:    false,
          submissionCount: 0,
          aiUsageCount:    0,
          aiUsageLeft:     5,
          matchStartTime:  Date.now(),
          oppSilhouette:   '',
          oppTestsPassed:  0,
          oppTotalTests:   problem?.hiddenTestCases?.length || 0,
          oppVerdict:      null,
          oppPresence:     { state: 'unknown', section: null, lastEvent: 0, online: false },
          firstBlood:      false,
          firstBloodBy:    null,
          activeHints:     [],
          isSearching:     false,
          aiReview:        null,
        }))

        // currentUser.rating can be stale here — e.g. right after a fast
        // back-to-back rematch, before the previous match's result page
        // ever ran its own checkAuth() refresh. Refresh it now so the
        // eventual before/after diff on the result page reflects the
        // server's true rating, not a stale client cache. This resolves
        // well before any match can actually end (minimum match length
        // is well over a minute), so it never delays match start itself.
        get().checkAuth().then(() => {
          set({ myRatingBefore: get().currentUser?.rating ?? null })
        })
      },

      setTimeLeftFromServer: (timeLeft) => set({ timeLeft }),

      setMatchEndTime: (t) => set({ matchEndTime: t }),

      setMatchStatus: (status) => set({ matchStatus: status }),

      setWinner: (userId) => set({ winner: userId, matchStatus: 'finished' }),

      tickTimer: () => set((state) => ({ timeLeft: Math.max(0, state.timeLeft - 1) })),

      setMyCode: (code) => {
        const lang = get().myLanguage
        set((state) => ({ codeByLanguage: { ...state.codeByLanguage, [lang]: code } }))
      },

      setMyLanguage: (lang) => set({ myLanguage: lang }),

      setSubmitting: (val) => set({ isSubmitting: val }),

      incrementSubmission: () => set((state) => ({ submissionCount: state.submissionCount + 1 })),

      incrementAIUsage: () => {
        const { aiUsageLeft } = get()
        if (aiUsageLeft <= 0) return false
        set((state) => ({
          aiUsageCount: state.aiUsageCount + 1,
          aiUsageLeft:  state.aiUsageLeft - 1,
        }))
        return true
      },

      setMyVerdict: ({ verdict, results, testsPassed, totalTests }) => {
        const { firstBlood, myTestsPassed } = get()
        if (!firstBlood && testsPassed > 0) set({ firstBlood: true, firstBloodBy: 'me' })
        // Keep the best submission, not the latest — a worse resubmit
        // shouldn't erase an already-passing score.
        const best = Math.max(myTestsPassed || 0, testsPassed)
        set({ myVerdict: verdict, myTCResults: results, myTestsPassed: best, myTotalTests: totalTests || results?.length || 0, isSubmitting: false })
      },

      setOppSilhouette: (silhouette) => set({ oppSilhouette: silhouette }),

      setOppPresence: ({ state, section }) => set((s) => ({
        oppPresence: {
          state:     state || s.oppPresence.state,
          section:   section ?? null,
          lastEvent: Date.now(),
          online:    true,
        }
      })),

      // Called when we get opponent_offline from the server (after the 3s grace period)
      setOppOffline: () => set((s) => ({
        oppPresence: { ...s.oppPresence, state: 'offline', online: false, lastEvent: Date.now() }
      })),

      setOppOnline: () => set((s) => ({
        oppPresence: { ...s.oppPresence, online: true, state: s.oppPresence.state === 'offline' ? 'thinking' : s.oppPresence.state, lastEvent: Date.now() }
      })),

      setMyConnection: (status) => set({ myConnection: status }),

      setOppProgress: ({ testsPassed, totalTests }) => {
        const { firstBlood, oppTestsPassed } = get()
        if (!firstBlood && testsPassed > 0) set({ firstBlood: true, firstBloodBy: 'opponent' })
        set({ oppTestsPassed: Math.max(oppTestsPassed || 0, testsPassed), oppTotalTests: totalTests })
      },

      setOppVerdict: ({ verdict, testsPassed }) => set((s) => ({
        oppVerdict: verdict, oppTestsPassed: Math.max(s.oppTestsPassed || 0, testsPassed),
      })),

      // Authoritative final stats from the server's match_result event — overrides
      // whatever was pieced together from live socket events, which may have been
      // missed on reload or late join. Also the single source of truth for the
      // rating diff (server's ratingBefore/ratingAfter beat any client snapshot)
      // and for a code/language snapshot that can't be clobbered by a later match.
      applyFinalResult: ({ mine, opp }) => set((state) => ({
        myTestsPassed:   mine?.testsPassed  ?? state.myTestsPassed,
        myTotalTests:    mine?.totalTests   ?? state.myTotalTests,
        oppTestsPassed:  opp?.testsPassed   ?? state.oppTestsPassed,
        oppTotalTests:   opp?.totalTests    ?? state.oppTotalTests,
        oppLanguage:     opp?.language      ?? state.oppLanguage,
        finalOppUsername: opp?.username     ?? state.finalOppUsername,
        finalMyCode:     mine?.code         ?? state.codeByLanguage[state.myLanguage] ?? null,
        finalMyLanguage: mine?.language     ?? state.myLanguage ?? null,
        myRatingBefore:  mine?.ratingBefore ?? state.myRatingBefore,
        myRatingAfter:   mine?.ratingAfter  ?? state.myRatingAfter,
      })),

      setAIReview: (review) => set({ aiReview: review }),

      revealHint: (index) => set((state) => ({ activeHints: [...state.activeHints, index] })),

      // Clears all match state and wipes localStorage, preserving auth
      resetMatch: () => {
        set({
          matchId:         null,
          matchStatus:     null,
          winner:          null,
          timeLeft:        900,
          myRatingBefore:  null,
          myRatingAfter:   null,
          finalMyCode:      null,
          finalMyLanguage:  null,
          finalOppUsername: null,
          matchEndTime:    null,
          problem:         null,
          myLanguage:      'python',
          codeByLanguage: {
            python: DEFAULT_STARTER.python,
            cpp:    DEFAULT_STARTER.cpp,
            java:   DEFAULT_STARTER.java,
          },
          myTCResults:     [],
          myVerdict:       null,
          myTestsPassed:   0,
          myTotalTests:    0,
          isSubmitting:    false,
          submissionCount: 0,
          aiUsageCount:    0,
          aiUsageLeft:     5,
          matchStartTime:  null,
          opponent:        null,
          oppSilhouette:   '',
          oppTestsPassed:  0,
          oppTotalTests:   0,
          oppVerdict:      null,
          firstBlood:      false,
          firstBloodBy:    null,
          activeHints:     [],
          isSearching:     false,
          aiReview:        null,
        })

        const { currentUser, isAuthenticated } = get()
        useMatchStore.persist.clearStorage()
        // Re-persist only auth so the user stays logged in
        set({ currentUser, isAuthenticated })
      },

    }),

    {
      name: 'codejudge-storage',
      partialize: (state) => ({
        currentUser:     state.currentUser,
        isAuthenticated: state.isAuthenticated,
        matchId:         state.matchId,
        matchStatus:     state.matchStatus,
        timeLeft:        state.timeLeft,
        winner:          state.winner,
        problem:         state.problem,
        myLanguage:      state.myLanguage,
        codeByLanguage:  state.codeByLanguage,
        opponent:        state.opponent,
        myVerdict:       state.myVerdict,
        myTestsPassed:   state.myTestsPassed,
        myTotalTests:    state.myTotalTests,
        myTCResults:     state.myTCResults,
        oppVerdict:      state.oppVerdict,
        oppTestsPassed:  state.oppTestsPassed,
        oppTotalTests:   state.oppTotalTests,
        oppLanguage:     state.oppLanguage,
        aiUsageLeft:     state.aiUsageLeft,
        matchStartTime:  state.matchStartTime,
        myRatingBefore:  state.myRatingBefore,
        myRatingAfter:   state.myRatingAfter,
        finalMyCode:      state.finalMyCode,
        finalMyLanguage:  state.finalMyLanguage,
        finalOppUsername: state.finalOppUsername,
        matchEndTime:    state.matchEndTime,
      }),
    }
  )
)

export default useMatchStore