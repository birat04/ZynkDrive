import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { BuildProgress } from "@/components/build-progress"
import { FeaturesPreview } from "@/components/features-preview"
import { TechStack } from "@/components/tech-stack"
import { Newsletter } from "@/components/newsletter"
import { Footer } from "@/components/footer"
import { CyberBackground } from "@/components/cyber-background"

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-background">
      <CyberBackground />

      {/* Content */}
      <div className="relative z-10">
        <Header />
        <HeroSection />
        <BuildProgress />
        <FeaturesPreview />
        <TechStack />
        <Newsletter />
        <Footer />
      </div>
    </main>
  )
}
