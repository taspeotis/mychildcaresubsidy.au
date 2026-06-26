import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'

declare global {
  interface Window {
    goatcounter?: {
      no_onload?: boolean
      count?: (vars?: { path?: string; title?: string; referrer?: string; event?: boolean }) => void
    }
  }
}

/**
 * Pageview tracking via GoatCounter (https://www.goatcounter.com).
 *
 * GoatCounter is privacy-friendly: no cookies, no cross-site tracking, no
 * personal data. We only record which pages get visited. See /privacy.
 *
 * count.js is loaded in index.html with `no_onload`, so it never counts on its
 * own. Because this is a single-page app, we count here on the first view and
 * on every client-side navigation. We send the path explicitly — the site's
 * static `<link rel="canonical" href="/">` would otherwise make count.js
 * attribute every direct page load to "/" (see its get_path()).
 *
 * We send the pathname only (no query string), so the historical-rate links
 * (`?rates=2025-26`) don't fragment the per-page stats.
 */
export function Analytics() {
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelled = false
    let tries = 0
    // count.js loads async; if it isn't ready yet, retry briefly. This only
    // matters for the very first view — later navigations always find it.
    const send = () => {
      if (cancelled) return
      if (window.goatcounter?.count) {
        window.goatcounter.count({ path: pathname })
      } else if (tries++ < 50) {
        setTimeout(send, 100)
      }
    }
    send()
    return () => {
      cancelled = true
    }
  }, [pathname])

  return null
}
