import { inflateSync } from 'node:zlib'
import { make_feature_png, make_icon_png } from './make-icons'

function decode(png: Buffer) {
  const width = png.readUInt32BE(16)
  const height = png.readUInt32BE(20)
  let offset = 8
  const idat: Buffer[] = []
  while (offset < png.length) {
    const len = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString()
    if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + len))
    offset += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * 4 + 1
  const pixel = (x: number, y: number) => {
    const i = y * stride + 1 + x * 4
    return [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]]
  }
  return { width, height, pixel, signature: png.subarray(0, 8).toString('hex') }
}

const CHERRY = [0x81, 0x01, 0x00, 255]
const COTTON = [0xed, 0xeb, 0xdd, 255]
const MAROON = [0x63, 0x00, 0x00, 255]

test('make_icon_png produces a valid square PNG of the requested size', () => {
  const img = decode(make_icon_png(64))
  expect(img.signature).toBe('89504e470d0a1a0a')
  expect(img.width).toBe(64)
  expect(img.height).toBe(64)
})

describe('the icon is the plate that is a target', () => {
  const img = decode(make_icon_png(64))

  test('the background is Cherry Red, right to the corners (so Android can crop it)', () => {
    expect(img.pixel(0, 0)).toEqual(CHERRY)
    expect(img.pixel(63, 63)).toEqual(CHERRY)
  })

  test('the bullseye dot in the middle is Cherry Red', () => {
    expect(img.pixel(32, 32)).toEqual(CHERRY)
  })

  test('the plate is Cotton', () => {
    expect(img.pixel(40, 32)).toEqual(COTTON)
  })

  test('the thin ring on the plate is Maroon (checked at full size, where the ring is 9 pixels wide)', () => {
    const full = decode(make_icon_png(512))
    expect(full.pixel(256 + 104, 256)).toEqual(MAROON)
    expect(full.pixel(256, 256 - 104)).toEqual(MAROON)
  })

  test('outside the plate, off the axes, it is Cherry Red again', () => {
    expect(img.pixel(50, 24)).toEqual(CHERRY)
  })

  test('the crosshair ticks outside the plate are Cotton', () => {
    expect(img.pixel(32, 11)).toEqual(COTTON) // top
    expect(img.pixel(32, 53)).toEqual(COTTON) // bottom
    expect(img.pixel(11, 32)).toEqual(COTTON) // left
    expect(img.pixel(53, 32)).toEqual(COTTON) // right
  })

  test('everything stays inside the Android safe zone (nothing near the corners)', () => {
    const corner = img.pixel(5, 5)
    expect(corner).toEqual(CHERRY)
  })

  test('edges are smoothed: a pixel on the plate edge is a blend, not a hard step', () => {
    const big = decode(make_icon_png(512))
    // the plate edge is 136 px from the centre; find a blended pixel along the horizontal axis (off the tick axis)
    const row = 256 + 60
    let blended = 0
    for (let x = 256 + 120; x < 256 + 150; x++) {
      const p = big.pixel(x, row)
      const is_pure = [CHERRY, COTTON, MAROON].some((c) => c.every((v, i) => v === p[i]))
      if (!is_pure) blended++
    }
    expect(blended).toBeGreaterThan(0)
  })
})

test('the feature graphic is the wide Play Store banner size, with the emblem centred on Cherry Red', () => {
  const img = decode(make_feature_png(1024, 500))
  expect(img.width).toBe(1024)
  expect(img.height).toBe(500)
  expect(img.pixel(5, 5)).toEqual(CHERRY)
  expect(img.pixel(1018, 494)).toEqual(CHERRY)
  expect(img.pixel(512, 250)).toEqual(CHERRY) // bullseye dot at the centre
  expect(img.pixel(512 + 80, 250)).toEqual(COTTON) // plate
})

test('the icon files the app ships are present and the right size', async () => {
  const { readFileSync } = await import('node:fs')
  const size_of = (path: string) => {
    const b = readFileSync(path)
    return [b.readUInt32BE(16), b.readUInt32BE(20)]
  }
  expect(size_of('public/icon-192.png')).toEqual([192, 192])
  expect(size_of('public/icon-512.png')).toEqual([512, 512])
  expect(size_of('public/apple-touch-icon.png')).toEqual([180, 180])
  expect(size_of('docs/store/play-icon-512.png')).toEqual([512, 512])
  expect(size_of('docs/store/feature-graphic-1024x500.png')).toEqual([1024, 500])
})

test('the page links the iPhone home-screen icon and a browser tab icon', async () => {
  const { readFileSync } = await import('node:fs')
  const html = readFileSync('index.html', 'utf8')
  expect(html).toMatch(/rel="apple-touch-icon"\s+href="\/apple-touch-icon\.png"/)
  expect(html).toMatch(/rel="icon"[^>]*href="\/icon-192\.png"/)
})
