"use client"

export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Primary aurora wave */}
      <div
        className="absolute -top-1/2 left-0 h-full w-full animate-aurora opacity-30"
        style={{
          background:
            "linear-gradient(45deg, transparent 30%, oklch(0.65 0.18 250 / 0.3), oklch(0.7 0.15 180 / 0.3), transparent 70%)",
          backgroundSize: "400% 400%",
          filter: "blur(80px)",
        }}
      />

      {/* Secondary aurora wave */}
      <div
        className="absolute -bottom-1/2 right-0 h-full w-full animate-aurora opacity-20"
        style={{
          background:
            "linear-gradient(-45deg, transparent 30%, oklch(0.7 0.15 180 / 0.4), oklch(0.65 0.18 250 / 0.3), transparent 70%)",
          backgroundSize: "400% 400%",
          animationDelay: "-7s",
          filter: "blur(100px)",
        }}
      />

      {/* Morphing blob 1 */}
      <div
        className="absolute top-1/4 left-1/4 h-96 w-96 animate-morph bg-primary/20"
        style={{ filter: "blur(80px)" }}
      />

      {/* Morphing blob 2 */}
      <div
        className="absolute bottom-1/4 right-1/4 h-80 w-80 animate-morph bg-accent/20"
        style={{ filter: "blur(60px)", animationDelay: "-4s" }}
      />

      {/* Scanning line effect */}
      <div
        className="absolute left-0 h-px w-full animate-scan bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        style={{ animationDuration: "8s" }}
      />
    </div>
  )
}
