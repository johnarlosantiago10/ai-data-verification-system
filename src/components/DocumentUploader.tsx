import { useRef, useState } from 'react'
import type { UploadedDocument } from '../types'

interface DocumentUploaderProps {
  label: string
  document: UploadedDocument | null
  loading: boolean
  onFile: (file: File) => void
  onRemove: () => void
}

export function DocumentUploader({
  label,
  document,
  loading,
  onFile,
  onRemove,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const acceptFile = (files: FileList | null) => {
    if (files?.[0]) onFile(files[0])
  }

  return (
    <section className="upload-card" aria-label={`${label} upload`}>
      <div className="upload-card__heading">
        <span>{label}</span>
        {document && (
          <button type="button" className="text-button" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>

      <div
        className={`dropzone ${dragging ? 'dropzone--active' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          acceptFile(event.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
        }}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
          onChange={(event) => acceptFile(event.target.files)}
          hidden
        />
        {loading ? (
          <>
            <span className="spinner" />
            <strong>Extracting text...</strong>
          </>
        ) : document ? (
          <>
            <span className="file-icon" aria-hidden="true">DOC</span>
            <strong>{document.file.name}</strong>
            <span>{formatBytes(document.file.size)}</span>
            <button
              type="button"
              className="replace-button"
              onClick={(event) => {
                event.stopPropagation()
                inputRef.current?.click()
              }}
            >
              Replace file
            </button>
          </>
        ) : (
          <>
            <span className="upload-icon" aria-hidden="true">↑</span>
            <strong>Drop your document here</strong>
            <span>or click to browse</span>
            <small>PDF, DOCX, XLSX, CSV, or TXT</small>
          </>
        )}
      </div>
    </section>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
