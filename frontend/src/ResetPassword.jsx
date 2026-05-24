import { useState, useEffect } from 'react'

const inp = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 14px', background: '#1e293b',
  border: '1px solid #334155', borderRadius: '8px',
  color: '#e2e8f0', fontSize: '14px', outline: 'none',
  direction: 'ltr',
}

export default function ResetPassword({ token }) {
  const [valid,    setValid]    = useState(null)   // null=checking, true, false
  const [pw,       setPw]       = useState('')
  const [pw2,      setPw2]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    fetch(`/api/auth/validate-reset-token/${token}`)
      .then(r => setValid(r.ok))
      .catch(() => setValid(false))
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    if (pw !== pw2) { setError('הסיסמאות אינן תואמות'); return }
    if (pw.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return }
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: pw }),
      })
      if (r.ok) {
        setDone(true)
      } else {
        const d = await r.json().catch(() => ({}))
        setError(d.detail || 'שגיאה באיפוס הסיסמה')
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
      <div style={{
        background: '#0f172a', border: '1px solid #334155',
        borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)', direction: 'rtl',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontSize: '26px', fontWeight: 700,
            background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '6px',
          }}>🎯 AI Head Hunter</div>
          <div style={{ color: '#475569', fontSize: '13px' }}>איפוס סיסמה</div>
        </div>

        {valid === null && (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>מאמת קישור...</p>
        )}

        {valid === false && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#f87171', marginBottom: '20px' }}>
              ⚠ הקישור לא תקין או שפג תוקפו.
            </p>
            <a href="/" style={{ color: '#38bdf8', fontSize: '14px' }}>חזור לדף הכניסה</a>
          </div>
        )}

        {valid === true && !done && (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
                סיסמה חדשה
              </label>
              <input
                type="password" value={pw} onChange={e => setPw(e.target.value)}
                placeholder="לפחות 6 תווים" required autoFocus style={inp}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
                אישור סיסמה
              </label>
              <input
                type="password" value={pw2} onChange={e => setPw2(e.target.value)}
                placeholder="הזן שוב" required style={inp}
              />
            </div>
            {error && (
              <div style={{
                background: '#450a0a', border: '1px solid #7f1d1d',
                borderRadius: '8px', padding: '10px 14px',
                color: '#f87171', fontSize: '13px',
              }}>⚠ {error}</div>
            )}
            <button
              type="submit" disabled={loading || !pw || !pw2}
              style={{
                padding: '12px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                border: 'none', borderRadius: '8px',
                color: '#fff', fontSize: '14px', fontWeight: 700,
                cursor: loading || !pw || !pw2 ? 'not-allowed' : 'pointer',
                opacity: loading || !pw || !pw2 ? 0.6 : 1,
              }}
            >{loading ? 'שומר...' : '🔒 שמור סיסמה חדשה'}</button>
          </form>
        )}

        {done && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#4ade80', marginBottom: '20px', fontSize: '15px' }}>
              ✅ הסיסמה שונתה בהצלחה!
            </p>
            <a href="/" style={{
              display: 'inline-block', padding: '10px 24px',
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              borderRadius: '8px', color: '#fff', fontSize: '14px',
              fontWeight: 700, textDecoration: 'none',
            }}>התחבר</a>
          </div>
        )}
      </div>
    </div>
  )
}
