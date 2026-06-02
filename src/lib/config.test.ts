import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadConfigWithEnv(env: Record<string, string | undefined>) {
  vi.resetModules()

  const original = {
    RAMTRI_SOLUTIONS_DATA_DIR: process.env.RAMTRI_SOLUTIONS_DATA_DIR,
    RAMTRI_SOLUTIONS_BUILD_DATA_DIR: process.env.RAMTRI_SOLUTIONS_BUILD_DATA_DIR,
    RAMTRI_SOLUTIONS_BUILD_DB_PATH: process.env.RAMTRI_SOLUTIONS_BUILD_DB_PATH,
    RAMTRI_SOLUTIONS_BUILD_TOKENS_PATH: process.env.RAMTRI_SOLUTIONS_BUILD_TOKENS_PATH,
    RAMTRI_SOLUTIONS_DB_PATH: process.env.RAMTRI_SOLUTIONS_DB_PATH,
    RAMTRI_SOLUTIONS_TOKENS_PATH: process.env.RAMTRI_SOLUTIONS_TOKENS_PATH,
    NEXT_PHASE: process.env.NEXT_PHASE,
  }

  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  const mod = await import('./config')

  if (original.RAMTRI_SOLUTIONS_DATA_DIR === undefined) delete process.env.RAMTRI_SOLUTIONS_DATA_DIR
  else process.env.RAMTRI_SOLUTIONS_DATA_DIR = original.RAMTRI_SOLUTIONS_DATA_DIR

  if (original.RAMTRI_SOLUTIONS_BUILD_DATA_DIR === undefined) delete process.env.RAMTRI_SOLUTIONS_BUILD_DATA_DIR
  else process.env.RAMTRI_SOLUTIONS_BUILD_DATA_DIR = original.RAMTRI_SOLUTIONS_BUILD_DATA_DIR

  if (original.RAMTRI_SOLUTIONS_BUILD_DB_PATH === undefined) delete process.env.RAMTRI_SOLUTIONS_BUILD_DB_PATH
  else process.env.RAMTRI_SOLUTIONS_BUILD_DB_PATH = original.RAMTRI_SOLUTIONS_BUILD_DB_PATH

  if (original.RAMTRI_SOLUTIONS_BUILD_TOKENS_PATH === undefined) delete process.env.RAMTRI_SOLUTIONS_BUILD_TOKENS_PATH
  else process.env.RAMTRI_SOLUTIONS_BUILD_TOKENS_PATH = original.RAMTRI_SOLUTIONS_BUILD_TOKENS_PATH

  if (original.RAMTRI_SOLUTIONS_DB_PATH === undefined) delete process.env.RAMTRI_SOLUTIONS_DB_PATH
  else process.env.RAMTRI_SOLUTIONS_DB_PATH = original.RAMTRI_SOLUTIONS_DB_PATH

  if (original.RAMTRI_SOLUTIONS_TOKENS_PATH === undefined) delete process.env.RAMTRI_SOLUTIONS_TOKENS_PATH
  else process.env.RAMTRI_SOLUTIONS_TOKENS_PATH = original.RAMTRI_SOLUTIONS_TOKENS_PATH

  if (original.NEXT_PHASE === undefined) delete process.env.NEXT_PHASE
  else process.env.NEXT_PHASE = original.NEXT_PHASE

  return mod.config
}

describe('config data paths', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('derives db and token paths from RAMTRI_SOLUTIONS_DATA_DIR', async () => {
    const config = await loadConfigWithEnv({
      RAMTRI_SOLUTIONS_DATA_DIR: '/tmp/ramtri-solutions-data',
      RAMTRI_SOLUTIONS_DB_PATH: undefined,
      RAMTRI_SOLUTIONS_TOKENS_PATH: undefined,
    })

    expect(config.dataDir).toBe('/tmp/ramtri-solutions-data')
    expect(config.dbPath).toBe('/tmp/ramtri-solutions-data/ramtri-solutions.db')
    expect(config.tokensPath).toBe('/tmp/ramtri-solutions-data/ramtri-solutions-tokens.json')
  })

  it('respects explicit db and token path overrides', async () => {
    const config = await loadConfigWithEnv({
      RAMTRI_SOLUTIONS_DATA_DIR: '/tmp/ramtri-solutions-data',
      RAMTRI_SOLUTIONS_DB_PATH: '/tmp/custom.db',
      RAMTRI_SOLUTIONS_TOKENS_PATH: '/tmp/custom-tokens.json',
    })

    expect(config.dataDir).toBe('/tmp/ramtri-solutions-data')
    expect(config.dbPath).toBe('/tmp/custom.db')
    expect(config.tokensPath).toBe('/tmp/custom-tokens.json')
  })

  it('uses a build-scoped worker data dir during next build', async () => {
    const config = await loadConfigWithEnv({
      NEXT_PHASE: 'phase-production-build',
      RAMTRI_SOLUTIONS_DATA_DIR: '/tmp/runtime-data',
      RAMTRI_SOLUTIONS_BUILD_DATA_DIR: '/tmp/build-scratch',
      RAMTRI_SOLUTIONS_DB_PATH: undefined,
      RAMTRI_SOLUTIONS_TOKENS_PATH: undefined,
    })

    expect(config.dataDir).toMatch(/^\/tmp\/build-scratch\/worker-\d+$/)
    expect(config.dbPath).toMatch(/^\/tmp\/build-scratch\/worker-\d+\/ramtri-solutions\.db$/)
    expect(config.tokensPath).toMatch(/^\/tmp\/build-scratch\/worker-\d+\/ramtri-solutions-tokens\.json$/)
  })

  it('prefers build-specific db and token overrides during next build', async () => {
    const config = await loadConfigWithEnv({
      NEXT_PHASE: 'phase-production-build',
      RAMTRI_SOLUTIONS_DATA_DIR: '/tmp/runtime-data',
      RAMTRI_SOLUTIONS_DB_PATH: '/tmp/runtime.db',
      RAMTRI_SOLUTIONS_TOKENS_PATH: '/tmp/runtime-tokens.json',
      RAMTRI_SOLUTIONS_BUILD_DB_PATH: '/tmp/build.db',
      RAMTRI_SOLUTIONS_BUILD_TOKENS_PATH: '/tmp/build-tokens.json',
    })

    const expectedBuildRoot = path.join(os.tmpdir(), 'ramtri-solutions-build')
    expect(config.dataDir).toMatch(new RegExp(`^${expectedBuildRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/worker-\\d+$`))
    expect(config.dbPath).toBe('/tmp/build.db')
    expect(config.tokensPath).toBe('/tmp/build-tokens.json')
  })
})
