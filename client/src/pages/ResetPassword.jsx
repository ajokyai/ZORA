import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios'

function ResetPassword() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const location = useLocation()
  const navigate = useNavigate()
  const token = new URLSearchParams(location.search).get('token')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const res = await api.post('/auth/reset-password', { token, password })
      setMessage('Password reset! Redirecting to login...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Server error')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset Password</h2>
        {!token && <p style={{ color: 'red' }}>Invalid or missing reset link.</p>}
        {message && <p style={{ color: 'green' }}>{message}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {token && (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button type="submit">Reset Password</button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword