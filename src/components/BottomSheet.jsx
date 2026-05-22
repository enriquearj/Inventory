import { useState, useRef, useEffect } from 'react'
import { useApp } from '../App'

export default function BottomSheet() {
  const { sheetData, setSheetData, categories, counts, updateCount, showToast, setPage } = useApp()
  const { product, code } = sheetData
  const cat = product ? categories.find(c => c.id === product.category_id) || { name: 'Sin cat.', color: '#888', emoji: '📦' } : null

  const [qty, setQty] = useState(product ? (counts[product.id] || 0) : 0)
  const [inputMode, setInputMode] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputMode && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [inputMode])

  function close() { setSheetData(null) }

  function bump(d) {
    setQty(prev => Math.max(0, prev + d))
  }

  function confirm() {
    if (!product) return
    updateCount(product.id, qty)
    showToast(`✅ ${product.name.slice(0, 24)} → ${qty} uds`)
    close()
  }

  if (!product) {
    return (
      <>
        <div className="sheet-bg open" onClick={close} />
        <div className="bsheet open">
          <div className="sh-handle" />
          <div className="sh-body">
            <div className="nf-sheet">
              <div className="nf-icon">🔎</div>
              <div className="nf-title">Código no encontrado</div>
              <div className="nf-sub">Este código no está en el catálogo</div>
              <div className="nf-code">{code}</div>
              <div className="nf-btns">
                <button className="nfbtn nfb1" onClick={close}>Cerrar</button>
                <button className="nfbtn nfb2" onClick={() => { close(); setPage('admin') }}>⚙️ Admin</button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="sheet-bg open" onClick={close} />
      <div className="bsheet open">
        <div className="sh-handle" />
        <div className="sh-body">
          <div className="sh-cat" style={{ background: `${cat.color}20`, color: cat.color }}>
            {cat.emoji} {cat.name}
          </div>
          <div className="sh-name">{product.name}</div>
          <div className="sh-code">🔖 {code || `GYZ-${product.id}`}</div>

          <div className="sh-counter">
            <button className="sh-cbtn sh-minus" onClick={() => bump(-1)}>−</button>
            {inputMode ? (
              <input
                ref={inputRef}
                className="sh-inp"
                type="number"
                min="0"
                inputMode="numeric"
                defaultValue={qty}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v) && v >= 0) setQty(v)
                }}
                onBlur={() => setInputMode(false)}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              />
            ) : (
              <div className={`sh-val${qty > 0 ? '' : ' z'}`} onClick={() => setInputMode(true)}>
                {qty}
              </div>
            )}
            <button className="sh-cbtn sh-plus" onClick={() => bump(1)}>+</button>
          </div>

          <button className="sh-confirm" onClick={confirm}>✅ Guardar cantidad</button>
          <button className="sh-skip" onClick={close}>Cancelar</button>
        </div>
      </div>
    </>
  )
}
