import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useCart } from '../context/CartContext'
import './Items.css'

const CATEGORIES = ['All', 'Clothes', 'Shoes', 'Electronics', 'Beauty', 'Other']
const CATEGORY_EMOJI = { clothes: '👕', shoes: '👟', electronics: '📱', beauty: '💄', other: '📦' }

async function fetchUGXtoSSP() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/UGX')
    const data = await res.json()
    return data?.rates?.SSP ?? null
  } catch {
    return null
  }
}

export default function Items() {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('all')
  const [country, setCountry] = useState('SS')
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState({})

  const [ugxToSsp, setUgxToSsp] = useState(null)
  const [rateLoading, setRateLoading] = useState(true)
  const [rateUpdated, setRateUpdated] = useState('')

  const { addToCart } = useCart()

  useEffect(() => {
    setRateLoading(true)
    fetchUGXtoSSP().then(rate => {
      if (rate) {
        setUgxToSsp(rate)
        setRateUpdated(new Date().toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric'
        }))
      }
      setRateLoading(false)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    api.get(`/items?country=${country}&category=${category}`)
      .then(res => setItems(res.data.items))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [category, country])

  const handleAddToCart = (e, item) => {
    e.preventDefault()
    addToCart(item)
    setAddedIds(prev => ({ ...prev, [item.id]: true }))
    setTimeout(() => setAddedIds(prev => ({ ...prev, [item.id]: false })), 1200)
  }

  const KES_TO_UGX = 28.5
  const toUGX = (priceKes) => Math.round(priceKes * KES_TO_UGX)
  const toSSP = (priceKes) => {
    if (!ugxToSsp) return null
    return Math.round(toUGX(priceKes) * ugxToSsp)
  }

  return (
    <div className="items-page">
      <div className="items-header">
        <div className="items-header-inner">
          <h1>Browse Products</h1>
          <p>Sourced from Kampala markets — shipped to Juba every Sunday</p>
        </div>
      </div>

      <div className="items-body">

        {/* Exchange rate bar */}
        <div className="exchange-rate-bar">
          <span className="rate-label">Live exchange rate:</span>
          {rateLoading ? (
            <span className="rate-value">Loading…</span>
          ) : ugxToSsp ? (
            <>
              <span className="rate-value">1 UGX = {ugxToSsp.toFixed(4)} SSP</span>
              <span className="rate-date">· Updated {rateUpdated}</span>
            </>
          ) : (
            <span className="rate-value rate-error">Rate unavailable</span>
          )}
        </div>

        <div className="items-filters">
          <div className="filter-group">
            <label>Show prices in</label>
            <div className="currency-toggle">
              {[['SS', 'SSP'], ['KE', 'KES'], ['UG', 'UGX']].map(([code, label]) => (
                <button
                  key={code}
                  className={country === code ? 'active' : ''}
                  onClick={() => setCountry(code)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <label>Category</label>
            <div className="cat-tabs">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`cat-tab ${category === c.toLowerCase() ? 'active' : ''}`}
                  onClick={() => setCategory(c.toLowerCase())}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading products…</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <p>No products found.</p>
            <Link to="/" className="btn-secondary">Go home</Link>
          </div>
        ) : (
          <div className="items-grid">
            {items.map(item => {
              const ugx = toUGX(item.price_kes)
              const ssp = toSSP(item.price_kes)
              return (
                <Link to={`/items/${item.id}`} key={item.id} className="product-card">
                  <div className="product-img">
                    {item.images[0]
                      ? <img src={item.images[0].url} alt={item.name} />
                      : <span className="product-emoji">{CATEGORY_EMOJI[item.category] || '📦'}</span>}
                    <span className="product-badge">Kampala</span>
                  </div>
                  <div className="product-body">
                    <div className="product-name">{item.name}</div>
                    <div className="product-seller">by {item.seller_display_name}</div>
                    <div className="product-desc">{item.description}</div>

                    <div className="product-prices">
                      <span className="price-ugx">UGX {ugx.toLocaleString()}</span>
                      {ssp
                        ? <span className="price-ssp">≈ SSP {ssp.toLocaleString()}</span>
                        : <span className="price-ssp price-ssp--loading">SSP —</span>
                      }
                    </div>

                    {country === 'KE' && (
                      <div className="price-secondary">KES {item.price_kes?.toLocaleString()}</div>
                    )}

                    <div className="product-stock">
                      {item.stock > 0 ? `${item.stock} available` : 'Out of stock'}
                    </div>

                    <button
                      className={`order-btn ${addedIds[item.id] ? 'order-btn--added' : ''}`}
                      onClick={(e) => handleAddToCart(e, {
                        ...item,
                        price_ugx: ugx,
                        price_ssp: ssp,
                      })}
                      disabled={item.stock < 1}
                    >
                      {addedIds[item.id] ? '✓ Added!' : item.stock > 0 ? 'Add to Cart' : 'Out of stock'}
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}