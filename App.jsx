import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import { DEFAULT_CATS, DEFAULT_PRODUCTS } from './defaultData'
import TopBar from './components/TopBar'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import Scanner from './components/Scanner'
import BottomSheet from './components/BottomSheet'
import HelpModal from './components/HelpModal'
import InstallBanner from './components/InstallBanner'
import InventoryPage from './pages/InventoryPage'
import LabelsPage from './pages/LabelsPage'
import AdminPage from './pages/AdminPage'

export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export default function App() {
  const [page, setPage] = useState('inv')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [sheetData, setSheetData] = useState(null)
  const [labelSelected, setLabelSelected] = useState(new Set())
  const [helpOpen, setHelpOpen] = useState(false)
  const toastTimer = useRef(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [catsRes, prodsRes, countsRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('products').select('*').order('id'),
        supabase.from('inventory_counts').select('product_id, quantity'),
      ])
      let cats = catsRes.data
      let prods = prodsRes.data
      if (!cats || cats.length === 0) {
        await supabase.from('categories').insert(DEFAULT_CATS)
        cats = DEFAULT_CATS
      }
      if (!prods || prods.length === 0) {
        await supabase.from('products').insert(DEFAULT_PRODUCTS)
        prods = DEFAULT_PRODUCTS
      }
      setCategories(cats)
      setProducts(prods)
      if (countsRes.data) {
        const map = {}
        countsRes.data.forEach(r => { if (r.quantity > 0) map[r.product_id] = r.quantity })
        setCounts(map)
      }
    } catch (err) { console.error('Error loading data:', err) }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const channel = supabase.channel('inventory_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_counts' }, payload => {
        if (payload.eventType === 'DELETE') {
          setCounts(prev => { const next = { ...prev }; delete next[payload.old.product_id]; return next })
        } else {
          const { product_id, quantity } = payload.new
          setCounts(prev => { const next = { ...prev }; if (quantity > 0) next[product_id] = quantity; else delete next[product_id]; return next })
        }
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const updateCount = useCallback(async (productId, quantity) => {
    setCounts(prev => { const next = { ...prev }; if (quantity <= 0) delete next[productId]; else next[productId] = quantity; return next })
    if (quantity <= 0) {
      await supabase.from('inventory_counts').delete().eq('product_id', productId)
    } else {
      await supabase.from('inventory_counts').upsert(
        { product_id: productId, quantity, updated_at: new Date().toISOString() },
        { onConflict: 'product_id' }
      )
    }
  }, [])

  const resetCounts = useCallback(async () => {
    setCounts({})
    await supabase.from('inventory_counts').delete().neq('product_id', 0)
  }, [])

  const importProducts = useCallback(async (newProducts, newCats, mode) => {
    const check = ({ error }) => { if (error) throw new Error(error.message) }
    if (mode === 'replace') {
      check(await supabase.from('inventory_counts').delete().gte('product_id', 0))
      check(await supabase.from('products').delete().gte('id', 0))
      check(await supabase.from('categories').delete().neq('id', ''))
      if (newCats.length) check(await supabase.from('categories').insert(newCats))
      if (newProducts.length) check(await supabase.from('products').insert(newProducts))
      setCounts({})
    } else {
      for (const cat of newCats) check(await supabase.from('categories').upsert(cat, { onConflict: 'id' }))
      for (const prod of newProducts) check(await supabase.from('products').upsert(prod, { onConflict: 'id' }))
    }
    await loadData()
  }, [loadData])

  const restoreCatalog = useCallback(async () => {
    await supabase.from('inventory_counts').delete().neq('product_id', 0)
    await supabase.from('products').delete().neq('id', 0)
    await supabase.from('categories').delete().neq('id', '')
    await supabase.from('categories').insert(DEFAULT_CATS)
    await supabase.from('products').insert(DEFAULT_PRODUCTS)
    setCounts({})
    await loadData()
  }, [loadData])

  const showToast = useCallback((msg, duration = 2800) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), duration)
  }, [])

  const exportCsv = useCallback(() => {
    const entries = Object.entries(counts).filter(([, q]) => q > 0)
    if (!entries.length) { showToast('⚠️ No hay cantidades registradas'); return }
    const d = new Date()
    const rows = [['G&Z LLC — Inventario'], [`Fecha: ${d.toLocaleDateString('es-US')}`, `Hora: ${d.toLocaleTimeString('es-US',{hour:'2-digit',minute:'2-digit'})}`], [],
      ['#','Código','Producto','Categoría','Cantidad']]
    let i = 1
    categories.forEach(cat => {
      products.filter(p => p.category_id === cat.id && (counts[p.id]||0) > 0)
        .forEach(p => rows.push([i++, `GYZ-${p.id}`, p.name, cat.name, counts[p.id]]))
    })
    rows.push([],['','','TOTAL','',Object.values(counts).reduce((a,b)=>a+(b||0),0)])
    const csv = '\uFEFF' + rows.map(r=>r.map(x=>{const s=String(x??'');return s.includes(',')?`"${s}"`:s}).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`GYZ_inventario_${d.toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
    showToast(`✅ Exportado: ${i-1} productos`)
  }, [counts, categories, products, showToast])

  const ctx = {
    categories, setCategories, products, setProducts, counts, loading,
    updateCount, resetCounts, importProducts, restoreCatalog,
    showToast, scannerOpen, setScannerOpen, sheetData, setSheetData,
    exportCsv, loadData, page, setPage,
    labelSelected, setLabelSelected,
    helpOpen, setHelpOpen,
  }

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:12,background:'#0f172a'}}>
      <div style={{fontSize:40}}>📦</div>
      <div style={{color:'#94a3b8',fontSize:14,fontWeight:600}}>Cargando G&Z LLC...</div>
    </div>
  )

  return (
    <AppContext.Provider value={ctx}>
      <TopBar />
      <InstallBanner />
      <div className="pages">
        <div className={`page${page==='inv'?' active':''}`}><InventoryPage /></div>
        <div className={`page${page==='lbl'?' active':''}`}><LabelsPage /></div>
        <div className={`page${page==='admin'?' active':''}`}><AdminPage /></div>
      </div>
      {page === 'lbl' && labelSelected.size > 0 && (
        <div className="lbl-fab">
          <button className="lfab-clr" onClick={() => setLabelSelected(new Set())}>✕</button>
          <button className="lfab-print" onClick={() => document.dispatchEvent(new CustomEvent('lbl-print'))}>🖨 Ver e imprimir</button>
        </div>
      )}
      <BottomNav />
      {scannerOpen && <Scanner />}
      {sheetData !== null && <BottomSheet />}
      {helpOpen && <HelpModal />}
      <Toast message={toast} />
    </AppContext.Provider>
  )
}