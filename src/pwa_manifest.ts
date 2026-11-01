// The web app manifest: what Android and iPhone read when the app is installed or wrapped for Google Play.
export type ManifestIcon = { src: string; sizes: string; type: string; purpose?: string }
export type ManifestShortcut = { name: string; short_name: string; url: string; icons: ManifestIcon[] }

const icon_192: ManifestIcon = { src: '/icon-192.png', sizes: '192x192', type: 'image/png' }

export const pwa_manifest = {
  id: '/',
  name: 'What We Eat',
  short_name: 'What We Eat',
  description: 'Find a place to eat in Singapore, track your Targets and Conquered Spots, and let friends vote on where to go.',
  lang: 'en-SG',
  start_url: '/',
  scope: '/',
  display: 'standalone' as const,
  orientation: 'portrait' as const,
  background_color: '#1B1717',
  theme_color: '#810100',
  categories: ['food', 'lifestyle'],
  icons: [
    icon_192,
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ] as ManifestIcon[],
  shortcuts: [
    { name: 'My Spots', short_name: 'Spots', url: '/spots', icons: [icon_192] },
    { name: 'Map', short_name: 'Map', url: '/map', icons: [icon_192] },
    { name: 'Add a spot', short_name: 'Add', url: '/add', icons: [icon_192] },
  ] as ManifestShortcut[],
}
