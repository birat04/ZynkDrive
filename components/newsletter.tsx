"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Mail, ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react"

export function Newsletter() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle")
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsVisible(true)
        })
      },
      { threshold: 0.3 },
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus("loading")
    setTimeout(() => {
      setStatus("success")
      setEmail("")
    }, 1500)
  }

  return (
    <section ref={sectionRef} id="notify" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`holographic-card relative overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-sm transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div
            className="absolute -inset-[1px] animate-rotate-border rounded-2xl bg-gradient-to-r from-primary via-accent to-primary opacity-40"
            style={{ animationDuration: "8s" }}
          />

          <div className="cyber-grid absolute inset-0 opacity-10" />

          <div className="absolute top-0 left-0 h-20 w-20">
            <div className="absolute inset-0 animate-cyber-pulse bg-primary/20 blur-xl" />
          </div>
          <div className="absolute bottom-0 right-0 h-20 w-20">
            <div
              className="absolute inset-0 animate-cyber-pulse bg-accent/20 blur-xl"
              style={{ animationDelay: "1s" }}
            />
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float-rotate opacity-20"
                style={{
                  left: `${10 + i * 12}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  animationDelay: `${i * 0.8}s`,
                  animationDuration: `${5 + i}s`,
                }}
              >
                {i % 2 === 0 ? <Sparkles className="h-4 w-4 text-primary" /> : <Zap className="h-4 w-4 text-accent" />}
              </div>
            ))}
          </div>

          <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:px-16">
            <div className="mx-auto max-w-2xl text-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <div className="absolute inset-0 animate-cyber-pulse rounded-2xl bg-primary/30" />
                <div className="absolute inset-0 animate-rotate-border rounded-2xl bg-gradient-to-r from-primary to-accent opacity-30" />
                <Mail
                  className="relative h-8 w-8 text-primary"
                  style={{ filter: "drop-shadow(0 0 8px var(--primary))" }}
                />
              </div>

              <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="gradient-text-animated">Get notified when we launch</span>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Be the first to know when ZynkDrive is ready. No spam, just one email when we go live.
              </p>

              {status === "success" ? (
                <div className="mt-8 flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 animate-cyber-pulse rounded-full bg-accent/30" />
                    <div className="absolute inset-0 animate-ripple rounded-full bg-accent/30" />
                    <CheckCircle2
                      className="relative h-14 w-14 text-accent"
                      style={{ filter: "drop-shadow(0 0 12px var(--accent))" }}
                    />
                  </div>
                  <span className="font-medium text-accent animate-neon-flicker">
                    {"You're on the list! We'll be in touch."}
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <div className="relative group">
                      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-primary/50 to-accent/50 opacity-0 transition-opacity group-focus-within:opacity-100" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="relative h-14 rounded-xl border border-border bg-background/80 px-5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-80 transition-all duration-300 backdrop-blur-sm"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="glow-button group relative flex h-14 items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-8 font-semibold text-primary-foreground transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
                      style={{ boxShadow: "0 0 20px var(--primary)" }}
                    >
                      <span className="absolute inset-0 animate-holo opacity-30" />
                      {status === "loading" ? (
                        <span className="relative flex items-center gap-2">
                          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Subscribing...
                        </span>
                      ) : (
                        <>
                          <span className="relative">Notify Me</span>
                          <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
