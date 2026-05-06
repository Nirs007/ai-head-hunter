import { useState, useRef } from 'react'

// ── Autocomplete suggestions for technology / role-type tag inputs ──────────
const TECH_SUGGESTIONS = [
  // Role types — Account Management / Sales
  'Account Manager', 'Key Account Manager', 'Sales Manager', 'Sales Representative',
  'Customer Success Manager', 'מנהל תיקי לקוחות', 'מנהל תיקי',
  // Role types — Tech
  'System Analyst', 'Business Analyst', 'Functional Analyst',
  'QA Engineer', 'QA Automation', 'SDET', 'DevOps Engineer', 'SRE',
  'Full Stack Developer', 'Backend Developer', 'Frontend Developer',
  'Data Scientist', 'Data Engineer', 'ML Engineer',
  'UX Designer', 'Product Manager', 'Scrum Master',
  'CRM Consultant', 'ERP Consultant', 'Solutions Architect', 'Cloud Architect',
  'Team Lead', 'R&D Manager',
  // Technologies — Languages & Frameworks
  'Python', 'JavaScript', 'TypeScript', 'Java', 'C#', 'C++', 'Go', 'Rust',
  'React', 'Angular', 'Vue', 'Node.js', 'Next.js', 'Django', 'FastAPI', 'Flask',
  'Spring Boot', '.NET', 'ASP.NET',
  // Technologies — Cloud & DevOps
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD',
  'Jenkins', 'GitHub Actions', 'Linux',
  // Technologies — Data
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Spark', 'Kafka', 'Airflow', 'dbt', 'Power BI', 'Tableau',
  // Technologies — CRM / ERP
  'Salesforce', 'Dynamics 365', 'Dynamics CRM', 'SAP', 'HubSpot',
  'Zendesk', 'Monday.com', 'Jira', 'Confluence',
  // Other
  'REST API', 'GraphQL', 'Microservices', 'Agile', 'Scrum',
]

const s = {
  panel: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '20px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#f1f5f9',
    marginBottom: '16px',
  },
  field: { marginBottom: '14px' },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '5px',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '7px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    transition: 'border 0.2s',
  },
  row: { display: 'flex', gap: '10px' },
  sliderWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  slider: { flex: 1, accentColor: '#38bdf8' },
  sliderVal: {
    color: '#38bdf8',
    fontWeight: 700,
    fontSize: '14px',
    minWidth: '38px',
  },
  tagInput: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '7px',
    minHeight: '40px',
    cursor: 'text',
  },
  tag: {
    background: '#1d4ed8',
    color: '#bfdbfe',
    borderRadius: '5px',
    padding: '2px 8px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  tagX: {
    cursor: 'pointer',
    color: '#93c5fd',
    fontWeight: 700,
    lineHeight: 1,
  },
  tagInputField: {
    border: 'none',
    background: 'transparent',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    minWidth: '80px',
    flex: 1,
  },
  suggestBox: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 50,
    background: '#1e293b',
    border: '1px solid #475569',
    borderRadius: '7px',
    marginTop: '3px',
    maxHeight: '200px',
    overflowY: 'auto',
    boxShadow: '0 4px 16px #00000055',
  },
  suggestItem: {
    padding: '7px 12px',
    fontSize: '13px',
    color: '#e2e8f0',
    cursor: 'pointer',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
  },
  checkbox: { accentColor: '#38bdf8', width: '16px', height: '16px' },
  submitBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'opacity 0.2s',
    letterSpacing: '0.3px',
  },
  divider: {
    borderTop: '1px solid #334155',
    margin: '16px 0',
  },
}

