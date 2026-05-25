import { useState } from 'react'
import { useApp } from '../App'

const SECTIONS = [
  {
    icon: '🎛️',
    title: 'Controles generales',
    sub: 'Barra superior · Navegación',
    items: [
      { ic: '❓', html: <>El botón <b>❓</b> abre esta guía en cualquier momento desde la barra superior.</> },
      { ic: '🗑️', html: <><b>🗑 Limpiar</b> borra todas las cantidades del conteo activo (inventario <i>o</i> dañados, según la sección). El catálogo de productos no se modifica. Pide confirmación antes de ejecutarse.</> },
      { ic: '⬇️', html: <><b>⬇ Excel</b> descarga un archivo <b>.xlsx</b> con el conteo actual ordenado por categoría e incluyendo totales al final.</> },
      { ic: '🖨️', html: <>En <b>Etiquetas</b>, el botón superior cambia a <b>🖨 Imprimir</b> para lanzar la vista de impresión directamente.</> },
      { ic: '📋', html: <>En <b>Admin</b>, el botón superior cambia a <b>⬇ Plantilla</b> para descargar el archivo de importación ya formateado.</> },
      { ic: '🖥️', html: <>En <b>escritorio o tablet</b>, la barra inferior desaparece y el menú se mueve a la columna lateral izquierda, donde también aparece el progreso del conteo en tiempo real.</> },
    ],
    tip: <>💡 La app funciona como PWA: toca <b>Instalar</b> en el banner que aparece al entrar para agregarla a la pantalla de inicio y usarla sin el navegador.</>,
  },
  {
    icon: '📦',
    title: '¿Cómo cuento los productos?',
    sub: 'Sección: Inventario',
    items: [
      { ic: '1️⃣', html: <>Busca el producto escribiendo su nombre en el buscador, o toca 📷 <b>Escanear código</b> para leer el código QR del cajón.</> },
      { ic: '2️⃣', html: <>Toca <b>+</b> para sumar una unidad o <b>−</b> para restar.</> },
      { ic: '3️⃣', html: <>¿Sabes la cantidad exacta? Toca el número del centro y escríbela directo con el teclado numérico.</> },
      { ic: '4️⃣', html: <>Al escanear un código, se abre una hoja inferior con el producto encontrado para ajustar la cantidad y confirmar.</> },
      { ic: '5️⃣', html: <>Cuando termines, toca <b>⬇ Excel</b> en la barra superior para guardar el conteo en un archivo <b>.xlsx</b> con columnas listas.</> },
    ],
    tip: <>💡 Los productos contados se marcan en verde. Usa el filtro <b>✅ Actualizados</b> para ver solo los que ya tienen cantidad. En escritorio, la barra lateral muestra el % de avance en tiempo real.</>,
  },
  {
    icon: '⚠️',
    title: '¿Cómo registro productos dañados?',
    sub: 'Sección: Dañados',
    items: [
      { ic: '1️⃣', html: <>Toca <b>⚠️ Dañados</b> en la barra de navegación (o en la columna lateral en desktop).</> },
      { ic: '2️⃣', html: <>Busca el producto por nombre o escanea su código con 📷. El escáner en esta sección guarda en el conteo de <b>dañados</b>, separado del inventario normal.</> },
      { ic: '3️⃣', html: <>Usa <b>+</b> / <b>−</b> o toca el número para escribir la cantidad directamente con el teclado.</> },
      { ic: '4️⃣', html: <>Toca <b>⬇ Excel</b> para exportar el reporte de defectuosos en formato <b>.xlsx</b> con columnas formateadas.</> },
      { ic: '5️⃣', html: <>Usa <b>🗑 Limpiar</b> en la barra superior para borrar todos los conteos de dañados al iniciar un nuevo ciclo.</> },
    ],
    tip: <>💡 Los conteos de dañados son <b>completamente independientes</b> del inventario normal: puedes llevar ambos al mismo tiempo sin que se mezclen.</>,
  },
  {
    icon: '🏷️',
    title: '¿Cómo imprimo etiquetas?',
    sub: 'Sección: Etiquetas',
    items: [
      { ic: '1️⃣', html: <>Toca los productos que necesitan etiqueta — se marcan en verde al seleccionarlos. Toca de nuevo para deseleccionar.</> },
      { ic: '2️⃣', html: <>¿Necesitas etiquetar toda una categoría? Toca el filtro de esa categoría y luego <b>Sel. cat.</b> para seleccionarlos todos de una vez.</> },
      { ic: '3️⃣', html: <>Elige el tamaño: <b>Med</b> = más etiquetas por hoja (6 columnas) · <b>Grd</b> = etiquetas más grandes (4 columnas).</> },
      { ic: '4️⃣', html: <>Toca <b>🖨 Ver e imprimir</b> (o <b>🖨 Imprimir</b> en la barra superior) y confirma en la ventana de impresión.</> },
    ],
    tip: <>💡 El número sobre el ícono 🏷 en la navegación indica cuántos productos están listos para imprimir. Para limpiar la selección toca <b>✕</b> en la barra verde inferior.</>,
  },
  {
    icon: '⚙️',
    title: '¿Cómo uso la sección Admin?',
    sub: 'Sección: Admin · solo administradores',
    items: [
      { ic: '📥', html: <><b>Importar productos:</b> sube un archivo Excel o CSV con la lista del almacén. Arrastra el archivo al área o toca para buscarlo.</> },
      { ic: '⬇️', html: <><b>Plantilla:</b> descarga un <b>.xlsx</b> con columnas ya formateadas (Codigo, Nombre, Categoría) para llenar y luego importar.</> },
      { ic: '📋', html: <><b>Exportar catálogo:</b> descarga el catálogo completo de productos en formato <b>.xlsx</b> con columnas ajustadas.</> },
      { ic: '🔄', html: <><b>Reemplazar todo:</b> borra la lista actual y carga la del archivo nuevo. Úsalo cuando el catálogo cambie completamente.</> },
      { ic: '➕', html: <><b>Agregar / Actualizar:</b> añade productos nuevos o corrige los existentes sin borrar el resto del catálogo.</> },
      { ic: '🗑️', html: <><b>Limpiar conteos:</b> borra todas las cantidades del conteo actual. El catálogo de productos no se toca.</> },
      { ic: '💣', html: <><b>Restaurar catálogo:</b> vuelve a la lista original de 161 productos y borra los conteos. Úsalo solo como último recurso.</> },
    ],
    tip: <>⚠️ <b>Reemplazar, Limpiar y Restaurar</b> son operaciones irreversibles. Siempre piden confirmación, pero úsalas con cuidado.</>,
  },
  {
    icon: '📁',
    title: 'Gestionar categorías y productos',
    sub: 'Sección: Admin · Catálogo en vivo',
    items: [
      { ic: '▾', html: <>Toca la <b>flecha ▾</b> a la derecha de cualquier categoría para expandirla y ver todos sus productos.</> },
      { ic: '✏️', html: <>Toca <b>✏️</b> en una categoría para editar su <b>nombre</b>, <b>emoji</b> y <b>color</b>. Confirma con <b>✓ Guardar</b> o presiona Enter. Escapa con Esc para cancelar.</> },
      { ic: '🗑️', html: <>Toca <b>🗑</b> en una categoría para eliminarla. Se mostrará una confirmación: <b>¡esto también elimina todos sus productos!</b></> },
      { ic: '➕', html: <>Al final de la lista de categorías, toca <b>+ Nueva categoría</b> para crear una con nombre, emoji y color personalizados.</> },
      { ic: '✏️', html: <>Dentro de una categoría expandida, toca <b>✏️</b> en cualquier producto para editar su nombre o moverlo a otra categoría.</> },
      { ic: '🗑️', html: <>Toca <b>🗑</b> en un producto para eliminarlo individualmente, sin afectar los demás.</> },
      { ic: '＋', html: <>Al final de cada categoría expandida, toca <b>＋ Agregar producto</b> para añadir un nuevo producto directamente en esa categoría.</> },
    ],
    tip: <>💡 Todos los cambios se guardan en la nube al instante. No necesitas importar un archivo para editar categorías o productos uno por uno.</>,
  },
  {
    icon: '�🙋',
    title: 'Preguntas frecuentes',
    sub: 'Situaciones comunes',
    items: [
      { ic: '🔎', html: <><b>No encuentro el producto:</b> prueba con solo las primeras letras o el código (ej: GYZ-138), o escanea el QR del cajón.</> },
      { ic: '↩️', html: <><b>Me equivoqué en la cantidad:</b> busca el producto y toca el número para corregirlo en cualquier momento.</> },
      { ic: '🖱️', html: <><b>Los filtros no se mueven con el mouse:</b> coloca el cursor sobre ellos y usa la <b>rueda del mouse</b> para desplazarlos.</> },
      { ic: '📵', html: <><b>La cámara no abre:</b> acepta el permiso cuando el navegador lo solicite. Si no aparece, revisa los permisos de cámara en la configuración del navegador.</> },
      { ic: '🌐', html: <><b>¿Los cambios se sincronizan?</b> Sí. Los conteos se guardan en la nube en tiempo real; si varias personas usan la app al mismo tiempo, los cambios se reflejan automáticamente.</> },
      { ic: '📱', html: <><b>¿Funciona en iPhone/iPad y Mac?</b> Sí. El escáner y la exportación a Excel funcionan correctamente en Safari de iOS y macOS.</> },
      { ic: '💾', html: <><b>¿Cómo instalo la app?</b> Toca <b>Instalar</b> en el banner que aparece al entrar, o usa "Agregar a pantalla de inicio" en el menú del navegador.</> },
    ],
    tip: <>⚙️ Para cambios avanzados en el catálogo (agregar/eliminar categorías, renombrar productos) consulta la sección <b>Admin</b> o habla con el administrador.</>,
  },
]

