import type { ReactNode } from 'react'

type Props = { title: string; on_more(): void; children: ReactNode }

/** One titled row of posters. It scrolls sideways and snaps, so the next poster peeks in to invite a swipe. */
export function Shelf({ title, on_more, children }: Props) {
  return (
    <section className="shelf" aria-label={title}>
      <header className="shelf-head">
        <h2>{title}</h2>
        <button type="button" className="text-btn" aria-label={`View more ${title}`} onClick={on_more}>
          View more
        </button>
      </header>
      <div className="shelf-track">{children}</div>
    </section>
  )
}
