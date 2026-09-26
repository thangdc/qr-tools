import { useEffect, useRef } from 'react'
import qrcode from 'qrcode-generator'
import type { QrDesign } from '../types'

type Props = {
  value: string
  design: QrDesign
  containerRef?: React.RefObject<HTMLDivElement | null>
}

export function QRCode({ value, design, containerRef }: Props) {
  const internalRef = useRef<HTMLDivElement>(null)
  const ref = containerRef || internalRef

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    if (!value) return

    try {
      const qr = qrcode(0, 'M')
      qr.addData(value)
      qr.make()
      el.innerHTML = qr.createSvgTag({
        scalable: true,
        margin: design.margin,
      })
      const svg = el.querySelector('svg')
      if (svg) {
        svg.setAttribute('role', 'img')
        svg.setAttribute('aria-label', 'QR code preview')
        svg.style.width = '100%'
        svg.style.height = 'auto'
        svg.style.maxWidth = `${design.size}px`
        svg.style.color = design.foreground
        svg.style.background = design.background
      }
    } catch {
      el.textContent = 'Nội dung quá dài hoặc không hợp lệ.'
    }
  }, [value, design, ref])

  return <div className="qr-preview" ref={ref} aria-label="QR code preview" />
}
