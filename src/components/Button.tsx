import { Link } from '@tanstack/react-router'
import clsx from 'clsx'

const baseStyles = {
  solid:
    'inline-flex justify-center rounded-xl py-3 px-6 text-sm font-bold tracking-tight shadow-md transition-all duration-200',
  outline:
    'inline-flex justify-center rounded-xl border-2 py-[calc(theme(spacing.3)-2px)] px-[calc(theme(spacing.6)-2px)] text-sm font-bold tracking-tight transition-all duration-200',
}

const variantStyles = {
  solid: {
    accent:
      'bg-gradient-to-b from-accent-400 to-accent-600 text-white hover:from-accent-300 hover:to-accent-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 active:from-accent-500 active:to-accent-700',
    slate:
      'bg-gradient-to-b from-brand-700 to-brand-900 text-white hover:from-brand-600 hover:to-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-800 active:from-brand-800 active:to-brand-950',
    white:
      'bg-gradient-to-b from-white to-slate-50 text-accent-500 shadow-sm hover:to-white hover:text-accent-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:from-slate-50 active:to-slate-100',
  },
  outline: {
    accent:
      'border-accent-400 text-accent-500 hover:border-accent-300 hover:bg-accent-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500',
    slate:
      'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600',
  },
}

type ButtonProps = (
  | { variant?: 'solid'; color?: keyof typeof variantStyles.solid }
  | { variant: 'outline'; color?: keyof typeof variantStyles.outline }
) &
  (
    | ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'color'>)
    | ({ href?: undefined } & Omit<React.ComponentPropsWithoutRef<'button'>, 'color'>)
  )

export function Button({ className, ...props }: ButtonProps) {
  const variant = props.variant ?? 'solid'
  const color = props.color ?? 'accent'

  const classes = clsx(
    baseStyles[variant],
    variant === 'outline'
      ? variantStyles.outline[color as keyof typeof variantStyles.outline]
      : variantStyles.solid[color as keyof typeof variantStyles.solid],
    className,
  )

  if (typeof props.href === 'string') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variant: _, color: __, ...linkProps } = props as { variant?: string; color?: string; href: string } & Record<string, unknown>
    return <Link className={classes} to={linkProps.href} {...linkProps} />
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _, color: __, ...buttonProps } = props as { variant?: string; color?: string } & React.ComponentPropsWithoutRef<'button'>
  return <button className={classes} {...buttonProps} />
}
