import { describe, expect, it } from 'vitest'
import { langForPath } from '../src/lang.js'

describe('langForPath', () => {
  it('maps known source extensions to a language id', () => {
    expect(langForPath('src/index.ts')).toBe('typescript')
    expect(langForPath('app.py')).toBe('python')
    expect(langForPath('main.go')).toBe('go')
    expect(langForPath('README.md')).toBe('markdown')
  })

  it('is case-insensitive on the extension', () => {
    expect(langForPath('Component.TSX')).toBe('typescriptreact')
  })

  it('returns null for unknown or extensionless files', () => {
    expect(langForPath('logo.png')).toBeNull()
    expect(langForPath('Makefile')).toBeNull()
    expect(langForPath('archive.tar.gz')).toBeNull()
  })
})
