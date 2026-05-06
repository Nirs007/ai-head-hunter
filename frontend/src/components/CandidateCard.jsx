import { useState, useRef, useEffect } from 'react'

/** Normalize Israeli phone → WhatsApp-compatible digits (no + or spaces) */
const waPhone = (phone) => {
  const d = (phone || '').replace(/\D/g, '')
  if (d.startsWith('972')) return d
  if (d.startsWith('0'))   return '972' + d.slice(1)
  return d
}

const matchColor = (pct) => {
  if (pct >= 80) return { bg: '#14532d', border: '#166534', text: '#4ade80', label: 'התאמה גבוהה' }
  if (pct >= 60) return { bg: '#713f12', border: '#854d0e', text: '#fbbf24', label: 'התאמה בינונית' }
  return          { bg: '#450a0a', border: '#7f1d1d', text: '#f87171', label: 'התאמה נמוכה' }
}

const companyBgMap = {
  startup:    { bg: '#1e3a5f', text: '#60a5fa', label: '🚀 סטארטאפ' },
  enterprise: { bg: '#1a2e1a', text: '#4ade80', label: '🏢 חברה גדולה' },
  mixed:      { bg: '#2d1f3d', text: '#c084fc', label: '🔀 מגוון' },
}
const companySizeIcon = { startup: '🚀', mid: '🏗️', enterprise: '🏢' }

const summaryTabDefs = [
  { key: 'submission_summary', label: '📋 סיכום להגשה' },
  { key: 'cv_review',          label: '👁 חוות דעת' },
  { key: 'cv_improvements',    label: '✍ שיפורים' },
  { key: 'interview_prep',     label: '🎤 הכנה לראיון' },
]

const s = {
  card: {
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '16px', overflow: 'hidden',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  cardHover: { borderColor: '#475569', boxShadow: '0 4px 24px #00000033' },
  topBar: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 100%)',
    padding: '16px 20px', display: 'flex', gap: '14px',
    alignItems: 'flex-start', borderBottom: '1px solid #334155',
  },
  avatar: {
    width: '44px', height: '44px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '17px', fontWeight: 700, color: '#fff', flexShrink: 0,
  },
  nameBlock: { flex: 1, minWidth: 0 },
  name: { fontSize: '17px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 },
  roleCompany: { fontSize: '13px', color: '#94a3b8', marginTop: '3px' },
  matchBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    borderRadius: '12px', padding: '8px 14px', border: '2px solid',
    minWidth: '70px', flexShrink: 0,
  },
  matchPct: { fontSize: '22px', fontWeight: 800, lineHeight: 1 },
  matchLbl: { fontSize: '9px', fontWeight: 600, marginTop: '2px', opacity: 0.85 },
  statsRow: {
    display: 'flex', gap: '6px', flexWrap: 'wrap',
    padding: '10px 20px', background: '#162032',
    borderBottom: '1px solid #1e293b',
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: '5px',
    background: '#1e293b', border: '1px solid #334155',
    borderRadius: '20px', padding: '4px 10px',
    fontSize: '12px', color: '#cbd5e1',
  },
  body: { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  contactBox: {
    display: 'flex', gap: '18px', flexWrap: 'wrap',
    padding: '10px 14px', background: '#0f172a',
    borderRadius: '8px', border: '1px solid #334155',
  },
  contactItem: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', color: '#94a3b8', cursor: 'pointer',
  },
  contactVal: { color: '#e2e8f0', fontWeight: 500 },
  summary: {
    background: '#0f172a', borderRadius: '8px', padding: '12px 14px',
    fontSize: '13px', color: '#cbd5e1', lineHeight: 1.7,
    borderRight: '3px solid #3b82f6',
  },
  summaryEn: {
    background: '#0f172a', borderRadius: '8px', padding: '10px 14px',
    fontSize: '12px', color: '#64748b', lineHeight: 1.6,
    borderRight: '3px solid #334155', direction: 'ltr', textAlign: 'left',
  },
  rolesWrap: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  roleChip: {
    background: '#1e1b4b', color: '#a5b4fc',
    borderRadius: '6px', padding: '4px 10px',
    fontSize: '11px', fontWeight: 600,
    border: '1px solid #312e81',
  },
  recommendation: {
    background: '#1e3a5f22', border: '1px solid #1d4ed8',
    borderRadius: '8px', padding: '10px 14px',
    fontSize: '13px', color: '#93c5fd', lineHeight: 1.5,
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  section: { background: '#0f172a', borderRadius: '8px', padding: '10px 12px' },
  sectionTitle: {
    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.6px', marginBottom: '6px',
  },
  bullet: {
    fontSize: '12px', padding: '2px 0', display: 'flex',
    gap: '6px', alignItems: 'flex-start', lineHeight: 1.45,
  },
  techsWrap: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
  tech:        { background: '#1e3a5f', color: '#93c5fd', borderRadius: '5px', padding: '3px 9px', fontSize: '11px', fontWeight: 500 },
  techMatch:   { background: '#14532d', color: '#86efac' },
  techMissing: { background: '#450a0a', color: '#fca5a5' },
  roleRow: {
    display: 'flex', gap: '8px', alignItems: 'flex-start',
    padding: '6px 0', borderBottom: '1px solid #1e293b22',
    fontSize: '12px',
  },
  companiesRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' },
  companyBadge: {
    background: '#334155', color: '#cbd5e1',
    borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 500,
  },
  fileLink: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    color: '#818cf8', fontSize: '12px', cursor: 'pointer',
    background: '#1e1b4b', padding: '5px 12px',
    borderRadius: '6px', border: '1px solid #312e81',
  },
  toggleBtn: {
    background: 'none', border: 'none', color: '#60a5fa',
    cursor: 'pointer', fontSize: '12px', padding: '2px 0',
  },
  sectionLabel: { fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '6px' },
  checkSection: {
    borderTop: '1px solid #1e293b',
    padding: '10px 20px 14px',
  },
  checkToggleBtn: {
    background: 'none', border: 'none', color: '#818cf8',
    cursor: 'pointer', fontSize: '12px', padding: 0,
    display: 'flex', alignItems: 'center', gap: '5px',
  },
  checkJobRow: {
    display: 'flex', gap: '8px', marginBottom: '10px', marginTop: '10px',
  },
  jobSelect: {
    flex: 1, background: '#0f172a', border: '1px solid #334155',
    borderRadius: '6px', color: '#e2e8f0', fontSize: '12px',
    padding: '6px 8px', outline: 'none',
  },
  analyzeBtn: {
    border: 'none', borderRadius: '6px', color: '#fff',
    fontSize: '12px', padding: '6px 14px', cursor: 'pointer', fontWeight: 600,
  },
  sumTabsRow: {
    display: 'flex', gap: '3px', marginBottom: '8px', marginTop: '10px',
  },
  sumTabBtn: {
    padding: '5px 10px', borderRadius: '5px',
    fontSize: '11px', cursor: 'pointer', fontWeight: 500,
    border: 'none',
  },
  sumContent: {
    background: '#0f172a', borderRadius: '8px', padding: '10px 12px',
    fontSize: '12px', color: '#cbd5e1', lineHeight: 1.65,
  },
  findJobsSection: {
    borderTop: '1px solid #1e293b',
    padding: '10px 20px 14px',
  },
  findJobsBtn: {
    background: 'none', border: 'none', color: '#34d399',
    cursor: 'pointer', fontSize: '12px', padding: 0,
    display: 'flex', alignItems: 'center', gap: '5px',
  },
  jobMatchItem: {
    border: '1px solid #334155', borderRadius: '10px',
    overflow: 'hidden', marginBottom: '8px',
  },
  jobMatchHeader: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 12px', cursor: 'pointer',
    background: '#0f172a',
  },
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => execCopy(text))
  } else {
    execCopy(text)
  }
}

