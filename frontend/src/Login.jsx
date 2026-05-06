import { useState } from 'react'

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

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
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', background: '#1e293b',
                border: '1px solid #334155', borderRadius: '8px',
                color: '#e2e8f0', fontSize: '14px', outline: 'none',
                direction: 'ltr',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.5px' }}>
              סיסמה
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 14px', background: '#1e293b',
                border: '1px solid #334155', borderRadius: '8px',
                color: '#e2e8f0', fontSize: '14px', outline: 'none',
                direction: 'ltr',
              }}
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
