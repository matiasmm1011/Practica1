import { useState, useEffect, useRef } from 'react'
import ProductCard from './ProductCard'
import Cart from './Cart'
import './App.css'

const API_URL = 'https://dummyjson.com/products'
const CATEGORIES = ['beauty', 'fragrances', 'furniture', 'groceries']
const SEARCH_DEBOUNCE_MS = 300
const FETCH_TIMEOUT_MS = 10000

function App() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const cartPanelRef = useRef(null)
  const cartBtnRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    let timedOut = false
    let fetchTimeoutId

    const debounceId = setTimeout(() => {
      setLoading(true)
      setError(null)

      fetchTimeoutId = setTimeout(() => {
        timedOut = true
        controller.abort()
      }, FETCH_TIMEOUT_MS)

      const url = search
        ? `${API_URL}/search?q=${encodeURIComponent(search)}&limit=100`
        : category !== 'all'
          ? `${API_URL}/category/${category}?limit=100`
          : `${API_URL}?limit=100`

      fetch(url, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((data) => {
          clearTimeout(fetchTimeoutId)
          setProducts(data.products ?? [])
          setLoading(false)
        })
        .catch((err) => {
          clearTimeout(fetchTimeoutId)
          if (err.name === 'AbortError') {
            if (timedOut) {
              setError('La carga tardó demasiado. Revisá tu conexión a internet e intentá de nuevo.')
              setLoading(false)
            }
            return
          }
          setError('No se pudieron cargar los productos. Revisá tu conexión a internet e intentá de nuevo.')
          setLoading(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(debounceId)
      clearTimeout(fetchTimeoutId)
      controller.abort()
    }
  }, [search, category])

  useEffect(() => {
    if (!showCart) return

    cartPanelRef.current?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setShowCart(false)
        cartBtnRef.current?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showCart])

  function addToCart(product) {
    if (product.stock <= 0) return

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.min(item.stock, Math.max(1, item.quantity + delta)) }
          : item
      )
    )
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  function closeCart() {
    setShowCart(false)
    cartBtnRef.current?.focus()
  }

  function checkout() {
    alert(`Compra realizada. Total: $${total.toFixed(2)}`)
    setCart([])
    setShowCart(false)
  }

  const total = cart.reduce((sum, item) => {
    const discountFactor = 1 - (item.discountPercentage ?? 0) / 100
    return sum + item.price * discountFactor * item.quantity
  }, 0)

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const visibleProducts = products.filter(
    (p) => category === 'all' || p.category === category
  )

  return (
    <div className="app">
      <header className="header">
        <h1>Tienda Tech</h1>
        <input
          className="search"
          type="search"
          aria-label="Buscar productos"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filtrar por categoría"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">Todas</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          ref={cartBtnRef}
          className="cart-btn"
          onClick={() => setShowCart(!showCart)}
        >
          Carrito ({cartCount})
        </button>
      </header>

      <main>
        {loading && <p className="loading">Cargando...</p>}

        {!loading && error && <p className="error">{error}</p>}

        {!loading && !error && visibleProducts.length === 0 && (
          <p>Sin resultados. Probá con otra búsqueda o categoría.</p>
        )}

        <div className="grid">
          {visibleProducts.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={() => addToCart(p)} />
          ))}
        </div>
      </main>

      {showCart && <div className="cart-backdrop" onClick={closeCart} />}

      {showCart && (
        <Cart
          ref={cartPanelRef}
          items={cart}
          total={total}
          onQty={changeQty}
          onRemove={removeFromCart}
          onCheckout={checkout}
          onClose={closeCart}
        />
      )}
    </div>
  )
}

export default App
