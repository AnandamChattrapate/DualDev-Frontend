// Lucide-style stroke icons. Inherit color via currentColor; size via `s` prop.
const base = (s = 14) => ({
  width: s, height: s, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
  "aria-hidden": true, focusable: false,
})

export const IconPlay = ({ s }) => (
  <svg {...base(s)}><polygon points="6 3 20 12 6 21 6 3" /></svg>
)

export const IconCheck = ({ s }) => (
  <svg {...base(s)}><polyline points="20 6 9 17 4 12" /></svg>
)

export const IconSparkles = ({ s }) => (
  <svg {...base(s)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M12 8.5 13.2 11l2.5 1-2.5 1L12 15.5 10.8 13l-2.5-1 2.5-1L12 8.5Z" />
  </svg>
)

export const IconSun = ({ s }) => (
  <svg {...base(s)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

export const IconMoon = ({ s }) => (
  <svg {...base(s)}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
)

export const IconChevronUp = ({ s }) => (
  <svg {...base(s)}><polyline points="18 15 12 9 6 15" /></svg>
)

export const IconChevronDown = ({ s }) => (
  <svg {...base(s)}><polyline points="6 9 12 15 18 9" /></svg>
)

export const IconEye = ({ s }) => (
  <svg {...base(s)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const IconEyeOff = ({ s }) => (
  <svg {...base(s)}>
    <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.2M6.6 6.6A18 18 0 0 0 2 11s3.5 7 10 7a10.9 10.9 0 0 0 4.1-.8" />
    <path d="m9.5 9.5a3 3 0 0 0 4.2 4.2M2 2l20 20" />
  </svg>
)

export const IconBulb = ({ s }) => (
  <svg {...base(s)}>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
  </svg>
)

export const IconClose = ({ s }) => (
  <svg {...base(s)}><path d="M18 6 6 18M6 6l12 12" /></svg>
)
