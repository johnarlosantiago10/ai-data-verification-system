import type { ComparisonResult } from '../types'

interface ComparisonSummaryProps {
  result: ComparisonResult
  onChange: (direction: 'previous' | 'next') => void
}

export function ComparisonSummary({ result, onChange }: ComparisonSummaryProps) {
  const total = result.additions + result.deletions + result.modifications

  return (
    <section className="summary-bar" aria-label="Comparison summary">
      <div className="summary-total">
        <strong>{total}</strong>
        <span>Changes detected</span>
      </div>
      <div className="summary-count summary-count--added">
        <strong>{result.additions}</strong>
        <span>Additions</span>
      </div>
      <div className="summary-count summary-count--removed">
        <strong>{result.deletions}</strong>
        <span>Deletions</span>
      </div>
      <div className="summary-count summary-count--modified">
        <strong>{result.modifications}</strong>
        <span>Modifications</span>
      </div>
      <div className="change-navigation">
        <button type="button" onClick={() => onChange('previous')} aria-label="Previous change">←</button>
        <button type="button" onClick={() => onChange('next')} aria-label="Next change">→</button>
      </div>
    </section>
  )
}
