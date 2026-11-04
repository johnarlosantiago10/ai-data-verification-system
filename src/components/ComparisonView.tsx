import type { ComparisonResult } from '../types'

interface ComparisonViewProps {
  result: ComparisonResult
  leftName: string
  rightName: string
  activeChange: number
}

export function ComparisonView({
  result,
  leftName,
  rightName,
  activeChange,
}: ComparisonViewProps) {
  const changed = (index: number) => result.changes[index].type !== 'unchanged'

  return (
    <section className="comparison-grid" aria-label="Side-by-side comparison">
      <DocumentPanel
        title={leftName}
        side="left"
        result={result}
        changed={changed}
        activeChange={activeChange}
      />
      <DocumentPanel
        title={rightName}
        side="right"
        result={result}
        changed={changed}
        activeChange={activeChange}
      />
    </section>
  )
}

function DocumentPanel({
  title,
  side,
  result,
  changed,
  activeChange,
}: {
  title: string
  side: 'left' | 'right'
  result: ComparisonResult
  changed: (index: number) => boolean
  activeChange: number
}) {
  return (
    <article className="document-panel">
      <header>
        <strong>{title}</strong>
        <span>{side === 'left' ? 'Original' : 'Comparison'}</span>
      </header>
      <div className="document-content">
        {result.changes.map((change, index) => {
          const text = side === 'left' ? change.left : change.right
          if (!text) return null

          let highlight = ''
          if (changed(index)) {
            if (change.type === 'added' && side === 'right') highlight = 'diff-added active'
            if (change.type === 'removed' && side === 'left') highlight = 'diff-removed active'
            if (change.type === 'modified') highlight = 'diff-modified active'
          }
          const isActive = changed(index) && index === activeChange

          return (
            <span
              key={`${change.id}-${side}`}
              className={`${highlight} ${isActive ? 'change-active' : ''}`}
              data-change-id={change.id}
            >
              {text}
            </span>
          )
        })}
      </div>
    </article>
  )
}
