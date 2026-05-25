import { useState } from 'react'
import { useApp } from '../App'

const SECTIONS = [
  {
    icon: '📦',
    title: '¿Cómo cuento los productos?',
    sub: 'Sección: Inventario',
    items: [
      { ic: '1️⃣', html: <>Busca el producto escribiendo su nombre arriba, o toca 📷 para escanear el código del cajón.</> },
      { ic: '2️⃣', html: <>Toca <b>+</b> para sumar una unidad, o <b>−</b> para restar.</> },
      { ic: '3️⃣', html: <>¿Sabes la cantidad exacta? Toca el número del centro y escríbela directo con el teclado.</> },
      { ic: '4️⃣', html: <>Cuando termines, toca <b>⬇ Excel</b> para guardar el conteo en un archivo <b>.xlsx</b> con columnas listas.</> },
    ],
    tip: <>💡 Los productos contados se marcan en verde. Usa el filtro <b>✅ Actualizados</b> para ver solo los que ya tienen cantidad.</>,
  },
  {
    icon: '⚠️',
    title: '¿Cómo registro productos dañados?',
    sub: 'Sección: Dañados',
    items: [
      { ic: '1️⃣', html: <>Toca la pestaña <b>⚠️ Dañados</b> en la barra de navegación.</> },
      { ic: '2️⃣', html: <>Busca el producto por nombre o escanea su código con 📷. El escáner en esta sección guarda en el conteo de dañados, no en el inventario normal.</> },
      { ic: '3️⃣', html: <>Usa <b>+</b> / <b>−</b> o toca el número para escribir la cantidad directamente.</> },
      { ic: '4️⃣', html: <>Toca <b>⬇ Excel</b> para exportar el reporte de defectuosos en formato <b>.xlsx</b> con columnas formateadas.</> },
    ],
    tip: <>💡 Los conteos de dañados son independientes del inventario normal. Puedes llevar ambos al mismo tiempo sin que se mezclen.</>,
  },
  {
    icon: '🏷️',
    title: '¿Cómo imprimo etiquetas?',
    sub: 'Sección: Etiquetas',
    items: [
      { ic: '1️⃣', html: <>Toca los productos que necesitan etiqueta — se marcan en verde al seleccionarlos.</> },
      { ic: '2️⃣', html: <>¿Necesitas etiquetar toda una categoría? Toca el filtro de esa categoría y luego <b>Sel. cat.</b></> },
      { ic: '3️⃣', html: <>Elige el tamaño: <b>Med</b> = más etiquetas por hoja (6 columnas) · <b>Grd</b> = etiquetas más grandes (4 columnas).</> },
      { ic: '4️⃣', html: <>Toca <b>🖨 Ver e imprimir</b> y confirma la impresión en la pantalla que aparece.</> },
    ],
    tip: <>💡 El número sobre el ícono 🏷 te dice cuántos productos tienes listos para imprimir.</>,
  },
  {
    icon: '⚙️',
    title: '¿Cómo uso la sección Admin?',
    sub: 'Sección: Admin (solo administradores)',
    items: [
      { ic: '📥', html: <><b>Importar productos:</b> sube un archivo Excel o CSV con la lista de productos del almacén.</> },
      { ic: '⬇️', html: <><b>Descargar plantilla:</b> descarga un archivo <b>.xlsx</b> con columnas ya formateadas (Codigo, Nombre, Categoría) listo para llenar en Excel o Numbers.</> },
      { ic: '📋', html: <><b>Exportar catálogo:</b> descarga el catálogo actual de productos en formato <b>.xlsx</b> con columnas ajustadas.</> },
      { ic: '🔄', html: <><b>Reemplazar todo:</b> borra la lista actual y carga la del archivo nuevo. Úsalo cuando el catálogo cambie completamente.</> },
      { ic: '➕', html: <><b>Agregar / Actualizar:</b> añade productos nuevos o corrige los existentes sin borrar el resto.</> },
      { ic: '🗑️', html: <><b>Limpiar conteos:</b> borra todas las cantidades del conteo actual. La lista de productos no se toca.</> },
      { ic: '💣', html: <><b>Restaurar catálogo:</b> vuelve a la lista original de 161 productos y borra los conteos. Úsalo solo si algo salió muy mal.</> },
    ],
    tip: <>⚠️ Las acciones de Limpiar y Restaurar no se pueden deshacer. Úsalas con cuidado.</>,
  },
  {
    icon: '🙋',
    title: 'Preguntas frecuentes',
    sub: 'Situaciones comunes',
    items: [
      { ic: '🔎', html: <><b>No encuentro el producto:</b> prueba escribir solo las primeras letras, o escanea el código QR del cajón.</> },
      { ic: '↩️', html: <><b>Me equivoqué en la cantidad:</b> busca el producto y vuelve a tocar el número para corregirlo.</> },
      { ic: '🖱️', html: <><b>Los filtros no se desplazan con el mouse (escritorio):</b> coloca el cursor sobre los filtros y usa la rueda del mouse para moverlos.</> },
      { ic: '📵', html: <><b>La cámara no abre:</b> acepta el permiso de cámara cuando el navegador lo pida, o busca por nombre.</> },
      { ic: '📱', html: <><b>¿Funciona en iPhone o Mac?</b> Sí. Los archivos Excel se descargan correctamente y el escáner también funciona en Safari de iOS.</> },
    ],
    tip: <>⚙️ Para cambiar la lista de productos o ajustes avanzados, habla con el administrador.</>,
  },
]

export default function HelpModal() {
  const { setHelpOpen } = useApp()
  const [openIdx, setOpenIdx] = useState(0)

  const toggle = (i) => setOpenIdx(prev => prev === i ? -1 : i)

  return (
    <div className="help-bg open" onClick={e => { if (e.target === e.currentTarget) setHelpOpen(false) }}>
      <div className="help-sheet">
        <div className="help-head">
          <h2>❓ Guía de uso</h2>
          <button className="help-close" onClick={() => setHelpOpen(false)}>✕</button>
        </div>
        <div className="help-body">
          {SECTIONS.map((sec, i) => (
            <div key={i} className={`hacc${openIdx === i ? ' open' : ''}`}>
              <button className="hacc-hdr" onClick={() => toggle(i)}>
                <div className="hacc-left">
                  <span className="hacc-icon">{sec.icon}</span>
                  <div>
                    <div className="hacc-title">{sec.title}</div>
                    <div className="hacc-sub">{sec.sub}</div>
                  </div>
                </div>
                <span className="hacc-arrow">▶</span>
              </button>
              {openIdx === i && (
                <div className="hacc-body">
                  {sec.items.map((item, j) => (
                    <div key={j} className="hacc-item">
                      <span className="hacc-ic">{item.ic}</span>
                      <span>{item.html}</span>
                    </div>
                  ))}
                  <div className="hacc-tip">{sec.tip}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
