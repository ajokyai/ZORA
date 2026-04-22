import { useEffect, useState } from "react"
import api from "../api/axios"

export default function AdminItems() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all") // all | active | inactive
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const res = await api.get("/admin/items")
      setItems(res.data.items)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Deactivate "${item.name}"?`)) return
    setDeleting(item.id)
    try {
      await api.delete(`/items/${item.id}`)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: false } : i))
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed")
    } finally {
      setDeleting(null)
    }
  }

  const handleRestore = async (item) => {
    setDeleting(item.id)
    try {
      await api.put(`/items/${item.id}`, { is_active: true })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: true } : i))
    } catch (err) {
      alert(err.response?.data?.error || "Restore failed")
    } finally {
      setDeleting(null)
    }
  }

  const filtered = items.filter(item => {
    const matchSearch =
      (item.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === "all" ||
      (filter === "active" && item.is_active) ||
      (filter === "inactive" && !item.is_active)
    return matchSearch && matchFilter
  })

  return (
    <div className="admin-page">
      <h2>🛍️ Admin Items Dashboard</h2>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-search"
          style={{ flex: 1, minWidth: "200px" }}
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" }}
        >
          <option value="all">All Items</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>

      {loading ? (
        <p>Loading items...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#888", textAlign: "center", marginTop: "40px" }}>No items found.</p>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price (KES)</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.5 }}>
                  <td>
                    {item.images?.[0]?.url
                      ? <img src={item.images[0].url} alt={item.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} />
                      : <span style={{ fontSize: 28 }}>📦</span>
                    }
                  </td>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td>{item.category}</td>
                  <td>KES {item.price_kes?.toLocaleString()}</td>
                  <td>
                    <span style={{
                      color: item.stock === 0 ? "#e74c3c" : item.stock < 5 ? "#f39c12" : "#27ae60",
                      fontWeight: 600
                    }}>
                      {item.stock === 0 ? "Sold out" : item.stock}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      background: item.is_active ? "#27ae60" : "#95a5a6",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 12
                    }}>
                      {item.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td>
                    {item.is_active ? (
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deleting === item.id}
                        style={{
                          background: "#e74c3c",
                          color: "white",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500
                        }}
                      >
                        {deleting === item.id ? "..." : "🗑 Deactivate"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestore(item)}
                        disabled={deleting === item.id}
                        style={{
                          background: "#27ae60",
                          color: "white",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 500
                        }}
                      >
                        {deleting === item.id ? "..." : "♻️ Restore"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}