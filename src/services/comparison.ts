import { diffWordsWithSpace } from 'diff'
import type { ComparisonResult, TextChange } from '../types'

export function compareDocuments(leftText: string, rightText: string): ComparisonResult {
  const parts = diffWordsWithSpace(leftText, rightText)
  const rawChanges: Omit<TextChange, 'id'>[] = []

  parts.forEach((part, index) => {
    if (part.value.length === 0) return

    const next = parts[index + 1]
    if (part.removed && next?.added) {
      rawChanges.push({
        type: 'modified',
        left: part.value,
        right: next.value,
      })
      return
    }

    if (part.added) {
      const previous = parts[index - 1]
      if (previous?.removed) return
      rawChanges.push({ type: 'added', left: '', right: part.value })
      return
    }

    if (part.removed) {
      rawChanges.push({ type: 'removed', left: part.value, right: '' })
      return
    }

    rawChanges.push({ type: 'unchanged', left: part.value, right: part.value })
  })

  const changes = mergeChanges(rawChanges)
  return {
    additions: changes.filter((change) => change.type === 'added').length,
    deletions: changes.filter((change) => change.type === 'removed').length,
    modifications: changes.filter((change) => change.type === 'modified').length,
    changes,
  }
}

function mergeChanges(raw: Omit<TextChange, 'id'>[]): TextChange[] {
  const merged: TextChange[] = []

  raw.forEach((change) => {
    const previous = merged.at(-1)
    if (
      previous &&
      previous.type === change.type &&
      ((change.type !== 'unchanged') || previous.left.endsWith(' ') || change.left.startsWith(' '))
    ) {
      previous.left += change.left
      previous.right += change.right
    } else {
      merged.push({ ...change, id: merged.length })
    }
  })

  return merged.map((change, index) => ({ ...change, id: index }))
}
