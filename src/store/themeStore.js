import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* Sitewide theme store — single source of truth for dark/light mode.
   Uses the SAME localStorage key ('dualdev-theme') the auth screens used
   to read/write directly, so existing users keep their preference, but
   now everything (auth screens included) goes through this one store. */
const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', // 'dark' | 'light' — default dark per brand

      setTheme: (theme) => {
        set({ theme })
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme)
        }
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        get().setTheme(next)
      },
    }),
    {
      name: 'dualdev-theme-store',
      // Keep back-compat: also mirror the plain string into the legacy key
      // some code/users may still read, without requiring old code to change.
      onRehydrateStorage: () => (state) => {
        if (typeof window === 'undefined' || !state) return
        try {
          const legacy = localStorage.getItem('dualdev-theme')
          if (legacy && legacy !== state.theme) {
            state.setTheme(legacy)
          } else {
            document.documentElement.setAttribute('data-theme', state.theme)
          }
        } catch {
          document.documentElement.setAttribute('data-theme', state.theme)
        }
      },
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)

// Keep legacy localStorage key in sync for any code that still reads it directly.
useThemeStore.subscribe((state) => {
  try {
    localStorage.setItem('dualdev-theme', state.theme)
  } catch {
    // localStorage unavailable (e.g. private browsing) — safe to ignore.
  }
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', state.theme)
  }
})

export default useThemeStore