function execCopy(text) {
  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.focus()
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

function copy(text) { copyToClipboard(text) }

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e) => {
    e.stopPropagation()
    copyToClipboard(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button
      onClick={handleCopy}
      title="העתק"
      style={{
        padding: '2px 7px', fontSize: '11px', fontWeight: 600,
        background: copied ? '#14532d' : '#1e293b',
        border: `1px solid ${copied ? '#166534' : '#334155'}`,
        borderRadius: '4px', color: copied ? '#4ade80' : '#64748b',
        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
        lineHeight: '1.4',
      }}
    >
      {copied ? '✓ הועתק' : 'העתק'}
    </button>
  )
}

// ── CV file link with copy-path + open actions ───────────────────────────────
function CvFileLink({ candidateId, filePath, fileName }) {
  const [copied,  setCopied]  = useState(false)
  const [opening, setOpening] = useState(false)

  const copyPath = (e) => {
    e.stopPropagation()
    copy(filePath)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const openFile = async (e) => {
    e.stopPropagation()
    setOpening(true)
    try {
      const res = await fetch(`/api/candidates/${candidateId}/open-cv`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.detail || 'לא ניתן לפתוח את הקובץ')
      }
    } catch { alert('שגיאה בפתיחת הקובץ') }
    finally { setOpening(false) }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <button onClick={copyPath} title={filePath}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px',
          background: copied ? '#14532d' : '#1e1b4b',
          border: `1px solid ${copied ? '#166534' : '#4338ca'}`,
          borderRadius: '7px', cursor: 'pointer',
          color: copied ? '#4ade80' : '#818cf8', fontSize: '12px', fontWeight: 600,
          transition: 'all 0.15s',
        }}>
        📄 {fileName || 'קורות חיים'}
        <span style={{ fontSize: '10px', opacity: 0.75 }}>
          {copied ? '✓ הועתק' : '📋 העתק נתיב'}
        </span>
      </button>
      <button onClick={openFile} disabled={opening}
        title="פתח את הקובץ בתוכנה המוגדרת כברירת מחדל"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '6px 10px', background: 'none',
          border: '1px solid #334155', borderRadius: '7px',
          cursor: opening ? 'default' : 'pointer',
          color: '#64748b', fontSize: '11px', opacity: opening ? 0.5 : 1,
        }}>
        {opening ? '⏳' : '↗ פתח'}
      </button>
    </div>
  )
}

