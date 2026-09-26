import { useState } from 'react'
import type { RefObject } from 'react'

type Props = {
  value: string
  previewRef: RefObject<HTMLDivElement | null>
  disabled?: boolean
}

export function ResultActions({ value, previewRef, disabled }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const download = () => {
    const svg = previewRef.current?.querySelector('svg')
    if (!svg) return

    const xml = new XMLSerializer().serializeToString(svg)
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }))
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, 1024, 1024)
      ctx.drawImage(image, 0, 0, 1024, 1024)
      URL.revokeObjectURL(url)

      const link = document.createElement('a')
      link.download = 'qr-code.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    image.src = url
  }

  return (
    <div className="result-actions">
      <button className="button button-primary" disabled={disabled} onClick={download}>Tải PNG</button>
      <button className="button button-secondary" disabled={disabled} onClick={copy}>
        {copied ? 'Đã sao chép' : 'Sao chép'}
      </button>
    </div>
  )
}
