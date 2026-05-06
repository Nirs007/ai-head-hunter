import { useState, useEffect, useRef } from 'react'
import CandidateCard from './CandidateCard.jsx'
import { useScanContext, DEFAULT_SCAN } from '../context/ScanContext.jsx'

// ── Reminder creation modal ──────────────────────────────────────────────────

// Format Israeli phone for wa.me (strip non-digits, replace leading 0 with 972)
function toWaPhone(phone) {
  const d = (phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) return '972' + d.slice(1)
  return '972' + d
}

function ReminderCreateModal({ defaultTitle, candidateId, candidateName, candidatePhone, jobId, jobTitle, onSaved, onSkip }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const pad = n => String(n).padStart(2, '0')
  const defaultDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}`

  const [title,      setTitle]      = useState(defaultTitle || '')
  const [desc,       setDesc]       = useState('')
  const [date,       setDate]       = useState(defaultDate)
  const [time,       setTime]       = useState('09:00')
  const [users,      setUsers]      = useState(null)
  const [userId,     setUserId]     = useState('')
  const [sendWa,     setSendWa]     = useState(false)
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]))
  }, [])

  const waPhone = toWaPhone(candidatePhone)

  const inpSt = { padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '7px', color: '#e2e8f0', fontSize: '13px', outline: 'none' }

  const save = async () => {
    if (!title.trim() || !date || !time) return
    setSaving(true)
    const due_at = new Date(`${date}T${time}:00`).toISOString()
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description: desc, due_at,
          candidate_id: candidateId, job_id: jobId,
          candidate_name: candidateName, job_title: jobTitle,
          assigned_user_id: userId ? +userId : null,
          candidate_phone: candidatePhone || '',
        }),
      })
      if (sendWa && waPhone) {
        const msg = encodeURIComponent(`שלום ${candidateName || ''},\nרצינו לעדכן אותך בנוגע למשרת ${jobTitle || ''}.`)
        window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank')
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }} onClick={onSkip}>
      <div style={{
        background: '#0f172a', border: '1px solid #334155', borderRadius: '14px',
        padding: '22px 24px', width: '460px', maxWidth: '95vw',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>🔔 הגדרת תזכורת</div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>המועמד התקבל — האם לקבוע תזכורת מעקב?</div>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת התזכורת *" dir="auto"
          style={{ ...inpSt, width: '100%', boxSizing: 'border-box' }} />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="תיאור (לא חובה)" dir="auto" rows={2}
          style={{ ...inpSt, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ ...inpSt, flex: 1, colorScheme: 'dark' }} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            style={{ ...inpSt, width: '110px', colorScheme: 'dark' }} />
        </div>

        {/* Email + WhatsApp */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>שליחה במייל (לא חובה)</div>
          <select value={userId} onChange={e => setUserId(e.target.value)}
            style={{ ...inpSt, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
            <option value="">— ללא שליחת מייל —</option>
            {(users || []).map(u => (
              <option key={u.id} value={u.id} disabled={!u.email}>
                {u.name}{u.role ? ` (${u.role})` : ''}{!u.email ? ' — אין מייל' : ''}
              </option>
            ))}
          </select>
          {userId && users?.find(u => u.id === +userId)?.email && (
            <div style={{ fontSize: '11px', color: '#4ade80' }}>
              ✉ מייל יישלח ל: {users.find(u => u.id === +userId).email}
            </div>
          )}

          {waPhone && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#94a3b8', paddingTop: '4px' }}>
              <input type="checkbox" checked={sendWa} onChange={e => setSendWa(e.target.checked)}
                style={{ accentColor: '#25d366', width: '15px', height: '15px' }} />
              <span>📱 פתח שיחת וואטסאפ עם {candidateName || 'המועמד'}</span>
              <span style={{ fontSize: '11px', color: '#475569' }}>({candidatePhone})</span>
            </label>
          )}
          {!waPhone && candidatePhone === undefined && (
            <div style={{ fontSize: '11px', color: '#475569' }}>📵 אין מספר טלפון למועמד זה</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button onClick={onSkip} style={{ padding: '8px 16px', background: 'none', border: '1px solid #334155', borderRadius: '7px', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>
            דלג
          </button>
          <button onClick={save} disabled={saving || !title.trim() || !date || !time}
            style={{ padding: '8px 20px', background: '#1d4ed8', border: '1px solid #2563eb', borderRadius: '7px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving || !title.trim() || !date || !time ? 0.5 : 1 }}>
            {saving ? '...' : sendWa && waPhone ? '🔔 שמור ופתח וואטסאפ' : '🔔 שמור תזכורת'}
          </button>
        </div>
      </div>
    </div>
  )
}

const pctColor = (p) => p >= 80 ? '#4ade80' : p >= 60 ? '#fbbf24' : '#f87171'
const pctBg   = (p) => p >= 80 ? '#14532d' : p >= 60 ? '#713f12' : '#450a0a'

// Derives ALL role-type keywords from a job title for display as role-type chips.
// Mirrors the Python derive_role_type_tags() logic in quick_matcher.py.
const _ROLE_TYPE_LABELS = {
  // HIGH priority function types
  analyst: 'System Analyst', analysis: 'Analyst', functional: 'Functional Consultant',
  consultant: 'Consultant', implementation: 'Implementation Specialist',
  tester: 'QA Tester', testing: 'QA', qa: 'QA', qe: 'QA', sdet: 'QA/SDET',
  designer: 'Designer', ux: 'UX Designer', ui: 'UI Designer',
  architect: 'Architect', devops: 'DevOps', sre: 'SRE',
  scientist: 'Data Scientist', ml: 'ML', ai: 'AI',
  account: 'Account Manager', sales: 'Sales',
  // LOW priority generic
  developer: 'Developer', programmer: 'Developer', engineer: 'Engineer',
  development: 'Developer',
  // Management / leadership
  lead: 'Team Lead', manager: 'Manager', head: 'Head', supervisor: 'Supervisor',
  owner: 'Product Owner', director: 'Director', principal: 'Principal',
}
const _HIGH = new Set(['analyst','analysis','functional','consultant','implementation','tester','testing','qa','qe','sdet','designer','ux','ui','architect','devops','sre','scientist','ml','ai','account','sales'])
const _LOW  = new Set(['developer','programmer','engineer','development'])
const _MGMT = new Set(['lead','leads','manager','managers','head','supervisor','owner','director','principal'])
const _MGMT_CANONICAL = { leads:'lead', managers:'manager' }

// Returns [{key, label}, ...] for all role-type chips to show on a job card.
function deriveRoleTypeTags(title) {
  if (!title) return []
  const words = title.toLowerCase().replace(/[.\-_/\s]+/g, ' ').trim().split(' ').filter(Boolean)
  const tags = []

  // ① Primary function keyword (HIGH first, then LOW)
  let found = false
  for (const w of words) {
    if (_HIGH.has(w)) { tags.push({ key: w, label: _ROLE_TYPE_LABELS[w] }); found = true; break }
  }
  if (!found) {
    for (const w of words) {
      if (_LOW.has(w)) { tags.push({ key: w, label: _ROLE_TYPE_LABELS[w] }); break }
    }
  }

  // ② Management / leadership keyword (at most one)
  const tagKeys = new Set(tags.map(t => t.key))
  for (const w of words) {
    if (_MGMT.has(w)) {
      const canonical = _MGMT_CANONICAL[w] || w
      if (!tagKeys.has(canonical)) tags.push({ key: canonical, label: _ROLE_TYPE_LABELS[canonical] || canonical })
      break
    }
  }

  return tags
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  jobCard: { background: '#1a2f4a', border: '1px solid #2d4d6e', borderRadius: '14px', overflow: 'hidden' },
  jobHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', cursor: 'pointer',
    background: 'linear-gradient(135deg, #1e3a60 0%, #162d4a 100%)',
    borderBottom: '1px solid #234060',
  },
  jobTitle: { fontSize: '16px', fontWeight: 700, color: '#f1f5f9' },
  jobMeta: { fontSize: '12px', color: '#64748b', marginTop: '3px' },
  jobActions: { display: 'flex', gap: '6px', alignItems: 'center' },
  matchBtn: {
    padding: '7px 14px', background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    border: 'none', borderRadius: '7px', color: '#fff', fontSize: '12px',
    fontWeight: 600, cursor: 'pointer',
  },
  quickMatchBtn: {
    padding: '7px 12px', background: '#1c2a1c', border: '1px solid #a16207',
    borderRadius: '7px', color: '#fbbf24', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  },
  editBtn: {
    padding: '7px 10px', background: '#1e3a5f', border: '1px solid #1d4ed8',
    borderRadius: '7px', color: '#60a5fa', fontSize: '12px', cursor: 'pointer',
  },
  resetBtn: {
    padding: '7px 10px', background: '#1a2e1a', border: '1px solid #166534',
    borderRadius: '7px', color: '#4ade80', fontSize: '12px', cursor: 'pointer',
  },
  deleteBtn: {
    padding: '7px 10px', background: '#450a0a', border: '1px solid #7f1d1d',
    borderRadius: '7px', color: '#f87171', fontSize: '12px', cursor: 'pointer',
  },
  expandArrow: { color: '#475569', fontSize: '13px', marginRight: '4px' },
  techsWrap: { display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px 20px 12px' },
  tech: { background: '#1d4ed8', color: '#bfdbfe', borderRadius: '5px', padding: '2px 8px', fontSize: '11px' },
  techNice: { background: '#1e3a5f', color: '#93c5fd' },
  techRoleType: { background: '#2e1065', color: '#c4b5fd', border: '1px solid #6d28d9' },
  techRemoved: { background: '#334155', color: '#475569', textDecoration: 'line-through', opacity: 0.5 },
  techXBtn: {
    background: 'none', border: 'none', color: 'inherit', cursor: 'pointer',
    padding: '0 0 0 4px', fontSize: '10px', opacity: 0.8, lineHeight: 1,
  },
  removedBanner: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '5px 20px', background: '#162032',
    fontSize: '11px', color: '#86efac', borderBottom: '1px solid #1e293b',
  },
  // Progress bar
  progressArea: {
    borderTop: '1px solid #1e2d42', padding: '14px 20px',
    background: '#0f1a2b', display: 'flex', flexDirection: 'column', gap: '8px',
  },
  progressHeader: { display: 'flex', alignItems: 'center', gap: '10px' },
  progressSpinner: {
    width: '16px', height: '16px', border: '2px solid #334155',
    borderTop: '2px solid #38bdf8', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', flexShrink: 0,
  },
  progressText: { fontSize: '12px', color: '#94a3b8', flex: 1 },
  progressBarWrap: { height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden' },
  progressBarFill: {
    height: '100%', background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
    transition: 'width 0.4s ease', borderRadius: '2px',
  },
  historySection: { borderTop: '1px solid #334155', background: '#162032' },
  historyHeader: { padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { fontSize: '13px', fontWeight: 600, color: '#94a3b8' },
  runInfo: { fontSize: '11px', color: '#475569' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 16px 14px' },
  historyRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', background: '#1e293b', borderRadius: '8px',
    border: '1px solid #334155', cursor: 'pointer', transition: 'border-color 0.15s',
  },
  historyName: { fontSize: '13px', fontWeight: 600, color: '#e2e8f0' },
  historyRole: { fontSize: '11px', color: '#64748b', marginTop: '1px' },
  historyDate: { fontSize: '11px', color: '#475569' },
  pctBadge: { borderRadius: '8px', padding: '4px 10px', fontWeight: 700, fontSize: '14px' },
  resultsArea: { borderTop: '1px solid #1e293b', padding: '16px', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: '12px' },
  resultsSummary: {
    fontSize: '13px', fontWeight: 600, padding: '8px 12px',
    borderRadius: '8px', marginBottom: '4px',
  },
  emptyHistory: { padding: '16px 20px', fontSize: '12px', color: '#475569' },
  rejectBtn: {
    padding: '3px 8px', background: 'transparent', border: '1px solid #450a0a',
    borderRadius: '5px', color: '#f87171', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  rejectForm: {
    marginTop: '6px', padding: '10px', background: '#1a0a0a',
    border: '1px solid #7f1d1d', borderRadius: '7px',
  },
  rejectTextarea: {
    width: '100%', background: '#0f172a', border: '1px solid #450a0a',
    borderRadius: '5px', color: '#fca5a5', fontSize: '12px', padding: '6px 8px',
    outline: 'none', resize: 'vertical', minHeight: '52px', boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  rejectSaveBtn: {
    padding: '5px 12px', background: '#7f1d1d', border: 'none',
    borderRadius: '5px', color: '#fca5a5', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
  },
  rejectCancelBtn: {
    padding: '5px 10px', background: 'transparent', border: '1px solid #334155',
    borderRadius: '5px', color: '#64748b', fontSize: '11px', cursor: 'pointer',
  },
  acceptBtn: {
    padding: '3px 8px', background: 'transparent', border: '1px solid #166534',
    borderRadius: '5px', color: '#4ade80', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  acceptForm: {
    marginTop: '6px', padding: '10px', background: '#0a1a0a',
    border: '1px solid #166534', borderRadius: '7px',
  },
  acceptTextarea: {
    width: '100%', background: '#0f172a', border: '1px solid #14532d',
    borderRadius: '5px', color: '#86efac', fontSize: '12px', padding: '6px 8px',
    outline: 'none', resize: 'vertical', minHeight: '52px', boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  acceptSaveBtn: {
    padding: '5px 12px', background: '#14532d', border: 'none',
    borderRadius: '5px', color: '#86efac', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
  },
  // Match runs log
  runsSection: { borderTop: '1px solid #1e293b', padding: '6px 16px 10px' },
  runsTitle: { fontSize: '11px', color: '#475569', fontWeight: 600, marginBottom: '5px', padding: '4px 0' },
  runRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '4px 8px', borderRadius: '5px', fontSize: '11px',
    borderBottom: '1px solid #1e293b22',
  },
  // Edit mode
  editArea: {
    padding: '16px 20px', background: '#0f172a', borderBottom: '1px solid #334155',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  editLabel: { fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '3px' },
  editInput: {
    width: '100%', background: '#1e293b', border: '1px solid #334155',
    borderRadius: '6px', color: '#e2e8f0', fontSize: '13px',
    padding: '7px 10px', outline: 'none', boxSizing: 'border-box',
  },
  editRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center', minHeight: '28px' },
  tagChip: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: '#1d4ed8', color: '#bfdbfe', borderRadius: '5px', padding: '3px 8px', fontSize: '11px',
  },
  tagChipNice: { background: '#1e3a5f', color: '#93c5fd' },
  tagXBtn: { background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '11px' },
  tagInput: {
    background: 'transparent', border: 'none', outline: 'none',
    color: '#94a3b8', fontSize: '11px', minWidth: '90px', padding: '2px 4px',
  },
  editActions: { display: 'flex', gap: '8px' },
  saveEditBtn: {
    padding: '7px 16px', background: '#166534', border: '1px solid #14532d',
    borderRadius: '7px', color: '#4ade80', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
  },
  cancelEditBtn: {
    padding: '7px 12px', background: 'transparent', border: '1px solid #334155',
    borderRadius: '7px', color: '#64748b', fontSize: '12px', cursor: 'pointer',
  },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8', cursor: 'pointer' },
}

// Inline tag editor: add on Enter/comma, remove on ✕
function TagEditor({ tags, onChange, placeholder, chipStyle }) {
  const [input, setInput] = useState('')
  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }
  return (
    <div style={s.tagList}>
      {tags.map(t => (
        <span key={t} style={{ ...s.tagChip, ...chipStyle }}>
          {t}
          <button style={s.tagXBtn} onClick={() => onChange(tags.filter(x => x !== t))}>✕</button>
        </span>
      ))}
      <input
        style={s.tagInput}
        value={input}
        placeholder={placeholder}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        onBlur={add}
      />
    </div>
  )
}

function JobCard({ job, topN, minPct, onDeleted, onUpdated, reminders = [] }) {
  const [open, setOpen]                   = useState(false)
  // Scan state lives in context so it survives tab switches (component unmount/remount)
  const { scans, updateScan, registerAbort, unregisterAbort, cancelScan } = useScanContext()
  const scan = scans[job.id] || DEFAULT_SCAN
  const { matching, quickMatching, matchMode, matchProgress } = scan
  const results = scan.results

  const [visibleCount, setVisibleCount]   = useState(10)
  const abortRef = useRef(null)
  // Initialize from context so partial results are restored after a tab switch
  const partialResultsRef = useRef(scan.partialResults)
  const [history, setHistory]             = useState(null)
  const [runs, setRuns]                   = useState(null)
  const [expandedCard, setExpandedCard]   = useState(null)
  const [rejectingId, setRejectingId]     = useState(null)  // candidate_id being rejected
  const [rejectReason, setRejectReason]   = useState('')
  const [acceptingId, setAcceptingId]     = useState(null)  // candidate_id being accepted
  const [acceptNote, setAcceptNote]       = useState('')
  // Inline reminder states (inside accept form)
  const [createReminder, setCreateReminder] = useState(false)
  const [remTitle,  setRemTitle]  = useState('')
  const [remDate,   setRemDate]   = useState('')
  const [remTime,   setRemTime]   = useState('09:00')

  // Temporary keyword removal (resets after each match run)
  const [removedTechs, setRemovedTechs] = useState(new Set())

  // Candidate selection for export
  const [selectedIds, setSelectedIds] = useState(new Set())
  const toggleSelect = (id) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  // Reset selection whenever the result set changes
  useEffect(() => { setSelectedIds(new Set()) }, [results])

  // Permanent edit mode
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState(null)

  const reqs           = job.requirements || {}
  const reqTechs       = reqs.required_technologies || []
  const niceTechs      = reqs.nice_to_have || []
  const effectiveMinPct = reqs.min_match_pct != null ? reqs.min_match_pct : minPct
  const hasRemovals = removedTechs.size > 0

  // Role-type chips: derive ALL keywords from job title, hide any already in explicit reqTechs
  const _roleTypeTitle = reqs.role_title || job.title || ''
  const _reqTechsNorm  = reqTechs.map(t => t.toLowerCase())
  const roleTypeTags = deriveRoleTypeTags(_roleTypeTitle).filter(
    ({ key }) => !_reqTechsNorm.some(t => t === key || t.includes(key))
  )

  const loadHistory = () =>
    fetch(`/api/jobs/${job.id}/matches`)
      .then(r => r.json()).then(setHistory).catch(() => setHistory([]))

  const loadRuns = () =>
    fetch(`/api/jobs/${job.id}/runs`)
      .then(r => r.json()).then(setRuns).catch(() => setRuns([]))

  const handleOpen = () => {
    if (!open) { loadHistory(); loadRuns() }
    setOpen(o => !o)
  }

  const handleQuickMatch = async (e) => {
    e.stopPropagation()
    cancelScan(job.id)
    const controller = new AbortController()
    abortRef.current = controller
    registerAbort(job.id, () => controller.abort())

    updateScan(job.id, {
      jobTitle: job.title,
      quickMatching: true,
      matching: false,
      results: null,
      matchMode: 'quick',
      matchProgress: { phase: 'connecting' },
      partialResults: [],
    })
    partialResultsRef.current = []
    if (!open) setOpen(true)
    let lastProgress = null
    try {
      const effectiveReqs = {
        ...reqs,
        required_technologies: reqTechs.filter(t => !removedTechs.has(t)),
        nice_to_have: niceTechs.filter(t => !removedTechs.has(t)),
      }
      const res = await fetch(`/api/jobs/${job.id}/quick-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_requirements: effectiveReqs, min_match_pct: effectiveMinPct }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const txt = await res.text()
        let msg; try { msg = JSON.parse(txt).detail } catch { msg = txt.slice(0, 200) }
        throw new Error(msg)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'start') {
              lastProgress = {
                phase: 'running', batchNum: 0,
                totalBatches: event.total_batches,
                totalCandidates: event.total_candidates,
                checkedCandidates: event.candidates_checked,
                processed: 0,
              }
              updateScan(job.id, { matchProgress: lastProgress })
            } else if (event.type === 'batch') {
              if (event.batch_results?.length) {
                partialResultsRef.current = [...partialResultsRef.current, ...event.batch_results]
              }
              lastProgress = {
                ...(lastProgress || {}), phase: 'running',
                batchNum: event.batch_num,
                processed: event.processed_so_far,
              }
              updateScan(job.id, { matchProgress: lastProgress, partialResults: partialResultsRef.current })
            } else if (event.type === 'results') {
              const all = [...partialResultsRef.current]
              const acceptedPart = all.filter(r => r.accepted)
              const regularPart  = all.filter(r => !r.accepted)
                .sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0))
                .slice(0, Math.max(0, (event.top_n || 20) - acceptedPart.length))
              const sorted = [...acceptedPart, ...regularPart]
              lastProgress = {
                phase: 'done',
                totalCandidates: event.total_candidates,
                checkedCandidates: event.candidates_checked,
                found: sorted.length,
                aboveThreshold: event.above_threshold,
              }
              updateScan(job.id, { results: sorted, matchMode: 'quick', matchProgress: lastProgress })
              setVisibleCount(10)
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        const partial = [...partialResultsRef.current].sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0))
        updateScan(job.id, {
          results: partial.length > 0 ? partial : null,
          matchProgress: { ...(lastProgress || {}), phase: 'cancelled', found: partial.length },
        })
        if (partial.length > 0) setVisibleCount(10)
      } else {
        updateScan(job.id, { matchProgress: { phase: 'error', msg: err.message } })
      }
    } finally {
      abortRef.current = null
      unregisterAbort(job.id)
      updateScan(job.id, { quickMatching: false })
    }
  }

  const exportToCSV = (rows, jobTitle, privateMode = false) => {
    const arr = v => Array.isArray(v) ? v.join('; ') : (v || '')
    const esc = v => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }
    const headers = privateMode
      ? ['שם', 'תפקיד נוכחי', 'חברה', 'שנות ניסיון', '% התאמה',
         'טכנולוגיות מתאימות', 'טכנולוגיות חסרות', 'יתרונות', 'חסרונות',
         'המלצה', 'ניסיון ניהולי', 'מיקום']
      : ['שם', 'תפקיד נוכחי', 'חברה', 'שנות ניסיון', '% התאמה',
         'טכנולוגיות מתאימות', 'טכנולוגיות חסרות', 'יתרונות', 'חסרונות',
         'המלצה', 'ניסיון ניהולי', 'מיקום', 'טלפון', 'אימייל', 'קובץ CV']
    const dataRows = rows.map(r => {
      const base = [
        r.name || '',
        r.current_role || '',
        r.current_company || '',
        r.total_experience_years || '',
        r.match_percentage != null ? r.match_percentage + '%' : '',
        arr(r.matching_technologies),
        arr(r.missing_requirements),
        arr(r.advantages),
        arr(r.disadvantages),
        r.recommendation || '',
        r.management_experience ? `כן (${r.management_years || 0} שנ')` : 'לא',
        r.location || '',
      ]
      if (!privateMode) base.push(r.phone || '', r.email || '', r.file_path || '')
      return base
    })
    const csvContent = [headers, ...dataRows].map(row => row.map(esc).join(',')).join('\r\n')
    const bom = '\uFEFF'  // UTF-8 BOM so Excel shows Hebrew correctly
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = (jobTitle || 'חיפוש').replace(/[/\\:*?"<>|]/g, '_')
    a.download = `מועמדים-${safeName}${privateMode ? '-חסוי' : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCancelMatch = (e) => {
    if (e) e.stopPropagation()
    cancelScan(job.id)
  }

  const handleMatch = async (e, forceIds = null) => {
    e.stopPropagation()
    cancelScan(job.id)
    const controller = new AbortController()
    abortRef.current = controller
    registerAbort(job.id, () => controller.abort())

    updateScan(job.id, {
      jobTitle: job.title,
      matching: true,
      quickMatching: false,
      results: null,
      matchMode: 'deep',
      matchProgress: { phase: 'connecting' },
      partialResults: [],
    })
    partialResultsRef.current = []
    if (!open) setOpen(true)
    let lastProgress = null
    try {
      const effectiveTopN   = reqs.top_n         != null ? reqs.top_n         : topN
      const effectiveMinPct = reqs.min_match_pct  != null ? reqs.min_match_pct  : minPct
      const effectiveReqs = {
        ...reqs,
        required_technologies: reqTechs.filter(t => !removedTechs.has(t)),
        nice_to_have: niceTechs.filter(t => !removedTechs.has(t)),
      }
      const body = { job_requirements: effectiveReqs, top_n: effectiveTopN, min_match_pct: effectiveMinPct }
      if (forceIds) body.candidate_ids = forceIds
      const res = await fetch(`/api/jobs/${job.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'שגיאה בשרת' }))
        throw new Error(err.detail || 'שגיאה בהתאמה')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === 'start') {
                lastProgress = {
                  phase: 'running',
                  batchNum: 0,
                  totalBatches: event.total_batches,
                  totalCandidates: event.total_candidates,
                  checkedCandidates: event.candidates_checked,
                  processed: 0,
                }
                updateScan(job.id, { matchProgress: lastProgress })
              } else if (event.type === 'batch') {
                if (event.batch_results?.length) {
                  partialResultsRef.current = [...partialResultsRef.current, ...event.batch_results]
                }
                lastProgress = {
                  ...(lastProgress || {}),
                  phase: 'running',
                  batchNum: event.batch_num,
                  processed: event.processed_so_far,
                }
                updateScan(job.id, { matchProgress: lastProgress, partialResults: partialResultsRef.current })
              } else if (event.type === 'error') {
                updateScan(job.id, { matchProgress: { phase: 'error', msg: event.message } })
                return
              } else if (event.type === 'results') {
                lastProgress = {
                  phase: 'done',
                  totalCandidates: event.total_candidates,
                  checkedCandidates: event.candidates_checked,
                  found: event.matches_found,
                  aboveThreshold: event.above_threshold,
                }
                updateScan(job.id, {
                  results: event.results || [],
                  matchMode: 'deep',
                  matchProgress: lastProgress,
                })
                setVisibleCount(10)
                loadHistory()
                loadRuns()
                setRemovedTechs(new Set())
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        const partial = [...partialResultsRef.current].sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0))
        updateScan(job.id, {
          results: partial.length > 0 ? partial : null,
          matchMode: 'deep',
          matchProgress: { ...(lastProgress || {}), phase: 'cancelled', found: partial.length },
        })
        if (partial.length > 0) setVisibleCount(10)
      } else {
        updateScan(job.id, { matchProgress: { phase: 'error', msg: err.message } })
      }
    } finally {
      abortRef.current = null
      unregisterAbort(job.id)
      updateScan(job.id, { matching: false })
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm(`למחוק את המשרה "${job.title}"?`)) return
    await fetch(`/api/jobs/${job.id}`, { method: 'DELETE' })
    onDeleted(job.id)
  }

  const handleReject = async (candidateId) => {
    if (!rejectReason.trim()) return
    await fetch(`/api/jobs/${job.id}/reject-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, rejection_reason: rejectReason.trim() }),
    })
    setRejectingId(null)
    setRejectReason('')
    // Remove rejected candidate from live results immediately
    updateScan(job.id, { results: results ? results.filter(r => r.id !== candidateId) : results })
    loadHistory()
  }

  const handleAccept = async (candidateId, candidateName, candidatePhone) => {
    await fetch(`/api/jobs/${job.id}/accept-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, acceptance_note: acceptNote.trim() }),
    })
    // Save inline reminder if checkbox was checked
    if (createReminder && remTitle.trim() && remDate && remTime) {
      const due_at = new Date(`${remDate}T${remTime}:00`).toISOString()
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: remTitle.trim(), description: '', due_at,
          candidate_id: candidateId, job_id: job.id,
          candidate_name: candidateName || '', candidate_phone: candidatePhone || '',
          job_title: job.title, assigned_user_id: null,
        }),
      })
    }
    setAcceptingId(null)
    setAcceptNote('')
    setCreateReminder(false)
    setRemTitle(''); setRemDate(''); setRemTime('09:00')
    updateScan(job.id, { results: results ? results.map(r => r.id === candidateId ? { ...r, accepted: true, acceptance_note: acceptNote.trim() } : r) : results })
    loadHistory()
  }

  const handleRemoveCandidate = async (candidateId) => {
    if (!confirm('האם להסיר לחלוטין את המועמד מהיסטוריית המשרה?')) return
    await fetch(`/api/jobs/${job.id}/remove-candidate/${candidateId}`, { method: 'DELETE' })
    updateScan(job.id, { results: results ? results.filter(r => r.id !== candidateId) : results })
    loadHistory()
  }

  const toggleRemoved = (tech, e) => {
    e.stopPropagation()
    setRemovedTechs(prev => {
      const next = new Set(prev)
      if (next.has(tech)) next.delete(tech); else next.add(tech)
      return next
    })
  }

  const startEdit = (e) => {
    e.stopPropagation()
    setEditData({
      role_title:                  reqs.role_title || job.title,
      min_experience_years:        reqs.min_experience_years || 0,
      required_technologies:       [...reqTechs],
      nice_to_have:                [...niceTechs],
      management_required:         reqs.management_required || false,
      vendor_experience_required:  reqs.vendor_experience_required || false,
      location:                    reqs.location || '',
      domain:                      reqs.domain || '',
      org_type:                    reqs.org_type || '',
      salary_range:                reqs.salary_range || '',
      hybrid_mode:                 reqs.hybrid_mode || '',
      additional_notes:            reqs.additional_notes || '',
      top_n:                       reqs.top_n       != null ? reqs.top_n       : topN,
      min_match_pct:               reqs.min_match_pct != null ? reqs.min_match_pct : minPct,
    })
    setEditMode(true)
  }

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_requirements: editData }),
      })
      if (!res.ok) throw new Error(await res.text())
      setEditMode(false)
      setEditData(null)
      setRemovedTechs(new Set())
      onUpdated()
    } catch (err) {
      alert('שגיאה בשמירה: ' + err.message)
    }
  }

  const formattedDate = new Date(job.created_at).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  return (
    <div style={s.jobCard}>
      {/* Header */}
      <div style={s.jobHeader} onClick={handleOpen}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={s.jobTitle}>{job.title}</span>
            {job.reference_number && (
              <span style={{ fontSize: '11px', color: '#475569', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', padding: '1px 7px', fontWeight: 600 }}>
                #{job.reference_number}
              </span>
            )}
            {(() => {
              const jobReminders = reminders.filter(r => r.job_id === job.id)
              return jobReminders.length > 0 ? (
                <span title={jobReminders.map(r => r.title).join(' | ')}
                  style={{ fontSize: '11px', padding: '1px 8px', background: '#1c1a05', border: '1px solid #713f12', borderRadius: '5px', color: '#fbbf24', fontWeight: 600 }}>
                  🔔 {jobReminders.length} תזכורת{jobReminders.length > 1 ? 'ות' : ''}
                </span>
              ) : null
            })()}
          </div>
          <div style={s.jobMeta}>
            {reqs.min_experience_years ? `${reqs.min_experience_years}+ שנות ניסיון` : ''}
            {reqs.location ? ` · ${reqs.location}` : ''}
            {reqs.management_required ? ' · ניסיון ניהולי נדרש' : ''}
            {' · נוצר ' + formattedDate}
          </div>
        </div>
        <div style={s.jobActions}>
          <button style={s.quickMatchBtn} onClick={handleQuickMatch} disabled={quickMatching || matching}>
            {quickMatching ? '⚡ סורק...' : '⚡ מהיר'}
          </button>
          <button style={s.matchBtn} onClick={handleMatch} disabled={matching || quickMatching}>
            {matching ? '⏳ מתאים...' : '🔎 התאם'}
          </button>
          {hasRemovals && (
            <button
              style={s.resetBtn}
              title="שחזר את כל מילות המפתח שהוסרו זמנית"
              onClick={e => { e.stopPropagation(); setRemovedTechs(new Set()) }}
            >
              🔄 אפס
            </button>
          )}
          <button style={s.editBtn} onClick={startEdit} title="ערוך משרה לצמיתות">✏</button>
          <button style={s.deleteBtn} onClick={handleDelete} title="מחק משרה">✕</button>
          <span style={s.expandArrow}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Permanent edit panel */}
      {editMode && editData && (
        <div style={s.editArea} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>✏ עריכת משרה — שינויים יישמרו לצמיתות</div>

          <div>
            <div style={s.editLabel}>שם תפקיד</div>
            <input style={s.editInput} value={editData.role_title}
              onChange={e => setEditData(d => ({ ...d, role_title: e.target.value }))} />
          </div>

          <div style={s.editRow}>
            <div>
              <div style={s.editLabel}>מינימום שנות ניסיון</div>
              <input type="number" style={s.editInput} value={editData.min_experience_years}
                onChange={e => setEditData(d => ({ ...d, min_experience_years: +e.target.value }))} />
            </div>
            <div>
              <div style={s.editLabel}>מיקום</div>
              <input style={s.editInput} value={editData.location}
                onChange={e => setEditData(d => ({ ...d, location: e.target.value }))} />
            </div>
          </div>

          <div style={s.editRow}>
            <div>
              <div style={s.editLabel}>דומיין</div>
              <input style={s.editInput} value={editData.domain}
                onChange={e => setEditData(d => ({ ...d, domain: e.target.value }))} />
            </div>
            <div>
              <div style={s.editLabel}>סוג ארגון</div>
              <select style={{ ...s.editInput, cursor: 'pointer' }} value={editData.org_type}
                onChange={e => setEditData(d => ({ ...d, org_type: e.target.value }))}>
                {['', 'לקוח קצה', 'אינטגרטור', 'ספק', 'פיננסי', 'ממשלתי', 'סטארטאפ', 'אנטרפרייז'].map(o =>
                  <option key={o} value={o}>{o || '— לא צוין —'}</option>)}
              </select>
            </div>
          </div>

          <div style={s.editRow}>
            <div>
              <div style={s.editLabel}>טווח שכר</div>
              <input style={s.editInput} value={editData.salary_range}
                onChange={e => setEditData(d => ({ ...d, salary_range: e.target.value }))}
                placeholder="25-35K + רכב..." />
            </div>
            <div>
              <div style={s.editLabel}>מצב עבודה</div>
              <select style={{ ...s.editInput, cursor: 'pointer' }} value={editData.hybrid_mode}
                onChange={e => setEditData(d => ({ ...d, hybrid_mode: e.target.value }))}>
                {['', 'משרדי', 'היברידי', 'מרחוק'].map(m =>
                  <option key={m} value={m}>{m || '— לא צוין —'}</option>)}
              </select>
            </div>
          </div>

          <div style={s.editRow}>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
              <label style={s.checkLabel}>
                <input type="checkbox" checked={editData.management_required}
                  onChange={e => setEditData(d => ({ ...d, management_required: e.target.checked }))} />
                ניסיון ניהולי נדרש
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
              <label style={s.checkLabel}>
                <input type="checkbox" checked={editData.vendor_experience_required || false}
                  onChange={e => setEditData(d => ({ ...d, vendor_experience_required: e.target.checked }))} />
                נדרש צד ספק / אינטגרטור
              </label>
            </div>
          </div>

          <div>
            <div style={s.editLabel}>טכנולוגיות נדרשות (Enter להוספה)</div>
            <div style={{ background: '#1e293b', borderRadius: '6px', padding: '6px 8px', border: '1px solid #334155' }}>
              <TagEditor
                tags={editData.required_technologies}
                onChange={v => setEditData(d => ({ ...d, required_technologies: v }))}
                placeholder="+ הוסף..."
              />
            </div>
          </div>

          <div>
            <div style={s.editLabel}>Nice to have (Enter להוספה)</div>
            <div style={{ background: '#1e293b', borderRadius: '6px', padding: '6px 8px', border: '1px solid #334155' }}>
              <TagEditor
                tags={editData.nice_to_have}
                chipStyle={s.tagChipNice}
                onChange={v => setEditData(d => ({ ...d, nice_to_have: v }))}
                placeholder="+ הוסף..."
              />
            </div>
          </div>

          <div>
            <div style={s.editLabel}>הערות נוספות</div>
            <input style={s.editInput} value={editData.additional_notes}
              onChange={e => setEditData(d => ({ ...d, additional_notes: e.target.value }))} />
          </div>

          <div style={s.editRow}>
            <div>
              <div style={s.editLabel}>מספר תוצאות: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{editData.top_n}</span></div>
              <input type="range" min={1} max={30} value={editData.top_n}
                style={{ width: '100%', accentColor: '#38bdf8' }}
                onChange={e => setEditData(d => ({ ...d, top_n: +e.target.value }))} />
            </div>
            <div>
              <div style={s.editLabel}>אחוז התאמה מינימלי: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{editData.min_match_pct}%</span></div>
              <input type="range" min={20} max={95} step={5} value={editData.min_match_pct}
                style={{ width: '100%', accentColor: '#38bdf8' }}
                onChange={e => setEditData(d => ({ ...d, min_match_pct: +e.target.value }))} />
            </div>
          </div>

          <div style={s.editActions}>
            <button style={s.saveEditBtn} onClick={handleSaveEdit}>💾 שמור שינויים</button>
            <button style={s.cancelEditBtn} onClick={() => { setEditMode(false); setEditData(null) }}>✕ בטל</button>
          </div>
        </div>
      )}

      {/* Technologies row — clickable chips for temporary removal */}
      {!editMode && (reqTechs.length > 0 || niceTechs.length > 0 || roleTypeTags.length > 0) && (
        <>
          {hasRemovals && (
            <div style={s.removedBanner}>
              ⚠ {removedTechs.size} מילת מפתח הוסרה זמנית לצורך ההתאמה הבאה בלבד
            </div>
          )}
          <div style={s.techsWrap}>
            {/* Role-type chips — auto-derived from job title, purple to distinguish from explicit techs */}
            {roleTypeTags.map(({ key, label }) => (
              <span
                key={key}
                style={{ ...s.tech, ...s.techRoleType }}
                title="סוג תפקיד — נגזר אוטומטית מכותרת המשרה ומשמש לסינון מועמדים לפי סוג תפקיד"
              >
                👤 {label}
              </span>
            ))}
            {reqTechs.map(t => (
              <span key={t} style={{ ...s.tech, ...(removedTechs.has(t) ? s.techRemoved : {}), display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                {t}
                <button style={s.techXBtn} title={removedTechs.has(t) ? 'שחזר' : 'הסר זמנית'}
                  onClick={e => toggleRemoved(t, e)}>
                  {removedTechs.has(t) ? '↩' : '✕'}
                </button>
              </span>
            ))}
            {niceTechs.map(t => (
              <span key={t} style={{ ...s.tech, ...s.techNice, ...(removedTechs.has(t) ? s.techRemoved : {}), display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                {t} ✨
                <button style={s.techXBtn} title={removedTechs.has(t) ? 'שחזר' : 'הסר זמנית'}
                  onClick={e => toggleRemoved(t, e)}>
                  {removedTechs.has(t) ? '↩' : '✕'}
                </button>
              </span>
            ))}
          </div>
        </>
      )}

      {/* Expanded content */}
      {open && (
        <>
          {/* Progress indicator while matching (deep or quick) */}
          {(matching || quickMatching) && matchProgress && (
            <div style={s.progressArea}>
              <div style={s.progressHeader}>
                <div style={s.progressSpinner} />
                <div style={s.progressText}>
                  {matchProgress.phase === 'connecting' && 'מתחבר לשרת...'}
                  {matchProgress.phase === 'running' && matchProgress.batchNum === 0 &&
                    `${quickMatching ? '⚡' : '🔍'} סורק — ${matchProgress.checkedCandidates} מועמדים לבדיקה`}
                  {matchProgress.phase === 'running' && matchProgress.batchNum > 0 &&
                    `${quickMatching ? '⚡' : '🔍'} סורק ${matchProgress.processed}/${matchProgress.checkedCandidates} מועמדים`}
                </div>
                <button
                  onClick={handleCancelMatch}
                  style={{
                    padding: '3px 10px', background: '#450a0a', border: '1px solid #7f1d1d',
                    borderRadius: '6px', color: '#f87171', fontSize: '11px', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  ✕ בטל
                </button>
              </div>
              {matchProgress.phase === 'running' && matchProgress.totalBatches > 0 && (
                <div style={s.progressBarWrap}>
                  <div style={{
                    ...s.progressBarFill,
                    width: `${Math.round((matchProgress.batchNum / matchProgress.totalBatches) * 100)}%`,
                  }} />
                </div>
              )}
            </div>
          )}

          {/* Cancelled state */}
          {!matching && matchProgress?.phase === 'cancelled' && (
            <div style={{ padding: '10px 20px', color: '#fbbf24', fontSize: '12px', borderTop: '1px solid #334155', background: '#1c1a10' }}>
              ⚠ ההתאמה בוטלה
              {matchProgress.batchNum > 0 && ` — נבדקו ${matchProgress.processed || 0}/${matchProgress.checkedCandidates} מועמדים`}
              {matchProgress.found > 0 && ` — מוצגות ${matchProgress.found} תוצאות חלקיות`}
            </div>
          )}

          {/* Error state */}
          {!matching && matchProgress?.phase === 'error' && (
            <div style={{ padding: '12px 20px', color: '#f87171', fontSize: '12px', borderTop: '1px solid #334155' }}>
              ✗ שגיאה: {matchProgress.msg}
            </div>
          )}

          {/* Results */}
          {results !== null && (() => {
            // Accepted candidates always appear regardless of score; sort them to top
            const acceptedResults = results.filter(r => r.accepted)
            const acceptedIds     = new Set(acceptedResults.map(r => r.id))
            const regularResults  = results.filter(r => !r.accepted && (r.match_percentage || 0) >= effectiveMinPct)
            const filteredResults = [...acceptedResults, ...regularResults.filter(r => !acceptedIds.has(r.id))]
            return (
            <div style={s.resultsArea}>
              {/* Current search banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px', marginBottom: '4px',
                background: '#0d1b2e', border: '1px solid #1d4ed8',
                borderRadius: '8px', fontSize: '11px', color: '#60a5fa', fontWeight: 600,
              }}>
                <span style={{ color: '#38bdf8' }}>📊 תוצאות חיפוש נוכחי</span>
                {matchProgress?.phase === 'done' && (
                  <span style={{ color: '#475569', fontWeight: 400 }}>
                    · {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <span style={{
                  marginRight: 'auto', fontSize: '10px', color: '#334155',
                  background: '#0f172a', border: '1px solid #1e293b',
                  borderRadius: '4px', padding: '1px 7px',
                }}>
                  {matchMode === 'quick' ? '⚡ מהיר' : '🔎 AI עמוק'}
                </span>
              </div>
              {matchMode === 'quick' && (
                <div style={{
                  padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, marginBottom: '6px',
                  background: '#1c2a10', border: '1px solid #a16207', color: '#fbbf24',
                }}>
                  ⚡ תוצאות מהירות — מבוסס מילות מפתח בלבד (ללא AI)
                </div>
              )}
              {matchProgress?.phase === 'done' && (
                <div style={{
                  ...s.resultsSummary,
                  background: filteredResults.length > 0 ? '#14532d22' : '#1e293b',
                  color: filteredResults.length > 0 ? '#4ade80' : '#64748b',
                  border: `1px solid ${filteredResults.length > 0 ? '#166534' : '#334155'}`,
                  marginBottom: matchMode === 'quick' && filteredResults.length > 0 ? '4px' : undefined,
                }}>
                  {filteredResults.length > 0
                    ? (() => {
                        const above = matchProgress.aboveThreshold
                        const shown = filteredResults.length
                        const icon = matchMode === 'quick' ? '⚡' : '✅'
                        if (matchMode === 'quick' && above > shown)
                          return `${icon} מוצגים ${shown} הטובים ביותר מתוך ${above} מועמדים מעל ${effectiveMinPct}% (מתוך ${matchProgress.checkedCandidates} שנסרקו)`
                        return `${icon} נמצאו ${shown} מועמדים מעל ${effectiveMinPct}% התאמה (מתוך ${matchProgress.checkedCandidates} שנסרקו)`
                      })()
                    : `⭕ לא נמצאו מועמדים מעל ${effectiveMinPct}% — נסרקו ${matchProgress.checkedCandidates} מועמדים`
                  }
                </div>
              )}
              {matchMode === 'quick' && filteredResults.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <button
                      style={{
                        flex: 1, padding: '10px 14px',
                        background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                        border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px',
                        fontWeight: 700, cursor: matching ? 'default' : 'pointer',
                        opacity: matching ? 0.5 : 1,
                      }}
                      disabled={matching}
                      onClick={(e) => handleMatch(e, filteredResults.map(r => r.id))}
                    >
                      🔎 בצע ניתוח AI מעמיק ל-{filteredResults.length} המועמדים שנמצאו
                    </button>
                    <button
                      style={{ padding: '10px 14px', background: '#0a2e1a', border: '1px solid #166534', borderRadius: '8px', color: '#4ade80', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={() => exportToCSV(filteredResults, job.title)}
                      title="ייצוא כל התוצאות"
                    >📥 Excel ({filteredResults.length})</button>
                    <button
                      style={{ padding: '10px 14px', background: '#1a1a2e', border: '1px solid #4c1d95', borderRadius: '8px', color: '#c4b5fd', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={() => exportToCSV(filteredResults, job.title, true)}
                      title="ייצוא חסוי — ללא מייל, טלפון ונתיב קובץ"
                    >🔒 חסוי</button>
                  </div>
                  {/* Selected-only export + select-all row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <button
                      onClick={() => {
                        const vis = filteredResults.slice(0, visibleCount)
                        const allSel = vis.every(c => selectedIds.has(c.id))
                        setSelectedIds(allSel ? new Set() : new Set(vis.map(c => c.id)))
                      }}
                      style={{ background: 'none', border: 'none', fontSize: '11px', color: '#475569', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                      {filteredResults.slice(0, visibleCount).every(c => selectedIds.has(c.id)) ? 'בטל בחירת הכל' : 'בחר הכל'}
                    </button>
                    {selectedIds.size > 0 && (
                      <>
                        <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 700 }}>· {selectedIds.size} נבחרו</span>
                        <button
                          onClick={() => exportToCSV(filteredResults.filter(c => selectedIds.has(c.id)), job.title)}
                          style={{ padding: '4px 10px', background: '#0a2e1a', border: '1px solid #166534', borderRadius: '5px', color: '#4ade80', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >📥 ייצוא נבחרים</button>
                        <button
                          onClick={() => exportToCSV(filteredResults.filter(c => selectedIds.has(c.id)), job.title, true)}
                          style={{ padding: '4px 10px', background: '#1a1a2e', border: '1px solid #4c1d95', borderRadius: '5px', color: '#c4b5fd', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >🔒 חסוי</button>
                        <button onClick={() => setSelectedIds(new Set())} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#475569', cursor: 'pointer' }}>✕</button>
                      </>
                    )}
                  </div>
                </>
              )}
              {matchMode === 'deep' && filteredResults.length > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px' }}>
                    <button
                      style={{ padding: '8px 14px', background: '#0a2e1a', border: '1px solid #166534', borderRadius: '8px', color: '#4ade80', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => exportToCSV(filteredResults, job.title)}
                      title="ייצוא כל התוצאות"
                    >📥 Excel ({filteredResults.length})</button>
                    <button
                      style={{ padding: '8px 14px', background: '#1a1a2e', border: '1px solid #4c1d95', borderRadius: '8px', color: '#c4b5fd', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      onClick={() => exportToCSV(filteredResults, job.title, true)}
                      title="ייצוא חסוי"
                    >🔒 חסוי ({filteredResults.length})</button>
                  </div>
                  {/* Selected-only export + select-all row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <button
                      onClick={() => {
                        const vis = filteredResults.slice(0, visibleCount)
                        const allSel = vis.every(c => selectedIds.has(c.id))
                        setSelectedIds(allSel ? new Set() : new Set(vis.map(c => c.id)))
                      }}
                      style={{ background: 'none', border: 'none', fontSize: '11px', color: '#475569', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                      {filteredResults.slice(0, visibleCount).every(c => selectedIds.has(c.id)) ? 'בטל בחירת הכל' : 'בחר הכל'}
                    </button>
                    {selectedIds.size > 0 && (
                      <>
                        <span style={{ fontSize: '11px', color: '#93c5fd', fontWeight: 700 }}>· {selectedIds.size} נבחרו</span>
                        <button
                          onClick={() => exportToCSV(filteredResults.filter(c => selectedIds.has(c.id)), job.title)}
                          style={{ padding: '4px 10px', background: '#0a2e1a', border: '1px solid #166534', borderRadius: '5px', color: '#4ade80', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >📥 ייצוא נבחרים</button>
                        <button
                          onClick={() => exportToCSV(filteredResults.filter(c => selectedIds.has(c.id)), job.title, true)}
                          style={{ padding: '4px 10px', background: '#1a1a2e', border: '1px solid #4c1d95', borderRadius: '5px', color: '#c4b5fd', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >🔒 חסוי</button>
                        <button onClick={() => setSelectedIds(new Set())} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#475569', cursor: 'pointer' }}>✕</button>
                      </>
                    )}
                  </div>
                </>
              )}
              {filteredResults.length === 0
                ? <div style={{ color: '#475569', fontSize: '12px' }}>לא נמצאו מועמדים מעל {effectiveMinPct}% התאמה — נסה להוריד את הסף או לשנות מילות מפתח</div>
                : <>
                    {filteredResults.slice(0, visibleCount).map((c, i) => (
                      <div key={c.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ paddingTop: '14px', flexShrink: 0 }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#38bdf8' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <CandidateCard candidate={c} rank={i + 1} jobId={job.id} onRejected={loadHistory}
                            candidateReminders={reminders.filter(r => r.candidate_id === c.id || (r.candidate_name && c.name && r.candidate_name === c.name))} />
                        </div>
                      </div>
                    ))}
                    {visibleCount < filteredResults.length && (
                      <button
                        onClick={() => setVisibleCount(v => v + 10)}
                        style={{
                          width: '100%', padding: '10px', marginTop: '6px',
                          background: '#1e293b', border: '1px solid #334155',
                          borderRadius: '8px', color: '#94a3b8', fontSize: '13px',
                          fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        טען עוד ({filteredResults.length - visibleCount} נותרו)
                      </button>
                    )}
                  </>
              }
            </div>
            )
          })()}

          <div style={s.historySection}>
            <div style={s.historyHeader}>
              <div style={s.historyTitle}>📜 היסטוריית התאמות קודמות</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {runs && runs.length > 0 && (
                  <div style={s.runInfo}>
                    ריצה אחרונה: {runs[0].matches_found > 0 ? `✅ ${runs[0].matches_found} נמצאו` : '⭕ לא נמצאו'}
                  </div>
                )}
                {(history?.length > 0 || runs?.length > 0) && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (!confirm('למחוק את כל היסטוריית ההתאמות של משרה זו?')) return
                      await fetch(`/api/jobs/${job.id}/history`, { method: 'DELETE' })
                      setHistory([])
                      setRuns([])
                      updateScan(job.id, { results: null, matchProgress: null })
                    }}
                    style={{
                      padding: '3px 8px', background: 'transparent',
                      border: '1px solid #475569', borderRadius: '5px',
                      color: '#64748b', fontSize: '11px', cursor: 'pointer',
                    }}
                  >
                    🗑 נקה היסטוריה
                  </button>
                )}
              </div>
            </div>

            {/* Match runs log */}
            {runs && runs.length > 0 && (
              <div style={s.runsSection}>
                <div style={s.runsTitle}>ריצות חיפוש ({runs.length})</div>
                {runs.slice(0, 6).map(r => (
                  <div key={r.id} style={s.runRow}>
                    <span style={{ color: '#64748b' }}>
                      {new Date(r.ran_at).toLocaleDateString('he-IL', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <span style={{ color: '#475569' }}>
                      נבדקו {r.candidates_checked}/{r.candidates_total}
                    </span>
                    <span style={{ color: r.matches_found > 0 ? '#4ade80' : '#475569', fontWeight: r.matches_found > 0 ? 600 : 400 }}>
                      {r.matches_found > 0 ? `✅ ${r.matches_found} נמצאו` : '⭕ לא נמצאו'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!history && <div style={s.emptyHistory}>טוען...</div>}
            {history && history.length === 0 && <div style={s.emptyHistory}>טרם נמצאו מועמדים מתאימים למשרה זו</div>}
            {history && history.length > 0 && (
              <div style={s.historyList}>
                {history.map(h => (
                  <div key={h.id}>
                    <div
                      style={{
                        ...s.historyRow,
                        borderColor: h.accepted ? '#166534' : expandedCard === h.id ? '#38bdf8' : '#334155',
                        background: h.accepted ? '#0a1a0a' : '#1e293b',
                      }}
                      onClick={() => setExpandedCard(expandedCard === h.id ? null : h.id)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ ...s.historyName, color: h.accepted ? '#86efac' : '#e2e8f0' }}>
                            {h.name}
                          </div>
                          {h.accepted && (
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#14532d', color: '#4ade80', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              ✅ התקבל
                            </span>
                          )}
                        </div>
                        <div style={s.historyRole}>{h.current_role}</div>
                        {h.accepted && h.acceptance_note && (
                          <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '3px', fontStyle: 'italic' }}>
                            הערה: {h.acceptance_note}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '11px', padding: '3px 9px', borderRadius: '6px', fontWeight: 700, whiteSpace: 'nowrap',
                          border: '1px solid',
                          ...(h.match_type === 'quick'
                            ? { background: '#1c2210', color: '#fbbf24', borderColor: '#854d0e' }
                            : h.match_type === 'single'
                              ? { background: '#2e1065', color: '#c4b5fd', borderColor: '#6d28d9' }
                              : { background: '#172554', color: '#93c5fd', borderColor: '#1d4ed8' }
                          ),
                        }}>
                          {h.match_type === 'quick' ? '⚡ מהיר' : h.match_type === 'single' ? '🎯 ניתוח אישי' : '🔎 מעמיק AI'}
                        </span>
                        <div style={s.historyDate}>
                          {new Date(h.matched_at).toLocaleDateString('he-IL', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                        <div style={{ ...s.pctBadge, background: pctBg(h.match_percentage), color: pctColor(h.match_percentage) }}>
                          {h.match_percentage}%
                        </div>
                        {!h.accepted && (
                          <button
                            style={s.acceptBtn}
                            title="קבל מועמד זה"
                            onClick={e => { e.stopPropagation(); setAcceptingId(h.candidate_id); setAcceptNote(''); setCreateReminder(false); setRemTitle(''); setRemDate(''); setRemTime('09:00'); setRejectingId(null) }}
                          >
                            ✓ קבל
                          </button>
                        )}
                        {!h.accepted && (
                          <button
                            style={s.rejectBtn}
                            title="דחה מועמד זה ותן סיבה"
                            onClick={e => { e.stopPropagation(); setRejectingId(h.candidate_id); setRejectReason(''); setAcceptingId(null) }}
                          >
                            ✕ דחה
                          </button>
                        )}
                        {h.accepted && (
                          <button
                            style={{ padding: '3px 8px', background: 'transparent', border: '1px solid #7f1d1d', borderRadius: '5px', color: '#f87171', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            title="הסר מועמד מהיסטוריית המשרה"
                            onClick={e => { e.stopPropagation(); handleRemoveCandidate(h.candidate_id) }}
                          >
                            🗑 הסר
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setExpandedCard(expandedCard === h.id ? null : h.id) }}
                          style={{
                            padding: '3px 9px', background: expandedCard === h.id ? '#1e3a5f' : '#0f172a',
                            border: `1px solid ${expandedCard === h.id ? '#1d4ed8' : '#334155'}`,
                            borderRadius: '5px', color: expandedCard === h.id ? '#60a5fa' : '#475569',
                            fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600,
                          }}
                        >
                          {expandedCard === h.id ? '▲ סגור' : '▼ פרטי התאמה'}
                        </button>
                      </div>
                    </div>

                    {/* Accept form */}
                    {acceptingId === h.candidate_id && (
                      <div style={s.acceptForm} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '11px', color: '#4ade80', marginBottom: '6px', fontWeight: 600 }}>
                          הערה על קבלת המועמד (אופציונלי) — תופיע על המועמד בחיפושים:
                        </div>
                        <textarea
                          style={s.acceptTextarea}
                          placeholder="לדוגמה: מתאים מצוין לתפקיד, ניסיון רלוונטי, ראיון ראשון נקבע לתאריך..."
                          value={acceptNote}
                          onChange={e => setAcceptNote(e.target.value)}
                          autoFocus
                          dir="rtl"
                        />
                        {/* ── Inline reminder checkbox ── */}
                        <div style={{ marginTop: '8px', borderTop: '1px solid #1a3a1a', paddingTop: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#86efac' }}>
                            <input type="checkbox" checked={createReminder} onChange={e => {
                              setCreateReminder(e.target.checked)
                              if (e.target.checked) {
                                const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
                                const pad = n => String(n).padStart(2, '0')
                                setRemTitle(`מעקב — ${h.name || 'מועמד'} · ${job.title}`)
                                setRemDate(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}`)
                                setRemTime('09:00')
                              }
                            }} style={{ accentColor: '#4ade80', width: '14px', height: '14px' }} />
                            🔔 צור תזכורת מעקב
                          </label>
                          {createReminder && (
                            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <input value={remTitle} onChange={e => setRemTitle(e.target.value)}
                                placeholder="כותרת התזכורת *" dir="auto"
                                style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #14532d', borderRadius: '5px', color: '#86efac', fontSize: '12px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <input type="date" value={remDate} onChange={e => setRemDate(e.target.value)}
                                  style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #14532d', borderRadius: '5px', color: '#86efac', fontSize: '12px', outline: 'none', flex: 1, colorScheme: 'dark' }} />
                                <input type="time" value={remTime} onChange={e => setRemTime(e.target.value)}
                                  style={{ padding: '6px 10px', background: '#0f172a', border: '1px solid #14532d', borderRadius: '5px', color: '#86efac', fontSize: '12px', outline: 'none', width: '100px', colorScheme: 'dark' }} />
                              </div>
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '7px' }}>
                          <button style={s.acceptSaveBtn} onClick={() => handleAccept(h.candidate_id, h.name, h.phone)}>
                            ✅ אשר קבלה{createReminder && remTitle.trim() ? ' + תזכורת' : ''}
                          </button>
                          <button style={s.rejectCancelBtn} onClick={() => { setAcceptingId(null); setAcceptNote(''); setCreateReminder(false); setRemTitle(''); setRemDate(''); setRemTime('09:00') }}>
                            ביטול
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reject form */}
                    {rejectingId === h.candidate_id && (
                      <div style={s.rejectForm} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '11px', color: '#f87171', marginBottom: '6px', fontWeight: 600 }}>
                          סיבת הדחייה — תשמש כהקשר לשיפור חיפושים עתידיים:
                        </div>
                        <textarea
                          style={s.rejectTextarea}
                          placeholder="לדוגמה: ניסיון רק אקדמי, אין ניסיון בסביבת production. חסר ניסיון ב-AWS..."
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          autoFocus
                          dir="rtl"
                        />
                        <div style={{ display: 'flex', gap: '6px', marginTop: '7px' }}>
                          <button style={s.rejectSaveBtn} onClick={() => handleReject(h.candidate_id)} disabled={!rejectReason.trim()}>
                            💾 שמור דחייה
                          </button>
                          <button style={s.rejectCancelBtn} onClick={() => { setRejectingId(null); setRejectReason('') }}>
                            ביטול
                          </button>
                        </div>
                      </div>
                    )}

                    {expandedCard === h.id && (
                      <div style={{ padding: '8px 0 4px' }}>
                        <CandidateCard candidate={{ ...h, id: h.candidate_id }} rank={null} jobId={job.id} onRejected={loadHistory}
                          candidateReminders={reminders.filter(r => r.candidate_id === h.candidate_id || (r.candidate_name && h.name && r.candidate_name === h.name))} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {/* (Reminder is now created inline in the accept form) */}
    </div>
  )
}

// ── Single pending job card — expandable with full edit form ─────────────────

function PendingJobCard({ job, topN, minPct, onApproved, onClosed }) {
  const [expanded,     setExpanded]     = useState(false)
  const [analyzing,    setAnalyzing]    = useState(false)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [approving,    setApproving]    = useState(false)
  const [approveError, setApproveError] = useState(null)

  const initEditData = (reqs) => ({
    role_title:            reqs.role_title            || job.title || '',
    min_experience_years:  reqs.min_experience_years  || 0,
    required_technologies: reqs.required_technologies || [],
    nice_to_have:          reqs.nice_to_have          || [],
    management_required:   reqs.management_required   || false,
    location:              reqs.location              || '',
    domain:                reqs.domain                || '',
    additional_notes:      reqs.additional_notes      || '',
    top_n:                 reqs.top_n       != null   ? reqs.top_n       : topN,
    min_match_pct:         reqs.min_match_pct != null ? reqs.min_match_pct : minPct,
  })

  // Pre-populate if job was already analyzed in a previous session
  const existingReqs = job.requirements || {}
  const [editData, setEditData] = useState(
    existingReqs.role_title ? initEditData(existingReqs) : null
  )

  const runAnalyze = async () => {
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res  = await fetch(`/api/jobs/${job.id}/analyze`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'שגיאה בניתוח')
      setEditData(initEditData(data.requirements || data))
    } catch (e) {
      setAnalyzeError(e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleExpand = async () => {
    const next = !expanded
    setExpanded(next)
    // Auto-analyze on first expand if not yet done
    if (next && !editData && !analyzing) {
      await runAnalyze()
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    setApproveError(null)
    try {
      const res = await fetch(`/api/jobs/${job.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements: editData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'שגיאה')
      onApproved()
    } catch (e) {
      setApproveError(e.message)
      setApproving(false)
    }
  }

  const handleClose = async (e) => {
    e && e.stopPropagation()
    await fetch(`/api/jobs/${job.id}/close`, { method: 'POST' })
    onClosed()
  }

  const isReady = !!editData

  return (
    <div style={{ borderBottom: '1px solid #0a1525' }}>
      {/* Collapsed header row */}
      <div
        style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: expanded ? '#0d1e30' : '#0f1e2e', transition: 'background 0.15s' }}
        onClick={handleExpand}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '2px' }}>
            {isReady ? (editData.role_title || job.title) : job.title}
            {isReady && <span style={{ fontSize: '10px', color: '#4ade80', background: '#14532d', borderRadius: '8px', padding: '1px 7px', marginRight: '7px', fontWeight: 500 }}>✓ נותח</span>}
          </div>
          {job.civi_url && (
            <a href={job.civi_url} target="_blank" rel="noreferrer"
              style={{ fontSize: '11px', color: '#475569', textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}>
              🔗 {job.civi_url.replace(/https?:\/\//, '')}
            </a>
          )}
          {analyzeError && <div style={{ fontSize: '11px', color: '#f87171', marginTop: '3px' }}>⚠ {analyzeError}</div>}
          {approveError && <div style={{ fontSize: '11px', color: '#f87171', marginTop: '3px' }}>⚠ {approveError}</div>}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          {isReady && !expanded && (
            <button
              onClick={handleApprove}
              disabled={approving}
              style={{ padding: '5px 10px', background: approving ? '#1e293b' : '#14532d', border: '1px solid #166534', borderRadius: '6px', color: '#4ade80', fontSize: '12px', fontWeight: 600, cursor: approving ? 'wait' : 'pointer' }}
            >
              {approving ? '⏳...' : '✓ אשר'}
            </button>
          )}
          <button
            onClick={handleClose}
            disabled={approving}
            style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #450a0a', borderRadius: '6px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}
          >
            ✕
          </button>
          <span style={{ color: '#475569', fontSize: '13px', minWidth: '14px', textAlign: 'center' }}>
            {analyzing ? '⏳' : (expanded ? '▲' : '▼')}
          </span>
        </div>
      </div>

      {/* Expanded: full editable form */}
      {expanded && (
        <div style={{ padding: '16px 18px', borderTop: '1px solid #1e293b', background: '#080f1a', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {analyzing && (
            <div style={{ textAlign: 'center', color: '#60a5fa', fontSize: '12px', padding: '20px' }}>
              ⏳ מנתח את המשרה עם AI...
            </div>
          )}

          {!analyzing && analyzeError && (
            <div style={{ color: '#f87171', fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>⚠ {analyzeError}</span>
              <button
                onClick={() => { setAnalyzeError(null); setEditData(initEditData({})) }}
                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '5px', color: '#94a3b8', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}
              >
                ✏ ערוך ידנית
              </button>
              <button
                onClick={runAnalyze}
                style={{ background: '#1e3a5f', border: '1px solid #2563eb', borderRadius: '5px', color: '#60a5fa', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}
              >
                🔄 נסה שוב
              </button>
            </div>
          )}

          {!analyzing && editData && (
            <>
              <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>✏ בדוק ועדכן פרטי המשרה לפני אישור</div>

              <div>
                <div style={s.editLabel}>שם תפקיד</div>
                <input style={s.editInput} value={editData.role_title}
                  onChange={e => setEditData(d => ({ ...d, role_title: e.target.value }))} />
              </div>

              <div style={s.editRow}>
                <div>
                  <div style={s.editLabel}>מינימום שנות ניסיון</div>
                  <input type="number" style={s.editInput} value={editData.min_experience_years}
                    onChange={e => setEditData(d => ({ ...d, min_experience_years: +e.target.value }))} />
                </div>
                <div>
                  <div style={s.editLabel}>מיקום</div>
                  <input style={s.editInput} value={editData.location}
                    onChange={e => setEditData(d => ({ ...d, location: e.target.value }))} />
                </div>
              </div>

              <div style={s.editRow}>
                <div>
                  <div style={s.editLabel}>דומיין</div>
                  <input style={s.editInput} value={editData.domain}
                    onChange={e => setEditData(d => ({ ...d, domain: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                  <label style={s.checkLabel}>
                    <input type="checkbox" checked={editData.management_required}
                      onChange={e => setEditData(d => ({ ...d, management_required: e.target.checked }))} />
                    ניסיון ניהולי נדרש
                  </label>
                </div>
              </div>

              <div>
                <div style={s.editLabel}>טכנולוגיות נדרשות (Enter להוספה)</div>
                <div style={{ background: '#1e293b', borderRadius: '6px', padding: '6px 8px', border: '1px solid #334155' }}>
                  <TagEditor
                    tags={editData.required_technologies}
                    onChange={v => setEditData(d => ({ ...d, required_technologies: v }))}
                    placeholder="+ הוסף..."
                  />
                </div>
              </div>

              <div>
                <div style={s.editLabel}>Nice to have (Enter להוספה)</div>
                <div style={{ background: '#1e293b', borderRadius: '6px', padding: '6px 8px', border: '1px solid #334155' }}>
                  <TagEditor
                    tags={editData.nice_to_have}
                    chipStyle={s.tagChipNice}
                    onChange={v => setEditData(d => ({ ...d, nice_to_have: v }))}
                    placeholder="+ הוסף..."
                  />
                </div>
              </div>

              <div>
                <div style={s.editLabel}>הערות נוספות</div>
                <input style={s.editInput} value={editData.additional_notes}
                  onChange={e => setEditData(d => ({ ...d, additional_notes: e.target.value }))} />
              </div>

              <div style={s.editRow}>
                <div>
                  <div style={s.editLabel}>מספר תוצאות: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{editData.top_n}</span></div>
                  <input type="range" min={1} max={30} value={editData.top_n}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                    onChange={e => setEditData(d => ({ ...d, top_n: +e.target.value }))} />
                </div>
                <div>
                  <div style={s.editLabel}>אחוז התאמה מינימלי: <span style={{ color: '#38bdf8', fontWeight: 700 }}>{editData.min_match_pct}%</span></div>
                  <input type="range" min={20} max={95} step={5} value={editData.min_match_pct}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                    onChange={e => setEditData(d => ({ ...d, min_match_pct: +e.target.value }))} />
                </div>
              </div>

              {approveError && (
                <div style={{ color: '#f87171', fontSize: '12px' }}>⚠ {approveError}</div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={{ ...s.saveEditBtn, flex: 1 }}
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? '⏳ מאשר ומפרסם...' : '✓ אשר ופרסם משרה'}
                </button>
                <button
                  style={{ padding: '7px 12px', background: '#1e3a5f', border: '1px solid #2563eb', borderRadius: '7px', color: '#60a5fa', fontSize: '12px', cursor: 'pointer' }}
                  onClick={runAnalyze}
                  disabled={analyzing}
                  title="נתח מחדש מה-URL"
                >
                  🔄 נתח מחדש
                </button>
                <button style={s.cancelEditBtn} onClick={handleClose}>✕ סגור</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Pending jobs (imported from Civi) ────────────────────────────────────────

function PendingJobsPanel({ onApproved, topN, minPct }) {
  const [pending, setPending]       = useState([])
  const [syncing, setSyncing]       = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [open, setOpen]             = useState(false)

  const loadPending = () =>
    fetch('/api/jobs/pending').then(r => r.json()).then(setPending).catch(() => {})

  useEffect(() => { loadPending() }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res  = await fetch('/api/jobs/import-civi', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'שגיאה')
      setSyncResult(data)
      loadPending()
    } catch (e) {
      setSyncResult({ error: e.message })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={{ background: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: '14px', marginBottom: '16px', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 18px', cursor: 'pointer', background: 'linear-gradient(135deg,#0d2340,#0a1a2e)' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#93c5fd', flex: 1 }}>
          📥 משרות ממתינות לאישור
          {pending.length > 0 && (
            <span style={{ background: '#1d4ed8', color: '#bfdbfe', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', marginRight: '6px' }}>
              {pending.length}
            </span>
          )}
        </span>
        <button
          onClick={e => { e.stopPropagation(); handleSync() }}
          disabled={syncing}
          style={{ padding: '5px 12px', background: syncing ? '#1e293b' : '#1e3a5f', border: '1px solid #2563eb', borderRadius: '7px', color: '#60a5fa', fontSize: '12px', fontWeight: 600, cursor: syncing ? 'wait' : 'pointer' }}
        >
          {syncing ? '⏳ מסנכרן...' : '🔄 סנכרן מ-Civi'}
        </button>
        <span style={{ color: '#475569', fontSize: '13px' }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div style={{ padding: '6px 18px', fontSize: '12px', background: syncResult.error ? '#1a0a0a' : '#0a1e0a', color: syncResult.error ? '#f87171' : '#86efac', borderBottom: '1px solid #1e293b' }}>
          {syncResult.error
            ? `⚠ שגיאת סנכרון: ${syncResult.error}`
            : `✓ סנכרון הושלם — ${syncResult.added} חדשות, ${syncResult.skipped} כבר קיימות (סה"כ ${syncResult.total_scraped} באתר)`}
        </div>
      )}

      {/* Pending jobs list */}
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {pending.length === 0 ? (
            <div style={{ padding: '20px 18px', fontSize: '12px', color: '#475569', textAlign: 'center' }}>
              {syncResult ? 'אין משרות חדשות ממתינות לאישור' : 'לחץ "סנכרן מ-Civi" כדי למשוך משרות חדשות'}
            </div>
          ) : (
            pending.map(job => (
              <PendingJobCard
                key={job.id}
                job={job}
                topN={topN}
                minPct={minPct}
                onApproved={() => { setPending(prev => prev.filter(j => j.id !== job.id)); onApproved && onApproved() }}
                onClosed={() => setPending(prev => prev.filter(j => j.id !== job.id))}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function JobsPanel({ topN, minPct }) {
  const [jobs, setJobs] = useState([])
  const [clearingAll, setClearingAll] = useState(false)
  const [jobSearch, setJobSearch] = useState('')
  const [reminders, setReminders] = useState([])

  const load = () =>
    fetch('/api/jobs').then(r => r.json()).then(setJobs).catch(() => {})

  const loadReminders = () =>
    fetch('/api/reminders').then(r => r.json()).then(d => setReminders(d.filter(r => !r.dismissed))).catch(() => {})

  useEffect(() => { load(); loadReminders() }, [])

  const handleDeleted = (id) => setJobs(prev => prev.filter(j => j.id !== id))

  const handleClearAllHistory = async () => {
    if (!confirm('למחוק את כל היסטוריית ההתאמות של כל המשרות? פעולה זו אינה הפיכה.')) return
    setClearingAll(true)
    await fetch('/api/history', { method: 'DELETE' }).catch(() => {})
    setClearingAll(false)
    load()
  }

  return (
    <div style={s.wrap}>
      {/* Civi pending jobs panel — always visible at top */}
      <PendingJobsPanel onApproved={load} topN={topN} minPct={minPct} />

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="חיפוש משרה..."
            value={jobSearch}
            onChange={e => setJobSearch(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 34px 6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', fontSize: '13px', outline: 'none', direction: 'rtl' }}
          />
        </div>
        <button
          onClick={handleClearAllHistory}
          disabled={clearingAll}
          style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #475569', borderRadius: '6px', color: '#64748b', fontSize: '12px', cursor: 'pointer', opacity: clearingAll ? 0.5 : 1, whiteSpace: 'nowrap' }}
        >
          🗑 נקה היסטוריה — כל המשרות
        </button>
      </div>

      {/* Active jobs list */}
      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#64748b' }}>אין משרות שמורות</div>
          <div style={{ fontSize: '12px', marginTop: '6px' }}>מלא דרישות משרה בטופס ולחץ "שמור משרה"</div>
        </div>
      ) : (() => {
        const filtered = jobSearch.trim()
          ? jobs.filter(j => (j.title || '').toLowerCase().includes(jobSearch.toLowerCase()))
          : jobs
        return filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>לא נמצאו משרות התואמות "{jobSearch}"</div>
          </div>
        ) : filtered.map(j => (
          <JobCard key={j.id} job={j} topN={topN} minPct={minPct} onDeleted={handleDeleted} onUpdated={load} reminders={reminders} />
        ))
      })()}
    </div>
  )
}
