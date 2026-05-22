import { useEffect, useState } from 'react'

export default function Toast({ message }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (message) {
      setVisible(true)
    } else {
      const t = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(t)
    }
  }, [message])

  return (
    <div className={`toast${visible && message ? ' show' : ''}`}>
      {message}
    </div>
  )
}
