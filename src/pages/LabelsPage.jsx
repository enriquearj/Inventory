import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import { useApp } from '../App'

const QR_PX = { md: 58, lg: 80 }

export default function LabelsPage() {
  const { categories, products, labelSelected: selected, setLabelSelected: setSelected } = useApp()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [labelSize, setLabelSize] = useState('md')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [qrMap, setQrMap] = useState({})
  const [generating, setGenerating] = useState(false)

  // Listen for print event from TopBar
  useEffect(() => {
    const handler = () => openPreview()
    document.addEventListener('lbl-print', handler)
    return () => document.removeEventListener('lbl-print', handler)
  }, [selected, labelSize])

  const toggleProduct = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectCat = (catId) => {
    setSelected(prev => {
      const next = new Set(prev)
      products.filter(p => p.category_id === catId).forEach(p => next.add(p.id))
      return next
    })
  }

  const selectAll = () => {
    setSelected(prev => {
      const next = new Set(prev)
      filtered.forEach(p => next.add(p.id))
      return next
    })
  }

  const clearAll = () => setSelected(new Set())

  const filtered = products.filter(p => {
    if (activeCat !== 'all' && p.category_id !== activeCat) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || `gyz-${p.id}`.includes(q)
    }
    return true
  })

  async function openPreview() {
    if (!selected.size) return
    setGenerating(true)
    setPreviewOpen(true)
    const selectedProducts = products.filter(p => selected.has(p.id))
    const map = {}
    await Promise.all(selectedProducts.map(async p => {
      const code = `GYZ-${p.id}`
      const px = QR_PX[labelSize]
      try {
        map[p.id] = await QRCode.toDataURL(code, {
          width: px, margin: 1, color: { dark: '#1e293b', light: '#fff' }
        })
      } catch { map[p.id] = '' }
    }))
    setQrMap(map)
    setGenerating(false)
  }

  function doPrint() {
    const selectedProducts = products.filter(p => selected.has(p.id))
    if (!selectedProducts.length || generating) return

    const cols = labelSize === 'md' ? 6 : 4
    const px = QR_PX[labelSize]

    const labelsHtml = selectedProducts.map(p => `
      <div class="lbl">
        <img src="${qrMap[p.id] || ''}" width="${px}" height="${px}" alt="GYZ-${p.id}">
        <div class="code">GYZ-${p.id}</div>
      </div>`).join('')

    const html = `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Etiquetas G&amp;Z LLC</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:white;font-family:monospace}
    .grid{display:grid;grid-template-columns:repeat(${cols},1fr);gap:2px;padding:8mm}
    .lbl{border:.3mm solid #ccc;padding:1mm;display:flex;flex-direction:column;align-items:center;justify-content:center;break-inside:avoid;background:white}
    .lbl img{display:block;width:${px}px;height:${px}px}
    .code{font-size:8px;font-weight:700;text-align:center;margin-top:2px;letter-spacing:.5px}
    @media print{@page{size:letter;margin:8mm}body{background:white}}
  </style>
</head>
<body>
  <div class="grid">${labelsHtml}</div>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},300)})<\/script>
</body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (!win) { showToast('⚠️ Activa ventanas emergentes para imprimir'); return }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    setPreviewOpen(false)
  }

  const catsToShow = activeCat === 'all' ? categories : categories.filter(c => c.id === activeCat)

  return (
    <>
      {/* Controls */}
      <div className="lbl-ctrl">
        <div className="lbl-row">
          <div className="sw" style={{ flex: 1 }}>
            <span className="sicon">🔍</span>
            <input className="sinput" type="search" placeholder="Buscar producto..."
              value={search} onChange={e => setSearch(e.target.value)}
              autoComplete="off" autoCorrect="off" spellCheck={false} />
          </div>
          <div className="stog">
            <button className={`stbtn${labelSize === 'md' ? ' active' : ''}`} onClick={() => setLabelSize('md')}>Med</button>
            <button className={`stbtn${labelSize === 'lg' ? ' active' : ''}`} onClick={() => setLabelSize('lg')}>Grd</button>
          </div>
        </div>
        <div className="cat-pills">
          <div className={`cpill${activeCat === 'all' ? ' active' : ''}`}
            style={activeCat === 'all' ? { background: '#0f172a' } : {}}
            onClick={() => setActiveCat('all')}>Todos</div>
          {categories.filter(c => products.some(p => p.category_id === c.id)).map(cat => (
            <div key={cat.id} className={`cpill${activeCat === cat.id ? ' active' : ''}`}
              style={activeCat === cat.id ? { background: cat.color } : {}}
              onClick={() => setActiveCat(cat.id)}>
              {cat.emoji} {cat.name}
            </div>
          ))}
        </div>
      </div>

      {/* Selection bar */}
      <div className={`lsel-bar${selected.size === 0 ? ' h' : ''}`}>
        <div className="lsel-info">
          <span className="lsel-count">{selected.size}</span>
          <span className="lsel-label">etiqueta{selected.size !== 1 ? 's' : ''} seleccionada{selected.size !== 1 ? 's' : ''}</span>
        </div>
        <div className="lsel-actions">
          <button className="lsel-btn lsel-btn-all" onClick={selectAll}>✓ Todo</button>
          <button className="lsel-btn lsel-btn-clear" onClick={clearAll}>✕ Limpiar</button>
        </div>
      </div>

      {/* Product grid */}
      <div className="lbl-scroll">
        {catsToShow.map(cat => {
          let items = filtered.filter(p => p.category_id === cat.id)
          if (!items.length) return null
          return (
            <div key={cat.id} className="lcs">
              <div className="lch">
                <div className="lcdot" style={{ background: cat.color }} />
                <div className="lcn">{cat.emoji} {cat.name} ({items.length})</div>
                <button className="lcsb"
                  style={{ background: `${cat.color}20`, color: cat.color }}
                  onClick={() => selectCat(cat.id)}>Sel. cat.</button>
              </div>
              <div className="lpg">
                {items.map(p => (
                  <div key={p.id} className={`lpcard${selected.has(p.id) ? ' sel' : ''}`}
                    onClick={() => toggleProduct(p.id)}>
                    <div className="lpck">{selected.has(p.id) ? '✓' : ''}</div>
                    <div className="lpi">
                      <div className="lpn">{p.name}</div>
                      <div className="lpk">GYZ-{p.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="modal-bg open">
          <div className="modal-sheet" style={{ maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0, borderRadius: '20px 20px 0 0' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🖨 Vista previa — {selected.size} etiquetas</div>
              <button style={{ background: 'var(--bg)', border: 'none', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', fontSize: 13 }}
                onClick={() => setPreviewOpen(false)}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#dde1e7' }}>
              {generating ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--mu)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
                  <div style={{ fontWeight: 600 }}>Generando {selected.size} QRs...</div>
                </div>
              ) : (
                <div className={`ls ${labelSize}`} style={{ padding: 6 }}>
                  {products.filter(p => selected.has(p.id)).map(p => (
                    <div key={p.id} className="lbl-item">
                      <div className="lq">
                        {qrMap[p.id] && <img src={qrMap[p.id]} width={QR_PX[labelSize]} height={QR_PX[labelSize]} alt={`GYZ-${p.id}`} />}
                      </div>
                      <div className="lc">GYZ-{p.id}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--bd)', display: 'flex', gap: 8, background: 'var(--w)' }}>
              <button className="abtn abtn-outline" onClick={() => setPreviewOpen(false)}>Cerrar</button>
              <button className="abtn abtn-green" onClick={doPrint} disabled={generating}>🖨 Imprimir</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
