import { useState, useEffect, useMemo } from 'react'

// ── helpers ──────────────────────────────────────────────────────────────────

function toWaPhone(phone) {
  const d = (phone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('972')) return d
  if (d.startsWith('0')) return '972' + d.slice(1)
  return '972' + d
}

function fmtDue(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

function isOverdue(iso) {
  return new Date(iso) < new Date()
}

// ── CreateReminderModal ───────────────────────────────────────────────────────

function CreateReminderModal({ onSaved, onClose }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const pad = n => String(n).padStart(2, '0')
  const defaultDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth()+1)}-${pad(tomorrow.getDate())}`

  const [title,      setTitle]      = useState('')
  const [desc,       setDesc]       = useState('')
  const [date,       setDate]       = useState(defaultDate)
  const [time,       setTime]       = useState('09:00')
  const [candN,      setCandN]      = useState('')   // free-text candidate name
  const [candPhone,  setCandPhone]  = useState('')   // candidate phone for WhatsApp
  const [jobs,       setJobs]       = useState(null)
  const [jobId,      setJobId]      = useState('')
  const [users,      setUsers]      = useState(null)
  const [userId,     setUserId]     = useState('')   // assigned user for email
  const [sendWa,     setSendWa]     = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    fetch('/api/jobs').then(r => r.json()).then(setJobs).catch(() => setJobs([]))
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]))
  }, [])

  const save = async () => {
    if (!title.trim() || !date || !time) { setError('כותרת, תאריך ושעה הם שדות חובה'); return }
    setSaving(true); setError(null)
    const due_at = new Date(`${date}T${time}:00`).toISOString()
    const pickedJob = jobs?.find(j => j.id === +jobId)
    const waPhone = toWaPhone(candPhone)
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description: desc, due_at,
          candidate_name: candN,
          candidate_phone: candPhone,
          job_id: jobId ? +jobId : null,
          job_title: pickedJob?.title || '',
          assigned_user_id: userId ? +userId : null,
        }),
      })
      if (sendWa && waPhone) {
        const msg = encodeURIComponent(`שלום ${candN || ''},\nרצינו לעדכן אותך בנוגע למשרת ${pickedJob?.title || ''}.`)
        window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank')
      }
      onSaved()
    } catch { setError('שגיאה בשמירה')
    } finally { setSaving(false) }
  }

  const inp = {
    padding: '8px 12px', background: '#1e293b', border: '1px solid #334155',
    borderRadius: '7px', color: '#e2e8f0', fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px', padding: '24px', width: '460px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '12px' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>🔔 תזכורת חדשה</div>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת *" dir="auto" style={inp} autoFocus />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="תיאור (לא חובה)" dir="auto" rows={2}
          style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />

        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ ...inp, flex: 1, colorScheme: 'dark' }} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            style={{ ...inp, width: '110px', flex: 'none', colorScheme: 'dark' }} />
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>שיוך (לא חובה)</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={candN} onChange={e => setCandN(e.target.value)} placeholder="שם מועמד" dir="auto" style={{ ...inp, flex: 1 }} />
            <input value={candPhone} onChange={e => setCandPhone(e.target.value)} placeholder="טלפון לוואטסאפ" dir="ltr" style={{ ...inp, flex: 1 }} />
          </div>
          <select value={jobId} onChange={e => setJobId(e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}>
            <option value="">— ללא שיוך למשרה —</option>
            {(jobs || []).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>שליחה במייל (לא חובה)</div>
            <select value={userId} onChange={e => setUserId(e.target.value)}
              style={{ ...inp, cursor: 'pointer' }}>
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
            {candPhone && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#94a3b8', paddingTop: '4px' }}>
                <input type="checkbox" checked={sendWa} onChange={e => setSendWa(e.target.checked)}
                  style={{ accentColor: '#25d366', width: '15px', height: '15px' }} />
                <span>📱 פתח שיחת וואטסאפ עם המועמד</span>
              </label>
            )}
          </div>
        </div>

        {error && <div style={{ fontSize: '12px', color: '#f87171' }}>⚠ {error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'none', border: '1px solid #334155', borderRadius: '7px', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>ביטול</button>
          <button onClick={save} disabled={saving || !title.trim() || !date || !time}
            style={{ padding: '8px 22px', background: '#1d4ed8', border: '1px solid #2563eb', borderRadius: '7px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving || !title.trim() ? 0.5 : 1 }}>
            {saving ? '...' : sendWa && toWaPhone(candPhone) ? '🔔 שמור ופתח וואטסאפ' : '🔔 שמור'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── EditReminderModal ─────────────────────────────────────────────────────────

function EditReminderModal({ reminder, onSaved, onClose }) {
  const pad = n => String(n).padStart(2, '0')
  const parseLocalDate = (iso) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
  }
  const parseLocalTime = (iso) => {
    const d = new Date(iso)
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [title,     setTitle]     = useState(reminder.title || '')
  const [desc,      setDesc]      = useState(reminder.description || '')
  const [date,      setDate]      = useState(parseLocalDate(reminder.due_at))
  const [time,      setTime]      = useState(parseLocalTime(reminder.due_at))
  const [candN,     setCandN]     = useState(reminder.candidate_name || '')
  const [candPhone, setCandPhone] = useState(reminder.candidate_phone || '')
  const [jobs,      setJobs]      = useState(null)
  const [jobId,     setJobId]     = useState(String(reminder.job_id || ''))
  const [users,     setUsers]     = useState(null)
  const [userId,    setUserId]    = useState(String(reminder.assigned_user_id || ''))
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    fetch('/api/jobs').then(r => r.json()).then(setJobs).catch(() => setJobs([]))
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]))
  }, [])

  const save = async () => {
    if (!title.trim() || !date || !time) { setError('כותרת, תאריך ושעה הם שדות חובה'); return }
    setSaving(true); setError(null)
    const due_at = new Date(`${date}T${time}:00`).toISOString()
    const pickedJob = jobs?.find(j => j.id === +jobId)
    try {
      const r = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description: desc, due_at,
          candidate_name: candN, candidate_phone: candPhone,
          job_id: jobId ? +jobId : null,
          job_title: pickedJob?.title || reminder.job_title || '',
          assigned_user_id: userId ? +userId : null,
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.detail || 'שגיאה בשמירה'); return }
      onSaved()
    } catch { setError('שגיאה בשמירה') } finally { setSaving(false) }
  }

  const inp = {
    padding: '8px 12px', background: '#1e293b', border: '1px solid #334155',
    borderRadius: '7px', color: '#e2e8f0', fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: '#0f172a', border: '1px solid #2563eb', borderRadius: '14px', padding: '24px', width: '460px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '12px' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>✏ עריכת תזכורת</div>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת *" dir="auto" style={inp} autoFocus />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="תיאור (לא חובה)" dir="auto" rows={2}
          style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />

        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, flex: 1, colorScheme: 'dark' }} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inp, width: '110px', flex: 'none', colorScheme: 'dark' }} />
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>שיוך (לא חובה)</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={candN} onChange={e => setCandN(e.target.value)} placeholder="שם מועמד" dir="auto" style={{ ...inp, flex: 1 }} />
            <input value={candPhone} onChange={e => setCandPhone(e.target.value)} placeholder="טלפון" dir="ltr" style={{ ...inp, flex: 1 }} />
          </div>
          <select value={jobId} onChange={e => setJobId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
            <option value="">— ללא שיוך למשרה —</option>
            {(jobs || []).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>שליחה במייל (לא חובה)</div>
            <select value={userId} onChange={e => setUserId(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              <option value="">— ללא שליחת מייל —</option>
              {(users || []).map(u => (
                <option key={u.id} value={u.id} disabled={!u.email}>
                  {u.name}{u.role ? ` (${u.role})` : ''}{!u.email ? ' — אין מייל' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div style={{ fontSize: '12px', color: '#f87171' }}>⚠ {error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'none', border: '1px solid #334155', borderRadius: '7px', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>ביטול</button>
          <button onClick={save} disabled={saving || !title.trim() || !date || !time}
            style={{ padding: '8px 22px', background: '#1d4ed8', border: '1px solid #2563eb', borderRadius: '7px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: saving || !title.trim() ? 0.5 : 1 }}>
            {saving ? '...' : '💾 שמור שינויים'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main RemindersView ────────────────────────────────────────────────────────

export default function RemindersView() {
  const [reminders, setReminders]   = useState(null)
  const [search, setSearch]         = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showDone, setShowDone]     = useState(false)
  const [editReminder, setEditReminder] = useState(null)

  const load = () =>
    fetch('/api/reminders').then(r => r.json()).then(setReminders).catch(() => setReminders([]))

  useEffect(() => { load() }, [])

  const dismiss = async (id) => {
    await fetch(`/api/reminders/${id}/dismiss`, { method: 'PATCH' })
    setReminders(prev => prev.map(r => r.id === id ? { ...r, dismissed: 1 } : r))
  }

  const del = async (id) => {
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const filtered = useMemo(() => {
    if (!reminders) return []
    const q = search.toLowerCase()
    return reminders.filter(r => {
      if (!showDone && r.dismissed) return false
      if (!q) return true
      return (r.title + r.description + r.candidate_name + r.job_title).toLowerCase().includes(q)
    })
  }, [reminders, search, showDone])

  const overdue = (reminders || []).filter(r => !r.dismissed && isOverdue(r.due_at)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש תזכורות..."
            dir="auto"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', outline: 'none' }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
          <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} style={{ accentColor: '#38bdf8' }} />
          הצג שהושלמו
        </label>
        {overdue > 0 && (
          <span style={{ padding: '4px 12px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', fontSize: '12px', color: '#f87171', fontWeight: 700 }}>
            ⏰ {overdue} באיחור
          </span>
        )}
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '8px 18px', background: '#1d4ed8', border: '1px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
        >+ תזכורת חדשה</button>
      </div>

      {/* List */}
      {reminders === null ? (
        <div style={{ color: '#475569', fontSize: '13px' }}>טוען...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#475569' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔔</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
            {search ? 'לא נמצאו תזכורות' : 'אין תזכורות פעילות'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(r => {
            const over = !r.dismissed && isOverdue(r.due_at)
            return (
              <div key={r.id} style={{
                background: r.dismissed ? '#0d1117' : over ? '#1c0a0a' : '#1e293b',
                border: `1px solid ${r.dismissed ? '#1e293b' : over ? '#7f1d1d' : '#334155'}`,
                borderRadius: '10px', padding: '14px 16px',
                opacity: r.dismissed ? 0.55 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title */}
                    <div style={{ fontSize: '14px', fontWeight: 700, color: r.dismissed ? '#64748b' : '#f1f5f9', marginBottom: '4px', textDecoration: r.dismissed ? 'line-through' : 'none' }}>
                      {r.title}
                    </div>
                    {/* Description */}
                    {r.description && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', lineHeight: 1.5 }}>{r.description}</div>
                    )}
                    {/* Meta */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: over ? '#f87171' : r.dismissed ? '#475569' : '#38bdf8' }}>
                        {over ? '⏰' : r.dismissed ? '✅' : '🕐'} {fmtDue(r.due_at)}
                      </span>
                      {r.candidate_name && (
                        <span style={{ fontSize: '11px', padding: '1px 8px', background: '#172554', border: '1px solid #1d4ed8', borderRadius: '4px', color: '#60a5fa' }}>
                          👤 {r.candidate_name}
                        </span>
                      )}
                      {r.job_title && (
                        <span style={{ fontSize: '11px', padding: '1px 8px', background: '#1a2e1a', border: '1px solid #166534', borderRadius: '4px', color: '#4ade80' }}>
                          💼 {r.job_title}
                        </span>
                      )}
                      {/* Email status badge — only when a user was assigned */}
                      {r.assigned_user_id && r.email_sent === 1 && (
                        <span style={{ fontSize: '11px', padding: '1px 8px', background: '#052e16', border: '1px solid #166534', borderRadius: '4px', color: '#4ade80' }}>
                          ✅ נשלח
                        </span>
                      )}
                      {r.assigned_user_id && !r.email_sent && !r.email_error && (
                        <span style={{ fontSize: '11px', padding: '1px 8px', background: '#1c1a05', border: '1px solid #713f12', borderRadius: '4px', color: '#fbbf24' }}>
                          ⏳ בהמתנה לשליחה
                        </span>
                      )}
                      {r.email_error && (
                        <span style={{ fontSize: '11px', padding: '1px 8px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '4px', color: '#f87171' }}>
                          ❌ השליחה נכשלה
                        </span>
                      )}
                    </div>
                    {/* Email error detail */}
                    {r.email_error && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#f87171', background: '#1c0505', border: '1px solid #7f1d1d', borderRadius: '6px', padding: '5px 10px', wordBreak: 'break-all' }}>
                        סיבת השגיאה: {r.email_error}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {r.candidate_phone && toWaPhone(r.candidate_phone) && (
                      <a
                        href={`https://wa.me/${toWaPhone(r.candidate_phone)}`}
                        target="_blank" rel="noreferrer"
                        title={`וואטסאפ: ${r.candidate_phone}`}
                        style={{ padding: '4px 10px', background: '#052e16', border: '1px solid #166534', borderRadius: '6px', color: '#4ade80', fontSize: '12px', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        📱
                      </a>
                    )}
                    {!r.dismissed && (
                      <button onClick={() => setEditReminder(r)}
                        title="עריכה"
                        style={{ padding: '4px 10px', background: '#1e3a5f', border: '1px solid #1d4ed8', borderRadius: '6px', color: '#60a5fa', fontSize: '12px', cursor: 'pointer' }}>
                        ✏
                      </button>
                    )}
                    {!r.dismissed && (
                      <button onClick={() => dismiss(r.id)}
                        title="סמן כהושלם"
                        style={{ padding: '4px 10px', background: '#052e16', border: '1px solid #166534', borderRadius: '6px', color: '#4ade80', fontSize: '12px', cursor: 'pointer' }}>
                        ✓
                      </button>
                    )}
                    <button onClick={() => del(r.id)}
                      title="מחק"
                      style={{ padding: '4px 10px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <CreateReminderModal
          onSaved={() => { setShowCreate(false); load() }}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editReminder && (
        <EditReminderModal
          reminder={editReminder}
          onSaved={() => { setEditReminder(null); load() }}
          onClose={() => setEditReminder(null)}
        />
      )}
    </div>
  )
}
