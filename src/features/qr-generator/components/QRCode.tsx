import { useEffect, useRef } from 'react'
import qrcode from 'qrcode-generator'

type QRCodeProps = {
  value: string
}

export function QRCode({ value }: QRCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const qr = qrcode(0, 'M')
    qr.addData(value || ' ')
    qr.make()
    container.innerHTML = qr.createSvgTag({
      scalable: true,
      margin: 2,
    })
  }, [value])

  return <div className="qr-preview" ref={containerRef} aria-label="QR code preview" />
}