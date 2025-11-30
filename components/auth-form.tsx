"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Eye, EyeOff, ArrowRight, Mail, Lock, User, Github, Loader2, Check, CloudIcon } from "lucide-react"
import Link from "next/link"

interface AuthFormProps {
  mode: "signin" | "signup"
}

export function AuthForm({ mode }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const formRef = useRef<HTMLFormElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (formRef.current) {
        const rect = formRef.current.getBoundingClientRect()
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsLoading(false)
    setIsSuccess(true)

    setTimeout(() => setIsSuccess(false), 3000)
  }

  const isSignUp = mode === "signup"

  return (
    <div className="relative w-full max-w-md">
      {/* Glowing orb following cursor */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.1), transparent 40%)`,
        }}
      />

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-8 backdrop-blur-xl"
      >
        {/* Animated border gradient */}
        <div className="absolute inset-0 rounded-2xl">
          <div className="absolute inset-[-2px] animate-rotate-border rounded-2xl bg-[conic-gradient(from_0deg,transparent,var(--primary),transparent_30%)] opacity-20" />
        </div>

        {/* Holographic overlay */}
        <div className="absolute inset-0 animate-holo rounded-2xl opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Scan line effect */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="animate-scanline absolute h-[2px] w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/30 blur-xl" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                  <CloudIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <span className="text-xl font-bold">ZynkDrive</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold">{isSignUp ? "Create your account" : "Welcome back"}</h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Start your journey with ZynkDrive" : "Sign in to continue to ZynkDrive"}
            </p>
          </div>

          {/* Social login buttons */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="glow-button flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium transition-all hover:border-primary/50 hover:bg-secondary"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="glow-button flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm font-medium transition-all hover:border-primary/50 hover:bg-secondary"
            >
              <Github className="h-4 w-4" />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {isSignUp && (
              <div className="relative">
                <div
                  className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                    focusedField === "name" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full rounded-lg border border-border bg-input/50 py-3 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {focusedField === "name" && (
                  <div className="absolute inset-0 -z-10 animate-pulse-glow rounded-lg bg-primary/10 blur-xl" />
                )}
              </div>
            )}

            <div className="relative">
              <div
                className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                  focusedField === "email" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className="w-full rounded-lg border border-border bg-input/50 py-3 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {focusedField === "email" && (
                <div className="absolute inset-0 -z-10 animate-pulse-glow rounded-lg bg-primary/10 blur-xl" />
              )}
            </div>

            <div className="relative">
              <div
                className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                  focusedField === "password" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className="w-full rounded-lg border border-border bg-input/50 py-3 pl-10 pr-12 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {focusedField === "password" && (
                <div className="absolute inset-0 -z-10 animate-pulse-glow rounded-lg bg-primary/10 blur-xl" />
              )}
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 rounded border-border bg-input accent-primary" />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-primary transition-colors hover:text-primary/80">
                  Forgot password?
                </Link>
              </div>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className="glow-button mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isSuccess ? (
              <>
                <Check className="h-5 w-5" />
                {isSignUp ? "Account created!" : "Signed in!"}
              </>
            ) : (
              <>
                {isSignUp ? "Create account" : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </Link>
          </p>
        </div>

        {/* Success ripple effect */}
        {isSuccess && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-ripple absolute h-8 w-8 rounded-full bg-primary/30" />
          </div>
        )}
      </form>

      {/* Floating particles */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 animate-morph-gradient rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl" />
      <div className="animation-delay-2000 pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 animate-morph-gradient rounded-full bg-gradient-to-br from-accent/20 to-primary/20 blur-3xl" />
    </div>
  )
}
