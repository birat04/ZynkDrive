import { Cloud } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Cloud className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">ZynkDrive</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a
              href="https://github.com/birat04/ZynkDrive"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            <span>Built with Next.js & Appwrite</span>
          </div>

          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} ZynkDrive. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
