import { useState, useRef, useEffect, useMemo } from 'react'

const inp = {
  padding: '10px 12px',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const textarea = { ...inp, resize: 'vertical', lineHeight: 1.6 }

const MODES = [
  { key: 'standard',     label: '⚖️ סטנדרטי',   desc: 'ניתוח מאוזן' },
  { key: 'conservative', label: '🔒 זהיר',        desc: 'רק מה שכתוב במפורש' },
  { key: 'marketing',    label: '📣 שיווקי',      desc: 'ניסוח חזק אך אמיתי' },
]

const STATUS_COLORS = {
  'קיים':   { bg: '#052e16', border: '#166534', text: '#4ade80' },
  'חלקי':  { bg: '#1c1917', border: '#78350f', text: '#fbbf24' },
  'נרמז':  { bg: '#0c1a2e', border: '#1e3a5f', text: '#60a5fa' },
  'חסר':   { bg: '#450a0a', border: '#7f1d1d', text: '#f87171' },
  'יתרון': { bg: '#1a1042', border: '#4c1d95', text: '#a78bfa' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildCandidateText(c) {
  const lines = []
  if (c.name) lines.push(`שם: ${c.name}`)
  if (c.current_role) lines.push(`תפקיד נוכחי: ${c.current_role}`)
  if (c.current_company) lines.push(`חברה נוכחית: ${c.current_company}`)
  if (c.total_experience_years) lines.push(`שנות ניסיון: ${c.total_experience_years}`)
  if (c.management_experience) {
    const scope = c.management_scope ? ` (${c.management_scope})` : ''
    lines.push(`ניסיון ניהולי: כן${scope}`)
    if (c.management_years) lines.push(`שנות ניהול: ${c.management_years}`)
  }
  if (c.location) lines.push(`מיקום: ${c.location}`)
  if (c.education) lines.push(`השכלה: ${c.education}`)
  if (c.technologies?.length) lines.push(`טכנולוגיות: ${c.technologies.join(', ')}`)
  if (c.notable_companies?.length) lines.push(`חברות בולטות: ${c.notable_companies.join(', ')}`)

  if (c.all_roles?.length) {
    lines.push('\nניסיון מקצועי:')
    c.all_roles.slice(0, 8).forEach(r => {
      if (typeof r === 'string') {
        lines.push(`• ${r}`)
      } else if (r && typeof r === 'object') {
        const parts = [r.title, r.company, r.years].filter(Boolean)
        lines.push(`• ${parts.join(' | ')}`)
        if (r.description) lines.push(`  ${r.description}`)
      }
    })
  }

  const summary = c.raw_summary_he || c.raw_summary
  if (summary) {
    lines.push('\nסיכום מקצועי:')
    lines.push(summary)
  }

  return lines.join('\n')
}

function buildJobText(job) {
  const req = job.requirements || {}
  const lines = []
  lines.push(`שם משרה: ${req.role_title || job.title}`)
  if (job.reference_number) lines.push(`קוד משרה: ${job.reference_number}`)
  if (req.min_experience_years) lines.push(`ניסיון מינימלי: ${req.min_experience_years} שנים`)
  if (req.location) lines.push(`מיקום: ${req.location}`)
  if (req.hybrid_mode) lines.push(`אופן עבודה: ${req.hybrid_mode}`)
  if (req.salary_range) lines.push(`טווח שכר: ${req.salary_range}`)
  if (req.org_type) lines.push(`סוג ארגון: ${req.org_type}`)
  if (req.domain) lines.push(`תחום: ${req.domain}`)
  if (req.management_required) lines.push('ניסיון ניהולי: נדרש')
  if (req.vendor_experience_required) lines.push('ניסיון מצד ספק: נדרש')

  if (req.required_technologies?.length) {
    lines.push(`\nדרישות חובה (טכנולוגיות/כישורים):\n${req.required_technologies.map(t => `• ${t}`).join('\n')}`)
  }
  if (req.nice_to_have?.length) {
    lines.push(`\nיתרון:\n${req.nice_to_have.map(t => `• ${t}`).join('\n')}`)
  }
  if (req.additional_notes) {
    lines.push(`\nהערות נוספות:\n${req.additional_notes}`)
  }
  return lines.join('\n')
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SourceToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '4px', background: '#0f172a', borderRadius: '7px', padding: '3px', border: '1px solid #334155' }}>
      {[
        { key: 'manual', label: '✏️ ידני' },
        { key: 'db',     label: '🗄️ מהמאגר' },
      ].map(s => (
        <button key={s.key} onClick={() => onChange(s.key)} style={{
          padding: '5px 14px', border: 'none', borderRadius: '5px', cursor: 'pointer',
          background: value === s.key ? '#38bdf8' : 'transparent',
          color:      value === s.key ? '#0f172a' : '#64748b',
          fontSize: '12px', fontWeight: 600, transition: 'all 0.15s',
        }}>{s.label}</button>
      ))}
    </div>
  )
}

