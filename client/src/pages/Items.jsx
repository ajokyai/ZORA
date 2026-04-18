import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import './Items.css'

const CATEGORIES = ['All', 'Clothes', 'Shoes', 'Electronics', 'Beauty', 'Other']
const CATEGORY_EMOJI = { clothes: '👕', shoes: '👟', electronics: '📱', beauty: '💄', other: '📦' }

export default function Items() {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('all')
  const [country, setCountry] = useState('SS')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/items?country=${country}&category=${category}`)
      .then(res => setItems(res.data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [category, country])

  return (
    <div className="items-page">
      <div className="items-header">
        <div className="items-header-inner">
          <h1>Browse Products</h1>
          <p>Sourced from Kampala markets — shipped to Juba every Sunday</p>
        </div>
      </div>
      <div className="items-body">
        <div className="items-filters">
          <div className="filter-group">
            <label>Show prices in</label>
            <div className="currency-toggle">
              {[['SS','SSP'],['KE','KES'],['UG','UGX']].map(([code,label]) => (
                <button key={code} className={country===code?'active':''} onClick={() => setCountry(code)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <label>Category</label>
            <div className="cat-tabs">
              {CATEGORIES.map(c => (
                <button key={c} className={`cat-tab ${category===c.toLowerCase()?'active':''}`} onClick={() => setCategory(c.toLowerCase())}>{c}</button>
              ))}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="loading">Loading products…</div>
        ) : items.length === 0 ? (
          <div className="empty-state"><p>No products found.</p><Link to="/" className="btn-secondary">Go home</Link></div>
        ) : (
          <div className="items-grid">
            {items.map(item => (
              <Link to={`/items/${item.id}`} key={item.id} className="product-card">
                <div className="product-img">
                  {item.images[0] ? <img src={item.images[0].url} alt={item.name} /> : <span className="product-emoji">{CATEGORY_EMOJI[item.category]||'📦'}</span>}
                  <span className="product-badge">Kampala</span>
                </div>
                <div className="product-body">
                  <div className="product-name">{item.name}</div>
                  <div className="product-seller">by {item.seller_display_name}</div>
                  <div className="product-desc">{item.description}</div>
                  <div className="product-prices">
                    <span className="price-main">{item.currency_display} {item.price_display?.toLocaleString()}</span>
                    {item.currency_display!=='KES' && <span className="price-kes">KES {item.price_kes?.toLocaleString()}</span>}
                  </div>
                  <div className="product-stock">{item.stock > 0 ? `${item.stock} available` : 'Out of stock'}</div>
                  <button className="order-btn">Order This Week</button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
