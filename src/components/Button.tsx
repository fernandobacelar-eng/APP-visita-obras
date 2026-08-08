import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-brand text-white active:bg-brand-dark disabled:bg-gray-300',
  secondary: 'bg-white text-brand border-2 border-brand active:bg-brand/10 disabled:border-gray-300 disabled:text-gray-400',
  accent: 'bg-accent text-brand-dark active:bg-accent-dark disabled:bg-gray-300',
  danger: 'bg-white text-status-pendencia border-2 border-status-pendencia active:bg-status-pendencia/10',
  ghost: 'bg-transparent text-brand active:bg-brand/10',
}

export function Button({ variant = 'primary', fullWidth, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`min-h-14 rounded-xl px-5 text-lg font-semibold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
