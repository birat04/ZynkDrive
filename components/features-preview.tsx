"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { Upload, FolderOpen, Share2, Search, Shield, Zap } from "lucide-react"

const features = [
  {
    icon: Upload,
    title: "Drag & Drop Upload",
    description: "Effortlessly upload files with intuitive drag and drop. Support for multiple files and folders.",
    status: "building",
  },
  {
    icon: FolderOpen,
    title: "Smart Organization",
    description: "Organize files with folders, tags, and favorites. Find what you need instantly.",
    status: "planned",
  },
  {
    icon: Share2,
    title: "Easy Sharing",
    description: "Share files and folders with customizable permissions and expiring links.",
    status: "planned",
  },
  {
    icon: Search,
    title: "Powerful Search",
    description: "Full-text search across all your files. Filter by type, date, size, and more.",
    status: "planned",
  },
  {
    icon: Shield,
    title: "Secure Storage",
    description: "Enterprise-grade security with Appwrite. Your files are encrypted and protected.",
    status: "done",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built with Next.js 15 and React 19 for blazing fast performance.",
    status: "done",
  },
]

export function FeaturesPreview() {
  const [visibleCards, setVisibleCards] = useState<number[]>([])
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const sectionRef = useRef<HTMLElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            features.forEach((_, index) => {
              setTimeout(() => setVisibleCards((prev) => [...prev, index]), index * 100)
            })
          }
        })
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    const card = cardRefs.current[index]
    if (!card) return
    const rect = card.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    })
  }

  return (
    <section ref={sectionRef} id="features" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute top-0 left-0 h-32 w-32">
        <div className="absolute inset-0 animate-rotate-border bg-gradient-to-br from-primary/20 to-transparent opacity-50" />
      </div>
      <div className="absolute bottom-0 right-0 h-32 w-32">
        <div className="absolute inset-0 animate-rotate-border bg-gradient-to-tl from-accent/20 to-transparent opacity-50" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="gradient-text-animated">Features Coming Soon</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Everything you need for modern file management</p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              ref={(el) => {
                cardRefs.current[index] = el
              }}
              className={`group perspective-1000 transition-all duration-500 ${
                visibleCards.includes(index) ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
              onMouseMove={(e) => handleMouseMove(e, index)}
            >
              <div
                className={`preserve-3d holographic-card relative h-full overflow-hidden rounded-xl border bg-card/50 p-6 backdrop-blur-sm transition-all duration-300 ${
                  hoveredCard === index ? "border-primary/50 shadow-2xl shadow-primary/20" : "border-border"
                }`}
                style={{
                  transform:
                    hoveredCard === index
                      ? `rotateX(${mousePos.y * -0.05}deg) rotateY(${mousePos.x * 0.05}deg) scale(1.02)`
                      : "rotateX(0) rotateY(0) scale(1)",
                }}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 transition-opacity duration-300 ${
                    hoveredCard === index ? "opacity-100" : "opacity-0"
                  }`}
                />

                <div
                  className={`absolute -right-10 -top-10 h-20 w-20 rotate-45 bg-gradient-to-br from-primary/30 to-transparent transition-all duration-300 ${
                    hoveredCard === index ? "scale-150" : "scale-100"
                  }`}
                />

                {hoveredCard === index && (
                  <div
                    className="absolute -inset-[1px] animate-rotate-border rounded-xl bg-gradient-to-r from-primary via-accent to-primary opacity-40"
                    style={{ animationDuration: "2s" }}
                  />
                )}

                <div className="relative">
                  <div
                    className={`relative flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 ${
                      hoveredCard === index ? "scale-110" : ""
                    }`}
                  >
                    {hoveredCard === index && (
                      <div className="absolute inset-0 animate-cyber-pulse rounded-xl bg-primary/30" />
                    )}
                    <feature.icon
                      className={`relative h-7 w-7 text-primary transition-all duration-300 ${
                        hoveredCard === index ? "scale-110" : ""
                      }`}
                      style={hoveredCard === index ? { filter: "drop-shadow(0 0 8px var(--primary))" } : {}}
                    />
                  </div>

                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>

                  <div className="mt-4 flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        feature.status === "done"
                          ? "bg-accent shadow-lg shadow-accent/50"
                          : feature.status === "building"
                            ? "animate-pulse bg-primary shadow-lg shadow-primary/50"
                            : "bg-muted-foreground/30"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground capitalize font-medium">{feature.status}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
