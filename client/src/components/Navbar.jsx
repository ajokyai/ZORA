import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import Cart from './Cart'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { cartCount } = useCart()
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">ZORA</Link>
        <div className="navbar-links">
          <Link to="/items">Browse</Link>
          <Link to="/#how">How it works</Link>
          {user ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              {user.role === 'admin' && (
                <Link to="/admin/items" className="navbar-admin-link">Admin</Link>
              )}
              <span className="navbar-role">{user.role}</span>
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn-nav-register">Order Now</Link>
            </>
          )}

          {/* Cart button */}
          <button className="cart-nav-btn" onClick={() => setCartOpen(true)}>
            🛒
            {cartCount > 0 && (
              <span className="cart-nav-badge">{cartCount}</span>
            )}
          </button>
        </div>
      </nav>

      {cartOpen && <Cart onClose={() => setCartOpen(false)} />}
    </>
  )
}