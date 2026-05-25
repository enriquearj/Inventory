import { useState, useRef, useEffect } from 'react'
import { useApp } from '../App'

export default function DamagedPage() {
  const { categories, products, damagedCounts, updateDamagedCount, setScannerOpen } = useApp()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [collapsed, setCollapsed] = useState({})
  const [inlineEdit, setInlineEdit] = useState(null)
  const [inlineEditValue, setInlineEditValue] = useState(0)
  const searchRef = useRef(null)
  const pillsRef = useRef(null)

  useEffect(() => {
    const el = pillsRef.current
    if (!el) return
    const onWheel = e => { if (e.deltaY === 0) return; e.preventDefault(); el.scrollLeft += e.deltaY }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const counted = Object.keys(damagedCounts).filter(k => damagedCounts[k] > 0).length
  const totalUnits = Object.values(damagedCounts).reduce((a, b) => a + (b || 0), 0)
  const activeCatCount = new Set(
    Object.keys(damagedCounts).filter(k => damagedCounts[k] > 0)
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
          <div className="sp">
            <div className="sv" style={{ color: '#fb923c' }}>{counted}</div>
            <div className="sl">Contados</div>
          </div>
          <div className="ssep" />
          <div className="sp">
            <div className="sv" style={{ color: '#fb923c' }}>{totalUnits}</div>
            <div className="sl">Unidades</div>
          </div>
          <div className="ssep" />
          <div className="sp">
            <div className="sv" style={{ color: '#fb923c' }}>{products.length}</div>
            <div className="sl">Productos</div>
          </div>
          <div className="ssep" />
          <div className="sp">
            <div className="sv" style={{ color: '#fb923c' }}>{activeCatCount}</div>
            <div className="sl">Categ.</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="inv-controls">
        <div className="search-row">
          <div className="sw">
            <span className="sicon">🔍</span>
            <input className="sinput" type="search" placeholder="Buscar producto..."
              value={search} onChange={e => setSearch(e.target.value)}
              ref={searchRef}
              autoComplete="off" autoCorrect="off" spellCheck={false} />
          </div>
        </div>
        <div className="cat-pills" ref={pillsRef}>
          <Pill label="Todos" active={activeCat === 'all'} color="#ea580c"
            onClick={() => setActiveCat('all')} />
          <Pill
            label={`⚠️ Registrados${counted ? ` (${counted})` : ''}`}
            active={activeCat === 'updated'} color="#ea580c"
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
          if (activeCat === 'updated') items = items.filter(p => (damagedCounts[p.id] || 0) > 0)
          if (search) {
            const q = search.toLowerCase()
            items = items.filter(p => p.name.toLowerCase().includes(q) || `gyz-${p.id}`.includes(q))
          }
          if (!items.length) return null
          const catCounted = items.filter(p => (damagedCounts[p.id] || 0) > 0).length
          const isCol = collapsed[cat.id] && !search

          return (
            <div key={cat.id} className={`cat-group${isCol ? ' col' : ''}`}>
              <div className="cat-hdr" onClick={() => setCollapsed(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}>
                <div className="cdot" style={{ background: cat.color }} />
                <div className="ctitle">{cat.emoji} {cat.name}</div>
                <div className={`ccnt${catCounted > 0 ? ' hi' : ''}`}
                  style={catCounted > 0 ? { background: '#ffedd5', color: '#ea580c' } : {}}>
                  {catCounted}/{items.length}
                </div>
                <div className="cchev">▾</div>
              </div>
              <div className="items-list">
                {items.map(p => {
                  const q = damagedCounts[p.id] || 0
                  return (
                    <div key={p.id} className={`icard${q > 0 ? ' dmg-counted' : ''}`}>
                      <div className="ibar" />
                      <div className="iinfo">
                        <div className="iname">{p.name}</div>
                        <div className="imeta">{cat.name} · GYZ-{p.id}</div>
                      </div>
                      <div className="counter">
                        <button className="cbtn cminus" onPointerDown={e => {
                          e.preventDefault()
                          if (inlineEdit === p.id) {
                            const next = Math.max(0, inlineEditValue - 1)
                            setInlineEditValue(next)
                            updateDamagedCount(p.id, next)
                          } else {
                            updateDamagedCount(p.id, Math.max(0, q - 1))
                          }
                        }}>−</button>
                        {inlineEdit === p.id ? (
                          <div className="cinwrap on">
                            <input className="cinput" type="text" inputMode="numeric" pattern="[0-9]*"
                              value={inlineEditValue}
                              autoFocus
                              style={{ borderColor: '#ea580c', color: '#c2410c' }}
                              onChange={e => {
                                const raw = e.target.value.replace(/[^0-9]/g, '')
                                const next = raw === '' ? 0 : parseInt(raw)
                                setInlineEditValue(next)
                                updateDamagedCount(p.id, next)
                              }}
                              onBlur={() => setInlineEdit(null)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.target.blur(); return }
                                if (e.key === '-' || e.key === 'ArrowDown') {
                                  e.preventDefault()
                                  const next = Math.max(0, inlineEditValue - 1)
                                  setInlineEditValue(next)
                                  updateDamagedCount(p.id, next)
                                }
                                if (e.key === '+' || e.key === 'ArrowUp') {
                                  e.preventDefault()
                                  const next = inlineEditValue + 1
                                  setInlineEditValue(next)
                                  updateDamagedCount(p.id, next)
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className={`cdisp${q > 0 ? ' v' : ' z'}`}
                            style={q > 0 ? { color: '#c2410c' } : {}}
                            onClick={() => { setInlineEdit(p.id); setInlineEditValue(q) }}>
                            {q || '·'}
                          </div>
                        )}
                        <button className="cbtn cplus"
                          style={{ background: '#ffedd5', color: '#ea580c' }}
                          onPointerDown={e => {
                            e.preventDefault()
                            if (inlineEdit === p.id) {
                              const next = inlineEditValue + 1
                              setInlineEditValue(next)
                              updateDamagedCount(p.id, next)
                            } else {
                              updateDamagedCount(p.id, q + 1)
                            }
                          }}>+</button>
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
          if (activeCat === 'updated') items = items.filter(p => (damagedCounts[p.id] || 0) > 0)
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
        <button className="fab-scan" style={{ background: '#ea580c' }} onClick={() => setScannerOpen(true)}>
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
