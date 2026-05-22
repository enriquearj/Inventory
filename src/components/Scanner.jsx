import { useEffect, useRef, useState } from 'react'
import { useApp } from '../App'

export default function Scanner() {
  const { setScannerOpen, setSheetData, showToast, products } = useApp()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const tickRef = useRef(null)
  const cooldownRef = useRef(false)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    startScanner()
    return () => stopCamera()
  }, [])

  async function startScanner() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      if ('BarcodeDetector' in window) {
        const bd = new window.BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
        })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        tickRef.current = setInterval(async () => {
          const v = videoRef.current
          if (!v || v.readyState < 2 || cooldownRef.current) return
          canvas.width = v.videoWidth
          canvas.height = v.videoHeight
          ctx.drawImage(v, 0, 0)
          try {
            const codes = await bd.detect(canvas)
            if (codes.length > 0) onScan(codes[0].rawValue)
          } catch (_) {}
        }, 300)
      } else {
        showToast('⚠️ BarcodeDetector no disponible. Usa Chrome/Android.')
      }
    } catch {
      showToast('⚠️ No se pudo acceder a la cámara')
      setScannerOpen(false)
    }
  }

  function stopCamera() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function onScan(code) {
    if (cooldownRef.current) return
    cooldownRef.current = true
    setTimeout(() => { cooldownRef.current = false }, 1800)

    setFlash(true)
    setTimeout(() => setFlash(false), 400)
    if (navigator.vibrate) navigator.vibrate([80, 40, 80])

    const product = findProduct(code)
    stopCamera()
    setScannerOpen(false)
    setSheetData({ product, code })
  }

  function findProduct(code) {
    const upper = code.toUpperCase()
    const match = products.find(p =>
      `GYZ-${p.id}` === upper ||
      `GYZ${p.id}` === upper ||
      String(p.id) === code
    )
    if (match) return match
    const lo = code.toLowerCase().replace(/[-_]/g, ' ')
    return products.find(p => p.name.toLowerCase().includes(lo)) || null
  }

  return (
    <div className="scanner-ov open">
      <div className="scan-top">
        <div className="scan-title">📷 Escanear código</div>
        <button className="scan-close" onClick={() => { stopCamera(); setScannerOpen(false) }}>✕</button>
      </div>
      <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        autoPlay muted playsInline />
      <div className="sframe">
        <div className="scorn tl" /><div className="scorn tr" />
        <div className="scorn bl" /><div className="scorn br" />
        <div className="sline" />
      </div>
      {flash && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,163,74,.3)', zIndex: 20, animation: 'fla .4s forwards' }} />
      )}
      <div className="scan-hint">
        <p>Apunta al código QR o barras del producto</p>
        <button className="scan-manbtn" onClick={() => { stopCamera(); setScannerOpen(false) }}>
          ✏️ Buscar manual
        </button>
      </div>
    </div>
  )
}
