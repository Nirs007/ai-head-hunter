import { useState, useRef } from 'react'

const DEFAULT_PATH = 'G:\\האחסון שלי\\connectech\\גיוס\\connectech civi\\ConnecTech (9)\\ConnecTech'
const SAVED_PATH_KEY = 'cv_scan_folder'

function loadSavedPath() {
  return localStorage.getItem(SAVED_PATH_KEY) || DEFAULT_PATH
}

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
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#e2e8f0',
    fontSize: '12px',
    direction: 'ltr',
    marginBottom: '10px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: '10px',
    background: 'linear-gradient(135deg, #059669, #0ea5e9)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  logBox: {
    marginTop: '12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px',
    maxHeight: '200px',
    overflowY: 'auto',
    fontSize: '11px',
    fontFamily: 'monospace',
    direction: 'ltr',
  },
  logLine: {
    padding: '2px 0',
    borderBottom: '1px solid #1e293b',
  },
}

const TYPE_COLOR = {
  start: '#94a3b8',
  processing: '#60a5fa',
  done: '#4ade80',
  duplicate: '#facc15',
  error: '#f87171',
  finished: '#818cf8',
}

export default function ScanPanel({ onScanDone }) {
  const [folder, setFolder]     = useState(loadSavedPath)
  const [editingPath, setEditingPath] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [log, setLog]           = useState([])
  const [summary, setSummary]   = useState(null)
  const logRef = useRef()

  const addLog = (entry) => {
    setLog(prev => [...prev, entry])
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
    }, 50)
  }

  const saveFolder = (path) => {
    setFolder(path)
    localStorage.setItem(SAVED_PATH_KEY, path)
  }

  const browseFolder = async () => {
    setBrowsing(true)
    try {
      const res = await fetch('/api/browse-folder')
      const data = await res.json()
      if (data.path) {
        saveFolder(data.path)
        setEditingPath(false)
      }
    } catch (e) {
      console.error('Browse error:', e)
    } finally {
      setBrowsing(false)
    }
  }

  const startScan = async () => {
    if (!folder.trim()) return
    setScanning(true)
    setLog([])
    setSummary(null)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_path: folder }),
      })

      if (!res.ok) {
        const err = await res.json()
        addLog({ type: 'error', msg: err.detail || 'שגיאה בסריקה' })
        return
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
              const msg = formatEvent(event)
              addLog({ type: event.type, msg })
              if (event.type === 'finished') {
                setSummary(event)
                onScanDone()
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      addLog({ type: 'error', msg: 'שגיאת חיבור: ' + e.message })
    } finally {
      setScanning(false)
    }
  }

  const enrichSummaries = async () => {
    setEnriching(true)
    setLog([])
    setSummary(null)
    try {
      const res = await fetch('/api/enrich-summaries', { method: 'POST' })
      if (!res.ok) { addLog({ type: 'error', msg: 'שגיאה בתרגום' }); return }

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
              const ev = JSON.parse(line.slice(6))
              if (ev.type === 'done')
                addLog({ type: 'done', msg: `✓ ${ev.name} (${ev.updated}/${ev.total})` })
              else if (ev.type === 'error')
                addLog({ type: 'error', msg: `✗ ${ev.name}: ${ev.error}` })
              else if (ev.type === 'finished')
                addLog({ type: 'finished', msg: `סיום! תורגמו ${ev.updated} סיכומים` })
            } catch {}
          }
        }
      }
    } catch (e) {
      addLog({ type: 'error', msg: 'שגיאת חיבור: ' + e.message })
    } finally {
      setEnriching(false)
    }
  }

  const formatEvent = (e) => {
    switch (e.type) {
      case 'start':      return `מצאתי ${e.files_found} קבצים (${e.already_in_db ?? 0} כבר במאגר, סורק רק חדשים...)`
      case 'processing': return `מנתח: ${e.file}`
      case 'done':       return `✓ ${e.file} → ${e.name}`
      case 'duplicate':  return `⟳ כפילות: ${e.file}${e.reason ? ` (${e.reason})` : ''}`
      case 'error':      return `✗ ${e.file}: ${e.error}`
      case 'finished':   return `סיום! חדשים: ${e.files_processed} | כבר היו: ${e.already_known ?? 0} | כפולים: ${e.duplicates_skipped} | שגיאות: ${e.errors}`
      default:           return JSON.stringify(e)
    }
  }

  // Shorten long paths for display: show last 2 segments
  const shortPath = (p) => {
    if (!p) return ''
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean)
    if (parts.length <= 2) return p
    return '...' + '\\' + parts.slice(-2).join('\\')
  }

  const reprocessHebrew = async () => {
    setReprocessing(true)
    setLog([])
    setSummary(null)
    try {
      const res = await fetch('/api/reprocess-hebrew-candidates', { method: 'POST' })
      if (!res.ok) { addLog({ type: 'error', msg: 'שגיאה בעדכון' }); return }

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
              const ev = JSON.parse(line.slice(6))
              if (ev.type === 'start')
                addLog({ type: 'start', msg: `מתחיל לעבד ${ev.total} מועמדים...` })
              else if (ev.type === 'done')
                addLog({ type: 'done', msg: `✓ ${ev.name} (${ev.updated}/${ev.total})` })
              else if (ev.type === 'skip')
                addLog({ type: 'duplicate', msg: `→ דילוג ${ev.name}: ${ev.reason}` })
              else if (ev.type === 'error')
                addLog({ type: 'error', msg: `✗ ${ev.name}: ${ev.reason}` })
              else if (ev.type === 'finished')
                addLog({ type: 'finished', msg: `סיום! עודכנו ${ev.updated} מועמדים עבריים, דולגו ${ev.skipped}` })
            } catch {}
          }
        }
      }
    } catch (e) {
      addLog({ type: 'error', msg: 'שגיאת חיבור: ' + e.message })
    } finally {
      setReprocessing(false)
    }
  }

  const busy = scanning || enriching || browsing || reprocessing

  return (
    <div style={s.panel}>
      <div style={s.title}>🔍 סריקת תיקיית קורות חיים</div>

      {/* Folder path row */}
      {editingPath ? (
        <div style={{ marginBottom: '10px' }}>
          <input
            style={s.input}
            value={folder}
            onChange={e => setFolder(e.target.value)}
            onBlur={() => { localStorage.setItem(SAVED_PATH_KEY, folder); setEditingPath(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { localStorage.setItem(SAVED_PATH_KEY, folder); setEditingPath(false) } }}
            placeholder="נתיב לתיקיית קורות חיים"
            autoFocus
            disabled={busy}
          />
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          marginBottom: '10px', background: '#0f172a',
          border: '1px solid #334155', borderRadius: '8px', padding: '8px 10px',
        }}>
          <span style={{
            flex: 1, color: '#94a3b8', fontSize: '11px',
            direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={folder}>
            📁 {shortPath(folder)}
          </span>
          <button
            onClick={browseFolder}
            disabled={busy}
            title="בחר תיקייה מהמחשב"
            style={{
              padding: '4px 10px', background: browsing ? '#334155' : '#1e3a5f',
              border: '1px solid #0ea5e9', borderRadius: '6px', color: '#7dd3fc',
              fontSize: '11px', cursor: busy ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {browsing ? '⏳' : '📂 שנה'}
          </button>
          <button
            onClick={() => setEditingPath(true)}
            disabled={busy}
            title="הקלד נתיב ידנית"
            style={{
              padding: '4px 8px', background: '#1e293b',
              border: '1px solid #475569', borderRadius: '6px', color: '#94a3b8',
              fontSize: '11px', cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            ✏️
          </button>
        </div>
      )}

      <button
        style={{ ...s.btn, opacity: busy ? 0.6 : 1 }}
        onClick={startScan}
        disabled={busy}
      >
        {scanning ? 'סורק...' : 'התחל סריקה'}
      </button>

      <button
        style={{
          ...s.btn, marginTop: '8px', opacity: busy ? 0.6 : 1,
          background: 'linear-gradient(135deg, #7c3aed, #0e7490)',
          fontSize: '12px', padding: '8px',
        }}
        onClick={enrichSummaries}
        disabled={busy}
        title="מתרגם סיכומים אנגליים לעברית עבור מועמדים קיימים"
      >
        {enriching ? '⏳ מתרגם סיכומים...' : '🌐 תרגם סיכומים לעברית'}
      </button>

      <button
        style={{
          ...s.btn, marginTop: '8px', opacity: busy ? 0.6 : 1,
          background: 'linear-gradient(135deg, #065f46, #0891b2)',
          fontSize: '12px', padding: '8px',
        }}
        onClick={reprocessHebrew}
        disabled={busy}
        title="מזהה ועורך מחדש מועמדים שנסרקו מקורות חיים בעברית — שומר תפקידים ושמות בעברית"
      >
        {reprocessing ? '⏳ מעבד מועמדים עבריים...' : '🔄 עדכן מועמדים בעברית'}
      </button>

      {log.length > 0 && (
        <div style={s.logBox} ref={logRef}>
          {log.map((l, i) => (
            <div key={i} style={{ ...s.logLine, color: TYPE_COLOR[l.type] || '#94a3b8' }}>
              {l.msg}
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div style={{ marginTop: '10px', padding: '10px', background: '#14532d22', border: '1px solid #166534', borderRadius: '8px', fontSize: '12px', color: '#4ade80' }}>
          עובדו: {summary.files_processed} | כפולים: {summary.duplicates_skipped} | שגיאות: {summary.errors}
        </div>
      )}
    </div>
  )
}
