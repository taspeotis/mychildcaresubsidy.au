import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Container } from '../components/Container'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-page">
      <header className="header-glow sticky top-0 z-40 bg-brand-900/80 backdrop-blur-sm">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white tracking-tight">
            kindy<span className="text-accent-400">.au</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/qld"
              className="rounded-lg px-4 py-2 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white [&.active]:bg-gradient-to-b [&.active]:from-accent-400 [&.active]:to-accent-600 [&.active]:text-white"
            >
              QLD
            </Link>
            <Link
              to="/act"
              className="rounded-lg px-4 py-2 text-sm font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white [&.active]:bg-gradient-to-b [&.active]:from-accent-400 [&.active]:to-accent-600 [&.active]:text-white"
            >
              ACT
            </Link>
          </nav>
        </Container>
      </header>

      <main className="pb-16">
        <Outlet />
      </main>

      <footer className="footer-glow bg-brand-900">
        <Container className="py-8 text-center text-xs text-white/50">
          <p>
            This calculator provides estimates only and should not be taken as financial advice.
            Actual costs may vary. Rates are based on FY2026 published schedules.
          </p>
        </Container>
      </footer>
    </div>
  )
}
