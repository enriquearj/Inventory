import { useApp } from '../App'

export default function BottomNav() {
  const { page, setPage, counts, damagedCounts, products, categories, labelSelected } = useApp()

  const countedCount = Object.keys(counts).filter(k => counts[k] > 0).length
  const damagedCount = Object.keys(damagedCounts).filter(k => damagedCounts[k] > 0).length
  const totalUnits = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
  const pct = products.length > 0 ? Math.round((countedCount / products.length) * 100) : 0
  const activeCats = new Set(
    Object.keys(counts).filter(k => counts[k] > 0)
      .map(k => products.find(p => p.id == k)?.category_id).filter(Boolean)
  ).size
  const avg = countedCount > 0 ? Math.round(totalUnits / countedCount) : 0

  return (
    <nav className="bottom-nav">
      <div className="sidebar-brand">
        <div className="sidebar-brand-badge">G&Z</div>
        <span className="sidebar-brand-name">G&Z LLC</span>
      </div>
      <button className={`nav-item${page === 'inv' ? ' active' : ''}`} onClick={() => setPage('inv')}>
        <span className="ni">📦</span>
        <span className="nl">Inventario</span>
        <span className={`nav-badge${countedCount > 0 ? ' show' : ''}`}>{countedCount || ''}</span>
      </button>
      <button className={`nav-item${page === 'dmg' ? ' active' : ''}`} onClick={() => setPage('dmg')}>
        <span className="ni">⚠️</span>
        <span className="nl">Dañados</span>
        <span className={`nav-badge${damagedCount > 0 ? ' show' : ''}`}
          style={{ background: '#ea580c' }}>{damagedCount || ''}</span>
      </button>
	  <button className={`nav-item${page === 'lbl' ? ' active' : ''}`} onClick={() => setPage('lbl')}>
        <span className="ni">🏷</span>
        <span className="nl">Etiquetas</span>
        <span className={`nav-badge${labelSelected.size > 0 ? ' show' : ''}`}>{labelSelected.size || ''}</span>
      </button>
      <button className={`nav-item${page === 'admin' ? ' active' : ''}`} onClick={() => setPage('admin')}>
        <span className="ni">⚙️</span>
        <span className="nl">Admin</span>
      </button>
      <div className="sidebar-stats">
        <div className="ss-title">Progreso</div>
        <div className="ss-pct">{pct}%</div>
        <div className="ss-bar"><div className="ss-bar-fill" style={{ width: `${pct}%` }} /></div>
        <div className="ss-row">
          <span className="ss-k">Productos</span>
          <span className="ss-v">{countedCount}<span className="ss-of">/{products.length}</span></span>
        </div>
        <div className="ss-row">
          <span className="ss-k">Categorías</span>
          <span className="ss-v">{activeCats}<span className="ss-of">/{categories.length}</span></span>
        </div>
        <div className="ss-row">
          <span className="ss-k">Promedio</span>
          <span className="ss-v">{avg}<span className="ss-of"> u/p</span></span>
        </div>
      </div>
    </nav>
  )
}
