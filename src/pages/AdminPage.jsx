import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useApp } from '../App'
import { CAT_COLORS, CAT_EMOJIS } from '../defaultData'

export default function AdminPage() {
  const { categories, products, counts, importProducts, resetCounts, restoreCatalog, showToast, loadData } = useApp()
  const [importMode, setImportMode] = useState('replace')
  const [fileHeaders, setFileHeaders] = useState([])
  const [fileRows, setFileRows] = useState([])
  const [colMap, setColMap] = useState({ name: -1, category: -1, code: -1 })
  const [pendingProds, setPendingProds] = useState(null)
  const [pendingCats, setPendingCats] = useState(null)
  const [uploadStatus, setUploadStatus] = useState(null)  // null | { ok, fname, detail } | { error, fname, msg }
  const [showResetModal, setShowResetModal] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Listen for template download from TopBar
  useEffect(() => {
    const handler = () => downloadTemplate()
    document.addEventListener('admin-template', handler)
    return () => document.removeEventListener('admin-template', handler)
  }, [])

  const catalogDate = new Date().toLocaleDateString('es-US')

  function downloadTemplate() {
    const rows = [
      ['Codigo', 'Nombre', 'Categoria'],
      ["GYZ-1", "Avocado Villita 48'", 'Aguacates'],
      ["GYZ-5", 'Banana yellow turning', 'Bananas/Plátanos'],
      ["GYZ-13", 'Mango Tommy #1', 'Mangos'],
      ['', 'Nuevo Producto Ejemplo', 'Otros'],
    ]
    const csv = '\uFEFF' + rows.map(r => r.map(x => {
      const s = String(x ?? ''); return s.includes(',') ? `"${s}"` : s
    }).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'Plantilla_GYZ_productos.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function exportCatalog() {
    const rows = [['Codigo', 'Nombre', 'Categoria']]
    categories.forEach(cat => {
      products.filter(p => p.category_id === cat.id).forEach(p => {
        rows.push([`GYZ-${p.id}`, p.name, cat.name])
      })
    })
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'GYZ_catalogo.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function handleFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) { showToast('⚠️ Solo archivos .xlsx o .csv'); return }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        let rows = []
        if (ext === 'csv') {
          rows = e.target.result.split('\n').map(r => r.split(',').map(c => c.replace(/^"|"$/g, '').trim()))
        } else {
          const wb = XLSX.read(e.target.result, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        }
        processRows(rows, file.name)
      } catch (err) {
        setUploadStatus({ error: true, fname: file.name, msg: 'Error al leer el archivo: ' + err.message })
      }
    }
    if (ext === 'csv') reader.readAsText(file)
    else reader.readAsArrayBuffer(file)
  }

  function processRows(rows, fname) {
    const nonEmpty = rows.filter(r => r.some(c => String(c || '').trim() !== ''))
    if (nonEmpty.length < 2) { setUploadStatus({ error: true, fname, msg: 'El archivo parece vacío.' }); return }
    const headers = nonEmpty[0].map(h => String(h || '').trim())
    const dataRows = nonEmpty.slice(1)
    const map = { name: -1, category: -1, code: -1 }
    headers.forEach((h, i) => {
      const lo = h.toLowerCase()
      if (/nombre|name|producto|product/.test(lo)) map.name = i
      else if (/categ|category|tipo|type/.test(lo)) map.category = i
      else if (/codigo|código|code|id|sku/.test(lo)) map.code = i
    })
    setFileHeaders(headers)
    setFileRows(dataRows)
    setColMap(map)
    setUploadStatus({ ok: true, fname, detail: `${dataRows.length} filas · ${headers.length} columnas` })
    buildPreview(dataRows, headers, map)
  }

  function buildPreview(rows, headers, map) {
    if (map.name < 0) { setPendingProds(null); return }
    const newCats = {}
    const usedExistingCats = {}
    const catMap = {}
    categories.forEach(c => { catMap[c.id] = c; catMap[c.name.toLowerCase()] = c })
    let nextId = Math.max(0, ...products.map(p => p.id)) + 1
    const prods = []
    rows.forEach(row => {
      const name = String(row[map.name] || '').trim(); if (!name) return
      const catRaw = map.category >= 0 ? String(row[map.category] || '').trim() : 'others'
      const codeRaw = map.code >= 0 ? String(row[map.code] || '').trim() : ''
      let catObj = catMap[catRaw] || catMap[catRaw.toLowerCase()] || null
      if (!catObj) {
        const safeId = catRaw.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) || 'cat_new'
        if (!newCats[safeId]) {
          const ci = Object.keys(newCats).length
          newCats[safeId] = { id: safeId, name: catRaw || 'Sin categoría', emoji: CAT_EMOJIS[ci % CAT_EMOJIS.length], color: CAT_COLORS[ci % CAT_COLORS.length] }
        }
        catObj = newCats[safeId]
      } else {
        usedExistingCats[catObj.id] = catObj
      }
      let id
      if (codeRaw && /^GYZ-?(\d+)$/i.test(codeRaw)) id = parseInt(codeRaw.replace(/^GYZ-?/i, ''))
      else if (codeRaw && /^\d+$/.test(codeRaw)) id = parseInt(codeRaw)
      else id = nextId++
      prods.push({ id, category_id: catObj.id, name })
    })
    setPendingProds(prods)
    setPendingCats([...Object.values(usedExistingCats), ...Object.values(newCats)])
  }

  useEffect(() => {
    if (fileRows.length > 0) buildPreview(fileRows, fileHeaders, colMap)
  }, [colMap])

  async function applyImport() {
    if (!pendingProds || !pendingProds.length) { showToast('⚠️ Sin productos para importar'); return }
    setImporting(true)
    const allCats = importMode === 'replace'
      ? pendingCats
      : [...categories, ...pendingCats.filter(nc => !categories.find(c => c.id === nc.id))]
    try {
      await importProducts(pendingProds, allCats, importMode)
      showToast(`✅ ${pendingProds.length} productos importados`)
      resetFileState()
    } catch (err) {
      showToast('❌ Error al importar: ' + err.message)
    }
    setImporting(false)
  }

  function resetFileState() {
    setFileHeaders([]); setFileRows([]); setColMap({ name: -1, category: -1, code: -1 })
    setUploadStatus(null); setPendingProds(null); setPendingCats(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const previewRows = pendingProds ? pendingProds.slice(0, 20) : []
  const catMapForDisplay = {}
  categories.forEach(c => { catMapForDisplay[c.id] = c })

  return (
    <div className="admin-scroll">

      {/* Stats Card */}
      <div className="admin-card">
        <div className="admin-card-hdr">
          <div className="admin-card-icon" style={{ background: '#f0fdf4' }}>📊</div>
          <div>
            <div className="admin-card-title">Estado del Catálogo</div>
            <div className="admin-card-sub">Resumen del inventario actual</div>
          </div>
        </div>
        <div className="admin-card-body">
          <table className="stat-table">
            <tbody>
              <tr><td>Total productos</td><td>{products.length} productos</td></tr>
              <tr><td>Categorías</td><td>{categories.length} categorías</td></tr>
              <tr><td>Conteos activos</td><td>{Object.keys(counts).filter(k => counts[k] > 0).length} productos</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="abtn abtn-blue" style={{ flex: 'none', padding: '8px 12px', fontSize: 12 }}
              onClick={downloadTemplate}>⬇ Descargar plantilla</button>
            <button className="abtn abtn-outline" style={{ flex: 'none', padding: '8px 12px', fontSize: 12 }}
              onClick={exportCatalog}>📋 Exportar catálogo</button>
          </div>
        </div>
      </div>

      {/* Import Card */}
      <div className="admin-card">
        <div className="admin-card-hdr">
          <div className="admin-card-icon" style={{ background: '#eff6ff' }}>📥</div>
          <div>
            <div className="admin-card-title">Importar Productos</div>
            <div className="admin-card-sub">Carga masiva desde Excel o CSV</div>
          </div>
        </div>
        <div className="admin-card-body">
          <div className="import-mode-tabs">
            <button className={`im-tab${importMode === 'replace' ? ' active' : ''}`} onClick={() => setImportMode('replace')}>🔄 Reemplazar todo</button>
            <button className={`im-tab${importMode === 'merge' ? ' active' : ''}`} onClick={() => setImportMode('merge')}>➕ Agregar / Actualizar</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--mu)', marginBottom: 12, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
            {importMode === 'replace'
              ? '📌 Reemplazar: borra el catálogo actual y carga los productos del archivo.'
              : '➕ Agregar/Actualizar: mantiene los productos existentes y agrega o actualiza con el archivo.'}
          </div>

          {/* Dropzone */}
          <div className={`dropzone${dragging ? ' drag' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileInputRef.current?.click()}>
            <div className="dz-icon">📂</div>
            <div className="dz-title">Arrastra tu archivo aquí</div>
            <div className="dz-sub">o <span className="dz-browse">busca en tu dispositivo</span></div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center' }}>
              <span className="info-chip">📊 .xlsx</span>
              <span className="info-chip">📄 .csv</span>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

          {/* Upload status */}
          {uploadStatus && (
            <div style={{ marginTop: 10 }}>
              <div className="us-row">
                <div className="us-icon">{uploadStatus.error ? '❌' : '📄'}</div>
                <div className="us-info">
                  <div className="us-name">{uploadStatus.fname}</div>
                  <div className="us-detail">{uploadStatus.error ? uploadStatus.msg : uploadStatus.detail}</div>
                </div>
                <div className={`us-badge ${uploadStatus.error ? 'err' : 'ok'}`}>{uploadStatus.error ? 'Error' : '✓ Leído'}</div>
              </div>
            </div>
          )}

          {/* Column Mapper */}
          {fileHeaders.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🗂 Mapear columnas</div>
              <div className="colmap">
                {[
                  { key: 'name', label: 'Nombre', req: true },
                  { key: 'category', label: 'Categoría', req: false },
                  { key: 'code', label: 'Código', req: false },
                ].map(f => (
                  <div key={f.key} className="colmap-row">
                    <div className="colmap-label">{f.req && <span style={{ color: 'var(--danger)' }}>*</span>} {f.label}</div>
                    <select className="colmap-sel" value={colMap[f.key]}
                      onChange={e => setColMap(prev => ({ ...prev, [f.key]: parseInt(e.target.value) }))}>
                      <option value={-1}>— No usar —</option>
                      {fileHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                    </select>
                    <span className="colmap-ok">{colMap[f.key] >= 0 ? '✅' : '⬜'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview table */}
          {pendingProds && pendingProds.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 6px' }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Vista previa <span style={{ color: 'var(--mu)' }}>({pendingProds.length} productos)</span></div>
              </div>
              <div className="prev-table-wrap">
                <table className="prev-table">
                  <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th></tr></thead>
                  <tbody>
                    {previewRows.map((p, i) => {
                      const cat = catMapForDisplay[p.category_id] || pendingCats?.find(c => c.id === p.category_id)
                      return (
                        <tr key={i}>
                          <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--mu)' }}>GYZ-{p.id}</td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</td>
                          <td><span className="ptag" style={{ background: cat?.color || '#888' }}>{cat?.name || p.category_id}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="abtn-row">
                <button className="abtn abtn-outline" onClick={resetFileState}>✕ Cancelar</button>
                <button className="abtn abtn-green" onClick={applyImport} disabled={importing}>
                  {importing ? '⏳ Importando...' : '✅ Aplicar importación'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Categories Card */}
      <div className="admin-card">
        <div className="admin-card-hdr">
          <div className="admin-card-icon" style={{ background: '#fef9c3' }}>🏷</div>
          <div>
            <div className="admin-card-title">Gestionar Categorías</div>
            <div className="admin-card-sub">Categorías activas en el catálogo</div>
          </div>
        </div>
        <div className="admin-card-body">
          {categories.filter(c => products.some(p => p.category_id === c.id)).map(cat => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{cat.emoji} {cat.name}</div>
              <div style={{ fontSize: 11, color: 'var(--mu)', fontFamily: 'monospace' }}>
                {products.filter(p => p.category_id === cat.id).length} prods
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="admin-card" style={{ border: '1.5px solid #fecaca' }}>
        <div className="admin-card-hdr">
          <div className="admin-card-icon" style={{ background: 'var(--danger-l)' }}>⚠️</div>
          <div>
            <div className="admin-card-title" style={{ color: 'var(--danger)' }}>Zona de Peligro</div>
            <div className="admin-card-sub">Acciones irreversibles</div>
          </div>
        </div>
        <div className="admin-card-body">
          <div className="abtn-row">
            <button className="abtn abtn-danger" onClick={() => setShowResetModal(true)}>🗑 Limpiar conteos</button>
            <button className="abtn abtn-danger" onClick={() => setShowRestoreModal(true)}>💣 Restaurar catálogo</button>
          </div>
        </div>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal-bg open">
          <div className="modal-sheet">
            <h3>⚠️ Limpiar conteos</h3>
            <p>Se borrarán todas las cantidades del inventario. El catálogo no se toca.</p>
            <div className="modal-btns">
              <button className="mbtn mbtn-c" onClick={() => setShowResetModal(false)}>Cancelar</button>
              <button className="mbtn mbtn-d" onClick={() => {
                resetCounts().then(() => showToast('✅ Conteos limpiados'))
                setShowResetModal(false)
              }}>Limpiar todo</button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="modal-bg open">
          <div className="modal-sheet">
            <h3>💣 Restaurar catálogo original</h3>
            <p>Se eliminarán todos los cambios y se restaurarán los 161 productos originales. Los conteos también se limpiarán.</p>
            <div className="modal-btns">
              <button className="mbtn mbtn-c" onClick={() => setShowRestoreModal(false)}>Cancelar</button>
              <button className="mbtn mbtn-d" onClick={async () => {
                setShowRestoreModal(false)
                await restoreCatalog()
                showToast('✅ Catálogo restaurado')
              }}>Restaurar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
