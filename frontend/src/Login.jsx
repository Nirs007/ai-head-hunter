import { useState } from 'react'

const inp = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', background: '#1e293b',
  border: '1px solid #334155', borderRadius: '8px',
  color: '#e2e8f0', fontSize: '14px', outline: 'none',
  direction: 'ltr',
}

function ForgotModal({ onClose }) {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      if (r.ok) {
        setDone(true)
      } else {
        const d = await r.json().catch(() => ({}))
        setError(d.detail || 'שגיאה בשליחת המייל')
      }
    } catch {
      setError('שגיאה בחיבור לשרת')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#0f172a', border: '1px solid #334155', borderRadius: '14px',
        padding: '32px', width: '100%', maxWidth: '360px', direction: 'rtl',
      }}>
        <h3 style={{ margin: '0 0 16px', color: '#e2e8f0', fontSize: '16px' }}>שכחתי סיסמה</h3>

        {done ? (
          <>
            <p style={{ color: '#4ade80', fontSize: '14px', margin: '0 0 20px' }}>
              ✅ אם כתובת המייל קיימת במערכת, נשלח אליה קישור לאיפוס הסיסמה.
            </p>
            <button onClick={onClose} style={{
              width: '100%', padding: '10px', background: '#1e3a5f',
              border: '1px solid #1d4ed8', borderRadius: '8px',
              color: '#60a5fa', fontSize: '14px', cursor: 'pointer',
            }}>סגור</button>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              הזן את כתובת המייל שלך ונשלח לך קישור לאיפוס הסיסמה.
            </p>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus style={inp}
            />
            {error && (
              <div style={{
                background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px',
                padding: '10px 14px', color: '#f87171', fontSize: '13px',
              }}>⚠ {error}</div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={onClose} style={{
                flex: 1, padding: '10px', background: 'none',
                border: '1px solid #334155', borderRadius: '8px',
                color: '#94a3b8', fontSize: '14px', cursor: 'pointer',
              }}>ביטול</button>
              <button type="submit" disabled={loading || !email} style={{
                flex: 2, padding: '10px',
                background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                border: 'none', borderRadius: '8px',
                color: '#fff', fontSize: '14px', fontWeight: 700,
                cursor: loading || !email ? 'not-allowed' : 'pointer',
                opacity: loading || !email ? 0.6 : 1,
              }}>{loading ? 'שולח...' : 'שלח קישור'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showForgot, setShowForgot] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (r.ok) {
        const data = await r.json()
        onLogin(data.user)
      } else {
        const data = await r.json().catch(() => ({}))
        setError(data.detail || 'שגיאה בהתחברות')
      }
    } catch {
      setError('שגיאה בחיבור לשרת')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {showForgot && <ForgotModal onClose={() => setShowForgot(false)} />}

      <div style={{
        background: '#0f172a', border: '1px solid #334155',
        borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '28px', fontWeight: 700,
            background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '6px',
          }}>
            🎯 AI Head Hunter
          </div>
          <div style={{ color: '#475569', fontSize: '13px' }}>התחבר כדי להמשיך</div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.5px' }}>
              כתובת מייל
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus style={inp}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>
                סיסמה
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                style={{
                  background: 'none', border: 'none', color: '#38bdf8',
                  fontSize: '12px', cursor: 'pointer', padding: 0,
                }}
              >שכחתי סיסמה</button>
            </div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required style={inp}
            />
          </div>

          {error && (
            <div style={{
              background: '#450a0a', border: '1px solid #7f1d1d',
              borderRadius: '8px', padding: '10px 14px',
              color: '#f87171', fontSize: '13px', textAlign: 'center',
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              padding: '12px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '14px', fontWeight: 700,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              opacity: loading || !email || !password ? 0.6 : 1,
              marginTop: '4px',
            }}
          >
            {loading ? 'מתחבר...' : '🔐 התחבר'}
          </button>
        </form>
      </div>
    </div>
  )
}
