import { useState, useEffect, useMemo, useRef } from 'react'
import CandidateCard from './CandidateCard.jsx'

const waRowPhone = (phone) => {
  const d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('972')) return d
  if (d.startsWith('0'))   return '972' + d.slice(1)
  return d
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '12px' },
  search: {
    padding: '9px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
  },
  row: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  rowLeft: { display: 'flex', flexDirection: 'column', gap: '2px' },
  rowName: { fontSize: '14px', fontWeight: 600, color: '#f1f5f9' },
  rowRole: { fontSize: '12px', color: '#64748b' },
  rowRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  badge: {
    background: '#334155',
    color: '#94a3b8',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '11px',
  },
  expand: { color: '#475569', fontSize: '12px' },
  expandedArea: {
    borderTop: '1px solid #334155',
    background: '#162032',
  },
  cardWrap: {
    padding: '12px',
  },
  historySection: {
    borderTop: '1px solid #1e293b',
    padding: '12px 16px',
  },
  historyTitle: {
    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.6px', color: '#64748b', marginBottom: '8px',
  },
  historyList: {
    display: 'flex', flexDirection: 'column', gap: '6px',
  },
  historyItem: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  historyJob: { fontSize: '13px', fontWeight: 600, color: '#e2e8f0' },
  historyDate: { fontSize: '11px', color: '#475569' },
  historyPct: { fontSize: '18px', fontWeight: 800 },
  historyRec: { fontSize: '12px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 },
  techRow: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' },
  tech: {
    background: '#334155', color: '#94a3b8',
    borderRadius: '4px', padding: '1px 6px', fontSize: '10px',
  },
  noHistory: { color: '#475569', fontSize: '12px' },
  loading: { color: '#475569', fontSize: '12px' },
  mgmt: { fontSize: '11px', color: '#60a5fa' },
  yearsExp: { fontSize: '11px', color: '#94a3b8' },
  searchWrap: { position: 'relative' },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    marginTop: '4px',
    zIndex: 200,
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    maxHeight: '260px',
    overflowY: 'auto',
  },
  dropItem: {
    padding: '8px 14px',
    fontSize: '13px',
    color: '#e2e8f0',
    cursor: 'pointer',
    borderBottom: '1px solid #0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dropItemActive: {
    background: '#1e3a5f',
  },
}

const pctColor = (p) => p >= 80 ? '#4ade80' : p >= 60 ? '#fbbf24' : '#f87171'

// ── Compound search parser ──────────────────────────────────────────────────

/**
 * Split query by '+' (AND) and within each segment by '|' (OR).
 *   { type: 'year', min/max }      — experience filter
 *   { type: 'mgmt' }              — management filter
 *   { type: 'text', values: [...] } — keyword match (OR across values)
 */
function parseQuery(raw) {
  const tokens = []
  const segments = raw.split('+').map(p => p.trim()).filter(Boolean)

  for (const segment of segments) {
    const alternatives = segment.split('|').map(p => p.trim()).filter(Boolean)
    if (alternatives.length === 0) continue

    // Year / mgmt only supported for single-value segments
    if (alternatives.length === 1) {
      const part = alternatives[0]
      // Range: "4-8 שנים"
      const rangeMatch = part.match(/(\d+(?:\.\d+)?)\s*(?:[-–]|עד)\s*(\d+(?:\.\d+)?)\s*(?:שנ[יות]+(?:\s+ניסיון)?|years?|yrs?)/i)
      if (rangeMatch) {
        tokens.push({ type: 'year', min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]), label: part })
        continue
      }
      // Minimum: explicit prefix or N+
      const minMatch = part.match(/(?:(לפחות\s+|minimum\s+|>|≥|>=)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*\+)\s*(?:שנ[יות]+(?:\s+ניסיון)?|years?|yrs?)/i)
      if (minMatch) {
        tokens.push({ type: 'year', min: parseFloat(minMatch[2] || minMatch[3]), label: part })
        continue
      }
      // Plain "N שנים" → maximum
      const maxMatch = part.match(/(\d+(?:\.\d+)?)\s*(?:שנ[יות]+(?:\s+ניסיון)?|years?|yrs?)/i)
      if (maxMatch) {
        tokens.push({ type: 'year', max: parseFloat(maxMatch[1]), label: part })
        continue
      }
      // Management
      if (/^(ניה[ול]+[יית]?|management|manag|מנהל)$/i.test(part)) {
        tokens.push({ type: 'mgmt', label: part })
        continue
      }
    }

    // Text token — OR across all alternatives
    tokens.push({ type: 'text', values: alternatives.map(a => a.toLowerCase()), label: alternatives.join(' | ') })
  }

  return tokens
}

/** Check if a single text token matches a candidate */
function matchesText(c, q) {
  const norm = s => (s || '').toLowerCase()
  const allRoles = Array.isArray(c.all_roles) ? c.all_roles : []
  const techs    = Array.isArray(c.technologies) ? c.technologies : []

  if (norm(c.name).includes(q))          return true
  if (norm(c.email).includes(q))         return true
  const qDigits = q.replace(/\D/g, '')
  if (qDigits && (c.phone || '').replace(/\D/g, '').includes(qDigits)) return true
  if (norm(c.current_role).includes(q))  return true
  if (norm(c.current_company).includes(q)) return true
  if (norm(c.location).includes(q))      return true
  if (techs.some(t => norm(t).includes(q))) return true
  if (allRoles.some(r =>
    norm(r.title || (typeof r === 'string' ? r : '')).includes(q) ||
    norm(r.company).includes(q)
  )) return true
  if (norm(c.raw_summary_he).includes(q)) return true
  if (norm(c.raw_summary).includes(q))    return true
  return false
}

