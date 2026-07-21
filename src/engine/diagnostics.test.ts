/**
 * Full diagnostics suite — mirrors the in-app Diagnostics panel.
 * If any check fails, read `failureHint` on that check for the fix path.
 */
import { describe, expect, it } from 'vitest'
import { runEngineDiagnostics } from './diagnostics'

describe('Engine diagnostics (smoke suite for “something stopped working”)', () => {
  it('overall status is pass when all engines are healthy', () => {
    const report = runEngineDiagnostics(44100)
    const failures = report.checks.filter((c) => c.status === 'fail')
    expect(
      failures,
      failures.map((f) => `${f.id}: ${f.detail} — ${f.failureHint}`).join('\n'),
    ).toHaveLength(0)
    expect(report.overall).toBe('pass')
  })

  it('every check includes a failureHint for operators', () => {
    const report = runEngineDiagnostics()
    for (const check of report.checks) {
      expect(check.failureHint.length, `${check.id} missing failureHint`).toBeGreaterThan(10)
      expect(check.description.length, `${check.id} missing description`).toBeGreaterThan(10)
    }
  })

  it('covers Autotune, Master, Split, Beat, and Voice engines', () => {
    const report = runEngineDiagnostics()
    const engines = new Set(report.checks.map((c) => c.engine))
    for (const needed of ['Autotune', 'Master', 'Split', 'Beat', 'Voice', 'Scales']) {
      expect(engines.has(needed), `Missing diagnostics for ${needed}`).toBe(true)
    }
  })
})
