import { useState, useEffect } from 'react'

const API = '/api/mace'

function ScoreBadge({ score }) {
  const pct = Math.round(score * 100)
  const colour = pct >= 70 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    : pct >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  return <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${colour}`}>{pct}%</span>
}

function SearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  async function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}&limit=20`)
      setResults(await res.json())
    } catch (err) {
      setResults({ error: err.message })
    }
    setLoading(false)
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-3 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search across all project knowledge..."
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 text-lg"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">{results.error}</div>
      )}

      {results?.results && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">{results.total} results for "{results.query}"</p>
          {results.results.map((r, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-medium">{r.documentTitle}</h3>
                  <span className="text-xs bg-sky-500/15 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full">{r.sourceType}</span>
                </div>
                <ScoreBadge score={r.score} />
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-2">{r.chunkContent}</p>
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <span>Source: {r.documentSource}</span>
                <span>Project: {r.companyId.slice(0, 8)}...</span>
                <span>Chunk #{r.chunkIndex}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DocumentsPanel() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/documents`).then(r => r.json()).then(d => { setDocs(d.documents || []); setLoading(false) })
  }, [])

  if (loading) return <p className="text-zinc-500">Loading documents...</p>

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-500 mb-4">{docs.length} documents ingested</p>
      {docs.map(doc => (
        <div key={doc.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-medium">{doc.title}</h3>
            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
              <span className="bg-white/5 px-2 py-0.5 rounded">{doc.source_type}</span>
              <span>{Math.round(doc.content_length / 1024 * 10) / 10} KB</span>
              <span>{new Date(doc.ingested_at).toLocaleDateString('en-GB')}</span>
              <span className="text-zinc-600">{doc.company_id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function IngestPanel() {
  const [form, setForm] = useState({ companyId: '', sourceUrl: '', title: '', content: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState([])

  useEffect(() => {
    fetch('/api/companies').then(r => r.json()).then(setCompanies)
  }, [])

  async function ingest(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourceType: 'manual', sourceUrl: `manual://${form.sourceUrl}` }),
      })
      setResult(await res.json())
    } catch (err) {
      setResult({ error: err.message })
    }
    setLoading(false)
  }

  return (
    <form onSubmit={ingest} className="space-y-4 max-w-2xl">
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Project</label>
        <select
          value={form.companyId}
          onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-sky-500/50"
        >
          <option value="">Select project...</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Document title</label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. NHP Risk Register Q1 2026"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/50"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Source reference</label>
        <input
          value={form.sourceUrl}
          onChange={e => setForm(f => ({ ...f, sourceUrl: e.target.value }))}
          placeholder="e.g. risk-register-q1-2026"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/50"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Content</label>
        <textarea
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          placeholder="Paste document content here..."
          rows={8}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500/50 resize-y"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !form.companyId || !form.title || !form.content}
        className="bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
      >
        {loading ? 'Ingesting...' : 'Ingest Document'}
      </button>
      {result?.ok && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">
          Ingested: {result.chunksCreated} chunks created (doc: {result.documentId.slice(0, 8)}...)
        </div>
      )}
      {result?.error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{result.error}</div>
      )}
    </form>
  )
}

export default function App() {
  const [tab, setTab] = useState('search')

  const tabs = [
    { id: 'search', label: 'Search' },
    { id: 'documents', label: 'Documents' },
    { id: 'ingest', label: 'Ingest' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <header className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white tracking-tight">Paperxlip</h1>
            <span className="text-xs bg-sky-500/15 text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded-full">Knowledge</span>
          </div>
          <span className="text-xs text-zinc-600">Mace Digital</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <nav className="flex gap-1 mb-6 border-b border-white/[0.06] pb-3">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'search' && <SearchPanel />}
        {tab === 'documents' && <DocumentsPanel />}
        {tab === 'ingest' && <IngestPanel />}
      </main>
    </div>
  )
}
