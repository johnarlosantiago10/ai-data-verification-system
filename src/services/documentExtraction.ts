import mammoth from 'mammoth'
import * as pdfjs from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import * as XLSX from 'xlsx'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

export async function extractDocumentText(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'txt' || file.type === 'text/plain') {
    return normalizeText(await file.text())
  }

  if (extension === 'pdf' || file.type === 'application/pdf') {
    const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
    }

    return normalizeText(pages.join('\n'))
  }

  if (
    extension === 'docx' ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return normalizeText(result.value)
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    return workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
      return `[Sheet: ${sheetName}]\n${rows.map((row) => row.join('\t')).join('\n')}`
    }).join('\n\n')
  }

  if (extension === 'csv' || file.type === 'text/csv') {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    return normalizeText(XLSX.utils.sheet_to_csv(firstSheet))
  }

  throw new Error('Unsupported file format. Please upload a PDF, DOCX, XLSX, CSV, or TXT file.')
}

export function normalizeText(value: string) {
  return value.replace(/\r\n/g, '\n').replace(/\t/g, '    ').trim()
}
