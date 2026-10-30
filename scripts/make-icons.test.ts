import { inflateSync } from 'node:zlib'
import { makePng } from './make-icons'

function readPng(buf: Buffer) {
  const sig = buf.subarray(0, 8).toString('hex')
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  return { sig, width, height }
}

test('makePng produces a valid PNG of the requested size', () => {
  const png = makePng(64)
  const { sig, width, height } = readPng(png)
  expect(sig).toBe('89504e470d0a1a0a')
  expect(width).toBe(64)
  expect(height).toBe(64)
})

test('the icon uses the brand colours: Cherry Red background and a Cotton centre', () => {
  const size = 32
  const png = makePng(size)
  // find the IDAT chunk and inflate it back to raw scanlines (1 filter byte + RGBA per row)
  let offset = 8
  const idat: Buffer[] = []
  while (offset < png.length) {
    const len = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString()
    if (type === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + len))
    offset += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const pixel = (x: number, y: number) => {
    const i = y * (size * 4 + 1) + 1 + x * 4
    return [raw[i], raw[i + 1], raw[i + 2], raw[i + 3]]
  }
  expect(pixel(0, 0)).toEqual([0x81, 0x01, 0x00, 255])
  expect(pixel(size / 2, size / 2)).toEqual([0xed, 0xeb, 0xdd, 255])
})
