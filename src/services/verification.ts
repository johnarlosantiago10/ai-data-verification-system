import type { VerificationFinding, VerificationRule, VerificationSummary, VerificationDocument } from '../types'

export function runVerification(
  masterFields: Record<string, string>,
  documents: VerificationDocument[],
  rules: VerificationRule[],
) {
  const findings: VerificationFinding[] = []
  const signatures = new Map<string, string[]>()

  documents.forEach((document) => {
    const identity = rules.find((rule) => rule.field === 'Identification Number' && rule.enabled)?.field
    const signature = identity ? (document.fields[identity] ?? '').trim().toLowerCase() : document.file.name.toLowerCase()
    const signatureKey = signature || 'unknown'
    signatures.set(signatureKey, [...(signatures.get(signatureKey) ?? []), document.file.name])

    rules.filter((rule) => rule.enabled).forEach((rule) => {
      const expected = masterFields[rule.field]
      const actual = document.fields[rule.field]
      const comparison = compareValue(expected, actual, rule)

      findings.push({
        id: `${document.id}-${rule.field}`,
        documentName: document.file.name,
        field: rule.field,
        masterValue: expected ?? '',
        documentValue: actual ?? '',
        status: comparison.status,
        reference: document.reference,
        reason: comparison.reason,
      })
    })
  })

  signatures.forEach((names, signature) => {
    if (signature !== 'unknown' && names.length > 1) {
      names.forEach((name) => {
        findings.push({
          id: `duplicate-${name}-${signature}`,
          documentName: name,
          field: 'Duplicate record',
          masterValue: signature,
          documentValue: signature,
          status: 'NEEDS REVIEW',
          reference: 'Document set',
          reason: `${names.length} uploaded documents contain the same identification value.`,
        })
      })
    }
  })

  const summary = summarize(documents.length, findings)
  return { ...summary, findings } as VerificationSummary
}

function compareValue(expected: string | undefined, actual: string | undefined, rule: VerificationRule) {
  if (!actual?.trim()) {
    return rule.required
      ? { status: 'MISSING' as const, reason: `Required field "${rule.field}" is absent.` }
      : { status: 'NEEDS REVIEW' as const, reason: 'Optional field is absent.' }
  }
  if (!expected?.trim()) {
    return { status: 'NEEDS REVIEW' as const, reason: 'Master reference value is absent.' }
  }

  let matches = false
  let reason = ''
  if (rule.type === 'numeric') {
    const expectedNumber = Number(expected.replace(/[^0-9.-]/g, ''))
    const actualNumber = Number(actual.replace(/[^0-9.-]/g, ''))
    matches = Number.isFinite(expectedNumber) && Number.isFinite(actualNumber)
      && Math.abs(expectedNumber - actualNumber) <= rule.tolerance
    reason = matches ? 'Numeric values are within tolerance.' : `Numeric values differ by more than tolerance ${rule.tolerance}.`
  } else if (rule.type === 'date') {
    matches = normalizeDate(expected) === normalizeDate(actual)
    reason = matches ? 'Dates identify the same calendar day.' : 'Dates do not match.'
  } else if (rule.type === 'normalized') {
    matches = normalizeText(expected) === normalizeText(actual)
    reason = matches ? 'Text matches after normalization.' : 'Normalized text values differ.'
  } else {
    matches = expected.trim() === actual.trim()
    reason = matches ? 'Values match exactly.' : 'Values differ exactly.'
  }

  return matches
    ? { status: 'VERIFIED' as const, reason }
    : { status: 'MISMATCH' as const, reason }
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ')
}

function normalizeDate(value: string) {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString().slice(0, 10)
}

function summarize(documentCount: number, findings: VerificationFinding[]): VerificationSummary {
  const statusCount = {
    verified: findings.filter((finding) => finding.status === 'VERIFIED').length,
    mismatches: findings.filter((finding) => finding.status === 'MISMATCH').length,
    missing: findings.filter((finding) => finding.status === 'MISSING').length,
    review: findings.filter((finding) => finding.status === 'NEEDS REVIEW').length,
    documents: documentCount,
    findings: [],
  }
  return { ...statusCount, findings: [] }
}
