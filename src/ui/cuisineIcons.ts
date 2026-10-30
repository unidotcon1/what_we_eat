const ICONS: Record<string, string> = {
  Chinese: '🥟',
  Japanese: '🍣',
  Western: '🍝',
  Indian: '🍛',
  Korean: '🍲',
  Thai: '🍜',
  Malay: '🍢',
  Cafe: '☕',
  Dessert: '🍨',
}

export function cuisineIcon(cuisine: string): string {
  return ICONS[cuisine] ?? '🍴'
}
