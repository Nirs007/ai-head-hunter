import { useState, useRef } from 'react'

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
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  desc: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  dropZone: {
    border: '2px dashed #334155',
    borderRadius: '10px',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#64748b',
    fontSize: '13px',
  },
  dropZoneActive: {
    borderColor: '#38bdf8',
    background: '#0ea5e920',
    color: '#38bdf8',
  },
  btn: {
    width: '100%',
    padding: '10px',
    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
    transition: 'opacity 0.2s',
  },
  result: {
    marginTop: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
  },
  success: { background: '#14532d', color: '#4ade80' },
  error: { background: '#450a0a', color: '#f87171' },
}

export default function ImportPanel({ onImported }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (f && f.name.endsWith('.xlsx')) {
      setFile(f)
      setResult(null)
    } else {
      alert('יש לבחור קובץ Excel מסוג .xlsx')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/import-excel', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'שגיאה')
      setResult({ ok: true, msg: data.message })
      onImported()
    } catch (e) {
      setResult({ ok: false, msg: 'שגיאה: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.panel}>
      <div style={s.title}>📥 ייבוא ממאגר קיים</div>
      <div style={s.desc}>
        יבא את קובץ ה-Excel שנוצר על ידי הסקריפט הקיים
        (<code style={{ color: '#94a3b8' }}>AI_CV_Database_Summary.xlsx</code>).
        הנתונים יוכנסו לבסיס הנתונים ויהיו מוכנים לחיפוש.
      </div>

      <div
        style={{ ...s.dropZone, ...(drag ? s.dropZoneActive : {}) }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        {file
          ? <span style={{ color: '#38bdf8', fontWeight: 600 }}>📄 {file.name}</span>
          : <>📂 גרור קובץ Excel לכאן<br /><span style={{ fontSize: '11px' }}>או לחץ לבחירה</span></>
        }
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      <button
        style={{ ...s.btn, opacity: (!file || loading) ? 0.5 : 1 }}
        onClick={handleImport}
        disabled={!file || loading}
      >
        {loading ? 'מייבא...' : 'ייבא מועמדים'}
      </button>

      {result && (
        <div style={{ ...s.result, ...(result.ok ? s.success : s.error) }}>
          {result.msg}
        </div>
      )}
    </div>
  )
}
