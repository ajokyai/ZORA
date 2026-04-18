import { Link, useHistory } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const history = useHistory()

  const handleLogout = async () => {
    await logout()
    history.push('/')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">ZORA</Link>

      <div className="navbar-links">
        <Link to="/items">Browse</Link>
        <Link to="/#how">How it works</Link>

        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <span className="navbar-role">{user.role}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn-nav-register">Order Now</Link>
          </>
        )}
      </div>
    </nav>
  )
}