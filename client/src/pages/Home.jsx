import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import './Home.css'

const CATEGORIES = ['All', 'Clothes', 'Shoes', 'Electronics', 'Beauty']
const CATEGORY_EMOJI = { clothes: '👕', shoes: '👟', electronics: '📱', beauty: '💄', other: '📦' }

export default function Home() {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('all')
  const [country, setCountry] = useState('SS')

  useEffect(() => {
    api.get(`/items?country=${country}&category=${category}`)
      .then(res => setItems(res.data.items.slice(0, 4)))
      .catch(() => {})
  }, [category, country])

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-tag">Kampala → Juba · Every Sunday</div>
          <h1>Kampala prices,<br /><span>delivered to Juba</span></h1>
          <p>Buy clothes, phones & more at Kampala market prices. We handle sourcing, transport & delivery to your pickup point.</p>
          <div className="hero-btns">
            <Link to="/items" className="hero-btn-primary">Shop Now</Link>
            <a href="#how" className="hero-btn-outline">How it works</a>
          </div>
        </div>
        <div className="hero-route">
          <div className="route-cities">
            <div className="route-city"><span className="city-icon">🏪</span><span>Kampala</span></div>
            <div className="route-arrow">→→→</div>
            <div className="route-city"><span className="city-icon">📦</span><span>Juba</span></div>
          </div>
          <div className="route-note">Next shipment: Sunday</div>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="section-inner">
          <h2 className="section-title">How it works</h2>
          <div className="steps">
            {[
              {n:'1',title:'Browse',desc:'Pick items listed from Kampala at market prices'},
              {n:'2',title:'Order',desc:'Pay via local agent or mobile money transfer'},
              {n:'3',title:'Ship',desc:'All orders batch shipped every Sunday from Kampala'},
              {n:'4',title:'Pickup',desc:'Collect your order Monday morning in Juba'},
            ].map(s => (
              <div className="step" key={s.n}>
                <div className="step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="products-section">
        <div className="section-inner">
          <div className="products-header">
            <h2 className="section-title">This week's listings</h2>
            <div className="currency-toggle">
              <button className={country==='SS'?'active':''} onClick={() => setCountry('SS')}>SSP</button>
              <button className={country==='KE'?'active':''} onClick={() => setCountry('KE')}>KES</button>
              <button className={country==='UG'?'active':''} onClick={() => setCountry('UG')}>UGX</button>
            </div>
          </div>
          <div className="cat-tabs">
            {CATEGORIES.map(c => (
              <button key={c} className={`cat-tab ${category===c.toLowerCase()?'active':''}`} onClick={() => setCategory(c.toLowerCase())}>{c}</button>
            ))}
          </div>
          <div className="products-grid">
            {items.length === 0 ? (
              <p className="empty-msg">No items yet. Check back soon!</p>
            ) : items.map(item => (
              <Link to={`/items/${item.id}`} key={item.id} className="product-card">
                <div className="product-img">
                  {item.images[0] ? <img src={item.images[0].url} alt={item.name} /> : <span className="product-emoji">{CATEGORY_EMOJI[item.category]||'📦'}</span>}
                  <span className="product-badge">Kampala</span>
                </div>
                <div className="product-body">
                  <div className="product-name">{item.name}</div>
                  <div className="product-seller">by {item.seller_display_name}</div>
                  <div className="product-prices">
                    <span className="price-main">{item.currency_display} {item.price_display?.toLocaleString()}</span>
                    <span className="price-kes">KES {item.price_kes?.toLocaleString()}</span>
                  </div>
                  <button className="order-btn">Order This Week</button>
                </div>
              </Link>
            ))}
          </div>
          <div className="view-all-wrap">
            <Link to="/items" className="btn-secondary">View all products →</Link>
          </div>
        </div>
      </section>

      <div className="deadline-banner">
        <strong>Order deadline: Friday 5pm</strong>
        <span>All orders batch ship Sunday · Arrive Juba Monday</span>
      </div>

      <section className="trust-section">
        <div className="trust-grid">
          {[
            {icon:'💰',title:'Clear pricing',desc:'Price shown includes transport & service fee. No hidden charges.'},
            {icon:'📍',title:'Track your order',desc:'Follow your order from Kampala to your pickup point in Juba.'},
            {icon:'🤝',title:'Safe payment',desc:'Pay via trusted local agents or mobile money transfer partners.'},
            {icon:'🚌',title:'Weekly shipments',desc:'Goods sent in bulk every Sunday — lower cost, reliable schedule.'},
          ].map(t => (
            <div className="trust-item" key={t.title}>
              <div className="trust-icon">{t.icon}</div>
              <strong>{t.title}</strong>
              <p>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
