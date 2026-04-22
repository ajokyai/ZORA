import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}