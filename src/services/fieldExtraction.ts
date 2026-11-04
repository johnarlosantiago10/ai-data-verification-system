import type { VerificationRule } from '../types'

export const DEFAULT_FIELDS = [
  'Full Name',
  'Identification Number',
  'Date',
  'Address',
  'Department',
  'Quantity',
  'Amount',
]

export function inferVerificationRules(fields: string[]): VerificationRule[] {
  return fields.map((field) => {
    const normalized = field.toLowerCase()
    const numeric = normalized.includes('quantity') || normalized.includes('amount')
    const date = normalized === 'date' || normalized.includes('date')
    return {
      field,
      enabled: true,
      type: numeric ? 'numeric' : date ? 'date' : normalized.includes('name') || normalized.includes('address') ? 'normalized' : 'exact',
      tolerance: numeric ? 0 : 0,
      dateFormat: 'YYYY-MM-DD',
      required: field !== 'Department' && field !== 'Address',
    }
  })
}

export function extractFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const patterns: Record<string, RegExp> = {
    'Full Name': /\b(?:full\s*name|name)\s*[:=-]\s*(.+)/i,
    'Identification Number': /\b(?:identification\s*(?:number|no\.?|id)|id\s*number|reference\s*(?:number|no\.?))\s*[:=-]\s*([\w-]+)/i,
    'Date': /\b(?:date|issued(?:\s+on)?|birth\s*date)\s*[:=-]\s*(.+)/i,
    'Address': /\baddress\s*[:=-]\s*(.+)/i,
    'Department': /\bdepartment\s*[:=-]\s*(.+)/i,
    'Quantity': /\b(?:quantity|qty)\s*[:=-]\s*([\d,.]+)/i,
    'Amount': /\b(?:amount|total|price)\s*[:=-]\s*([$€£]?\s*[\d,.]+)/i,
  }

  Object.entries(patterns).forEach(([field, pattern]) => {
    const match = text.match(pattern)
    if (match?.[1]) fields[field] = cleanValue(match[1])
  })

  const csvLines = text.split(/\r?\n/).filter(Boolean)
  if (csvLines.length > 1) {
    const headers = csvLines[0].split(/[\t,]/).map(normalizeHeader)
    const values = csvLines[1].split(/[\t,]/)
    headers.forEach((header, index) => {
      const field = DEFAULT_FIELDS.find((candidate) => normalizeHeader(candidate) === header || header.includes(normalizeHeader(candidate)))
      if (field && !fields[field] && values[index]?.trim()) fields[field] = values[index].trim()
    })
  }

  return fields
}

export function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function cleanValue(value: string) {
  return value.replace(/[,\t].*$/, '').trim()
}
