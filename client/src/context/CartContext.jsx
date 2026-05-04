import { createContext, useContext, useState, useCallback } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]) // [{item, quantity}]

  const addToCart = useCallback((item, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) {
        return prev.map(c =>
          c.item.id === item.id
            ? { ...c, quantity: c.quantity + quantity }
            : c
        )
      }
      return [...prev, { item, quantity }]
    })
  }, [])

  const removeFromCart = useCallback((itemId) => {
    setCartItems(prev => prev.filter(c => c.item.id !== itemId))
  }, [])

  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity < 1) return
    setCartItems(prev =>
      prev.map(c => c.item.id === itemId ? { ...c, quantity } : c)
    )
  }, [])

  const clearCart = useCallback(() => setCartItems([]), [])

  const cartCount = cartItems.reduce((sum, c) => sum + c.quantity, 0)

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)