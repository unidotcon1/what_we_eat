export type Tally = { counts: Record<string, number>; leaders: string[] }

export function tally(votes: { optionId: string }[], options: string[]): Tally {
  const counts: Record<string, number> = Object.fromEntries(options.map((o) => [o, 0]))
  for (const v of votes) if (v.optionId in counts) counts[v.optionId]++
  const top = Math.max(0, ...Object.values(counts))
  const leaders = top === 0 ? [] : options.filter((o) => counts[o] === top)
  return { counts, leaders }
}

export function shareLinks(title: string, optionNames: string[], url: string): { whatsapp: string; telegram: string } {
  const list = optionNames.map((n, i) => `${i + 1}. ${n}`).join('\n')
  const body = `${title}\n${list}`
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${body}\nVote: ${url}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(body)}`,
  }
}
