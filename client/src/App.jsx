import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import WhatsAppButton from "./components/WhatsAppButton"

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import ItemDetail from './pages/ItemDetail'
import ForgotPassword from './pages/ForgotPassword'
import AdminUsers from './pages/AdminUsers'



import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />

        <main className="main-content">
          <Switch>

            {/* Public Routes */}
            <Route exact path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/forgot-password" component={ForgotPassword} />

            {/* Items Routes (order matters) */}
            <Route exact path="/items" component={Items} />
            <Route path="/items/:id" component={ItemDetail} />

            {/* Protected Route */}
            <ProtectedRoute exact path="/dashboard" component={Dashboard} />
            <ProtectedRoute exact path="/admin/users" component={AdminUsers} />
            {/* 404 Page */}
            <Route
              path="*"
              render={() => (
                <div className="not-found">
                  <h2>404 — Page not found</h2>
                  <a href="/">Go home</a>
                </div>
              )}
            />

          </Switch>
        </main>
         <WhatsAppButton />
      </Router>
    </AuthProvider>
  )
}

export default App