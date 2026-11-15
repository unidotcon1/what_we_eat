/** Same shapes as the real Explore screen, so nothing jumps when the places arrive. */
export function ExploreSkeleton({ variant = 'details' }: { variant?: 'details' | 'images' }) {
  if (variant === 'images') {
    return (
      <div aria-label="Loading places" aria-busy="true" className="skeleton">
        <div className="sk sk-chips" />
        <div className="sk sk-poster sk-hero" />
        <span className="sk sk-line" style={{ width: '45%', height: 18 }} />
        <div className="sk-row">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="sk sk-poster" />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div aria-label="Loading places" aria-busy="true" className="skeleton">
      <div className="sk sk-chips" />
      <div className="card card-hero sk-card">
        <span className="sk sk-tile" />
        <div className="card-body">
          <span className="sk sk-line" style={{ width: '70%' }} />
          <span className="sk sk-line" style={{ width: '45%' }} />
        </div>
        <span className="sk sk-btn" />
      </div>
      {[62, 70, 55, 66].map((w) => (
        <div key={w} className="card sk-card">
          <span className="sk sk-tile" />
          <div className="card-body">
            <span className="sk sk-line" style={{ width: `${w}%` }} />
            <span className="sk sk-line" style={{ width: '40%' }} />
          </div>
          <span className="sk sk-btn" />
        </div>
      ))}
    </div>
  )
}
