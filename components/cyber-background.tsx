"use client"

import { useEffect, useRef, useCallback } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  hue: number
  trail: { x: number; y: number }[]
}

interface DataStream {
  x: number
  y: number
  speed: number
  length: number
  chars: string[]
}

export function CyberBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const dataStreamsRef = useRef<DataStream[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number>(0)

  const createParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = []
    const count = Math.floor((width * height) / 20000)

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        hue: Math.random() > 0.5 ? 250 : 180,
        trail: [],
      })
    }
    return particles
  }, [])

  const createDataStreams = useCallback((width: number, height: number) => {
    const streams: DataStream[] = []
    const count = Math.floor(width / 100)
    const chars = "ZYNKDRIVE01アイウエオカキクケコ".split("")

    for (let i = 0; i < count; i++) {
      streams.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: Math.random() * 2 + 1,
        length: Math.floor(Math.random() * 15) + 5,
        chars: Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]),
      })
    }
    return streams
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      particlesRef.current = createParticles(canvas.width, canvas.height)
      dataStreamsRef.current = createDataStreams(canvas.width, canvas.height)
    }

    const drawHexagon = (x: number, y: number, size: number, opacity: number) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2
        const px = x + size * Math.cos(angle)
        const py = y + size * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.strokeStyle = `hsla(250, 70%, 60%, ${opacity})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    const drawDataStream = (stream: DataStream) => {
      const charHeight = 14
      ctx.font = "12px monospace"

      stream.chars.forEach((char, i) => {
        const y = stream.y + i * charHeight
        if (y < 0 || y > canvas.height) return

        const opacity = i === 0 ? 1 : Math.max(0, 1 - i / stream.length)
        const hue = i === 0 ? 180 : 250

        ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${opacity * 0.3})`
        ctx.fillText(char, stream.x, y)
      })
    }

    const animate = () => {
      ctx.fillStyle = "rgba(13, 13, 20, 0.1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw hex grid
      const hexSize = 30
      const time = Date.now() * 0.001
      for (let x = 0; x < canvas.width + hexSize; x += hexSize * 1.75) {
        for (let y = 0; y < canvas.height + hexSize; y += hexSize * 1.5) {
          const offsetX = (Math.floor(y / (hexSize * 1.5)) % 2) * hexSize * 0.875
          const distToMouse = Math.hypot(x + offsetX - mouseRef.current.x, y - mouseRef.current.y)
          const pulse = Math.sin(time * 2 + x * 0.01 + y * 0.01) * 0.02
          const opacity = distToMouse < 200 ? 0.15 + pulse : 0.03 + pulse
          drawHexagon(x + offsetX, y, hexSize * 0.5, opacity)
        }
      }

      // Update and draw data streams
      dataStreamsRef.current.forEach((stream) => {
        stream.y += stream.speed
        if (stream.y > canvas.height + 200) {
          stream.y = -200
          stream.x = Math.random() * canvas.width
        }
        drawDataStream(stream)
      })

      // Update and draw particles with trails
      particlesRef.current.forEach((p) => {
        // Mouse interaction with magnetic effect
        const dx = mouseRef.current.x - p.x
        const dy = mouseRef.current.y - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 150) {
          const force = (150 - distance) / 150
          p.vx += (dx / distance) * force * 0.02
          p.vy += (dy / distance) * force * 0.02
        }

        // Update trail
        p.trail.unshift({ x: p.x, y: p.y })
        if (p.trail.length > 8) p.trail.pop()

        // Update position
        p.x += p.vx
        p.y += p.vy

        // Damping
        p.vx *= 0.98
        p.vy *= 0.98

        // Boundaries
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        p.x = Math.max(0, Math.min(canvas.width, p.x))
        p.y = Math.max(0, Math.min(canvas.height, p.y))

        // Draw trail
        p.trail.forEach((point, i) => {
          const trailOpacity = p.opacity * (1 - i / p.trail.length) * 0.3
          ctx.beginPath()
          ctx.arc(point.x, point.y, p.size * (1 - i / p.trail.length), 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${trailOpacity})`
          ctx.fill()
        })

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.opacity})`
        ctx.fill()

        // Glow effect
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        gradient.addColorStop(0, `hsla(${p.hue}, 70%, 60%, ${p.opacity * 0.3})`)
        gradient.addColorStop(1, "transparent")
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })

      // Connect nearby particles
      particlesRef.current.forEach((p1, i) => {
        particlesRef.current.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            ctx.beginPath()
            ctx.strokeStyle = `hsla(250, 70%, 60%, ${0.15 * (1 - distance / 120)})`
            ctx.lineWidth = 0.5
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        })
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    resizeCanvas()
    animate()

    window.addEventListener("resize", resizeCanvas)
    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [createParticles, createDataStreams])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />
}
