"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Cloud, Sparkles, Terminal, Code2, Database, Cpu, Hexagon, Zap } from "lucide-react"

const floatingIcons = [
  { Icon: Code2, delay: 0, duration: 6 },
  { Icon: Database, delay: 2, duration: 7 },
  { Icon: Terminal, delay: 4, duration: 5 },
  { Icon: Cpu, delay: 1, duration: 8 },
  { Icon: Hexagon, delay: 3, duration: 6.5 },
  { Icon: Zap, delay: 5, duration: 7.5 },
]

const useTextScramble = (text: string, speed = 50) => {
  const [displayText, setDisplayText] = useState("")
  const chars = "!<>-_\\/[]{}—=+*^?#________"

  useEffect(() => {
    let iteration = 0
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (index < iteration) return text[index]
            return chars[Math.floor(Math.random() * chars.length)]
          })
          .join(""),
      )
      iteration += 1 / 3
      if (iteration >= text.length) clearInterval(interval)
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed])

  return displayText
}

export function HeroSection() {
  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLElement>(null)
  const scrambledText = useTextScramble("cloud storage", 30)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28"
    >
      <div className="cyber-grid absolute inset-0 opacity-30" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-0 h-[2px] w-full animate-scanline bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          style={{ boxShadow: "0 0 20px 5px var(--primary)" }}
        />
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {floatingIcons.map(({ Icon, delay, duration }, i) => (
          <div
            key={i}
            className="absolute animate-float-rotate"
            style={{
              left: `${10 + i * 15}%`,
              top: `${15 + (i % 3) * 25}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 animate-cyber-pulse rounded-full bg-primary/30" />
              <Icon className="h-8 w-8 text-primary/40" />
            </div>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-[500px] w-[500px]">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 animate-orbit-trail"
              style={
                {
                  "--orbit-radius": `${80 + i * 50}px`,
                  animationDuration: `${15 + i * 5}s`,
                  animationDelay: `${i * -3}s`,
                } as React.CSSProperties
              }
            >
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-primary/50 blur-sm" />
                <div
                  className="h-3 w-3 rounded-full bg-gradient-to-r from-primary to-accent"
                  style={{ boxShadow: "0 0 10px var(--primary), 0 0 20px var(--primary)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-8 transition-all duration-700 ${
              mounted ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
            }`}
          >
            <div className="group relative">
              <div className="absolute -inset-1 animate-rotate-border rounded-full bg-gradient-to-r from-primary via-accent to-primary opacity-75 blur-sm" />
              <div className="holographic-card relative flex items-center gap-2 rounded-full border border-primary/30 bg-background/80 px-5 py-2.5 backdrop-blur-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                </span>
                <span className="text-sm font-semibold tracking-wide text-primary">Currently Building</span>
                <Sparkles className="h-4 w-4 animate-pulse text-accent" />
              </div>
            </div>
          </div>

          <h1
            className={`max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl transition-all duration-700 delay-100 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <span className="text-balance block">The future of</span>
            <span className="relative mt-2 block">
              <span className="gradient-text-animated text-glow">{scrambledText}</span>
              <span className="animate-cursor-blink ml-1 text-primary">|</span>
            </span>
          </h1>

          {/* Description with wave effect */}
          <p
            className={`mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl transition-all duration-700 delay-200 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            A modern, full-featured cloud storage and file sharing platform. Effortlessly upload, organize, and share
            files with powerful search, sharing, and dashboard features.
          </p>

          <div
            className={`mt-10 flex flex-col items-center gap-4 sm:flex-row transition-all duration-700 delay-300 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <a
              href="#notify"
              className="glow-button group relative flex h-14 items-center gap-2 overflow-hidden rounded-xl bg-primary px-8 font-semibold text-primary-foreground transition-all hover:scale-105"
              style={{ boxShadow: "0 0 20px var(--primary), 0 0 40px var(--primary)" }}
            >
              <span className="absolute inset-0 animate-holo opacity-50" />
              <Sparkles className="relative h-5 w-5 transition-transform group-hover:scale-110 group-hover:rotate-12" />
              <span className="relative">Get Early Access</span>
            </a>
            <a
              href="https://github.com/birat04/ZynkDrive"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex h-14 items-center gap-2 overflow-hidden rounded-xl border border-border bg-secondary/50 px-8 font-semibold backdrop-blur-sm transition-all hover:border-primary/50 hover:scale-105"
            >
              <span className="relative">View on GitHub</span>
            </a>
          </div>

          <div
            className={`mt-16 transition-all duration-700 delay-500 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="perspective-1000 group">
              <div
                className="preserve-3d relative transition-transform duration-500"
                style={{
                  transform: `rotateX(${(mousePos.y - 200) * 0.02}deg) rotateY(${(mousePos.x - 200) * 0.02}deg)`,
                }}
              >
                {/* Outer glow rings */}
                <div className="absolute -inset-8 animate-cyber-pulse rounded-[3rem] bg-primary/20" />
                <div
                  className="absolute -inset-4 animate-cyber-pulse rounded-[2.5rem] bg-accent/20"
                  style={{ animationDelay: "0.5s" }}
                />

                {/* Rotating hex border */}
                <div className="absolute -inset-[3px] animate-hex-spin rounded-3xl bg-gradient-to-r from-primary via-accent to-primary opacity-60" />

                {/* Main container */}
                <div className="holographic-card glass relative flex h-28 w-28 animate-float items-center justify-center rounded-3xl sm:h-36 sm:w-36">
                  <Cloud
                    className="h-14 w-14 text-primary sm:h-18 sm:w-18"
                    style={{
                      filter: "drop-shadow(0 0 10px var(--primary)) drop-shadow(0 0 20px var(--primary))",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`mt-16 flex flex-wrap justify-center gap-12 transition-all duration-700 delay-700 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            {[
              { value: "10GB", label: "Free Storage" },
              { value: "256-bit", label: "Encryption" },
              { value: "99.9%", label: "Uptime SLA" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="group relative text-center"
                style={{ animationDelay: `${0.8 + i * 0.1}s` }}
              >
                <div className="absolute -inset-4 rounded-xl bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative">
                  <div className="animate-neon-flicker text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
