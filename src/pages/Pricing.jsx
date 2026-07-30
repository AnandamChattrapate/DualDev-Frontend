import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, X, Sun, Moon } from 'lucide-react'
import useMatchStore from '../store/matchStore.js'
import useThemeStore from '../store/themeStore.js'

const TIERS = [
  {
    name: 'Free',
    tagline: 'Get a taste of competitive coding.',
    monthly: 0,
    annual: 0,
    cta: 'Get Started Free',
    to: '/',
    features: [
      ['2 matches / day', true],
      ['Easy difficulty only', true],
      ['2 topics — Array, String', true],
      ['5 AI review uses / day', true],
      ['Community leaderboard access', true],
      ['Unlimited matches', false],
      ['All difficulties & topics', false],
      ['Priority matchmaking', false],
      ['Match history & analytics', false],
    ],
  },
  {
    name: 'Pro',
    tagline: 'For players who want to climb the ranks.',
    monthly: 12,
    annual: 9,
    cta: 'Upgrade to Pro',
    to: '/login',
    featured: true,
    features: [
      ['Unlimited matches', true],
      ['All difficulties & topics', true],
      ['Unlimited AI reviews', true],
      ['Priority matchmaking', true],
      ['Faster judge queue', true],
      ['Match history & analytics', true],
      ['Community leaderboard access', true],
      ['Team leaderboards', false],
      ['Custom problem sets', false],
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'Run DualDev battles for your whole org.',
    monthly: null,
    annual: null,
    cta: 'Contact Sales',
    to: '/login',
    features: [
      ['Everything in Pro', true],
      ['Team leaderboards', true],
      ['Custom problem sets', true],
      ['Dedicated support', true],
      ['SSO & audit logs', true],
    ],
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const isAuthenticated = useMatchStore((s) => s.isAuthenticated)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const reducedMotion = useReducedMotion()
  const [annual, setAnnual] = useState(true)

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)] overflow-x-hidden font-mono">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .font-mono-display { font-family: 'Space Mono', monospace; }
      `}</style>

      {/* NAVBAR */}
      <nav className="fixed top-4 left-0 w-full z-50 px-5">
        <div className="max-w-[82rem] mx-auto h-[72px] px-10 flex items-center justify-between rounded-full border border-[var(--color-border)]/60 bg-[var(--color-surface)]/25 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer select-none">
            <h1 className="text-[32px] font-extrabold tracking-[-2px] leading-none">
              <span className="text-[var(--color-text-primary)]">DUAL</span><span className="text-[#F4B183]">DEV</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="cursor-pointer h-10 w-10 flex items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[#00FF85]"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => navigate(isAuthenticated ? '/' : '/login')}
              className="cursor-pointer h-11 px-6 rounded-full bg-[#00FF85] text-black text-sm font-semibold hover:brightness-110 transition-all"
            >
              {isAuthenticated ? 'Back Home' : 'Login'}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-6 pt-40 pb-16 text-center">
        <motion.h1
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-mono-display font-bold leading-tight tracking-tight mb-4"
          style={{ fontSize: 'clamp(36px, 6vw, 64px)' }}
        >
          Simple, fair <span className="text-[#00FF85]">pricing</span>.
        </motion.h1>
        <motion.p
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[var(--color-text-secondary)] text-[15px] max-w-lg mx-auto mb-10"
        >
          Start free. Upgrade when you're ready to go unlimited. No hidden fees, cancel anytime.
        </motion.p>

        {/* monthly/annual toggle */}
        <div className="inline-flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-2">
          <button
            onClick={() => setAnnual(false)}
            className={`cursor-pointer px-5 py-2 rounded-full text-sm font-medium transition-all ${!annual ? 'bg-[#00FF85] text-black' : 'text-white/60'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`cursor-pointer px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-[#00FF85] text-black' : 'text-white/60'}`}
          >
            Annual
            <span className="bg-[#FF7A00] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">SAVE 25%</span>
          </button>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="px-6 pb-32">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: tier.featured ? 1.03 : 1.02 }}
              className={`relative rounded-[28px] p-8 border ${
                tier.featured
                  ? 'bg-[var(--color-surface)] border-[#00FF85]/40 shadow-[0_0_60px_rgba(0,255,133,0.08)] lg:-translate-y-4'
                  : 'bg-[var(--color-surface)] border-white/10'
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00FF85] text-black text-[11px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className="font-mono-display text-2xl font-bold mb-1">{tier.name}</h3>
              <p className="text-white/45 text-sm mb-6 min-h-[40px]">{tier.tagline}</p>

              <div className="mb-8">
                {tier.monthly === null ? (
                  <div className="font-mono-display text-4xl font-bold">Custom</div>
                ) : tier.monthly === 0 ? (
                  <div className="font-mono-display text-4xl font-bold">$0</div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono-display text-4xl font-bold text-[#00FF85]">
                      ${annual ? tier.annual : tier.monthly}
                    </span>
                    <span className="text-white/40 text-sm">/ month</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate(tier.to)}
                className={`cursor-pointer w-full py-3.5 rounded-xl font-mono-display font-bold text-xs tracking-widest mb-8 transition-all hover:brightness-110 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-[#00FF85] ${
                  tier.featured
                    ? 'bg-[#00FF85] text-black'
                    : 'bg-white/[0.05] border border-white/15 text-[var(--color-text-primary)]'
                }`}
              >
                {tier.cta}
              </button>

              <ul className="space-y-3.5">
                {tier.features.map(([label, included]) => (
                  <li key={label} className="flex items-start gap-3 text-sm">
                    {included ? (
                      <Check size={16} className="text-[#00FF85] shrink-0 mt-0.5" />
                    ) : (
                      <X size={16} className="text-white/20 shrink-0 mt-0.5" />
                    )}
                    <span className={included ? 'text-white/80' : 'text-white/30'}>{label}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-14 max-w-md mx-auto">
          Presentational pricing only — no payment is processed. Contact us to discuss real Pro / Enterprise plans.
        </p>
      </section>
    </div>
  )
}
