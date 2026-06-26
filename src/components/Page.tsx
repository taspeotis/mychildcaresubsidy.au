import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Container } from './Container'
import { StickyPanel } from './StickyPanel'

interface PageProps {
  /** Page heading, shown white-on-dark in the sidebar panel. */
  title: string
  /** Extra sidebar content below the heading (intro copy, a table of contents, etc.). */
  sidebar?: ReactNode
  /** Main content column, typically one or more `card-glass` sections. */
  children: ReactNode
}

/**
 * Shared layout for top-level content/utility pages (Settings, Release Notes,
 * Privacy). A dark `sidebar-gradient` panel on the left holds the back link,
 * heading, and any sidebar content (all white text); the right column holds the
 * `card-glass` content. Keeping the shell here means new pages get the correct,
 * accessible layout for free — page text never lands directly on the dark
 * `bg-page` background, where dark `slate-*` headings/links would fail contrast.
 */
export function Page({ title, sidebar, children }: PageProps) {
  return (
    <Container className="py-10">
      <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-10 xl:grid-cols-[360px_1fr]">
        <aside className="relative mb-8 lg:mb-0">
          <StickyPanel className="rounded-2xl sidebar-gradient p-6 lg:p-8">
            <Link
              to="/"
              className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back
            </Link>
            <h1 className="mb-3 text-2xl font-bold leading-tight tracking-tight text-white">{title}</h1>
            {sidebar}
          </StickyPanel>
        </aside>

        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </Container>
  )
}
