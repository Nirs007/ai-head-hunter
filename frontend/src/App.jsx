import { useState, useEffect, useCallback } from 'react'
import Login from './Login.jsx'
import ResetPassword from './ResetPassword.jsx'
import ScanPanel from './components/ScanPanel.jsx'
import JobForm from './components/JobForm.jsx'
import ImportPanel from './components/ImportPanel.jsx'
import CandidatesView from './components/CandidatesView.jsx'
import JobsPanel from './components/JobsPanel.jsx'
import AddCVPanel from './components/AddCVPanel.jsx'
import RemindersView from './components/RemindersView.jsx'
import UsersView from './components/UsersView.jsx'
import SubmissionBuilder from './components/SubmissionBuilder.jsx'
import { ScanProvider, useScanContext } from './context/ScanContext.jsx'

// persist a single value to localStorage
function usePersist(key, defaultVal) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : defaultVal
    } catch { return defaultVal }
  })
  const setPersist = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])
  return [val, setPersist]
}

const st = {
  app: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
  header: {
    background: 'rgba(15,23,42,0.95)',
    borderBottom: '1px solid #334155',
    padding: '14px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(10px)',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  statBadge: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '5px 12px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  statNum: { color: '#38bdf8', fontWeight: 700, marginRight: '4px' },
  connDot: {
    width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', marginLeft: '6px',
  },
  layout: {
    maxWidth: '1500px',
    margin: '0 auto',
    padding: '28px 20px',
    display: 'grid',
    gridTemplateColumns: '360px 1fr',
    gap: '24px',
    alignItems: 'start',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'sticky',
    top: '70px',
    maxHeight: 'calc(100vh - 90px)',
    overflowY: 'auto',
    paddingBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '3px',
    background: '#1e293b',
    borderRadius: '10px',
    padding: '3px',
    border: '1px solid #334155',
  },
  tab: {
    flex: 1,
    padding: '7px 10px',
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  mainTabs: {
    display: 'flex',
    gap: '3px',
    background: '#1e293b',
    borderRadius: '10px',
    padding: '3px',
    border: '1px solid #334155',
    marginBottom: '20px',
    width: 'fit-content',
  },
  mainTab: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: '7px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
}

// Floating banner shown when a scan is running — visible from any tab
function ScanBanner({ onGoToJobs }) {
  const { scans, cancelScan } = useScanContext()
  const running = Object.entries(scans).filter(([, sc]) => sc.matching || sc.quickMatching)
  if (running.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px',
      background: '#0d1b2e', border: '1px solid #2d4d6e',
      borderRadius: '12px', padding: '12px 16px',
      boxShadow: '0 6px 32px rgba(0,0,0,0.6)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px',
      minWidth: '260px', maxWidth: '340px',
    }}>
      <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, letterSpacing: '0.5px' }}>
        סריקות פעילות ברקע
      </div>
      {running.map(([jobId, sc]) => (
        <div key={jobId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '13px', height: '13px', border: '2px solid #334155',
            borderTop: '2px solid #38bdf8', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sc.quickMatching ? '⚡' : '🔎'} {sc.jobTitle || `משרה ${jobId}`}
            </div>
            {sc.matchProgress?.phase === 'running' && sc.matchProgress.totalBatches > 0 && (
              <div style={{ height: '3px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
                  width: `${Math.round((sc.matchProgress.batchNum / sc.matchProgress.totalBatches) * 100)}%`,
                  transition: 'width 0.4s ease', borderRadius: '2px',
                }} />
              </div>
            )}
            {sc.matchProgress?.phase === 'running' && sc.matchProgress.processed > 0 && (
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                {sc.matchProgress.processed}/{sc.matchProgress.checkedCandidates} מועמדים
              </div>
            )}
          </div>
          <button
            onClick={() => cancelScan(+jobId)}
            title="בטל סריקה"
            style={{
              padding: '3px 8px', background: '#450a0a', border: '1px solid #7f1d1d',
              borderRadius: '5px', color: '#f87171', fontSize: '11px', cursor: 'pointer', flexShrink: 0,
            }}
          >✕</button>
        </div>
      ))}
      <button
        onClick={onGoToJobs}
        style={{
          padding: '6px 12px', background: '#1e3a5f', border: '1px solid #1d4ed8',
          borderRadius: '7px', color: '#60a5fa', fontSize: '12px', fontWeight: 600,
          cursor: 'pointer', textAlign: 'center',
        }}
      >
        📋 עבור למשרות לצפייה בתוצאות
      </button>
    </div>
  )
}

