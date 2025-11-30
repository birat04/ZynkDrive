import { AuthBackground } from "@/components/auth-background"
import { AuthForm } from "@/components/auth-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In | ZynkDrive",
  description: "Sign in to your ZynkDrive account",
}

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <AuthBackground />

      {/* Ambient glow effects */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 animate-morph rounded-full bg-primary/10 blur-[100px]" />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 animate-morph rounded-full bg-accent/10 blur-[100px]"
        style={{ animationDelay: "-4s" }}
      />

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 cyber-grid opacity-30" />

      <AuthForm mode="signin" />
    </main>
  )
}
