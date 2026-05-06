import { useState, useRef } from 'react'

const s = {
  wrap:  { display: 'flex', flexDirection: 'column', gap: '12px' },
  dropZone: {
    border: '2px dashed #334155', borderRadius: '10px', padding: '28px 16px',
    textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
    color: '#64748b', fontSize: '13px',
  },
  dropZoneActive: { borderColor: '#38bdf8', background: '#0f2030' },
  dropIcon: { fontSize: '28px', marginBottom: '6px' },
  orLine: {
    display: 'flex', alignItems: 'center', gap: '8px',
    color: '#334155', fontSize: '11px',
  },
  divider: { flex: 1, height: '1px', background: '#334155' },
  label: { fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '4px' },
  input: {
    width: '100%', background: '#1e293b', border: '1px solid #334155',
    borderRadius: '6px', color: '#e2e8f0', fontSize: '12px',
    padding: '8px 10px', outline: 'none', boxSizing: 'border-box',
  },
  addBtn: {
    padding: '8px 16px', background: 'linear-gradient(135deg, #0e7490, #1d4ed8)',
    border: 'none', borderRadius: '7px', color: '#fff', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', width: '100%',
  },
  result: {
    borderRadius: '10px', padding: '12px 14px', fontSize: '12px',
    border: '1px solid',
  },
  techPill: {
    display: 'inline-block', background: '#1d4ed8', color: '#bfdbfe',
    borderRadius: '4px', padding: '2px 7px', fontSize: '11px', margin: '2px',
  },
}

function ResultCard({ candidate }) {
  const techs = candidate.technologies || []
  return (
    <div style={{ ...s.result, borderColor: '#166534', background: '#14532d22', color: '#4ade80' }}>
      <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>✅ נוסף למאגר</div>
      <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{candidate.name}</div>
      {candidate.current_role && <div style={{ color: '#94a3b8', fontSize: '11px' }}>{candidate.current_role}</div>}
      {candidate.total_experience_years > 0 && (
        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
          {candidate.total_experience_years} שנות ניסיון
          {candidate.management_experience ? ' · ניסיון ניהולי' : ''}
        </div>
      )}
      {techs.length > 0 && (
        <div style={{ marginTop: '6px' }}>
          {techs.slice(0, 8).map(t => <span key={t} style={s.techPill}>{t}</span>)}
          {techs.length > 8 && <span style={{ color: '#64748b', fontSize: '11px' }}> +{techs.length - 8}</span>}
        </div>
      )}
    </div>
  )
}

export default function AddCVPanel({ onAdded }) {
  const [dragging, setDragging]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [pathInput, setPathInput] = useState('')
  const [result, setResult]       = useState(null)   // { ok, candidate, error }
  const fileInputRef = useRef(null)

  const reset = () => setResult(null)

  const processFile = async (file) => {
    if (!file) return
    setLoading(true)
    setResult(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('/api/upload-cv', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, error: data.detail || 'שגיאה' })
      } else {
        setResult({ ok: true, candidate: data.candidate })
        onAdded?.()
      }
    } catch (e) {
      setResult({ ok: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  const processPath = async () => {
    const src = pathInput.trim()
    if (!src) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/add-cv-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path_or_url: src }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, error: data.detail || 'שגיאה' })
      } else {
        setResult({ ok: true, candidate: data.candidate })
        setPathInput('')
        onAdded?.()
      }
    } catch (e) {
      setResult({ ok: false, error: e.message })
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  return (
    <div style={s.wrap}>
      {/* Drop zone */}
      <div
        style={{ ...s.dropZone, ...(dragging ? s.dropZoneActive : {}) }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={s.dropIcon}>📄</div>
        <div>גרור קובץ PDF / DOCX לכאן</div>
        <div style={{ fontSize: '11px', marginTop: '4px', color: '#475569' }}>או לחץ לבחירת קובץ</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          style={{ display: 'none' }}
          onChange={e => processFile(e.target.files[0])}
        />
      </div>

      {/* Or divider */}
      <div style={s.orLine}>
        <div style={s.divider} />
        <span>או</span>
        <div style={s.divider} />
      </div>

      {/* Path / URL input */}
      <div>
        <div style={s.label}>נתיב מקומי או קישור Google Drive ציבורי</div>
        <input
          style={s.input}
          value={pathInput}
          placeholder={'G:\\folder\\cv.pdf  או  https://drive.google.com/file/d/...'}
          onChange={e => { setPathInput(e.target.value); reset() }}
          onKeyDown={e => e.key === 'Enter' && processPath()}
          dir="ltr"
        />
        <div style={{ fontSize: '10px', color: '#475569', marginTop: '3px' }}>
          קישור Drive חייב להיות שותף ציבורית (כל מי שיש לו הקישור)
        </div>
      </div>

      <button
        style={{ ...s.addBtn, opacity: loading ? 0.6 : 1 }}
        disabled={loading || (!pathInput.trim())}
        onClick={processPath}
      >
        {loading ? '⏳ מעבד...' : '➕ הוסף מועמד'}
      </button>

      {/* Result */}
      {result && result.ok && <ResultCard candidate={result.candidate} />}
      {result && !result.ok && (
        <div style={{ ...s.result, borderColor: '#7f1d1d', background: '#450a0a22', color: '#f87171' }}>
          ✗ {result.error}
        </div>
      )}
    </div>
  )
}
