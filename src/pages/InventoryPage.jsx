import { useState, useRef } from 'react'
import { useApp } from '../App'

export default function InventoryPage() {
  const { categories, products, counts, updateCount, setScannerOpen, setSheetData, showToast } = useApp()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [collapsed, setCollapsed] = useState({})
  const [inlineEdit, setInlineEdit] = useState(null) // productId being edited inline

  const counted = Object.keys(counts).filter(k => counts[k] > 0).length
  const totalUnits = Object.values(counts).reduce((a, b) => a + (b || 0), 0)
  const activeCatCount = new Set(
    Object.keys(counts).filter(k => counts[k] > 0)
      .map(k => products.find(p => p.id == k)?.category_id).filter(Boolean)
  ).size

  const catsToShow = activeCat === 'all' || activeCat === 'updated'
    ? categories
    : categories.filter(c => c.id === activeCat)

  return (
    <>
      {/* Stats */}
      <div className="stats-strip">
        <div className="sstrip" style={{ flex: 1 }}>
          <div className="sp"><div className="sv">{counted}</div><div className="sl">Contados</div></div>
          <div className="ssep" />
          <div className="sp"><div className="sv">{totalUnits}</div><div className="sl">Unidades</div></div>
          <div className="ssep" />
          <div className="sp"><div className="sv">{products.length}</div><div className="sl">Productos</div></div>
          <div className="ssep" />
          <div className="sp"><div className="sv">{activeCatCount}</div><div className="sl">Categ.</div></div>
        </div>
      </div>

      {/* Controls */}
      <div className="inv-controls">
        <div className="search-row">
          <div className="sw">
            <span className="sicon">🔍</span>
            <input className="sinput" type="search" placeholder="Buscar producto..."
              value={search} onChange={e => setSearch(e.target.value)}
              autoComplete="off" autoCorrect="off" spellCheck={false} />
          </div>
        </div>
        <div className="cat-pills">
          <Pill label="Todos" active={activeCat === 'all'} color="#0f172a"
            onClick={() => setActiveCat('all')} />
          <Pill
            label={`✅ Actualizados${counted ? ` (${counted})` : ''}`}
            active={activeCat === 'updated'} color="#16a34a"
            onClick={() => setActiveCat('updated')} />
          {categories.filter(c => products.some(p => p.category_id === c.id)).map(cat => (
            <Pill key={cat.id} label={`${cat.emoji} ${cat.name}`}
              active={activeCat === cat.id} color={cat.color}
              onClick={() => setActiveCat(cat.id)} />
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="inv-scroll">
        {catsToShow.map(cat => {
          let items = products.filter(p => p.category_id === cat.id)
          if (activeCat === 'updated') items = items.filter(p => (counts[p.id] || 0) > 0)
          if (search) {
            const q = search.toLowerCase()
            items = items.filter(p => p.name.toLowerCase().includes(q) || `gyz-${p.id}`.includes(q))
          }
          if (!items.length) return null
          const catCounted = items.filter(p => (counts[p.id] || 0) > 0).length
          const isCol = collapsed[cat.id] && !search

          return (
            <div key={cat.id} className={`cat-group${isCol ? ' col' : ''}`}>
              <div className="cat-hdr" onClick={() => setCollapsed(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}>
                <div className="cdot" style={{ background: cat.color }} />
                <div className="ctitle">{cat.emoji} {cat.name}</div>
                <div className={`ccnt${catCounted > 0 ? ' hi' : ''}`}>{catCounted}/{items.length}</div>
                <div className="cchev">▾</div>
              </div>
              <div className="items-list">
                {items.map(p => {
                  const q = counts[p.id] || 0
                  return (
                    <div key={p.id} className={`icard${q > 0 ? ' counted' : ''}`}>
                      <div className="ibar" />
                      <div className="iinfo">
                        <div className="iname">{p.name}</div>
                        <div className="imeta">{cat.name} · GYZ-{p.id}</div>
                      </div>
                      <div className="counter">
                        <button className="cbtn cminus" onPointerDown={e => { e.preventDefault(); updateCount(p.id, Math.max(0, q - 1)) }}>−</button>
                        {inlineEdit === p.id ? (
                          <div className="cinwrap on">
                            <input className="cinput" type="number" min="0" inputMode="numeric"
                              defaultValue={q}
                              autoFocus
                              onChange={e => {
                                const v = parseInt(e.target.value)
                                if (!isNaN(v) && v >= 0) updateCount(p.id, v)
                              }}
                              onBlur={() => setInlineEdit(null)}
                              onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                            />
                          </div>
                        ) : (
                          <div className={`cdisp${q > 0 ? ' v' : ' z'}`} onClick={() => setInlineEdit(p.id)}>
                            {q || '·'}
                          </div>
                        )}
                        <button className="cbtn cplus" onPointerDown={e => { e.preventDefault(); updateCount(p.id, q + 1) }}>+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {catsToShow.every(cat => {
          let items = products.filter(p => p.category_id === cat.id)
          if (activeCat === 'updated') items = items.filter(p => (counts[p.id] || 0) > 0)
          if (search) { const q = search.toLowerCase(); items = items.filter(p => p.name.toLowerCase().includes(q)) }
          return items.length === 0
        }) && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mu)' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🔍</div>
            <p style={{ fontSize: 14 }}>Sin resultados</p>
          </div>
        )}
      </div>

      {/* Scanner FAB */}
      <div className="fab">
        <button className="fab-scan" onClick={() => setScannerOpen(true)}>
          <span>📷</span>
          <span>Escanear código</span>
        </button>
      </div>
    </>
  )
}

function Pill({ label, active, color, onClick }) {
  return (
    <div className={`cpill${active ? ' active' : ''}`}
      style={active ? { background: color } : {}}
      onClick={onClick}>
      {label}
    </div>
  )
}
