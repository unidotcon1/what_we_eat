export function SuggestLink({ url }: { url: string | undefined }) {
  if (!url) return null
  return (
    <p className="sub">
      Missing a place?{' '}
      <a href={url} target="_blank" rel="noreferrer">
        Suggest a restaurant
      </a>
    </p>
  )
}