function TagInput({ tags, onChange, placeholder }) {
  const [val, setVal]           = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [hiIdx, setHiIdx]       = useState(-1)
  const wrapRef = useRef(null)

  const add = (text) => {
    const raw = text !== undefined ? text : val
    const newTags = raw.split(',').map(t => t.trim()).filter(Boolean)
    if (newTags.length) {
      onChange([...tags, ...newTags.filter(t => !tags.includes(t))])
      setVal('')
      setSuggestions([])
      setHiIdx(-1)
    }
  }

  const remove = (t) => onChange(tags.filter(x => x !== t))

  const handleChange = (e) => {
    const v = e.target.value
    setVal(v)
    setHiIdx(-1)
    if (v.trim().length >= 1) {
      const q = v.toLowerCase()
      const matches = TECH_SUGGESTIONS.filter(sg =>
        sg.toLowerCase().includes(q) && !tags.includes(sg)
      ).slice(0, 8)
      setSuggestions(matches)
    } else {
      setSuggestions([])
    }
  }

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHiIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHiIdx(i => Math.max(i - 1, -1)); return }
      if (e.key === 'Escape')    { setSuggestions([]); setHiIdx(-1); return }
      if ((e.key === 'Enter' || e.key === 'Tab') && hiIdx >= 0) {
        e.preventDefault()
        add(suggestions[hiIdx])
        return
      }
    }
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !val && tags.length) remove(tags[tags.length - 1])
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={s.tagInput} onClick={() => wrapRef.current?.querySelector('input')?.focus()}>
        {tags.map(t => (
          <span key={t} style={s.tag}>
            {t}
            <span style={s.tagX} onClick={() => remove(t)}>×</span>
          </span>
        ))}
        <input
          style={s.tagInputField}
          value={val}
          placeholder={tags.length === 0 ? placeholder : ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        />
      </div>
      {suggestions.length > 0 && (
        <div style={s.suggestBox}>
          {suggestions.map((sug, i) => (
            <div
              key={sug}
              style={{ ...s.suggestItem, background: i === hiIdx ? '#334155' : 'transparent' }}
              onMouseDown={() => add(sug)}
              onMouseEnter={() => setHiIdx(i)}
            >
              {sug}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ORG_TYPES = ['', 'לקוח קצה', 'אינטגרטור', 'ספק', 'פיננסי', 'ממשלתי', 'סטארטאפ', 'אנטרפרייז']
const HYBRID_MODES = ['', 'משרדי', 'היברידי', 'מרחוק']

const DEFAULT = {
  role_title: '',
  min_experience_years: 3,
  required_technologies: [],
  nice_to_have: [],
  management_required: false,
  location: '',
  domain: '',
  org_type: '',
  salary_range: '',
  hybrid_mode: '',
  vendor_experience_required: false,
  additional_notes: '',
}

function similarTitles(a, b) {
  const norm = s => s.toLowerCase().replace(/[^\w\s]/g, '').trim()
  const na = norm(a), nb = norm(b)
  if (na === nb) return true
  const wa = na.split(/\s+/).filter(Boolean)
  const wb = nb.split(/\s+/).filter(Boolean)
  const common = wa.filter(w => wb.includes(w))
  return common.length / Math.max(wa.length, wb.length) >= 0.5
}

function techOverlap(techsA, techsB) {
  if (!techsA?.length || !techsB?.length) return false
  const la = techsA.map(t => t.toLowerCase())
  const lb = techsB.map(t => t.toLowerCase())
  const common = la.filter(t => lb.includes(t))
  return common.length >= 2
}

export default function JobForm({ onSearch, onSaved, disabled, topN, minPct, onTopNChange, onMinPctChange }) {
  const [form, setForm] = useState(DEFAULT)
  const [jobUrl, setJobUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dupWarning, setDupWarning] = useState(null) // { id, title } of similar existing job
  const [savedRef, setSavedRef] = useState(null)  // reference number shown after save

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const analyzeUrl = async () => {
    if (!jobUrl.trim()) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-job-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert('שגיאה: ' + (err.detail || 'לא ניתן לנתח את הכתובת'))
        return
      }
      const data = await res.json()
      setForm(f => ({
        ...f,
        role_title: data.role_title || f.role_title,
        min_experience_years: data.min_experience_years ?? f.min_experience_years,
        required_technologies: data.required_technologies?.length ? data.required_technologies : f.required_technologies,
        nice_to_have: data.nice_to_have?.length ? data.nice_to_have : f.nice_to_have,
        management_required: data.management_required ?? f.management_required,
        location: data.location || f.location,
        domain: data.domain || f.domain,
        org_type: data.org_type || f.org_type,
        salary_range: data.salary_range || f.salary_range,
        hybrid_mode: data.hybrid_mode || f.hybrid_mode,
        vendor_experience_required: data.vendor_experience_required ?? f.vendor_experience_required,
        additional_notes: data.additional_notes || f.additional_notes,
      }))
    } catch (e) {
      alert('שגיאת חיבור: ' + e.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const doSave = async () => {
    setDupWarning(null)
    setSaving(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_requirements: form }),
      })
      const data = await res.json()
      setSavedRef(data.reference_number || null)
      setForm(DEFAULT)  // clear form after successful save
      setJobUrl('')
      onSaved && onSaved(data)
    } catch (e) {
      alert('שגיאה בשמירה: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.role_title.trim()) { alert('יש להזין שם תפקיד'); return }
    setSavedRef(null)
    // Check for duplicate jobs before saving (title similarity AND tech overlap)
    try {
      const res = await fetch('/api/jobs')
      if (res.ok) {
        const jobs = await res.json()
        const newTitle = form.role_title.trim()
        const newTechs = form.required_technologies || []
        const dup = jobs.find(j => {
          const jTitle = j.title || j.requirements?.role_title || ''
          const jTechs = j.requirements?.required_technologies || []
          return similarTitles(jTitle, newTitle) && (newTechs.length === 0 || jTechs.length === 0 || techOverlap(newTechs, jTechs))
        })
        if (dup) {
          setDupWarning({ id: dup.id, title: dup.title || dup.requirements?.role_title })
          return
        }
      }
    } catch (_) { /* if fetch fails, proceed with save */ }
    doSave()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.role_title.trim()) { alert('יש להזין שם תפקיד'); return }
    onSearch && onSearch(form, topN, minPct)
  }

  return (
    <div style={s.panel}>
      <div style={s.title}>💼 דרישות משרה</div>

      {/* URL ניתוח אוטומטי */}
      <div style={{ marginBottom: '16px', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #1d4ed8' }}>
        <div style={{ fontSize: '12px', color: '#60a5fa', marginBottom: '6px', fontWeight: 600 }}>
          🔗 מלא אוטומטית מלינק משרה
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            style={{ ...s.input, flex: 1, marginBottom: 0, direction: 'ltr', fontSize: '11px' }}
            value={jobUrl}
            onChange={e => setJobUrl(e.target.value)}
            placeholder="https://www.linkedin.com/jobs/..."
            disabled={analyzing}
          />
          <button
            type="button"
            onClick={analyzeUrl}
            disabled={analyzing || !jobUrl.trim()}
            style={{
              padding: '8px 12px',
              background: analyzing ? '#334155' : '#1d4ed8',
              border: 'none',
              borderRadius: '7px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: analyzing ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {analyzing ? '⏳ מנתח...' : 'נתח'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        <div style={s.field}>
          <label style={s.label}>תפקיד *</label>
          <input style={s.input} value={form.role_title}
            onChange={e => set('role_title', e.target.value)}
            placeholder="למשל: Backend Developer, DevOps Engineer" />
        </div>

        <div style={s.row}>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>ניסיון מינימלי (שנים)</label>
            <input style={s.input} type="number" min={0} max={30} value={form.min_experience_years}
              onChange={e => set('min_experience_years', parseFloat(e.target.value) || 0)} />
          </div>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>מיקום</label>
            <input style={s.input} value={form.location}
              onChange={e => set('location', e.target.value)} placeholder="תל אביב, רמת גן..." />
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>טכנולוגיות נדרשות (Enter או פסיק להוסיף)</label>
          <TagInput
            tags={form.required_technologies}
            onChange={v => set('required_technologies', v)}
            placeholder="Python, React, AWS..."
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>טכנולוגיות רצויות (יתרון)</label>
          <TagInput
            tags={form.nice_to_have}
            onChange={v => set('nice_to_have', v)}
            placeholder="Kubernetes, Redis..."
          />
        </div>

        <div style={s.row}>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>תחום / דומיין</label>
            <input style={s.input} value={form.domain}
              onChange={e => set('domain', e.target.value)} placeholder="FinTech, Healthcare..." />
          </div>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>סוג ארגון</label>
            <select style={{ ...s.input, cursor: 'pointer' }} value={form.org_type}
              onChange={e => set('org_type', e.target.value)}>
              {ORG_TYPES.map(o => <option key={o} value={o}>{o || '— לא צוין —'}</option>)}
            </select>
          </div>
        </div>

        <div style={s.row}>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>טווח שכר</label>
            <input style={s.input} value={form.salary_range}
              onChange={e => set('salary_range', e.target.value)} placeholder="25-35K + רכב..." />
          </div>
          <div style={{ ...s.field, flex: 1 }}>
            <label style={s.label}>מצב עבודה</label>
            <select style={{ ...s.input, cursor: 'pointer' }} value={form.hybrid_mode}
              onChange={e => set('hybrid_mode', e.target.value)}>
              {HYBRID_MODES.map(m => <option key={m} value={m}>{m || '— לא צוין —'}</option>)}
            </select>
          </div>
        </div>

        <div style={s.row}>
          <div style={{ ...s.field, flex: 1, display: 'flex', alignItems: 'center' }}>
            <label style={{ ...s.checkRow, marginTop: '18px' }}>
              <input type="checkbox" style={s.checkbox}
                checked={form.management_required}
                onChange={e => set('management_required', e.target.checked)} />
              נדרש ניסיון ניהולי
            </label>
          </div>
          <div style={{ ...s.field, flex: 1, display: 'flex', alignItems: 'center' }}>
            <label style={{ ...s.checkRow, marginTop: '18px' }}>
              <input type="checkbox" style={s.checkbox}
                checked={form.vendor_experience_required}
                onChange={e => set('vendor_experience_required', e.target.checked)} />
              נדרש ניסיון צד ספק / אינטגרטור
            </label>
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>הערות נוספות / דגשים סמויים</label>
          <input style={s.input} value={form.additional_notes}
            onChange={e => set('additional_notes', e.target.value)}
            placeholder="מה באמת חשוב למנהל המגייס, דגשים לא רשמיים..." />
        </div>

        <div style={s.divider} />

        <div style={s.field}>
          <label style={s.label}>מספר תוצאות</label>
          <div style={s.sliderWrap}>
            <input type="range" style={s.slider} min={1} max={30} value={topN}
              onChange={e => onTopNChange(+e.target.value)} />
            <span style={s.sliderVal}>{topN}</span>
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>אחוז התאמה מינימלי</label>
          <div style={s.sliderWrap}>
            <input type="range" style={s.slider} min={20} max={95} step={5} value={minPct}
              onChange={e => onMinPctChange(+e.target.value)} />
            <span style={s.sliderVal}>{minPct}%</span>
          </div>
        </div>

        {savedRef && (
          <div style={{
            background: '#0a2218', border: '1px solid #166534',
            borderRadius: '8px', padding: '10px 14px',
            marginBottom: '10px', fontSize: '13px', color: '#4ade80', lineHeight: 1.5,
          }}>
            ✅ המשרה נשמרה בהצלחה &nbsp;·&nbsp; מספר פניה: <strong>{savedRef}</strong>
          </div>
        )}

        {dupWarning && (
          <div style={{
            background: '#422006',
            border: '1px solid #d97706',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '10px',
            fontSize: '13px',
            color: '#fde68a',
            lineHeight: 1.5,
          }}>
            <div style={{ marginBottom: '10px' }}>
              ⚠ שים לב — זו עלולה להיות משרה כפולה. דומה למשרה: <strong>"{dupWarning.title}"</strong>. האם לשמור בכל זאת?
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={doSave}
                style={{
                  padding: '6px 14px',
                  background: '#b45309',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                כן, שמור בכל זאת
              </button>
              <button
                type="button"
                onClick={() => setDupWarning(null)}
                style={{
                  padding: '6px 14px',
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ביטול
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || saving}
          style={{ ...s.submitBtn, opacity: (disabled || saving) ? 0.5 : 1, background: 'linear-gradient(135deg, #059669, #0284c7)' }}
        >
          {saving ? '⏳ שומר...' : '💾 שמור משרה'}
        </button>
      </form>
    </div>
  )
}
