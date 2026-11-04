import { useMemo, useState } from 'react'
import './App.css'
import { DocumentUploader } from './components/DocumentUploader'
import { extractDocumentText } from './services/documentExtraction'
import { DEFAULT_FIELDS, extractFields, inferVerificationRules } from './services/fieldExtraction'
import { runVerification } from './services/verification'
import { exportExcel, exportPdf } from './services/reports'
import { ComparisonWorkspace } from './components/ComparisonWorkspace'
import type { UploadedDocument, VerificationDocument, VerificationRule, VerificationSummary } from './types'

type Page = 'Dashboard' | 'Master Document' | 'Documents for Verification' | 'Verification Rules' | 'Automation Center' | 'Verification Results' | 'Reports' | 'Document Comparison'

const pages: Page[] = ['Dashboard', 'Master Document', 'Documents for Verification', 'Verification Rules', 'Automation Center', 'Verification Results', 'Reports']

function App() {
  const [page, setPage] = useState<Page>('Dashboard')
  const [master, setMaster] = useState<UploadedDocument | null>(null)
  const [masterFields, setMasterFields] = useState<Record<string, string>>({})
  const [documents, setDocuments] = useState<(VerificationDocument | null)[]>([null])
  const [slots, setSlots] = useState(1)
  const [rules, setRules] = useState<VerificationRule[]>(inferVerificationRules(DEFAULT_FIELDS))
  const [summary, setSummary] = useState<VerificationSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const validDocuments = useMemo(() => documents.filter((document): document is VerificationDocument => Boolean(document)), [documents])
  const allFields = useMemo(() => Array.from(new Set([...DEFAULT_FIELDS, ...Object.keys(masterFields), ...rules.map((rule) => rule.field)])), [masterFields, rules])

  const loadDocument = async (file: File, destination: 'master' | number) => {
    if (!/\.(pdf|docx|xlsx|xls|csv|txt)$/i.test(file.name)) {
      setError('Unsupported file. Use PDF, DOCX, XLSX, CSV, or TXT.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const text = await extractDocumentText(file)
      if (!text.trim()) throw new Error('No readable text was found in this document.')
      const fields = extractFields(text)
      const extracted: VerificationDocument = {
        id: `${destination}-${file.name}-${Date.now()}`,
        file,
        text,
        fields,
        reference: destination === 'master' ? 'Master document' : inferReference(destination),
      }
      if (destination === 'master') {
        setMaster(extracted)
        setMasterFields((current) => ({ ...Object.keys(current).length ? current : fields, ...fields }))
      } else {
        setDocuments((current) => current.map((item, index) => index === destination ? extracted : item))
      }
      setSummary(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Document could not be processed.')
    } finally {
      setLoading(false)
    }
  }

  const setDocumentCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(50, count || 1))
    setSlots(safeCount)
    setDocuments((current) => Array.from({ length: safeCount }, (_, index) => current[index] ?? null))
  }

  const runVerificationJob = async () => {
    if (!master) return setError('Upload a master document before running verification.')
    if (!validDocuments.length) return setError('Upload at least one document for verification.')
    if (validDocuments.length !== slots) return setError('Every configured document slot must contain a valid file.')

    setRunning(true)
    setProgress(0)
    setError('')
    for (let step = 1; step <= 5; step += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 180))
      setProgress(step * 20)
    }
    setSummary(runVerification(masterFields, validDocuments, rules))
    setRunning(false)
    setPage('Verification Results')
  }

  const addCustomField = () => {
    const name = window.prompt('Enter a field name')
    if (!name?.trim()) return
    const cleanName = name.trim()
    setRules((current) => current.some((rule) => rule.field === cleanName) ? current : [...current, {
      field: cleanName, enabled: true, type: 'normalized', tolerance: 0, dateFormat: 'YYYY-MM-DD', required: true,
    }])
    setMasterFields((current) => ({ ...current, [cleanName]: current[cleanName] ?? '' }))
  }

  return (
    <div className="verification-app">
      <aside className="sidebar">
        <div className="app-brand"><span>V</span><div><strong>VerifyDoc</strong><small>Data Verification</small></div></div>
        <nav>
          {pages.map((item) => (
            <button key={item} className={page === item ? 'active' : ''} onClick={() => setPage(item)}>
              <i>{item[0]}</i>{item}
            </button>
          ))}
          <button className={page === 'Document Comparison' ? 'active' : ''} onClick={() => setPage('Document Comparison')}>
            <i>C</i>Document Comparison
          </button>
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div><span>Enterprise Workspace</span><strong>{page}</strong></div>
          <button className="run-button" disabled={running} onClick={runVerificationJob}>
            {running ? `Verifying ${progress}%` : 'RUN VERIFICATION'}
          </button>
        </header>

        <main>
          {error && <div className="error-banner" role="alert"><strong>Action required:</strong> {error}</div>}
          {running && <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>}

          {page === 'Dashboard' && (
            <>
              <section className="hero-panel"><div><p>Automated Verification</p><h1>Verify documents with confidence.</h1><span>Compare extracted records against an approved source of truth using deterministic rules.</span></div></section>
              <section className="metric-grid">
                <Metric label="Master document" value={master ? 'Ready' : 'Missing'} tone="blue" />
                <Metric label="Documents queued" value={String(validDocuments.length)} tone="purple" />
                <Metric label="Rules enabled" value={String(rules.filter((rule) => rule.enabled).length)} tone="amber" />
                <Metric label="Completed checks" value={String(summary?.verified ?? 0)} tone="green" />
              </section>
              <section className="workflow-card"><h2>Verification workflow</h2>{['Read master', 'Extract fields', 'Read uploads', 'Apply rules', 'Generate results'].map((step, index) => <div key={step}><b>{index + 1}</b><span>{step}</span></div>)}</section>
            </>
          )}

          {page === 'Master Document' && (
            <section className="workspace-grid">
              <div className="panel">
                <PanelHeading title="Master Document" subtitle="Approved source of truth" />
                <DocumentUploader label="Master document" document={master} loading={loading}
                  onFile={(file) => loadDocument(file, 'master')} onRemove={() => { setMaster(null); setMasterFields({}) }} />
              </div>
              <FieldEditor fields={masterFields} allFields={allFields} onChange={(field, value) => setMasterFields((current) => ({ ...current, [field]: value }))} />
            </section>
          )}

          {page === 'Documents for Verification' && (
            <section>
              <div className="panel slot-controls"><label>Number of documents<input type="number" min="1" max="50" value={slots} onChange={(event) => setDocumentCount(Number(event.target.value))} /></label><span>{validDocuments.length} of {slots} files ready</span></div>
              <div className="verification-upload-grid">
                {Array.from({ length: slots }, (_, index) => (
                  <DocumentUploader key={index} label={`Document ${index + 1}`} document={documents[index]} loading={loading && false}
                    onFile={(file) => loadDocument(file, index)}
                    onRemove={() => setDocuments((current) => current.map((document, currentIndex) => currentIndex === index ? null : document))} />
                ))}
              </div>
            </section>
          )}

          {page === 'Verification Rules' && (
            <section className="panel">
              <PanelHeading title="Verification Rules" subtitle="Configure deterministic field matching" />
              <button className="secondary-button" onClick={addCustomField}>+ Add custom field</button>
              <div className="rules-table">
                <div className="rules-head"><span>Field</span><span>Method</span><span>Required</span><span>Tolerance</span><span>Enabled</span></div>
                {rules.map((rule, index) => (
                  <div className="rule-row" key={rule.field}>
                    <strong>{rule.field}</strong>
                    <select value={rule.type} onChange={(event) => updateRule(index, { type: event.target.value as VerificationRule['type'] })}>
                      <option value="exact">Exact match</option><option value="normalized">Normalized text</option><option value="numeric">Numeric comparison</option><option value="date">Date comparison</option>
                    </select>
                    <input type="checkbox" checked={rule.required} onChange={(event) => updateRule(index, { required: event.target.checked })} />
                    <input type="number" min="0" step="0.01" value={rule.tolerance} disabled={rule.type !== 'numeric'} onChange={(event) => updateRule(index, { tolerance: Number(event.target.value) })} />
                    <input type="checkbox" checked={rule.enabled} onChange={(event) => updateRule(index, { enabled: event.target.checked })} />
                  </div>
                ))}
              </div>
              <button className="run-button inline-run" onClick={runVerificationJob} disabled={running}>RUN VERIFICATION</button>
            </section>
          )}

          {page === 'Automation Center' && (
            <section className="panel automation">
              <PanelHeading title="Automation Center" subtitle="Browser-based deterministic verification workflow" />
              <div className="automation-status"><span className={running ? 'working' : ''}>{running ? `Processing ${progress}%` : 'Ready'}</span><button className="run-button" onClick={runVerificationJob} disabled={running}>{running ? 'Processing...' : 'Start verification'}</button></div>
              <ol><li>Read master document and extract approved values</li><li>Extract uploaded records locally</li><li>Match and compare enabled fields</li><li>Detect missing, duplicate, and conflicting values</li><li>Generate final results and exportable reports</li></ol>
              <p className="integration-note">AI analysis is not active. A secure backend and provider API key are required for AI explanations; no extracted value or verification decision will be generated by AI.</p>
            </section>
          )}

          {page === 'Verification Results' && (
            summary ? <ResultsSummary summary={summary} /> : <EmptyState title="No verification results" text="Configure the master document, upload records, and run verification." />
          )}

          {page === 'Reports' && (
            <section className="panel reports">
              <PanelHeading title="Reports" subtitle="Export consolidated verification evidence" />
              {summary ? <><div className="metric-grid compact"><Metric label="Documents" value={String(summary.documents)} /><Metric label="Verified fields" value={String(summary.verified)} /><Metric label="Mismatches" value={String(summary.mismatches)} /><Metric label="Review" value={String(summary.review)} /></div><button className="secondary-button" onClick={() => exportExcel(summary)}>Download Excel</button><button className="secondary-button" onClick={() => exportPdf(summary)}>Download PDF</button></> : <EmptyState title="No report available" text="Run verification first to generate report data." />}
            </section>
          )}
          {page === 'Document Comparison' && <ComparisonWorkspace />}
        </main>
      </div>
    </div>
  )

  function updateRule(index: number, update: Partial<VerificationRule>) {
    setRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...update } : rule))
  }

  function inferReference(destination: number) {
    return `Document ${destination + 1}`
  }
}

