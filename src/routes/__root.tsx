import { useLayoutEffect, useRef, useState } from 'react'
import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { Container } from '../components/Container'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const [pill, setPill] = useState({ left: 0, width: 0, opacity: 0 })
  const wasVisible = useRef(false)
  const pillRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const active = nav.querySelector<HTMLAnchorElement>('.active')
    if (!active) {
      wasVisible.current = false
      setPill((p) => ({ ...p, opacity: 0 }))
      return
    }
    const left = active.offsetLeft
    const width = active.offsetWidth
    if (!wasVisible.current) {
      // First activation: snap position instantly, only fade opacity
      const el = pillRef.current
      if (el) {
        el.style.transition = 'none'
        // Force reflow so the snap takes effect before re-enabling transition
        void el.offsetLeft
      }
      setPill({ left, width, opacity: 1 })
      requestAnimationFrame(() => {
        if (el) el.style.transition = ''
      })
    } else {
      setPill({ left, width, opacity: 1 })
    }
    wasVisible.current = true
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="header-glow sticky top-0 z-40 bg-brand-900/80 backdrop-blur-sm">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white tracking-tight">
            kindy<span className="text-accent-400">.au</span>
          </Link>
          <nav ref={navRef} className="relative flex flex-1 items-center justify-evenly sm:flex-none sm:gap-1">
            <div
              ref={pillRef}
              className="absolute top-0 h-full rounded-lg bg-gradient-to-b from-accent-400 to-accent-600 transition-all duration-300 ease-out"
              style={{ left: pill.left, width: pill.width, opacity: pill.opacity }}
            />
            <Link
              to="/act"
              className="relative z-10 rounded-lg px-3 py-2 text-sm font-bold text-white/70 transition-colors hover:text-white sm:px-4 [&.active]:text-white"
            >
              ACT
            </Link>
            <Link
              to="/nsw"
              className="relative z-10 rounded-lg px-3 py-2 text-sm font-bold text-white/70 transition-colors hover:text-white sm:px-4 [&.active]:text-white"
            >
              NSW
            </Link>
            <Link
              to="/qld"
              className="relative z-10 rounded-lg px-3 py-2 text-sm font-bold text-white/70 transition-colors hover:text-white sm:px-4 [&.active]:text-white"
            >
              QLD
            </Link>
            <Link
              to="/vic"
              className="relative z-10 rounded-lg px-3 py-2 text-sm font-bold text-white/70 transition-colors hover:text-white sm:px-4 [&.active]:text-white"
            >
              VIC
            </Link>
          </nav>
        </Container>
      </header>

      <main className="flex-1 pb-16">
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
