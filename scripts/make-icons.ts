// Draws the app icon (a plate that is also a target) and the Play Store graphics as PNG files, with no image library.
// Usage: npx tsx scripts/make-icons.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'

type Rgb = [number, number, number]

const CHERRY: Rgb = [0x81, 0x01, 0x00]
const COTTON: Rgb = [0xed, 0xeb, 0xdd]
const MAROON: Rgb = [0x63, 0x00, 0x00]

function crc32(buf: Buffer): number {
  let c = ~0
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

/** distance from point (px, py) to the line segment a-b */
function distance_to_segment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// The emblem is drawn on a 512 x 512 canvas, centre (0, 0). Everything sits within 190 of the centre,
// well inside Android's maskable safe zone (a circle of radius 205).
const TICKS: [number, number, number, number][] = [
  [0, -188, 0, -148],
  [0, 148, 0, 188],
  [-188, 0, -148, 0],
  [148, 0, 188, 0],
]

/** Colour of the emblem at (x, y), measured in 512-canvas units from its centre. */
function emblem_color(x: number, y: number): Rgb {
  const d = Math.hypot(x, y)
  if (d <= 28) return CHERRY // bullseye dot
  if (Math.abs(d - 104) <= 4.5) return MAROON // thin ring on the plate
  if (d <= 136) return COTTON // plate
  for (const [ax, ay, bx, by] of TICKS) {
    if (distance_to_segment(x, y, ax, ay, bx, by) <= 9) return COTTON // crosshair ticks
  }
  return CHERRY
}

/** Renders a width x height image; each pixel averages ss x ss samples so edges are smooth. */
function render_png(width: number, height: number, color_at: (x: number, y: number) => Rgb, ss = 4): Buffer {
  const stride = width * 4 + 1
  const rows = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    rows[y * stride] = 0
    for (let x = 0; x < width; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = color_at(x + (sx + 0.5) / ss, y + (sy + 0.5) / ss)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const n = ss * ss
      const i = y * stride + 1 + x * 4
      rows[i] = Math.round(r / n)
      rows[i + 1] = Math.round(g / n)
      rows[i + 2] = Math.round(b / n)
      rows[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** The square app icon. Full-bleed Cherry Red so Android can crop it into a circle or rounded square. */
export function make_icon_png(size: number): Buffer {
  const scale = 512 / size
  return render_png(size, size, (x, y) => emblem_color((x - size / 2) * scale, (y - size / 2) * scale))
}

/** The wide Play Store banner: the emblem centred on Cherry Red. */
export function make_feature_png(width: number, height: number): Buffer {
  const emblem_px = height * 0.92
  const scale = 512 / emblem_px
  return render_png(width, height, (x, y) => emblem_color((x - width / 2) * scale, (y - height / 2) * scale))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync('public', { recursive: true })
  mkdirSync('docs/store', { recursive: true })
  writeFileSync('public/icon-192.png', make_icon_png(192))
  writeFileSync('public/icon-512.png', make_icon_png(512))
  writeFileSync('public/apple-touch-icon.png', make_icon_png(180))
  writeFileSync('docs/store/play-icon-512.png', make_icon_png(512))
  writeFileSync('docs/store/feature-graphic-1024x500.png', make_feature_png(1024, 500))
  console.log('wrote the app icons in public/ and the Play Store graphics in docs/store/')
}
