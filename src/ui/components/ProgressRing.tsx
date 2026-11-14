import type { ReactNode } from 'react'

const RADIUS = 50
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** The part of the circle still to draw: all of it when empty, none when full. Out-of-range values are held to 0..max. */
export function ring_offset(value: number, max: number, circumference: number): number {
  if (max <= 0) return circumference
  const share = Math.min(1, Math.max(0, value / max))
  return circumference * (1 - share)
}

type Props = { value: number; max: number; label: string; children?: ReactNode }

/** One ring, one spoken label. The arc is a CSS transition, so it only moves when the number changes, and not at all with reduced motion. */
export function ProgressRing({ value, max, label, children }: Props) {
  return (
    <div className="ring" role="img" aria-label={label}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="ring-track" cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="11" />
        <circle
          className="ring-arc"
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={ring_offset(value, max, CIRCUMFERENCE)}
        />
      </svg>
      <div className="ring-mid">{children}</div>
    </div>
  )
}
