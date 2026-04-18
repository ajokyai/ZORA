import { useAuth } from '../context/AuthContext'
import CustomerDashboard from './dashboards/CustomerDashboard'
import AdminDashboard from './dashboards/AdminDashboard'

export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'seller') return <SellerDashboard />
  if (user?.role === 'admin') return <AdminDashboard />
  return <CustomerDashboard />
}
