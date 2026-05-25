# Guía de React — Aprendiendo con este proyecto

> Esta guía explica los conceptos de React que aparecen **en este mismo código**, con ejemplos reales del proyecto. No es teoría abstracta: cada concepto tiene una referencia directa a un archivo.

---

## 1. ¿Qué es un Componente?

Un componente es simplemente una **función de JavaScript que devuelve JSX** (HTML mezclado con JavaScript).

```jsx
// src/components/BottomNav.jsx
export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <button>Inventario</button>
    </nav>
  )
}
```

- `export default` → permite importarlo desde otros archivos
- El nombre empieza con **mayúscula** → convención obligatoria de React
- Lo que está dentro del `return (...)` es **JSX**

---

## 2. JSX — HTML dentro de JavaScript

JSX parece HTML pero tiene diferencias:

| HTML normal        | JSX equivalente         | ¿Por qué?                              |
|--------------------|-------------------------|----------------------------------------|
| `class="btn"`      | `className="btn"`       | `class` es palabra reservada en JS     |
| `<input />`        | `<input />`             | Las etiquetas sin hijos deben cerrarse |
| `style="color:red"`| `style={{ color: 'red' }}`| Los estilos son objetos JS             |

**Expresiones dentro de JSX** → van entre `{ }`:

```jsx
// src/components/BottomNav.jsx
<span className={`nav-item${page === 'inv' ? ' active' : ''}`}>
  {countedCount}
</span>
```

- `{countedCount}` → inserta el valor de la variable
- `` `texto${variable}` `` → template literal de JS para combinar texto y variables
- `condicion ? A : B` → operador ternario (if/else en una línea)

---

## 3. Props — Pasar datos de padre a hijo

Los props son los "parámetros" que recibe un componente. Se pasan como atributos HTML:

```jsx
// Quien usa el componente (padre) le pasa datos:
<Toast message="✅ Guardado" type="success" />

// El componente Toast los recibe como objeto:
function Toast({ message, type }) {
  return <div className={`toast ${type}`}>{message}</div>
}
```

En este proyecto la mayoría de datos viajan por **Context** (ver sección 6), no por props directas.

---

## 4. useState — Memoria del componente

`useState` guarda un valor que, al cambiar, **vuelve a renderizar** el componente.

```jsx
// Sintaxis:
const [valor, setValor] = useState(valorInicial)
//     ↑ leer    ↑ modificar         ↑ valor de arranque
```

**Ejemplo real** — `src/App.jsx`:

```jsx
const [page, setPage] = useState('inv')        // página activa: 'inv', 'lbl', 'admin', 'dmg'
const [categories, setCategories] = useState([]) // lista de categorías (array)
const [counts, setCounts] = useState({})         // conteos { productId: cantidad } (objeto)
const [loading, setLoading] = useState(true)     // booleano de carga
```

**Regla de oro**: nunca mutés el estado directamente.

```jsx
// ❌ MAL — React no se entera del cambio
counts[5] = 10

// ✅ BIEN — creas un objeto nuevo
setCounts(prev => ({ ...prev, [5]: 10 }))
//                  ↑ spread: copia todo lo anterior, luego sobreescribe key 5
```

**Ejemplo de spread con objetos** — `src/App.jsx`:

```jsx
setCounts(prev => {
  const next = { ...prev }     // copia el objeto anterior
  next[product_id] = quantity  // modifica la copia
  return next                  // devuelve la nueva versión
})
```

---

## 5. useEffect — Código que se ejecuta "como efecto secundario"

`useEffect` corre código **después** de que el componente se renderiza. Sirve para:
- Cargar datos de una API
- Suscribirse a eventos
- Sincronizar con el DOM

```jsx
useEffect(() => {
  // código que corre después del render
  return () => {
    // cleanup: se ejecuta cuando el componente se desmonta
  }
}, [dependencias]) // ← array de dependencias
```

**¿Qué son las dependencias?**

| Dependencias   | Comportamiento                                      |
|----------------|-----------------------------------------------------|
| `[]`           | Solo corre **una vez** al montar el componente      |
| `[loadData]`   | Corre cuando `loadData` cambia                      |
| Sin array      | Corre en **cada** render (raramente útil)           |

**Ejemplo real** — `src/App.jsx`:

```jsx
// Carga datos al iniciar la app (solo una vez)
useEffect(() => { loadData() }, [loadData])
```

**Ejemplo real** — `src/pages/InventoryPage.jsx`:

```jsx
// Añade evento de scroll al montar, lo limpia al desmontar
useEffect(() => {
  const el = pillsRef.current
  if (!el) return
  const onWheel = e => { e.preventDefault(); el.scrollLeft += e.deltaY }
  el.addEventListener('wheel', onWheel, { passive: false })
  return () => el.removeEventListener('wheel', onWheel) // ← cleanup
}, [])
```

---

## 6. useContext — Estado global compartido

El Context evita el "prop drilling" (pasar datos por 5 componentes hasta llegar al que los necesita).

### Cómo funciona en este proyecto:

**Paso 1: Crear el Context** — `src/App.jsx`:

```jsx
export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)
//                    ↑ hook personalizado — atajo para useContext(AppContext)
```

**Paso 2: Proveer el Context** — `src/App.jsx`:

```jsx
<AppContext.Provider value={{
  page, setPage,
  categories, products,
  counts, setCounts,
  showToast,
  // ... todos los datos y funciones globales
}}>
  <TopBar />
  <InventoryPage />
  <BottomNav />
</AppContext.Provider>
```

**Paso 3: Consumir desde cualquier componente hijo** — `src/components/BottomNav.jsx`:

```jsx
export default function BottomNav() {
  const { page, setPage, counts, products } = useApp()
  // ↑ desestructuración: saca solo lo que necesita del contexto
  //   equivale a: const ctx = useApp(); const page = ctx.page; ...
}
```

**Diagrama de flujo de datos:**

```
App (AppContext.Provider)
├── TopBar         → consume: page, counts, exportXlsx...
├── InventoryPage  → consume: categories, products, counts...
├── BottomNav      → consume: page, setPage, counts...
├── Scanner        → consume: products, updateCount...
└── AdminPage      → consume: categories, products, loadData...
```

---

## 7. useCallback — Evitar que funciones se re-creen innecesariamente

```jsx
// src/App.jsx
const loadData = useCallback(async () => {
  // función que carga datos de Supabase
}, []) // ← dependencias vacías: la función nunca cambia
```

Sin `useCallback`, `loadData` sería una función nueva en cada render, lo que causaría que el `useEffect` que depende de ella se ejecutara en bucle infinito.

---

## 8. useRef — Referencia a un elemento del DOM

`useRef` da acceso directo a un elemento HTML real (como `document.getElementById` pero en React).

```jsx
// src/pages/InventoryPage.jsx
const pillsRef = useRef(null)

// En el JSX, se asigna con ref={}
<div className="pills" ref={pillsRef}>...</div>

// Luego puedes manipular el elemento:
pillsRef.current.scrollLeft += 100
```

También sirve para guardar valores que **no deben causar re-render**:

```jsx
// src/App.jsx
const toastTimer = useRef(null)
// Si haces: toastTimer.current = setTimeout(...) → no re-renderiza
// Diferente a useState, que sí re-renderiza
```

---

## 9. Renderizado condicional — Mostrar u ocultar elementos

```jsx
// Forma 1: operador && (si condición es true, muestra el elemento)
{loading && <div className="spinner">Cargando...</div>}

// Forma 2: ternario (if/else)
{loading ? <Spinner /> : <Content />}

// Forma 3: variable
let content = null
if (loading) content = <Spinner />
else content = <Content />
return <div>{content}</div>
```

**Ejemplo real** — `src/pages/AdminPage.jsx` (editor inline de categorías):

```jsx
{isEditing ? (
  <div>/* formulario de edición */</div>
) : isDeleting ? (
  <div>/* confirmación de borrado */</div>
) : (
  <div>/* fila normal */</div>
)}
```

---

## 10. Listas con .map() — Renderizar arrays

```jsx
// Para mostrar una lista, usás .map() que transforma cada elemento en JSX
// Cada elemento DEBE tener una key única (ayuda a React a identificar cambios)

{categories.map(cat => (
  <div key={cat.id}>          {/* ← key obligatoria */}
    {cat.emoji} {cat.name}
  </div>
))}
```

**¿Por qué key?** Sin ella, si reordenás la lista React no sabe qué elemento cambió y puede renderizar mal.

---

## 11. Manejo de formularios — Controlled components

En React, los inputs se "controlan" con estado:

```jsx
const [nombre, setNombre] = useState('')

<input
  value={nombre}                           // valor viene del estado
  onChange={e => setNombre(e.target.value)} // actualiza el estado al escribir
/>
```

**Ejemplo real** — editor inline de producto en `src/pages/AdminPage.jsx`:

