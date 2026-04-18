import { Route, Redirect } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ component: Component, roles, ...rest }) {
  const { user, loading } = useAuth()

  return (
    <Route
      {...rest}
      render={(props) => {
        if (loading) return <div>Loading...</div>

        if (!user) return <Redirect to="/login" />

        // 🚨 ROLE CHECK (THIS IS WHAT YOU WERE MISSING)
        if (roles && !roles.includes(user.role)) {
          return <Redirect to="/dashboard" />
        }

        return <Component {...props} />
      }}
    />
  )
}