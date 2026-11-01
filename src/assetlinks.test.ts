import { readFileSync } from 'node:fs'

// Android checks this file to let the Google Play app open our website without a browser bar.
// It stays an empty list until the first Play upload gives us the app-signing fingerprint.
const raw = readFileSync('public/.well-known/assetlinks.json', 'utf8')

test('the Android link file is valid JSON and a list', () => {
  const data: unknown = JSON.parse(raw)
  expect(Array.isArray(data)).toBe(true)
})

test('every entry names our Android app and a well-formed SHA-256 fingerprint', () => {
  const entries = JSON.parse(raw) as {
    relation: string[]
    target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] }
  }[]
  for (const e of entries) {
    expect(e.relation).toContain('delegate_permission/common.handle_all_urls')
    expect(e.target.namespace).toBe('android_app')
    expect(e.target.package_name).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/)
    for (const fp of e.target.sha256_cert_fingerprints) expect(fp).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/)
  }
})
