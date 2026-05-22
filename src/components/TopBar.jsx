import { useApp } from '../App'

export default function TopBar() {
  const { page, setPage, counts, products, exportCsv, resetCounts, showToast, setHelpOpen } = useApp()

  const countedCount = Object.keys(counts).filter(k => counts[k] > 0).length

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-badge">G&Z</div>
        <div>
          <div className="brand-name">G&Z LLC</div>
          <div className="brand-sub">Sistema de Almacén</div>
        </div>
      </div>
      <div className="topbar-right">
        <button className="tbtn help-btn" onClick={() => setHelpOpen(true)}>❓</button>
        {page === 'inv' && (
          <>
            <button className="tbtn danger" onClick={() => {
              if (countedCount === 0) { showToast('⚠️ No hay conteos que limpiar'); return }
              if (confirm(`¿Limpiar ${countedCount} conteos?`)) resetCounts().then(() => showToast('✅ Conteos limpiados'))
            }}>
              🗑 Limpiar
            </button>
            <button className="tbtn green" onClick={exportCsv}>⬇ Excel</button>
          </>
        )}
        {page === 'lbl' && (
          <button className="tbtn green" onClick={() => {
            document.dispatchEvent(new CustomEvent('lbl-print'))
          }}>🖨 Imprimir</button>
        )}
        {page === 'admin' && (
          <button className="tbtn" onClick={() => {
            document.dispatchEvent(new CustomEvent('admin-template'))
          }}>⬇ Plantilla</button>
        )}
      </div>
    </div>
  )
}
