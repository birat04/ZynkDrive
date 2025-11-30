"use client"

import { useEffect, useRef } from "react"

export function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const drawCircuitLine = (startX: number, startY: number, length: number, direction: "h" | "v", opacity: number) => {
      ctx.beginPath()
      ctx.strokeStyle = `hsla(250, 70%, 60%, ${opacity})`
      ctx.lineWidth = 1
      ctx.moveTo(startX, startY)

      if (direction === "h") {
        ctx.lineTo(startX + length, startY)
      } else {
        ctx.lineTo(startX, startY + length)
      }
      ctx.stroke()

      // Node at end
      ctx.beginPath()
      ctx.arc(
        direction === "h" ? startX + length : startX,
        direction === "v" ? startY + length : startY,
        2,
        0,
        Math.PI * 2,
      )
      ctx.fillStyle = `hsla(180, 70%, 60%, ${opacity * 1.5})`
      ctx.fill()
    }

    const animate = () => {
      time += 0.01
      ctx.fillStyle = "rgba(13, 13, 20, 0.05)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Animated circuit pattern
      const gridSize = 60
      for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
          const distFromCenter = Math.hypot(x - canvas.width / 2, y - canvas.height / 2)
          const wave = Math.sin(time * 2 - distFromCenter * 0.01) * 0.5 + 0.5
          const opacity = 0.03 + wave * 0.05

          if (Math.random() > 0.97) {
            const length = Math.random() * 40 + 20
            const dir = Math.random() > 0.5 ? "h" : "v"
            drawCircuitLine(x, y, length, dir, opacity * 2)
          }

          // Draw subtle grid dots
          ctx.beginPath()
          ctx.arc(x, y, 1, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(250, 70%, 60%, ${opacity})`
          ctx.fill()
        }
      }

      // Floating orbs
      for (let i = 0; i < 3; i++) {
        const orbX = canvas.width / 2 + Math.sin(time * 0.5 + i * 2) * (canvas.width * 0.3)
        const orbY = canvas.height / 2 + Math.cos(time * 0.3 + i * 2) * (canvas.height * 0.3)
        const orbSize = 100 + Math.sin(time + i) * 30

        const gradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbSize)
        gradient.addColorStop(0, `hsla(${250 + i * 30}, 70%, 60%, 0.1)`)
        gradient.addColorStop(0.5, `hsla(${250 + i * 30}, 70%, 60%, 0.03)`)
        gradient.addColorStop(1, "transparent")

        ctx.beginPath()
        ctx.arc(orbX, orbY, orbSize, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // Data pulse lines
      const pulseY = (time * 100) % canvas.height
      ctx.beginPath()
      ctx.strokeStyle = "hsla(180, 70%, 60%, 0.1)"
      ctx.lineWidth = 1
      ctx.moveTo(0, pulseY)
      ctx.lineTo(canvas.width, pulseY)
      ctx.stroke()

      animationId = requestAnimationFrame(animate)
    }

    resize()
    animate()

    window.addEventListener("resize", resize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />
}