// ── Per-job result card shown inside "Find jobs for candidate" panel ─────────
function JobMatchCard({ result }) {
  const [open, setOpen] = useState(true)
  const [tab,  setTab]  = useState(0)
  const colors    = matchColor(result.match_percentage)
  const summaries = result.summaries || {}
  const adv  = Array.isArray(result.advantages)          ? result.advantages          : []
  const dis  = Array.isArray(result.disadvantages)       ? result.disadvantages       : []
  const imps = Array.isArray(summaries.cv_improvements)  ? summaries.cv_improvements  : []
  const miss = Array.isArray(result.missing_requirements)? result.missing_requirements: []
  const matchTechs = Array.isArray(result.matching_technologies) ? result.matching_technologies : []
  const hasSummaries = !!(summaries.submission_summary || summaries.cv_review || imps.length > 0)

  return (
    <div style={s.jobMatchItem}>
      {/* Header — always visible */}
      <div style={s.jobMatchHeader} onClick={() => setOpen(o => !o)}>
        <div style={{
          background: colors.bg, border: `2px solid ${colors.border}`,
          borderRadius: '8px', padding: '3px 10px',
          color: colors.text, fontWeight: 800, fontSize: '15px', flexShrink: 0,
        }}>
          {result.match_percentage}%
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3 }}>
            {result.job_title}
          </div>
          <div style={{ fontSize: '10px', color: colors.text }}>{colors.label}</div>
        </div>
        <span style={{ color: '#64748b', fontSize: '11px' }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: '10px 12px', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Recommendation */}
          {result.recommendation && (
            <div style={{ ...s.recommendation, fontSize: '12px' }}>
              💡 {result.recommendation}
            </div>
          )}

          {/* Experience note + Management note */}
          {(result.experience_note || result.management_note) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {result.experience_note && (
                <div style={{ fontSize: '12px', color: '#94a3b8', background: '#1e293b', borderRadius: '6px', padding: '6px 10px' }}>
                  🕐 {result.experience_note}
                </div>
              )}
              {result.management_note && (
                <div style={{ fontSize: '12px', color: '#94a3b8', background: '#1e293b', borderRadius: '6px', padding: '6px 10px' }}>
                  👥 {result.management_note}
                </div>
              )}
            </div>
          )}

          {/* Matching technologies */}
          {matchTechs.length > 0 && (
            <div>
              <div style={s.sectionLabel}>✅ טכנולוגיות תואמות</div>
              <div style={s.techsWrap}>
                {matchTechs.map(t => <span key={t} style={{ ...s.tech, ...s.techMatch }}>{t}</span>)}
              </div>
            </div>
          )}

          {/* Advantages / Disadvantages grid */}
          {(adv.length > 0 || dis.length > 0) && (
            <div style={s.grid}>
              <div style={s.section}>
                <div style={{ ...s.sectionTitle, color: '#4ade80' }}>✓ יתרונות</div>
                {adv.length === 0
                  ? <div style={{ ...s.bullet, color: '#475569' }}>—</div>
                  : adv.map((a, i) => <div key={i} style={{ ...s.bullet, color: '#86efac' }}><span style={{ color: '#4ade80', flexShrink: 0 }}>•</span>{a}</div>)
                }
              </div>
              <div style={s.section}>
                <div style={{ ...s.sectionTitle, color: '#f87171' }}>✗ חסרונות</div>
                {dis.length === 0
                  ? <div style={{ ...s.bullet, color: '#475569' }}>—</div>
                  : dis.map((d, i) => <div key={i} style={{ ...s.bullet, color: '#fca5a5' }}><span style={{ color: '#f87171', flexShrink: 0 }}>•</span>{d}</div>)
                }
              </div>
            </div>
          )}

          {/* Missing requirements */}
          {miss.length > 0 && (
            <div>
              <div style={s.sectionLabel}>⚠ דרישות חסרות</div>
              <div style={s.techsWrap}>
                {miss.map(t => <span key={t} style={{ ...s.tech, ...s.techMissing }}>{t}</span>)}
              </div>
            </div>
          )}

          {/* AI summary tabs — 📋 / 👁 / ✍ */}
          {hasSummaries && (
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
              <div style={s.sumTabsRow}>
                {['📋 סיכום להגשה', '👁 חוות דעת', '✍ שיפורים'].map((label, i) => (
                  <button
                    key={i}
                    style={{
                      ...s.sumTabBtn,
                      background: tab === i ? '#4f46e5' : '#1e293b',
                      color: tab === i ? '#fff' : '#94a3b8',
                      border: tab === i ? 'none' : '1px solid #334155',
                    }}
                    onClick={() => setTab(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div style={s.sumContent}>
                {tab === 0 && (summaries.submission_summary || '—')}
                {tab === 1 && (summaries.cv_review || '—')}
                {tab === 2 && (
                  imps.length > 0
                    ? <div>{imps.map((imp, i) => (
                        <div key={i} style={{ padding: '4px 0', borderBottom: i < imps.length - 1 ? '1px solid #1e293b' : 'none' }}>
                          <span style={{ color: '#818cf8', fontWeight: 700 }}>{i + 1}.</span> {imp}
                        </div>
                      ))}</div>
                    : '—'
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CandidateCard({ candidate: c, rank, jobId, onRejected, candidateReminders = [] }) {
  const [hover, setHover]         = useState(false)
  const [rolesOpen, setRolesOpen] = useState(false)
  const [showEnSummary, setShowEnSummary] = useState(false)

  // Inline name editing
  const [nameEditing, setNameEditing] = useState(false)
  const [nameValue,   setNameValue]   = useState(c.name || '')
  const [nameSaving,  setNameSaving]  = useState(false)
  const nameInputRef = useRef(null)

  const startNameEdit = (e) => {
    e.stopPropagation()
    setNameValue(c.name || '')
    setNameEditing(true)
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }
  const saveNameEdit = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === c.name) { setNameEditing(false); return }
    setNameSaving(true)
    try {
      await fetch(`/api/candidates/${c.id}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      c.name = trimmed   // mutate prop for immediate display (no re-fetch needed)
      setNameValue(trimmed)
    } catch {}
    setNameSaving(false)
    setNameEditing(false)
  }
  const cancelNameEdit = () => { setNameEditing(false); setNameValue(c.name || '') }

  // Check-for-job state — pre-populate from stored summaries if available
  const _storedSum = c.summaries || {}
  const _hasSummaries = !!(
    _storedSum.submission_summary ||
    _storedSum.cv_review ||
    (_storedSum.cv_improvements || []).length > 0
  )
  const [jobCheckOpen,  setJobCheckOpen]  = useState(_hasSummaries || !!jobId)
  const [availableJobs, setAvailableJobs] = useState([])
  const [selectedJobId, setSelectedJobId] = useState(jobId ? String(jobId) : '')
  const [checking,      setChecking]      = useState(false)
  const [checkResult,   setCheckResult]   = useState(_hasSummaries ? {
    match_percentage:     c.match_percentage,
    advantages:           Array.isArray(c.advantages) ? c.advantages : [],
    disadvantages:        Array.isArray(c.disadvantages) ? c.disadvantages : [],
    missing_requirements: Array.isArray(c.missing_requirements) ? c.missing_requirements : [],
    matching_technologies: Array.isArray(c.matching_technologies) ? c.matching_technologies : [],
    recommendation:       c.recommendation,
    summaries:            _storedSum,
    job_title:            c.job_title || '',
  } : null)
  const [activeTab,     setActiveTab]     = useState(0)
  const [checkActiveTab, setCheckActiveTab] = useState(0)
  const checkAbortRef = useRef(null)

  // Auto-load jobs list when panel starts open (jobId provided from match results)
  useEffect(() => {
    if ((jobId || _hasSummaries) && availableJobs.length === 0) {
      fetch('/api/jobs')
        .then(r => r.json())
        .then(jobs => setAvailableJobs(jobs))
        .catch(() => {})
    }
  }, [])

  // Interview prep state
  const [interviewPrep, setInterviewPrep] = useState(null)
  const [prepLoading,   setPrepLoading]   = useState(false)

  // Find-jobs state (candidate → matching jobs)
  const [findJobsOpen,     setFindJobsOpen]     = useState(false)
  const [findJobsResults,  setFindJobsResults]  = useState([])
  const [findJobsProgress, setFindJobsProgress] = useState(null)
  const findJobsAbortRef = useRef(null)

  // Reject state (for result cards with jobId prop)
  const [showRejectForm,  setShowRejectForm]  = useState(false)
  const [rejectReason,    setRejectReason]    = useState('')
  const [rejectedLocally, setRejectedLocally] = useState(false)

  // Accept state (for result cards with jobId prop)
  const [showAcceptForm,  setShowAcceptForm]  = useState(false)
  const [acceptNote,      setAcceptNote]      = useState('')
  const [acceptedLocally, setAcceptedLocally] = useState(!!c.accepted)

  const colors    = c.match_percentage != null ? matchColor(c.match_percentage) : null
  const allRoles  = Array.isArray(c.all_roles)            ? c.all_roles            : []
  const techs     = Array.isArray(c.technologies)         ? c.technologies         : []
  const matching  = Array.isArray(c.matching_technologies)? c.matching_technologies: []
  const missing   = Array.isArray(c.missing_requirements) ? c.missing_requirements : []
  const adv       = Array.isArray(c.advantages)           ? c.advantages           : []
  const dis       = Array.isArray(c.disadvantages)        ? c.disadvantages        : []
  const notable   = Array.isArray(c.notable_companies)    ? c.notable_companies    : []
  const recRoles  = Array.isArray(c.recommended_roles)    ? c.recommended_roles    : []
  const matchLow  = matching.map(t => t.toLowerCase())
  const compBg    = companyBgMap[c.company_background]    || null
  const initials  = (c.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const lastCo    = c.current_company || allRoles[0]?.company || null

  // LinkedIn profile photo via unavatar.io
  const linkedinUsername = (() => {
    const url = c.linkedin_url || ''
    const m = url.match(/linkedin\.com\/in\/([^/?#]+)/)
    return m ? m[1] : null
  })()
  const [liPhotoOk, setLiPhotoOk] = useState(!!linkedinUsername)
  const liPhotoUrl = linkedinUsername
    ? `https://unavatar.io/linkedin/${linkedinUsername}`
    : null

  // Check-for-job helpers
  const checkColors   = checkResult && !checkResult.error ? matchColor(checkResult.match_percentage) : null
  const checkAdv      = checkResult?.advantages || []
  const checkDis      = checkResult?.disadvantages || []
  const checkSummaries = checkResult?.summaries || {}
  // Effective summaries for the top tabs: prefer stored prop summaries, fall back to fresh check result
  const _effectiveSummaries = _hasSummaries ? _storedSum : checkSummaries

  const openJobCheck = async () => {
    const opening = !jobCheckOpen
    setJobCheckOpen(opening)
    if (opening && availableJobs.length === 0) {
      try {
        const res  = await fetch('/api/jobs')
        const jobs = await res.json()
        setAvailableJobs(jobs)
        if (jobs.length > 0 && !jobId) setSelectedJobId(String(jobs[0].id))
      } catch {}
    }
  }

  const runJobCheck = async () => {
    if (!selectedJobId) return
    const ctrl = new AbortController()
    checkAbortRef.current = ctrl
    setChecking(true)
    setCheckResult(null)
    setInterviewPrep(null)  // reset prep when re-analyzing
    try {
      const res  = await fetch(`/api/candidates/${c.id}/check-for-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: Number(selectedJobId) }),
        signal: ctrl.signal,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'שגיאה')
      setCheckResult(data)
      setActiveTab(0)
      setCheckActiveTab(0)
    } catch (e) {
      if (e.name === 'AbortError') {
        setCheckResult({ cancelled: true })
      } else {
        setCheckResult({ error: e.message })
      }
    } finally {
      setChecking(false)
      checkAbortRef.current = null
    }
  }

  const cancelJobCheck = () => {
    checkAbortRef.current?.abort()
  }

  const loadInterviewPrep = async () => {
    const jid = selectedJobId || (jobId ? String(jobId) : null)
    if (!jid || !c.id) return
    setPrepLoading(true)
    try {
      const res  = await fetch(`/api/candidates/${c.id}/interview-prep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: Number(jid) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'שגיאה')
      setInterviewPrep(data)
    } catch (e) {
      setInterviewPrep({ error: e.message })
    } finally {
      setPrepLoading(false)
    }
  }

  const handleTabClick = (i) => {
    setActiveTab(i)
    if (i === 3 && !interviewPrep && !prepLoading) loadInterviewPrep()
    // Auto-trigger single-candidate analysis when clicking tabs 0/1/2 and summaries not yet loaded
    if (i < 3 && !_hasSummaries && !checkSummaries.submission_summary && !checking && selectedJobId && c.id) {
      runJobCheck()
    }
  }

  const runFindJobs = async () => {
    if (!c.id) return
    if (findJobsAbortRef.current) findJobsAbortRef.current.abort()
    const controller = new AbortController()
    findJobsAbortRef.current = controller
    setFindJobsResults([])
    setFindJobsProgress({ phase: 'connecting' })
    try {
      const res = await fetch(`/api/candidates/${c.id}/find-jobs`, {
        method: 'POST',
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'שגיאה' }))
        throw new Error(err.detail || 'שגיאה')
      }
      const reader  = res.body.getReader()
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
              setFindJobsProgress({ phase: 'running', total: event.total_jobs, processed: 0 })
            } else if (event.type === 'result') {
              setFindJobsResults(prev =>
                [...prev, event].sort((a, b) => (b.match_percentage || 0) - (a.match_percentage || 0))
              )
              setFindJobsProgress(prev => ({ ...prev, processed: event.processed }))
            } else if (event.type === 'progress') {
              setFindJobsProgress(prev => ({ ...prev, processed: event.processed }))
            } else if (event.type === 'done') {
              setFindJobsProgress({ phase: 'done', total: event.total, found: event.found })
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setFindJobsProgress({ phase: 'error', msg: err.message })
      }
    } finally {
      findJobsAbortRef.current = null
    }
  }

  const handleRejectFromResults = async () => {
    if (!rejectReason.trim() || !jobId || !c.id) return
    await fetch(`/api/jobs/${jobId}/reject-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: c.id, rejection_reason: rejectReason.trim() }),
    })
    setShowRejectForm(false)
    setRejectReason('')
    setRejectedLocally(true)
    onRejected && onRejected()
  }

  const handleAcceptFromResults = async () => {
    if (!jobId || !c.id) return
    await fetch(`/api/jobs/${jobId}/accept-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: c.id, acceptance_note: acceptNote.trim() }),
    })
    setShowAcceptForm(false)
    setAcceptNote('')
    setAcceptedLocally(true)
  }

  // When rejected from live results — hide the card entirely
  if (rejectedLocally) return null

  return (
    <div
      className="candidate-card"
      style={{ ...s.card, ...(hover ? s.cardHover : {}) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* ── Top bar ────────────────────────────────────── */}
      <div style={s.topBar}>
        <div style={s.avatar}>
          {liPhotoOk && liPhotoUrl
            ? <img
                src={liPhotoUrl}
                alt={initials}
                onError={() => setLiPhotoOk(false)}
                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              />
            : initials
          }
        </div>

        <div style={s.nameBlock}>
          <div style={{ ...s.name, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {rank != null && <span style={{ color: '#475569', fontSize: '13px' }}>#{rank}</span>}
            {nameEditing ? (
              <>
                <input
                  ref={nameInputRef}
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveNameEdit(); if (e.key === 'Escape') cancelNameEdit() }}
                  style={{
                    background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '5px',
                    color: '#f1f5f9', fontSize: '15px', fontWeight: 700, padding: '2px 8px',
                    outline: 'none', minWidth: '160px', maxWidth: '260px',
                  }}
                  dir="auto"
                />
                <button onClick={saveNameEdit} disabled={nameSaving} style={{ padding: '2px 8px', background: '#1d4ed8', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                  {nameSaving ? '...' : '✓'}
                </button>
                <button onClick={cancelNameEdit} style={{ padding: '2px 7px', background: 'transparent', border: '1px solid #334155', borderRadius: '4px', color: '#64748b', fontSize: '11px', cursor: 'pointer' }}>
                  ✕
                </button>
              </>
            ) : (
              <>
                <span>{c.name || 'שם לא זמין'}</span>
                {c.id && (
                  <button onClick={startNameEdit} title="ערוך שם" style={{ padding: '1px 5px', background: 'transparent', border: 'none', color: '#475569', fontSize: '12px', cursor: 'pointer', opacity: 0.6, lineHeight: 1 }}>
                    ✏
                  </button>
                )}
              </>
            )}
          </div>
          <div style={s.roleCompany}>
            <strong style={{ color: '#e2e8f0' }}>{c.current_role || '—'}</strong>
            {lastCo && <span style={{ color: '#60a5fa' }}> @ {lastCo}</span>}
          </div>
          {candidateReminders.length > 0 && (
            <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {candidateReminders.slice(0, 2).map(rem => (
                <span key={rem.id}
                  title={new Date(rem.due_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  style={{ fontSize: '11px', padding: '1px 7px', background: new Date(rem.due_at) < new Date() ? '#450a0a' : '#1c1a05', border: `1px solid ${new Date(rem.due_at) < new Date() ? '#7f1d1d' : '#713f12'}`, borderRadius: '4px', color: new Date(rem.due_at) < new Date() ? '#f87171' : '#fbbf24' }}>
                  🔔 {rem.title}
                </span>
              ))}
              {candidateReminders.length > 2 && (
                <span style={{ fontSize: '11px', color: '#475569' }}>+{candidateReminders.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {colors && (
          <div style={{ ...s.matchBadge, background: colors.bg, borderColor: colors.border, color: colors.text }}>
            <span style={s.matchPct}>{c.match_percentage}%</span>
            <span style={s.matchLbl}>{colors.label}</span>
          </div>
        )}
      </div>

      {/* ── Quick stats ────────────────────────────────── */}
      <div style={s.statsRow}>
        {c.total_experience_years > 0 && (
          <span style={s.chip}>⏱ <strong>{c.total_experience_years}</strong>&nbsp;שנות ניסיון</span>
        )}
        {c.management_experience && (
          <span style={s.chip}>
            👔 ניהולי{c.management_years > 0 ? ` · ${c.management_years} שנ'` : ''}
          </span>
        )}
        {c.location && <span style={s.chip}>📍 {c.location}</span>}
        {compBg && (
          <span style={{ ...s.chip, background: compBg.bg, color: compBg.text, border: 'none' }}>
            {compBg.label}
          </span>
        )}
        {c.education && (
          <span style={s.chip}>🎓 {c.education.split(',')[0].split('–').pop().trim()}</span>
        )}
        {c.processed_at && (
          <span style={{ ...s.chip }} title={`נוסף למערכת: ${new Date(c.processed_at).toLocaleString('he-IL')}`}>
            📅 {new Date(c.processed_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        )}
        {c.match_type && (
          <span style={{
            ...s.chip, fontWeight: 700,
            ...(c.match_type === 'quick'
              ? { background: '#1c2210', color: '#fbbf24', border: '1px solid #854d0e' }
              : c.match_type === 'single'
                ? { background: '#2e1065', color: '#c4b5fd', border: '1px solid #6d28d9' }
                : { background: '#172554', color: '#93c5fd', border: '1px solid #1d4ed8' }),
          }}>
            {c.match_type === 'quick' ? '⚡ מהיר' : c.match_type === 'single' ? '🎯 ניתוח אישי' : '🔎 מעמיק AI'}
          </span>
        )}
        {c.accepted && (
          <span style={{ ...s.chip, background: '#14532d', color: '#4ade80', border: '1px solid #166534', fontWeight: 700 }}>
            ✅ התקבל{c.acceptance_note ? ` — ${c.acceptance_note}` : ''}
          </span>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────── */}
      <div style={s.body}>

        {/* Contact */}
        {(c.phone || c.email || c.linkedin_url) && (
          <div style={s.contactBox}>
            {c.phone && (
              <span style={{ ...s.contactItem, gap: '8px' }}>
                📱 <span style={s.contactVal}>{c.phone}</span>
                <CopyButton value={c.phone} />
                <a href={`https://wa.me/${waPhone(c.phone)}`} target="_blank" rel="noreferrer"
                  title="שלח ווצאפ"
                  onClick={e => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', background: '#052e16', border: '1px solid #166534', borderRadius: '4px', color: '#4ade80', fontSize: '11px', fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
                  💬 WA
                </a>
              </span>
            )}
            {c.email && (
              <span style={{ ...s.contactItem, gap: '8px' }}>
                📧 <span style={s.contactVal}>{c.email}</span>
                <CopyButton value={c.email} />
              </span>
            )}
            {c.linkedin_url && (
              <span style={{ ...s.contactItem, gap: '8px' }}>
                <a href={c.linkedin_url.startsWith('http') ? c.linkedin_url : 'https://' + c.linkedin_url}
                  target="_blank" rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 9px', background: '#0a1929', border: '1px solid #1d4ed8', borderRadius: '4px', color: '#60a5fa', fontSize: '11px', fontWeight: 700, textDecoration: 'none' }}>
                  🔗 LinkedIn
                </a>
              </span>
            )}
          </div>
        )}

        {/* CV File link */}
        {c.file_path && <CvFileLink candidateId={c.id} filePath={c.file_path} fileName={c.file_name} />}

        {/* AI Recommendation */}
        {c.recommendation && (
          <div style={s.recommendation}>💡 {c.recommendation}</div>
        )}

        {/* Recommended roles */}
        {recRoles.length > 0 && (
          <div>
            <div style={s.sectionLabel}>תפקידים מתאימים למועמד</div>
            <div style={s.rolesWrap}>
              {recRoles.map((r, i) => (
                <span key={i} style={s.roleChip}>🎯 {r}</span>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {(c.raw_summary_he || c.raw_summary) && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={s.sectionLabel}>סיכום מקצועי</div>
              {c.cv_language === 'he' ? (
                /* Hebrew CV: primary is Hebrew; toggle shows English translation */
                c.raw_summary && (
                  <button style={s.toggleBtn} onClick={() => setShowEnSummary(o => !o)}>
                    {showEnSummary ? '▲ הסתר תרגום' : '▼ English translation'}
                  </button>
                )
              ) : (
                /* English CV: primary is Hebrew translation (if available); toggle shows original English */
                c.raw_summary && c.raw_summary_he && (
                  <button style={s.toggleBtn} onClick={() => setShowEnSummary(o => !o)}>
                    {showEnSummary ? '▲ הסתר אנגלית' : '▼ English (original)'}
                  </button>
                )
              )}
            </div>
            <div style={s.summary} dir={c.cv_language === 'he' ? 'rtl' : 'auto'}>
              {c.raw_summary_he || c.raw_summary}
            </div>
            {showEnSummary && c.raw_summary && (
              <div style={{ ...s.summaryEn, marginTop: '6px' }}>{c.raw_summary}</div>
            )}
          </div>
        )}

        {/* Management scope */}
        {c.management_scope && (
          <div style={{ fontSize: '12px', color: '#a78bfa', background: '#1e1b4b22', border: '1px solid #4c1d95', borderRadius: '7px', padding: '7px 12px' }}>
            👔 {c.management_scope}
          </div>
        )}

        {/* Notable companies */}
        {notable.length > 0 && (
          <div style={s.companiesRow}>
            <span style={{ fontSize: '11px', color: '#64748b' }}>חברות בולטות:</span>
            {notable.map(co => <span key={co} style={s.companyBadge}>{co}</span>)}
          </div>
        )}

        {/* Technologies */}
        {(techs.length > 0 || missing.length > 0) && (
          <div>
            <div style={s.sectionLabel}>טכנולוגיות</div>
            <div style={s.techsWrap}>
              {techs.map(t => (
                <span key={t} style={{ ...s.tech, ...(matchLow.includes(t.toLowerCase()) ? s.techMatch : {}) }}>{t}</span>
              ))}
              {missing.map(t => (
                <span key={'m' + t} style={{ ...s.tech, ...s.techMissing }}>⚠ {t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Pros / Cons */}
        {(adv.length > 0 || dis.length > 0) && (
          <div style={s.grid}>
            <div style={s.section}>
              <div style={{ ...s.sectionTitle, color: '#4ade80' }}>✓ יתרונות</div>
              {adv.length === 0
                ? <div style={{ ...s.bullet, color: '#475569' }}>—</div>
                : adv.map((a, i) => (
                    <div key={i} style={{ ...s.bullet, color: '#86efac' }}>
                      <span style={{ color: '#4ade80', flexShrink: 0 }}>•</span>{a}
                    </div>
                  ))
              }
            </div>
            <div style={s.section}>
              <div style={{ ...s.sectionTitle, color: '#f87171' }}>✗ חסרונות / חסרים</div>
              {dis.length === 0
                ? <div style={{ ...s.bullet, color: '#475569' }}>—</div>
                : dis.map((d, i) => (
                    <div key={i} style={{ ...s.bullet, color: '#fca5a5' }}>
                      <span style={{ color: '#f87171', flexShrink: 0 }}>•</span>{d}
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* Experience note */}
        {c.experience_note && (
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>⏱ {c.experience_note}</div>
        )}

        {/* Roles history */}
        {allRoles.length > 0 && (
          <div>
            <button style={s.toggleBtn} onClick={() => setRolesOpen(o => !o)}>
              {rolesOpen ? '▲ הסתר תפקידים' : `▼ היסטוריית תפקידים (${allRoles.length})`}
            </button>
            {rolesOpen && (
              <div style={{ marginTop: '8px', background: '#0f172a', borderRadius: '8px', padding: '8px 12px' }} dir={c.cv_language === 'he' ? 'rtl' : 'ltr'}>
                {allRoles.map((r, i) => (
                  <div key={i} style={{ ...s.roleRow, borderBottom: i < allRoles.length - 1 ? '1px solid #1e293b' : 'none' }}>
                    <span style={{ fontSize: '14px', marginTop: '1px' }}>
                      {companySizeIcon[r.company_size] || '▸'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{r.title}</div>
                      {r.company && <div style={{ color: '#64748b' }}>{r.company}</div>}
                    </div>
                    {r.years && <div style={{ color: '#475569', fontSize: '11px', direction: 'ltr' }}>{r.years}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Summary tabs — match result data (completely independent of check panel) ── */}
      {jobId && (
        <div style={{ borderTop: '1px solid #1e293b', padding: '10px 20px 14px' }}>
          <div style={s.sumTabsRow}>
            {summaryTabDefs.map((tab, i) => (
              <button
                key={i}
                style={{
                  ...s.sumTabBtn,
                  background: activeTab === i ? (i === 3 ? '#065f46' : '#4f46e5') : '#1e293b',
                  color: activeTab === i ? '#fff' : '#94a3b8',
                  border: activeTab === i ? 'none' : '1px solid #334155',
                }}
                onClick={() => handleTabClick(i)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div style={s.sumContent}>
            {/* Tab 0: submission summary — auto-fetches single analysis if not yet loaded */}
            {activeTab === 0 && (
              checking
                ? <div style={{ color: '#94a3b8' }}>⏳ מנתח מועמד מול המשרה...</div>
                : (_effectiveSummaries.submission_summary || c.recommendation || '—')
            )}

            {/* Tab 1: CV review — auto-fetches single analysis if not yet loaded */}
            {activeTab === 1 && (
              checking
                ? <div style={{ color: '#94a3b8' }}>⏳ מנתח מועמד מול המשרה...</div>
                : _effectiveSummaries.cv_review
                  ? _effectiveSummaries.cv_review
                  : <div>
                      {adv.map((a, i) => <div key={i} style={{ ...s.bullet, color: '#86efac' }}><span style={{ color: '#4ade80', flexShrink: 0 }}>•</span>{a}</div>)}
                      {dis.map((d, i) => <div key={i} style={{ ...s.bullet, color: '#fca5a5' }}><span style={{ color: '#f87171', flexShrink: 0 }}>•</span>{d}</div>)}
                      {adv.length === 0 && dis.length === 0 && '—'}
                    </div>
            )}

            {/* Tab 2: CV improvements — auto-fetches single analysis if not yet loaded */}
            {activeTab === 2 && (
              checking
                ? <div style={{ color: '#94a3b8' }}>⏳ מנתח מועמד מול המשרה...</div>
                : _effectiveSummaries.cv_improvements?.length > 0
                  ? <div>{_effectiveSummaries.cv_improvements.map((imp, i) => (
                      <div key={i} style={{ padding: '4px 0', borderBottom: i < _effectiveSummaries.cv_improvements.length - 1 ? '1px solid #1e293b' : 'none' }}>
                        <span style={{ color: '#818cf8', fontWeight: 700 }}>{i + 1}.</span> {imp}
                      </div>
                    ))}</div>
                  : missing.length > 0
                      ? <div>{missing.map((m, i) => <div key={i} style={{ ...s.bullet, color: '#fca5a5' }}><span style={{ color: '#f87171', flexShrink: 0 }}>⚠</span> {m}</div>)}</div>
                      : '—'
            )}

            {/* Tab 3: interview prep — always loads independently via API */}
            {activeTab === 3 && (
              <div>
                {prepLoading && <div style={{ color: '#94a3b8' }}>⏳ מכין המלצות לראיון...</div>}
                {interviewPrep?.error && <div style={{ color: '#f87171' }}>✗ {interviewPrep.error}</div>}
                {interviewPrep && !interviewPrep.error && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {interviewPrep.overall_advice && (
                      <div style={{ background: '#0a2218', border: '1px solid #065f46', borderRadius: '6px', padding: '8px 10px', color: '#6ee7b7', fontSize: '12px', lineHeight: 1.6 }}>
                        💡 {interviewPrep.overall_advice}
                      </div>
                    )}
                    {interviewPrep.key_strengths_to_emphasize?.length > 0 && (
                      <div>
                        <div style={{ ...s.sectionTitle, color: '#4ade80', fontSize: '10px', marginBottom: '4px' }}>✓ נקודות חוזק להדגיש</div>
                        {interviewPrep.key_strengths_to_emphasize.map((t, i) => (
                          <div key={i} style={{ ...s.bullet, color: '#86efac' }}><span style={{ color: '#4ade80', flexShrink: 0 }}>•</span>{t}</div>
                        ))}
                      </div>
                    )}
                    {interviewPrep.weak_points_to_prepare?.length > 0 && (
                      <div>
                        <div style={{ ...s.sectionTitle, color: '#fbbf24', fontSize: '10px', marginBottom: '4px' }}>⚠ נקודות להכנה</div>
                        {interviewPrep.weak_points_to_prepare.map((t, i) => (
                          <div key={i} style={{ ...s.bullet, color: '#fde68a' }}><span style={{ color: '#fbbf24', flexShrink: 0 }}>•</span>{t}</div>
                        ))}
                      </div>
                    )}
                    {interviewPrep.technical_prep?.length > 0 && (
                      <div>
                        <div style={{ ...s.sectionTitle, color: '#60a5fa', fontSize: '10px', marginBottom: '4px' }}>📚 נושאים לחזרה טכנית</div>
                        {interviewPrep.technical_prep.map((t, i) => (
                          <div key={i} style={{ ...s.bullet, color: '#93c5fd' }}><span style={{ color: '#60a5fa', flexShrink: 0 }}>•</span>{t}</div>
                        ))}
                      </div>
                    )}
                    {interviewPrep.suggested_questions?.length > 0 && (
                      <div>
                        <div style={{ ...s.sectionTitle, color: '#c084fc', fontSize: '10px', marginBottom: '4px' }}>❓ שאלות צפויות בראיון</div>
                        {interviewPrep.suggested_questions.map((q, i) => (
                          <div key={i} style={{ ...s.bullet, color: '#e9d5ff' }}><span style={{ color: '#c084fc', flexShrink: 0, fontWeight: 700 }}>{i + 1}.</span>{q}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Check for job panel (independent — for checking against any job) ── */}
      <div style={s.checkSection}>

        {/* Accept / Reject section — only when jobId is provided (result cards) */}
        {jobId && (
          <div style={{ marginBottom: '8px' }}>
            {rejectedLocally ? (
              <div style={{ fontSize: '11px', color: '#f87171', padding: '4px 0' }}>❌ מועמד נדחה למשרה זו</div>
            ) : acceptedLocally ? (
              <div style={{ fontSize: '11px', color: '#4ade80', padding: '4px 0' }}>✅ מועמד התקבל למשרה זו{(acceptNote || c.acceptance_note) ? ` — ${acceptNote || c.acceptance_note}` : ''}</div>
            ) : showAcceptForm ? (
              <div style={{ background: '#0a1a0a', border: '1px solid #166534', borderRadius: '7px', padding: '10px', marginBottom: '6px' }}>
                <div style={{ fontSize: '11px', color: '#4ade80', marginBottom: '6px', fontWeight: 600 }}>
                  הערה על קבלת המועמד (אופציונלי) — תופיע בחיפושים הרלוונטיים:
                </div>
                <textarea
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #14532d', borderRadius: '5px', color: '#86efac', fontSize: '12px', padding: '6px 8px', outline: 'none', resize: 'vertical', minHeight: '52px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  placeholder="לדוגמה: מתאים מצוין, ראיון נקבע לתאריך..."
                  value={acceptNote}
                  onChange={e => setAcceptNote(e.target.value)}
                  autoFocus
                  dir="rtl"
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '7px' }}>
                  <button
                    style={{ padding: '5px 12px', background: '#14532d', border: 'none', borderRadius: '5px', color: '#86efac', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    onClick={handleAcceptFromResults}
                  >
                    ✅ אשר קבלה
                  </button>
                  <button
                    style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #334155', borderRadius: '5px', color: '#64748b', fontSize: '11px', cursor: 'pointer' }}
                    onClick={() => { setShowAcceptForm(false); setAcceptNote('') }}
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : showRejectForm ? (
              <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: '7px', padding: '10px' }}>
                <div style={{ fontSize: '11px', color: '#f87171', marginBottom: '6px', fontWeight: 600 }}>
                  סיבת הדחייה — תשמש כהקשר לשיפור חיפושים עתידיים:
                </div>
                <textarea
                  style={{ width: '100%', background: '#0f172a', border: '1px solid #450a0a', borderRadius: '5px', color: '#fca5a5', fontSize: '12px', padding: '6px 8px', outline: 'none', resize: 'vertical', minHeight: '52px', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  placeholder="לדוגמה: ניסיון רק אקדמי, אין ניסיון בסביבת production..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  autoFocus
                  dir="rtl"
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '7px' }}>
                  <button
                    style={{ padding: '5px 12px', background: '#7f1d1d', border: 'none', borderRadius: '5px', color: '#fca5a5', fontSize: '11px', fontWeight: 600, cursor: 'pointer', opacity: rejectReason.trim() ? 1 : 0.5 }}
                    onClick={handleRejectFromResults}
                    disabled={!rejectReason.trim()}
                  >
                    💾 שמור דחייה
                  </button>
                  <button
                    style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #334155', borderRadius: '5px', color: '#64748b', fontSize: '11px', cursor: 'pointer' }}
                    onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  style={{ padding: '3px 8px', background: 'transparent', border: '1px solid #166534', borderRadius: '5px', color: '#4ade80', fontSize: '10px', cursor: 'pointer' }}
                  onClick={() => { setShowAcceptForm(true); setShowRejectForm(false) }}
                >
                  ✓ קבל מועמד
                </button>
                <button
                  style={{ padding: '3px 8px', background: 'transparent', border: '1px solid #450a0a', borderRadius: '5px', color: '#f87171', fontSize: '10px', cursor: 'pointer' }}
                  onClick={() => { setShowRejectForm(true); setShowAcceptForm(false) }}
                >
                  ✕ דחה מועמד
                </button>
              </div>
            )}
          </div>
        )}

        <button style={s.checkToggleBtn} onClick={openJobCheck}>
          {jobCheckOpen
            ? '▲ סגור בדיקת משרה'
            : (jobId ? '🎯 בדוק מול משרה אחרת' : '🎯 בדוק מול משרה')}
        </button>

        {jobCheckOpen && (
          <div>
            {/* Job selector + run button */}
            <div style={s.checkJobRow}>
              <select
                style={s.jobSelect}
                value={selectedJobId}
                onChange={e => { setSelectedJobId(e.target.value); setCheckResult(null) }}
              >
                {availableJobs.length === 0 && <option value="">אין משרות שמורות</option>}
                {availableJobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
              <button
                style={{
                  ...s.analyzeBtn,
                  background: checking ? '#334155' : '#4f46e5',
                  opacity: (!selectedJobId || checking) ? 0.7 : 1,
                  cursor: (!selectedJobId || checking) ? 'default' : 'pointer',
                }}
                disabled={checking || !selectedJobId}
                onClick={runJobCheck}
              >
                {checking ? '⏳ מנתח...' : '🔎 נתח'}
              </button>
              {checking && (
                <button
                  style={{ ...s.analyzeBtn, background: '#7f1d1d', cursor: 'pointer', opacity: 1 }}
                  onClick={cancelJobCheck}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Cancelled */}
            {checkResult?.cancelled && (
              <div style={{ color: '#94a3b8', fontSize: '12px', padding: '4px 0' }}>
                ↩ הניתוח בוטל
              </div>
            )}

            {/* Error */}
            {checkResult?.error && (
              <div style={{ color: '#f87171', fontSize: '12px', padding: '4px 0' }}>
                ✗ {checkResult.error}
              </div>
            )}

            {/* Results — full rich display */}
            {checkResult && !checkResult.error && !checkResult.cancelled && (
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* Match badge + job title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    background: checkColors.bg, border: `2px solid ${checkColors.border}`,
                    borderRadius: '10px', padding: '6px 14px',
                    color: checkColors.text, fontWeight: 800, fontSize: '20px', flexShrink: 0,
                  }}>
                    {checkResult.match_percentage}%
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600 }}>{checkResult.job_title}</div>
                    <div style={{ fontSize: '10px', color: checkColors.text }}>{checkColors.label}</div>
                  </div>
                </div>

                {/* Recommendation */}
                {checkResult.recommendation && (
                  <div style={{ ...s.recommendation, fontSize: '12px' }}>💡 {checkResult.recommendation}</div>
                )}

                {/* Experience note + Management note */}
                {(checkResult.experience_note || checkResult.management_note) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {checkResult.experience_note && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', background: '#0f172a', borderRadius: '6px', padding: '6px 10px' }}>
                        🕐 {checkResult.experience_note}
                      </div>
                    )}
                    {checkResult.management_note && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', background: '#0f172a', borderRadius: '6px', padding: '6px 10px' }}>
                        👥 {checkResult.management_note}
                      </div>
                    )}
                  </div>
                )}

                {/* Matching technologies */}
                {(checkResult.matching_technologies || []).length > 0 && (
                  <div>
                    <div style={{ ...s.sectionLabel }}>✅ טכנולוגיות תואמות</div>
                    <div style={s.techsWrap}>
                      {checkResult.matching_technologies.map(t => (
                        <span key={t} style={{ ...s.tech, ...s.techMatch }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advantages / Disadvantages */}
                {(checkAdv.length > 0 || checkDis.length > 0) && (
                  <div style={s.grid}>
                    <div style={s.section}>
                      <div style={{ ...s.sectionTitle, color: '#4ade80' }}>✓ יתרונות</div>
                      {checkAdv.length === 0
                        ? <div style={{ ...s.bullet, color: '#475569' }}>—</div>
                        : checkAdv.map((a, i) => (
                            <div key={i} style={{ ...s.bullet, color: '#86efac' }}>
                              <span style={{ color: '#4ade80', flexShrink: 0 }}>•</span>{a}
                            </div>
                          ))
                      }
                    </div>
                    <div style={s.section}>
                      <div style={{ ...s.sectionTitle, color: '#f87171' }}>✗ חסרונות</div>
                      {checkDis.length === 0
                        ? <div style={{ ...s.bullet, color: '#475569' }}>—</div>
                        : checkDis.map((d, i) => (
                            <div key={i} style={{ ...s.bullet, color: '#fca5a5' }}>
                              <span style={{ color: '#f87171', flexShrink: 0 }}>•</span>{d}
                            </div>
                          ))
                      }
                    </div>
                  </div>
                )}

                {/* Missing requirements */}
                {(checkResult.missing_requirements || []).length > 0 && (
                  <div>
                    <div style={{ ...s.sectionLabel }}>⚠ דרישות חסרות</div>
                    <div style={s.techsWrap}>
                      {checkResult.missing_requirements.map(t => (
                        <span key={t} style={{ ...s.tech, ...s.techMissing }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI summary tabs — 📋 / 👁 / ✍ */}
                {(checkSummaries.submission_summary || checkSummaries.cv_review || (checkSummaries.cv_improvements || []).length > 0) && (
                  <div style={{ borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
                    <div style={s.sumTabsRow}>
                      {['📋 סיכום להגשה', '👁 חוות דעת', '✍ שיפורים'].map((label, i) => (
                        <button
                          key={i}
                          style={{
                            ...s.sumTabBtn,
                            background: checkActiveTab === i ? '#4f46e5' : '#1e293b',
                            color: checkActiveTab === i ? '#fff' : '#94a3b8',
                            border: checkActiveTab === i ? 'none' : '1px solid #334155',
                          }}
                          onClick={() => setCheckActiveTab(i)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div style={s.sumContent}>
                      {checkActiveTab === 0 && (checkSummaries.submission_summary || '—')}
                      {checkActiveTab === 1 && (checkSummaries.cv_review || '—')}
                      {checkActiveTab === 2 && (
                        (checkSummaries.cv_improvements || []).length > 0
                          ? <div>{(checkSummaries.cv_improvements).map((imp, i) => (
                              <div key={i} style={{ padding: '4px 0', borderBottom: i < checkSummaries.cv_improvements.length - 1 ? '1px solid #1e293b' : 'none' }}>
                                <span style={{ color: '#818cf8', fontWeight: 700 }}>{i + 1}.</span> {imp}
                              </div>
                            ))}</div>
                          : '—'
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Find jobs for this candidate ─────────────────────────────── */}
      <div style={s.findJobsSection}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            style={s.findJobsBtn}
            onClick={() => {
              if (!findJobsOpen) {
                setFindJobsOpen(true)
                if (!findJobsProgress) runFindJobs()
              } else {
                setFindJobsOpen(false)
              }
            }}
          >
            {findJobsOpen ? '▲ סגור חיפוש משרות' : '🔍 חפש משרות למועמד'}
          </button>
          {findJobsOpen && findJobsProgress?.phase === 'running' && (
            <button
              style={{ ...s.analyzeBtn, background: '#7f1d1d', fontSize: '11px', padding: '4px 10px' }}
              onClick={() => findJobsAbortRef.current?.abort()}
            >
              ✕ עצור
            </button>
          )}
          {findJobsOpen && findJobsProgress?.phase === 'done' && (
            <button
              style={{ padding: '3px 8px', background: 'transparent', border: '1px solid #334155', borderRadius: '4px', color: '#64748b', fontSize: '10px', cursor: 'pointer' }}
              onClick={() => { setFindJobsResults([]); setFindJobsProgress(null); runFindJobs() }}
            >
              🔄 הרץ מחדש
            </button>
          )}
        </div>

        {findJobsOpen && (
          <div style={{ marginTop: '10px' }}>
            {/* Progress indicators */}
            {findJobsProgress?.phase === 'connecting' && (
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>🔌 מתחבר...</div>
            )}
            {findJobsProgress?.phase === 'running' && (
              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                ⏳ מנתח {findJobsProgress.processed}/{findJobsProgress.total} משרות
                {findJobsResults.length > 0 && ` — נמצאו ${findJobsResults.length} תואמות עד כה`}
              </div>
            )}
            {findJobsProgress?.phase === 'done' && (
              <div style={{ color: '#4ade80', fontSize: '11px', marginBottom: '8px' }}>
                ✓ סריקה הושלמה — {findJobsProgress.found} משרות תואמות מתוך {findJobsProgress.total}
              </div>
            )}
            {findJobsProgress?.phase === 'error' && (
              <div style={{ color: '#f87171', fontSize: '12px' }}>✗ {findJobsProgress.msg}</div>
            )}

            {/* Job match result cards */}
            {findJobsResults.map((r, i) => (
              <JobMatchCard key={r.job_id || i} result={r} />
            ))}

            {findJobsProgress?.phase === 'done' && findJobsResults.length === 0 && (
              <div style={{ color: '#475569', fontSize: '12px' }}>לא נמצאו משרות תואמות במאגר</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
