import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import './Cart.css'

export default function Cart({ onClose }) {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartCount } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [shipping, setShipping] = useState('')
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const totalKes = cartItems.reduce((sum, c) => sum + c.item.price_kes * c.quantity, 0)

  const handleOrder = async () => {
    if (!user) {
      onClose()
      navigate('/login')
      return
    }
    if (!shipping.trim()) {
      setError('Please enter a shipping address.')
      return
    }
    setPlacing(true)
    setError('')
    try {
      for (const { item, quantity } of cartItems) {
        await api.post('/orders', {
          item_id: item.id,
          quantity,
          shipping_address: shipping,
          notes,
        })
      }
      setSuccess(true)
      clearCart()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order.')
    } finally {
      setPlacing(false)
    }
  }

  if (success) {
    return (
      <div className="cart-overlay" onClick={onClose}>
        <div className="cart-drawer" onClick={e => e.stopPropagation()}>
          <div className="cart-success">
            <div className="cart-success-icon">✅</div>
            <h3>Order placed!</h3>
            <p>The admin has been notified. You'll be contacted to arrange delivery and payment.</p>
            <button className="btn-primary" onClick={onClose}>Continue shopping</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={e => e.stopPropagation()}>
        <div className="cart-header">
          <h3>Your cart {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}</h3>
          <button className="cart-close" onClick={onClose}>✕</button>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <span>🛒</span>
            <p>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map(({ item, quantity }) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-img">
                    {item.images?.[0]
                      ? <img src={item.images[0].url} alt={item.name} />
                      : <span>📦</span>}
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">
                      UGX {(item.price_ugx * quantity).toLocaleString()}
                    </div>
                    {item.price_ssp && (
                      <div className="cart-item-alt">
                        ≈ SSP {(item.price_ssp * quantity).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="cart-item-qty">
                    <button onClick={() => updateQuantity(item.id, quantity - 1)}>−</button>
                    <span>{quantity}</span>
                    <button onClick={() => updateQuantity(item.id, quantity + 1)}>+</button>
                  </div>
                  <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}>✕</button>
                </div>
              ))}
            </div>

            <div className="cart-totals">
              <div className="cart-total-row">
                <span>Total (UGX)</span>
                <strong>UGX {cartItems.reduce((s, c) => s + c.item.price_ugx * c.quantity, 0).toLocaleString()}</strong>
              </div>
              {cartItems[0]?.item?.price_ssp && (
                <div className="cart-total-row" style={{ marginTop: 4, fontSize: 13, color: '#888' }}>
                  <span>≈ Total (SSP)</span>
                  <span>SSP {cartItems.reduce((s, c) => s + (c.item.price_ssp || 0) * c.quantity, 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="cart-checkout">
              <label>Delivery address *</label>
              <input
                type="text"
                placeholder="e.g. Juba, Gudele Block 3"
                value={shipping}
                onChange={e => setShipping(e.target.value)}
              />
              <label>Notes (optional)</label>
              <textarea
                placeholder="Any special instructions..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
              {error && <p className="cart-error">{error}</p>}
              <button
                className="btn-primary cart-order-btn"
                onClick={handleOrder}
                disabled={placing}
              >
                {placing ? 'Placing order…' : user ? 'Place order' : 'Login to order'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}