/** Return true if the candidate satisfies ALL tokens (AND), OR within each text token */
function matchesAll(c, tokens) {
  for (const tok of tokens) {
    if (tok.type === 'text') {
      // OR: candidate must match at least ONE of the values
      if (!tok.values.some(q => matchesText(c, q))) return false
    }
    if (tok.type === 'year') {
      const exp = c.total_experience_years || 0
      if (tok.min !== undefined && exp < tok.min) return false
      if (tok.max !== undefined && exp > tok.max) return false
    }
    if (tok.type === 'mgmt' && !c.management_experience) return false
  }
  return true
}

// ── Check selected candidates vs a saved job ────────────────────────────────

const pctBg  = (p) => p >= 80 ? '#052e16' : p >= 60 ? '#1c1100' : '#450a0a'
const pctClr = (p) => p >= 80 ? '#4ade80' : p >= 60 ? '#fbbf24' : '#f87171'
const pctBdr = (p) => p >= 80 ? '#166534' : p >= 60 ? '#92400e' : '#7f1d1d'

function CheckVsJobPanel({ selectedIds, onClose }) {
  const [jobs, setJobs]             = useState(null)
  const [jobFilter, setJobFilter]   = useState('')
  const [pickedJob, setPickedJob]   = useState(null)
  const [running, setRunning]       = useState(false)
  const [results, setResults]       = useState(null)   // null = not run yet
  const [error, setError]           = useState(null)
  const [progress, setProgress]     = useState(null)   // { done, total }
  const [expandedId, setExpandedId] = useState(null)
  const abortRef = useRef(null)

  // Load jobs on mount
  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(setJobs)
      .catch(() => setJobs([]))
  }, [])

  const filteredJobs = (jobs || []).filter(j =>
    !jobFilter || (j.title || '').toLowerCase().includes(jobFilter.toLowerCase())
  )

  const runMatch = async (mode) => {
    if (!pickedJob || running) return
    setRunning(true)
    setResults(null)
    setError(null)
    setProgress(null)

    const job     = pickedJob
    const reqs    = { ...(job.requirements || {}), role_title: job.requirements?.role_title || job.title }
    const ids     = [...selectedIds]
    const url     = mode === 'quick'
      ? `/api/jobs/${job.id}/quick-match`
      : `/api/jobs/${job.id}/match`
    const body    = {
      job_requirements: reqs,
      candidate_ids: ids,
      top_n: ids.length,
      min_match_pct: 0,
    }

    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'שגיאת שרת' }))
        throw new Error(err.detail || 'שגיאה')
      }

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let buf = '', accumulated = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'batch' && ev.batch_results?.length) {
              accumulated = [...accumulated, ...ev.batch_results]
              setProgress({ done: accumulated.length, total: ids.length })
            } else if (ev.type === 'results') {
              accumulated = ev.results?.length ? ev.results : accumulated
            } else if (ev.type === 'result') {
              accumulated = [...accumulated, ev.candidate]
            } else if (ev.type === 'progress') {
              setProgress({ done: ev.processed || 0, total: ids.length })
            }
          } catch { /* ignore parse errors */ }
        }
      }
      accumulated.sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0))
      setResults(accumulated)
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message || 'שגיאה')
    } finally {
      setRunning(false)
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
    setRunning(false)
  }

  return (
    <div style={{
      background: '#0d1b2e', border: '1px solid #1d4ed8',
      borderRadius: '10px', marginBottom: '14px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: '1px solid #1e293b' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', flex: 1 }}>
          🎯 בדיקת {selectedIds.size} מועמדים מול משרה
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '16px' }}>✕</button>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Job picker */}
        {!results && (
          <>
            <input
              value={jobFilter}
              onChange={e => setJobFilter(e.target.value)}
              placeholder="חפש משרה..."
              dir="auto"
              style={{
                padding: '7px 12px', background: '#0f172a',
                border: '1px solid #334155', borderRadius: '6px',
                color: '#e2e8f0', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />
            {jobs === null ? (
              <div style={{ fontSize: '12px', color: '#475569' }}>טוען משרות...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                {filteredJobs.length === 0
                  ? <div style={{ fontSize: '12px', color: '#475569' }}>לא נמצאו משרות</div>
                  : filteredJobs.map(j => (
                    <div
                      key={j.id}
                      onClick={() => setPickedJob(j)}
                      style={{
                        padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                        background: pickedJob?.id === j.id ? '#1e3a5f' : '#0f172a',
                        border: `1px solid ${pickedJob?.id === j.id ? '#1d4ed8' : '#1e293b'}`,
                        color: pickedJob?.id === j.id ? '#60a5fa' : '#94a3b8',
                        transition: 'all 0.15s',
                      }}
                    >
                      {j.title}
                      {j.requirements?.role_title && j.requirements.role_title !== j.title && (
                        <span style={{ fontSize: '11px', color: '#475569', marginRight: '6px' }}>· {j.requirements.role_title}</span>
                      )}
                    </div>
                  ))
                }
              </div>
            )}

            {/* Mode buttons */}
            {pickedJob && !running && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => runMatch('quick')}
                  style={{
                    flex: 1, padding: '8px', background: '#1e3a5f',
                    border: '1px solid #1d4ed8', borderRadius: '7px',
                    color: '#60a5fa', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  }}
                >⚡ חיפוש מהיר</button>
                <button
                  onClick={() => runMatch('deep')}
                  style={{
                    flex: 1, padding: '8px', background: '#1e1b4b',
                    border: '1px solid #4338ca', borderRadius: '7px',
                    color: '#a5b4fc', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  }}
                >🔎 חיפוש מעמיק</button>
              </div>
            )}

            {/* Running indicator */}
            {running && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '14px', height: '14px', border: '2px solid #334155',
                  borderTop: '2px solid #38bdf8', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', flexShrink: 0,
                }} />
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {progress ? `בודק... ${progress.done}/${progress.total}` : 'מתחבר...'}
                </span>
                <button
                  onClick={cancel}
                  style={{ marginRight: 'auto', padding: '3px 10px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '5px', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}
                >ביטול</button>
              </div>
            )}

            {error && (
              <div style={{ fontSize: '12px', color: '#f87171' }}>⚠ {error}</div>
            )}
          </>
        )}

        {/* Results */}
        {results && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8', flex: 1 }}>
                תוצאות מול <strong style={{ color: '#60a5fa' }}>{pickedJob.title}</strong> — {results.length} מועמדים
              </span>
              <button
                onClick={() => { setResults(null); setPickedJob(null) }}
                style={{ padding: '4px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}
              >חיפוש חדש</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '560px', overflowY: 'auto' }}>
              {results.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#475569', textAlign: 'center', padding: '20px' }}>לא נמצאו תוצאות</div>
              ) : results.map((r, i) => {
                const isOpen = expandedId === (r.id || i)
                return (
                  <div key={r.id || i} style={{
                    background: isOpen ? '#162032' : '#0f172a',
                    border: `1px solid ${isOpen ? '#334155' : '#1e293b'}`,
                    borderRadius: '8px', overflow: 'hidden',
                    transition: 'background 0.15s',
                  }}>
                    {/* Summary row — always visible, click to expand */}
                    <div
                      onClick={() => setExpandedId(isOpen ? null : (r.id || i))}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', cursor: 'pointer' }}
                    >
                      <span style={{
                        fontSize: '20px', fontWeight: 800, minWidth: '46px', textAlign: 'center',
                        color: pctClr(r.match_percentage || 0),
                        background: pctBg(r.match_percentage || 0),
                        border: `1px solid ${pctBdr(r.match_percentage || 0)}`,
                        borderRadius: '7px', padding: '2px 6px', flexShrink: 0,
                      }}>{r.match_percentage || 0}%</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>{r.name || '—'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{r.current_role || ''}</div>
                      </div>
                      <span style={{ color: '#475569', fontSize: '12px', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>

                    {/* Expanded: full CandidateCard */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #1e293b' }}>
                        <CandidateCard candidate={r} rank={i + 1} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Notes panel ─────────────────────────────────────────────────────────────

const AUTHOR_KEY = 'cv_matcher_note_author'

function NotesPanel({ candidateId }) {
  const [notes, setNotes]       = useState(null)
  const [text, setText]         = useState('')
  const [author, setAuthor]     = useState(() => localStorage.getItem(AUTHOR_KEY) || '')
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null) // note id being deleted

  useEffect(() => {
    fetch(`/api/candidates/${candidateId}/notes`)
      .then(r => r.json())
      .then(setNotes)
      .catch(() => setNotes([]))
  }, [candidateId])

  const handleAdd = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/candidates/${candidateId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: text, author }),
      })
      const saved = await res.json()
      setNotes(prev => [saved, ...(prev || [])])
      setText('')
      if (author.trim()) localStorage.setItem(AUTHOR_KEY, author)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (noteId) => {
    setDeleting(noteId)
    try {
      await fetch(`/api/candidates/${candidateId}/notes/${noteId}`, { method: 'DELETE' })
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } finally {
      setDeleting(null)
    }
  }

  const fmtDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Existing notes */}
      {notes === null ? (
        <div style={{ fontSize: '12px', color: '#475569' }}>טוען הערות...</div>
      ) : notes.length === 0 ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {notes.map(n => (
            <div key={n.id} style={{
              background: '#1a2a1a',
              border: '1px solid #166534',
              borderRadius: '8px',
              padding: '10px 14px',
              position: 'relative',
            }}>
              {/* Note text — bold, prominent */}
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f0fdf4', lineHeight: 1.55, paddingLeft: '24px' }}>
                {n.note}
              </div>
              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                {n.author && (
                  <span style={{
                    fontSize: '11px', fontWeight: 600,
                    background: '#052e16', color: '#86efac',
                    border: '1px solid #166534', borderRadius: '4px',
                    padding: '1px 7px',
                  }}>✍ {n.author}</span>
                )}
                <span style={{ fontSize: '11px', color: '#475569' }}>🕐 {fmtDate(n.created_at)}</span>
              </div>
              {/* Delete button */}
              <button
                onClick={() => handleDelete(n.id)}
                disabled={deleting === n.id}
                title="מחק הערה"
                style={{
                  position: 'absolute', top: '8px', left: '10px',
                  background: 'none', border: 'none',
                  color: '#475569', cursor: 'pointer', fontSize: '14px',
                  lineHeight: 1, padding: '2px 4px',
                  opacity: deleting === n.id ? 0.4 : 1,
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Add note form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd() }}
          placeholder="הוסף הערה... (Ctrl+Enter לשמירה)"
          dir="auto"
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 12px', background: '#0f172a',
            border: '1px solid #334155', borderRadius: '7px',
            color: '#e2e8f0', fontSize: '13px', outline: 'none',
            resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
          }}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="שמך (לא חובה)"
            dir="auto"
            style={{
              flex: 1, padding: '6px 10px', background: '#0f172a',
              border: '1px solid #334155', borderRadius: '6px',
              color: '#94a3b8', fontSize: '12px', outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={saving || !text.trim()}
            style={{
              padding: '6px 18px', background: '#166534',
              border: '1px solid #15803d', borderRadius: '6px',
              color: '#86efac', fontSize: '13px', fontWeight: 700,
              cursor: saving || !text.trim() ? 'default' : 'pointer',
              opacity: saving || !text.trim() ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >{saving ? '...' : '💾 שמור הערה'}</button>
        </div>
      </div>
    </div>
  )
}

// ── History panel ───────────────────────────────────────────────────────────

function HistoryItem({ h }) {
  const [open, setOpen] = useState(false)
  const summaries = h.summaries || {}
  const hasDetails = (h.advantages?.length > 0) || (h.disadvantages?.length > 0) ||
    (h.matching_technologies?.length > 0) || h.experience_note || h.management_note ||
    summaries.submission_summary

  return (
    <div style={{ ...s.historyItem, cursor: hasDetails ? 'pointer' : 'default' }}
         onClick={() => hasDetails && setOpen(o => !o)}>
      <div style={s.historyHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={s.historyJob}>💼 {h.job_title}</span>
          {hasDetails && (
            <span style={{ color: '#475569', fontSize: '11px' }}>{open ? '▲' : '▼'}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...s.historyPct, color: pctColor(h.match_percentage) }}>
            {h.match_percentage}%
          </span>
          <span style={s.historyDate}>
            {new Date(h.matched_at).toLocaleDateString('he-IL', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </span>
        </div>
      </div>

      {/* collapsed: show recommendation + missing */}
      {!open && (
        <>
          {h.recommendation && (
            <div style={s.historyRec}>💡 {h.recommendation}</div>
          )}
          {h.missing_requirements?.length > 0 && (
            <div style={s.techRow}>
              {h.missing_requirements.map(t => (
                <span key={t} style={{ ...s.tech, background: '#450a0a', color: '#fca5a5' }}>⚠ {t}</span>
              ))}
            </div>
          )}
        </>
      )}

      {/* expanded: full details */}
      {open && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}
             onClick={e => e.stopPropagation()}>

          {/* experience + management notes */}
          {(h.experience_note || h.management_note) && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {h.experience_note && (
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>🕐 {h.experience_note}</span>
              )}
              {h.management_note && (
                <span style={{ fontSize: '12px', color: '#93c5fd' }}>👥 {h.management_note}</span>
              )}
            </div>
          )}

          {/* matching technologies */}
          {h.matching_technologies?.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                טכנולוגיות תואמות
              </div>
              <div style={s.techRow}>
                {h.matching_technologies.map(t => (
                  <span key={t} style={{ ...s.tech, background: '#052e16', color: '#86efac', border: '1px solid #166534' }}>
                    ✅ {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* adv / dis */}
          {(h.advantages?.length > 0 || h.disadvantages?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {h.advantages?.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>יתרונות</div>
                  {h.advantages.map((a, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#86efac', marginBottom: '2px' }}>✓ {a}</div>
                  ))}
                </div>
              )}
              {h.disadvantages?.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>חסרונות</div>
                  {h.disadvantages.map((d, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '2px' }}>✗ {d}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* missing */}
          {h.missing_requirements?.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>חסר</div>
              <div style={s.techRow}>
                {h.missing_requirements.map(t => (
                  <span key={t} style={{ ...s.tech, background: '#450a0a', color: '#fca5a5' }}>⚠ {t}</span>
                ))}
              </div>
            </div>
          )}

          {/* recommendation */}
          {h.recommendation && (
            <div style={{ fontSize: '12px', color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
              💡 {h.recommendation}
            </div>
          )}

          {/* submission summary */}
          {summaries.submission_summary && (
            <div style={{ background: '#0f172a', borderRadius: '6px', padding: '10px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>סיכום להגשה</div>
              {summaries.submission_summary}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryPanel({ candidateId }) {
  const [history, setHistory] = useState(null)

  useEffect(() => {
    fetch(`/api/candidates/${candidateId}/history`)
      .then(r => r.json())
      .then(setHistory)
      .catch(() => setHistory([]))
  }, [candidateId])

  if (!history) return <div style={s.loading}>טוען היסטוריה...</div>
  if (history.length === 0) return <div style={s.noHistory}>אין היסטוריית התאמות</div>

  return (
    <div style={s.historyList}>
      {history.map(h => <HistoryItem key={h.id} h={h} />)}
    </div>
  )
}

// ── Token chip colors ───────────────────────────────────────────────────────

const tokenStyle = (type) => ({
  display: 'inline-flex', alignItems: 'center', gap: '4px',
  borderRadius: '5px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
  ...(type === 'year'
    ? { background: '#172554', color: '#93c5fd', border: '1px solid #1d4ed8' }
    : type === 'mgmt'
      ? { background: '#1e1b4b', color: '#a5b4fc', border: '1px solid #4338ca' }
      : { background: '#1c2a1c', color: '#86efac', border: '1px solid #166534' }
  ),
})

// ── Main component ──────────────────────────────────────────────────────────

export default function CandidatesView({ candidates }) {
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState(null)
  const [focused, setFocused]   = useState(false)
  const [hlIdx, setHlIdx]       = useState(-1)
  const inputRef = useRef(null)
  const wrapRef  = useRef(null)

  // AI search mode
  const [aiMode, setAiMode]           = useState(false)
  const [aiQuery, setAiQuery]         = useState('')
  const [aiSearching, setAiSearching] = useState(false)
  const [aiTokens, setAiTokens]       = useState(null)  // string[][] — AND groups of OR alternatives
  const [aiError, setAiError]         = useState(null)

  // Remove a chip from an AI token group; remove whole group if it becomes empty
  const removeChip = (gi, ci) => {
    setAiTokens(prev => {
      const next = prev.map((g, i) => i === gi ? g.filter((_, j) => j !== ci) : g)
      return next.filter(g => g.length > 0)
    })
  }

  // Build matchesAll-compatible token objects from aiTokens
  const aiTokenObjects = useMemo(
    () => (aiTokens || []).map(group => ({
      type: 'text',
      values: group.map(v => v.toLowerCase()),
      label: group.join(' | '),
    })),
    [aiTokens]
  )

  // Client-side filtered + scored candidates for AI mode
  const aiFiltered = useMemo(() => {
    if (!aiTokens || aiTokenObjects.length === 0) return []
    return candidates
      .filter(c => matchesAll(c, aiTokenObjects))
      .map(c => {
        const hits = aiTokenObjects.filter(tok => tok.values.some(q => matchesText(c, q))).length
        return { ...c, match_percentage: Math.round(hits / aiTokenObjects.length * 100) }
      })
      .sort((a, b) => b.match_percentage - a.match_percentage)
  }, [aiTokens, aiTokenObjects, candidates])

  // ── Selection + export ──────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [checkOpen, setCheckOpen]     = useState(false)

  const toggleSelect = (id) => setSelectedIds(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const exportSelectedToCSV = (privateMode = false) => {
    const displayList = aiTokens !== null ? aiFiltered : filtered
    const rows = [...selectedIds].map(id => displayList.find(c => c.id === id)).filter(Boolean)
    if (!rows.length) return
    const arr = v => Array.isArray(v) ? v.join('; ') : (v || '')
    const esc = v => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const headers = privateMode
      ? ['שם', 'תפקיד נוכחי', 'חברה', 'שנות ניסיון', '% התאמה', 'טכנולוגיות', 'ניסיון ניהולי', 'מיקום']
      : ['שם', 'תפקיד נוכחי', 'חברה', 'שנות ניסיון', '% התאמה', 'טכנולוגיות', 'ניסיון ניהולי', 'מיקום', 'טלפון', 'אימייל']
    const dataRows = rows.map(r => {
      const base = [
        r.name || '', r.current_role || '', r.current_company || '',
        r.total_experience_years || '',
        r.match_percentage != null ? r.match_percentage + '%' : '',
        arr(r.technologies),
        r.management_experience ? `כן (${r.management_years || 0} שנ')` : 'לא',
        r.location || '',
      ]
      if (!privateMode) base.push(r.phone || '', r.email || '')
      return base
    })
    const csv = [headers, ...dataRows].map(row => row.map(esc).join(',')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `מועמדים-נבחרים${privateMode ? '-חסוי' : ''}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // Build sorted suggestion corpus from all candidates (role titles, techs, locations)
  const allSuggestions = useMemo(() => {
    const counts = new Map()
    const add = (val) => {
      const v = (val || '').trim()
      if (v.length >= 2) counts.set(v, (counts.get(v) || 0) + 1)
    }
    for (const c of candidates) {
      add(c.current_role)
      add(c.location)
      for (const t of (c.technologies || [])) add(t)
      for (const r of (c.all_roles || [])) add(typeof r === 'string' ? r : r?.title)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'he'))
      .map(([v]) => v)
  }, [candidates])

  // Active segment = last '+' part; active OR sub-segment = text after last '|'
  const searchParts   = search.split('+')
  const lastSegment   = searchParts[searchParts.length - 1]
  const orParts       = lastSegment.split('|')
  const lastPart      = orParts[orParts.length - 1].trim()
  // Items already confirmed in current OR group (before the last '|')
  const orConfirmed   = orParts.slice(0, -1).map(p => p.trim()).filter(Boolean)
  const segmentHasContent = orConfirmed.length > 0 || (lastPart.length >= 2)

  const filteredSuggs = lastPart.length >= 2
    ? allSuggestions
        .filter(s => s.toLowerCase().includes(lastPart.toLowerCase()) &&
                     !orConfirmed.map(v => v.toLowerCase()).includes(s.toLowerCase()))
        .slice(0, 12)
    : []
  const showDropdown = focused && filteredSuggs.length > 0

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Replace text after last '|' in last '+'-segment with the chosen suggestion
  const selectSuggestion = (sugg) => {
    const parts = search.split('+')
    const orSplit = parts[parts.length - 1].split('|')
    orSplit[orSplit.length - 1] = ' ' + sugg
    parts[parts.length - 1] = orSplit.join('|')
    setSearch(parts.join('+'))
    setFocused(false)
    setHlIdx(-1)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // Append '| suggestion' to current segment to build an OR group
  const addOrSuggestion = (sugg) => {
    const parts = search.split('+')
    const orSplit = parts[parts.length - 1].split('|')
    // Complete current text if non-empty, then add new OR value
    const currentText = orSplit[orSplit.length - 1].trim()
    if (currentText) {
      orSplit[orSplit.length - 1] = ' ' + currentText
    }
    orSplit.push(' ' + sugg)
    parts[parts.length - 1] = orSplit.join('|')
    setSearch(parts.join('+'))
    setHlIdx(-1)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e) => {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setHlIdx(i => Math.min(i + 1, filteredSuggs.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHlIdx(i => Math.max(i - 1, -1))
    } else if ((e.key === 'Enter' || e.key === 'Tab') && hlIdx >= 0) {
      e.preventDefault(); selectSuggestion(filteredSuggs[hlIdx])
    } else if (e.key === 'Escape') {
      setFocused(false); setHlIdx(-1)
    }
  }

  const tokens   = parseQuery(search)
  const hasQuery = tokens.length > 0
  const compound = tokens.length > 1

  const [sortBy, setSortBy] = useState('date_new')

  const sortList = (list) => {
    const a = [...list]
    switch (sortBy) {
      case 'name_az':  return a.sort((x, y) => (x.name || '').localeCompare(y.name || '', 'he'))
      case 'name_za':  return a.sort((x, y) => (y.name || '').localeCompare(x.name || '', 'he'))
      case 'date_new': return a.sort((x, y) => new Date(y.processed_at || 0) - new Date(x.processed_at || 0))
      case 'date_old': return a.sort((x, y) => new Date(x.processed_at || 0) - new Date(y.processed_at || 0))
      case 'exp_high': return a.sort((x, y) => (y.total_experience_years || 0) - (x.total_experience_years || 0))
      case 'exp_low':  return a.sort((x, y) => (x.total_experience_years || 0) - (y.total_experience_years || 0))
      default:         return a
    }
  }

  const filtered = sortList(
    hasQuery ? candidates.filter(c => matchesAll(c, tokens)) : candidates
  )

  const toggle = (id) => setExpanded(prev => prev === id ? null : id)

  const handleAiSearch = async () => {
    if (!aiQuery.trim() || aiSearching) return
    setAiSearching(true)
    setAiTokens(null)
    setAiError(null)
    try {
      const res = await fetch('/api/candidates/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery }),
      })
      let data
      try {
        data = await res.json()
      } catch {
        throw new Error('השרת לא החזיר תשובה תקינה — ודא שהשרת הופעל מחדש לאחר עדכון הקוד')
      }
      if (!res.ok) throw new Error(data.detail || `שגיאת שרת ${res.status}`)
      setAiTokens(data.tokens || [])
    } catch (e) {
      setAiError(e.message || 'שגיאה בחיפוש')
    } finally {
      setAiSearching(false)
    }
  }

  // Shared candidate row renderer
  const CandidateRow = ({ c, showMatch }) => (
    <div style={s.row}>
      <div
        style={{ ...s.rowHeader, background: expanded === c.id ? '#243447' : 'transparent', gap: '10px' }}
        onClick={() => toggle(c.id)}
      >
        {/* Checkbox — stopPropagation so it doesn't expand/collapse the row */}
        <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={selectedIds.has(c.id)}
            onChange={() => toggleSelect(c.id)}
            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#38bdf8' }}
          />
        </div>
        <div style={{ ...s.rowLeft, flex: 1 }}>
          <div style={s.rowName}>{c.name || 'שם לא זמין'}</div>
          <div style={s.rowRole}>
            {c.current_role || '—'}
            {c.total_experience_years > 0 && (
              <span style={{ ...s.yearsExp, marginRight: '8px' }}>· {c.total_experience_years} שנים</span>
            )}
            {c.management_experience && (
              <span style={{ ...s.mgmt, marginRight: '8px' }}>· 👔 ניהולי</span>
            )}
          </div>
        </div>
        <div style={s.rowRight}>
          {showMatch && c.match_percentage != null ? (
            <span style={{
              fontSize: '18px', fontWeight: 800,
              color: c.match_percentage >= 80 ? '#4ade80' : c.match_percentage >= 60 ? '#fbbf24' : '#f87171',
            }}>{c.match_percentage}%</span>
          ) : (
            (c.technologies || []).slice(0, 3).map(t => (
              <span key={t} style={s.badge}>{t}</span>
            ))
          )}
          {c.phone && (
            <a href={`https://wa.me/${waRowPhone(c.phone)}`} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()} title={`ווצאפ: ${c.phone}`}
              style={{ display:'inline-flex', alignItems:'center', padding:'2px 6px', background:'#052e16', border:'1px solid #166534', borderRadius:'4px', color:'#4ade80', fontSize:'11px', fontWeight:700, textDecoration:'none', flexShrink:0 }}>
              💬
            </a>
          )}
          {c.linkedin_url && (
            <a href={c.linkedin_url.startsWith('http') ? c.linkedin_url : 'https://'+c.linkedin_url}
              target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()} title="פתח LinkedIn"
              style={{ display:'inline-flex', alignItems:'center', padding:'2px 7px', background:'#0a1929', border:'1px solid #1d4ed8', borderRadius:'4px', color:'#60a5fa', fontSize:'11px', fontWeight:700, textDecoration:'none', flexShrink:0 }}>
              in
            </a>
          )}
          <span style={s.expand}>{expanded === c.id ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded === c.id && (
        <div style={s.expandedArea}>
          {/* Match summary for AI results */}
          {showMatch && (c.advantages?.length > 0 || c.disadvantages?.length > 0) && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e293b', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {c.advantages?.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>יתרונות</div>
                  {c.advantages.map((a, i) => <div key={i} style={{ fontSize: '12px', color: '#86efac' }}>✓ {a}</div>)}
                </div>
              )}
              {c.disadvantages?.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>חסרונות</div>
                  {c.disadvantages.map((d, i) => <div key={i} style={{ fontSize: '12px', color: '#fca5a5' }}>✗ {d}</div>)}
                </div>
              )}
            </div>
          )}
          <div style={s.cardWrap}>
            <CandidateCard candidate={c} rank={null} />
          </div>
          <div style={{ ...s.historySection, borderTop: '1px solid #1e3a2e' }}>
            <div style={{ ...s.historyTitle, color: '#4ade80' }}>📝 הערות</div>
            <NotesPanel candidateId={c.id} />
          </div>
          <div style={s.historySection}>
            <div style={s.historyTitle}>היסטוריית התאמות למשרות</div>
            <HistoryPanel candidateId={c.id} />
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Mode toggle + sort */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center' }}>
        <button
          onClick={() => { setAiMode(false); setAiTokens(null); setAiError(null) }}
          style={{
            padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: aiMode ? '#1e293b' : '#1d4ed8', color: aiMode ? '#64748b' : '#fff',
          }}
        >🔍 חיפוש</button>
        <button
          onClick={() => setAiMode(true)}
          style={{
            padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            background: aiMode ? '#7c3aed' : '#1e293b', color: aiMode ? '#fff' : '#64748b',
          }}
        >✨ חיפוש AI</button>

        {/* Sort selector — only affects normal search mode */}
        {!aiMode && (
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              marginRight: 'auto', padding: '5px 10px',
              background: '#1e293b', border: '1px solid #334155',
              borderRadius: '6px', color: '#94a3b8', fontSize: '12px',
              cursor: 'pointer', outline: 'none',
            }}
          >
            <option value="date_new">📅 תאריך הוספה — חדש לישן</option>
            <option value="date_old">📅 תאריך הוספה — ישן לחדש</option>
            <option value="name_az">🔤 שם — א ← ת</option>
            <option value="name_za">🔤 שם — ת ← א</option>
            <option value="exp_high">⏱ ניסיון — רב לפחות</option>
            <option value="exp_low">⏱ ניסיון — פחות לרב</option>
          </select>
        )}
      </div>

      {/* ── Selection export toolbar ── */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          padding: '8px 12px', marginBottom: '10px',
          background: '#1e3a5f', border: '1px solid #1d4ed8', borderRadius: '8px',
        }}>
          <span style={{ fontSize: '13px', color: '#93c5fd', fontWeight: 700, flex: 1 }}>
            ✓ {selectedIds.size} מועמדים נבחרו
          </span>
          <button
            onClick={() => exportSelectedToCSV(false)}
            style={{ padding: '5px 14px', background: '#0a2e1a', border: '1px solid #166534', borderRadius: '6px', color: '#4ade80', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >📥 ייצוא Excel</button>
          <button
            onClick={() => exportSelectedToCSV(true)}
            style={{ padding: '5px 14px', background: '#1a1a2e', border: '1px solid #4c1d95', borderRadius: '6px', color: '#c4b5fd', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >🔒 חסוי</button>
          <button
            onClick={() => setCheckOpen(o => !o)}
            style={{
              padding: '5px 14px',
              background: checkOpen ? '#1e3a5f' : '#0d1b2e',
              border: `1px solid ${checkOpen ? '#60a5fa' : '#1d4ed8'}`,
              borderRadius: '6px', color: '#60a5fa', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}
          >🎯 בדוק מול משרה</button>
          <button
            onClick={() => { setSelectedIds(new Set()); setCheckOpen(false) }}
            style={{ padding: '5px 10px', background: 'none', border: '1px solid #334155', borderRadius: '6px', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
          >✕ בטל בחירה</button>
        </div>
      )}

      {/* ── Check vs job panel ── */}
      {checkOpen && selectedIds.size > 0 && (
        <CheckVsJobPanel
          selectedIds={selectedIds}
          onClose={() => setCheckOpen(false)}
        />
      )}

      {aiMode ? (
        /* ── AI Search mode ── */
        <>
          <textarea
            value={aiQuery}
            onChange={e => setAiQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAiSearch() }}
            placeholder={'תאר בחופשיות את המועמד שאתה מחפש...\nדוגמה: אני צריך מנתחי מערכות שמכירים Power Platform. הכי חשוב שיכירו Flow.'}
            dir="auto"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 14px',
              background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
              color: '#e2e8f0', fontSize: '13px', outline: 'none',
              resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', marginBottom: '12px' }}>
            <button
              onClick={handleAiSearch}
              disabled={aiSearching || !aiQuery.trim()}
              style={{
                padding: '8px 22px', background: '#7c3aed', color: '#fff',
                border: 'none', borderRadius: '7px', cursor: aiSearching || !aiQuery.trim() ? 'default' : 'pointer',
                fontSize: '14px', fontWeight: 700, opacity: aiSearching || !aiQuery.trim() ? 0.6 : 1,
              }}
            >
              {aiSearching ? '⏳ מחפש...' : '✨ חפש עם AI'}
            </button>
          </div>

          {/* Editable AND/OR chip groups */}
          {aiTokens && aiTokens.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#475569', marginBottom: '6px' }}>
                שרשור חיפוש · לחץ ✕ להסרת מילת מפתח · הסרה מעדכנת את הרשימה באופן מיידי:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                {aiTokens.flatMap((group, gi) => {
                  const items = []
                  if (gi > 0) {
                    items.push(
                      <span key={`and-${gi}`} style={{
                        fontSize: '10px', fontWeight: 800, color: '#64748b',
                        background: '#0f172a', border: '1px solid #1e293b',
                        borderRadius: '4px', padding: '2px 7px',
                      }}>AND</span>
                    )
                  }
                  items.push(
                    <span key={`group-${gi}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: '#1c2a1c', border: '1px solid #166534',
                      borderRadius: '6px', padding: '3px 8px',
                    }}>
                      {group.flatMap((chip, ci) => {
                        const chipItems = []
                        if (ci > 0) {
                          chipItems.push(
                            <span key={`or-${gi}-${ci}`} style={{ fontSize: '9px', color: '#64748b', fontWeight: 800, margin: '0 1px' }}>OR</span>
                          )
                        }
                        chipItems.push(
                          <span key={`chip-${gi}-${ci}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontSize: '11px', color: '#86efac', fontWeight: 600 }}>{chip}</span>
                            <button
                              onClick={() => removeChip(gi, ci)}
                              title="הסר"
                              style={{
                                background: 'none', border: 'none', color: '#64748b',
                                cursor: 'pointer', fontSize: '12px', lineHeight: 1,
                                padding: '0 0 0 3px', display: 'flex', alignItems: 'center',
                              }}
                            >✕</button>
                          </span>
                        )
                        return chipItems
                      })}
                    </span>
                  )
                  return items
                })}
              </div>
            </div>
          )}

          {aiError && (
            <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '8px' }}>⚠ {aiError}</div>
          )}

          {aiTokens !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#475569' }}>
                {aiFiltered.length === 0
                  ? 'לא נמצאו מועמדים תואמים — נסה להסיר מילות מפתח'
                  : `${aiFiltered.length} מועמדים · ממוינים לפי התאמה`}
              </span>
              {aiFiltered.length > 0 && (
                <button
                  onClick={() => {
                    const allSel = aiFiltered.every(c => selectedIds.has(c.id))
                    setSelectedIds(allSel ? new Set() : new Set(aiFiltered.map(c => c.id)))
                  }}
                  style={{ background: 'none', border: 'none', fontSize: '11px', color: '#475569', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  {aiFiltered.every(c => selectedIds.has(c.id)) ? 'בטל בחירת הכל' : 'בחר הכל'}
                </button>
              )}
            </div>
          )}

          <div style={s.wrap}>
            {aiFiltered.map(c => <CandidateRow key={c.id} c={c} showMatch={true} />)}
          </div>
        </>
      ) : (
        /* ── Normal search mode ── */
        <>
          <div ref={wrapRef} style={s.searchWrap}>
            <input
              ref={inputRef}
              style={s.search}
              placeholder="חיפוש: שם / מייל / נייד / תפקיד / טכנולוגיה   |   חיפוש מורכב: Salesforce + 4 שנים + System Analyst"
              value={search}
              onChange={e => { setSearch(e.target.value); setHlIdx(-1); setFocused(true) }}
              onFocus={() => setFocused(true)}
              onKeyDown={handleKeyDown}
              dir="auto"
              autoComplete="off"
            />
            {showDropdown && (
              <div style={s.dropdown}>
                {segmentHasContent && (
                  <div style={{ padding: '5px 12px 3px', fontSize: '10px', color: '#475569', borderBottom: '1px solid #0f172a' }}>
                    לחץ להחלפה · <strong style={{ color: '#93c5fd' }}>OR</strong> להוספה לקבוצת OR
                  </div>
                )}
                {filteredSuggs.map((sugg, i) => (
                  <div
                    key={sugg}
                    style={{ ...s.dropItem, ...(i === hlIdx ? s.dropItemActive : {}), justifyContent: 'space-between' }}
                    onMouseEnter={() => setHlIdx(i)}
                  >
                    <span
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, cursor: 'pointer' }}
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(sugg) }}
                    >
                      <span style={{ opacity: 0.4, fontSize: '11px' }}>🔍</span>
                      <span>{sugg}</span>
                    </span>
                    {segmentHasContent && (
                      <span
                        onMouseDown={e => { e.preventDefault(); addOrSuggestion(sugg) }}
                        style={{
                          marginLeft: '8px', padding: '1px 7px', borderRadius: '4px', fontSize: '10px',
                          fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                          background: '#172554', color: '#93c5fd', border: '1px solid #1d4ed8',
                        }}
                      >OR</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {compound && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', margin: '6px 0 10px' }}>
              <span style={{ fontSize: '11px', color: '#475569', alignSelf: 'center' }}>חיתוך:</span>
              {tokens.map((tok, i) => (
                <span key={i} style={tokenStyle(tok.type)}>
                  {tok.type === 'year'
                    ? tok.min !== undefined && tok.max !== undefined
                      ? `⏱ ${tok.min}–${tok.max} שנים`
                      : tok.min !== undefined ? `⏱ ≥${tok.min} שנים` : `⏱ ≤${tok.max} שנים`
                    : tok.type === 'mgmt' ? '👔 ניהולי'
                    : tok.values?.length > 1
                      ? <>{tok.values.map((v, vi) => (
                          <span key={vi} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            {vi > 0 && <span style={{ opacity: 0.5, margin: '0 2px' }}>|</span>}
                            🔍 {v}
                          </span>
                        ))}</>
                      : `🔍 ${tok.label}`}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              {hasQuery
                ? `${filtered.length} מועמדים תואמים${compound ? ` (${tokens.length} תנאים בחיתוך)` : ''}`
                : `${candidates.length} מועמדים`}
            </span>
            {filtered.length > 0 && (
              <button
                onClick={() => {
                  const allSel = filtered.every(c => selectedIds.has(c.id))
                  setSelectedIds(allSel ? new Set() : new Set(filtered.map(c => c.id)))
                }}
                style={{ background: 'none', border: 'none', fontSize: '11px', color: '#475569', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                {filtered.every(c => selectedIds.has(c.id)) ? 'בטל בחירת הכל' : 'בחר הכל'}
              </button>
            )}
          </div>

          <div style={s.wrap}>
            {filtered.map(c => <CandidateRow key={c.id} c={c} showMatch={false} />)}
            {hasQuery && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔍</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>לא נמצאו מועמדים התואמים את כל התנאים</div>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>נסה להרחיב את החיפוש או להסיר תנאי אחד</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