function SearchableSelect({ items, value, onChange, placeholder, renderItem, filterItem }) {
  const [query, setQuery] = useState('')
  const [open,  setOpen]  = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(
    () => items.filter(item => filterItem(item, query)),
    [items, query, filterItem]
  )

  const selected = value ? items.find(i => i.id === value) : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          ...inp, cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', userSelect: 'none',
          border: open ? '1px solid #38bdf8' : '1px solid #334155',
        }}
      >
        <span style={{ color: selected ? '#e2e8f0' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selected ? renderItem(selected, true) : placeholder}
        </span>
        <span style={{ color: '#475569', marginRight: '8px', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
          marginTop: '4px', maxHeight: '280px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '8px' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="חיפוש..."
              dir="auto"
              style={{ ...inp, padding: '7px 10px', fontSize: '12px' }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '220px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>לא נמצאו תוצאות</div>
            ) : filtered.map(item => (
              <div
                key={item.id}
                onClick={() => { onChange(item.id); setOpen(false); setQuery('') }}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: '13px',
                  background: item.id === value ? '#1e3a5f' : 'transparent',
                  color: item.id === value ? '#60a5fa' : '#e2e8f0',
                  borderBottom: '1px solid #0f172a',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (item.id !== value) e.currentTarget.style.background = '#334155' }}
                onMouseLeave={e => { if (item.id !== value) e.currentTarget.style.background = 'transparent' }}
              >
                {renderItem(item, false)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['חסר']
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '5px',
      fontSize: '11px', fontWeight: 700, flexShrink: 0,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>{status}</span>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} style={{
      padding: '4px 12px', background: copied ? '#052e16' : '#1e293b',
      border: `1px solid ${copied ? '#166534' : '#334155'}`,
      borderRadius: '6px', color: copied ? '#4ade80' : '#94a3b8',
      fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
    }}>{copied ? '✓ הועתק' : '📋 העתק'}</button>
  )
}

function MatchGrades({ grades }) {
  if (!grades?.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {grades.map((g, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '9px 12px',
        }}>
          <StatusBadge status={g.status} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600 }}>{g.requirement}</div>
            {g.note && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{g.note}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function ScoreMeter({ pct }) {
  const color = pct >= 80 ? '#4ade80' : pct >= 65 ? '#38bdf8' : pct >= 50 ? '#fbbf24' : '#f87171'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '32px', fontWeight: 800, color }}>{pct}%</div>
      <div style={{ flex: 1, height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer',
        color: '#f1f5f9', fontSize: '13px', fontWeight: 700, textAlign: 'right',
      }}>
        <span style={{ color: '#475569', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
        {title}
      </button>
      {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SubmissionBuilder() {
  // Source mode: 'manual' | 'db'
  const [jobSource,       setJobSource]       = useState('manual')
  const [candidateSource, setCandidateSource] = useState('manual')

  // DB data
  const [jobs,       setJobs]       = useState(null)
  const [candidates, setCandidates] = useState(null)
  const [selectedJobId,       setSelectedJobId]       = useState(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState(null)

  // Text inputs
  const [jobText,       setJobText]       = useState('')
  const [candidateText, setCandidateText] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [salary,        setSalary]        = useState('')
  const [availability,  setAvailability]  = useState('')
  const [callNotes,     setCallNotes]     = useState('')

  // UI
  const [mode,    setMode]    = useState('standard')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const [error,   setError]   = useState(null)

  const resultRef = useRef(null)

  // Load DB data on demand
  useEffect(() => {
    if (jobSource === 'db' && jobs === null) {
      fetch('/api/jobs').then(r => r.json()).then(setJobs).catch(() => setJobs([]))
    }
  }, [jobSource, jobs])

  useEffect(() => {
    if (candidateSource === 'db' && candidates === null) {
      fetch('/api/candidates').then(r => r.json()).then(setCandidates).catch(() => setCandidates([]))
    }
  }, [candidateSource, candidates])

  // When a job is selected from DB, populate jobText
  const handleSelectJob = (jobId) => {
    setSelectedJobId(jobId)
    const job = jobs?.find(j => j.id === jobId)
    if (job) setJobText(buildJobText(job))
  }

  // When a candidate is selected from DB, populate all candidate fields
  const handleSelectCandidate = (candidateId) => {
    setSelectedCandidateId(candidateId)
    const c = candidates?.find(x => x.id === candidateId)
    if (!c) return
    setCandidateText(buildCandidateText(c))
    if (c.name) setCandidateName(c.name)
    if (c.salary_expectation) setSalary(c.salary_expectation)
    if (c.availability) setAvailability(c.availability)
    if (c.call_notes) setCallNotes(c.call_notes)
  }

  // Clear DB selection when switching back to manual
  const handleJobSourceChange = (src) => {
    setJobSource(src)
    if (src === 'manual') { setSelectedJobId(null) }
  }
  const handleCandidateSourceChange = (src) => {
    setCandidateSource(src)
    if (src === 'manual') { setSelectedCandidateId(null) }
  }

  const analyze = async () => {
    if (!jobText.trim() || !candidateText.trim()) {
      setError('יש להזין גם תיאור משרה וגם פרטי מועמד')
      return
    }
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await fetch('/api/submission-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_text: jobText,
          candidate_text: candidateText,
          candidate_name: candidateName,
          salary, availability,
          call_notes: callNotes,
          mode,
        }),
      })
      if (!r.ok) { const d = await r.json(); throw new Error(d.detail || 'שגיאה בניתוח') }
      const data = await r.json()
      setResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setResult(null); setError(null) }

  // ── Input Panel ──────────────────────────────────────────────────────────────
  const inputPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Mode */}
      <div style={{ display: 'flex', gap: '6px', background: '#1e293b', borderRadius: '10px', padding: '4px', border: '1px solid #334155' }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} title={m.desc} style={{
            flex: 1, padding: '8px 6px', border: 'none', borderRadius: '7px', cursor: 'pointer',
            background: mode === m.key ? '#38bdf8' : 'transparent',
            color:      mode === m.key ? '#0f172a'  : '#64748b',
            fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
          }}>{m.label}</button>
        ))}
      </div>

      {/* ── Job section ── */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            📋 תיאור משרה <span style={{ color: '#f87171' }}>*</span>
          </div>
          <SourceToggle value={jobSource} onChange={handleJobSourceChange} />
        </div>

        {jobSource === 'db' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {jobs === null ? (
              <div style={{ color: '#475569', fontSize: '12px', padding: '8px' }}>טוען משרות...</div>
            ) : (
              <SearchableSelect
                items={jobs}
                value={selectedJobId}
                onChange={handleSelectJob}
                placeholder="בחר משרה מהמאגר..."
                filterItem={(job, q) => {
                  const s = q.toLowerCase()
                  return !s ||
                    job.title?.toLowerCase().includes(s) ||
                    job.reference_number?.toLowerCase().includes(s) ||
                    job.requirements?.role_title?.toLowerCase().includes(s)
                }}
                renderItem={(job, compact) => compact ? (
                  <span>{job.title}{job.reference_number ? ` — ${job.reference_number}` : ''}</span>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600 }}>{job.title}</div>
                    {(job.reference_number || job.requirements?.role_title) && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {job.reference_number && `#${job.reference_number}`}
                        {job.requirements?.min_experience_years && ` · ${job.requirements.min_experience_years} שנ'`}
                        {job.requirements?.location && ` · ${job.requirements.location}`}
                      </div>
                    )}
                  </div>
                )}
              />
            )}
            {selectedJobId && (
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                ניתן לערוך את הטקסט שנטען ↓
              </div>
            )}
          </div>
        ) : null}

        <textarea
          value={jobText}
          onChange={e => setJobText(e.target.value)}
          placeholder={jobSource === 'db' && !selectedJobId
            ? 'בחר משרה מהמאגר למעלה...'
            : 'הדבק כאן את תיאור המשרה המלא — כולל דרישות חובה, יתרון, תנאים...'}
          dir="auto"
          rows={jobSource === 'db' && selectedJobId ? 8 : 10}
          style={textarea}
        />
      </div>

      {/* ── Candidate section ── */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>👤 פרטי מועמד</div>
          <SourceToggle value={candidateSource} onChange={handleCandidateSourceChange} />
        </div>

        {candidateSource === 'db' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {candidates === null ? (
              <div style={{ color: '#475569', fontSize: '12px', padding: '8px' }}>טוען מועמדים...</div>
            ) : (
              <SearchableSelect
                items={candidates}
                value={selectedCandidateId}
                onChange={handleSelectCandidate}
                placeholder="בחר מועמד מהמאגר..."
                filterItem={(c, q) => {
                  const s = q.toLowerCase()
                  return !s ||
                    c.name?.toLowerCase().includes(s) ||
                    c.current_role?.toLowerCase().includes(s) ||
                    c.current_company?.toLowerCase().includes(s) ||
                    (c.technologies || []).some(t => t?.toLowerCase().includes(s))
                }}
                renderItem={(c, compact) => compact ? (
                  <span>{c.name}{c.current_role ? ` — ${c.current_role}` : ''}</span>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {[c.current_role, c.current_company, c.total_experience_years ? `${c.total_experience_years} שנ'` : null]
                        .filter(Boolean).join(' · ')}
                    </div>
                    {c.technologies?.length > 0 && (
                      <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                        {c.technologies.slice(0, 5).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              />
            )}
            {selectedCandidateId && (
              <div style={{ fontSize: '11px', color: '#475569' }}>הפרטים נטענו אוטומטית — ניתן לערוך</div>
            )}
          </div>
        ) : null}

        {/* Name / salary / availability row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>שם מועמד</div>
            <input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="שם מלא" dir="auto" style={inp} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>ציפיות שכר</div>
            <input value={salary} onChange={e => setSalary(e.target.value)} placeholder="28-30K + רכב" dir="auto" style={inp} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>זמינות</div>
            <input value={availability} onChange={e => setAvailability(e.target.value)} placeholder="מיידית / חודש הודעה" dir="auto" style={inp} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>
            קורות חיים / סיכום מקצועי <span style={{ color: '#f87171' }}>*</span>
          </div>
          <textarea
            value={candidateText}
            onChange={e => setCandidateText(e.target.value)}
            placeholder={candidateSource === 'db' && !selectedCandidateId
              ? 'בחר מועמד מהמאגר למעלה...'
              : 'הדבק קורות חיים מלאים, סיכום מקצועי, או כל מידע זמין...'}
            dir="auto"
            rows={candidateSource === 'db' && selectedCandidateId ? 8 : 10}
            style={textarea}
          />
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>הערות משיחת טלפון (לא חובה)</div>
          <textarea
            value={callNotes}
            onChange={e => setCallNotes(e.target.value)}
            placeholder="מידע שעלה בשיחה: הסברים, מוטיבציה, הגבלות, ציפיות מיוחדות..."
            dir="auto"
            rows={4}
            style={textarea}
          />
        </div>
      </div>

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#f87171' }}>
          ⚠ {error}
        </div>
      )}

      <button
        onClick={analyze}
        disabled={loading || !jobText.trim() || !candidateText.trim()}
        style={{
          padding: '12px 28px', background: loading ? '#1e3a5f' : '#1d4ed8',
          border: '1px solid #2563eb', borderRadius: '10px', color: '#fff',
          fontSize: '14px', fontWeight: 700,
          cursor: loading || !jobText.trim() || !candidateText.trim() ? 'not-allowed' : 'pointer',
          opacity: (!jobText.trim() || !candidateText.trim()) ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        {loading ? (
          <>
            <div style={{ width: '14px', height: '14px', border: '2px solid #334155', borderTop: '2px solid #38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            מנתח...
          </>
        ) : '🤝 נתח והפק סיכום הגשה'}
      </button>
    </div>
  )

  // ── Result Panel ─────────────────────────────────────────────────────────────
  const resultPanel = result && (
    <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>📊 תוצאות ניתוח</div>
        <button onClick={reset} style={{ padding: '6px 14px', background: 'none', border: '1px solid #334155', borderRadius: '7px', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>
          ← ניתוח חדש
        </button>
      </div>

      {/* Score */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px', fontWeight: 600 }}>ציון התאמה</div>
        <ScoreMeter pct={result.match_percentage || 0} />
        {result.recommendation && (
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '10px', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
            {result.recommendation}
          </div>
        )}
      </div>

      {/* Submission formatted */}
      <Section title="📄 סיכום הגשה מוכן">
        <div style={{
          background: '#020817', border: '1px solid #1e3a5f', borderRadius: '8px',
          padding: '16px', fontFamily: 'monospace', fontSize: '13px', color: '#e2e8f0',
          lineHeight: 1.8, whiteSpace: 'pre-wrap', direction: 'rtl',
        }}>
          {result.submission_formatted}
        </div>
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
          <CopyButton text={result.submission_formatted} />
        </div>
      </Section>

      {/* Short summary */}
      {result.short_summary && (
        <Section title="💬 בשתי שורות למה להגיש" defaultOpen={false}>
          <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.8, direction: 'rtl' }}>
            {result.short_summary}
          </div>
        </Section>
      )}

      {/* Match grades */}
      {result.match_grades?.length > 0 && (
        <Section title="✅ בדיקת דרישות סעיף-מול-סעיף">
          <MatchGrades grades={result.match_grades} />
        </Section>
      )}

      {/* Advantages + disadvantages */}
      {(result.advantages?.length > 0 || result.disadvantages?.length > 0) && (
        <Section title="⚖️ חוזקות וחוסרים" defaultOpen={false}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: 700, marginBottom: '8px' }}>✓ חוזקות</div>
              {(result.advantages || []).map((a, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px', display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#4ade80', flexShrink: 0 }}>•</span>{a}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#f87171', fontWeight: 700, marginBottom: '8px' }}>✗ חוסרים</div>
              {(result.disadvantages || []).map((d, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px', display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#f87171', flexShrink: 0 }}>•</span>{d}
                </div>
              ))}
              {(result.missing_summary || []).map((m, i) => (
                <div key={`ms-${i}`} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '5px', display: 'flex', gap: '6px' }}>
                  <span style={{ color: '#fbbf24', flexShrink: 0 }}>•</span>{m}
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Job parsed */}
      {result.job_parsed && (
        <Section title="🔍 ניתוח המשרה" defaultOpen={false}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {result.job_parsed.role_title && (
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>{result.job_parsed.role_title}</div>
            )}
            {result.job_parsed.mandatory_requirements?.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, marginBottom: '6px' }}>דרישות חובה</div>
                {result.job_parsed.mandatory_requirements.map((r, i) => <div key={i} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>• {r}</div>)}
              </div>
            )}
            {result.job_parsed.nice_to_have?.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 700, marginBottom: '6px' }}>יתרון</div>
                {result.job_parsed.nice_to_have.map((r, i) => <div key={i} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>• {r}</div>)}
              </div>
            )}
            {result.job_parsed.hidden_signals?.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700, marginBottom: '6px' }}>דגשים סמויים</div>
                {result.job_parsed.hidden_signals.map((r, i) => <div key={i} style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>⚡ {r}</div>)}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Candidate parsed */}
      {result.candidate_parsed && (
        <Section title="👤 ניתוח המועמד" defaultOpen={false}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
            {[
              ['תפקיד נוכחי', result.candidate_parsed.current_role],
              ['שנות ניסיון', result.candidate_parsed.total_experience_years != null ? `${result.candidate_parsed.total_experience_years} שנים` : null],
              ['ניסיון ניהולי', result.candidate_parsed.management_experience ? (result.candidate_parsed.management_scope || 'כן') : 'לא'],
              ['השכלה', result.candidate_parsed.education],
            ].filter(([, v]) => v).map(([k, v], i) => (
              <div key={i} style={{ background: '#1e293b', borderRadius: '7px', padding: '8px 12px' }}>
                <div style={{ fontSize: '10px', color: '#475569', marginBottom: '3px' }}>{k}</div>
                <div style={{ color: '#e2e8f0' }}>{v}</div>
              </div>
            ))}
          </div>
          {result.candidate_parsed.key_technologies?.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>טכנולוגיות מרכזיות</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {result.candidate_parsed.key_technologies.map((t, i) => (
                  <span key={i} style={{ padding: '3px 9px', background: '#1e293b', border: '1px solid #334155', borderRadius: '5px', fontSize: '12px', color: '#cbd5e1' }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
      {inputPanel}
      {resultPanel}
    </div>
  )
}
