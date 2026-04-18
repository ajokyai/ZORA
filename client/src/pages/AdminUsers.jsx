import { useEffect, useState } from "react"
import api from "../api/axios"
import "./Admin.css"

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users")
      setUsers(res.data.users)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.username.toLowerCase().includes(search.toLowerCase()) ||
    user.role.toLowerCase().includes(search.toLowerCase())
  )

  const roleColor = (role) => {
    switch (role) {
      case "admin": return "#e74c3c"
      case "seller": return "#f39c12"
      default: return "#3498db"
    }
  }

  return (
    <div className="admin-page">
      <h2>👑 Admin Users Dashboard</h2>

      {/* Search */}
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="admin-search"
      />

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <div className="table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Country</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>

                  <td>
                    <span
                      style={{
                        background: roleColor(user.role),
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontSize: "12px"
                      }}
                    >
                      {user.role}
                    </span>
                  </td>

                  <td>{user.country?.name || "-"}</td>

                  <td>
                    {new Date(user.created_at).toLocaleDateString()}
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