function Metric({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return <article className={`metric-card metric-${tone}`}><span>{label}</span><strong>{value}</strong></article>
}

function PanelHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <header className="panel-heading"><div><h1>{title}</h1><p>{subtitle}</p></div></header>
}

function FieldEditor({ fields, allFields, onChange }: { fields: Record<string, string>; allFields: string[]; onChange: (field: string, value: string) => void }) {
  return <section className="panel field-editor"><PanelHeading title="Extracted fields" subtitle="Review and correct deterministic extraction" />{allFields.map((field) => <label key={field}>{field}<input value={fields[field] ?? ''} placeholder="Not detected" onChange={(event) => onChange(field, event.target.value)} /></label>)}</section>
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <section className="panel empty-state"><span>i</span><h2>{title}</h2><p>{text}</p></section>
}

function ResultsSummary({ summary }: { summary: VerificationSummary }) {
  return (
    <section>
      <div className="metric-grid result-metrics">
        <Metric label="Processed documents" value={String(summary.documents)} />
        <Metric label="Verified" value={String(summary.verified)} tone="green" />
        <Metric label="Mismatches" value={String(summary.mismatches)} tone="amber" />
        <Metric label="Missing" value={String(summary.missing)} tone="red" />
        <Metric label="Needs review" value={String(summary.review)} tone="purple" />
      </div>
      <div className="panel results-table">
        <PanelHeading title="Discrepancy details" subtitle={`${summary.findings.length} findings`} />
        <div className="table-scroll"><table><thead><tr><th>Document</th><th>Field</th><th>Status</th><th>Master Value</th><th>Uploaded Value</th><th>Reference</th><th>Reason</th></tr></thead><tbody>{summary.findings.map((finding) => <tr key={finding.id}><td>{finding.documentName}</td><td>{finding.field}</td><td><span className={`status status-${finding.status.toLowerCase().replace(' ', '-')}`}>{finding.status}</span></td><td>{finding.masterValue || '—'}</td><td>{finding.documentValue || '—'}</td><td>{finding.reference}</td><td>{finding.reason}</td></tr>)}</tbody></table></div>
      </div>
    </section>
  )
}

export default App
