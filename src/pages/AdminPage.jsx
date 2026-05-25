import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useApp } from '../App'
import { CAT_COLORS, CAT_EMOJIS } from '../defaultData'
import { supabase } from '../supabase'

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

  // Category / Product CRUD
  const [expandedCat, setExpandedCat] = useState(null)
  const [editingCat, setEditingCat] = useState(null)
  const [editCatDraft, setEditCatDraft] = useState({ name: '', emoji: '📦', color: CAT_COLORS[0] })
  const [deletingCat, setDeletingCat] = useState(null)
  const [editingProd, setEditingProd] = useState(null)
  const [editProdDraft, setEditProdDraft] = useState({ name: '', category_id: '' })
  const [deletingProd, setDeletingProd] = useState(null)
  const [addingProdCat, setAddingProdCat] = useState(null)
  const [newProdName, setNewProdName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [newCatDraft, setNewCatDraft] = useState({ name: '', emoji: '📦', color: CAT_COLORS[0] })
  const [emojiOpen, setEmojiOpen] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  // Listen for template download from TopBar
  useEffect(() => {
    const handler = () => downloadTemplate()
    document.addEventListener('admin-template', handler)
    return () => document.removeEventListener('admin-template', handler)
  }, [])

  const catalogDate = new Date().toLocaleDateString('es-US')

  function saveXlsx(wb, filename) {
    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function downloadTemplate() {
    const rows = [
      ['Codigo', 'Nombre', 'Categoria'],
      ["GYZ-1", "Avocado Villita 48'", 'Aguacates'],
      ["GYZ-5", 'Banana yellow turning', 'Bananas/Plátanos'],
      ["GYZ-13", 'Mango Tommy #1', 'Mangos'],
      ['', 'Nuevo Producto Ejemplo', 'Otros'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 25 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    saveXlsx(wb, 'Plantilla_GYZ_productos.xlsx')
  }

  function exportCatalog() {
    const rows = [['Codigo', 'Nombre', 'Categoria']]
    categories.forEach(cat => {
      products.filter(p => p.category_id === cat.id).forEach(p => {
        rows.push([`GYZ-${p.id}`, p.name, cat.name])
      })
    })
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 25 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Catalogo')
    saveXlsx(wb, 'GYZ_catalogo.xlsx')
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

  // ── Category CRUD ────────────────────────────────────────
  async function saveCatEdit() {
    if (!editCatDraft.name.trim()) { showToast('⚠️ El nombre no puede estar vacío'); return }
    setSaving(true)
    const { error } = await supabase.from('categories')
      .update({ name: editCatDraft.name.trim(), emoji: editCatDraft.emoji, color: editCatDraft.color })
      .eq('id', editingCat)
    if (error) showToast('❌ ' + error.message)
    else { showToast('✅ Categoría actualizada'); setEditingCat(null); await loadData() }
    setSaving(false)
  }

  async function deleteCat(id) {
    setSaving(true)
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) showToast('❌ ' + error.message)
    else { showToast('✅ Categoría eliminada'); setDeletingCat(null); setExpandedCat(null); await loadData() }
    setSaving(false)
  }

  async function addNewCat() {
    if (!newCatDraft.name.trim()) { showToast('⚠️ El nombre no puede estar vacío'); return }
    const safeId = newCatDraft.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20) + '_' + Date.now().toString().slice(-4)
    setSaving(true)
    const { error } = await supabase.from('categories')
      .insert({ id: safeId, name: newCatDraft.name.trim(), emoji: newCatDraft.emoji, color: newCatDraft.color })
    if (error) showToast('❌ ' + error.message)
    else { showToast('✅ Categoría creada'); setAddingCat(false); setNewCatDraft({ name: '', emoji: '📦', color: CAT_COLORS[0] }); await loadData() }
    setSaving(false)
  }

  // ── Product CRUD ─────────────────────────────────────────
  async function saveProdEdit() {
    if (!editProdDraft.name.trim()) { showToast('⚠️ El nombre no puede estar vacío'); return }
    setSaving(true)
    const { error } = await supabase.from('products')
      .update({ name: editProdDraft.name.trim(), category_id: editProdDraft.category_id })
      .eq('id', editingProd)
    if (error) showToast('❌ ' + error.message)
    else { showToast('✅ Producto actualizado'); setEditingProd(null); await loadData() }
    setSaving(false)
  }

  async function deleteProd(id) {
    setSaving(true)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) showToast('❌ ' + error.message)
    else { showToast('✅ Producto eliminado'); setDeletingProd(null); await loadData() }
    setSaving(false)
  }

  async function addNewProd(catId) {
    if (!newProdName.trim()) { showToast('⚠️ El nombre no puede estar vacío'); return }
    const nextId = Math.max(0, ...products.map(p => p.id)) + 1
    setSaving(true)
    const { error } = await supabase.from('products')
      .insert({ id: nextId, name: newProdName.trim(), category_id: catId })
    if (error) showToast('❌ ' + error.message)
    else { showToast('✅ Producto agregado'); setAddingProdCat(null); setNewProdName(''); await loadData() }
    setSaving(false)
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
          <div style={{ flex: 1 }}>
            <div className="admin-card-title">Gestionar Categorías</div>
            <div className="admin-card-sub">{categories.length} categorías · {products.length} productos</div>
          </div>
        </div>
        <div className="admin-card-body" style={{ padding: '4px 16px 14px' }}>

          {/* Click-outside backdrop for emoji picker */}
          {emojiOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setEmojiOpen(null)} />}

          {categories.map(cat => {
            const catProds = products.filter(p => p.category_id === cat.id)
            const isExpanded = expandedCat === cat.id
            const isEditing = editingCat === cat.id
            const isDeleting = deletingCat === cat.id

            return (
              <div key={cat.id}>
                {isEditing ? (
                  /* ── Inline category edit ── */
                  <div style={{ padding: '10px 0', borderBottom: '1px solid var(--bd)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                      <div style={{ position: 'relative', zIndex: 200 }}>
                        <button className="emoji-pick-btn" onClick={() => setEmojiOpen(emojiOpen === cat.id ? null : cat.id)}>
                          {editCatDraft.emoji} <span style={{ fontSize: 9, color: 'var(--mu)' }}>▾</span>
                        </button>
                        {emojiOpen === cat.id && (
                          <div className="emoji-drop">
                            {CAT_EMOJIS.map(e => (
                              <button key={e} className={`emoji-opt${editCatDraft.emoji === e ? ' sel' : ''}`}
                                onClick={() => { setEditCatDraft(d => ({ ...d, emoji: e })); setEmojiOpen(null) }}>{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input className="cmgr-inline-input" value={editCatDraft.name} autoFocus
                        placeholder="Nombre de categoría"
                        onChange={e => setEditCatDraft(d => ({ ...d, name: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') saveCatEdit(); if (e.key === 'Escape') setEditingCat(null) }} />
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                      {CAT_COLORS.map(c => (
                        <div key={c} className="cswatch"
                          style={{ background: c, border: `2.5px solid ${editCatDraft.color === c ? '#fff' : 'transparent'}`, boxShadow: editCatDraft.color === c ? `0 0 0 2px ${c}` : 'none', transform: editCatDraft.color === c ? 'scale(1.2)' : 'scale(1)' }}
                          onClick={() => setEditCatDraft(d => ({ ...d, color: c }))} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="abtn abtn-outline" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => setEditingCat(null)}>✕ Cancelar</button>
                      <button className="abtn abtn-green" style={{ padding: '7px 12px', fontSize: 12 }} onClick={saveCatEdit} disabled={saving}>{saving ? '⏳' : '✓ Guardar'}</button>
                    </div>
                  </div>
                ) : isDeleting ? (
                  /* ── Delete confirmation ── */
                  <div className="cmgr-confirm">
                    <div className="cmgr-confirm-msg">⚠️ ¿Eliminar "{cat.name}" y sus {catProds.length} productos?</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="cmgr-btn-no" onClick={() => setDeletingCat(null)}>Cancelar</button>
                      <button className="cmgr-btn-yes" onClick={() => deleteCat(cat.id)} disabled={saving}>{saving ? '⏳' : 'Sí, eliminar'}</button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal category row ── */
                  <div className="cmgr-row" style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--bd)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{cat.emoji} {cat.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--mu)', fontFamily: 'monospace', marginRight: 2 }}>{catProds.length} prods</span>
                    <button className="cmgr-icon-btn" title="Editar categoría"
                      onClick={() => { setEditingCat(cat.id); setEditCatDraft({ name: cat.name, emoji: cat.emoji, color: cat.color }); setDeletingCat(null) }}>✏️</button>
                    <button className="cmgr-icon-btn del" title="Eliminar categoría"
                      onClick={() => { setDeletingCat(cat.id); setEditingCat(null) }}>🗑</button>
                    <button className="cmgr-icon-btn" onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                      style={{ fontSize: 12, transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</button>
                  </div>
                )}

                {/* ── Expanded products list ── */}
                {isExpanded && !isEditing && !isDeleting && (
                  <div className="cmgr-prods">
                    {catProds.map(prod => {
                      const isProdEditing = editingProd === prod.id
                      const isProdDeleting = deletingProd === prod.id
                      return (
                        <div key={prod.id} className="cmgr-prod-row">
                          {isProdEditing ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, flexWrap: 'wrap', padding: '4px 0' }}>
                              <input className="cmgr-inline-input" value={editProdDraft.name} autoFocus
                                placeholder="Nombre del producto" style={{ minWidth: 120 }}
                                onChange={e => setEditProdDraft(d => ({ ...d, name: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') saveProdEdit(); if (e.key === 'Escape') setEditingProd(null) }} />
                              <select className="cmgr-inline-input" style={{ flex: 'none', width: 'auto', padding: '6px 8px' }}
                                value={editProdDraft.category_id}
                                onChange={e => setEditProdDraft(d => ({ ...d, category_id: e.target.value }))}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                              </select>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="cmgr-icon-btn" style={{ color: 'var(--danger)' }} onClick={() => setEditingProd(null)}>✕</button>
                                <button className="cmgr-icon-btn" style={{ color: 'var(--accent)' }} onClick={saveProdEdit} disabled={saving}>✓</button>
                              </div>
                            </div>
                          ) : isProdDeleting ? (
                            <div className="cmgr-confirm" style={{ flex: 1, margin: 0, padding: '8px 10px' }}>
                              <div className="cmgr-confirm-msg">¿Eliminar "{prod.name}"?</div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="cmgr-btn-no" onClick={() => setDeletingProd(null)}>No</button>
                                <button className="cmgr-btn-yes" onClick={() => deleteProd(prod.id)} disabled={saving}>{saving ? '⏳' : 'Sí'}</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span style={{ fontSize: 10, color: 'var(--mu)', fontFamily: 'monospace', flexShrink: 0, minWidth: 48 }}>GYZ-{prod.id}</span>
                              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prod.name}</span>
                              <button className="cmgr-icon-btn" title="Editar producto"
                                onClick={() => { setEditingProd(prod.id); setEditProdDraft({ name: prod.name, category_id: prod.category_id }); setDeletingProd(null) }}>✏️</button>
                              <button className="cmgr-icon-btn del" title="Eliminar producto"
                                onClick={() => { setDeletingProd(prod.id); setEditingProd(null) }}>🗑</button>
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* Add product inline */}
                    {addingProdCat === cat.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', flexWrap: 'wrap' }}>
                        <input className="cmgr-inline-input" value={newProdName} autoFocus placeholder="Nombre del nuevo producto"
                          onChange={e => setNewProdName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addNewProd(cat.id); if (e.key === 'Escape') { setAddingProdCat(null); setNewProdName('') } }} />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="cmgr-icon-btn" style={{ color: 'var(--danger)' }} onClick={() => { setAddingProdCat(null); setNewProdName('') }}>✕</button>
                          <button className="cmgr-icon-btn" style={{ color: 'var(--accent)' }} onClick={() => addNewProd(cat.id)} disabled={saving}>✓</button>
                        </div>
                      </div>
                    ) : (
                      <button className="cmgr-add-btn"
                        onClick={() => { setAddingProdCat(cat.id); setNewProdName(''); setEditingProd(null); setDeletingProd(null) }}>
                        <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> Agregar producto
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* ── Add new category ── */}
          {addingCat ? (
            <div style={{ padding: '12px 0 4px', borderTop: '1px solid var(--bd)', marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mu)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Nueva categoría</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                <div style={{ position: 'relative', zIndex: 200 }}>
                  <button className="emoji-pick-btn" onClick={() => setEmojiOpen(emojiOpen === 'new' ? null : 'new')}>
                    {newCatDraft.emoji} <span style={{ fontSize: 9, color: 'var(--mu)' }}>▾</span>
                  </button>
                  {emojiOpen === 'new' && (
                    <div className="emoji-drop">
                      {CAT_EMOJIS.map(e => (
                        <button key={e} className={`emoji-opt${newCatDraft.emoji === e ? ' sel' : ''}`}
                          onClick={() => { setNewCatDraft(d => ({ ...d, emoji: e })); setEmojiOpen(null) }}>{e}</button>
                      ))}
                    </div>
                  )}
                </div>
                <input className="cmgr-inline-input" value={newCatDraft.name} autoFocus placeholder="Nombre de la categoría"
                  onChange={e => setNewCatDraft(d => ({ ...d, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') addNewCat(); if (e.key === 'Escape') setAddingCat(false) }} />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                {CAT_COLORS.map(c => (
                  <div key={c} className="cswatch"
                    style={{ background: c, border: `2.5px solid ${newCatDraft.color === c ? '#fff' : 'transparent'}`, boxShadow: newCatDraft.color === c ? `0 0 0 2px ${c}` : 'none', transform: newCatDraft.color === c ? 'scale(1.2)' : 'scale(1)' }}
                    onClick={() => setNewCatDraft(d => ({ ...d, color: c }))} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="abtn abtn-outline" style={{ padding: '7px 12px', fontSize: 12 }} onClick={() => setAddingCat(false)}>✕ Cancelar</button>
                <button className="abtn abtn-green" style={{ padding: '7px 12px', fontSize: 12 }} onClick={addNewCat} disabled={saving}>{saving ? '⏳' : '＋ Crear categoría'}</button>
              </div>
            </div>
          ) : (
            <button className="cmgr-add-btn" style={{ paddingTop: 12, borderTop: '1px solid var(--bd)', marginTop: 4 }}
              onClick={() => { setAddingCat(true); setNewCatDraft({ name: '', emoji: '📦', color: CAT_COLORS[0] }) }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> Nueva categoría
            </button>
          )}
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
