import { useState, useEffect } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'

interface StickyPanelProps {
  children: React.ReactNode
  className?: string
}

export function StickyPanel({ children, className }: StickyPanelProps) {
  const [isLg, setIsLg] = useState(false)
  const { scrollY } = useScroll()
  const smoothScrollY = useSpring(scrollY, { damping: 20, stiffness: 100 })
  const lagY = useTransform(() => isLg ? smoothScrollY.get() - scrollY.get() : 0)

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    setIsLg(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return (
    <div className="lg:sticky lg:top-20 lg:self-start">
      <motion.div className={className} style={{ y: lagY }}>
        {children}
      </motion.div>
    </div>
  )
}
