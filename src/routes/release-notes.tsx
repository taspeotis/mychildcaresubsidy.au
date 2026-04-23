import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import clsx from 'clsx'
import { Container } from '../components/Container'
import { StickyPanel } from '../components/StickyPanel'

export const Route = createFileRoute('/release-notes')({
  component: ReleaseNotes,
})

interface Release {
  date: string
  id: string
  changes: string[]
}

const RELEASES: Release[] = [
  {
    date: '23 April 2026',
    id: '2026-04-23',
    changes: [
      'Save estimates for each of your children and see a fortnightly household total in one place. Use the new Estimates page to edit or remove any estimate later.',
      'Optional child name and service name fields on every calculator, used to label saved estimates.',
      'Your estimates are saved in your browser, so they\'re still there when you come back.',
    ],
  },
  {
    date: '29 March 2026',
    id: '2026-03-29',
    changes: [
      'Weekly calculation mode on all calculators. Pick your days for one week and see your weekly cost. If CCS hours run short in the second week, both weeks are shown separately.',
      'Quick day picker for faster fortnightly and weekly setup. Tap day circles to toggle attendance instead of opening each day. New days copy your existing fee and times.',
      'Session details now shown in weekly and fortnightly modes so you can set fee and times once as defaults.',
      'QLD Free Kindy now supports 12/18 and 18/12 kindy hour splits across the fortnight.',
      'Time pickers now work in 15-minute increments.',
    ],
  },
  {
    date: '14 March 2026',
    id: '2026-03-14',
    changes: [
      'If Centrelink is recovering a debt from your CCS payments, you can now factor that into your estimates. Available in the CCS details section on all calculators.',
    ],
  },
  {
    date: '9 February 2026',
    id: '2026-02-09',
    changes: [
      'Updated all calculators to FY2025-26 CCS hourly rate caps and income thresholds.',
      'Simple and detailed result views. The detailed view shows how each number is calculated.',
      'Calculator inputs are now shared across pages. Set your CCS percentage once and it carries over.',
      'Activity test updated to the 2026 "3 Day Guarantee" (72 or 100 hours per fortnight).',
    ],
  },
  {
    date: '7 February 2026',
    id: '2026-02-07',
    changes: [
      'Federal CCS calculator for centre-based day care, family day care, and outside school hours care.',
    ],
  },
  {
    date: '6 February 2026',
    id: '2026-02-06',
    changes: [
      'NSW Start Strong calculator with annual fee relief tiers.',
      'VIC Free Kinder calculator with annual offset for standard and priority cohorts.',
      'Fortnightly mode on all calculators with per-day fee, time, and kindy settings.',
    ],
  },
  {
    date: '3 February 2026',
    id: '2026-02-03',
    changes: [
      'ACT Free 3-Year-Old Preschool calculator with 300 funded hours per year.',
    ],
  },
  {
    date: '2 February 2026',
    id: '2026-02-02',
    changes: [
      'Launched with the QLD Free Kindy calculator, covering CCS and Queensland\'s 30 funded hours per fortnight.',
    ],
  },
]

function ReleaseNotes() {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const navRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())

  const setLinkRef = useCallback((id: string, el: HTMLAnchorElement | null) => {
    if (el) linkRefs.current.set(id, el)
    else linkRefs.current.delete(id)
  }, [])

  // Track which release cards are ≥50% visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleIds((prev) => {
          const next = new Set(prev)
          for (const entry of entries) {
            if (entry.isIntersecting) next.add(entry.target.id)
            else next.delete(entry.target.id)
          }
          return next
        })
      },
      { threshold: 0.5 },
    )
    for (const release of RELEASES) {
      const el = document.getElementById(release.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  // Position the pill behind the visible TOC links
  useLayoutEffect(() => {
    const pill = pillRef.current
    if (!pill || visibleIds.size === 0) {
      if (pill) pill.style.opacity = '0'
      return
    }

    // Find first and last visible indices
    let first = -1
    let last = -1
    for (let i = 0; i < RELEASES.length; i++) {
      if (visibleIds.has(RELEASES[i].id)) {
        if (first === -1) first = i
        last = i
      }
    }
    if (first === -1) {
      pill.style.opacity = '0'
      return
    }

    const firstEl = linkRefs.current.get(RELEASES[first].id)
    const lastEl = linkRefs.current.get(RELEASES[last].id)
    if (!firstEl || !lastEl) return

    const nav = navRef.current
    if (!nav) return
    const navRect = nav.getBoundingClientRect()
    const firstRect = firstEl.getBoundingClientRect()
    const lastRect = lastEl.getBoundingClientRect()

    pill.style.top = `${firstRect.top - navRect.top}px`
    pill.style.height = `${lastRect.bottom - firstRect.top}px`
    pill.style.opacity = '1'
  }, [visibleIds])

  return (
    <Container className="py-10">
      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-10 xl:grid-cols-[360px_1fr]">
        {/* Sidebar */}
        <aside className="relative mb-8 lg:mb-0">
          <StickyPanel className="rounded-2xl sidebar-gradient p-6 lg:p-8">
            <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors mb-5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back
            </Link>
            <h1 className="text-2xl font-bold leading-tight text-white mb-6">Release Notes</h1>
            <nav ref={navRef} className="relative space-y-1">
              <div
                ref={pillRef}
                className="absolute left-0 w-full rounded-lg bg-white/15 transition-all duration-300 ease-out"
                style={{ opacity: 0 }}
              />
              {RELEASES.map((release) => (
                <a
                  key={release.id}
                  ref={(el) => setLinkRef(release.id, el)}
                  href={`#${release.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    document.getElementById(release.id)?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className={clsx(
                    'relative block rounded-lg px-3 py-2 text-sm transition-colors',
                    visibleIds.has(release.id)
                      ? 'font-bold text-white'
                      : 'text-white/60 hover:text-white',
                  )}
                >
                  {release.date}
                </a>
              ))}
            </nav>
          </StickyPanel>
        </aside>

        {/* Main content */}
        <div className="min-w-0 space-y-6">
          {RELEASES.map((release) => (
            <div key={release.id} id={release.id} className="rounded-2xl card-glass p-6 sm:p-8 scroll-mt-24">
              <h2 className="text-lg font-bold text-slate-900 mb-4">{release.date}</h2>
              <ul className="list-disc pl-5 space-y-2 marker:text-brand-400">
                {release.changes.map((change, i) => (
                  <li key={i} className="text-sm text-slate-700 pl-1">
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Container>
  )
}
