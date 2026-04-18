import { useState } from 'react'
import { useHistory, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login() {
  const { login } = useAuth()
  const history = useHistory()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = e =>
    setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(form.email, form.password)

      // ✅ ROLE REDIRECT
      if (user?.role === 'admin') {
        history.push('/admin')
      } else {
        history.push('/dashboard')
      }

    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError("Incorrect password")
        } else if (err.response.status === 404) {
          setError("User not found")
        } else {
          setError(err.response.data?.error || "Login failed")
        }
      } else {
        setError("Server not reachable")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">ZO<span>RA</span></div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your ZORA account</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
            />
          </label>

          <label>Password
            <div style={{ position: "relative" }}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />

              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>

            {/* 🔥 FORGOT PASSWORD LINK (ADDED HERE) */}
            <div style={{ textAlign: "right", marginTop: "6px" }}>
              <Link
                to="/forgot-password"
                style={{ fontSize: "12px", color: "#007bff" }}
              >
                Forgot password?
              </Link>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* WhatsApp Support */}
        <a
          href="https://wa.me/211923198518?text=Hello%20Admin,%20I%20need%20help%20logging%20in"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{
            marginTop: "12px",
            display: "block",
            textAlign: "center"
          }}
        >
          Contact Admin on WhatsApp
        </a>

        <p className="auth-switch">
          No account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  )
}