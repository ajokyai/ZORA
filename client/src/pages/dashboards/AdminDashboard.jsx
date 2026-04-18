import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import './Dashboard.css'
import './AdminDashboard.css'

const CATEGORIES = ['clothes', 'shoes', 'electronics', 'beauty', 'other']

const ADMINS = [
  {
    name: 'Atem Akol',
    whatsapp: '211925110119',
    instagram: null,
    phone: '+211925110119',
    location: 'Nile Blue Water Company - River Side, Konyo Konyo, Juba, South Sudan',
  },
  {
    name: 'Goch Akol',
    whatsapp: '254729571181',
    instagram: null,
    phone: '+254 729571181',
    location: 'Juba, South Sudan',
  },
  {
    name: 'John Garang',
    whatsapp: '+211923198518',
    instagram: 'star_vaga',
    phone: '+21923198518',
    location: 'Sherikat Dandy Hotel, Juba, South Sudan',
  },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const [tab, setTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: 'clothes', price_kes: '', stock: '' })
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [saving, setSaving] = useState(false)

  // Per-row image upload
  const [uploadingId, setUploadingId] = useState(null)
  const fileInputRefs = useRef({})

  useEffect(() => {
    Promise.all([
      api.get('/orders'),
      api.get('/items'),
      api.get('/admin/users'),
    ])
      .then(([o, i, u]) => {
        setOrders(o.data.orders)
        setItems(i.data.items)
        setUsers(u.data.users)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total_kes, 0)

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status })
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
    } catch { alert('Failed to update order') }
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5)
    setImages(files)
    setPreviews(files.map(f => URL.createObjectURL(f)))
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name)
      formData.append('description', form.description)
      formData.append('category', form.category)
      formData.append('price_kes', form.price_kes)
      formData.append('stock', form.stock || 1)
      images.forEach(img => formData.append('images', img))
      const res = await api.post('/items', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setItems([res.data.item, ...items])
      setForm({ name: '', description: '', category: 'clothes', price_kes: '', stock: '' })
      setImages([])
      setPreviews([])
      setShowAddForm(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  // Upload images to an existing item row
  const handleRowImageUpload = async (itemId, files) => {
    if (!files || files.length === 0) return
    setUploadingId(itemId)
    try {
      const formData = new FormData()
      Array.from(files).slice(0, 5).forEach(f => formData.append('images', f))
      await api.post(`/items/${itemId}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const res = await api.get(`/items/${itemId}`)
      setItems(prev => prev.map(it => it.id === itemId ? res.data.item : it))
    } catch (err) {
      alert(err.response?.data?.error || 'Image upload failed')
    } finally {
      setUploadingId(null)
      if (fileInputRefs.current[itemId]) fileInputRefs.current[itemId].value = ''
    }
  }

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role })
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u))
    } catch { alert('Failed to update role') }
  }

  return (
    <div className="dashboard">
      <div className="dash-hero">
        <div className="dash-hero-inner">
          <h1><span>ZORA</span> Admin Panel</h1>
          <p>Platform overview · {user.display_name}</p>
        </div>
      </div>

      <div className="dash-body">
        <div className="dash-grid">
          <div className="dash-card"><div className="dash-card-icon">🛒</div><h3>Total Orders</h3><p style={{fontSize:'1.75rem',fontWeight:'800',color:'var(--navy)',fontFamily:'Syne'}}>{orders.length}</p></div>
          <div className="dash-card"><div className="dash-card-icon">📦</div><h3>Total Listings</h3><p style={{fontSize:'1.75rem',fontWeight:'800',color:'var(--navy)',fontFamily:'Syne'}}>{items.length}</p></div>
          <div className="dash-card"><div className="dash-card-icon">⏳</div><h3>Pending Orders</h3><p style={{fontSize:'1.75rem',fontWeight:'800',color:'var(--gold-dk)',fontFamily:'Syne'}}>{orders.filter(o=>o.status==='pending').length}</p></div>
          <div className="dash-card"><div className="dash-card-icon">💰</div><h3>Revenue (KES)</h3><p style={{fontSize:'1.4rem',fontWeight:'800',color:'var(--success)',fontFamily:'Syne'}}>{totalRevenue.toLocaleString()}</p></div>
        </div>

        <div className="admin-tabs">
          {['orders','items','users','contacts'].map(t => (
            <button key={t} className={tab===t?'active':''} onClick={() => setTab(t)}>
              {t === 'orders' ? 'All Orders' : t === 'items' ? 'All Items' : t === 'users' ? 'Users' : 'Contacts'}
            </button>
          ))}
        </div>

        {loading ? <div className="loading">Loading…</div> : (
          <>
            {/* ── ORDERS TAB ── */}
            {tab === 'orders' && (
              <>
                <div className="dash-section-title">All Orders</div>
                {orders.length === 0 ? <div className="empty-orders">No orders yet.</div> : (
                  <table className="orders-table">
                    <thead><tr><th>#</th><th>Item</th><th>Customer</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th><th>Update</th></tr></thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td>{o.id}</td><td>{o.item_name}</td><td>{o.customer_username}</td>
                          <td>{o.quantity}</td><td>KES {o.total_kes?.toLocaleString()}</td>
                          <td><span className={`status-badge status-${o.status}`}>{o.status}</span></td>
                          <td>{new Date(o.created_at).toLocaleDateString()}</td>
                          <td>
                            <select value={o.status} onChange={e => handleStatusUpdate(o.id, e.target.value)} className="status-select">
                              {['pending','confirmed','shipped','delivered','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* ── ITEMS TAB ── */}
            {tab === 'items' && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                  <div className="dash-section-title" style={{marginBottom:0}}>All Listings</div>
                  <button className="btn-primary" style={{width:'auto',padding:'0.5rem 1.25rem'}} onClick={() => setShowAddForm(!showAddForm)}>
                    {showAddForm ? 'Cancel' : '+ Add Item'}
                  </button>
                </div>

                {showAddForm && (
                  <form className="add-item-form" onSubmit={handleAdd}>
                    <h3>Add new item</h3>
                    <div className="form-grid">
                      <label>Item Name *
                        <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Men's Cotton Shirt" />
                      </label>
                      <label>Category
                        <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                        </select>
                      </label>
                      <label>Price (KES) *
                        <input required type="number" value={form.price_kes} onChange={e => setForm({...form, price_kes: e.target.value})} placeholder="2500" />
                      </label>
                      <label>Stock
                        <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} placeholder="10" />
                      </label>
                      <label style={{gridColumn:'1/-1'}}>Description
                        <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the item…" rows={3} />
                      </label>
                      <label style={{gridColumn:'1/-1'}}>
                        Product Images (up to 5)
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{marginTop:'0.4rem'}} />
                      </label>
                      {previews.length > 0 && (
                        <div style={{gridColumn:'1/-1', display:'flex', gap:'0.5rem', flexWrap:'wrap'}}>
                          {previews.map((src, i) => (
                            <img key={i} src={src} alt={`preview ${i}`}
                              style={{width:80, height:80, objectFit:'cover', borderRadius:8, border:'2px solid var(--gold)'}} />
                          ))}
                        </div>
                      )}
                    </div>
                    <button type="submit" className="btn-primary" disabled={saving} style={{width:'auto',padding:'0.6rem 1.5rem'}}>
                      {saving ? 'Uploading & saving…' : 'Add Item'}
                    </button>
                  </form>
                )}

                {items.length === 0 ? <div className="empty-orders">No items yet.</div> : (
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price (KES)</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Add Images</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td>
                            {item.images?.[0]
                              ? <img src={item.images[0].url} alt={item.name} style={{width:48,height:48,objectFit:'cover',borderRadius:6}} />
                              : <span style={{fontSize:'1.5rem'}}>📦</span>}
                          </td>
                          <td><strong>{item.name}</strong></td>
                          <td>{item.category}</td>
                          <td>KES {item.price_kes?.toLocaleString()}</td>
                          <td>{item.stock}</td>
                          <td>
                            <span className={`status-badge ${item.is_active?'status-delivered':'status-cancelled'}`}>
                              {item.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              style={{display:'none'}}
                              ref={el => fileInputRefs.current[item.id] = el}
                              onChange={e => handleRowImageUpload(item.id, e.target.files)}
                            />
                            <button
                              className="btn-secondary"
                              style={{fontSize:'0.75rem', padding:'0.3rem 0.75rem', whiteSpace:'nowrap'}}
                              disabled={uploadingId === item.id}
                              onClick={() => fileInputRefs.current[item.id]?.click()}
                            >
                              {uploadingId === item.id
                                ? 'Uploading…'
                                : item.images?.length > 0 ? '+ More Images' : '📷 Add Images'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* ── USERS TAB ── */}
            {tab === 'users' && (
              <>
                <div className="dash-section-title">All Users</div>
                {users.length === 0 ? <div className="empty-orders">No users yet.</div> : (
                  <table className="orders-table">
                    <thead><tr><th>#</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th>Change Role</th></tr></thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td><strong>{u.username}</strong></td>
                          <td>{u.email}</td>
                          <td><span className={`status-badge status-${u.role === 'admin' ? 'delivered' : 'pending'}`}>{u.role}</span></td>
                          <td>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td>
                            {u.id !== user.id && (
                              <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} className="status-select">
                                {['customer','admin'].map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {/* ── CONTACTS TAB ── */}
            {tab === 'contacts' && (
              <>
                <div className="dash-section-title">Our Admins</div>
                <div className="admin-contacts">
                  {ADMINS.map((admin, idx) => (
                    <div key={idx} className="admin-contact-card">
                      <div className="admin-contact-header">
                        <span className="admin-avatar">👤</span>
                        <div>
                          <strong className="admin-name">{admin.name}</strong>
                          <p className="admin-location">📍 {admin.location}</p>
                        </div>
                      </div>
                      <div className="admin-contact-links">
                        <a href={`https://wa.me/${admin.whatsapp}`} target="_blank" rel="noreferrer" className="contact-link whatsapp-link">
                          <span>📱</span> WhatsApp
                        </a>
                        {admin.instagram && (
                          <a href={`https://instagram.com/${admin.instagram}`} target="_blank" rel="noreferrer" className="contact-link instagram-link">
                            <span>📸</span> Instagram
                          </a>
                        )}
                        <a href={`tel:${admin.phone}`} className="contact-link phone-link">
                          <span>📞</span> {admin.phone}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}