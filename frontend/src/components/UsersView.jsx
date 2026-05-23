import { useState, useEffect } from 'react'

// ── Shared input style ─────────────────────────────────────────────────────

const inp = {
  padding: '8px 12px', background: '#1e293b', border: '1px solid #334155',
  borderRadius: '7px', color: '#e2e8f0', fontSize: '13px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

// ── UserRow ────────────────────────────────────────────────────────────────

function UserRow({ user, onUpdated, onDeleted }) {
  const [editing,   setEditing]   = useState(false)
  const [name,      setName]      = useState(user.name)
  const [role,      setRole]      = useState(user.role || '')
  const [email,     setEmail]     = useState(user.email || '')
  const [phone,     setPhone]     = useState(user.phone || '')
  const [saving,    setSaving]    = useState(false)
  const [setPwMode, setSetPwMode] = useState(false)
  const [newPw,     setNewPw]     = useState('')
  const [pwSaving,  setPwSaving]  = useState(false)
  const [pwMsg,     setPwMsg]     = useState(null)
  const [showPw,    setShowPw]    = useState(false)
  const PW_PLACEHOLDER = '••••••••'

  const savePassword = async () => {
    if (newPw === PW_PLACEHOLDER) { setSetPwMode(false); return }
    if (newPw.length < 6) { setPwMsg({ ok: false, text: 'לפחות 6 תווים' }); return }
    setPwSaving(true); setPwMsg(null)
    const r = await fetch(`/api/users/${user.id}/set-password`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPw }),
    })
    setPwSaving(false)
    if (r.ok) { setPwMsg({ ok: true, text: 'הסיסמה נשמרה ✓' }); setNewPw(''); setTimeout(() => { setSetPwMode(false); setPwMsg(null) }, 1500) }
    else { const d = await r.json().catch(() => ({})); setPwMsg({ ok: false, text: d.detail || 'שגיאה' }) }
  }

  const openPwMode = () => {
    setSetPwMode(s => !s)
    setPwMsg(null)
    setShowPw(false)
    setNewPw(user.password_hash ? PW_PLACEHOLDER : '')
  }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, email, phone }),
    })
    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  const del = async () => {
    if (!confirm(`למחוק את המשתמש "${user.name}"?`)) return
    await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    onDeleted()
  }

  if (editing) {
    return (
      <div style={{ background: '#1e293b', border: '1px solid #2563eb', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <input value={name}  onChange={e => setName(e.target.value)}  placeholder="שם *" dir="auto" style={inp} autoFocus />
          <input value={role}  onChange={e => setRole(e.target.value)}  placeholder="תפקיד" dir="auto" style={inp} />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="מייל" type="email" style={inp} />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="טלפון" dir="auto" style={inp} />
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={() => setEditing(false)} style={{ padding: '6px 14px', background: 'none', border: '1px solid #334155', borderRadius: '7px', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>ביטול</button>
          <button onClick={save} disabled={saving || !name.trim()} style={{ padding: '6px 18px', background: '#1d4ed8', border: '1px solid #2563eb', borderRadius: '7px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? '...' : '💾 שמור'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '4px' }}>
            👤 {user.name}
            {user.role && <span style={{ marginRight: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>· {user.role}</span>}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {user.email
              ? <a href={`mailto:${user.email}`} style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'none' }}>✉ {user.email}</a>
              : <span style={{ fontSize: '12px', color: '#475569' }}>✉ לא הוגדר מייל</span>
            }
            {user.phone && <span style={{ fontSize: '12px', color: '#94a3b8' }}>📞 {user.phone}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={openPwMode} style={{ padding: '5px 10px', background: '#1a2e1a', border: '1px solid #166534', borderRadius: '6px', color: '#4ade80', fontSize: '12px', cursor: 'pointer' }}>🔑 סיסמה</button>
          <button onClick={() => setEditing(true)} style={{ padding: '5px 12px', background: '#1e3a5f', border: '1px solid #1d4ed8', borderRadius: '6px', color: '#60a5fa', fontSize: '12px', cursor: 'pointer' }}>✏ עריכה</button>
          <button onClick={del} style={{ padding: '5px 10px', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {setPwMode && (
        <div style={{ borderTop: '1px solid #1e3a2a', padding: '12px 16px', background: '#0d1f0d', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600 }}>🔑 הגדר סיסמה ל-{user.name}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                onFocus={() => { if (newPw === PW_PLACEHOLDER) setNewPw('') }}
                onKeyDown={e => e.key === 'Enter' && savePassword()}
                type={showPw ? 'text' : 'password'}
                placeholder="סיסמה חדשה (לפחות 6 תווים)"
                autoFocus
                style={{ ...inp, width: '100%', paddingLeft: '36px', direction: 'ltr' }}
              />
              <button onClick={() => setShowPw(s => !s)} type="button" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', padding: 0 }}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
            <button onClick={savePassword} disabled={pwSaving || newPw.length < 6} style={{ padding: '8px 16px', background: '#166534', border: '1px solid #4ade80', borderRadius: '7px', color: '#4ade80', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: pwSaving || newPw.length < 6 ? 0.5 : 1, whiteSpace: 'nowrap' }}>
              {pwSaving ? '...' : '✓ שמור'}
            </button>
            <button onClick={() => { setSetPwMode(false); setNewPw(''); setPwMsg(null); setShowPw(false) }} style={{ padding: '8px 12px', background: 'none', border: '1px solid #334155', borderRadius: '7px', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>ביטול</button>
          </div>
          {pwMsg && (
            <div style={{ fontSize: '12px', color: pwMsg.ok ? '#4ade80' : '#f87171' }}>{pwMsg.text}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── SmtpSettings ───────────────────────────────────────────────────────────

function SmtpSettings() {
  const [host,      setHost]      = useState('smtp.gmail.com')
  const [port,      setPort]      = useState('587')
  const [user,      setUser]      = useState('')
  const [pass_,     setPass]      = useState('')
  const [fromName,  setFromName]  = useState('AI Head Hunter')
  const [loaded,    setLoaded]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [testing,   setTesting]   = useState(false)
  const [msg,       setMsg]       = useState(null)  // { type: 'ok'|'err', text }
  const [showPass,  setShowPass]  = useState(false)

  useEffect(() => {
    fetch('/api/settings/smtp').then(r => r.json()).then(d => {
      setHost(d.smtp_host || 'smtp.gmail.com')
      setPort(String(d.smtp_port || 587))
      setUser(d.smtp_user || '')
      setPass(d.smtp_pass || '')
      setFromName(d.smtp_from_name || 'AI Head Hunter | ConnecTech')
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const payload = () => ({ smtp_host: host, smtp_port: +port, smtp_user: user, smtp_pass: pass_, smtp_from_name: fromName })

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      await fetch('/api/settings/smtp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) })
      setMsg({ type: 'ok', text: 'ההגדרות נשמרו בהצלחה' })
    } catch { setMsg({ type: 'err', text: 'שגיאה בשמירה' }) }
    finally { setSaving(false) }
  }

  const test = async () => {
    setTesting(true); setMsg(null)
    try {
      const r = await fetch('/api/settings/smtp/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) })
      if (r.ok) setMsg({ type: 'ok', text: 'מייל בדיקה נשלח בהצלחה! בדוק את תיבת הדואר שלך' })
      else { const d = await r.json(); setMsg({ type: 'err', text: d.detail || 'שגיאה בשליחה' }) }
    } catch { setMsg({ type: 'err', text: 'שגיאה בחיבור לשרת' }) }
    finally { setTesting(false) }
  }

  if (!loaded) return <div style={{ color: '#475569', fontSize: '13px' }}>טוען...</div>

  return (
    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>⚙️ הגדרות שליחת מייל (SMTP)</div>
      {/* Google Workspace guide */}
      <div style={{ background: '#0d1b2e', border: '1px solid #1d4ed8', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '6px' }}>📧 Google Workspace — connectech.co.il</div>
        <div>השרת מוגדר אוטומטית ל-<b style={{ color: '#e2e8f0' }}>smtp.gmail.com:587</b> (TLS).</div>
        <div style={{ marginTop: '4px' }}>כדי לשלוח מייל מחשבון Google Workspace:</div>
        <ol style={{ margin: '6px 0 0 0', paddingRight: '18px' }}>
          <li>היכנס ל-<b style={{ color: '#e2e8f0' }}>myaccount.google.com</b> עם חשבון connectech.co.il</li>
          <li>אבטחה ← אימות דו-שלבי (חייב להיות מופעל)</li>
          <li>חפש <b style={{ color: '#e2e8f0' }}>"סיסמאות לאפליקציה"</b> → צור סיסמה חדשה בשם "AI Head Hunter"</li>
          <li>העתק את הסיסמה בת-16 הספרות לשדה למטה</li>
        </ol>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '8px' }}>
        <input value={host} onChange={e => setHost(e.target.value)} placeholder="שרת SMTP" style={{ ...inp, color: '#64748b' }} readOnly />
        <input value={port} onChange={e => setPort(e.target.value)} placeholder="פורט" type="number" style={{ ...inp, color: '#64748b' }} readOnly />
      </div>
      <input value={user} onChange={e => setUser(e.target.value)} placeholder="כתובת מייל שולח (you@connectech.co.il)" type="email" style={inp} autoFocus />
      <div style={{ position: 'relative' }}>
        <input value={pass_} onChange={e => setPass(e.target.value)} placeholder="App Password (16 תווים מגוגל)" type={showPass ? 'text' : 'password'} style={{ ...inp, paddingLeft: '60px' }} />
        <button onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}>
          {showPass ? '🙈' : '👁'}
        </button>
      </div>
      <input value={fromName} onChange={e => setFromName(e.target.value)} placeholder='שם שולח' dir="auto" style={inp} />

      {msg && (
        <div style={{ fontSize: '12px', padding: '8px 12px', borderRadius: '6px', background: msg.type === 'ok' ? '#052e16' : '#450a0a', border: `1px solid ${msg.type === 'ok' ? '#166534' : '#7f1d1d'}`, color: msg.type === 'ok' ? '#4ade80' : '#f87171' }}>
          {msg.type === 'ok' ? '✅' : '⚠'} {msg.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={test} disabled={testing || !user || !pass_} style={{ padding: '7px 16px', background: 'none', border: '1px solid #334155', borderRadius: '7px', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', opacity: testing || !user || !pass_ ? 0.5 : 1 }}>
          {testing ? '...' : '📨 שלח מייל בדיקה'}
        </button>
        <button onClick={save} disabled={saving} style={{ padding: '7px 20px', background: '#1d4ed8', border: '1px solid #2563eb', borderRadius: '7px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? '...' : '💾 שמור הגדרות'}
        </button>
      </div>
    </div>
  )
}

// ── Main UsersView ─────────────────────────────────────────────────────────

export default function UsersView() {
  const [users,    setUsers]    = useState(null)
  const [showAdd,  setShowAdd]  = useState(false)
  const [newName,  setNewName]  = useState('')
  const [newRole,  setNewRole]  = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [adding,   setAdding]   = useState(false)

  const load = () =>
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]))

  useEffect(() => { load() }, [])

  const addUser = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, role: newRole, email: newEmail, phone: newPhone }),
    })
    setAdding(false)
    setNewName(''); setNewRole(''); setNewEmail(''); setNewPhone('')
    setShowAdd(false)
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Users list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>👥 משתמשי המערכת</div>
          <button onClick={() => setShowAdd(s => !s)} style={{ padding: '7px 16px', background: '#1d4ed8', border: '1px solid #2563eb', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            + הוסף משתמש
          </button>
        </div>

        {showAdd && (
          <div style={{ background: '#1e293b', border: '1px solid #2563eb', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>משתמש חדש</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input value={newName}  onChange={e => setNewName(e.target.value)}  placeholder="שם *" dir="auto" style={inp} autoFocus />
              <input value={newRole}  onChange={e => setNewRole(e.target.value)}  placeholder="תפקיד" dir="auto" style={inp} />
              <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="מייל" type="email" style={inp} />
              <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="טלפון" dir="auto" style={inp} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '6px 14px', background: 'none', border: '1px solid #334155', borderRadius: '7px', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>ביטול</button>
              <button onClick={addUser} disabled={adding || !newName.trim()} style={{ padding: '6px 18px', background: '#1d4ed8', border: '1px solid #2563eb', borderRadius: '7px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: adding || !newName.trim() ? 0.5 : 1 }}>
                {adding ? '...' : '+ הוסף'}
              </button>
            </div>
          </div>
        )}

        {users === null ? (
          <div style={{ color: '#475569', fontSize: '13px' }}>טוען...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569', fontSize: '14px' }}>אין משתמשים</div>
        ) : (
          users.map(u => (
            <UserRow key={u.id} user={u} onUpdated={load} onDeleted={load} />
          ))
        )}
      </div>

      {/* SMTP settings */}
      <SmtpSettings />
    </div>
  )
}
