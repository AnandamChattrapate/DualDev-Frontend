import { useEffect, useRef } from 'react'

/**
 * Queue radar — two nodes drift toward each other while searching.
 * Awwwards-style canvas pairing animation.
 */
export default function QueueRadar({ topic, difficulty }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 280
    let h = 160
    let dpr = 1
    let t = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const parent = canvas.parentElement
      w = parent?.clientWidth || 280
      h = 160
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      t += reduced ? 0 : 0.016
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2

      /* radar rings */
      for (let i = 1; i <= 3; i++) {
        const r = 28 + i * 22 + (reduced ? 0 : Math.sin(t * 1.4 + i) * 2)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0,255,133,${0.08 + i * 0.03})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      /* sweep arc */
      if (!reduced) {
        const sweep = (t * 1.1) % (Math.PI * 2)
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90)
        grad.addColorStop(0, 'rgba(0,255,133,0.18)')
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, 90, sweep, sweep + 0.55)
        ctx.closePath()
        ctx.fill()
      }

      /* pairing progress 0→1 loops */
      const pair = reduced ? 0.55 : (Math.sin(t * 0.55) + 1) / 2
      const spread = 78 - pair * 52
      const leftX = cx - spread
      const rightX = cx + spread
      const bob = reduced ? 0 : Math.sin(t * 2) * 3

      /* link */
      const midY = cy + Math.sin(t * 1.3) * 6
      const link = ctx.createLinearGradient(leftX, cy, rightX, cy)
      link.addColorStop(0, 'rgba(0,255,133,0.7)')
      link.addColorStop(0.5, `rgba(244,177,131,${0.25 + pair * 0.5})`)
      link.addColorStop(1, 'rgba(255,122,0,0.65)')
      ctx.strokeStyle = link
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(leftX, cy + bob)
      ctx.quadraticCurveTo(cx, midY, rightX, cy - bob)
      ctx.stroke()

      /* pulse on link */
      if (!reduced) {
        const u = (Math.sin(t * 2.2) + 1) / 2
        const px = (1 - u) * (1 - u) * leftX + 2 * (1 - u) * u * cx + u * u * rightX
        const py = (1 - u) * (1 - u) * (cy + bob) + 2 * (1 - u) * u * midY + u * u * (cy - bob)
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#00FF85'
        ctx.shadowColor = '#00FF85'
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      }

      /* YOU node */
      drawNode(ctx, leftX, cy + bob, '#00FF85', 'YOU')
      /* OPP node */
      drawNode(ctx, rightX, cy - bob, '#F4B183', 'OPP')

      /* lock flash when close */
      if (pair > 0.88) {
        ctx.beginPath()
        ctx.arc(cx, cy, 10 + (pair - 0.88) * 40, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0,255,133,${(pair - 0.88) * 4})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="queue-radar">
      <canvas ref={canvasRef} />
      <p className="queue-radar-meta">
        {topic} · {difficulty}
      </p>
    </div>
  )
}

function drawNode(ctx, x, y, color, label) {
  ctx.beginPath()
  ctx.arc(x, y, 11, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(10,10,10,0.85)'
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(x, y, 4, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 8
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.font = '600 9px Manrope, sans-serif'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.fillText(label, x, y + 24)
}
