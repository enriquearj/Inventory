import { useState, useEffect } from 'react'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(
    () => window.__pwaInstallPrompt || null
  )
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('pwa-dismissed') === '1'
  )

  useEffect(() => {
    // Read event stored early in index.html
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt)
      window.__pwaInstallPrompt = null
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Show banner if NOT already installed as standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true

    if (!isStandalone && sessionStorage.getItem('pwa-dismissed') !== '1') {
      setVisible(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!visible || dismissed) return null

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setVisible(false)
      setDeferredPrompt(null)
    } else {
      // Fallback: open Chrome's install menu instructions
      alert('Para instalar: haz clic en el ícono ⊕ en la barra de direcciones de Chrome, o abre el menú ⋮ y selecciona "Instalar G&Z Almacén".')
    }
  }

  const dismiss = () => {
    sessionStorage.setItem('pwa-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="install-banner">
      <div className="install-banner-icon">
        <div className="brand-badge" style={{ width: 36, height: 36, fontSize: 12 }}>G&amp;Z</div>
      </div>
      <div className="install-banner-text">
        <div className="install-banner-title">Instalar app</div>
        <div className="install-banner-sub">Agrega G&amp;Z Almacén a tu pantalla de inicio</div>
      </div>
      <button className="install-banner-btn" onClick={install}>Instalar</button>
      <button className="install-banner-close" onClick={dismiss}>✕</button>
    </div>
  )
}
