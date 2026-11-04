export type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface TextChange {
  id: number
  type: ChangeType
  left: string
  right: string
}

export interface ComparisonResult {
  additions: number
  deletions: number
  modifications: number
  changes: TextChange[]
}

export interface UploadedDocument {
  file: File
  text: string
}

export interface VerificationDocument extends UploadedDocument {
  id: string
  reference: string
  fields: Record<string, string>
}

export type VerificationStatus = 'VERIFIED' | 'MISMATCH' | 'MISSING' | 'NEEDS REVIEW'

export interface VerificationRule {
  field: string
  enabled: boolean
  type: 'exact' | 'normalized' | 'numeric' | 'date'
  tolerance: number
  dateFormat: string
  required: boolean
}

export interface VerificationFinding {
  id: string
  documentName: string
  field: string
  masterValue: string
  documentValue: string
  status: VerificationStatus
  reference: string
  reason: string
}

export interface VerificationSummary {
  documents: number
  verified: number
  mismatches: number
  missing: number
  review: number
  findings: VerificationFinding[]
}