export default function App() {
  const [authUser, setAuthUser]           = useState(undefined)  // undefined=checking, null=not logged in, obj=logged in
  const [stats, setStats]               = useState(() => {
    try { return JSON.parse(localStorage.getItem('stats_cache') || '{"total_candidates":0}') }
    catch { return { total_candidates: 0 } }
  })
  const [allCandidates, setAllCandidates] = useState([])
  const [connected, setConnected]         = useState(null)   // null=loading, true, false
  const [jobsKey, setJobsKey]             = useState(0)

  // persisted UI state
  const [sideTab,   setSideTab]   = usePersist('sideTab',   'import')
  const [mainTab,   setMainTab]   = usePersist('mainTab',   'jobs')
  const [topN,      setTopN]      = usePersist('topN',      10)
  const [minPct,    setMinPct]    = usePersist('minPct',    60)
  const [lightMode, setLightMode] = usePersist('lightMode', false)

  const [dueCount, setDueCount] = useState(0)

  // Check auth on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(user => setAuthUser(user))
      .catch(() => setAuthUser(null))
  }, [])

  // Poll for due reminders every 60 s — show browser notification + badge
  useEffect(() => {
    const check = async () => {
      try {
        const data = await fetch('/api/reminders/due').then(r => r.json())
        setDueCount(data.length)
        if (data.length === 0) return
        if (Notification.permission === 'granted') {
          for (const r of data) {
            new Notification(`🔔 ${r.title}`, {
              body: r.description || (r.candidate_name ? `מועמד: ${r.candidate_name}` : ''),
              icon: '/favicon.ico',
            })
            // Auto-dismiss so it doesn't fire again next poll
            await fetch(`/api/reminders/${r.id}/dismiss`, { method: 'PATCH' })
          }
          setDueCount(0)
        } else if (Notification.permission === 'default') {
          Notification.requestPermission()
        }
      } catch { /* server down — ignore */ }
    }
    check()
    const t = setInterval(check, 60_000)
    return () => clearInterval(t)
  }, [])

  const loadStats = useCallback(() =>
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        setStats(data)
        setConnected(true)
        try { localStorage.setItem('stats_cache', JSON.stringify(data)) } catch {}
      })
      .catch(() => setConnected(false))
  , [])

  const loadCandidates = useCallback(() =>
    fetch('/api/candidates')
      .then(r => r.json())
      .then(setAllCandidates)
      .catch(() => {})
  , [])

  // load on mount
  useEffect(() => {
    loadStats()
    loadCandidates()
    const t = setInterval(loadStats, 15000)
    return () => clearInterval(t)
  }, [loadStats, loadCandidates])

  // refresh candidates when switching to that tab
  useEffect(() => {
    if (mainTab === 'candidates') loadCandidates()
  }, [mainTab, loadCandidates])

  const handleJobSaved = () => {
    setJobsKey(k => k + 1)
    setMainTab('jobs')
  }

  const handleScanDone = () => {
    loadStats()
    loadCandidates()
  }

  const handleImported = () => {
    loadStats()
    loadCandidates()
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setAuthUser(null)
  }

  // Auth gate
  const resetToken = new URLSearchParams(window.location.search).get('token')
  if (window.location.pathname === '/reset-password' && resetToken) {
    return <ResetPassword token={resetToken} />
  }
  if (authUser === undefined) return null  // still checking
  if (authUser === null) return <Login onLogin={setAuthUser} />

  return (
    <ScanProvider>
    <div style={{ ...st.app, filter: lightMode ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .candidate-card { animation: fadeIn 0.25s ease forwards; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>

      <header style={st.header}>
        <div style={st.logo}>🎯 AI Head Hunter</div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>👤 {authUser?.name}</span>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: '1px solid #334155', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', color: '#94a3b8' }}
          >יציאה</button>
          <button
            onClick={() => setLightMode(m => !m)}
            title={lightMode ? 'עבור למצב כהה' : 'עבור למצב בהיר'}
            style={{
              background: 'none', border: '1px solid #334155',
              borderRadius: '8px', padding: '5px 10px',
              cursor: 'pointer', fontSize: '16px', lineHeight: 1,
              // counter-filter keeps the button visually neutral in both modes
              filter: lightMode ? 'invert(1) hue-rotate(180deg)' : 'none',
            }}
          >{lightMode ? '🌙' : '☀️'}</button>
          <div style={st.statBadge}>
            <span style={st.statNum}>{stats.total_candidates}</span>מועמדים במאגר
          </div>
          {stats.last_scan && (
            <div style={st.statBadge}>
              סריקה: <span style={st.statNum}>
                {new Date(stats.last_scan.finished_at).toLocaleDateString('he-IL')}
              </span>
            </div>
          )}
          <div style={{
            ...st.statBadge,
            borderColor: connected === false ? '#7f1d1d' : connected ? '#14532d' : '#334155',
            color: connected === false ? '#f87171' : connected ? '#4ade80' : '#64748b',
          }}>
            <span style={{
              ...st.connDot,
              background: connected === false ? '#f87171' : connected ? '#4ade80' : '#64748b',
            }} />
            {connected === false ? 'שרת לא מחובר' : connected ? 'מחובר' : 'מתחבר...'}
          </div>
        </div>
      </header>

      <div style={st.layout}>
        {/* Sidebar */}
        <div style={st.sidebar}>
          <div style={st.tabs}>
            {[
              { key: 'import', label: '📥 Excel' },
              { key: 'scan',   label: '🔍 סריקה' },
              { key: 'add',    label: '📎 הוסף' },
            ].map(t => (
              <button key={t.key} style={{
                ...st.tab,
                background: sideTab === t.key ? '#38bdf8' : 'transparent',
                color: sideTab === t.key ? '#0f172a' : '#94a3b8',
              }} onClick={() => setSideTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {sideTab === 'import' && <ImportPanel onImported={handleImported} />}
          {sideTab === 'scan'   && <ScanPanel onScanDone={handleScanDone} />}
          {sideTab === 'add'    && <AddCVPanel onAdded={handleImported} />}

          <JobForm
            disabled={stats.total_candidates === 0}
            topN={topN}
            minPct={minPct}
            onTopNChange={setTopN}
            onMinPctChange={setMinPct}
            onSaved={handleJobSaved}
          />
        </div>

        {/* Main content */}
        <div>
          {connected === false && (
            <div style={{
              background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '10px',
              padding: '12px 18px', marginBottom: '16px', fontSize: '13px', color: '#fca5a5',
            }}>
              ⚠ השרת אינו פעיל. הפעל את הבאקאנד:
              <code style={{ display: 'block', marginTop: '6px', background: '#3d0000', padding: '6px 10px', borderRadius: '5px', fontSize: '12px', color: '#fca5a5', direction: 'ltr' }}>
                cd C:\Users\ניר\cv-matcher\backend && venv\Scripts\activate && python -m uvicorn main:app --reload --port 8000
              </code>
            </div>
          )}

          <div style={st.mainTabs}>
            {[
              { key: 'jobs',       label: '📋 משרות והתאמות' },
              { key: 'candidates', label: `👥 כל המועמדים (${stats.total_candidates})` },
              { key: 'submission',  label: '🤝 בניית הגשה' },
              { key: 'reminders',  label: dueCount > 0 ? `🔔 תזכורות (${dueCount})` : '🔔 תזכורות' },
              { key: 'users',      label: '⚙️ משתמשים' },
            ].map(t => (
              <button key={t.key} style={{
                ...st.mainTab,
                background: mainTab === t.key ? '#38bdf8' : 'transparent',
                color: mainTab === t.key ? '#0f172a' : '#94a3b8',
                ...(t.key === 'reminders' && dueCount > 0 && mainTab !== 'reminders'
                  ? { border: '1px solid #f87171', color: '#f87171' } : {}),
              }} onClick={() => setMainTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {mainTab === 'jobs' && (
            <JobsPanel key={jobsKey} topN={topN} minPct={minPct} />
          )}

          {mainTab === 'candidates' && (
            <CandidatesView candidates={allCandidates} />
          )}

          {mainTab === 'submission' && (
            <SubmissionBuilder />
          )}

          {mainTab === 'reminders' && (
            <RemindersView />
          )}

          {mainTab === 'users' && (
            <UsersView />
          )}
        </div>
      </div>
      <ScanBanner onGoToJobs={() => setMainTab('jobs')} />
    </div>
    </ScanProvider>
  )
}
