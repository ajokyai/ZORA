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
  const [form, setForm] = useState({ name: '', description: '', category: 'clothes', price_kes: '', stock: '', sizes: '' })
  const [images, setImages] = useState([])
  const [previews, setPreviews] = useState([])
  const [saving, setSaving] = useState(false)

  const [uploadingId, setUploadingId] = useState(null)
  const [wipingId, setWipingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const fileInputRefs = useRef({})

  useEffect(() => {
    Promise.all([
      api.get('/orders'),
      api.get('/admin/items'),
      api.get('/admin/users'),
    ])
      .then(([o, i, u]) => {
        setOrders(o.data.orders || [])
        setItems(i.data.items || [])
        setUsers(u.data.users || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.total_kes || 0), 0)

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
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
      Object.entries(form).forEach(([k, v]) => formData.append(k, v))
      images.forEach(img => formData.append('images', img))
      const res = await api.post('/items', formData)
      setItems(prev => [res.data.item, ...prev])
      setShowAddForm(false)
      setForm({ name: '', description: '', category: 'clothes', price_kes: '', stock: '', sizes: '' })
      setImages([])
      setPreviews([])
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  const handleRowImageUpload = async (itemId, files) => {
    if (!files?.length) return
    setUploadingId(itemId)
    try {
      const fd = new FormData()
      Array.from(files).slice(0, 5).forEach(f => fd.append('images', f))
      await api.post(`/items/${itemId}/images`, fd)
      const res = await api.get(`/items/${itemId}`)
      setItems(prev => prev.map(i => i.id === itemId ? res.data.item : i))
    } catch {
      alert('Upload failed')
    } finally {
      setUploadingId(null)
      if (fileInputRefs.current[itemId]) fileInputRefs.current[itemId].value = ''
    }
  }

  const handleWipeImages = async (item) => {
    if (!window.confirm('Clear all images?')) return
    setWipingId(item.id)
    try {
      await api.delete(`/items/${item.id}/images`)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, images: [] } : i))
    } catch { alert('Failed') }
    finally { setWipingId(null) }
  }

  const handleDeactivate = async (item) => {
    setTogglingId(item.id)
    try {
      await api.delete(`/items/${item.id}`)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: false } : i))
    } catch { alert('Failed') }
    finally { setTogglingId(null) }
  }

  const handleRestore = async (item) => {
    setTogglingId(item.id)
    try {
      await api.put(`/items/${item.id}`, { is_active: true })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: true } : i))
    } catch { alert('Failed') }
    finally { setTogglingId(null) }
  }

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    } catch { alert('Failed role update') }
  }

  return (
    <div className="dashboard">

      <div className="dash-hero">
        <h1><span>ZORA</span> Admin Panel</h1>
        <p>{user?.display_name}</p>
      </div>

      <div className="dash-grid">
        <div>Orders: {orders.length}</div>
        <div>Items: {items.length}</div>
        <div>Pending: {orders.filter(o => o.status === 'pending').length}</div>
        <div>Revenue: KES {totalRevenue.toLocaleString()}</div>
      </div>

      <div className="admin-tabs">
        {['orders', 'items', 'users', 'contacts'].map(t => (
          <button
            key={t}
            className={tab === t ? 'active' : ''}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {/* ORDERS */}
          {tab === 'orders' && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Item</th><th>User</th><th>Qty</th>
                    <th>Total (KES)</th><th>Status</th><th>Date</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center' }}>No orders found</td></tr>
                  ) : (
                    orders.map(o => (
                      <tr key={o.id}>
                        <td>{o.id}</td>
                        <td>{o.item_name}</td>
                        <td>{o.customer_username}</td>
                        <td>{o.quantity}</td>
                        <td>KES {o.total_kes?.toLocaleString()}</td>
                        <td>
                          <span className={`status-badge status-${o.status}`}>{o.status}</span>
                        </td>
                        <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '-'}</td>
                        <td>
                          <select value={o.status} onChange={(e) => handleStatusUpdate(o.id, e.target.value)}>
                            {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ITEMS */}
          {tab === 'items' && (
            <div className="items-tab">
              <div className="items-tab-header">
                <h2>Items</h2>
                <button className="btn-primary" onClick={() => setShowAddForm(v => !v)}>
                  {showAddForm ? 'Cancel' : '+ Add Item'}
                </button>
              </div>

              {/* ADD ITEM FORM */}
              {showAddForm && (
                <form className="add-item-form" onSubmit={handleAdd}>
                  <input
                    placeholder="Name *"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Price (KES) *"
                    value={form.price_kes}
                    onChange={e => setForm(f => ({ ...f, price_kes: e.target.value }))}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                  />
                  <input
                    placeholder="Sizes (e.g. S,M,L)"
                    value={form.sizes}
                    onChange={e => setForm(f => ({ ...f, sizes: e.target.value }))}
                  />
                  <input type="file" multiple accept="image/*" onChange={handleImageChange} />
                  {previews.length > 0 && (
                    <div className="preview-row">
                      {previews.map((p, i) => (
                        <img key={i} src={p} alt="preview" className="preview-thumb" />
                      ))}
                    </div>
                  )}
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Item'}
                  </button>
                </form>
              )}

              {/* ITEMS TABLE */}
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th><th>Name</th><th>Category</th><th>Price (KES)</th>
                      <th>Stock</th><th>Images</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: 'center' }}>No items found</td></tr>
                    ) : (
                      items.map(item => (
                        <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.5 }}>
                          <td>{item.id}</td>
                          <td>{item.name}</td>
                          <td>{item.category}</td>
                          <td>KES {item.price_kes?.toLocaleString()}</td>
                          <td>{item.stock}</td>
                          <td>
                            <div className="thumb-row">
                              {(item.images || []).slice(0, 3).map((img, i) => (
                                <img
                                  key={i}
                                  src={typeof img === 'string' ? img : img.url}
                                  alt=""
                                  className="admin-thumb"
                                />
                              ))}
                              {(item.images || []).length === 0 && (
                                <span className="no-img">No images</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${item.is_active ? 'status-confirmed' : 'status-cancelled'}`}>
                              {item.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div className="action-col">
                              {/* Replace images */}
                              <label className="btn-sm btn-upload">
                                {uploadingId === item.id ? 'Uploading...' : '📷 Replace'}
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  ref={el => fileInputRefs.current[item.id] = el}
                                  onChange={e => handleRowImageUpload(item.id, e.target.files)}
                                />
                              </label>

                              {/* Wipe images */}
                              <button
                                className="btn-sm btn-danger"
                                onClick={() => handleWipeImages(item)}
                                disabled={wipingId === item.id || (item.images || []).length === 0}
                              >
                                {wipingId === item.id ? '...' : '🗑 Images'}
                              </button>

                              {/* Activate / Deactivate */}
                              {item.is_active ? (
                                <button
                                  className="btn-sm btn-danger"
                                  onClick={() => handleDeactivate(item)}
                                  disabled={togglingId === item.id}
                                >
                                  {togglingId === item.id ? '...' : 'Deactivate'}
                                </button>
                              ) : (
                                <button
                                  className="btn-sm btn-success"
                                  onClick={() => handleRestore(item)}
                                  disabled={togglingId === item.id}
                                >
                                  {togglingId === item.id ? '...' : 'Restore'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th>Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>No users found</td></tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.display_name || u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`status-badge ${u.role === 'admin' ? 'status-confirmed' : 'status-pending'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                        <td>
                          <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CONTACTS */}
          {tab === 'contacts' && (
            <div className="contacts-tab">
              <h2>Admin Contacts</h2>
              <div className="contacts-grid">
                {ADMINS.map((admin, i) => (
                  <div key={i} className="contact-card">
                    <h3>{admin.name}</h3>
                    <p>📍 {admin.location}</p>
                    <p>📞 <a href={`tel:${admin.phone}`}>{admin.phone}</a></p>
                    <p>
                      💬 <a
                        href={`https://wa.me/${admin.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </p>
                    {admin.instagram && (
                      <p>
                        📸 <a
                          href={`https://instagram.com/${admin.instagram}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          @{admin.instagram}
                        </a>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}