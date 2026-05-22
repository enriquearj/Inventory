import { useApp } from '../App'

export default function BottomNav() {
  const { page, setPage, counts, products, labelSelected } = useApp()

  const countedCount = Object.keys(counts).filter(k => counts[k] > 0).length

  return (
    <nav className="bottom-nav">
      <button className={`nav-item${page === 'inv' ? ' active' : ''}`} onClick={() => setPage('inv')}>
        <span className="ni">📦</span>
        <span className="nl">Inventario</span>
        <span className={`nav-badge${countedCount > 0 ? ' show' : ''}`}>{countedCount || ''}</span>
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
    </nav>
  )
}
