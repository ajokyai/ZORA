import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.search).get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/auth/reset-password', { token, password })
      setMessage(res.data.message || 'Password reset! Redirecting to login…')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      const msg = err.response?.data?.error || 'Server error. Please try again.'
      if (msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')) {
        setError('This reset link has expired or is invalid. Please request a new one.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset Password</h2>

        {!token && (
          <>
            <p style={{ color: 'red', marginBottom: '1rem' }}>
              Invalid or missing reset link.
            </p>
            <Link to="/forgot-password">Request a new reset link →</Link>
          </>
        )}

        {message && (
          <p style={{ color: 'green', marginBottom: '1rem' }}>{message}</p>
        )}

        {error && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: 'red' }}>{error}</p>
            {(error.includes('expired') || error.includes('invalid')) && (
              <Link to="/forgot-password" style={{ fontSize: '13px' }}>
                Request a new reset link →
              </Link>
            )}
          </div>
        )}

        {token && !message && (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={6}
              style={{ marginTop: '10px' }}
            />
            <button type="submit" disabled={loading} style={{ marginTop: '12px' }}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword