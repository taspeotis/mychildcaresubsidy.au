import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRootRoute, HeadContent, Link, Outlet, useLocation } from '@tanstack/react-router'
import { Container } from '../components/Container'
import { NavCountBadge } from '../components/NavCountBadge'
import { SharedCalculatorProvider } from '../context/SharedCalculatorState'
import { EstimatesProvider, useEstimates } from '../estimates/EstimatesState'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <SharedCalculatorProvider>
      <EstimatesProvider>
        <RootLayoutInner />
      </EstimatesProvider>
    </SharedCalculatorProvider>
  )
}

function RootLayoutInner() {
  const { pathname } = useLocation()
  const { estimates } = useEstimates()
  const estimateCount = estimates.length
  const navRef = useRef<HTMLElement>(null)
  const [pill, setPill] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0, route: '' })
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
    const top = active.offsetTop
    const width = active.offsetWidth
    const height = active.offsetHeight
    const route = active.getAttribute('href') ?? pathname
    if (!wasVisible.current) {
      const el = pillRef.current
      if (el) {
        el.style.transition = 'none'
        void el.offsetLeft
      }
      setPill({ left, top, width, height, opacity: 1, route })
      requestAnimationFrame(() => {
        if (el) el.style.transition = ''
      })
    } else {
      setPill({ left, top, width, height, opacity: 1, route })
    }
    wasVisible.current = true
    // On mobile the nav is horizontally scrollable — keep the active pill in view.
    active.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
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
      setPill({ left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight, opacity: 1, route: active.getAttribute('href') ?? '' })
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
      <HeadContent />
      <header className="header-glow sticky top-0 z-40 bg-brand-900">
        <Container className="flex h-auto min-h-[4rem] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
          <Link to="/" className="shrink-0 inline-flex items-center gap-2">
            <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a856d5"/>
                  <stop offset="1" stopColor="#f87050"/>
                </linearGradient>
              </defs>
              <rect x="2.5" y="2.5" width="27" height="27" rx="7" stroke="url(#logo-grad)" strokeWidth="2.5"/>
              <path d="M16 7v18" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round"/>
              <path d="M21 10H14a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H11" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-base font-bold leading-none tracking-tight text-white sm:text-lg sm:leading-none">my<span className="text-accent-400">childcare</span>subsidy.au</span>
          </Link>
          <nav ref={navRef} className="nav-scroll relative flex w-full flex-nowrap items-center gap-x-0.5 overflow-x-auto sm:w-auto sm:gap-x-1 sm:overflow-visible">
            <div
              ref={pillRef}
              className={`absolute rounded-lg bg-gradient-to-b transition-all duration-300 ease-out ${
                pill.route === '/ccs'
                  ? 'from-brand-600 to-brand-800'
                  : pill.route === '/estimates'
                    ? 'from-teal-500 to-teal-700'
                    : 'from-accent-400 to-accent-600'
              }`}
              style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height, opacity: pill.opacity }}
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
            <span className="mx-1 hidden text-white/20 sm:inline">|</span>
            <Link to="/estimates" className={navLinkClass}>
              Estimates
              <NavCountBadge count={estimateCount} />
            </Link>
          </nav>
        </Container>
      </header>

      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <footer className="footer-glow bg-brand-900">
        <Container className="py-8 text-center text-xs text-white/50 space-y-3">
          <p>These calculators give estimates only, not financial advice. Your actual costs may differ.</p>
          <p>CCS rates applicable to fiscal year 2025&ndash;26. State and territory rates applicable to 2026 calendar year.</p>
          <p>
            This site is{' '}
            <a href="https://github.com/taspeotis/mychildcaresubsidy.au" target="_blank" rel="noopener noreferrer" className="text-white/70 underline underline-offset-2 hover:text-white transition-colors">
              open source
            </a>
            .{' '}
            Found a bug or have a suggestion?{' '}
            <a href="https://github.com/taspeotis/mychildcaresubsidy.au/issues" target="_blank" rel="noopener noreferrer" className="text-white/70 underline underline-offset-2 hover:text-white transition-colors">
              Open an issue
            </a>
            .{' '}
            <Link to="/release-notes" className="text-white/70 underline underline-offset-2 hover:text-white transition-colors">
              Release notes
            </Link>
            .
          </p>
        </Container>
      </footer>
    </div>
  )
}
