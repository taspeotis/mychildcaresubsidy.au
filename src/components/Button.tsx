import { Link } from '@tanstack/react-router'
import clsx from 'clsx'

const baseStyles = {
  solid:
    'inline-flex justify-center rounded-lg py-2 px-4 text-sm font-semibold tracking-tight shadow-sm transition-colors',
  outline:
    'inline-flex justify-center rounded-lg border py-[calc(theme(spacing.2)-1px)] px-[calc(theme(spacing.4)-1px)] text-sm font-semibold tracking-tight transition-colors',
}

const variantStyles = {
  solid: {
    teal: 'bg-teal-600 text-white hover:bg-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:bg-teal-700',
    slate:
      'bg-slate-900 text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:bg-slate-700',
    white:
      'bg-white text-teal-600 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:bg-teal-50',
  },
  outline: {
    teal: 'border-teal-300 text-teal-600 hover:border-teal-400 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600',
    slate:
      'border-slate-200 text-slate-900 hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600',
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
  const color = props.color ?? 'teal'

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
