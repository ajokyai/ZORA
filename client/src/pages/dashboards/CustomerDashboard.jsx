import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import './Dashboard.css'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/orders').then(res => setOrders(res.data.orders)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const currency = user.country?.currency_code || 'KES'
  const rate = user.country?.exchange_rate_to_kes || 1.0

  return (
    <div className="dashboard">
      <div className="dash-hero">
        <div className="dash-hero-inner">
          <h1>Welcome, <span>{user.display_name || user.username}</span> 👋</h1>
          <p>{user.country?.name || 'Your country'} · Prices in {currency} · Next shipment: <strong style={{color:'var(--gold)'}}>This Sunday</strong></p>
        </div>
      </div>
      <div className="dash-body">
        <div className="dash-grid">
          <div className="dash-card">
            <div className="dash-card-icon">🛍️</div>
            <h3>Browse Products</h3>
            <p>Discover items sourced from Kampala markets at affordable prices.</p>
            <Link to="/items" className="btn-secondary" style={{marginTop:'0.5rem',width:'fit-content'}}>Shop Now →</Link>
          </div>
          <div className="dash-card">
            <div className="dash-card-icon">📦</div>
            <h3>My Orders</h3>
            <p>Track your orders from Kampala to your pickup point in Juba.</p>
            <span style={{fontSize:'0.85rem',color:'var(--muted)'}}>{orders.length} order{orders.length!==1?'s':''} total</span>
          </div>
          <div className="dash-card">
            <div className="dash-card-icon">💬</div>
            <h3>Messages</h3>
            <p>Chat with sellers about products, sizes, and availability.</p>
            <Link to="/items" className="btn-secondary" style={{marginTop:'0.5rem',width:'fit-content'}}>Browse to message →</Link>
          </div>
        </div>
        <div className="dash-section-title">My Orders</div>
        {loading ? <div className="loading">Loading orders…</div> : orders.length === 0 ? (
          <div className="empty-orders">
            <p style={{marginBottom:'1rem'}}>No orders yet.</p>
            <Link to="/items" className="btn-primary" style={{width:'auto',display:'inline-block'}}>Start shopping</Link>
          </div>
        ) : (
          <table className="orders-table">
            <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Total (KES)</th><th>Total ({currency})</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td><td>{o.item_name}</td><td>{o.quantity}</td>
                  <td>KES {o.total_kes?.toLocaleString()}</td>
                  <td>{currency} {Math.round(o.total_kes/rate).toLocaleString()}</td>
                  <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
