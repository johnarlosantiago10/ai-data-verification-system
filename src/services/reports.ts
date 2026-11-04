import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { VerificationSummary } from '../types'

export function exportExcel(summary: VerificationSummary) {
  const rows = summary.findings.map((finding) => ({
    Document: finding.documentName,
    Field: finding.field,
    Status: finding.status,
    'Master Value': finding.masterValue,
    'Uploaded Value': finding.documentValue,
    Reference: finding.reference,
    Reason: finding.reason,
  }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Verification Results')
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Metric', 'Total'],
    ['Documents processed', summary.documents],
    ['Verified fields', summary.verified],
    ['Mismatches', summary.mismatches],
    ['Missing fields', summary.missing],
    ['Needs review', summary.review],
  ]), 'Summary')
  XLSX.writeFile(workbook, `verification-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportPdf(summary: VerificationSummary) {
  const pdf = new jsPDF({ orientation: 'landscape' })
  pdf.setFontSize(18)
  pdf.text('Document Verification Report', 14, 18)
  pdf.setFontSize(10)
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 26)
  pdf.text(
    `Documents: ${summary.documents} | Verified: ${summary.verified} | Mismatches: ${summary.mismatches} | Missing: ${summary.missing} | Review: ${summary.review}`,
    14,
    33,
  )
  autoTable(pdf, {
    startY: 40,
    head: [['Document', 'Field', 'Status', 'Master Value', 'Uploaded Value', 'Reference', 'Reason']],
    body: summary.findings.map((finding) => [
      finding.documentName,
      finding.field,
      finding.status,
      finding.masterValue,
      finding.documentValue,
      finding.reference,
      finding.reason,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [49, 86, 211] },
  })
  pdf.save(`verification-report-${new Date().toISOString().slice(0, 10)}.pdf`)
}
