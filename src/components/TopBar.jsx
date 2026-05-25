import { useState } from 'react'
import { useApp } from '../App'

export default function TopBar() {
  const { page, setPage, counts, damagedCounts, products, exportCsv, exportDamagedXlsx, resetCounts, resetDamagedCounts, showToast, setHelpOpen } = useApp()
  const [showClearModal, setShowClearModal] = useState(false)
  const [showDmgClearModal, setShowDmgClearModal] = useState(false)

  const countedCount = Object.keys(counts).filter(k => counts[k] > 0).length
  const damagedCount = Object.keys(damagedCounts).filter(k => damagedCounts[k] > 0).length

  return (
    <>
    <div className="topbar">
      <div className="brand">
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
              setShowClearModal(true)
            }}>
              🗑 Limpiar
            </button>
            <button className="tbtn green" onClick={exportCsv}>⬇ Excel</button>
          </>
        )}
        {page === 'dmg' && (
          <>
            <button className="tbtn danger" onClick={() => {
              if (damagedCount === 0) { showToast('⚠️ No hay defectuosos que limpiar'); return }
              setShowDmgClearModal(true)
            }}>
              🗑 Limpiar
            </button>
            <button className="tbtn green" onClick={exportDamagedXlsx}>⬇ Excel</button>
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

    {/* Clear Counts Modal */}
    {showClearModal && (
      <div className="modal-bg open" onClick={() => setShowClearModal(false)}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()}>
          <h3>⚠️ Limpiar conteos</h3>
          <p>Se borrarán todas las cantidades del inventario. No se elimina el catálogo.</p>
          <div className="modal-btns">
            <button className="mbtn mbtn-c" onClick={() => setShowClearModal(false)}>Cancelar</button>
            <button className="mbtn mbtn-d" onClick={() => {
              resetCounts().then(() => showToast('✅ Conteos limpiados'))
              setShowClearModal(false)
            }}>Limpiar todo</button>
          </div>
        </div>
      </div>
    )}

    {/* Clear Damaged Modal */}
    {showDmgClearModal && (
      <div className="modal-bg open" onClick={() => setShowDmgClearModal(false)}>
        <div className="modal-sheet" onClick={e => e.stopPropagation()}>
          <h3>⚠️ Limpiar defectuosos</h3>
          <p>Se borrarán todos los conteos de productos dañados.</p>
          <div className="modal-btns">
            <button className="mbtn mbtn-c" onClick={() => setShowDmgClearModal(false)}>Cancelar</button>
            <button className="mbtn mbtn-d" onClick={() => {
              resetDamagedCounts().then(() => showToast('✅ Defectuosos limpiados'))
              setShowDmgClearModal(false)
            }}>Limpiar todo</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
