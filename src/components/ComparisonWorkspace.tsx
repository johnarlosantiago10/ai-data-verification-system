import { useMemo, useState } from 'react'
import type { ComparisonResult, UploadedDocument } from '../types'
import { compareDocuments } from '../services/comparison'
import { extractDocumentText } from '../services/documentExtraction'
import { ComparisonSummary } from './ComparisonSummary'
import { ComparisonView } from './ComparisonView'
import { DocumentUploader } from './DocumentUploader'

export function ComparisonWorkspace() {
  const [left, setLeft] = useState<UploadedDocument | null>(null)
  const [right, setRight] = useState<UploadedDocument | null>(null)
  const [loading, setLoading] = useState<'left' | 'right' | null>(null)
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [activeChange, setActiveChange] = useState(0)
  const [error, setError] = useState('')
  const changedIndexes = useMemo(
    () => result?.changes.flatMap((change, index) => change.type === 'unchanged' ? [] : [index]) ?? [],
    [result],
  )

  const load = async (file: File, side: 'left' | 'right') => {
    setLoading(side)
    setError('')
    try {
      const text = await extractDocumentText(file)
      const document = { file, text }
      side === 'left' ? setLeft(document) : setRight(document)
      setResult(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The document could not be read.')
    } finally {
      setLoading(null)
    }
  }

  const navigate = (direction: 'previous' | 'next') => {
    if (!changedIndexes.length) return
    const position = changedIndexes.indexOf(activeChange)
    const next = direction === 'next'
      ? (position + 1) % changedIndexes.length
      : (position <= 0 ? changedIndexes.length - 1 : position - 1)
    setActiveChange(changedIndexes[next])
  }

  return (
    <section>
      <div className="page-action-heading">
        <PanelTitle title="Document Comparison" subtitle="Preserved side-by-side text comparison workspace" />
        <button className="run-button" onClick={() => {
          if (!left || !right) return setError('Upload both documents.')
          setResult(compareDocuments(left.text, right.text))
          setActiveChange(0)
        }}>COMPARE DOCUMENTS</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="workspace-grid comparison-upload">
        <DocumentUploader label="Document A" document={left} loading={loading === 'left'} onFile={(file) => load(file, 'left')} onRemove={() => setLeft(null)} />
        <DocumentUploader label="Document B" document={right} loading={loading === 'right'} onFile={(file) => load(file, 'right')} onRemove={() => setRight(null)} />
      </div>
      {result && <>
        <ComparisonSummary result={result} onChange={navigate} />
        <ComparisonView result={result} leftName={left?.file.name ?? 'Document A'} rightName={right?.file.name ?? 'Document B'} activeChange={activeChange} />
      </>}
    </section>
  )
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="panel-heading"><div><h1>{title}</h1><p>{subtitle}</p></div></div>
}
