"use client"

import { useEffect, useState, useRef } from "react"

const technologies = [
  { name: "Next.js 15", category: "Framework", color: "from-white to-gray-400" },
  { name: "React 19", category: "UI Library", color: "from-cyan-400 to-blue-500" },
  { name: "Appwrite", category: "Backend", color: "from-pink-500 to-red-500" },
  { name: "Tailwind CSS", category: "Styling", color: "from-cyan-400 to-teal-500" },
  { name: "TypeScript", category: "Language", color: "from-blue-400 to-blue-600" },
  { name: "Vercel", category: "Deployment", color: "from-white to-gray-400" },
]

export function TechStack() {
  const [visibleItems, setVisibleItems] = useState<number[]>([])
  const [hoveredItem, setHoveredItem] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            technologies.forEach((_, index) => {
              setTimeout(() => setVisibleItems((prev) => [...prev, index]), index * 80)
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
    <section
      ref={sectionRef}
      id="tech"
      className="relative border-y border-border bg-card/50 py-20 sm:py-28 overflow-hidden"
    >
      <div className="cyber-grid absolute inset-0 opacity-20" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="gradient-text-animated">Built with Modern Tech</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Leveraging the latest and greatest in web development</p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {technologies.map((tech, index) => (
            <div
              key={tech.name}
              className={`group transition-all duration-500 ${
                visibleItems.includes(index)
                  ? "translate-y-0 opacity-100 scale-100"
                  : "translate-y-4 opacity-0 scale-95"
              }`}
              onMouseEnter={() => setHoveredItem(index)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="holographic-card relative overflow-hidden rounded-xl border border-border bg-card/50 p-6 text-center backdrop-blur-sm transition-all duration-300 hover:border-transparent hover:shadow-xl hover:shadow-primary/10">
                {hoveredItem === index && (
                  <div
                    className="absolute -inset-[1px] animate-rotate-border rounded-xl bg-gradient-to-r from-primary via-accent to-primary opacity-60"
                    style={{ animationDuration: "2s" }}
                  />
                )}

                {hoveredItem === index && (
                  <div className="absolute inset-0 animate-cyber-pulse rounded-xl bg-primary/10" />
                )}

                <div className="relative rounded-xl bg-card/80 py-2">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {tech.category}
                  </span>

                  <span
                    className={`mt-2 block font-semibold transition-all duration-300 ${
                      hoveredItem === index ? `bg-gradient-to-r ${tech.color} bg-clip-text text-transparent` : ""
                    }`}
                    style={hoveredItem === index ? { textShadow: "0 0 20px currentColor" } : {}}
                  >
                    {tech.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
