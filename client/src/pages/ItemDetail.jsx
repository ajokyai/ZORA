import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import './ItemDetail.css'

const CATEGORY_EMOJI = { clothes: '👕', shoes: '👟', electronics: '📱', beauty: '💄', other: '📦' }

const WHATSAPP_NUMBER = '254700000000'
const INSTAGRAM_HANDLE = 'zora.market'

export default function ItemDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [country, setCountry] = useState('SS')
  const [loading, setLoading] = useState(true)
  const [ordering, setOrdering] = useState(false)
  const [ordered, setOrdered] = useState(false)
  const [qty, setQty] = useState(1)
  const [address, setAddress] = useState('')
  const [message, setMessage] = useState('')
  const [activeImg, setActiveImg] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')

  useEffect(() => {
    api.get(`/items/${id}?country=${country}`)
      .then(res => setItem(res.data.item))
      .catch(() => navigate('/items'))
      .finally(() => setLoading(false))
  }, [id, country])

  const handleOrder = async () => {
    if (!user) return navigate('/login')
    if (item.sizes?.length > 0 && !selectedSize) {
      alert('Please select a size before ordering.')
      return
    }
    setOrdering(true)
    try {
      await api.post('/orders', {
        item_id: item.id,
        quantity: qty,
        shipping_address: address || 'Juba Pickup Point',
        size: selectedSize || null,
      })
      setOrdered(true)
    } catch (err) {
      alert(err.response?.data?.error || 'Order failed')
    } finally {
      setOrdering(false)
    }
  }

  const handleMessage = async () => {
    if (!user) return navigate('/login')
    if (!message.trim()) return
    try {
      await api.post('/messages', { item_id: item.id, body: message })
      setMessage('')
      alert('Message sent to seller!')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message')
    }
  }

  const whatsappLink = item
    ? `https://wa.me/${+254729571181}?text=Hi%20ZORA%2C%20I'm%20interested%20in%3A%20${encodeURIComponent(item.name)}`
    : `https://wa.me/${+254729571181}`

  const instagramLink = `https://instagram.com/${INSTAGRAM_HANDLE}`

  if (loading) return <div className="loading">Loading…</div>
  if (!item) return null

  const hasImages = item.images && item.images.length > 0
  const hasSizes = item.sizes && item.sizes.length > 0

  return (
    <div className="item-detail">
      <div className="item-detail-inner">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="item-layout">

          {/* ── IMAGE PANEL ── */}
          <div className="item-image-panel">

            <div className="image-viewer">
              {hasImages && item.images.length > 1 && (
                <div className="thumb-strip">
                  {item.images.map((img, i) => (
                    <button
                      key={img.id}
                      className={`thumb-btn ${i === activeImg ? 'active' : ''}`}
                      onClick={() => setActiveImg(i)}
                    >
                      <img src={img.url} alt={`${item.name} ${i + 1}`} />
                    </button>
                  ))}
                </div>
              )}

              <div className={`main-image-box ${!hasImages || item.images.length <= 1 ? 'full-width' : ''}`}>
                {hasImages
                  ? <img src={item.images[activeImg]?.url} alt={item.name} className="main-image" />
                  : <span className="item-emoji">{CATEGORY_EMOJI[item.category] || '📦'}</span>}

                {hasImages && item.images.length > 1 && (
                  <div className="image-counter">{activeImg + 1} / {item.images.length}</div>
                )}
              </div>
            </div>

            <span className="item-badge-origin">📍 Sourced from Kampala</span>

            <div className="contact-links">
              <p className="contact-title">Contact us directly</p>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="contact-btn whatsapp-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp Us
              </a>
              <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="contact-btn instagram-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                @{INSTAGRAM_HANDLE}
              </a>
            </div>
          </div>

          {/* ── INFO PANEL ── */}
          <div className="item-info-panel">
            <div className="item-category-tag">{item.category}</div>
            <h1 className="item-name">{item.name}</h1>
            <p className="item-seller">by {item.seller_display_name}</p>
            <p className="item-desc">{item.description}</p>

            <div className="item-pricing">
              <div className="currency-toggle">
                {[['SS','SSP'],['KE','KES'],['UG','UGX']].map(([code,label]) => (
                  <button key={code} className={country===code?'active':''} onClick={() => setCountry(code)}>{label}</button>
                ))}
              </div>
              <div className="price-display">
                <span className="price-big">{item.currency_display} {item.price_display?.toLocaleString()}</span>
                {item.currency_display !== 'KES' && <span className="price-sub">KES {item.price_kes?.toLocaleString()} (Kampala price)</span>}
                <span className="price-note">✓ Includes transport & service fee</span>
              </div>
            </div>

            {/* ── SIZES ── */}
            {hasSizes && (
              <div className="item-sizes">
                <p className="sizes-label">
                  {['clothes'].includes(item.category) ? '👕 Available Sizes' : '👟 Available Sizes'}
                </p>
                <div className="sizes-grid">
                  {item.sizes.map(size => (
                    <button
                      key={size}
                      className={`size-btn ${selectedSize === size ? 'selected' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {selectedSize && (
                  <p className="size-selected-note">✓ Size <strong>{selectedSize}</strong> selected</p>
                )}
              </div>
            )}

            <div className="item-stock">
              {item.stock > 0
                ? <span className="in-stock">✓ {item.stock} available this week</span>
                : <span className="out-stock">Out of stock</span>}
            </div>

            {ordered ? (
              <div className="order-success">
                <strong>Order placed!</strong>
                <p>Your order ships Sunday and arrives Monday in Juba.</p>
                <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{marginTop:'1rem'}}>Track my order</button>
              </div>
            ) : (
              <div className="order-form">
                <div className="order-row">
                  <label>Quantity
                    <input type="number" min="1" max={item.stock} value={qty} onChange={e => setQty(parseInt(e.target.value))} />
                  </label>
                  <label>Pickup address
                    <input type="text" value={address} placeholder="Juba Pickup Point" onChange={e => setAddress(e.target.value)} />
                  </label>
                </div>
                <button className="btn-primary order-main-btn" onClick={handleOrder} disabled={ordering || item.stock === 0}>
                  {ordering ? 'Placing order…' : 'Order This Week'}
                </button>
                <p className="order-note">Order by Friday 5pm to ship this Sunday</p>
              </div>
            )}

            <div className="ask-seller">
              <h3>Ask the seller</h3>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Ask about sizes, colors, availability…" rows={3} />
              <button className="btn-secondary" onClick={handleMessage}>Send message</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}