/** A plate with a crosshair, a fork, a knife and a flag: the empty state for Spots. Drawn with theme tokens only (see components.css). */
export function EmptyArt() {
  return (
    <svg className="empty-art" viewBox="0 0 200 140" aria-hidden="true" focusable="false">
      <ellipse className="art-shadow" cx="100" cy="126" rx="62" ry="7" />
      <circle className="art-plate" cx="100" cy="70" r="54" />
      <circle className="art-inner" cx="100" cy="70" r="40" strokeWidth="2" />
      <g className="art-aim" fill="none" strokeWidth="3.5" strokeLinecap="round">
        <circle cx="100" cy="70" r="19" />
        <path d="M100 41v12M100 87v12M71 70h12M117 70h12" />
      </g>
      <circle className="art-dot" cx="100" cy="70" r="4.5" />
      <g className="art-cutlery" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M28 46v10a6 6 0 0 0 12 0V46M34 46v54" />
        <path d="M168 46c-9 8-9 26 0 32M168 46v54" />
      </g>
      <path className="art-flag" d="M151 34V14l16 5-16 6" fill="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
