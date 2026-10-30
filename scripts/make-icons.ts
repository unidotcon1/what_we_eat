import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'

const CHERRY = [0x81, 0x01, 0x00]
const COTTON = [0xed, 0xeb, 0xdd]
const MAROON = [0x63, 0x00, 0x00]

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

/** A plain plate: Cherry Red square, Cotton plate with a Maroon rim. Safe-zone friendly for maskable icons. */
export function makePng(size: number): Buffer {
  const rows = Buffer.alloc(size * (size * 4 + 1))
  const c = size / 2
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / size
      const rgb = d < 0.2 ? COTTON : d < 0.26 ? MAROON : d < 0.34 ? COTTON : CHERRY
      const i = y * (size * 4 + 1) + 1 + x * 4
      rows[i] = rgb[0]
      rows[i + 1] = rgb[1]
      rows[i + 2] = rgb[2]
      rows[i + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  mkdirSync('public', { recursive: true })
  for (const size of [192, 512]) writeFileSync(`public/icon-${size}.png`, makePng(size))
  console.log('wrote public/icon-192.png and public/icon-512.png')
}
