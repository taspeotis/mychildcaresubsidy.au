import { useState, useEffect } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'

interface StickyPanelProps {
  children: React.ReactNode
  className?: string
}

export function StickyPanel({ children, className }: StickyPanelProps) {
  const [isLg, setIsLg] = useState(false)
  const [prefersReduced, setPrefersReduced] = useState(false)
  const { scrollY } = useScroll()
  const smoothScrollY = useSpring(scrollY, { damping: 20, stiffness: 100 })
  const lagY = useTransform(() => (isLg && !prefersReduced) ? smoothScrollY.get() - scrollY.get() : 0)

  useEffect(() => {
    const lgMql = window.matchMedia('(min-width: 1024px)')
    const motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsLg(lgMql.matches)
    setPrefersReduced(motionMql.matches)
    const lgHandler = (e: MediaQueryListEvent) => setIsLg(e.matches)
    const motionHandler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    lgMql.addEventListener('change', lgHandler)
    motionMql.addEventListener('change', motionHandler)
    return () => {
      lgMql.removeEventListener('change', lgHandler)
      motionMql.removeEventListener('change', motionHandler)
    }
  }, [])

  return (
    <div className="lg:sticky lg:top-20 lg:self-start">
      <motion.div className={className} style={{ y: lagY }}>
        {children}
      </motion.div>
    </div>
  )
}
