import { type ReactNode } from 'react'
import clsx from 'clsx'

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={clsx(
        'rounded-sm border border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-panel)_88%,transparent)] p-5 backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-muted)]">
      {children}
    </label>
  )
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 0.01,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  display?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-xs text-[var(--color-copper-bright)]">
          {display ?? value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--color-line)] accent-[var(--color-copper)]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[] | T[]
  onChange: (v: T) => void
}) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      <select
        className="w-full rounded-sm border border-[var(--color-line)] bg-[var(--color-ink-soft)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none focus:border-[var(--color-copper)]"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mb-4 flex w-full items-center justify-between rounded-sm border border-[var(--color-line)] px-3 py-2 text-left text-sm transition hover:border-[var(--color-copper)]"
    >
      <span className="text-[var(--color-muted)]">{label}</span>
      <span
        className={clsx(
          'rounded-sm px-2 py-0.5 text-xs font-medium uppercase tracking-wider',
          checked
            ? 'bg-[var(--color-copper)]/20 text-[var(--color-copper-bright)]'
            : 'bg-[var(--color-line)] text-[var(--color-muted)]',
        )}
      >
        {checked ? 'On' : 'Off'}
      </span>
    </button>
  )
}

export function PrimaryButton({
  children,
  onClick,
  variant = 'primary',
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'primary' | 'ghost'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-sm px-4 py-2.5 text-sm font-medium tracking-wide transition',
        variant === 'primary' &&
          'bg-[var(--color-copper)] text-[var(--color-ink)] hover:bg-[var(--color-copper-bright)]',
        variant === 'ghost' &&
          'border border-[var(--color-line)] text-[var(--color-cream)] hover:border-[var(--color-copper)]',
      )}
    >
      {children}
    </button>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</div>
      <div className="mt-1 font-display text-2xl text-[var(--color-cream)]">{value}</div>
    </div>
  )
}
