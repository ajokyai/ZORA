import { useState, useEffect } from 'react'
import { useHistory, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import './Auth.css'

export default function Register() {
  const { register } = useAuth()
  const history = useHistory()
  const [countries, setCountries] = useState([])
  const [form, setForm] = useState({ email: '', username: '', password: '', display_name: '', phone: '', country_id: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/countries').then(res => setCountries(res.data.countries))
  }, [])

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({ ...form, role: 'customer', country_id: form.country_id || undefined })
      history.push('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">ZO<span>RA</span></div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Join the East Africa cross-border marketprices</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>Email<input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" /></label>
          <label>Username<input name="username" value={form.username} onChange={handleChange} required placeholder="yourname" /></label>
          <label>Display Name<input name="display_name" value={form.display_name} onChange={handleChange} placeholder="Your full name" /></label>
          <label>Phone Number<input name="phone" value={form.phone} onChange={handleChange} placeholder="+256 700 000000" /></label>
          <label>Password<input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} placeholder="Min 6 characters" /></label>
          <label>Your Country
            <select name="country_id" value={form.country_id} onChange={handleChange}>
              <option value="">Select your country</option>
              {countries.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.currency_code})</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}