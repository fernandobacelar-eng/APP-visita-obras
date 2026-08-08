import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
