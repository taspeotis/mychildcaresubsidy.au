import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { Container } from '../components/Container'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <Container className="flex h-14 items-center justify-between">
          <Link to="/" className="text-lg font-bold text-slate-900 tracking-tight">
            kindy<span className="text-teal-600">.au</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/qld"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 [&.active]:bg-teal-50 [&.active]:text-teal-700"
            >
              QLD
            </Link>
            <Link
              to="/act"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 [&.active]:bg-teal-50 [&.active]:text-teal-700"
            >
              ACT
            </Link>
          </nav>
        </Container>
      </header>

      <main className="pb-16">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <Container className="py-6 text-center text-xs text-slate-500">
          <p>
            This calculator provides estimates only and should not be taken as financial advice.
            Actual costs may vary. Rates are based on FY2026 published schedules.
          </p>
        </Container>
      </footer>
    </div>
  )
}
