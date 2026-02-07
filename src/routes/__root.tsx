import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRootRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { SharedCalculatorProvider } from '../context/SharedCalculatorState'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const [pill, setPill] = useState({ left: 0, width: 0, opacity: 0, route: '' })
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
    const route = active.getAttribute('href') ?? pathname
    if (!wasVisible.current) {
      const el = pillRef.current
      if (el) {
        el.style.transition = 'none'
        void el.offsetLeft
      }
      setPill({ left, width, opacity: 1, route })
      requestAnimationFrame(() => {
        if (el) el.style.transition = ''
      })
    } else {
      setPill({ left, width, opacity: 1, route })
    }
    wasVisible.current = true
  }, [pathname])

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const ro = new ResizeObserver(() => {
      const active = nav.querySelector<HTMLAnchorElement>('.active')
      if (!active) return
      const el = pillRef.current
      if (el) {
        el.style.transition = 'none'
        void el.offsetLeft
      }
      setPill({ left: active.offsetLeft, width: active.offsetWidth, opacity: 1, route: active.getAttribute('href') ?? '' })
      requestAnimationFrame(() => {
        if (el) el.style.transition = ''
      })
    })
    ro.observe(nav)
    return () => ro.disconnect()
  }, [])

  const navLinkClass = 'relative z-10 rounded-lg px-3 py-1.5 text-sm font-bold text-white/70 transition-colors hover:text-white sm:px-4 sm:py-2 [&.active]:text-white'

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="header-glow sticky top-0 z-40 bg-brand-900/80 backdrop-blur-sm">
        <Container className="flex h-auto min-h-[4rem] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
          <Link to="/" className="shrink-0 text-base font-bold text-white tracking-tight sm:text-lg">
            mychildcare<span className="text-accent-400">subsidy</span>.au
          </Link>
          <nav ref={navRef} className="relative flex flex-wrap items-center gap-x-0.5 gap-y-1 sm:gap-x-1">
            <div
              ref={pillRef}
              className={`absolute top-0 h-full rounded-lg bg-gradient-to-b transition-all duration-300 ease-out ${pill.route === '/ccs' ? 'from-brand-600 to-brand-800' : 'from-accent-400 to-accent-600'}`}
              style={{ left: pill.left, width: pill.width, opacity: pill.opacity }}
            />
            <Link to="/ccs" className={navLinkClass}>
              CCS
            </Link>
            <span className="mx-1 hidden text-white/20 sm:inline">|</span>
            {/* State calculators - alphabetical */}
            <Link to="/act" className={navLinkClass}>ACT</Link>
            <Link to="/nsw" className={navLinkClass}>NSW</Link>
            <Link to="/qld" className={navLinkClass}>QLD</Link>
            <Link to="/vic" className={navLinkClass}>VIC</Link>
          </nav>
        </Container>
      </header>

      <main className="flex-1 pb-16">
        <SharedCalculatorProvider>
          <Outlet />
        </SharedCalculatorProvider>
      </main>

      <footer className="footer-glow bg-brand-900">
        <Container className="py-8 text-center text-xs text-white/50 space-y-2">
          <p>
            This calculator provides estimates only and should not be taken as financial advice.
            Actual costs may vary.
          </p>
          <p>
            Federal CCS rates based on FY2025-26 (July 2025 &ndash; June 2026).
            State and territory program rates based on calendar year 2025-26.
          </p>
        </Container>
      </footer>
    </div>
  )
}
