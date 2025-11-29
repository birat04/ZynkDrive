"use client"

import { useEffect, useState, useRef } from "react"
import { CheckCircle2, Circle, Loader2, Zap } from "lucide-react"

const milestones = [
  {
    id: 1,
    title: "Project Setup",
    description: "Next.js 15, React 19, Tailwind CSS",
    status: "completed",
    progress: 100,
  },
  { id: 2, title: "Authentication", description: "Appwrite Auth integration", status: "completed", progress: 100 },
  {
    id: 3,
    title: "File Upload System",
    description: "Drag & drop, multi-file uploads",
    status: "in-progress",
    progress: 65,
  },
  { id: 4, title: "Dashboard UI", description: "File browser, grid/list views", status: "upcoming", progress: 0 },
  { id: 5, title: "Search & Sharing", description: "Full-text search, share links", status: "upcoming", progress: 0 },
]

export function BuildProgress() {
  const [progress, setProgress] = useState(0)
  const [visibleMilestones, setVisibleMilestones] = useState<number[]>([])
  const [activeDataStream, setActiveDataStream] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setProgress(55), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDataStream((prev) => (prev + 1) % 4)
    }, 200)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            milestones.forEach((_, index) => {
              setTimeout(() => {
                setVisibleMilestones((prev) => [...prev, index])
              }, index * 150)
            })
          }
        })
      },
      { threshold: 0.2 },
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative border-y border-border bg-card/50 py-20 sm:py-28 overflow-hidden">
      <div className="cyber-grid absolute inset-0 opacity-20" />

      <div className="pointer-events-none absolute right-0 top-0 h-full w-1 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute h-20 w-full transition-all duration-200"
            style={{
              top: `${i * 25}%`,
              background: `linear-gradient(180deg, transparent, ${activeDataStream === i ? "var(--primary)" : "transparent"}, transparent)`,
              opacity: activeDataStream === i ? 0.8 : 0.2,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="gradient-text-animated">Build Progress</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Follow along as we build ZynkDrive from the ground up</p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 animate-pulse text-primary" />
              Overall Progress
            </span>
            <span className="font-mono text-primary animate-neon-flicker">{progress}%</span>
          </div>
          <div className="relative mt-3 h-5 overflow-hidden rounded-full bg-secondary/50 backdrop-blur-sm">
            {/* Animated background */}
            <div className="absolute inset-0 animate-holo opacity-20" />

            {/* Main progress bar */}
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-1000 ease-out animate-progress-glow"
              style={{ width: `${progress}%`, backgroundSize: "200% 100%" }}
            >
              {/* Electric effect at the end */}
              <div className="absolute right-0 top-0 h-full w-2 animate-electric bg-white/50" />

              {/* Shimmer overlay */}
              <div className="absolute inset-0 animate-holo" />
            </div>

            {/* Progress markers */}
            <div className="absolute inset-0 flex justify-between px-1">
              {[25, 50, 75].map((mark) => (
                <div key={mark} className="h-full w-px bg-white/20" style={{ marginLeft: `${mark}%` }} />
              ))}
            </div>
          </div>

          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Planning</span>
            <span>Development</span>
            <span>Testing</span>
            <span>Launch</span>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-3xl">
          <div className="space-y-1">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className={`group relative flex gap-4 pb-8 last:pb-0 transition-all duration-500 ${
                  visibleMilestones.includes(index) ? "translate-x-0 opacity-100" : "-translate-x-8 opacity-0"
                }`}
              >
                {/* Connection line with energy flow */}
                {index < milestones.length - 1 && (
                  <div className="absolute left-[15px] top-8 h-full w-px overflow-hidden bg-border">
                    {milestone.status === "completed" && (
                      <div
                        className="h-full w-full bg-gradient-to-b from-accent via-accent to-transparent transition-all duration-1000"
                        style={{ transform: visibleMilestones.includes(index) ? "translateY(0)" : "translateY(-100%)" }}
                      />
                    )}
                    {milestone.status === "in-progress" && (
                      <div className="absolute inset-0 animate-data-stream bg-gradient-to-b from-transparent via-primary to-transparent" />
                    )}
                  </div>
                )}

                {/* Status icon */}
                <div className="relative z-10 flex-shrink-0">
                  {milestone.status === "completed" ? (
                    <div className="relative">
                      <div className="absolute inset-0 animate-cyber-pulse rounded-full bg-accent/30" />
                      <CheckCircle2
                        className="relative h-8 w-8 text-accent"
                        style={{ filter: "drop-shadow(0 0 8px var(--accent))" }}
                      />
                    </div>
                  ) : milestone.status === "in-progress" ? (
                    <div className="relative">
                      <div className="absolute inset-0 animate-cyber-pulse rounded-full bg-primary/30" />
                      <Circle className="h-8 w-8 text-primary" />
                      <Loader2
                        className="absolute inset-0 h-8 w-8 animate-spin text-primary"
                        style={{ filter: "drop-shadow(0 0 8px var(--primary))" }}
                      />
                    </div>
                  ) : (
                    <Circle className="h-8 w-8 text-muted-foreground/30" />
                  )}
                </div>

                {/* Card content */}
                <div
                  className={`holographic-card flex-1 overflow-hidden rounded-xl border bg-card/50 p-5 backdrop-blur-sm transition-all duration-300 ${
                    milestone.status === "in-progress"
                      ? "border-primary/50 shadow-lg shadow-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{milestone.title}</h3>
                    {milestone.status === "in-progress" && (
                      <span className="relative overflow-hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <span className="absolute inset-0 animate-holo" />
                        <span className="relative flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                          In Progress
                        </span>
                      </span>
                    )}
                    {milestone.status === "completed" && (
                      <span className="text-xs text-accent font-medium">Completed</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{milestone.description}</p>

                  {milestone.status === "in-progress" && (
                    <div className="mt-4">
                      <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 animate-progress-glow"
                          style={{ width: visibleMilestones.includes(index) ? `${milestone.progress}%` : "0%" }}
                        />
                      </div>
                      <div className="mt-1 text-right text-xs font-mono text-primary">{milestone.progress}%</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
