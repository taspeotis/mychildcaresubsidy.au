export function NavCountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      aria-label={`${count} ${count === 1 ? 'entry' : 'entries'} in plan`}
      className="absolute -top-1 -right-1 z-20 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-accent-600 shadow-sm ring-2 ring-brand-900"
    >
      {count}
    </span>
  )
}