export default function HelpModal() {
  const { setHelpOpen } = useApp()
  const [activeIdx, setActiveIdx] = useState(0)
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <div className="help-bg open" onClick={e => { if (e.target === e.currentTarget) setHelpOpen(false) }}>
      <div className="help-sheet">
        <div className="help-head">
          <h2>❓ Guía de uso</h2>
          <button className="help-close" onClick={() => setHelpOpen(false)}>✕</button>
        </div>

        <div className="help-layout">

          {/* Left sidebar — tablet/desktop only */}
          <nav className="help-nav">
            {SECTIONS.map((sec, i) => (
              <button
                key={i}
                className={`help-nav-btn${activeIdx === i ? ' active' : ''}`}
                onClick={() => setActiveIdx(i)}
              >
                <span className="help-nav-icon">{sec.icon}</span>
                <div>
                  <div className="help-nav-title">{sec.title}</div>
                  <div className="help-nav-sub">{sec.sub}</div>
                </div>
              </button>
            ))}
          </nav>

          {/* Right content */}
          <div className="help-content">

            {/* Mobile: accordion */}
            <div className="help-acc">
              {SECTIONS.map((sec, i) => (
                <div key={i} className={`hacc${openIdx === i ? ' open' : ''}`}>
                  <button className="hacc-hdr" onClick={() => setOpenIdx(p => p === i ? -1 : i)}>
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

            {/* Tablet/Desktop: content panel */}
            <div className="help-pane">
              {SECTIONS[activeIdx] && (() => {
                const sec = SECTIONS[activeIdx]
                return (
                  <>
                    <div className="help-pane-head">
                      <span className="help-pane-icon">{sec.icon}</span>
                      <div>
                        <div className="help-pane-title">{sec.title}</div>
                        <div className="help-pane-sub">{sec.sub}</div>
                      </div>
                    </div>
                    <div className="help-pane-items">
                      {sec.items.map((item, j) => (
                        <div key={j} className="hacc-item">
                          <span className="hacc-ic">{item.ic}</span>
                          <span>{item.html}</span>
                        </div>
                      ))}
                      <div className="hacc-tip">{sec.tip}</div>
                    </div>
                  </>
                )
              })()}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