```jsx
<input
  className="cmgr-inline-input"
  value={editProdDraft.name}
  onChange={e => setEditProdDraft(d => ({ ...d, name: e.target.value }))}
  onKeyDown={e => {
    if (e.key === 'Enter') saveProdEdit()   // guarda al presionar Enter
    if (e.key === 'Escape') setEditingProd(null) // cancela con Escape
  }}
/>
```

---

## 12. Async/Await y Supabase

Supabase es la base de datos. Todas las operaciones son **asíncronas** (toman tiempo).

```jsx
// src/pages/AdminPage.jsx
async function saveCatEdit() {
  setSaving(true) // deshabilita botón mientras espera

  const { error } = await supabase     // await: espera la respuesta
    .from('categories')                // tabla
    .update({ name: 'Frutas' })        // operación
    .eq('id', 'frutas_id')             // condición WHERE id = 'frutas_id'

  if (error) {
    showToast('❌ ' + error.message)   // algo salió mal
  } else {
    showToast('✅ Guardado')
    await loadData()                   // recarga datos frescos
  }

  setSaving(false)
}
```

**Las 4 operaciones básicas (CRUD):**

```jsx
// CREATE
await supabase.from('products').insert({ id: 1, name: 'Aguacate' })

// READ
const { data } = await supabase.from('products').select('*')

// UPDATE
await supabase.from('products').update({ name: 'Avocado' }).eq('id', 1)

// DELETE
await supabase.from('products').delete().eq('id', 1)
```

---

## 13. Tiempo real con Supabase Realtime

El app escucha cambios en la base de datos **en vivo** (sin refrescar la página).

```jsx
// src/App.jsx
const channel = supabase.channel('inventory_realtime')
  .on('postgres_changes', { event: '*', table: 'inventory_counts' }, payload => {
    // se ejecuta cuando ALGUIEN (desde otro dispositivo) modifica la tabla
    const { product_id, quantity } = payload.new
    setCounts(prev => ({ ...prev, [product_id]: quantity }))
  })
  .subscribe()
```

---

## 14. Estructura del proyecto — Cómo encaja todo

```
src/
├── main.jsx          → Punto de entrada. Renderiza <App /> en el HTML
├── App.jsx           → Raíz: AppContext + toda la lógica global
├── supabase.js       → Cliente de Supabase (conexión a la DB)
├── defaultData.js    → Datos iniciales si la DB está vacía
│
├── components/       → Piezas reutilizables de UI
│   ├── TopBar.jsx    → Barra superior con botones contextuales
│   ├── BottomNav.jsx → Navegación inferior entre páginas
│   ├── Scanner.jsx   → Escáner de código de barras
│   ├── BottomSheet.jsx → Panel deslizable para editar cantidades
│   ├── Toast.jsx     → Notificaciones temporales
│   ├── HelpModal.jsx → Modal de ayuda
│   └── InstallBanner.jsx → Banner "instalar PWA"
│
└── pages/            → Una por cada pestaña de navegación
    ├── InventoryPage.jsx → Página de conteo de inventario
    ├── LabelsPage.jsx    → Generador de etiquetas
    ├── AdminPage.jsx     → Administración de catálogo
    └── DamagedPage.jsx   → Inventario de dañados
```

---

## 15. Flujo de datos — Un ejemplo completo

**¿Qué pasa cuando cambiás la cantidad de un producto?**

```
1. Usuario toca un producto en InventoryPage
   → setSheetData({ product }) en AppContext

2. BottomSheet se abre (detecta que sheetData tiene valor)
   → Muestra el producto con input de cantidad

3. Usuario escribe "5" y confirma
   → updateCount(productId, 5) [función en App.jsx]

4. updateCount hace:
   a. supabase.from('inventory_counts').upsert(...)  → guarda en DB
   b. Supabase Realtime notifica a todos los dispositivos
   c. setCounts(prev => ({ ...prev, [productId]: 5 })) → actualiza estado local

5. React re-renderiza:
   - InventoryPage actualiza el número y la barra de progreso
   - BottomNav actualiza el badge con el nuevo conteo
   - TopBar actualiza las estadísticas
```

---

## Recursos para seguir aprendiendo

| Recurso | URL | Para qué |
|---------|-----|----------|
| Docs oficiales React | https://react.dev | Guía completa con ejemplos interactivos |
| Supabase Docs | https://supabase.com/docs | Queries, auth, realtime |
| MDN JavaScript | https://developer.mozilla.org | `map`, `filter`, spread, async/await |
| CSS Variables | https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties | `--accent`, `--bd`, etc. que usa este proyecto |
