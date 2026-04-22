import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import WhatsAppButton from "./components/WhatsAppButton";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Items from "./pages/Items";
import ItemDetail from "./pages/ItemDetail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminUsers from "./pages/AdminUsers";
import AdminItems from './pages/AdminItems'

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />

        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Items Routes */}
            <Route path="/items" element={<Items />} />
            <Route path="/items/:id" element={<ItemDetail />} />
            <Route path="/admin/items" element={<AdminItems />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            {/* Admin Only */}
            <Route element={<ProtectedRoute roles={["admin"]} />}>
              <Route path="/admin/users" element={<AdminUsers />} />
            </Route>

            {/* 404 Page */}
            <Route
              path="*"
              element={
                <div className="not-found">
                  <h2>404 — Page not found</h2>
                  <a href="/">Go home</a>
                </div>
              }
            />
          </Routes>
        </main>

        <WhatsAppButton />
      </Router>
    </AuthProvider>
  );
}

export default App;